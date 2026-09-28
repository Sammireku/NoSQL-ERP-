import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, 
  Wifi, 
  WifiOff, 
  Database, 
  Plus, 
  Minus, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  Loader2,
  RefreshCw,
  Printer,
  BedDouble,
  Building,
  UserCheck,
  Search,
  Receipt,
  Calendar,
  DollarSign,
  Eye,
  User,
  X
} from 'lucide-react';
import { Product, POSOrder, UserProfile, Booking, RoomCharge, CustomerProfile } from '../types/erp';
import { dataStore } from '../config/firebase';
import { GuestAmenityRecommender } from './GuestAmenityRecommender';
import { StudentStaffStore } from '../utils/studentStaffStore';
import { formatPrice } from '../utils/currency';

interface POSCartProps {
  activeUser: UserProfile;
  isOnline: boolean;
  toggleNetwork: () => void;
}

// Sample mock receipt images standard options for easy testing
const SAMPLE_INVOICES = [
  {
    name: 'Hardware Upgrade Invoice',
    vendor: 'Global Logistics Corp',
    description: '2x Wireless Mouse, 1x USB-C Hub, 1x Chair',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // Small mock 1x1 base64
    items: [
      { name: "Premium Wireless Mouse", quantity: 2, price: 45.00 },
      { name: "USB-C Hub Multiport", quantity: 1, price: 59.90 },
      { name: "Ergonomic Office Chair", quantity: 1, price: 119.99 }
    ]
  },
  {
    name: 'Accessories Supply Receipt',
    vendor: 'Braided Cables Ltd',
    description: '10x USB-C Cables',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    items: [
      { name: "Braided USB-C Charging Cable 2m", quantity: 10, price: 19.99 }
    ]
  }
];

