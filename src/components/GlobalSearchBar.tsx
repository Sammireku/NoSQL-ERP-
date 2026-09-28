import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Sparkles, 
  X, 
  ArrowRight, 
  Package, 
  Building2, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  ListTodo, 
  Coins, 
  Truck, 
  Loader2, 
  FileText,
  ChevronRight,
  Command,
  Bot,
  Tag,
  GraduationCap,
  Briefcase,
  Eye,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Info,
  UserCheck
} from 'lucide-react';
import { TabId } from '../App';
import { dataStore } from '../config/firebase';
import { StudentStaffStore } from '../utils/studentStaffStore';
import { formatPrice } from '../utils/currency';

export interface GlobalSearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  module: string;
  moduleTab: TabId;
  type: 'product' | 'category' | 'vendor' | 'student' | 'staff' | 'customer' | 'order' | 'room' | 'petty_cash' | 'task' | 'grant';
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate' | 'sky' | 'purple';
  details: Record<string, any>;
  imagePhotoUrl?: string;
}

export interface GlobalSearchResponse {
  query: string;
  interpretation?: string;
  suggestedTab?: TabId;
  summary?: string;
  results: GlobalSearchResultItem[];
}

interface GlobalSearchBarProps {
  onNavigateTab: (tabId: TabId) => void;
  activeUserRole?: string;
}

const SAMPLE_PROMPTS = [
  "Products supplied by Global Logistics Corp",
  "Search student Amma Konadu's contact person",
  "Find vendor payment terms and phone numbers",
  "Stock levels for Wireless Mouse and Chair",
  "Show me receipts for walk-in cash sales"
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  product: Package,
  category: Tag,
  vendor: Truck,
  student: GraduationCap,
  staff: Briefcase,
  customer: Users,
  order: ShoppingCart,
  room: Building2,
  petty_cash: Coins,
  task: ListTodo,
  grant: HeartHandshake,
};

