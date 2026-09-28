import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, 
  Sparkles, 
  SlidersHorizontal, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Briefcase, 
  Activity, 
  ArrowRight, 
  Settings,
  X,
  Plus,
  RefreshCw,
  Home,
  CheckCircle2,
  Calendar,
  Lock,
  Globe,
  Store,
  ChevronRight,
  DollarSign,
  Building2,
  ListTodo,
  Landmark,
  Zap,
  MessageSquare,
  Truck,
  Coins,
  CheckSquare,
  Clock,
  UserCheck,
  Edit3,
  Trash2,
  Phone,
  MapPin,
  BookOpen,
  Scissors,
  Baby,
  Upload,
  Search,
  Eye,
  ShieldCheck,
  GraduationCap,
  Heart,
  Filter,
  CreditCard,
  Wallet,
  ArrowUpRight,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Check,
  RotateCcw
} from 'lucide-react';
import { UserProfile, ERPModuleConfig, POSOrder, TaskItem, Opportunity, TaskStatus } from '../types/erp';
import { dataStore } from '../config/firebase';
import { currencyStore, ExchangeRate } from '../utils/currencyStore';
import { StudentStaffStore, StudentRegistrationRecord } from '../utils/studentStaffStore';
import {
  SalesPeriodFilter,
  ReturnRecordItem,
  PERIOD_DEFINITIONS,
  getPeriodDateRange,
  isDateInPeriod,
  isCreditOrder,
  computeSalesKpiForPeriod,
  ensureSeedOrdersAndReturns
} from '../utils/dashboardSeedStore';
import { formatPrice } from '../utils/currency';

interface MyHomeDashboardProps {
  activeUser: UserProfile;
  onNavigateToTab: (tabId: string) => void;
  isDesktopCreated: boolean;
  setIsDesktopCreated: (val: boolean) => void;
  modules: ERPModuleConfig[];
}

const ALL_AVAILABLE_WIDGETS = [
  { id: 'sales', name: 'Sales Channel KPI Matrix', desc: 'Consolidated POS checkouts & WooCommerce online store sync', icon: TrendingUp },
  { id: 'cashflow', name: 'Financial Cash Flow Ledger', desc: 'Real-time revenue, expenses & petty cash ledger balance', icon: DollarSign },
  { id: 'student_staff_mgmt', name: 'Student & Staff Master Database Hub', desc: 'Unified database hub to register, view, edit and delete trainees and employees', icon: UserCheck },
  { id: 'currency', name: 'Currency Conversion Matrix', desc: 'Live buying & selling rates for USD, GBP, and EUR to GHS', icon: Coins },
  { id: 'quick_actions', name: 'One-Click Operations Hub', desc: 'Fast POS checkout, register student/staff, issue petty cash & add leads', icon: Zap },
  { id: 'stock', name: 'Urgent Stock Alerts', desc: 'Low stock notifications & warehouse safety threshold warnings', icon: AlertTriangle },
  { id: 'tasks', name: 'Tasks & Action Items', desc: 'Supervisor action items, employee tasks & todos', icon: ListTodo },
  { id: 'attendance', name: 'Student Attendance Stream', desc: 'Trainee attendance rates & donor compliance tracking', icon: Users },
  { id: 'crm', name: 'CRM Sales Deals Pipeline', desc: 'Corporate leads, contract negotiations & deal pipeline', icon: Briefcase },
  { id: 'hospitality', name: 'Hospitality Occupancy', desc: 'Hotel room occupancy & guest front desk check-ins', icon: Building2 },
  { id: 'grants', name: 'Donor Grant Funding', desc: 'Active grant balances, disbursements & milestone reporting', icon: Landmark },
  { id: 'team_chat', name: 'Team Messaging & Feed', desc: 'Staff announcements, housekeeping & department messages', icon: MessageSquare },
  { id: 'procurement', name: 'Vendor Procurement Orders', desc: 'Pending purchase orders & supplier delivery status', icon: Truck },
  { id: 'audit', name: 'Security & Audit Trail', desc: 'Live immutable system activity & operation logs', icon: Activity },
];

const EDUCATION_OPTIONS = [
  { id: 'primary', label: 'Primary School' },
  { id: 'jhs', label: 'Junior High School (JHS)' },
  { id: 'shs', label: 'Senior High School (SHS)' },
  { id: 'degree', label: "Bachelor's Degree" },
  { id: 'postgraduate', label: 'Postgraduate Diploma' },
  { id: 'masters', label: "Master's Degree" },
  { id: 'no_education', label: 'No Formal Education' }
] as const;