export default function POSCart({ activeUser, isOnline, toggleNetwork }: POSCartProps) {
  const [activeCurrency, setActiveCurrency] = useState<string>(() => {
    const saved = localStorage.getItem('erp_active_currency');
    if (!saved) {
      localStorage.setItem('erp_active_currency', 'GHS');
      return 'GHS';
    }
    return saved;
  });

  const handleCurrencyChange = (newCurrency: string) => {
    localStorage.setItem('erp_active_currency', newCurrency);
    setActiveCurrency(newCurrency);
    window.dispatchEvent(new Event('tumi_currency_rates_updated'));
  };

  const [taxConfig, setTaxConfig] = useState(() => dataStore.getTaxConfig());
  const [receiptConfig, setReceiptConfig] = useState(() => dataStore.getReceiptConfig());

  useEffect(() => {
    const handleRatesUpdate = () => {
      setActiveCurrency(localStorage.getItem('erp_active_currency') || 'GHS');
    };
    const handleTaxUpdate = () => {
      setTaxConfig(dataStore.getTaxConfig());
    };
    const handleReceiptUpdate = () => {
      setReceiptConfig(dataStore.getReceiptConfig());
    };

    window.addEventListener('tumi_currency_rates_updated', handleRatesUpdate);
    window.addEventListener('tumi_tax_config_updated', handleTaxUpdate);
    window.addEventListener('tumi_receipt_config_updated', handleReceiptUpdate);

    return () => {
      window.removeEventListener('tumi_currency_rates_updated', handleRatesUpdate);
      window.removeEventListener('tumi_tax_config_updated', handleTaxUpdate);
      window.removeEventListener('tumi_receipt_config_updated', handleReceiptUpdate);
    };
  }, []);

  const format = (amount: number, sourceCurrency: 'USD' | 'GHS' = 'USD') => {
    return formatPrice(amount, activeCurrency, sourceCurrency);
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number; discountType?: 'percent' | 'cash'; discountValue?: number }>>([]);
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<POSOrder[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [recentCheckout, setRecentCheckout] = useState<POSOrder | null>(null);
  const [syncToast, setSyncToast] = useState<{ show: boolean; count: number; timestamp: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'register' | 'receipts'>('register');
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [receiptNoFilter, setReceiptNoFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [receiptDateFilter, setReceiptDateFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<POSOrder | null>(null);

  // CSV POS Historical Upload logic
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const newOrdersMap: Record<string, POSOrder> = {};

      // Parse CSV rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 6) continue;

        const [receiptId, date, customerName, itemName, qtyStr, priceStr, totalStr, pMethod, statusStr] = parts;

        const qty = parseInt(qtyStr, 10) || 1;
        const price = parseFloat(priceStr) || 0;
        const total = parseFloat(totalStr) || (qty * price);

        const item = {
          productId: 'prod_csv_' + Math.floor(Math.random() * 1000),
          name: itemName || 'Unknown Item',
          quantity: qty,
          price: price
        };

        if (newOrdersMap[receiptId]) {
          newOrdersMap[receiptId].items.push(item);
          newOrdersMap[receiptId].totalAmount += total;
        } else {
          newOrdersMap[receiptId] = {
            id: receiptId,
            createdAt: date || new Date().toISOString(),
            customerName: customerName || 'Walk-in Customer',
            items: [item],
            totalAmount: total,
            cashierId: activeUser.uid,
            cashierName: activeUser.name,
            status: 'completed',
            offline: false,
            ai_fraud_flag: false,
            paymentMethod: pMethod || 'Cash'
          };
        }
      }

      const parsedOrders = Object.values(newOrdersMap);
      if (parsedOrders.length === 0) {
        alert("No valid POS records found in CSV. Please verify CSV headers and formatting.");
        return;
      }

      const existingOrders = dataStore.getOrders();
      const updatedOrders = [...parsedOrders, ...existingOrders.filter(eo => !newOrdersMap[eo.id])];
      dataStore.saveOrders(updatedOrders);
      setOrders(dataStore.getOrders());

      // Log to audit trail
      dataStore.logAudit(
        activeUser.uid,
        activeUser.name,
        activeUser.role,
        'CREATE',
        'POS Receipts DB',
        `Bulk uploaded ${parsedOrders.length} historical POS transaction records via CSV.`
      );

      alert(`✓ POS CSV Import Successful! Ingested ${parsedOrders.length} transaction records into database archives.`);
    };
    reader.readAsText(file);
  };

  // Customer assign & autocomplete states
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [addToCRM, setAddToCRM] = useState(false);
  const [showAutocompleteDropdown, setShowAutocompleteDropdown] = useState(false);

  // Discount configuration states
  const [discountType, setDiscountType] = useState<'percent' | 'cash'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Walk-in Customer Quick Add CRM states
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPhone, setQuickAddPhone] = useState('');
  const [quickAddEmail, setQuickAddEmail] = useState('');

  // Pending & Billed-to Payments Modal state
  const [showPendingPaymentsModal, setShowPendingPaymentsModal] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const [pendingFilterTab, setPendingFilterTab] = useState<'all' | 'pending' | 'cleared'>('all');

  // Hospitality Room Folio Billing states
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [roomChargeCategory, setRoomChargeCategory] = useState<RoomCharge['category']>('Shop / POS Purchase');
  const [roomChargeCustomNote, setRoomChargeCustomNote] = useState<string>('');
  const [roomChargeSuccessNotice, setRoomChargeSuccessNotice] = useState<string | null>(null);

  // Bill To (Room / Person / Staff / Student) states
  const [billToOption, setBillToOption] = useState<'room' | 'person' | 'staff' | 'student'>('room');
  const [billToPersonName, setBillToPersonName] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Stripe terminal specific hardware connection states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'stripe_terminal' | 'room_folio' | 'mobile_money'>('cash');
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentProcessed, setPaymentProcessed] = useState(false);

  // Mobile Money settings & simulation states
  const [momoNetwork, setMomoNetwork] = useState<'mtn' | 'telecel' | 'at'>('mtn');
  const [momoPhoneNumber, setMomoPhoneNumber] = useState('');
  const [momoVoucherCode, setMomoVoucherCode] = useState('');
  const [momoPromptOpen, setMomoPromptOpen] = useState(false);
  const [momoPromptPin, setMomoPromptPin] = useState('');
  const [momoPromptStatus, setMomoPromptStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  // Compute Pending and Cleared Accounts across lodging guests, CRM customers, staff, and students
  const pendingAccounts = React.useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      email?: string;
      phone?: string;
      roomNumber?: string;
      bookingId?: string;
      accountType?: 'guest' | 'customer' | 'staff' | 'student';
      unpaidCharges: Array<{ description: string; amount: number; category?: string }>;
      totalUnpaid: number;
      totalPaid: number;
      status: 'pending' | 'cleared';
      lastActivity?: string;
    }> = [];

    // 1. Process Active Bookings (Room Charges & Unsettled Stay Balance)
    activeBookings.forEach(b => {
      const roomCharges = b.roomCharges || [];
      const unpaidRoomCharges = roomCharges.filter(c => c.status === 'billed_to_room' || !c.status);
      const chargesTotal = unpaidRoomCharges.reduce((sum, c) => sum + c.amount, 0);
      const stayBalance = b.paymentStatus === 'deposit' ? Math.max(0, b.totalPrice - (b.totalPrice * 0.2)) : b.paymentStatus === 'pending' ? b.totalPrice : 0;
      const totalUnpaid = Number((chargesTotal + stayBalance).toFixed(2));

      const itemized: Array<{ description: string; amount: number; category?: string }> = [];
      if (stayBalance > 0) {
        itemized.push({ description: `Room #${b.roomNumber} Stay Accommodation Balance`, amount: stayBalance, category: 'Accommodation' });
      }
      unpaidRoomCharges.forEach(c => {
        itemized.push({ description: `${c.category}: ${c.description}`, amount: c.amount, category: c.category });
      });

      list.push({
        id: `guest_${b.id}`,
        name: b.guestName,
        email: b.guestEmail,
        phone: b.guestPhone,
        roomNumber: b.roomNumber,
        bookingId: b.id,
        accountType: 'guest',
        unpaidCharges: itemized,
        totalUnpaid,
        totalPaid: b.paymentStatus === 'paid' ? b.totalPrice : 0,
        status: totalUnpaid > 0 ? 'pending' : 'cleared',
        lastActivity: b.createdAt
      });
    });

    // 2. Process CRM customers with recent order histories
    const crmCustomers = dataStore.getCustomers();
    crmCustomers.forEach(c => {
      const existsInLodging = list.some(item => item.name.toLowerCase() === c.name.toLowerCase());
      if (!existsInLodging) {
        const customerOrders = orders.filter(o => o.customerName && o.customerName.toLowerCase() === c.name.toLowerCase());
        const unpaidOrders = customerOrders.filter(o => (o as any).paymentStatus === 'pending' || (o as any).billedToAccount);
        const unpaidTotal = unpaidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        list.push({
          id: `crm_${c.id}`,
          name: c.name,
          email: c.email,
          phone: c.phone,
          accountType: 'customer',
          unpaidCharges: unpaidOrders.map(o => ({ description: `POS Order #${o.id}`, amount: o.totalAmount, category: 'POS Sale' })),
          totalUnpaid: unpaidTotal,
          totalPaid: c.lifetime_value || 0,
          status: unpaidTotal > 0 ? 'pending' : 'cleared',
          lastActivity: c.updatedAt
        });
      }
    });

    // 3. Process Staff Members (Store charges and advances pending payroll deduction)
    const staffCharges = StudentStaffStore.getStaffStoreCharges();
    const staffLoans = StudentStaffStore.getStaffLoans();
    const systemUsers = dataStore.getUsers();

    systemUsers.forEach(u => {
      const userCharges = staffCharges.filter(sc => sc.staffId === u.uid && sc.status === 'pending_payroll_deduction');
      const userAdvances = staffLoans.filter(sl => sl.staffId === u.uid && sl.remainingBalance > 0);
      
      const chargesTotal = userCharges.reduce((sum, sc) => sum + sc.amount, 0);
      const advancesTotal = userAdvances.reduce((sum, sl) => sum + sl.remainingBalance, 0);
      const totalUnpaid = Number((chargesTotal + advancesTotal).toFixed(2));

      const itemized: Array<{ description: string; amount: number; category?: string }> = [];
      userCharges.forEach(sc => {
        itemized.push({ description: `Store Charge: ${sc.itemsDescription}`, amount: sc.amount, category: 'Staff Store Charge' });
      });
      userAdvances.forEach(sl => {
        itemized.push({ description: `${sl.type.toUpperCase()}: ${sl.purpose}`, amount: sl.remainingBalance, category: 'Staff Advance/Loan' });
      });

      list.push({
        id: `staff_${u.uid}`,
        name: `${u.name} (Staff)`,
        email: u.email,
        accountType: 'staff',
        unpaidCharges: itemized,
        totalUnpaid,
        totalPaid: 0,
        status: totalUnpaid > 0 ? 'pending' : 'cleared',
        lastActivity: u.updatedAt || u.createdAt
      });
    });

    // 4. Process Vocational Students (Maintenance fee trenches & store charges)
    const students = StudentStaffStore.getStudents();
    students.forEach(st => {
      const totalFee = st.maintenanceFeeTotal || 3000;
      const totalPaid = st.totalPaid || 0;
      const unpaidBalance = st.totalOutstanding !== undefined ? st.totalOutstanding : Math.max(0, totalFee - totalPaid);

      const itemized: Array<{ description: string; amount: number; category?: string }> = [];
      if (unpaidBalance > 0) {
        itemized.push({ 
          description: `Vocational 3-Trench Maintenance Fee Balance (${st.programName})`, 
          amount: unpaidBalance, 
          category: 'Vocational Maintenance Fee' 
        });
      }

      list.push({
        id: `student_${st.id}`,
        name: `${st.name} (Student)`,
        phone: st.phoneNumber,
        accountType: 'student',
        unpaidCharges: itemized,
        totalUnpaid: unpaidBalance,
        totalPaid: totalPaid,
        status: unpaidBalance > 0 ? 'pending' : 'cleared',
        lastActivity: st.enrollmentDate
      });
    });

    return list;
  }, [activeBookings, orders]);

  const filteredPendingAccounts = React.useMemo(() => {
    const q = pendingSearchQuery.toLowerCase().trim();
    return pendingAccounts.filter(acc => {
      const matchesSearch = !q || (
        acc.name.toLowerCase().includes(q) ||
        (acc.email && acc.email.toLowerCase().includes(q)) ||
        (acc.phone && acc.phone.toLowerCase().includes(q)) ||
        (acc.roomNumber && acc.roomNumber.toLowerCase().includes(q))
      );
      if (pendingFilterTab === 'pending') return matchesSearch && acc.status === 'pending';
      if (pendingFilterTab === 'cleared') return matchesSearch && acc.status === 'cleared';
      return matchesSearch;
    });
  }, [pendingAccounts, pendingSearchQuery, pendingFilterTab]);

  const totalPendingAccountsCount = pendingAccounts.filter(a => a.status === 'pending').length;

  const handlePrintReceipt = (order: POSOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const dateStr = new Date(order.createdAt || Date.now()).toLocaleString();
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>POS Receipt - Invoice #${order.id}</title>
          <style>
            body { font-family: monospace; width: 320px; padding: 15px; margin: 0 auto; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 10px 0; }
            .item-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
            .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">TUMI ENTERPRISE STORE</div>
          <div class="center" style="font-size: 11px;">128 Commercial Blvd, Suite 400</div>
          <div class="center" style="font-size: 11px;">Tel: +1 (800) 555-TUMI</div>
          <div class="line"></div>
          <div style="font-size: 11px;">
            <div>Order ID: ${order.id}</div>
            <div>Date: ${dateStr}</div>
            <div>Cashier: ${order.cashierName}</div>
            <div>Status: ${order.status.toUpperCase()}</div>
          </div>
          <div class="line"></div>
          ${order.items.map(item => `
            <div class="item-row">
              <span>${item.name || item.productId} x${item.quantity}</span>
              <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="line"></div>
          <div class="total-row">
            <span>SUBTOTAL:</span>
            <span>$${order.totalAmount.toFixed(2)}</span>
          </div>
          ${order.discountAmount ? `
            <div class="item-row" style="color: #444; font-style: italic; display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <span>Discount (${order.discountType === 'percent' ? `${order.discountValue}%` : 'Cash'}):</span>
              <span>-$${order.discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="item-row" style="color: #444; display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span>TAX (8%):</span>
            <span>$${((order.totalAmount - (order.discountAmount || 0)) * 0.08).toFixed(2)}</span>
          </div>
          <div class="total-row" style="font-size: 16px; margin-top: 8px;">
            <span>TOTAL PAID:</span>
            <span>$${((order.totalAmount - (order.discountAmount || 0)) * 1.08).toFixed(2)}</span>
          </div>
          <div class="line"></div>
          <div class="center" style="font-size: 10px; margin-top: 15px;">
            Thank you for shopping with us!<br/>
            Returns accepted within 14 days with receipt.<br/>
            *** VAT TAX INVOICE ***
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const autocompleteSuggestions = React.useMemo(() => {
    if (!customerSearchInput.trim()) return [];
    const query = customerSearchInput.toLowerCase().trim();
    
    // 1. CRM Customers
    const crmList = dataStore.getCustomers().map(c => ({
      id: c.id,
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      type: 'crm' as const,
      label: `👤 CRM: ${c.name} (${c.email || 'No email'})`
    }));

    // 2. Active lodging guests
    const lodgingList = activeBookings.map(b => ({
      id: `booking_${b.id}`,
      name: b.guestName,
      email: b.guestEmail || '',
      phone: b.guestPhone || '',
      type: 'lodging' as const,
      label: `🏨 Guest: Room #${b.roomNumber} - ${b.guestName}`
    }));

    // 3. Staff employees
    const staffList = dataStore.getUsers().map(u => ({
      id: `staff_${u.uid}`,
      name: u.name,
      email: u.email || '',
      phone: '',
      type: 'staff' as const,
      label: `👔 Staff: ${u.name} (${u.role.toUpperCase()})`
    }));

    // 4. Students
    const studentList = StudentStaffStore.getStudents().map(st => ({
      id: `student_${st.id}`,
      name: st.name,
      email: '',
      phone: st.phoneNumber || '',
      type: 'student' as const,
      label: `🎓 Student: ${st.name} (${st.programName})`
    }));

    // 5. Previous purchasers from POS orders (deduplicated by name)
    const orderList: any[] = [];
    const namesSeen = new Set<string>();
    orders.forEach(o => {
      if (o.customerName && !namesSeen.has(o.customerName.toLowerCase())) {
        namesSeen.add(o.customerName.toLowerCase());
        const existsInCrm = crmList.some(c => c.name.toLowerCase() === o.customerName!.toLowerCase());
        const existsInLodging = lodgingList.some(l => l.name.toLowerCase() === o.customerName!.toLowerCase());
        if (!existsInCrm && !existsInLodging) {
          orderList.push({
            id: `order_${o.id}`,
            name: o.customerName,
            email: o.customerEmail || '',
            phone: o.customerPhone || '',
            type: 'previous_buyer' as const,
            label: `🛍️ Previous Buyer: ${o.customerName}`
          });
        }
      }
    });

    const combined = [...crmList, ...lodgingList, ...staffList, ...studentList, ...orderList];
    return combined.filter(item => item.name.toLowerCase().includes(query) || (item.email && item.email.toLowerCase().includes(query)));
  }, [customerSearchInput, activeBookings, orders]);

  const handleSelectSuggestion = (item: any) => {
    setCustomerName(item.name);
    setCustomerSearchInput(item.name);
    setCustomerEmail(item.email);
    setCustomerPhone(item.phone);
    setShowAutocompleteDropdown(false);
    
    if (paymentMethod === 'room_folio') {
      if (item.type === 'staff') {
        setBillToOption('staff');
        setSelectedStaffId(item.id.replace('staff_', ''));
      } else if (item.type === 'student') {
        setBillToOption('student');
        setSelectedStudentId(item.id.replace('student_', ''));
      } else if (billToOption === 'person') {
        setBillToPersonName(item.name);
      }
    }
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddName.trim()) {
      alert("Name is required to quick-add a CRM customer.");
      return;
    }
    const emailToUse = quickAddEmail.trim() || `${quickAddName.trim().toLowerCase().replace(/\s+/g, '')}@walkin.com`;
    const phoneToUse = quickAddPhone.trim() || '+1 (555) 000-0000';
    
    try {
      const { customer } = dataStore.upsertCustomerFromGuest({
        name: quickAddName.trim(),
        email: emailToUse,
        phone: phoneToUse,
        totalSpend: 0,
        source: 'POS Quick-Add Walk-in',
        tag: 'walk-in',
        buyingHabits: [],
        demands: []
      });
      
      // Auto assign newly added customer to checkout state
      setCustomerSearchInput(customer.name);
      setCustomerName(customer.name);
      setCustomerEmail(customer.email);
      setCustomerPhone(customer.phone);
      setBillToPersonName(customer.name);
      setAddToCRM(false); // already saved to CRM
      
      // Reset quick add inputs
      setQuickAddName('');
      setQuickAddPhone('');
      setQuickAddEmail('');
      setIsQuickAddOpen(false);
      
    } catch (err) {
      console.error("Quick add failed:", err);
      alert("Failed to quick-add customer to CRM.");
    }
  };

  const filteredReceipts = React.useMemo(() => {
    return orders.filter(o => {
      // General quick query
      if (receiptSearchQuery.trim()) {
        const query = receiptSearchQuery.toLowerCase().trim();
        const matchesQuery = o.id.toLowerCase().includes(query) ||
          (o.customerName && o.customerName.toLowerCase().includes(query)) ||
          (o.customerEmail && o.customerEmail.toLowerCase().includes(query)) ||
          (o.cashierName && o.cashierName.toLowerCase().includes(query)) ||
          o.items.some(item => item.name.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      // Explicit Receipt No
      if (receiptNoFilter.trim()) {
        if (!o.id.toLowerCase().includes(receiptNoFilter.toLowerCase().trim())) return false;
      }

      // Explicit Customer Name
      if (customerNameFilter.trim()) {
        const cn = (o.customerName || '').toLowerCase();
        const ch = (o.cashierName || '').toLowerCase();
        const filterCn = customerNameFilter.toLowerCase().trim();
        if (!cn.includes(filterCn) && !ch.includes(filterCn)) return false;
      }

      // Explicit Date
      if (receiptDateFilter.trim()) {
        const orderDateStr = new Date(o.createdAt).toISOString().split('T')[0];
        if (orderDateStr !== receiptDateFilter.trim()) return false;
      }

      // Explicit Item
      if (itemFilter.trim()) {
        const itm = itemFilter.toLowerCase().trim();
        if (!o.items.some(i => i.name.toLowerCase().includes(itm) || i.productId.toLowerCase().includes(itm))) return false;
      }

      return true;
    });
  }, [receiptSearchQuery, receiptNoFilter, customerNameFilter, receiptDateFilter, itemFilter, orders]);

  // Load active checked-in hotel guests
  useEffect(() => {
    const all = dataStore.getBookings();
    const eligible = all.filter(b => b.status === 'checked_in' || (b.status === 'confirmed' && b.roomId));
    setActiveBookings(eligible);
    if (eligible.length > 0 && !selectedBookingId) {
      setSelectedBookingId(eligible[0].id);
    }
  }, []);

  const initializeStripeTerminal = async () => {
    setStripeConnecting(true);
    try {
      const res = await fetch('/api/stripe-terminal/connection-token', { method: 'POST' });
      const data = await res.json();
      if (data.secret) {
        setStripeConnected(true);
      }
    } catch (e) {
      setStripeConnected(true);
    } finally {
      setStripeConnecting(false);
    }
  };

  const simulateStripeCardTap = async () => {
    setPaymentProcessing(true);
    // Use simulated orderId for hardware payment pipeline
    const tempOrderId = 'ord_' + Math.floor(1000 + Math.random() * 9000);
    const orgId = activeUser.orgId || 'org_corp_test';
    
    try {
      const res = await fetch('/api/stripe-terminal/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cartTotal * 1.08,
          orgId: orgId,
          orderId: tempOrderId
        })
      });
      const intentData = await res.json();

      // Invoke simulated webhook endpoint matching real Stripe reader push notification status updates
      await fetch('/api/stripe-terminal/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: intentData.paymentIntentId || 'pi_mock_intent_id',
          orderId: tempOrderId,
          orgId: orgId,
          type: 'payment_intent.succeeded',
          data: {
            object: {
              metadata: {
                orderId: tempOrderId,
                orgId: orgId
              }
            }
          }
        })
      });

      setPaymentProcessed(true);
    } catch (e) {
      console.error(e);
      setPaymentProcessed(true);
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Sync internal state with dataStore subscribers
  useEffect(() => {
    setProducts(dataStore.getProducts());
    setOrders(dataStore.getOrders());
    setOfflineQueue(dataStore.getOfflineQueue());

    const unsubProducts = dataStore.subscribeToCollection('products', () => {
      setProducts(dataStore.getProducts());
    });
    const unsubOrders = dataStore.subscribeToCollection('orders', () => {
      setOrders(dataStore.getOrders());
    });
    const unsubQueue = dataStore.subscribeToCollection('offline_queue', () => {
      setOfflineQueue(dataStore.getOfflineQueue());
    });

    // Listen for offline transaction sync completion to show visual toast
    const handleOfflineSynced = (e: any) => {
      const count = e.detail?.syncedCount || 0;
      if (count > 0) {
        setSyncToast({ show: true, count, timestamp: new Date().toLocaleTimeString() });
        setTimeout(() => setSyncToast(null), 6000);
      }
    };
    window.addEventListener('offline-queue-synced', handleOfflineSynced);

    return () => {
      unsubProducts();
      unsubOrders();
      unsubQueue();
      window.removeEventListener('offline-queue-synced', handleOfflineSynced);
    };
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as Array<{ product: Product; quantity: number; discountType?: 'percent' | 'cash'; discountValue?: number }>;
    });
  };

  const clearCart = () => setCart([]);

  const calculateItemTotal = (item: { product: Product; quantity: number; discountType?: 'percent' | 'cash'; discountValue?: number }) => {
    const sub = item.product.price * item.quantity;
    if (!item.discountValue || item.discountValue <= 0) return sub;
    if (item.discountType === 'cash') {
      return Math.max(0, sub - item.discountValue);
    } else {
      return Math.max(0, sub - (sub * item.discountValue) / 100);
    }
  };

  const updateItemDiscount = (productId: string, type: 'percent' | 'cash', value: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          return { ...item, discountType: type, discountValue: value };
        }
        return item;
      });
    });
  };

  const cartTotal = React.useMemo(() => {
    return cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  }, [cart]);

  const [includeTax, setIncludeTax] = useState<boolean>(true);

  const computedDiscountAmount = React.useMemo(() => {
    if (discountValue <= 0) return 0;
    if (discountType === 'percent') {
      return Number(((cartTotal * discountValue) / 100).toFixed(2));
    } else {
      return Number(Math.min(discountValue, cartTotal).toFixed(2));
    }
  }, [cartTotal, discountType, discountValue]);

  const computedTaxAmount = React.useMemo(() => {
    if (!includeTax || taxConfig?.taxMode === 'exempt') return 0;
    const taxableAmount = Math.max(0, cartTotal - computedDiscountAmount);
    let rate = 0.08;
    if (taxConfig?.taxMode === 'gra_standard') rate = 0.219;
    else if (taxConfig?.taxMode === 'gra_flat_3') rate = 0.04;
    else if (taxConfig?.taxMode === 'custom' && taxConfig?.customTaxRate) rate = taxConfig.customTaxRate / 100;
    return Number((taxableAmount * rate).toFixed(2));
  }, [cartTotal, computedDiscountAmount, includeTax, taxConfig]);

  const computedGrandTotal = React.useMemo(() => {
    const subAfterDiscount = Math.max(0, cartTotal - computedDiscountAmount);
    return Number((subAfterDiscount + computedTaxAmount).toFixed(2));
  }, [cartTotal, computedDiscountAmount, computedTaxAmount]);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const orderItems = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      discountType: item.discountType,
      discountValue: item.discountValue
    }));

    try {
      const grandTotal = computedGrandTotal;
      let activeCustName = customerName.trim() || undefined;
      let activeCustPhone = customerPhone.trim() || undefined;
      let activeCustEmail = customerEmail.trim() || undefined;

      // Determine habits based on cart items
      const newHabits = cart.map(i => `Bought ${i.product.name} (x${i.quantity})`);

      if (paymentMethod === 'room_folio') {
        const itemsSummary = cart.map(i => `${i.product.name} x${i.quantity}`).join(', ');
        const chargeDesc = `${itemsSummary}${roomChargeCustomNote ? ` (${roomChargeCustomNote})` : ''}`;

        if (billToOption === 'room') {
          const targetBooking = activeBookings.find(b => b.id === selectedBookingId) || dataStore.getBookings().find(b => b.id === selectedBookingId);
          if (!targetBooking) {
            alert('Please select a valid guest room folio to bill.');
            return;
          }

          if (!activeCustName) {
            activeCustName = targetBooking.guestName;
            activeCustPhone = targetBooking.guestPhone || undefined;
            activeCustEmail = targetBooking.guestEmail || undefined;
          }

          // Add charge to hospitality room folio
          dataStore.addRoomCharge(
            targetBooking.id,
            {
              description: `POS Store: ${chargeDesc}`,
              amount: grandTotal,
              category: roomChargeCategory,
              billedBy: activeUser.name
            },
            activeUser.name
          );

          // Submit the POS order recording the room folio charge
          const completedOrder = dataStore.submitPOSOrder(
            orderItems, 
            activeUser, 
            isOnline, 
            undefined, 
            activeCustName, 
            activeCustPhone, 
            activeCustEmail,
            computedDiscountAmount,
            discountType,
            discountValue
          );

          // Upsert to CRM if option is checked
          if (addToCRM && activeCustName) {
            dataStore.upsertCustomerFromGuest({
              name: activeCustName,
              email: activeCustEmail || `${activeCustName.toLowerCase().replace(/\s+/g, '')}@example.com`,
              phone: activeCustPhone,
              totalSpend: grandTotal,
              notes: `Added during POS checkout, Order ID: ${completedOrder.id}`,
              buyingHabits: newHabits,
              tag: 'customer'
            });
          }

          setRecentCheckout(completedOrder);
          setRoomChargeSuccessNotice(`Billed $${grandTotal.toFixed(2)} to Room #${targetBooking.roomNumber} (${targetBooking.guestName})`);
        } else if (billToOption === 'staff') {
          // Bill to Staff member with payroll deduction
          const users = dataStore.getUsers();
          const targetStaff = users.find(u => u.uid === selectedStaffId) || users.find(u => u.name.toLowerCase() === (billToPersonName || customerName).toLowerCase());
          const staffName = targetStaff ? targetStaff.name : (billToPersonName.trim() || customerName.trim() || 'Staff Member');
          const staffId = targetStaff ? targetStaff.uid : (selectedStaffId || `staff_${Date.now()}`);

          StudentStaffStore.addStaffStoreCharge({
            staffId,
            staffName,
            amount: grandTotal,
            itemsDescription: chargeDesc,
            billedBy: activeUser.name
          });

          activeCustName = `${staffName} (Staff)`;

          const completedOrder = dataStore.submitPOSOrder(
            orderItems, 
            activeUser, 
            isOnline, 
            undefined, 
            activeCustName, 
            activeCustPhone, 
            activeCustEmail,
            computedDiscountAmount,
            discountType,
            discountValue
          );

          setRecentCheckout(completedOrder);
          setRoomChargeSuccessNotice(`Billed $${grandTotal.toFixed(2)} to Staff ${staffName} (Scheduled for payroll deduction on next payslip)`);
        } else if (billToOption === 'student') {
          // Bill to Student vocational account
          const students = StudentStaffStore.getStudents();
          const targetStudent = students.find(s => s.id === selectedStudentId) || students.find(s => s.name.toLowerCase() === (billToPersonName || customerName).toLowerCase());
          const studentName = targetStudent ? targetStudent.name : (billToPersonName.trim() || customerName.trim() || 'Student Trainee');

          activeCustName = `${studentName} (Student)`;

          const completedOrder = dataStore.submitPOSOrder(
            orderItems, 
            activeUser, 
            isOnline, 
            undefined, 
            activeCustName, 
            activeCustPhone, 
            activeCustEmail,
            computedDiscountAmount,
            discountType,
            discountValue
          );

          setRecentCheckout(completedOrder);
          setRoomChargeSuccessNotice(`Billed $${grandTotal.toFixed(2)} to Student ${studentName} vocational account`);
        } else {
          // Bill directly to a specific Person / Customer
          const personName = billToPersonName.trim() || customerName.trim();
          if (!personName) {
            alert("Please enter or select a valid person's name to bill.");
            return;
          }

          activeCustName = personName;

          // Submit order with customer tag
          const completedOrder = dataStore.submitPOSOrder(
            orderItems, 
            activeUser, 
            isOnline, 
            undefined, 
            activeCustName, 
            activeCustPhone, 
            activeCustEmail,
            computedDiscountAmount,
            discountType,
            discountValue
          );

          // Upsert to CRM if option is checked
          if (addToCRM && activeCustName) {
            dataStore.upsertCustomerFromGuest({
              name: activeCustName,
              email: activeCustEmail || `${activeCustName.toLowerCase().replace(/\s+/g, '')}@example.com`,
              phone: activeCustPhone,
              totalSpend: grandTotal,
              notes: `Added during POS checkout, Order ID: ${completedOrder.id}`,
              buyingHabits: newHabits,
              tag: 'customer'
            });
          }

          setRecentCheckout(completedOrder);
          setRoomChargeSuccessNotice(`Successfully billed $${grandTotal.toFixed(2)} directly to Account: ${activeCustName}`);
        }

        setCart([]);
        setRoomChargeCustomNote('');
        setBillToPersonName('');
        setCustomerSearchInput('');
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setAddToCRM(false);
        setDiscountValue(0);

        setOfflineQueue(dataStore.getOfflineQueue());
        setOrders(dataStore.getOrders());

        setTimeout(() => {
          setRecentCheckout(null);
          setRoomChargeSuccessNotice(null);
        }, 6000);
        return;
      }

      // Default Cash / Card / MoMo checkout
      const completedOrder = dataStore.submitPOSOrder(
        orderItems, 
        activeUser, 
        isOnline, 
        undefined, 
        activeCustName, 
        activeCustPhone, 
        activeCustEmail,
        computedDiscountAmount,
        discountType,
        discountValue
      );

      // Upsert to CRM if option is checked
      if (addToCRM && activeCustName) {
        dataStore.upsertCustomerFromGuest({
          name: activeCustName,
          email: activeCustEmail || `${activeCustName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          phone: activeCustPhone,
          totalSpend: grandTotal,
          notes: `Added during POS checkout, Order ID: ${completedOrder.id}`,
          buyingHabits: newHabits,
          tag: 'customer'
        });
      }

      setRecentCheckout(completedOrder);
      setCart([]);
      setCustomerSearchInput('');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setAddToCRM(false);
      setDiscountValue(0);
      
      // Auto refresh offline queue count
      setOfflineQueue(dataStore.getOfflineQueue());
      setOrders(dataStore.getOrders());

      // Auto clear feedback message after 5 seconds
      setTimeout(() => {
        setRecentCheckout(null);
      }, 5000);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleSync = async () => {
    if (offlineQueue.length === 0) return;
    const countToSync = offlineQueue.length;
    setSyncing(true);
    try {
      await dataStore.syncOfflineQueue(activeUser);
      setOfflineQueue([]);
      setOrders(dataStore.getOrders());
      setSyncToast({ show: true, count: countToSync, timestamp: new Date().toLocaleTimeString() });
      setTimeout(() => setSyncToast(null), 6000);
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setSyncing(false);
    }
  };

  // AI Multimodal Receipt Scanning Simulation
  const triggerAIScan = async (sampleIndex: number) => {
    setScanning(true);
    const sample = SAMPLE_INVOICES[sampleIndex];

    try {
      const response = await fetch('/api/ai/parse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: sample.image,
          mimeType: 'image/png'
        })
      });

      const parsedInvoice = await response.json();
      
      if (parsedInvoice && parsedInvoice.detectedItems) {
        // Map parsed items back to our catalog or add them as temporary custom items
        const newCart: Array<{ product: Product; quantity: number }> = [];
        
        parsedInvoice.detectedItems.forEach((scannedItem: any) => {
          // Attempt SKU match with products catalog
          const matchedProduct = products.find(p => 
            p.name.toLowerCase().includes(scannedItem.name.toLowerCase()) ||
            scannedItem.name.toLowerCase().includes(p.name.toLowerCase())
          );

          if (matchedProduct) {
            newCart.push({ product: matchedProduct, quantity: scannedItem.quantity });
          } else {
            // Add custom non-catalog item
            const customProduct: Product = {
              id: 'custom_' + Math.floor(Math.random() * 10000),
              sku: 'AI-TEMP-' + Math.floor(1000 + Math.random() * 9000),
              name: scannedItem.name,
              price: scannedItem.price || 19.99,
              category: 'AI Scanned'
            };
            newCart.push({ product: customProduct, quantity: scannedItem.quantity });
          }
        });

        setCart(newCart);
      }
    } catch (err) {
      console.error("AI Ingestion failed:", err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full animate-fadeIn" id="pos_module">
      
      {/* Tab Switcher and Module Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-800">Tumi Sales & POS Terminal</h1>
            <p className="text-[11px] text-slate-500">Dual-state checkout registers, smart customer search, and transaction logs.</p>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setSelectedReceipt(null); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'register'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>POS Register</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'receipts'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Receipt Archives & Logs</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPendingPaymentsModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-xs relative"
          >
            <BedDouble className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending & Billed Accounts</span>
            {totalPendingAccountsCount > 0 && (
              <span className="bg-amber-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ml-1 animate-pulse">
                {totalPendingAccountsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ERP System-wide Active Currency Selector */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-indigo-800/40">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-indigo-300 animate-pulse" />
          <div>
            <span className="text-xs font-bold block">Active Billing & Transaction Currency</span>
            <span className="text-[10px] text-indigo-200">Adjust active checkout billing rates and ledger formatting globally across the ERP. Default is Ghs (GHS).</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-indigo-200">Selected Currency:</span>
          <select
            value={activeCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="bg-indigo-950 border border-indigo-700 text-white font-extrabold text-xs py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
          >
            <option value="GHS">🇬🇭 GHS (GH₵) - Ghanaian Cedi [Default]</option>
            <option value="USD">🇺🇸 USD ($) - US Dollar</option>
            <option value="EUR">🇪🇺 EUR (€) - Euro</option>
            <option value="ZAR">🇿🇦 ZAR (R) - South African Rand</option>
          </select>
        </div>
      </div>

      {activeTab === 'register' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
          {/* Visual Toast Notification for Offline Sync */}
          {syncToast && syncToast.show && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3.5 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span>Firestore Offline Sync Complete</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">SUCCESS</span>
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Successfully synced <strong>{syncToast.count} offline transaction(s)</strong> to Firestore database at {syncToast.timestamp}!
            </p>
          </div>
          <button 
            onClick={() => setSyncToast(null)} 
            className="ml-3 text-slate-400 hover:text-white font-bold p-1 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* LEFT: Products Catalog and AI Scanning Ingestion */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        
        {/* Network & Active Cashier Status Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-800 text-sm">Network Status:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {isOnline ? 'Online (Real-time Firestore Sync)' : 'Offline (Local Cache Queueing)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isOnline 
                  ? 'All processed transactions write directly to Firestore.' 
                  : 'Checkout will save to offline queue & sync automatically when back online.'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleNetwork}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                isOnline 
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' 
                  : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              Toggle {isOnline ? 'Offline Mode' : 'Online Connection'}
            </button>
          </div>
        </div>

        {/* AI Multimodal Scanning Trigger Panel */}
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
            <Sparkles className="w-48 h-48 text-indigo-900" />
          </div>
          <div className="relative">
            <div className="flex items-center space-x-2">
              <span className="bg-violet-100 text-violet-800 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Native
              </span>
              <h2 className="text-sm font-semibold text-slate-800">Multimodal Invoice Scanning</h2>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 max-w-xl">
              Simulate uploading physical, scanned invoice sheets. The Gemini Multimodal Vision API processes the line items and vendor information on the server side to instantly populate your checkout cart.
            </p>
            
            <div className="mt-4 flex flex-wrap gap-3">
              {SAMPLE_INVOICES.map((sample, idx) => (
                <button
                  key={idx}
                  disabled={scanning}
                  onClick={() => triggerAIScan(idx)}
                  className="bg-white hover:bg-violet-50 text-slate-700 border border-violet-100 hover:border-violet-300 px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  <FileText className="w-4 h-4 text-violet-600" />
                  <div className="text-left">
                    <p className="font-semibold text-slate-800">{sample.name}</p>
                    <p className="text-[10px] text-slate-500">{sample.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {scanning && (
              <div className="mt-4 flex items-center space-x-2 text-xs font-medium text-violet-700 bg-violet-100/50 p-3 rounded-lg border border-violet-200">
                <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                <span>Gemini is scanning the multimodal document bytes & extracting structured item arrays...</span>
              </div>
            )}
          </div>
        </div>

        {/* Products Catalog Display Grid */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex-1">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" /> Product Catalog
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {products.map(product => {
              const inv = dataStore.getInventory().find(i => i.productId === product.id);
              const isLowStock = inv ? inv.stockLevel <= inv.ai_reorder_point : false;

              return (
                <div 
                  key={product.id}
                  className="border border-slate-100 hover:border-indigo-100 hover:shadow-md rounded-xl p-4 flex flex-col justify-between transition-all bg-slate-50/50"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                        {product.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{product.sku}</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm line-clamp-1">{product.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 h-8 leading-tight">{product.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Price</p>
                      <p className="text-sm font-bold text-slate-900">${product.price.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      {inv && (
                        <span className={`text-[10px] font-medium mb-1.5 ${isLowStock ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
                          Stock: {inv.stockLevel}
                          {isLowStock && ' (Low)'}
                        </span>
                      )}
                      <button
                        onClick={() => addToCart(product)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* RIGHT: Active Shopping Cart & Log Synchronization */}
      <div className="lg:col-span-4 flex flex-col space-y-6">
        
        {/* POS Cart Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-800 text-sm">POS Shopping Cart</h2>
              </div>
              <button 
                onClick={clearCart}
                className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors"
              >
                Clear Cart
              </button>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-2">
                <ShoppingCart className="w-10 h-10 text-slate-200" />
                <p className="text-xs font-medium">Cart is completely empty</p>
                <p className="text-[10px] max-w-[200px]">Click catalog items or trigger AI receipt scan above to load items.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.product.id} className="flex flex-col p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-800 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {format(item.product.price)} each
                          {item.discountValue && item.discountValue > 0 ? (
                            <span className="text-rose-600 font-medium ml-1">
                              (-{item.discountType === 'percent' ? `${item.discountValue}%` : format(item.discountValue)} disc)
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="p-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-slate-800 w-5 text-center">{item.quantity}</span>
                        <button 
                          type="button"
                          onClick={() => addToCart(item.product)}
                          className="p-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Item level discount controls */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-500 text-[9px] font-medium">Disc:</span>
                        <select
                          value={item.discountType || 'percent'}
                          onChange={(e) => updateItemDiscount(item.product.id, e.target.value as 'percent' | 'cash', item.discountValue || 0)}
                          className="bg-white border border-slate-200 rounded text-[9px] px-1 py-0.5 focus:outline-hidden text-slate-700"
                        >
                          <option value="percent">%</option>
                          <option value="cash">Amt</option>
                        </select>
                        <input
                          type="number"
                          value={item.discountValue || ''}
                          placeholder="0"
                          onChange={(e) => updateItemDiscount(item.product.id, item.discountType || 'percent', Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-10 bg-white border border-slate-200 rounded text-[9px] px-1 py-0.5 focus:outline-hidden text-center text-slate-800 font-semibold"
                        />
                      </div>
                      <div className="font-semibold text-slate-700 text-[10px]">
                        Line: {format(calculateItemTotal(item))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout & Cashier Summary details */}
          <div className="border-t border-slate-100 pt-4 mt-6">
            {/* Interactive Discount Control Box */}
            <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/50 mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                  🏷️ Apply Promo Discount
                </span>
                <div className="flex bg-white rounded-md border border-indigo-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`px-2 py-0.5 text-[9px] font-extrabold rounded transition-all ${
                      discountType === 'percent'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-indigo-600 hover:text-indigo-800'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('cash')}
                    className={`px-2 py-0.5 text-[9px] font-extrabold rounded transition-all ${
                      discountType === 'cash'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-indigo-600 hover:text-indigo-800'
                    }`}
                  >
                    $
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={discountType === 'percent' ? 'Discount % (e.g. 10)' : 'Discount Amount (e.g. 5)'}
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-white text-xs border border-indigo-200 rounded-lg p-2 font-semibold text-indigo-950 placeholder-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {discountValue > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscountValue(0)}
                    className="text-[10px] text-rose-600 hover:underline font-bold shrink-0"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Subtotal:</span>
                <span className="font-mono">{format(cartTotal)}</span>
              </div>
              {computedDiscountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                  <span>Discount ({discountType === 'percent' ? `${discountValue}%` : 'Flat Cash'}):</span>
                  <span className="font-mono">-{format(computedDiscountAmount)}</span>
                </div>
              )}
              
              {/* Optional Tax Checkbox */}
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeTax}
                    onChange={(e) => setIncludeTax(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                  />
                  <span>Add Tax/VAT</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({taxConfig?.taxMode === 'exempt' ? 'Exempt' : taxConfig?.taxMode === 'gra_standard' ? '21.9%' : taxConfig?.taxMode === 'gra_flat_3' ? '4%' : taxConfig?.taxMode === 'custom' ? `${taxConfig?.customTaxRate}%` : '8%'})
                  </span>
                </label>
                <span className={`font-mono font-bold ${includeTax ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                  {format(computedTaxAmount)}
                </span>
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount:</span>
                <span className="font-mono text-indigo-600 font-black">{format(computedGrandTotal)}</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-2.5 mb-4 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Cashier</p>
                <p className="text-xs font-bold text-slate-700">{activeUser.name}</p>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono uppercase font-semibold">
                {activeUser.role}
              </span>
            </div>

            {/* STRIPE TERMINAL HARDWARE INTEGRATION COMPONENT */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Payment Method</p>
              <div className="grid grid-cols-4 gap-1 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('cash');
                    setStripeConnected(false);
                    setPaymentProcessed(false);
                  }}
                  className={`py-2 px-1.5 text-[10px] font-bold rounded-lg border text-center transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('stripe_terminal');
                    initializeStripeTerminal();
                  }}
                  className={`py-2 px-1.5 text-[10px] font-bold rounded-lg border text-center transition-all ${
                    paymentMethod === 'stripe_terminal'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  💳 Stripe
                </button>
                <button
                  type="button"
                  id="btn_pay_bill_to_room"
                  onClick={() => {
                    setPaymentMethod('room_folio');
                    setStripeConnected(false);
                    setPaymentProcessed(false);
                    const all = dataStore.getBookings();
                    const eligible = all.filter(b => b.status === 'checked_in' || (b.status === 'confirmed' && b.roomId));
                    setActiveBookings(eligible);
                    if (eligible.length > 0 && !selectedBookingId) {
                      setSelectedBookingId(eligible[0].id);
                    }
                  }}
                  className={`py-2 px-1.5 text-[10px] font-bold rounded-lg border text-center transition-all ${
                    paymentMethod === 'room_folio'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-400/20 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  📌 Bill To
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('mobile_money');
                    setStripeConnected(false);
                    setPaymentProcessed(false);
                  }}
                  className={`py-2 px-1.5 text-[10px] font-bold rounded-lg border text-center transition-all ${
                    paymentMethod === 'mobile_money'
                      ? 'bg-amber-55 border-amber-300 text-amber-800 ring-2 ring-amber-400/20 shadow-sm bg-amber-50'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  📱 MoMo
                </button>
              </div>

              {/* CUSTOMER & GUEST AUTCOMPLETE LOOKUP */}
              {!(paymentMethod === 'room_folio' && billToOption === 'room') && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs mb-4 space-y-3 relative">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      Customer Information
                    </span>
                    {customerName && (
                      <button 
                        type="button"
                        onClick={() => {
                          setCustomerSearchInput('');
                          setCustomerName('');
                          setCustomerEmail('');
                          setCustomerPhone('');
                          setAddToCRM(false);
                          setBillToPersonName('');
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] uppercase font-bold text-slate-500">
                        Search Guest or Customer Name
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsQuickAddOpen(true)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50/50 hover:bg-indigo-50 px-2 py-0.5 rounded transition-all"
                      >
                        ⚡ Quick-Add Walk-in
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={customerSearchInput}
                        onChange={(e) => {
                          setCustomerSearchInput(e.target.value);
                          setCustomerName(e.target.value);
                          setBillToPersonName(e.target.value);
                          setShowAutocompleteDropdown(true);
                        }}
                        onFocus={() => setShowAutocompleteDropdown(true)}
                        placeholder="Type name to search lodging guests, CRM, or buyers..."
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      
                      {/* Floating Dropdown Suggestion List with Enter/Exit Animations */}
                      <AnimatePresence>
                        {showAutocompleteDropdown && autocompleteSuggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-[9999] divide-y divide-slate-100"
                          >
                            {autocompleteSuggestions.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectSuggestion(item)}
                                className="w-full text-left p-2.5 hover:bg-indigo-50 text-slate-700 font-medium text-xs transition-colors flex items-center justify-between"
                              >
                                <span className="truncate">{item.label}</span>
                                {item.email && <span className="text-[9px] text-slate-400 font-mono ml-1 truncate">{item.email}</span>}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Floating Quick-Add CRM Form Modal */}
                  <AnimatePresence>
                    {isQuickAddOpen && (
                      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: 8 }}
                          className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 w-full max-w-sm space-y-4"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div>
                              <h3 className="text-xs font-extrabold text-slate-800">⚡ Quick-Add Customer</h3>
                              <p className="text-[10px] text-slate-400 font-semibold">Saves details instantly to the CRM list</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsQuickAddOpen(false)}
                              className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                            >
                              ✕
                            </button>
                          </div>
                          
                          <form onSubmit={handleQuickAddSubmit} className="space-y-3">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                              <input
                                type="text"
                                required
                                value={quickAddName}
                                onChange={(e) => setQuickAddName(e.target.value)}
                                placeholder="E.g., Kofi Mensah"
                                className="w-full bg-slate-55 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-slate-50"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                              <input
                                type="text"
                                value={quickAddPhone}
                                onChange={(e) => setQuickAddPhone(e.target.value)}
                                placeholder="E.g., +233 24 123 4567"
                                className="w-full bg-slate-55 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-slate-50"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Email Address (Optional)</label>
                              <input
                                type="email"
                                value={quickAddEmail}
                                onChange={(e) => setQuickAddEmail(e.target.value)}
                                placeholder="E.g., kofi@example.com"
                                className="w-full bg-slate-55 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-slate-50"
                              />
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setIsQuickAddOpen(false)}
                                className="w-1/2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold p-2 rounded-lg text-xs transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2 rounded-lg text-xs shadow-md shadow-indigo-600/10 transition-colors"
                              >
                                Add & Select
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {customerName.trim() && (
                    <div className="space-y-2 pt-2 border-t border-dashed border-slate-200 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Email</label>
                          <input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="customer@example.com"
                            className="w-full bg-white border border-slate-250 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Phone</label>
                          <input
                            type="text"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="+233 xx xxx xxxx"
                            className="w-full bg-white border border-slate-250 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 text-xs"
                          />
                        </div>
                      </div>

                      {/* Add to CRM Checkbox Option */}
                      {(() => {
                        const existsInCrm = dataStore.getCustomers().some(c => c.name.toLowerCase() === customerName.toLowerCase() || (customerEmail && c.email?.toLowerCase() === customerEmail.toLowerCase()));
                        if (existsInCrm) {
                          return (
                            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              ✓ Linked to existing CRM profile.
                            </p>
                          );
                        }
                        return (
                          <label className="flex items-center gap-2 cursor-pointer bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                            <input
                              type="checkbox"
                              checked={addToCRM}
                              onChange={(e) => setAddToCRM(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                            <span className="text-[10px] font-bold text-indigo-900">
                              Add customer details to CRM during sale
                            </span>
                          </label>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ACCOUNT BILLING PANEL (ROOM OR PERSON) */}
              {paymentMethod === 'room_folio' && (
                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 text-xs mb-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-rose-200/80 pb-2">
                    <span className="font-bold text-rose-900 flex items-center gap-1.5">
                      <BedDouble className="w-4 h-4 text-rose-600" />
                      Account Billing Options
                    </span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-300">
                      Charge to Account
                    </span>
                  </div>

                  {/* Segment Selector for Room / Person / Staff / Student */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-white/80 border border-rose-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setBillToOption('room')}
                      className={`py-1.5 px-2 text-center text-[10px] font-bold rounded-md transition-all ${
                        billToOption === 'room'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-rose-50/50'
                      }`}
                    >
                      🏨 Room
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillToOption('person')}
                      className={`py-1.5 px-2 text-center text-[10px] font-bold rounded-md transition-all ${
                        billToOption === 'person'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-rose-50/50'
                      }`}
                    >
                      👤 Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillToOption('staff')}
                      className={`py-1.5 px-2 text-center text-[10px] font-bold rounded-md transition-all ${
                        billToOption === 'staff'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-rose-50/50'
                      }`}
                    >
                      👔 Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillToOption('student')}
                      className={`py-1.5 px-2 text-center text-[10px] font-bold rounded-md transition-all ${
                        billToOption === 'student'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-rose-50/50'
                      }`}
                    >
                      🎓 Student
                    </button>
                  </div>

                  {billToOption === 'room' && (
                    activeBookings.length === 0 ? (
                      <div className="p-2.5 bg-white border border-rose-200 rounded-lg text-rose-700 text-[11px]">
                        No active checked-in guests found in the Hospitality module. Check in a reservation in the Hospitality Manager first.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                            Select Active Room & Guest
                          </label>
                          <select
                            id="select_room_folio_booking"
                            value={selectedBookingId}
                            onChange={(e) => setSelectedBookingId(e.target.value)}
                            className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          >
                            {activeBookings.map(b => (
                              <option key={b.id} value={b.id}>
                                Room #{b.roomNumber} - {b.guestName} ({b.sourceChannel} | Check-out: {b.checkOutDate})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  )}

                  {billToOption === 'staff' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase font-bold text-slate-500">
                        Select Staff Member (Payroll Deduction)
                      </label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => {
                          setSelectedStaffId(e.target.value);
                          const matched = dataStore.getUsers().find(u => u.uid === e.target.value);
                          if (matched) setCustomerName(matched.name);
                        }}
                        className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="">-- Choose Employee --</option>
                        {dataStore.getUsers().map(u => (
                          <option key={u.uid} value={u.uid}>
                            {u.name} ({u.role.toUpperCase()}) - Base: ${u.baseSalary || 2000}/mo
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-rose-700 font-medium bg-rose-100/60 p-2 rounded-lg border border-rose-200">
                        ℹ️ This purchase will be logged under Staff Store Charges and automatically deducted on the monthly Tumi Hostel pay slip.
                      </p>
                    </div>
                  )}

                  {billToOption === 'student' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase font-bold text-slate-500">
                        Select Vocational Student
                      </label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => {
                          setSelectedStudentId(e.target.value);
                          const matched = StudentStaffStore.getStudents().find(s => s.id === e.target.value);
                          if (matched) setCustomerName(matched.name);
                        }}
                        className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="">-- Choose Student --</option>
                        {StudentStaffStore.getStudents().map(st => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.programName}) - 3-Trench Ledger ({st.accountStatus})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-indigo-700 font-medium bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                        ℹ️ This transaction will be billed to the student's vocational account ledger alongside maintenance fee installments.
                      </p>
                    </div>
                  )}

                  {billToOption === 'person' && (
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-[11px] font-medium">
                      ✓ Individual Person / Client details will be linked from the Customer Details card above.
                    </div>
                  )}

                  {/* Shared Category and Notes */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Service / Item Category
                      </label>
                      <select
                        value={roomChargeCategory}
                        onChange={(e) => setRoomChargeCategory(e.target.value as any)}
                        className="w-full bg-white border border-rose-300 rounded-lg p-1.5 text-xs text-slate-800"
                      >
                        <option value="Shop / POS Purchase">Shop / POS Purchase</option>
                        <option value="Minibar">Minibar Consumption</option>
                        <option value="Room Service">Room Service</option>
                        <option value="Spa / Amenities">Spa / Amenities</option>
                        <option value="Laundry">Laundry Service</option>
                        <option value="Incidental">Incidental / Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Auth / Receipt Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={roomChargeCustomNote}
                        onChange={(e) => setRoomChargeCustomNote(e.target.value)}
                        placeholder="e.g. Guest signed slip #44"
                        className="w-full bg-white border border-rose-300 rounded-lg p-1.5 text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Folio Preview (only if Room option is selected) */}
                  {billToOption === 'room' && (() => {
                    const sel = activeBookings.find(b => b.id === selectedBookingId);
                    if (!sel) return null;
                    const grandTotal = Number((cartTotal * 1.08).toFixed(2));
                    const currentChargesCount = sel.roomCharges?.length || 0;
                    const matchedRoom = dataStore.getRooms().find(r => r.id === sel.roomId || r.number === sel.roomNumber);

                    return (
                      <div className="space-y-2 pt-2 border-t border-rose-100">
                        <div className="bg-white p-2.5 rounded-lg border border-rose-200 text-[11px] space-y-1">
                          <div className="flex justify-between font-semibold text-slate-700">
                            <span>Guest:</span>
                            <span>{sel.guestName}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Room Folio:</span>
                            <span className="font-mono">#{sel.roomNumber} ({sel.status.toUpperCase()})</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Existing Charges on Folio:</span>
                            <span>{currentChargesCount} items</span>
                          </div>
                          <div className="flex justify-between font-bold text-rose-700 pt-1 border-t border-rose-100">
                            <span>Amount to Charge to Room:</span>
                            <span>${grandTotal.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* AI-Driven Amenity Upsells based on Guest CRM History */}
                        <GuestAmenityRecommender
                          booking={sel}
                          room={matchedRoom}
                          currentCharges={sel.roomCharges || []}
                          contextMode="pos_checkout"
                          compact={true}
                          onApplyAmenity={(rec) => {
                            const amenityProd: Product = {
                              id: `amenity_${Date.now()}`,
                              name: rec.name,
                              sku: `AMEN-${rec.category.toUpperCase().slice(0, 3)}`,
                              description: rec.justification,
                              price: rec.price,
                              category: 'Hospitality Amenities'
                            };
                            addToCart(amenityProd);
                          }}
                        />
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* MOBILE MONEY GHANA / WEST AFRICA INTEGRATION PANEL */}
              {paymentMethod === 'mobile_money' && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs mb-4 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      📱 Mobile Money Gateway
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300 uppercase">
                      Live Simulator
                    </span>
                  </div>

                  <div className="space-y-3 text-[11px]">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Select MoMo Network
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-white border border-amber-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setMomoNetwork('mtn')}
                          className={`py-1 text-center text-[10px] font-bold rounded-md transition-all ${
                            momoNetwork === 'mtn'
                              ? 'bg-yellow-400 text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          MTN MoMo
                        </button>
                        <button
                          type="button"
                          onClick={() => setMomoNetwork('telecel')}
                          className={`py-1 text-center text-[10px] font-bold rounded-md transition-all ${
                            momoNetwork === 'telecel'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Telecel Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => setMomoNetwork('at')}
                          className={`py-1 text-center text-[10px] font-bold rounded-md transition-all ${
                            momoNetwork === 'at'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          AT Money
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Subscriber Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={momoPhoneNumber}
                        onChange={(e) => setMomoPhoneNumber(e.target.value)}
                        placeholder="e.g. 0541234567 or 0201234567"
                        className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {momoNetwork === 'telecel' && (
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                          Voucher Code (Generated via *110#)
                        </label>
                        <input
                          type="text"
                          required
                          value={momoVoucherCode}
                          onChange={(e) => setMomoVoucherCode(e.target.value)}
                          placeholder="e.g. 123456"
                          maxLength={6}
                          className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <p className="text-[9px] text-slate-500 mt-0.5">Telecel Cash requires subscribers to generate a 6-digit voucher code beforehand.</p>
                      </div>
                    )}

                    <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg space-y-1 text-slate-600">
                      <p className="font-bold text-slate-700">Production Live Keys Required:</p>
                      <p className="text-[10px]">
                        To enable real payments with MTN Mobile Money, Telecel, and AT, configure a West African payment hub:
                      </p>
                      <ul className="list-disc list-inside text-[9px] text-slate-500 pl-1 space-y-0.5">
                        <li><strong>Flutterwave:</strong> Secret Key & Webhook Secret</li>
                        <li><strong>Paystack:</strong> Secret Key & Callback URL</li>
                        <li><strong>Hubtel Ghana:</strong> Merchant ID & API Keys</li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      disabled={!momoPhoneNumber || (momoNetwork === 'telecel' && !momoVoucherCode)}
                      onClick={() => {
                        setMomoPromptStatus('pending');
                        setMomoPromptPin('');
                        setMomoPromptOpen(true);
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    >
                      <span>🚀 Send USSD Push Prompt</span>
                    </button>
                  </div>
                </div>
              )}

              {roomChargeSuccessNotice && (
                <div className="mb-3 p-2.5 bg-emerald-100 border border-emerald-300 rounded-lg text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{roomChargeSuccessNotice}</span>
                </div>
              )}

              {paymentMethod === 'stripe_terminal' && (
                <div className="bg-slate-50 border border-indigo-100 rounded-lg p-3 text-xs mb-4">
                  <div className="flex items-center justify-between border-b border-indigo-50 pb-2 mb-2">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      📠 Stripe Card Reader
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                      stripeConnecting ? 'bg-amber-100 text-amber-700 animate-pulse' :
                      stripeConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {stripeConnecting ? 'Connecting' : stripeConnected ? 'Ready (LAN/Wi-Fi)' : 'Offline'}
                    </span>
                  </div>

                  {stripeConnecting && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 py-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      <span>Requesting Stripe Connection Token...</span>
                    </div>
                  )}

                  {stripeConnected && !paymentProcessed && (
                    <div className="space-y-2">
                      <div className="p-2 bg-emerald-50/50 border border-emerald-100 rounded text-[11px] text-emerald-800">
                        ✓ Connected to **BBPOS WisePOS E (IP: 192.168.1.145)**
                      </div>
                      <p className="text-[10px] text-slate-500">Insert, swipe, or tap card on physical terminal to complete transaction.</p>
                      
                      <button
                        type="button"
                        onClick={simulateStripeCardTap}
                        disabled={paymentProcessing || cart.length === 0}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {paymentProcessing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Authorizing Card...</span>
                          </>
                        ) : (
                          <>
                            <span>Simulate Reader Card Tap</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {paymentProcessed && (
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded font-bold text-center border border-emerald-200">
                      🎉 Stripe Terminal Approved & Paid!
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || (paymentMethod === 'stripe_terminal' && !paymentProcessed)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center space-x-2 transition-colors ${
                cart.length === 0 || (paymentMethod === 'stripe_terminal' && !paymentProcessed)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : isOnline
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isOnline ? 'Process Checkout (Online)' : 'Process Checkout (Offline Queue)'}</span>
            </button>

            {/* Offline-first indicators */}
            {!isOnline && (
              <p className="text-[10px] text-amber-600 font-medium text-center mt-2 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Order will queue in Local Cache for auto-sync.
              </p>
            )}
          </div>
        </div>

        {/* Offline Cache Synchronizer Log Panel */}
        <div className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <h2 className="font-bold text-slate-200 text-sm">Offline Sync Manager</h2>
              </div>
              <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                Queue: {offlineQueue.length}
              </span>
            </div>

            {recentCheckout && (
              <div className="mb-4 p-3 bg-slate-800 text-xs rounded-lg border border-slate-700 flex flex-col space-y-1">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Order Completed!
                </span>
                <p className="text-slate-300">ID: <span className="font-mono">{recentCheckout.id}</span></p>
                <p className="text-slate-300">Total: ${recentCheckout.totalAmount.toFixed(2)}</p>
                <p className="text-[10px] text-slate-400">
                  {recentCheckout.offline ? 'Stored locally in offline cache.' : 'Written synchronously to database.'}
                </p>
                <button
                  onClick={() => handlePrintReceipt(recentCheckout)}
                  className="mt-2 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt / Export PDF</span>
                </button>
              </div>
            )}

            {offlineQueue.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 italic text-center">
                All logs synchronized. No pending offline orders.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                <p className="text-xs text-slate-300">Pending Local Logs:</p>
                <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1">
                  {offlineQueue.map(order => (
                    <div key={order.id} className="text-[10px] bg-slate-800/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <div className="font-mono">
                        <span className="text-amber-400 font-bold">[{order.id}]</span>
                        <p className="text-slate-400 font-sans">{order.items.length} items</p>
                      </div>
                      <span className="text-slate-200 font-bold">${order.totalAmount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={handleSync}
              disabled={offlineQueue.length === 0 || syncing || !isOnline}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors ${
                offlineQueue.length === 0 || syncing || !isOnline
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {syncing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing Transaction Logs...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Log Queue ({offlineQueue.length})</span>
                </>
              )}
            </button>
            {!isOnline && offlineQueue.length > 0 && (
              <p className="text-[9px] text-center text-rose-400 mt-2">
                Cannot synchronize offline. Reconnect the network status above first.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  ) : (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm w-full animate-fadeIn">
          {/* Transaction Archive Panel */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600" /> Dedicated Receipt & Invoice Finder
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Showing {filteredReceipts.length} total receipts stored in database</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="csv_pos_upload"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCSVUpload}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('csv_pos_upload')?.click()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  📥 Upload Historical POS CSV
                </button>
              </div>
            </div>

            {/* 4 Dedicated Search Inputs Grid */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                
                {/* Field 1: Receipt Number */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Receipt Number / ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. pos-100234 or wc-12345"
                    value={receiptNoFilter}
                    onChange={e => setReceiptNoFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Field 2: Customer Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Customer / Guest Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amma Konadu, Walk-in..."
                    value={customerNameFilter}
                    onChange={e => setCustomerNameFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Field 3: Specific Date */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={receiptDateFilter}
                    onChange={e => setReceiptDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Field 4: Item Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Item / Product Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mouse, Chair, Uniform..."
                    value={itemFilter}
                    onChange={e => setItemFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

              </div>

              {/* Clear Filters Action */}
              {(receiptNoFilter || customerNameFilter || receiptDateFilter || itemFilter || receiptSearchQuery) && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptNoFilter('');
                      setCustomerNameFilter('');
                      setReceiptDateFilter('');
                      setItemFilter('');
                      setReceiptSearchQuery('');
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
                  >
                    ✕ Clear All Search Filters
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* List Table */}
              <div className="lg:col-span-8 bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500">
                        <th className="py-3 px-4">Receipt ID</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Customer / Guest</th>
                        <th className="py-3 px-4">Items Purchased</th>
                        <th className="py-3 px-4 text-right">Total Amount</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredReceipts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                            <p className="mb-2">No transaction logs match your criteria</p>
                            <button 
                              type="button"
                              onClick={() => setReceiptSearchQuery('')}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                            >
                              Clear Search Filters
                            </button>
                          </td>
                        </tr>
                      ) : (
                        filteredReceipts.map(order => {
                          const dateObj = new Date(order.createdAt);
                          const displayDate = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                          const displayTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                          return (
                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-indigo-600 text-[11px]">{order.id}</td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-700 block">{displayDate}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{displayTime}</span>
                              </td>
                              <td className="py-3 px-4">
                                {order.customerName ? (
                                  <div>
                                    <span className="font-semibold text-slate-800 block">{order.customerName}</span>
                                    {order.customerEmail && (
                                      <span className="text-[10px] text-slate-400 block font-mono truncate max-w-[150px]">{order.customerEmail}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic font-medium">Anonymous Cash Client</span>
                                )}
                              </td>
                              <td className="py-3 px-4 max-w-[180px]">
                                <span className="font-semibold text-slate-700 block truncate">
                                  {order.items.map(it => `${it.name} (x${it.quantity})`).join(', ')}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">{order.items.length} unique items</span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-slate-800">
                                ${order.totalAmount.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  order.status === 'synced'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {order.status === 'synced' ? '✓ SYNCED' : '⏰ LOCAL'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReceipt(order)}
                                    className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-md transition-colors"
                                    title="View Full Receipt Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePrintReceipt(order)}
                                    className="p-1.5 hover:bg-slate-100 hover:text-slate-800 text-slate-500 rounded-md transition-colors"
                                    title="Reprint Receipt / Print Invoice"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Receipt Detail panel */}
              <div className="lg:col-span-4">
                {selectedReceipt ? (
                  <div className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4 relative animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
                      <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-emerald-400" /> Receipt Details
                      </h3>
                      <button 
                        type="button"
                        onClick={() => setSelectedReceipt(null)}
                        className="text-slate-400 hover:text-slate-100 font-bold text-xs"
                      >
                        ✕ Close
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Order Reference:</span>
                        <span className="font-mono font-bold text-indigo-400">{selectedReceipt.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date & Time:</span>
                        <span className="font-mono">{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Processed By:</span>
                        <span className="font-semibold">{selectedReceipt.cashierName} (ID: {selectedReceipt.cashierId})</span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2 text-[11px]">
                      <p className="font-bold text-slate-400 border-b border-slate-800/60 pb-1.5">Customer details:</p>
                      {selectedReceipt.customerName ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-400" />
                            {selectedReceipt.customerName}
                          </p>
                          {selectedReceipt.customerEmail && (
                            <p className="text-[10px] text-slate-400 font-mono pl-5">Email: {selectedReceipt.customerEmail}</p>
                          )}
                          {selectedReceipt.customerPhone && (
                            <p className="text-[10px] text-slate-400 font-mono pl-5">Phone: {selectedReceipt.customerPhone}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">No customer profiles assigned. Processed as Anonymous Cash Sale.</p>
                      )}
                    </div>

                    {/* Items purchased section */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Line Items</p>
                      <div className="divide-y divide-slate-800 border-t border-b border-slate-800 py-1 max-h-40 overflow-y-auto pr-1">
                        {selectedReceipt.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between py-2 text-xs">
                            <div>
                              <span className="text-slate-300 font-medium block">{item.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">${item.price.toFixed(2)} each x {item.quantity}</span>
                            </div>
                            <span className="text-slate-200 font-bold font-mono">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment totals */}
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Cart Subtotal:</span>
                        <span className="font-mono">${selectedReceipt.totalAmount.toFixed(2)}</span>
                      </div>
                      {selectedReceipt.discountAmount ? (
                        <div className="flex justify-between text-rose-400">
                          <span>Discount ({selectedReceipt.discountType === 'percent' ? `${selectedReceipt.discountValue}%` : 'Cash'}):</span>
                          <span className="font-mono">-${selectedReceipt.discountAmount.toFixed(2)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between text-slate-400">
                        <span>Assessed VAT Tax (8%):</span>
                        <span className="font-mono">${((selectedReceipt.totalAmount - (selectedReceipt.discountAmount || 0)) * 0.08).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white font-extrabold text-sm border-t border-slate-800 pt-2">
                        <span>Total Paid:</span>
                        <span className="font-mono text-emerald-400">${((selectedReceipt.totalAmount - (selectedReceipt.discountAmount || 0)) * 1.08).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(selectedReceipt)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Thermal Receipt</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400 space-y-2">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
                    <p className="text-xs font-semibold">No Receipt Selected</p>
                    <p className="text-[10px] max-w-[200px] mx-auto">Click the eye icon next to any transaction log item to pull and view detailed line-item invoice data.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE MOBILE MONEY PUSH PROMPT USSD OVERLAY SIMULATOR */}
      {momoPromptOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-4 shadow-2xl w-80 relative flex flex-col items-center">
            {/* Speaker Grill & Camera */}
            <div className="w-24 h-4 bg-slate-950 rounded-full mb-6 relative">
              <div className="absolute right-3 top-1 w-2 h-2 bg-slate-900 rounded-full" />
            </div>

            <div className="bg-slate-100 rounded-2xl w-full p-4 flex flex-col justify-between min-h-[360px] text-slate-800 shadow-inner">
              <div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mb-4 border-b pb-1">
                  <span>{momoNetwork.toUpperCase()} Network</span>
                  <span>100% Secure</span>
                </div>

                {momoPromptStatus === 'pending' && (
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shadow-sm text-center font-mono text-xs">
                      <p className="font-bold text-slate-900 mb-2">
                        {momoNetwork === 'mtn' ? '🟡 MTN MoMo Pay' : momoNetwork === 'telecel' ? '🔴 Telecel Cash' : '🔵 AT Money'}
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        Authorize payment of <span className="font-bold text-slate-900">GHS {(cartTotal * 1.08).toFixed(2)}</span> to Tumi Enterprise?
                      </p>
                      <p className="text-[10px] text-slate-500 mt-2">Enter secret 4-digit PIN to authorize transaction:</p>
                      <input
                        type="password"
                        maxLength={4}
                        value={momoPromptPin}
                        onChange={(e) => setMomoPromptPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-24 tracking-widest text-center text-lg font-bold p-1 bg-slate-50 border border-slate-300 rounded-lg mt-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                  </div>
                )}

                {momoPromptStatus === 'success' && (
                  <div className="space-y-3 text-center py-6">
                    <div className="inline-flex p-3 bg-emerald-100 rounded-full">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h4 className="font-bold text-emerald-800 text-sm">Payment Approved</h4>
                    <p className="text-xs text-slate-600">
                      GHS {(cartTotal * 1.08).toFixed(2)} debited successfully. TXN Ref: MOMO-{Date.now().toString().slice(-6)}.
                    </p>
                  </div>
                )}

                {momoPromptStatus === 'failed' && (
                  <div className="space-y-3 text-center py-6">
                    <div className="inline-flex p-3 bg-rose-100 rounded-full">
                      <AlertTriangle className="w-10 h-10 text-rose-600" />
                    </div>
                    <h4 className="font-bold text-rose-800 text-sm">Transaction Cancelled</h4>
                    <p className="text-xs text-slate-600">User rejected request or PIN code was invalid.</p>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t">
                {momoPromptStatus === 'pending' ? (
                  <div className="flex gap-2 text-xs font-bold">
                    <button
                      onClick={() => setMomoPromptStatus('failed')}
                      className="w-1/2 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 animate-pulse"
                    >
                      Reject
                    </button>
                    <button
                      disabled={momoPromptPin.length < 4}
                      onClick={() => {
                        setMomoPromptStatus('success');
                        setPaymentProcessed(true);
                        // Auto trigger checkout success
                        setTimeout(() => {
                          setMomoPromptOpen(false);
                        }, 1800);
                      }}
                      className="w-1/2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg disabled:opacity-40"
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMomoPromptOpen(false)}
                    className="w-full py-2 bg-slate-200 hover:bg-slate-300 font-bold text-xs rounded-lg text-slate-700"
                  >
                    Close Simulator
                  </button>
                )}
              </div>
            </div>

            {/* Home Indicator bar */}
            <div className="w-28 h-1 bg-slate-800 rounded-full mt-4" />
          </div>
        </div>
      )}

      {/* Pending & Billed-to Payments Container Modal */}
      {showPendingPaymentsModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <BedDouble className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold flex items-center gap-2">
                    Pending & Billed-to Payments Container
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
                      POS Folio Hub
                    </span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Search guests or clients to review unsettled room charges, pending balances, or cleared accounts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingPaymentsModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toolbar: Search Bar & Filter Tabs */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 space-y-4 shrink-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pendingSearchQuery}
                    onChange={(e) => setPendingSearchQuery(e.target.value)}
                    placeholder="Search guest or client by name, room #, telephone, or email..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                  {pendingSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPendingSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setPendingFilterTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      pendingFilterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({pendingAccounts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingFilterTab('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      pendingFilterTab === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Pending Payments</span>
                    <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                      {totalPendingAccountsCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingFilterTab('cleared')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      pendingFilterTab === 'cleared' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Accounts Cleared</span>
                    <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                      {pendingAccounts.length - totalPendingAccountsCount}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body: Customer Account Cards */}
            <div className="p-6 overflow-y-auto space-y-4 max-h-[55vh]">
              {filteredPendingAccounts.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <BedDouble className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-700 text-sm">No Matching Customer Accounts Found</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Try searching with another name, room number, or adjusting the status filter tab.
                  </p>
                </div>
              ) : (
                filteredPendingAccounts.map(acc => (
                  <div
                    key={acc.id}
                    className={`border rounded-2xl p-5 transition-all space-y-4 ${
                      acc.status === 'pending'
                        ? 'border-l-8 border-l-amber-500 border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 shadow-2xs'
                        : 'border-l-8 border-l-emerald-500 border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 shadow-2xs'
                    }`}
                  >
                    {/* Top Row: Name, Room #, Status Indicator Bar Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-base text-slate-900">{acc.name}</h4>
                          {acc.roomNumber && (
                            <span className="bg-slate-900 text-white text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                              🏨 Room #{acc.roomNumber}
                            </span>
                          )}
                          {acc.accountType === 'staff' && (
                            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                              👔 Staff / Employee
                            </span>
                          )}
                          {acc.accountType === 'student' && (
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                              🎓 Student
                            </span>
                          )}
                          {acc.accountType === 'customer' && (
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                              👤 CRM Client
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {acc.email && <span>📧 {acc.email}</span>}
                          {acc.phone && <span>📞 {acc.phone}</span>}
                        </div>
                      </div>

                      {/* Color Bar Status Indicator Pill */}
                      <div>
                        {acc.status === 'pending' ? (
                          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-mono font-extrabold px-3.5 py-1.5 rounded-full shadow-2xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            <span>PENDING PAYMENT (${acc.totalUnpaid.toFixed(2)})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-extrabold px-3.5 py-1.5 rounded-full shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ACCOUNT CLEARED ($0.00 BALANCE)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Unpaid Charges Itemized Breakdown or Cleared History */}
                    {acc.status === 'pending' ? (
                      <div className="space-y-2 bg-white/80 p-3.5 rounded-xl border border-amber-200/80">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                          <span>Unpaid Folio Charges & Room Incidental Items:</span>
                          <span className="font-mono text-sm text-rose-700 font-extrabold">${acc.totalUnpaid.toFixed(2)} Balance Due</span>
                        </div>
                        <ul className="space-y-1 text-xs text-slate-700 font-medium">
                          {acc.unpaidCharges.map((chg, idx) => (
                            <li key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                              <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                {chg.description}
                              </span>
                              <span className="font-mono font-bold text-slate-900">${chg.amount.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="bg-white/80 p-3.5 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-2 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          All room charges and accommodation invoices have been settled in full.
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          ${acc.totalPaid.toFixed(2)} Total Settled
                        </span>
                      </div>
                    )}

                    {/* Bottom Row: Quick Action */}
                    {acc.status === 'pending' && (
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Assign customer details to POS register
                            setCustomerName(acc.name);
                            setCustomerSearchInput(acc.name);
                            if (acc.email) setCustomerEmail(acc.email);
                            if (acc.phone) setCustomerPhone(acc.phone);
                            if (acc.bookingId) setSelectedBookingId(acc.bookingId);
                            setPaymentMethod('room_folio');

                            // Populate cart with unpaid items
                            const loadedCart = acc.unpaidCharges.map((item, idx) => ({
                              product: {
                                id: `unpaid_item_${idx}_${Date.now()}`,
                                name: item.description,
                                sku: `FOLIO-${idx}`,
                                price: item.amount,
                                category: item.category || 'Hospitality',
                                stockQuantity: 99,
                                minStockAlert: 1
                              },
                              quantity: 1
                            }));
                            setCart(loadedCart);

                            setShowPendingPaymentsModal(false);
                            setRoomChargeSuccessNotice(`Loaded $${acc.totalUnpaid.toFixed(2)} pending charges for ${acc.name}. Ready for POS checkout!`);
                          }}
                          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm"
                        >
                          <DollarSign className="w-4 h-4 text-amber-400" />
                          <span>Settle Balance at POS Register</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>Showing {filteredPendingAccounts.length} of {pendingAccounts.length} customer accounts</span>
              <button
                type="button"
                onClick={() => setShowPendingPaymentsModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all"
              >
                Close Container
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