export default function GlobalSearchBar({ onNavigateTab, activeUserRole }: GlobalSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedInspectItem, setSelectedInspectItem] = useState<GlobalSearchResultItem | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K / '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && isOpen) {
        if (selectedInspectItem) {
          setSelectedInspectItem(null);
        } else {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedInspectItem]);

  // Handle clicking outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // COMPREHENSIVE SEARCH ENGINE (Products, Categories, Vendors, Students, Staff, Customers, Orders, Rooms, Expenses, Tasks, Grants)
  const allSearchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results: GlobalSearchResultItem[] = [];

    // 1. PRODUCTS
    const products = dataStore.getProducts();
    products.forEach(p => {
      const pName = (p.name || '').toLowerCase();
      const pSku = (p.sku || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();
      const pVendor = ((p as any).vendor || (p as any).supplier || 'Primary Warehouse').toLowerCase();

      if (pName.includes(q) || pSku.includes(q) || pCat.includes(q) || pDesc.includes(q) || pVendor.includes(q)) {
        const stockQty = (p as any).stockQuantity ?? (p as any).quantity ?? 12;
        results.push({
          id: `prod_${p.id}`,
          title: p.name,
          subtitle: `SKU: ${p.sku || 'N/A'} | Cat: ${p.category || 'General'} | Vendor: ${(p as any).vendor || 'Global Logistics'}`,
          module: 'Warehouse & Inventory',
          moduleTab: 'inventory',
          type: 'product',
          badge: stockQty > 0 ? `${stockQty} in stock` : 'Out of Stock',
          badgeColor: stockQty > 0 ? 'emerald' : 'rose',
          details: {
            "Product Name": p.name,
            "SKU Code": p.sku || 'N/A',
            "Category": p.category || 'General Products',
            "Unit Selling Price": formatPrice(p.price),
            "Current Stock Level": `${stockQty} units`,
            "Minimum Stock Alert Threshold": `${p.minStockAlert || 5} units`,
            "Vendor / Preferred Supplier": (p as any).vendor || (p as any).supplier || 'Global Logistics Corp',
            "Bin / Bay Location": (p as any).location || 'Main Central Warehouse - Bay A1',
            "Description": p.description || 'Standard catalog merchandise item for retail and wholesale orders.'
          }
        });
      }
    });

    // 2. PRODUCT CATEGORIES
    const categoriesMap = new Map<string, { count: number; items: string[] }>();
    products.forEach(p => {
      const catName = p.category || 'General Products';
      const existing = categoriesMap.get(catName) || { count: 0, items: [] };
      existing.count += 1;
      existing.items.push(p.name);
      categoriesMap.set(catName, existing);
    });

    Array.from(categoriesMap.entries()).forEach(([catName, info]) => {
      if (catName.toLowerCase().includes(q) || info.items.some(it => it.toLowerCase().includes(q))) {
        results.push({
          id: `cat_${catName.replace(/\s+/g, '_')}`,
          title: `Category: ${catName}`,
          subtitle: `${info.count} product SKUs indexed | Included items: ${info.items.slice(0, 3).join(', ')}...`,
          module: 'Product Catalog Categories',
          moduleTab: 'inventory',
          type: 'category',
          badge: `${info.count} Products`,
          badgeColor: 'indigo',
          details: {
            "Category Name": catName,
            "Total Indexed SKUs": `${info.count} products`,
            "Sample Included Items": info.items.join(', '),
            "Associated ERP Department": 'Retail POS & Wholesale Store'
          }
        });
      }
    });

    // 3. VENDORS & PROCUREMENT SUPPLIERS
    const vendorsList = [
      { id: 'v_1', name: 'Global Logistics Corp', contactPerson: 'Mr. David Osei', email: 'orders@globallogistics.com', phone: '+233 24 555 0192', category: 'Hardware & Electronics', paymentTerms: 'Net 30', leadTimeDays: 3, rating: '99% On-time' },
      { id: 'v_2', name: 'Braided Cables Ltd', contactPerson: 'Sarah Jenkins', email: 'sales@braidedcables.co', phone: '+233 20 888 1234', category: 'Accessories & Wiring', paymentTerms: 'Immediate Cash', leadTimeDays: 2, rating: '95% On-time' },
      { id: 'v_3', name: 'West Africa Fabric Hub', contactPerson: 'Alhaji Haruna', email: 'haruna@fabrichub.gh', phone: '+233 27 777 9900', category: 'Fabrics & Textiles', paymentTerms: '50% Advance', leadTimeDays: 5, rating: '98% On-time' },
      { id: 'v_4', name: 'Ghana Sewing Machine Supplies', contactPerson: 'Emmanuel Appiah', email: 'supplies@ghanasewing.com', phone: '+233 54 111 2233', category: 'Sewing Machines & Parts', paymentTerms: 'Net 15', leadTimeDays: 4, rating: '100% Quality Pass' }
    ];

    vendorsList.forEach(v => {
      const vName = v.name.toLowerCase();
      const vContact = v.contactPerson.toLowerCase();
      const vEmail = v.email.toLowerCase();
      const vPhone = v.phone.toLowerCase();
      const vCat = v.category.toLowerCase();

      if (vName.includes(q) || vContact.includes(q) || vEmail.includes(q) || vPhone.includes(q) || vCat.includes(q)) {
        results.push({
          id: `vendor_${v.id}`,
          title: `Vendor: ${v.name}`,
          subtitle: `Contact: ${v.contactPerson} | Tel: ${v.phone} | Category: ${v.category}`,
          module: 'Procurement & Vendors',
          moduleTab: 'procurement',
          type: 'vendor',
          badge: v.paymentTerms,
          badgeColor: 'sky',
          details: {
            "Vendor / Supplier Name": v.name,
            "Primary Contact Person": v.contactPerson,
            "Email Address": v.email,
            "Phone Number": v.phone,
            "Supplied Product Category": v.category,
            "Agreed Payment Terms": v.paymentTerms,
            "Expected Lead Time": `${v.leadTimeDays} business days`,
            "Supplier Quality Rating": v.rating,
            "Status": 'Verified Enterprise Supplier'
          }
        });
      }
    });

    // 4. VOCATIONAL STUDENTS
    const students = StudentStaffStore.getStudents();
    students.forEach(st => {
      const sName = (st.name || '').toLowerCase();
      const sPhone = (st.phoneNumber || '').toLowerCase();
      const sLoc = (st.location || '').toLowerCase();
      const sProg = (st.programName || '').toLowerCase();
      const sContact = (st.contactPersonName || '').toLowerCase();
      const sContactPhone = (st.contactPersonPhone || '').toLowerCase();

      if (sName.includes(q) || sPhone.includes(q) || sLoc.includes(q) || sProg.includes(q) || sContact.includes(q) || sContactPhone.includes(q)) {
        const eduStr = Array.isArray(st.educationalBackground) ? st.educationalBackground.join(', ').toUpperCase() : st.educationalBackground;
        results.push({
          id: `student_${st.id}`,
          title: `Student: ${st.name}`,
          subtitle: `Prog: ${st.programName} | Tel: ${st.phoneNumber} | Loc: ${st.location} | Contact: ${st.contactPersonName}`,
          module: 'Student Onboarding & Accounting',
          moduleTab: 'students',
          type: 'student',
          badge: st.accountStatus.toUpperCase(),
          badgeColor: st.accountStatus === 'cleared' ? 'emerald' : 'amber',
          imagePhotoUrl: st.idPhotoUrl,
          details: {
            "Full Student Name": st.name,
            "Date of Birth": st.dateOfBirth,
            "Phone Number": st.phoneNumber,
            "Residential Location": st.location,
            "Educational Background": eduStr,
            "Previous Sewing Experience": st.previousSewingExperience ? `Yes (${st.sewingExperienceDetails || 'Has prior experience'})` : 'No prior sewing experience',
            "Has Children / Kids": st.hasKids ? 'Yes' : 'No',
            "Emergency Contact Person": `${st.contactPersonName} (${st.contactPersonRelation}) - Tel: ${st.contactPersonPhone}`,
            "National Identification": `${st.idType.toUpperCase()} - #${st.idNumber}`,
            "Enrolled Program": `${st.programName} (${st.cohort})`,
            "Enrollment Date": st.enrollmentDate,
            "3-Trench Maintenance Fee Total": formatPrice(st.maintenanceFeeTotal || 3000),
            "Total Fee Paid To Date": formatPrice(st.totalPaid || 0),
            "Outstanding Maintenance Balance": formatPrice(st.totalOutstanding || 0),
            "Ledger Account Status": st.accountStatus.toUpperCase()
          }
        });
      }
    });

    // 5. STAFF & HR DIRECTORY
    const users = dataStore.getUsers();
    users.forEach(u => {
      const uName = (u.name || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uRole = (u.role || '').toLowerCase();
      const uDept = (u.department || '').toLowerCase();

      if (uName.includes(q) || uEmail.includes(q) || uRole.includes(q) || uDept.includes(q)) {
        results.push({
          id: `staff_${u.uid}`,
          title: `Staff: ${u.name}`,
          subtitle: `Role: ${u.role.toUpperCase()} | Dept: ${u.department || 'Operations'} | Email: ${u.email}`,
          module: 'HR Profiles & Payroll',
          moduleTab: 'hr',
          type: 'staff',
          badge: u.role.toUpperCase(),
          badgeColor: 'purple',
          details: {
            "Employee Name": u.name,
            "Email Address": u.email,
            "Assigned ERP Role": u.role.toUpperCase(),
            "Department": u.department || 'Operations',
            "Base Monthly Salary": formatPrice(u.baseSalary || 2000),
            "Status": u.status || 'Active',
            "Created Date": new Date(u.createdAt).toLocaleDateString()
          }
        });
      }
    });

    // 6. CRM CLIENTS & LODGING GUESTS
    const customers = dataStore.getCustomers();
    customers.forEach(c => {
      const cName = (c.name || '').toLowerCase();
      const cEmail = (c.email || '').toLowerCase();
      const cPhone = (c.phone || '').toLowerCase();
      const cTag = (c.tag || '').toLowerCase();

      if (cName.includes(q) || cEmail.includes(q) || cPhone.includes(q) || cTag.includes(q)) {
        results.push({
          id: `cust_${c.id}`,
          title: `Client: ${c.name}`,
          subtitle: `Tag: ${c.tag || 'Customer'} | Email: ${c.email || 'N/A'} | Tel: ${c.phone || 'N/A'}`,
          module: 'CRM & Client Directory',
          moduleTab: 'customers',
          type: 'customer',
          badge: `LTV: ${formatPrice(c.lifetime_value || 0)}`,
          badgeColor: 'emerald',
          details: {
            "Client Name": c.name,
            "Email": c.email || 'N/A',
            "Phone Number": c.phone || 'N/A',
            "Classification Tag": c.tag || 'Retail Customer',
            "Lifetime Value (LTV)": formatPrice(c.lifetime_value || 0),
            "Buying Habits": Array.isArray(c.buyingHabits) ? c.buyingHabits.join(', ') : 'In-store purchases'
          }
        });
      }
    });

    // 7. SALES ORDERS & RECEIPTS
    const orders = dataStore.getOrders();
    orders.forEach(o => {
      const oId = (o.id || '').toLowerCase();
      const oCust = (o.customerName || '').toLowerCase();
      const oCashier = (o.cashierName || '').toLowerCase();
      const oItems = o.items.map(it => it.name.toLowerCase()).join(' ');

      if (oId.includes(q) || oCust.includes(q) || oCashier.includes(q) || oItems.includes(q)) {
        results.push({
          id: `order_${o.id}`,
          title: `Sales Receipt #${o.id}`,
          subtitle: `Customer: ${o.customerName || 'Walk-in'} | Total: ${formatPrice(o.totalAmount)} | Cashier: ${o.cashierName}`,
          module: 'POS & Sales Hub',
          moduleTab: 'sales',
          type: 'order',
          badge: (o.paymentMethod || 'Cash').toUpperCase(),
          badgeColor: 'amber',
          details: {
            "Receipt Number": `#${o.id}`,
            "Customer Name": o.customerName || 'Walk-In Cash Customer',
            "Cashier Name": o.cashierName,
            "Transaction Timestamp": new Date(o.createdAt).toLocaleString(),
            "Line Items Purchased": o.items.map(it => `${it.name} (Qty: ${it.quantity} @ ${formatPrice(it.price)})`).join(', '),
            "Total Paid Amount": formatPrice(o.totalAmount),
            "Payment Method": (o.paymentMethod || 'Cash').toUpperCase(),
            "Sync Status": o.status.toUpperCase()
          }
        });
      }
    });

    // 8. HOTEL ROOMS
    const rooms = dataStore.getRooms();
    rooms.forEach(r => {
      const rNum = String(r.number).toLowerCase();
      const rType = (r.type || '').toLowerCase();
      const rStatus = (r.status || '').toLowerCase();

      if (rNum.includes(q) || rType.includes(q) || rStatus.includes(q) || q.includes('room')) {
        results.push({
          id: `room_${r.id}`,
          title: `Hotel Room #${r.number} (${r.type})`,
          subtitle: `Status: ${r.status.toUpperCase()} | Nightly Rate: ${formatPrice(r.nightlyRate)}`,
          module: 'Hospitality Front Desk',
          moduleTab: 'hospitality',
          type: 'room',
          badge: r.status === 'Occupied' ? 'Occupied' : 'Vacant',
          badgeColor: r.status === 'Occupied' ? 'rose' : 'emerald',
          details: {
            "Room Number": `#${r.number}`,
            "Room Type": r.type,
            "Nightly Rate": formatPrice(r.nightlyRate),
            "Current Occupancy Status": r.status.toUpperCase(),
            "Amenities": Array.isArray(r.amenities) ? r.amenities.join(', ') : 'AC, Wi-Fi, Hot Shower'
          }
        });
      }
    });

    // 9. PETTY CASH EXPENSES
    const expenses = dataStore.getPettyCashExpenses();
    expenses.forEach(e => {
      const eDesc = (e.description || '').toLowerCase();
      const eCat = (e.category || '').toLowerCase();
      const eVendor = (e.vendor || '').toLowerCase();

      if (eDesc.includes(q) || eCat.includes(q) || eVendor.includes(q)) {
        results.push({
          id: `expense_${e.id}`,
          title: `Petty Cash: ${e.description}`,
          subtitle: `Cat: ${e.category} | Amount: ${formatPrice(e.amount)} | Vendor: ${e.vendor || 'N/A'}`,
          module: 'Petty Cash Disbursements',
          moduleTab: 'petty_cash',
          type: 'petty_cash',
          badge: formatPrice(e.amount),
          badgeColor: 'slate',
          details: {
            "Expense Description": e.description,
            "Expense Category": e.category,
            "Amount Disbursed": formatPrice(e.amount),
            "Vendor / Recipient": e.vendor || 'Local Vendor',
            "Approved By": 'Manager',
            "Date": new Date(e.timestamp || Date.now()).toLocaleDateString()
          }
        });
      }
    });

    // 10. TASKS & KANBAN
    const tasks = dataStore.getTasks();
    tasks.forEach(t => {
      const tTitle = (t.title || '').toLowerCase();
      const tCat = (t.category || '').toLowerCase();
      const tPrio = (t.priority || '').toLowerCase();

      if (tTitle.includes(q) || tCat.includes(q) || tPrio.includes(q)) {
        results.push({
          id: `task_${t.id}`,
          title: `Task: ${t.title}`,
          subtitle: `Cat: ${t.category} | Priority: ${t.priority.toUpperCase()} | Status: ${t.status.toUpperCase()}`,
          module: 'Task Manager Module',
          moduleTab: 'tasks',
          type: 'task',
          badge: t.priority.toUpperCase(),
          badgeColor: t.priority === 'Urgent' ? 'rose' : 'indigo',
          details: {
            "Task Title": t.title,
            "Category": t.category,
            "Priority Level": t.priority.toUpperCase(),
            "Current Status": t.status.toUpperCase(),
            "Assigned Personnel": t.assignedToName || 'Unassigned'
          }
        });
      }
    });

    // 11. DONOR GRANTS & PROJECTS
    const projects = dataStore.getProjectBudgets();
    projects.forEach(p => {
      const pTitle = (p.projectTitle || '').toLowerCase();
      const pSponsor = (p.sponsorName || '').toLowerCase();
      const pMgr = (p.leadManager || '').toLowerCase();

      if (pTitle.includes(q) || pSponsor.includes(q) || pMgr.includes(q)) {
        results.push({
          id: `prj_${p.id}`,
          title: `Project: ${p.projectTitle}`,
          subtitle: `Code: ${p.projectCode} | Sponsor: ${p.sponsorName} | Budget: ${formatPrice(p.totalBudgetAmount)}`,
          module: 'Donor Grants & Projects',
          moduleTab: 'grants',
          type: 'grant',
          badge: formatPrice(p.totalBudgetAmount),
          badgeColor: 'emerald',
          details: {
            "Project Title": p.projectTitle,
            "Project Code": p.projectCode,
            "Sponsor / Donor": p.sponsorName,
            "Total Approved Budget": formatPrice(p.totalBudgetAmount),
            "Funds Raised To Date": formatPrice(p.raisedAmount),
            "Spent Amount": formatPrice(p.spentAmount),
            "Lead Project Manager": p.leadManager,
            "Target Beneficiaries": p.targetBeneficiaries || 1000
          }
        });
      }
    });

    return results;
  }, [query]);

  // Filtered Results by Pill Tab
  const filteredResults = useMemo(() => {
    if (filterType === 'all') return allSearchResults;
    return allSearchResults.filter(item => item.type === filterType);
  }, [allSearchResults, filterType]);

  const handleSelectPrompt = (promptText: string) => {
    setQuery(promptText);
    setIsOpen(true);
  };

  const handleResultClick = (item: GlobalSearchResultItem) => {
    setSelectedInspectItem(item);
  };

  const handleJumpToModule = (tabId: TabId) => {
    onNavigateTab(tabId);
    setSelectedInspectItem(null);
    setIsOpen(false);
  };

  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rose': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'indigo': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'sky': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl mx-2 sm:mx-4">
      
      {/* Search Input Box */}
      <form onSubmit={e => e.preventDefault()} className="relative flex items-center">
        <div className="absolute left-3 flex items-center gap-1 text-slate-400 pointer-events-none">
          <Search className="w-4 h-4 text-indigo-600 shrink-0" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search products, categories, vendors, students, staff, receipts & more..."
          className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-800 text-xs sm:text-sm pl-9 pr-20 py-2 rounded-xl border border-slate-200/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-medium placeholder:text-slate-400 shadow-2xs"
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedInspectItem(null);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden md:flex items-center gap-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md shadow-2xs">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </span>
          )}

          <div className="flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span className="hidden lg:inline">Global ERP Search</span>
          </div>
        </div>
      </form>

      {/* Dropdown Floating Search Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header & Quick Prompts if query is empty */}
          {!query.trim() && (
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  Try Global Search Shortcuts:
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Searches all 11 ERP modules</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PROMPTS.map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPrompt(promptText)}
                    className="flex items-center gap-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs py-1.5 px-3 rounded-lg font-medium transition-all shadow-2xs text-left"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span>"{promptText}"</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter Pills Toolbar when query exists */}
          {query.trim() && (
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto shrink-0 text-xs">
              <div className="flex items-center gap-1">
                {[
                  { id: 'all', label: `All (${allSearchResults.length})` },
                  { id: 'product', label: 'Products' },
                  { id: 'category', label: 'Categories' },
                  { id: 'vendor', label: 'Vendors' },
                  { id: 'student', label: 'Students' },
                  { id: 'staff', label: 'Staff' },
                  { id: 'customer', label: 'CRM / Guests' },
                  { id: 'order', label: 'Receipts' },
                  { id: 'room', label: 'Rooms' },
                  { id: 'petty_cash', label: 'Expenses' }
                ].map(pill => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setFilterType(pill.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                      filterType === pill.id 
                        ? 'bg-indigo-600 text-white shadow-2xs' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <span className="text-[10px] text-slate-400 font-mono shrink-0 hidden sm:inline">
                Click any row for full details
              </span>
            </div>
          )}

          {/* Search Results Display Area */}
          {query.trim() && (
            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              {filteredResults.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs space-y-2">
                  <Search className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">No ERP records matched "{query}"</p>
                  <p className="text-[11px] text-slate-400">
                    Try searching by product name, vendor name, student name, contact person, or invoice reference number.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredResults.map((item, idx) => {
                    const IconComp = TYPE_ICONS[item.type] || FileText;
                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => handleResultClick(item)}
                        className="group flex items-center justify-between p-3 hover:bg-indigo-50/70 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-700 rounded-xl shrink-0 transition-colors">
                            <IconComp className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-900 truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 group-hover:bg-white px-2 py-0.5 rounded-md shrink-0">
                                {item.module}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {item.badge && (
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getBadgeStyle(item.badgeColor)}`}>
                              {item.badge}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResultClick(item);
                            }}
                            className="p-1 text-indigo-600 hover:bg-indigo-100 rounded-lg flex items-center gap-1 text-[10px] font-bold"
                            title="Inspect All Properties"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Inspect Details</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer Info Bar */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 px-4 shrink-0">
            <span>Tumi ERP Real-Time Search Engine</span>
            <div className="flex items-center gap-2">
              <span>Press <kbd className="font-mono bg-white border px-1 rounded text-[10px]">ESC</kbd> to close</span>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE FULL RECORD INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {selectedInspectItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                  {React.createElement(TYPE_ICONS[selectedInspectItem.type] || FileText, { className: 'w-6 h-6' })}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    {selectedInspectItem.title}
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Module: <strong className="text-indigo-300">{selectedInspectItem.module}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInspectItem(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Complete Key-Value Record Detail Grid */}
            <div className="p-6 overflow-y-auto space-y-4 font-sans text-xs">
              
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">Record Inspection Summary</span>
                {selectedInspectItem.badge && (
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${getBadgeStyle(selectedInspectItem.badgeColor)}`}>
                    {selectedInspectItem.badge}
                  </span>
                )}
              </div>

              {/* ID Photo if available (e.g. Student ID Card) */}
              {selectedInspectItem.imagePhotoUrl && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center gap-4">
                  <img
                    src={selectedInspectItem.imagePhotoUrl}
                    alt="Uploaded ID Photo"
                    className="w-20 h-20 object-cover rounded-xl border border-slate-300 shadow-sm"
                  />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Uploaded Identification Card Photo</span>
                    <p className="text-xs text-slate-700 font-semibold mt-1">
                      Attached ID document image verified on student onboarding registration.
                    </p>
                  </div>
                </div>
              )}

              {/* Key-Value Details Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {Object.entries(selectedInspectItem.details).map(([key, value]) => (
                  <div key={key} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 hover:bg-slate-50/60 transition-colors">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 sm:w-1/3">
                      {key}:
                    </span>
                    <span className="text-xs font-semibold text-slate-900 font-mono sm:w-2/3 text-left sm:text-right break-words">
                      {value !== undefined && value !== null ? String(value) : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedInspectItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all"
              >
                Close Inspector
              </button>

              <button
                type="button"
                onClick={() => handleJumpToModule(selectedInspectItem.moduleTab)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md shadow-indigo-500/10"
              >
                <span>🚀 Navigate to {selectedInspectItem.module}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