export default function MyHomeDashboard({ 
  activeUser, 
  onNavigateToTab, 
  isDesktopCreated, 
  setIsDesktopCreated,
  modules 
}: MyHomeDashboardProps) {
  // Widget Customizer selections (Saved in localStorage)
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('erp_desktop_widgets');
    return saved ? JSON.parse(saved) : ['sales', 'cashflow', 'student_staff_mgmt', 'quick_actions', 'currency', 'stock', 'tasks', 'crm', 'audit'];
  });

  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [recentOrders, setRecentOrders] = useState<POSOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

  // Currency Store states
  const [rates, setRates] = useState<ExchangeRate[]>(() => currencyStore.getRates());
  const [calcAmount, setCalcAmount] = useState<string>('100');
  const [calcCurrency, setCalcCurrency] = useState<string>('USD');
  const [calcDirection, setCalcDirection] = useState<'buy' | 'sell'>('buy');
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [editedRates, setEditedRates] = useState<ExchangeRate[]>([]);

  // Unified Student & Staff Database States
  const [studentsList, setStudentsList] = useState<StudentRegistrationRecord[]>(() => StudentStaffStore.getStudents());
  const [staffList, setStaffList] = useState<any[]>(() => StudentStaffStore.getStaffList());
  const [dbTab, setDbTab] = useState<'students' | 'staff'>('students');
  const [dbSearchQuery, setDbSearchQuery] = useState('');

  // Orders & Returns State (Synchronized)
  const [orders, setOrders] = useState<POSOrder[]>(() => {
    const seed = ensureSeedOrdersAndReturns();
    return seed.orders;
  });
  const [returnsList, setReturnsList] = useState<ReturnRecordItem[]>(() => {
    const seed = ensureSeedOrdersAndReturns();
    return seed.returns;
  });

  // Sales Widget Filters & Table Modal
  const [salesPeriodFilter, setSalesPeriodFilter] = useState<SalesPeriodFilter>('month');
  const [salesChannelFilter, setSalesChannelFilter] = useState<'all' | 'physical' | 'online'>('all');
  const [isSalesTableModalOpen, setIsSalesTableModalOpen] = useState(false);
  const [salesTableModalTab, setSalesTableModalTab] = useState<'all' | 'closed' | 'credit' | 'refunds'>('all');
  const [salesTableSearchQuery, setSalesTableSearchQuery] = useState('');

  // Cashflow Widget Filters
  const [cashflowPeriodFilter, setCashflowPeriodFilter] = useState<SalesPeriodFilter>('month');
  const [cashflowAccountFilter, setCashflowAccountFilter] = useState<'all' | 'petty' | 'bank' | 'momo'>('all');

  // Stock Widget Filters
  const [stockSeverityFilter, setStockSeverityFilter] = useState<'all' | 'zero' | 'critical' | 'threshold'>('all');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('all');

  // Attendance Widget Filters
  const [attendancePeriodFilter, setAttendancePeriodFilter] = useState<'today' | 'week' | 'month' | 'term'>('month');
  const [attendanceCohortFilter, setAttendanceCohortFilter] = useState<string>('all');

  // Student & Staff Hub Filters
  const [studentCohortFilter, setStudentCohortFilter] = useState<string>('all');
  const [studentFeeFilter, setStudentFeeFilter] = useState<'all' | 'outstanding' | 'cleared'>('all');
  const [studentExpFilter, setStudentExpFilter] = useState<'all' | 'with_exp' | 'no_exp'>('all');

  const [staffEmpTypeFilter, setStaffEmpTypeFilter] = useState<string>('all');
  const [staffMaritalFilter, setStaffMaritalFilter] = useState<'all' | 'married' | 'single'>('all');
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('all');

  // CRM Widget Filters
  const [crmStageFilter, setCrmStageFilter] = useState<string>('all');
  const [crmValueFilter, setCrmValueFilter] = useState<'all' | 'high' | 'standard'>('all');

  // Tasks Widget Filters
  const [tasksStatusFilter, setTasksStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [tasksPriorityFilter, setTasksPriorityFilter] = useState<'all' | 'high' | 'normal'>('all');
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(() => dataStore.getTasks());

  // Audit Widget Filters
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [auditTimeFilter, setAuditTimeFilter] = useState<'all' | 'today' | 'week'>('all');

  // Quick Actions Filter
  const [quickActionCategory, setQuickActionCategory] = useState<'all' | 'sales' | 'hr' | 'finance'>('all');

  // Hospitality & Grants Filters
  const [hospitalityStatusFilter, setHospitalityStatusFilter] = useState<'all' | 'occupied' | 'vacant' | 'maintenance'>('all');
  const [grantStatusFilter, setGrantStatusFilter] = useState<'all' | 'active' | 'disbursed'>('all');

  // Modals for Registration & Editing
  const [isRegisterStudentOpen, setIsRegisterStudentOpen] = useState(false);
  const [isRegisterStaffOpen, setIsRegisterStaffOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRegistrationRecord | null>(null);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);

  // Student Form State
  const [studentForm, setStudentForm] = useState({
    name: '',
    dateOfBirth: '2004-01-01',
    phoneNumber: '+233 ',
    location: '',
    educationalBackground: ['shs'] as Array<'primary' | 'jhs' | 'shs' | 'degree' | 'postgraduate' | 'masters' | 'no_education'>,
    previousSewingExperience: false,
    sewingExperienceDetails: '',
    hasKids: false,
    contactPersonName: '',
    contactPersonRelation: 'Parent / Guardian',
    contactPersonPhone: '+233 ',
    idType: 'national_id' as 'national_id' | 'voters_id' | 'nhia_id' | 'drivers_license',
    idNumber: '',
    idPhotoUrl: '',
    programName: 'Vocational Sewing & Fashion Tech',
    cohort: 'Cohort 2026-B',
    maintenanceFeeTotal: 3000
  });

  // Staff Form State
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    role: 'receptionist' as any,
    department: 'Hospitality Front Desk',
    jobTitle: 'Front Desk Officer',
    baseSalary: 3500,
    workDaysPerMonth: 22,
    workHoursPerDay: 8,
    dateOfBirth: '1999-01-01',
    phoneNumber: '+233 ',
    location: '',
    educationalBackground: ['shs'] as string[],
    previousSewingExperience: false,
    sewingExperienceDetails: '',
    hasKids: false,
    isMarried: false,
    maritalStatus: 'single' as 'married' | 'single',
    emergencyContactName: '',
    emergencyContactRelation: 'Spouse',
    emergencyContactPhone: '+233 ',
    contactPersonName: '',
    contactPersonRelation: 'Spouse',
    contactPersonPhone: '+233 ',
    idType: 'national_id' as any,
    idNumber: '',
    employmentType: 'full_time' as 'full_time' | 'part_time' | 'probation' | 'other',
    employmentTypeOtherDetails: '',
    probationDurationMonths: 3 as 3 | 6
  });

  useEffect(() => {
    const handleRatesUpdate = () => {
      setRates(currencyStore.getRates());
    };
    const handleStudentsUpdate = () => {
      setStudentsList(StudentStaffStore.getStudents());
    };
    const handleStaffUpdate = () => {
      setStaffList(StudentStaffStore.getStaffList());
    };

    window.addEventListener('tumi_currency_rates_updated', handleRatesUpdate);
    window.addEventListener('tumi_students_updated', handleStudentsUpdate);
    window.addEventListener('tumi_staff_updated', handleStaffUpdate);

    return () => {
      window.removeEventListener('tumi_currency_rates_updated', handleRatesUpdate);
      window.removeEventListener('tumi_students_updated', handleStudentsUpdate);
      window.removeEventListener('tumi_staff_updated', handleStaffUpdate);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('erp_desktop_widgets', JSON.stringify(selectedWidgets));
  }, [selectedWidgets]);

  useEffect(() => {
    setRecentOrders(dataStore.getOrders().slice(0, 3));
    
    const allProducts = dataStore.getProducts();
    const inventory = dataStore.getInventory();
    const lowStock = allProducts.map(p => {
      const invItem = inventory.find(i => i.productId === p.id || i.sku === p.sku);
      const stockLevel = invItem ? invItem.stockLevel : 10;
      const safetyThreshold = invItem ? invItem.ai_reorder_point : 5;
      return {
        ...p,
        quantity: stockLevel,
        safetyThreshold: safetyThreshold
      };
    }).filter(p => p.quantity <= p.safetyThreshold).slice(0, 3);
    
    setLowStockProducts(lowStock);
    setAuditLogs(dataStore.getAuditTrail().slice(0, 4));
  }, [isDesktopCreated]);

  const handleToggleWidget = (widgetId: string) => {
    if (selectedWidgets.includes(widgetId)) {
      setSelectedWidgets(selectedWidgets.filter(w => w !== widgetId));
    } else {
      setSelectedWidgets([...selectedWidgets, widgetId]);
    }
  };

  const handleInitializeDesktop = () => {
    setIsDesktopCreated(true);
    localStorage.setItem('erp_is_desktop_created', 'true');
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'UPDATE',
      'Desktop Workspace',
      'Configured and initialized "My Home" customized operational dashboard.'
    );
  };

  const handleResetDesktop = () => {
    if (window.confirm("Are you sure you want to reset your customized workspace? This will return you to the desktop creation screen.")) {
      setIsDesktopCreated(false);
      localStorage.setItem('erp_is_desktop_created', 'false');
    }
  };

  // Student Registration Handler
  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name.trim()) return;

    const trenchTarget = Math.round(studentForm.maintenanceFeeTotal / 3);
    StudentStaffStore.addStudent({
      name: studentForm.name,
      dateOfBirth: studentForm.dateOfBirth,
      phoneNumber: studentForm.phoneNumber,
      location: studentForm.location,
      educationalBackground: studentForm.educationalBackground,
      previousSewingExperience: studentForm.previousSewingExperience,
      sewingExperienceDetails: studentForm.sewingExperienceDetails,
      hasKids: studentForm.hasKids,
      contactPersonName: studentForm.contactPersonName,
      contactPersonRelation: studentForm.contactPersonRelation,
      contactPersonPhone: studentForm.contactPersonPhone,
      idType: studentForm.idType,
      idNumber: studentForm.idNumber || `GH-${Date.now().toString().slice(-6)}`,
      idPhotoUrl: studentForm.idPhotoUrl,
      enrollmentDate: new Date().toISOString().slice(0, 10),
      programName: studentForm.programName,
      cohort: studentForm.cohort,
      status: 'active',
      maintenanceFeeTotal: studentForm.maintenanceFeeTotal,
      trenches: {
        trench1: {
          trenchNumber: 1,
          monthsRange: 'Months 1 - 6 (Foundations)',
          targetAmount: trenchTarget,
          paidAmount: 0,
          dueDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          status: 'partially_paid',
          payments: []
        },
        trench2: {
          trenchNumber: 2,
          monthsRange: 'Months 7 - 12 (Advanced)',
          targetAmount: trenchTarget,
          paidAmount: 0,
          dueDate: new Date(Date.now() + 360 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          status: 'partially_paid',
          payments: []
        },
        trench3: {
          trenchNumber: 3,
          monthsRange: 'Months 13 - 18 (Practicum)',
          targetAmount: trenchTarget,
          paidAmount: 0,
          dueDate: new Date(Date.now() + 540 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          status: 'partially_paid',
          payments: []
        }
      }
    });

    setIsRegisterStudentOpen(false);
  };

  // Student Edit Submit Handler
  const handleUpdateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    StudentStaffStore.updateStudent(editingStudent.id, editingStudent);
    setEditingStudent(null);
  };

  // Staff Registration Handler
  const handleRegisterStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name.trim()) return;

    StudentStaffStore.addStaff({
      name: staffForm.name,
      email: staffForm.email || `${staffForm.name.toLowerCase().replace(/\s+/g, '.')}@tumihostel.org`,
      role: staffForm.role,
      department: staffForm.department,
      jobTitle: staffForm.jobTitle,
      baseSalary: staffForm.baseSalary,
      workDaysPerMonth: staffForm.workDaysPerMonth,
      workHoursPerDay: staffForm.workHoursPerDay,
      dateOfBirth: staffForm.dateOfBirth,
      phoneNumber: staffForm.phoneNumber,
      location: staffForm.location,
      educationalBackground: staffForm.educationalBackground,
      previousSewingExperience: staffForm.previousSewingExperience,
      sewingExperienceDetails: staffForm.sewingExperienceDetails,
      hasKids: staffForm.hasKids,
      isMarried: staffForm.isMarried,
      maritalStatus: staffForm.isMarried ? 'married' : 'single',
      emergencyContactName: staffForm.emergencyContactName || staffForm.contactPersonName,
      emergencyContactRelation: staffForm.emergencyContactRelation || staffForm.contactPersonRelation,
      emergencyContactPhone: staffForm.emergencyContactPhone || staffForm.contactPersonPhone,
      contactPersonName: staffForm.emergencyContactName || staffForm.contactPersonName,
      contactPersonRelation: staffForm.emergencyContactRelation || staffForm.contactPersonRelation,
      contactPersonPhone: staffForm.emergencyContactPhone || staffForm.contactPersonPhone,
      idType: staffForm.idType,
      idNumber: staffForm.idNumber || `GHA-${Date.now().toString().slice(-8)}`,
      employmentType: staffForm.employmentType,
      employmentTypeOtherDetails: staffForm.employmentType === 'other' ? staffForm.employmentTypeOtherDetails : undefined,
      probationDurationMonths: staffForm.employmentType === 'probation' ? staffForm.probationDurationMonths : undefined
    });

    setIsRegisterStaffOpen(false);
  };

  // Staff Edit Submit Handler
  const handleUpdateStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const updatedStaff = {
      ...editingStaff,
      isMarried: editingStaff.isMarried ?? (editingStaff.maritalStatus === 'married'),
      maritalStatus: (editingStaff.isMarried ?? (editingStaff.maritalStatus === 'married')) ? 'married' : 'single',
      emergencyContactName: editingStaff.emergencyContactName || editingStaff.contactPersonName,
      emergencyContactRelation: editingStaff.emergencyContactRelation || editingStaff.contactPersonRelation,
      emergencyContactPhone: editingStaff.emergencyContactPhone || editingStaff.contactPersonPhone,
      contactPersonName: editingStaff.emergencyContactName || editingStaff.contactPersonName,
      contactPersonRelation: editingStaff.emergencyContactRelation || editingStaff.contactPersonRelation,
      contactPersonPhone: editingStaff.emergencyContactPhone || editingStaff.contactPersonPhone
    };

    StudentStaffStore.updateStaff(editingStaff.uid, updatedStaff);
    setEditingStaff(null);
  };

  // Helper stats & Memoized calculations
  const totalPOSSales = dataStore.getOrders().reduce((sum, o) => sum + o.totalAmount, 0);
  const activeDealsCount = dataStore.getOpportunities().filter(o => o.kanban_stage !== 'Closed').length;

  // --- SALES KPI COMPUTATIONS (Sales minus Refunds, Closed vs Credit) ---
  const salesKpi = useMemo(() => {
    return computeSalesKpiForPeriod(orders, returnsList, salesPeriodFilter, salesChannelFilter);
  }, [orders, returnsList, salesPeriodFilter, salesChannelFilter]);

  // --- SALES TABLE MODAL FILTERED ROWS ---
  const filteredSalesTableRows = useMemo(() => {
    const q = salesTableSearchQuery.toLowerCase().trim();
    if (salesTableModalTab === 'refunds') {
      return salesKpi.periodReturns.filter(r => {
        if (!q) return true;
        return (
          r.id.toLowerCase().includes(q) ||
          r.orderId.toLowerCase().includes(q) ||
          (r.customerName && r.customerName.toLowerCase().includes(q)) ||
          r.reason.toLowerCase().includes(q) ||
          r.refundMethod.toLowerCase().includes(q)
        );
      });
    }

    let sourceOrders = salesKpi.periodOrders;
    if (salesTableModalTab === 'closed') {
      sourceOrders = salesKpi.closedOrders;
    } else if (salesTableModalTab === 'credit') {
      sourceOrders = salesKpi.creditOrders;
    }

    return sourceOrders.filter(o => {
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.includes(q)) ||
        (o.paymentMethod && o.paymentMethod.toLowerCase().includes(q)) ||
        o.cashierName.toLowerCase().includes(q) ||
        o.items.some(i => i.name.toLowerCase().includes(q))
      );
    });
  }, [salesKpi, salesTableModalTab, salesTableSearchQuery]);

  const handleExportSalesTableCsv = () => {
    const rows = filteredSalesTableRows;
    if (rows.length === 0) return;
    
    let csv = '';
    if (salesTableModalTab === 'refunds') {
      csv = 'Return ID,Order Ref,Date,Customer,Reason,Method,Refund Amount ($)\n';
      (rows as ReturnRecordItem[]).forEach(r => {
        csv += `"${r.id}","${r.orderId}","${new Date(r.returnedAt).toLocaleString()}","${r.customerName || 'N/A'}","${r.reason}","${r.refundMethod}","${r.totalRefundAmount.toFixed(2)}"\n`;
      });
    } else {
      csv = 'Order ID,Date,Customer,Payment Method,Classification,Cashier,Total ($)\n';
      (rows as POSOrder[]).forEach(o => {
        const isCred = isCreditOrder(o);
        csv += `"${o.id}","${new Date(o.createdAt).toLocaleString()}","${o.customerName || 'Guest'}","${o.paymentMethod || 'Cash'}","${isCred ? 'Credit Outstanding' : 'Closed Sale'}","${o.cashierName}","${o.totalAmount.toFixed(2)}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tumi_sales_${salesPeriodFilter}_${salesTableModalTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSettleCreditOrder = (orderId: string) => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          paymentMethod: 'cash',
          billedToAccount: false,
          notes: (o as any).notes ? `${(o as any).notes} [Settled via Cash]` : 'Settled via Cash'
        };
      }
      return o;
    });
    setOrders(updated);
    try {
      localStorage.setItem('erp_sandbox_orders', JSON.stringify(updated));
    } catch (e) {}
  };

  // --- CASHFLOW KPI COMPUTATIONS ---
  const cashflowKpi = useMemo(() => {
    const periodOrders = orders.filter(o => isDateInPeriod(o.createdAt, cashflowPeriodFilter));
    const periodReturns = returnsList.filter(r => isDateInPeriod(r.returnedAt, cashflowPeriodFilter));

    let inflows = 0;
    let drawerCashIn = 0;
    let bankIn = 0;
    let momoIn = 0;

    periodOrders.forEach(o => {
      if (!isCreditOrder(o)) {
        inflows += o.totalAmount;
        const pm = (o.paymentMethod || '').toLowerCase();
        if (pm === 'cash') drawerCashIn += o.totalAmount;
        else if (pm === 'card' || o.cashierId === 'woocommerce_bot') bankIn += o.totalAmount;
        else if (pm.includes('momo') || pm.includes('mobile')) momoIn += o.totalAmount;
        else drawerCashIn += o.totalAmount;
      }
    });

    const periodStudentInflow = cashflowPeriodFilter === 'day' ? 150 : cashflowPeriodFilter === 'week' ? 650 : cashflowPeriodFilter === 'month' ? 2400 : 7200;
    inflows += periodStudentInflow;
    bankIn += periodStudentInflow;

    let outflows = periodReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0);
    const periodPettyExpense = cashflowPeriodFilter === 'day' ? 85 : cashflowPeriodFilter === 'week' ? 380 : cashflowPeriodFilter === 'month' ? 1450 : 4200;
    outflows += periodPettyExpense;

    let targetInflow = inflows;
    let targetOutflow = outflows;
    if (cashflowAccountFilter === 'petty') {
      targetInflow = drawerCashIn;
      targetOutflow = periodPettyExpense;
    } else if (cashflowAccountFilter === 'bank') {
      targetInflow = bankIn;
      targetOutflow = Number((outflows * 0.6).toFixed(2));
    } else if (cashflowAccountFilter === 'momo') {
      targetInflow = momoIn;
      targetOutflow = Number((outflows * 0.3).toFixed(2));
    }

    const netFlow = Number((targetInflow - targetOutflow).toFixed(2));
    const drawerBalance = Number((2850.00 + (drawerCashIn * 0.4) - (periodPettyExpense * 0.3)).toFixed(2));

    return {
      inflows: Number(targetInflow.toFixed(2)),
      outflows: Number(targetOutflow.toFixed(2)),
      netFlow,
      drawerBalance: Math.max(1250, drawerBalance)
    };
  }, [orders, returnsList, cashflowPeriodFilter, cashflowAccountFilter]);

  // --- ATTENDANCE KPI COMPUTATIONS ---
  const attendanceKpi = useMemo(() => {
    let rate = 91.4;
    let onTime = 88.2;
    let excused = 6.8;

    if (attendancePeriodFilter === 'today') {
      rate = 94.2;
      onTime = 91.0;
      excused = 4.2;
    } else if (attendancePeriodFilter === 'week') {
      rate = 92.5;
      onTime = 89.1;
      excused = 5.4;
    } else if (attendancePeriodFilter === 'month') {
      rate = 90.8;
      onTime = 87.0;
      excused = 7.1;
    }

    if (attendanceCohortFilter === 'Cohort 2026-A') {
      rate += 1.8;
      onTime += 2.0;
    } else if (attendanceCohortFilter === 'Cohort 2026-B') {
      rate -= 1.2;
      onTime -= 1.5;
    }

    return {
      rate: Number(Math.min(99.9, Math.max(70, rate)).toFixed(1)),
      onTime: Number(Math.min(99.9, Math.max(65, onTime)).toFixed(1)),
      excused: Number(excused.toFixed(1)),
      isCompliant: rate >= 80.0
    };
  }, [attendancePeriodFilter, attendanceCohortFilter]);

  // --- STOCK FILTERING ---
  const filteredLowStock = useMemo(() => {
    let list = lowStockProducts;
    if (stockSeverityFilter === 'zero') {
      list = list.filter(p => p.quantity === 0);
    } else if (stockSeverityFilter === 'critical') {
      list = list.filter(p => p.quantity <= 5);
    } else if (stockSeverityFilter === 'threshold') {
      list = list.filter(p => p.quantity <= p.safetyThreshold);
    }

    if (stockCategoryFilter !== 'all') {
      list = list.filter(p => (p.category || '').toLowerCase().includes(stockCategoryFilter.toLowerCase()));
    }
    return list;
  }, [lowStockProducts, stockSeverityFilter, stockCategoryFilter]);

  // --- STUDENTS FILTERING ---
  const filteredStudents = useMemo(() => {
    return studentsList.filter(s => {
      const q = dbSearchQuery.toLowerCase();
      const matchesSearch = 
        !q ||
        s.name.toLowerCase().includes(q) || 
        s.phoneNumber.includes(q) || 
        s.location.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (studentCohortFilter !== 'all' && s.cohort !== studentCohortFilter) return false;
      if (studentFeeFilter === 'outstanding' && s.totalOutstanding === 0) return false;
      if (studentFeeFilter === 'cleared' && s.totalOutstanding > 0) return false;
      if (studentExpFilter === 'with_exp' && !s.previousSewingExperience) return false;
      if (studentExpFilter === 'no_exp' && s.previousSewingExperience) return false;

      return true;
    });
  }, [studentsList, dbSearchQuery, studentCohortFilter, studentFeeFilter, studentExpFilter]);

  // --- STAFF FILTERING ---
  const filteredStaff = useMemo(() => {
    return staffList.filter(st => {
      const q = dbSearchQuery.toLowerCase();
      const matchesSearch = 
        !q ||
        st.name.toLowerCase().includes(q) || 
        st.phoneNumber?.includes(q) ||
        st.department?.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (staffEmpTypeFilter !== 'all') {
        const empType = st.employmentType || 'full_time';
        if (staffEmpTypeFilter === 'full_time' && empType !== 'full_time' && empType !== 'fulltime') return false;
        if (staffEmpTypeFilter === 'part_time' && empType !== 'part_time') return false;
        if (staffEmpTypeFilter === 'probation' && empType !== 'probation' && st.employmentStatus !== 'probation') return false;
        if (staffEmpTypeFilter === 'other' && empType !== 'other') return false;
      }

      if (staffMaritalFilter !== 'all') {
        const isMarried = st.isMarried || st.maritalStatus === 'married';
        if (staffMaritalFilter === 'married' && !isMarried) return false;
        if (staffMaritalFilter === 'single' && isMarried) return false;
      }

      if (staffRoleFilter !== 'all') {
        if (st.role !== staffRoleFilter && !st.department?.toLowerCase().includes(staffRoleFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [staffList, dbSearchQuery, staffEmpTypeFilter, staffMaritalFilter, staffRoleFilter]);

  // --- CRM OPPORTUNITIES FILTERING ---
  const filteredDeals = useMemo(() => {
    let deals = dataStore.getOpportunities();
    if (crmStageFilter !== 'all') {
      deals = deals.filter(d => d.kanban_stage === crmStageFilter);
    }
    if (crmValueFilter === 'high') {
      deals = deals.filter(d => d.value >= 1000);
    } else if (crmValueFilter === 'standard') {
      deals = deals.filter(d => d.value < 1000);
    }
    return deals;
  }, [crmStageFilter, crmValueFilter]);

  // --- TASKS FILTERING ---
  const filteredTasks = useMemo(() => {
    let tasks = localTasks;
    if (tasksStatusFilter === 'pending') {
      tasks = tasks.filter(t => t.status !== 'Completed');
    } else if (tasksStatusFilter === 'completed') {
      tasks = tasks.filter(t => t.status === 'Completed');
    }
    if (tasksPriorityFilter === 'high') {
      tasks = tasks.filter(t => t.priority === 'Urgent' || t.priority === 'High');
    } else if (tasksPriorityFilter === 'normal') {
      tasks = tasks.filter(t => t.priority === 'Medium' || t.priority === 'Low');
    }
    return tasks;
  }, [localTasks, tasksStatusFilter, tasksPriorityFilter]);

  // --- AUDIT TRAIL FILTERING ---
  const filteredAuditLogs = useMemo(() => {
    let logs = auditLogs;
    if (auditActionFilter !== 'all') {
      logs = logs.filter(l => l.action === auditActionFilter);
    }
    if (auditTimeFilter === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      logs = logs.filter(l => (l.timestamp || '').slice(0, 10) === today);
    } else if (auditTimeFilter === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      logs = logs.filter(l => new Date(l.timestamp) >= weekAgo);
    }
    return logs;
  }, [auditLogs, auditActionFilter, auditTimeFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. SETUP WIZARD / DRAFT SCREEN (IF NOT CREATED) */}
      {!isDesktopCreated ? (
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-8 text-white text-center space-y-3 relative">
            <div className="absolute right-4 top-4">
              <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
            </div>
            <span className="bg-indigo-800/80 border border-indigo-700 text-indigo-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block">
              Workspace Initialization
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Setup "My Home" Desktop</h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto">
              Unlock a personalized operational desktop environment. Handpick widgets and live metric feeds to monitor physical storefronts, classrooms, and financial ledgers at a glance.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-3">
              <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">
                Select Widgets to Pins on Desktop:
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {ALL_AVAILABLE_WIDGETS.map(widget => {
                  const IconComp = widget.icon;
                  const isChecked = selectedWidgets.includes(widget.id);
                  return (
                    <button
                      key={widget.id}
                      type="button"
                      onClick={() => handleToggleWidget(widget.id)}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        isChecked
                          ? 'bg-indigo-50/60 border-indigo-300 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="mt-0.5 accent-indigo-600 shrink-0 cursor-pointer"
                      />
                      <div>
                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                          <IconComp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{widget.name}</span>
                        </p>
                        <p className="text-slate-500 text-[11px] mt-0.5 leading-normal">{widget.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedWidgets.length} widgets selected for custom dashboard layout
              </span>
              <button
                type="button"
                onClick={handleInitializeDesktop}
                disabled={selectedWidgets.length === 0}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/15 disabled:opacity-50"
              >
                ✨ Assemble & Launch My Home
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 2. DYNAMIC WORKSPACE OPERATING SCREEN */
        <div className="space-y-6">
          
          {/* Welcoming Top banner with operational header and controls */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-1.5 relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 text-[10px] font-mono font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                <Home className="w-3 h-3 text-amber-400" />
                Active operational home
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Welcome home, {activeUser.name}!
              </h1>
              <p className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {currentTime} • Logged in as: <span className="text-indigo-300 font-bold">{activeUser.role.toUpperCase()}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 relative z-10">
              <button
                onClick={() => setIsRegisterStudentOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Student</span>
              </button>
              <button
                onClick={() => setIsRegisterStaffOpen(true)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Staff</span>
              </button>
              <button
                onClick={() => setShowConfigPanel(!showConfigPanel)}
                className="p-2.5 bg-slate-950 hover:bg-slate-900 text-indigo-300 hover:text-indigo-200 rounded-xl border border-indigo-900/50 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="Toggle Workspace Widgets and adjustments"
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>Customize Desktop</span>
              </button>
            </div>
          </div>

          {/* Quick Config Slide-out Widget selection panel */}
          {showConfigPanel && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 animate-fade-in text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Settings className="w-4 h-4 text-slate-500" /> Widget Control Room
                </span>
                <button onClick={() => setShowConfigPanel(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {ALL_AVAILABLE_WIDGETS.map(widget => {
                  const isSelected = selectedWidgets.includes(widget.id);
                  const IconComp = widget.icon;
                  return (
                    <button
                      key={widget.id}
                      type="button"
                      onClick={() => handleToggleWidget(widget.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-all text-[11px] flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                      <span>{widget.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-2 border-t text-[10px] text-slate-400">
                <span>Configure widgets on desktop layout dynamically.</span>
                <button
                  onClick={handleResetDesktop}
                  className="text-rose-600 hover:text-rose-700 font-bold uppercase tracking-wider"
                >
                  ⚠ Reset Desktop
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Grid Layout containing Selected Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

            {/* UNIFIED STUDENT & STAFF MASTER DATABASE WIDGET (12 Columns Full Width) */}
            {selectedWidgets.includes('student_staff_mgmt') && (
              <div className="lg:col-span-12 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-indigo-600" />
                      <span>Student & Staff Master Database Hub</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Register, search, view, edit and delete trainees and employees across both Dashboard and Onboarding modules.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border text-xs font-bold">
                      <button
                        onClick={() => setDbTab('students')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          dbTab === 'students' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Students ({studentsList.length})
                      </button>
                      <button
                        onClick={() => setDbTab('staff')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          dbTab === 'staff' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Staff Directory ({staffList.length})
                      </button>
                    </div>

                    {dbTab === 'students' ? (
                      <button
                        onClick={() => setIsRegisterStudentOpen(true)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Register Student
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsRegisterStaffOpen(true)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Register Staff
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Controls Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                  <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={dbSearchQuery}
                      onChange={e => setDbSearchQuery(e.target.value)}
                      placeholder={`Search ${dbTab === 'students' ? 'students, phone, location...' : 'staff name, role, phone...'}`}
                      className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 rounded-xl text-xs focus:bg-white focus:outline-indigo-500"
                    />
                  </div>

                  {dbTab === 'students' ? (
                    <>
                      {/* Cohort filter */}
                      <select
                        value={studentCohortFilter}
                        onChange={e => setStudentCohortFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
                      >
                        <option value="all">All Cohorts</option>
                        <option value="Cohort 2026-A">Cohort 2026-A</option>
                        <option value="Cohort 2026-B">Cohort 2026-B</option>
                      </select>

                      {/* Fee status filter */}
                      <select
                        value={studentFeeFilter}
                        onChange={e => setStudentFeeFilter(e.target.value as any)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
                      >
                        <option value="all">All Fee Statuses</option>
                        <option value="outstanding">⚠️ Outstanding Due</option>
                        <option value="cleared">✓ Fully Cleared</option>
                      </select>

                      {/* Sewing experience filter */}
                      <select
                        value={studentExpFilter}
                        onChange={e => setStudentExpFilter(e.target.value as any)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
                      >
                        <option value="all">All Trainees</option>
                        <option value="with_exp">✓ Prior Sewing Exp</option>
                        <option value="no_exp">No Prior Experience</option>
                      </select>
                    </>
                  ) : (
                    <>
                      {/* Employment Type filter */}
                      <select
                        value={staffEmpTypeFilter}
                        onChange={e => setStaffEmpTypeFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
                      >
                        <option value="all">All Employment Types</option>
                        <option value="full_time">Full Time</option>
                        <option value="part_time">Part Time</option>
                        <option value="probation">Probation</option>
                        <option value="other">Other Terms</option>
                      </select>

                      {/* Marital Status filter */}
                      <select
                        value={staffMaritalFilter}
                        onChange={e => setStaffMaritalFilter(e.target.value as any)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
                      >
                        <option value="all">All Marital Statuses</option>
                        <option value="married">💍 Married</option>
                        <option value="single">Single / Unmarried</option>
                      </select>

                      {/* Role filter */}
                      <select
                        value={staffRoleFilter}
                        onChange={e => setStaffRoleFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
                      >
                        <option value="all">All System Roles</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="sales">Sales</option>
                        <option value="cashier">Cashier</option>
                        <option value="manager">Manager</option>
                        <option value="ceo">CEO</option>
                      </select>
                    </>
                  )}

                  <span className="text-[11px] text-slate-400 ml-auto font-medium">
                    Showing {dbTab === 'students' ? filteredStudents.length : filteredStaff.length} of {dbTab === 'students' ? studentsList.length : staffList.length} records
                  </span>
                </div>

                {/* DB TABLE: STUDENTS */}
                {dbTab === 'students' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Contact & Location</th>
                          <th className="py-2.5 px-3">Program & Cohort</th>
                          <th className="py-2.5 px-3">Educational Background</th>
                          <th className="py-2.5 px-3">ID Verification</th>
                          <th className="py-2.5 px-3">Maintenance Fee</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900 block">{s.name}</span>
                              <span className="text-[10px] text-slate-400">DOB: {s.dateOfBirth}</span>
                            </td>
                            <td className="py-3 px-3 space-y-0.5">
                              <span className="text-slate-800 block">{s.phoneNumber}</span>
                              <span className="text-[10px] text-slate-400 block">{s.location}</span>
                              <span className="text-[10px] text-indigo-700 block">Contact: {s.contactPersonName} ({s.contactPersonRelation}) - {s.contactPersonPhone}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-slate-800 block">{s.programName}</span>
                              <span className="text-[10px] text-slate-400 block">{s.cohort}</span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1">
                                {s.educationalBackground?.map(edu => (
                                  <span key={edu} className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[9px] rounded font-bold uppercase">
                                    {edu}
                                  </span>
                                ))}
                              </div>
                              {s.previousSewingExperience && (
                                <span className="text-[9.5px] text-emerald-700 font-bold block mt-1">✓ Sewing Exp</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 block w-fit">
                                {s.idNumber}
                              </span>
                              <span className="text-[9px] text-slate-400 uppercase mt-0.5 block">{s.idType?.replace('_', ' ')}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-800 block">GHS {s.totalPaid} / {s.maintenanceFeeTotal}</span>
                              <span className={`text-[10px] font-bold ${s.totalOutstanding === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {s.totalOutstanding === 0 ? 'Cleared' : `Due GHS ${s.totalOutstanding}`}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setEditingStudent(s)}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold"
                                  title="Edit Student"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete student "${s.name}"?`)) {
                                      StudentStaffStore.deleteStudent(s.id);
                                    }
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold"
                                  title="Delete Student"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* DB TABLE: STAFF DIRECTORY */}
                {dbTab === 'staff' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Employee Name</th>
                          <th className="py-2.5 px-3">Role & Dept</th>
                          <th className="py-2.5 px-3">Base Salary & Calculated Rates</th>
                          <th className="py-2.5 px-3">Contact & Location</th>
                          <th className="py-2.5 px-3">Identification</th>
                          <th className="py-2.5 px-3">Employment Type</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStaff.map(st => {
                          const base = st.baseSalary || 3500;
                          const daily = st.dailyRate || Number((base / 22).toFixed(2));
                          const hourly = st.hourlyRate || Number((daily / 8).toFixed(2));

                          return (
                            <tr key={st.uid} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3">
                                <span className="font-bold text-slate-900 block">{st.name}</span>
                                <span className="text-[10px] text-slate-400">{st.email}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-bold text-indigo-900 block">{st.jobTitle || st.role?.toUpperCase()}</span>
                                <span className="text-[10px] text-slate-500 block">{st.department}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-extrabold text-slate-900 block">GHS {base.toLocaleString()} / mo</span>
                                <span className="text-[9.5px] text-emerald-700 font-bold block">
                                  Daily: GHS {daily} • Hourly: GHS {hourly}
                                </span>
                              </td>
                              <td className="py-3 px-3 space-y-0.5">
                                <span className="text-slate-800 block">{st.phoneNumber}</span>
                                <span className="text-[10px] text-slate-400 block">{st.location}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 block w-fit">
                                  {st.idNumber || 'GHA-VERIFIED'}
                                </span>
                                <span className="text-[9px] text-slate-400 uppercase mt-0.5 block">{st.idType?.replace('_', ' ')}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-800">
                                  {st.employmentType || 'fulltime'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setEditingStaff(st)}
                                    className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold"
                                    title="Edit Staff"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Are you sure you want to delete staff "${st.name}"?`)) {
                                        StudentStaffStore.deleteStaff(st.uid);
                                      }
                                    }}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold"
                                    title="Delete Staff"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* QUICK ACTIONS CENTER (12 columns or 6 columns) */}
            {selectedWidgets.includes('quick_actions') && (
              <div className="lg:col-span-12 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-amber-700">
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-400" /> One-Click Operational Action Center
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Fast-track high frequency administrative operations across departments</p>
                  </div>

                  {/* Filter by Category */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                    {[
                      { id: 'all', label: 'All Operations' },
                      { id: 'sales', label: 'Sales & POS' },
                      { id: 'hr', label: 'Students & HR' },
                      { id: 'finance', label: 'Finance' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setQuickActionCategory(tab.id as any)}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          quickActionCategory === tab.id
                            ? 'bg-white text-amber-800 shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(quickActionCategory === 'all' || quickActionCategory === 'sales') && (
                    <button
                      onClick={() => onNavigateToTab('sales')}
                      className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all group cursor-pointer"
                    >
                      <Store className="w-4 h-4 text-indigo-600 mb-1.5 group-hover:scale-110 transition-transform" />
                      <p className="font-bold text-slate-800 text-xs">New Checkout</p>
                      <p className="text-[9.5px] text-slate-400">Launch POS</p>
                    </button>
                  )}

                  {(quickActionCategory === 'all' || quickActionCategory === 'hr') && (
                    <button
                      onClick={() => setIsRegisterStudentOpen(true)}
                      className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all group cursor-pointer"
                    >
                      <GraduationCap className="w-4 h-4 text-indigo-600 mb-1.5 group-hover:scale-110 transition-transform" />
                      <p className="font-bold text-slate-800 text-xs">Register Student</p>
                      <p className="text-[9.5px] text-slate-400">Trainee Form</p>
                    </button>
                  )}

                  {(quickActionCategory === 'all' || quickActionCategory === 'hr') && (
                    <button
                      onClick={() => setIsRegisterStaffOpen(true)}
                      className="p-3 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl text-left transition-all group cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-purple-600 mb-1.5 group-hover:scale-110 transition-transform" />
                      <p className="font-bold text-slate-800 text-xs">Register Staff</p>
                      <p className="text-[9.5px] text-slate-400">HR Employee</p>
                    </button>
                  )}

                  {(quickActionCategory === 'all' || quickActionCategory === 'finance') && (
                    <button
                      onClick={() => onNavigateToTab('petty_cash')}
                      className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all group cursor-pointer"
                    >
                      <Coins className="w-4 h-4 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                      <p className="font-bold text-slate-800 text-xs">Issue Cash</p>
                      <p className="text-[9.5px] text-slate-400">Petty Voucher</p>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* --- SALES CHANNEL WIDGET (12 Columns Full Width) --- */}
            {selectedWidgets.includes('sales') && (
              <div className="lg:col-span-12 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                {/* Header & Main Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span>Sales Channel KPI Matrix</span>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            {PERIOD_DEFINITIONS[salesPeriodFilter].sublabel}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Period gross sales minus refunds, with verified breakdown of closed sales vs. credit receivables.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Channel filter */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
                      <button
                        onClick={() => setSalesChannelFilter('all')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${salesChannelFilter === 'all' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        All Channels
                      </button>
                      <button
                        onClick={() => setSalesChannelFilter('physical')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${salesChannelFilter === 'physical' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Physical POS
                      </button>
                      <button
                        onClick={() => setSalesChannelFilter('online')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${salesChannelFilter === 'online' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Online Store
                      </button>
                    </div>

                    {/* Direct Navigation Links */}
                    <button
                      onClick={() => {
                        setSalesTableModalTab('all');
                        setIsSalesTableModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="View Period Transaction Ledger Table"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                      <span>View Table</span>
                    </button>

                    <button
                      onClick={() => onNavigateToTab('sales')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      title="Go to Sales Dashboard Page"
                    >
                      <span>Sales Hub</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Period Filter Tabs (day, week, month, quater, year, year till date) */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="hidden sm:inline">Reporting Period:</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'day', label: 'Day', sub: 'Today' },
                      { id: 'week', label: 'Week', sub: '7 Days' },
                      { id: 'month', label: 'Month', sub: 'This Month' },
                      { id: 'quater', label: 'Quarter', sub: 'This Quarter' },
                      { id: 'year', label: 'Year', sub: '12 Months' },
                      { id: 'year_till_date', label: 'Year till Date', sub: 'YTD' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSalesPeriodFilter(p.id as SalesPeriodFilter)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          salesPeriodFilter === p.id
                            ? 'bg-indigo-600 text-white shadow-xs font-extrabold ring-1 ring-indigo-700'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                        }`}
                      >
                        <span>{p.label}</span>
                        <span className={`text-[10px] font-normal ${salesPeriodFilter === p.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                          ({p.sub})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4 Clickable KPI Cards: Net Sales, Closed Sales, Credit Sales Outstanding, Refunds */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* CARD 1: NET SALES (SALES MINUS REFUNDS) */}
                  <div
                    onClick={() => {
                      setSalesTableModalTab('all');
                      setIsSalesTableModalOpen(true);
                    }}
                    className="p-4 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl border border-indigo-800 shadow-xs cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all relative overflow-hidden group"
                  >
                    <div className="absolute right-3 top-3 opacity-20 group-hover:opacity-40 transition-opacity">
                      <TrendingUp className="w-10 h-10 text-indigo-300" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-indigo-200 font-extrabold uppercase tracking-wider">
                        Net Sales ({PERIOD_DEFINITIONS[salesPeriodFilter].sublabel})
                      </span>
                      <span className="text-[10px] bg-indigo-800/80 text-indigo-200 px-1.5 py-0.5 rounded font-mono font-bold">
                        Click for Table ↗
                      </span>
                    </div>
                    <p className="text-2xl font-black font-mono tracking-tight mt-1.5">
                      ${salesKpi.netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="mt-2 pt-2 border-t border-indigo-800/80 text-[10px] text-indigo-200 flex items-center justify-between">
                      <span>Gross: ${salesKpi.grossSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <span className="text-rose-300 font-bold">− Refund: ${salesKpi.refundsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* CARD 2: CLOSED SALES (SETTLED) */}
                  <div
                    onClick={() => {
                      setSalesTableModalTab('closed');
                      setIsSalesTableModalOpen(true);
                    }}
                    className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl shadow-2xs cursor-pointer hover:border-emerald-400 hover:shadow-xs hover:scale-[1.01] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Closed Sales (Settled)
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                        {salesKpi.closedPct}% share
                      </span>
                    </div>
                    <p className="text-2xl font-black font-mono text-emerald-950 mt-1.5">
                      ${salesKpi.closedSalesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="mt-2 pt-2 border-t border-emerald-100 text-[10px] text-emerald-700 flex items-center justify-between">
                      <span>{salesKpi.closedCount} settled orders</span>
                      <span className="font-bold underline group-hover:text-emerald-900">View Closed Table →</span>
                    </div>
                  </div>

                  {/* CARD 3: CREDIT SALES OUTSTANDING (RECEIVABLES) */}
                  <div
                    onClick={() => {
                      setSalesTableModalTab('credit');
                      setIsSalesTableModalOpen(true);
                    }}
                    className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl shadow-2xs cursor-pointer hover:border-amber-400 hover:shadow-xs hover:scale-[1.01] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Credit Sales Outstanding
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                        {salesKpi.creditPct}% share
                      </span>
                    </div>
                    <p className="text-2xl font-black font-mono text-amber-950 mt-1.5">
                      ${salesKpi.creditSalesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="mt-2 pt-2 border-t border-amber-100 text-[10px] text-amber-700 flex items-center justify-between">
                      <span>{salesKpi.creditCount} billed receivables</span>
                      <span className="font-bold underline group-hover:text-amber-900">View Debtors Table →</span>
                    </div>
                  </div>

                  {/* CARD 4: REFUNDS & RETURNS DEDUCTED */}
                  <div
                    onClick={() => {
                      setSalesTableModalTab('refunds');
                      setIsSalesTableModalOpen(true);
                    }}
                    className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl shadow-2xs cursor-pointer hover:border-rose-400 hover:shadow-xs hover:scale-[1.01] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-rose-800 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" /> Refunds Deducted
                      </span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                        {salesKpi.refundsCount} returns
                      </span>
                    </div>
                    <p className="text-2xl font-black font-mono text-rose-950 mt-1.5">
                      -${salesKpi.refundsTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="mt-2 pt-2 border-t border-rose-100 text-[10px] text-rose-700 flex items-center justify-between">
                      <span>Deducted from period gross</span>
                      <span className="font-bold underline group-hover:text-rose-900">View Returns Table →</span>
                    </div>
                  </div>
                </div>

                {/* Ratio Bar & Formula Explainer */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span>Closed Sales: <strong>${salesKpi.closedSalesTotal.toFixed(2)}</strong> ({salesKpi.closedPct}%)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      <span>Credit Outstanding: <strong>${salesKpi.creditSalesTotal.toFixed(2)}</strong> ({salesKpi.creditPct}%)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                      <span>Refunds: <strong>-${salesKpi.refundsTotal.toFixed(2)}</strong></span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2.5 flex overflow-hidden">
                    <div
                      style={{ width: `${salesKpi.closedPct}%` }}
                      className="bg-emerald-500 h-full transition-all duration-500"
                      title={`Closed Sales: ${salesKpi.closedPct}%`}
                    ></div>
                    <div
                      style={{ width: `${salesKpi.creditPct}%` }}
                      className="bg-amber-400 h-full transition-all duration-500"
                      title={`Credit Sales: ${salesKpi.creditPct}%`}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* --- CASH FLOW & PETTY CASH WIDGET (6 Columns) --- */}
            {selectedWidgets.includes('cashflow') && (
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-emerald-800">
                      <DollarSign className="w-4 h-4 text-emerald-600" /> Cash Flow & Operating Treasury
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Real-time revenue inflows, disbursements & petty cash ledger</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onNavigateToTab('financials')} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer">
                      Ledger <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Filters for Cash Flow */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                  {/* Period filter */}
                  <select
                    value={cashflowPeriodFilter}
                    onChange={e => setCashflowPeriodFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="day">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quater">This Quarter</option>
                    <option value="year">Past 12 Months</option>
                    <option value="year_till_date">Year-to-Date (YTD)</option>
                  </select>

                  {/* Account scope filter */}
                  <select
                    value={cashflowAccountFilter}
                    onChange={e => setCashflowAccountFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="all">All Cash Channels</option>
                    <option value="petty">Petty Cash Drawer</option>
                    <option value="bank">Bank Accounts</option>
                    <option value="momo">Mobile Money Vault</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-0.5">
                    <span className="text-[9px] text-emerald-800 font-extrabold uppercase">Operating Inflows</span>
                    <p className="text-base font-black text-emerald-950 font-mono">+${cashflowKpi.inflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <span className="text-[8px] text-emerald-600 block">Sales + Collections</span>
                  </div>
                  <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl space-y-0.5">
                    <span className="text-[9px] text-rose-800 font-extrabold uppercase">Disbursements</span>
                    <p className="text-base font-black text-rose-950 font-mono">-${cashflowKpi.outflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <span className="text-[8px] text-rose-600 block">Refunds + Expenses</span>
                  </div>
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-0.5">
                    <span className="text-[9px] text-indigo-800 font-extrabold uppercase">Net Cash Flow</span>
                    <p className={`text-base font-black font-mono ${cashflowKpi.netFlow >= 0 ? 'text-indigo-950' : 'text-rose-700'}`}>
                      ${cashflowKpi.netFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[8px] text-indigo-600 block">Period Surplus</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Drawer Reconciled Balance</span>
                    <span className="text-lg font-black text-slate-900 font-mono">${cashflowKpi.drawerBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <button
                    onClick={() => onNavigateToTab('petty_cash')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Petty Cash →
                  </button>
                </div>
              </div>
            )}

            {/* --- ATTENDANCE & CLASS TRACKER WIDGET (6 Columns) --- */}
            {selectedWidgets.includes('attendance') && (
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" /> Student Attendance Summary
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Operational standing across active training cohorts</p>
                  </div>
                  <button onClick={() => onNavigateToTab('programs')} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer">
                    Open Students <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Filters for Attendance */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                  <select
                    value={attendancePeriodFilter}
                    onChange={e => setAttendancePeriodFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="today">Today's Roll Call</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="term">Full Term Average</option>
                  </select>

                  <select
                    value={attendanceCohortFilter}
                    onChange={e => setAttendanceCohortFilter(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="all">All Cohorts</option>
                    <option value="Cohort 2026-A">Cohort 2026-A</option>
                    <option value="Cohort 2026-B">Cohort 2026-B</option>
                  </select>
                </div>

                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-center space-y-1">
                  <span className="text-[10px] text-indigo-700 uppercase font-black">Cohort Average Attendance rate</span>
                  <p className="text-3xl font-black text-indigo-900 font-mono mt-1">{attendanceKpi.rate}%</p>
                  <div className="flex items-center justify-center gap-3 text-[10px] pt-1">
                    <span className="text-emerald-700 font-bold">✓ On-Time: {attendanceKpi.onTime}%</span>
                    <span className="text-slate-500 font-medium">• Excused: {attendanceKpi.excused}%</span>
                  </div>
                  <p className="text-[9px] text-indigo-600 font-semibold pt-1">
                    {attendanceKpi.isCompliant ? '✓ Compliant with Donor threshold (≥ 80.0%) for stipends' : '⚠️ Below donor target'}
                  </p>
                </div>
              </div>
            )}

            {/* --- URGENT STOCK WARNINGS WIDGET (6 Columns) --- */}
            {selectedWidgets.includes('stock') && (
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-rose-700">
                      <AlertTriangle className="w-4 h-4 animate-bounce" /> Urgent Stock Warnings
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Warehouse safety thresholds violated</p>
                  </div>
                  <button onClick={() => onNavigateToTab('inventory')} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer">
                    Order Stock <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Filters for Stock */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                  <select
                    value={stockSeverityFilter}
                    onChange={e => setStockSeverityFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="all">All Warnings</option>
                    <option value="zero">Out of Stock (0 units)</option>
                    <option value="critical">Critical (≤ 5 units)</option>
                    <option value="threshold">Below Safety Threshold</option>
                  </select>

                  <select
                    value={stockCategoryFilter}
                    onChange={e => setStockCategoryFilter(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="all">All Categories</option>
                    <option value="bag">Bags & Accessories</option>
                    <option value="fabric">Fabrics & Textiles</option>
                    <option value="cushion">Home Decor</option>
                  </select>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {filteredLowStock.length === 0 ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-xs text-emerald-800">
                      ✓ Complete safety compliance: all stocks are above security thresholds.
                    </div>
                  ) : (
                    filteredLowStock.map(p => (
                      <div key={p.id} className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-rose-950">{p.name}</p>
                          <p className="text-[10px] text-rose-700 font-medium">SKU: {p.sku?.toUpperCase()} • Threshold: {p.safetyThreshold} units</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-extrabold text-rose-700 block bg-rose-100/80 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                            {p.quantity} left
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* --- CRM SALES DEALS PIPELINE WIDGET (6 Columns) --- */}
            {selectedWidgets.includes('crm') && (
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-indigo-700">
                      <Briefcase className="w-4 h-4 text-indigo-600" /> CRM Sales Deals Pipeline
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Corporate leads, contract negotiations & opportunity values</p>
                  </div>
                  <button onClick={() => onNavigateToTab('crm')} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer">
                    Deals Kanban <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Filters for CRM */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                  <select
                    value={crmStageFilter}
                    onChange={e => setCrmStageFilter(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="all">All Deal Stages</option>
                    <option value="New">New Lead</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Closed">Closed Won</option>
                  </select>

                  <select
                    value={crmValueFilter}
                    onChange={e => setCrmValueFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="all">All Values</option>
                    <option value="high">High Value ($1,000+)</option>
                    <option value="standard">Standard (&lt; $1,000)</option>
                  </select>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {filteredDeals.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                      No matching deals in this stage.
                    </div>
                  ) : (
                    filteredDeals.slice(0, 4).map(d => (
                      <div key={d.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{d.title}</p>
                          <p className="text-[10px] text-slate-500">{d.customerName} • Stage: <span className="font-bold text-indigo-700">{d.kanban_stage}</span></p>
                        </div>
                        <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-xs">
                          ${d.value.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* --- TASKS & ACTION ITEMS WIDGET (6 Columns) --- */}
            {selectedWidgets.includes('tasks') && (
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-slate-800">
                      <ListTodo className="w-4 h-4 text-indigo-600" /> Tasks & Action Items
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Staff action items, pending duties & priorities</p>
                  </div>
                  <button onClick={() => onNavigateToTab('tasks')} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer">
                    All Tasks <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Filters for Tasks */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                  <select
                    value={tasksStatusFilter}
                    onChange={e => setTasksStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="all">All Tasks</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>

                  <select
                    value={tasksPriorityFilter}
                    onChange={e => setTasksPriorityFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High / Urgent</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {filteredTasks.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                      No tasks found matching these filters.
                    </div>
                  ) : (
                    filteredTasks.slice(0, 4).map(t => {
                      const isCompleted = t.status === 'Completed';
                      return (
                        <div key={t.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => {
                                const nextStatus = (isCompleted ? 'To Do' : 'Completed') as TaskStatus;
                                const updated = localTasks.map(item => item.id === t.id ? { ...item, status: nextStatus } : item);
                                setLocalTasks(updated);
                                try {
                                  dataStore.updateTaskStatus(t.id, nextStatus);
                                } catch (e) {}
                              }}
                              className="rounded accent-indigo-600 cursor-pointer"
                            />
                            <span className={`font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {t.title}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.priority === 'Urgent' || t.priority === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* --- CURRENCY CONVERSION MATRIX WIDGET (6 Columns) --- */}
            {selectedWidgets.includes('currency') && (
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-slate-800">
                      <Coins className="w-4 h-4 text-indigo-600" /> Currency Conversion Matrix
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Live buying & selling rates for USD, GBP, and EUR to GHS</p>
                  </div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                    Base: GHS
                  </span>
                </div>

                {/* Filters / Calculator for Currency */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
                    <span className="text-[11px] font-bold text-slate-500">Amount:</span>
                    <input
                      type="number"
                      value={calcAmount}
                      onChange={e => setCalcAmount(e.target.value)}
                      className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>

                  <select
                    value={calcCurrency}
                    onChange={e => setCalcCurrency(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    {rates.map(r => (
                      <option key={r.currency} value={r.currency}>{r.currency} ({r.name})</option>
                    ))}
                  </select>

                  <select
                    value={calcDirection}
                    onChange={e => setCalcDirection(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value="buy">Bank Buy Rate</option>
                    <option value="sell">Bank Sell Rate</option>
                  </select>
                </div>

                {/* Conversion Result */}
                {(() => {
                  const targetRate = rates.find(r => r.currency === calcCurrency);
                  const rateVal = targetRate ? (calcDirection === 'buy' ? targetRate.buyingRate : targetRate.sellingRate) : 15.0;
                  const amt = parseFloat(calcAmount) || 0;
                  const converted = Number((amt * rateVal).toFixed(2));
                  return (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-indigo-600 font-bold uppercase block">
                          {calcAmount} {calcCurrency} @ {rateVal} GHS
                        </span>
                        <span className="text-xl font-black text-indigo-950 font-mono">
                          GH₵ {converted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <span className="text-[10px] bg-white border border-indigo-200 text-indigo-700 font-bold px-2 py-1 rounded-lg">
                        {calcDirection.toUpperCase()} RATE
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* --- SECURITY & AUDIT TRAIL WIDGET (6 Columns) --- */}
            {selectedWidgets.includes('audit') && (
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-slate-800">
                      <Activity className="w-4 h-4 text-indigo-600" /> Security & Audit Trail
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Immutable system audit logs and critical changes</p>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                    LIVE FEED
                  </span>
                </div>

                {/* Filters for Audit */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                  <select
                    value={auditActionFilter}
                    onChange={e => setAuditActionFilter(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="all">All Actions</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="LOGIN">LOGIN</option>
                  </select>

                  <select
                    value={auditTimeFilter}
                    onChange={e => setAuditTimeFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today's Logs</option>
                    <option value="week">Past 7 Days</option>
                  </select>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {filteredAuditLogs.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                      No logs found matching filter criteria.
                    </div>
                  ) : (
                    filteredAuditLogs.slice(0, 4).map(l => (
                      <div key={l.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between text-xs">
                        <div className="pr-2">
                          <p className="font-bold text-slate-800">{l.userName || l.userEmail || 'System'}</p>
                          <p className="text-[10px] text-slate-500">{l.details}</p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200 text-slate-700 font-mono shrink-0">
                          {l.action}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* --- HOSPITALITY OCCUPANCY WIDGET (6 Columns) --- */}
            {selectedWidgets.includes('hospitality') && (
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-indigo-700">
                      <Building2 className="w-4 h-4 text-indigo-600" /> Hospitality Occupancy & Front Desk
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Hotel room status, guest folios & room occupancy</p>
                  </div>
                  <button onClick={() => onNavigateToTab('hospitality')} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer">
                    Front Desk <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                  <select
                    value={hospitalityStatusFilter}
                    onChange={e => setHospitalityStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="all">All Rooms</option>
                    <option value="occupied">Occupied</option>
                    <option value="vacant">Vacant Clean</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  <span className="text-[11px] text-slate-500 font-bold">Occupancy Rate: 78.5%</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <span className="text-[10px] text-indigo-700 uppercase font-black">Room #101 (Executive)</span>
                    <p className="font-bold text-slate-800 mt-0.5">Guest: David Copperfield</p>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold uppercase inline-block mt-1">Occupied</span>
                  </div>
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <span className="text-[10px] text-indigo-700 uppercase font-black">Room #102 (Standard)</span>
                    <p className="font-bold text-slate-800 mt-0.5">Housekeeping Ready</p>
                    <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold uppercase inline-block mt-1">Available</span>
                  </div>
                </div>
              </div>
            )}

            {/* --- DONOR GRANTS FUNDING WIDGET (6 Columns) --- */}
            {selectedWidgets.includes('grants') && (
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-purple-700">
                      <Landmark className="w-4 h-4 text-purple-600" /> Donor Grant Funding
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Active grant balances, disbursements & milestone compliance</p>
                  </div>
                  <button onClick={() => onNavigateToTab('grants')} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer">
                    Grants Hub <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                  <select
                    value={grantStatusFilter}
                    onChange={e => setGrantStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    <option value="all">All Grants</option>
                    <option value="active">Active Funding</option>
                    <option value="disbursed">Disbursed Phase</option>
                  </select>
                  <span className="text-[11px] text-purple-700 font-bold">Total Funding: $145,000</span>
                </div>

                <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-1 text-xs">
                  <span className="text-[10px] text-purple-700 uppercase font-black">USAID Vocational Tech Initiative</span>
                  <p className="text-lg font-black text-purple-950 font-mono">$48,200.00 Remaining</p>
                  <span className="text-[9px] text-purple-600 font-semibold block">Milestone 3 report due in 18 days</span>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* --- REGISTER STUDENT MODAL --- */}
      {isRegisterStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-indigo-900 text-white p-5 border-b border-indigo-800 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-300" />
                  <span>Register Trainee / Student</span>
                </h3>
                <p className="text-indigo-200 text-xs mt-0.5">Enter comprehensive onboarding student profile & 3-trench fee terms.</p>
              </div>
              <button onClick={() => setIsRegisterStudentOpen(false)} className="text-indigo-200 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterStudent} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abena Serwaa"
                    value={studentForm.name}
                    onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Date of Birth (Calendar) *</label>
                  <input
                    type="date"
                    required
                    value={studentForm.dateOfBirth}
                    onChange={e => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+233 "
                    value={studentForm.phoneNumber}
                    onChange={e => setStudentForm({ ...studentForm, phoneNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Residential Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adum, Kumasi"
                    value={studentForm.location}
                    onChange={e => setStudentForm({ ...studentForm, location: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Educational Background Multi-Checkbox */}
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1.5">Educational Background (Multi-Check)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {EDUCATION_OPTIONS.map(edu => {
                    const checked = studentForm.educationalBackground.includes(edu.id as any);
                    return (
                      <label key={edu.id} className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            if (e.target.checked) {
                              setStudentForm({ ...studentForm, educationalBackground: [...studentForm.educationalBackground, edu.id as any] });
                            } else {
                              setStudentForm({ ...studentForm, educationalBackground: studentForm.educationalBackground.filter(x => x !== edu.id) });
                            }
                          }}
                          className="accent-indigo-600 rounded"
                        />
                        <span>{edu.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={studentForm.previousSewingExperience}
                      onChange={e => setStudentForm({ ...studentForm, previousSewingExperience: e.target.checked })}
                      className="accent-indigo-600 rounded"
                    />
                    <span className="font-bold text-slate-800">Previous Sewing Experience?</span>
                  </label>
                  {studentForm.previousSewingExperience && (
                    <input
                      type="text"
                      placeholder="Describe experience..."
                      value={studentForm.sewingExperienceDetails}
                      onChange={e => setStudentForm({ ...studentForm, sewingExperienceDetails: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={studentForm.hasKids}
                      onChange={e => setStudentForm({ ...studentForm, hasKids: e.target.checked })}
                      className="accent-indigo-600 rounded"
                    />
                    <span className="font-bold text-slate-800">Has Children / Dependents?</span>
                  </label>
                </div>
              </div>

              {/* Contact Person Details */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wider">Emergency Contact Person</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Contact Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Name"
                      value={studentForm.contactPersonName}
                      onChange={e => setStudentForm({ ...studentForm, contactPersonName: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Relationship</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Parent"
                      value={studentForm.contactPersonRelation}
                      onChange={e => setStudentForm({ ...studentForm, contactPersonRelation: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Contact Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="+233 "
                      value={studentForm.contactPersonPhone}
                      onChange={e => setStudentForm({ ...studentForm, contactPersonPhone: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Identification Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">ID Type Checkbox / Select</label>
                  <select
                    value={studentForm.idType}
                    onChange={e => setStudentForm({ ...studentForm, idType: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="national_id">Ghana Card (National ID)</option>
                    <option value="voters_id">Voter's ID Card</option>
                    <option value="nhia_id">NHIA Health Card</option>
                    <option value="drivers_license">Driver's License</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">ID Card Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GHA-789012345-1"
                    value={studentForm.idNumber}
                    onChange={e => setStudentForm({ ...studentForm, idNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsRegisterStudentOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Register Trainee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- REGISTER STAFF MODAL --- */}
      {isRegisterStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-purple-900 text-white p-5 border-b border-purple-800 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-300" />
                  <span>Register Staff / Employee</span>
                </h3>
                <p className="text-purple-200 text-xs mt-0.5">Configure employee salary rates, probation terms & contact records.</p>
              </div>
              <button onClick={() => setIsRegisterStaffOpen(false)} className="text-purple-200 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterStaff} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Employee Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kwesi Mensah"
                    value={staffForm.name}
                    onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="kwesi@tumihostel.org"
                    value={staffForm.email}
                    onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Role *</label>
                  <select
                    value={staffForm.role}
                    onChange={e => setStaffForm({ ...staffForm, role: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="housekeeping">Housekeeping</option>
                    <option value="manager">Manager</option>
                    <option value="accountant">Accountant</option>
                    <option value="cashier">Cashier</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="trainer">Vocational Trainer</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={staffForm.department}
                    onChange={e => setStaffForm({ ...staffForm, department: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    value={staffForm.jobTitle}
                    onChange={e => setStaffForm({ ...staffForm, jobTitle: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Monthly Salary & Automatic Daily / Hourly Calculation */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">Salary & Daily / Hourly Pay Calculation</h4>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Auto-Calculated</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">Monthly Base Salary (GHS)</label>
                    <input
                      type="number"
                      required
                      step="50"
                      value={staffForm.baseSalary}
                      onChange={e => setStaffForm({ ...staffForm, baseSalary: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">Calculated Daily Rate</label>
                    <div className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-emerald-800">
                      GHS {(staffForm.baseSalary / 22).toFixed(2)} / day
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">Calculated Hourly Rate</label>
                    <div className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-emerald-800">
                      GHS {((staffForm.baseSalary / 22) / 8).toFixed(2)} / hr
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={staffForm.phoneNumber}
                    onChange={e => setStaffForm({ ...staffForm, phoneNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Residential Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="Location"
                    value={staffForm.location}
                    onChange={e => setStaffForm({ ...staffForm, location: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* ID and Contact Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">ID Type</label>
                  <select
                    value={staffForm.idType}
                    onChange={e => setStaffForm({ ...staffForm, idType: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="national_id">Ghana Card (National ID)</option>
                    <option value="voters_id">Voter's ID Card</option>
                    <option value="nhia_id">NHIA Health Card</option>
                    <option value="drivers_license">Driver's License</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">ID Card Number</label>
                  <input
                    type="text"
                    required
                    placeholder="GHA-00000000"
                    value={staffForm.idNumber}
                    onChange={e => setStaffForm({ ...staffForm, idNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Employment Type */}
              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-2">
                <label className="font-bold text-indigo-950 uppercase block text-[11px]">Employment Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'full_time', label: 'Full Time' },
                    { id: 'part_time', label: 'Part Time' },
                    { id: 'probation', label: 'Probation' },
                    { id: 'other', label: 'Other' }
                  ].map(item => (
                    <label 
                      key={item.id}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer text-xs font-bold transition-all ${
                        staffForm.employmentType === item.id 
                          ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs ring-1 ring-indigo-500' 
                          : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="homeDashEmpType"
                        value={item.id}
                        checked={staffForm.employmentType === item.id}
                        onChange={() => setStaffForm({ ...staffForm, employmentType: item.id as any })}
                        className="text-indigo-600"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
                {staffForm.employmentType === 'other' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="Specify other terms (e.g. Contract, Consultant)"
                      value={staffForm.employmentTypeOtherDetails}
                      onChange={e => setStaffForm({ ...staffForm, employmentTypeOtherDetails: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Marital Status Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="dashStaffMaritalStatus"
                    checked={staffForm.isMarried}
                    onChange={e => {
                      const checked = e.target.checked;
                      setStaffForm({
                        ...staffForm,
                        isMarried: checked,
                        maritalStatus: checked ? 'married' : 'single'
                      });
                    }}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="dashStaffMaritalStatus" className="flex flex-col cursor-pointer select-none">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <span>Marital Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        staffForm.isMarried ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {staffForm.isMarried ? 'Married' : 'Single / Unmarried'}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {staffForm.isMarried ? 'Staff is registered as married.' : 'Check this box if the staff member is married.'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-100 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                  <Phone className="w-3.5 h-3.5 text-rose-600" />
                  <span>Emergency Contact Person *</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Contact Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sister Mercy"
                      value={staffForm.emergencyContactName}
                      onChange={e => setStaffForm({ ...staffForm, emergencyContactName: e.target.value, contactPersonName: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Relationship *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Spouse, Sibling"
                      value={staffForm.emergencyContactRelation}
                      onChange={e => setStaffForm({ ...staffForm, emergencyContactRelation: e.target.value, contactPersonRelation: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Emergency Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+233 24 000 0000"
                      value={staffForm.emergencyContactPhone}
                      onChange={e => setStaffForm({ ...staffForm, emergencyContactPhone: e.target.value, contactPersonPhone: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsRegisterStaffOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md"
                >
                  Register Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT STUDENT MODAL --- */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-slate-800 uppercase flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-amber-600" /> Edit Student Record: {editingStudent.name}
              </h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudentSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-0.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-0.5">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.phoneNumber}
                    onChange={e => setEditingStudent({ ...editingStudent, phoneNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-0.5">Location</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.location}
                    onChange={e => setEditingStudent({ ...editingStudent, location: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-0.5">Program Name</label>
                <input
                  type="text"
                  required
                  value={editingStudent.programName}
                  onChange={e => setEditingStudent({ ...editingStudent, programName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setEditingStudent(null)} className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-amber-600 text-white font-bold rounded-lg shadow-xs">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT STAFF MODAL --- */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-slate-800 uppercase flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-amber-600" /> Edit Employee Record: {editingStaff.name}
              </h3>
              <button onClick={() => setEditingStaff(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaffSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-0.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStaff.name}
                  onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-0.5">Job Title</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.jobTitle || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, jobTitle: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-0.5">Monthly Base Salary (GHS)</label>
                  <input
                    type="number"
                    required
                    value={editingStaff.baseSalary || 3500}
                    onChange={e => setEditingStaff({ ...editingStaff, baseSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              {/* Employment Type */}
              <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100 space-y-1.5">
                <label className="font-bold text-indigo-950 uppercase block text-[10px]">Employment Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'full_time', label: 'Full Time' },
                    { id: 'part_time', label: 'Part Time' },
                    { id: 'probation', label: 'Probation' },
                    { id: 'other', label: 'Other' }
                  ].map(item => (
                    <label 
                      key={item.id}
                      className={`flex items-center gap-1 p-1.5 rounded-lg border cursor-pointer text-xs font-bold ${
                        (editingStaff.employmentType === item.id || (item.id === 'full_time' && (editingStaff.employmentType === 'fulltime' || !editingStaff.employmentType)))
                          ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs' 
                          : 'bg-white/80 border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="editHomeEmpType"
                        value={item.id}
                        checked={editingStaff.employmentType === item.id || (item.id === 'full_time' && (editingStaff.employmentType === 'fulltime' || !editingStaff.employmentType))}
                        onChange={() => setEditingStaff({ ...editingStaff, employmentType: item.id as any })}
                        className="text-indigo-600"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Marital Status Checkbox */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="editDashMaritalStatus"
                    checked={editingStaff.isMarried ?? (editingStaff.maritalStatus === 'married')}
                    onChange={e => {
                      const checked = e.target.checked;
                      setEditingStaff({
                        ...editingStaff,
                        isMarried: checked,
                        maritalStatus: checked ? 'married' : 'single'
                      });
                    }}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="editDashMaritalStatus" className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="font-bold text-xs text-slate-800">Marital Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      (editingStaff.isMarried ?? (editingStaff.maritalStatus === 'married'))
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {(editingStaff.isMarried ?? (editingStaff.maritalStatus === 'married')) ? 'Married' : 'Single / Unmarried'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-rose-50/40 p-2.5 rounded-xl border border-rose-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                  <Phone className="w-3.5 h-3.5 text-rose-600" />
                  <span>Emergency Contact Person</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">Contact Name</label>
                    <input
                      type="text"
                      placeholder="Name"
                      value={editingStaff.emergencyContactName || editingStaff.contactPersonName || ''}
                      onChange={e => setEditingStaff({
                        ...editingStaff,
                        emergencyContactName: e.target.value,
                        contactPersonName: e.target.value
                      })}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">Relationship</label>
                    <input
                      type="text"
                      placeholder="Relation"
                      value={editingStaff.emergencyContactRelation || editingStaff.contactPersonRelation || ''}
                      onChange={e => setEditingStaff({
                        ...editingStaff,
                        emergencyContactRelation: e.target.value,
                        contactPersonRelation: e.target.value
                      })}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">Phone</label>
                    <input
                      type="tel"
                      placeholder="+233..."
                      value={editingStaff.emergencyContactPhone || editingStaff.contactPersonPhone || ''}
                      onChange={e => setEditingStaff({
                        ...editingStaff,
                        emergencyContactPhone: e.target.value,
                        contactPersonPhone: e.target.value
                      })}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setEditingStaff(null)} className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-amber-600 text-white font-bold rounded-lg shadow-xs">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SALES & REFUNDS TRANSACTION TABLE MODAL --- */}
      {isSalesTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/30 rounded-xl text-indigo-400 border border-indigo-500/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-white uppercase tracking-wider">
                      Period Sales & Transaction Ledger Table
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {PERIOD_DEFINITIONS[salesPeriodFilter].label} ({PERIOD_DEFINITIONS[salesPeriodFilter].sublabel})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Detailed breakdown of gross revenue, refunds deducted, closed settled transactions, and outstanding credit receivables.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportSalesTableCsv}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                  title="Export Current Table Rows to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSalesTableModalOpen(false);
                    onNavigateToTab(salesTableModalTab === 'refunds' ? 'returns' : 'sales');
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Jump to Full Management Tab"
                >
                  <span>{salesTableModalTab === 'refunds' ? 'Returns Hub' : 'Sales Hub'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsSalesTableModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close Table Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick KPI Ribbon inside Modal */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div 
                onClick={() => setSalesTableModalTab('all')} 
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  salesTableModalTab === 'all' 
                    ? 'bg-indigo-900 text-white border-indigo-800 shadow-xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
                  <span className={salesTableModalTab === 'all' ? 'text-indigo-200' : 'text-slate-500'}>Net Period Sales</span>
                  <span className="font-mono">{salesKpi.periodOrders.length} orders</span>
                </div>
                <p className="text-lg font-black font-mono mt-1">
                  ${salesKpi.netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`text-[9.5px] mt-0.5 ${salesTableModalTab === 'all' ? 'text-indigo-300' : 'text-slate-400'}`}>
                  Gross ${salesKpi.grossSales.toFixed(2)} − Refunds ${salesKpi.refundsTotal.toFixed(2)}
                </p>
              </div>

              <div 
                onClick={() => setSalesTableModalTab('closed')} 
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  salesTableModalTab === 'closed' 
                    ? 'bg-emerald-800 text-white border-emerald-700 shadow-xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
                  <span className={salesTableModalTab === 'closed' ? 'text-emerald-200' : 'text-emerald-700'}>Closed (Settled)</span>
                  <span className="font-mono">{salesKpi.closedCount} settled</span>
                </div>
                <p className={`text-lg font-black font-mono mt-1 ${salesTableModalTab === 'closed' ? 'text-white' : 'text-emerald-900'}`}>
                  ${salesKpi.closedSalesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`text-[9.5px] mt-0.5 ${salesTableModalTab === 'closed' ? 'text-emerald-200' : 'text-emerald-600'}`}>
                  {salesKpi.closedPct}% of gross revenue
                </p>
              </div>

              <div 
                onClick={() => setSalesTableModalTab('credit')} 
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  salesTableModalTab === 'credit' 
                    ? 'bg-amber-800 text-white border-amber-700 shadow-xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
                  <span className={salesTableModalTab === 'credit' ? 'text-amber-200' : 'text-amber-700'}>Credit Outstanding</span>
                  <span className="font-mono">{salesKpi.creditCount} debtors</span>
                </div>
                <p className={`text-lg font-black font-mono mt-1 ${salesTableModalTab === 'credit' ? 'text-white' : 'text-amber-900'}`}>
                  ${salesKpi.creditSalesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`text-[9.5px] mt-0.5 ${salesTableModalTab === 'credit' ? 'text-amber-200' : 'text-amber-600'}`}>
                  {salesKpi.creditPct}% receivables share
                </p>
              </div>

              <div 
                onClick={() => setSalesTableModalTab('refunds')} 
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  salesTableModalTab === 'refunds' 
                    ? 'bg-rose-800 text-white border-rose-700 shadow-xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
                  <span className={salesTableModalTab === 'refunds' ? 'text-rose-200' : 'text-rose-700'}>Refunds Deducted</span>
                  <span className="font-mono">{salesKpi.refundsCount} returns</span>
                </div>
                <p className={`text-lg font-black font-mono mt-1 ${salesTableModalTab === 'refunds' ? 'text-white' : 'text-rose-900'}`}>
                  -${salesKpi.refundsTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`text-[9.5px] mt-0.5 ${salesTableModalTab === 'refunds' ? 'text-rose-200' : 'text-rose-600'}`}>
                  Subtracted from gross sales
                </p>
              </div>
            </div>

            {/* Modal Controls & Filter Toolbar */}
            <div className="p-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All Transactions', count: salesKpi.periodOrders.length },
                  { id: 'closed', label: 'Closed Sales', count: salesKpi.closedOrders.length },
                  { id: 'credit', label: 'Credit Sales Outstanding', count: salesKpi.creditOrders.length },
                  { id: 'refunds', label: 'Refunds & Returns', count: salesKpi.periodReturns.length }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSalesTableModalTab(t.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      salesTableModalTab === t.id
                        ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/80 text-slate-700 font-mono">
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* In-Modal Period & Search Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <select
                    value={salesPeriodFilter}
                    onChange={e => setSalesPeriodFilter(e.target.value as SalesPeriodFilter)}
                    className="bg-transparent text-xs font-bold text-slate-700 border-none outline-none cursor-pointer"
                  >
                    <option value="day">Day (Today)</option>
                    <option value="week">Week (7 Days)</option>
                    <option value="month">Month (This Month)</option>
                    <option value="quater">Quarter (This Quarter)</option>
                    <option value="year">Year (Past 12 Months)</option>
                    <option value="year_till_date">Year till Date (YTD)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  <select
                    value={salesChannelFilter}
                    onChange={e => setSalesChannelFilter(e.target.value as any)}
                    className="bg-transparent text-xs font-bold text-slate-700 border-none outline-none cursor-pointer"
                  >
                    <option value="all">All Channels</option>
                    <option value="physical">Physical POS Register</option>
                    <option value="online">Online WooCommerce Store</option>
                  </select>
                </div>

                <div className="relative min-w-[160px] sm:min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={salesTableSearchQuery}
                    onChange={e => setSalesTableSearchQuery(e.target.value)}
                    placeholder="Search ID, customer, item..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-y-auto max-h-[50vh]">
              {salesTableModalTab === 'refunds' ? (
                // REFUNDS TABLE
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Return ID / Date</th>
                      <th className="py-2.5 px-3">Order Ref</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Refund Method</th>
                      <th className="py-2.5 px-3">Processed By</th>
                      <th className="py-2.5 px-3 text-right">Deducted Amount</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSalesTableRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                          <p className="font-bold text-slate-600">No return deductions found for this period filter.</p>
                          <p className="text-[11px] mt-0.5">Try choosing a wider period (e.g. Month or Year) or clearing the search query.</p>
                        </td>
                      </tr>
                    ) : (
                      (filteredSalesTableRows as ReturnRecordItem[]).map(r => (
                        <tr key={r.id} className="hover:bg-rose-50/40 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-slate-900 block">{r.id}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(r.returnedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-[11px] font-bold">
                              {r.orderId}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {r.customerName || 'Walk-in Guest'}
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate" title={r.reason}>
                            {r.reason}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {r.refundMethod === 'cash' ? 'Cash Handout' : 'Original Method'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {r.processedBy}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-black text-rose-700 text-sm">
                              -${r.totalRefundAmount.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setIsSalesTableModalOpen(false);
                                onNavigateToTab('returns');
                              }}
                              className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded font-bold text-[10px] transition-colors cursor-pointer"
                              title="Inspect in Returns and Refunds Module"
                            >
                              Inspect ↗
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                // ORDERS TABLE (ALL / CLOSED / CREDIT)
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Order Ref / Date</th>
                      <th className="py-2.5 px-3">Customer Info</th>
                      <th className="py-2.5 px-3">Classification</th>
                      <th className="py-2.5 px-3">Payment Method</th>
                      <th className="py-2.5 px-3">Cashier / Channel</th>
                      <th className="py-2.5 px-3">Items Summary</th>
                      <th className="py-2.5 px-3 text-right">Amount ($)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSalesTableRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <Store className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                          <p className="font-bold text-slate-600">No sales transactions match this criteria.</p>
                          <p className="text-[11px] mt-0.5">Adjust the period filter or clear the search query to view transactions.</p>
                        </td>
                      </tr>
                    ) : (
                      (filteredSalesTableRows as POSOrder[]).map(o => {
                        const isCredit = isCreditOrder(o);
                        const isOnline = o.cashierId === 'woocommerce_bot';
                        return (
                          <tr 
                            key={o.id} 
                            className={`transition-colors ${
                              isCredit ? 'bg-amber-50/30 hover:bg-amber-50/70' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-3 px-3">
                              <span className="font-mono font-bold text-slate-900 block">{o.id}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(o.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900 block">
                                {o.customerName || 'Walk-in Guest'}
                              </span>
                              {o.customerPhone && (
                                <span className="text-[10px] text-slate-400 block font-mono">{o.customerPhone}</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {isCredit ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                                  <Clock className="w-3 h-3 text-amber-600" /> Credit Outstanding
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Closed (Settled)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200/60 block w-fit">
                                {o.paymentMethod || 'Cash'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-slate-800 block">
                                {isOnline ? 'WooCommerce Online' : o.cashierName || 'Cashier Register'}
                              </span>
                              <span className="text-[9.5px] text-slate-400 block uppercase">
                                {isOnline ? 'E-Commerce' : 'Physical POS'}
                              </span>
                            </td>
                            <td className="py-3 px-3 max-w-[220px]">
                              <p className="truncate text-slate-700 text-[11px]" title={o.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}>
                                {o.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                              </p>
                              <span className="text-[9.5px] text-slate-400 block">
                                {o.items.reduce((s, i) => s + i.quantity, 0)} units total
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={`font-mono font-black text-sm ${isCredit ? 'text-amber-800' : 'text-slate-900'}`}>
                                ${o.totalAmount.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isCredit ? (
                                <button
                                  type="button"
                                  onClick={() => handleSettleCreditOrder(o.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] transition-colors cursor-pointer shadow-2xs"
                                  title="Mark Credit Sale as Settled (Paid in Cash)"
                                >
                                  Mark Settled ✓
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsSalesTableModalOpen(false);
                                    onNavigateToTab('sales');
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[10px] transition-colors cursor-pointer"
                                  title="Open in Sales Hub"
                                >
                                  Sales Hub ↗
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer Summary */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-slate-600 font-medium">
                <span>
                  Showing <strong>{filteredSalesTableRows.length}</strong> record(s) in{' '}
                  <strong className="text-slate-900 uppercase">{salesTableModalTab}</strong> table view
                </span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span>
                  Period:{' '}
                  <strong className="text-indigo-700">
                    {PERIOD_DEFINITIONS[salesPeriodFilter].label} ({PERIOD_DEFINITIONS[salesPeriodFilter].description})
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsSalesTableModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Close Table
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSalesTableModalOpen(false);
                    onNavigateToTab('sales');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Full Sales Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
