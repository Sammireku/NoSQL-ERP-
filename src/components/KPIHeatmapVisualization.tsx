import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Building2, 
  DollarSign, 
  Zap, 
  Filter, 
  RefreshCw, 
  Maximize2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Info, 
  Sparkles, 
  Download, 
  SlidersHorizontal,
  LayoutGrid,
  BarChart3,
  Flame,
  UserCheck,
  Briefcase,
  Truck,
  Landmark,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Layers,
  Clock,
  Receipt,
  FileSpreadsheet,
  Award,
  User,
  Calendar,
  Search,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { UserProfile, POSOrder, Product, Booking } from '../types/erp';
import { dataStore } from '../config/firebase';
import { StudentStaffStore } from '../utils/studentStaffStore';
import { formatPrice } from '../utils/currency';

interface KPIHeatmapProps {
  activeUser: UserProfile;
  activeCurrency?: string;
  onNavigateToTab?: (tabId: string) => void;
  timeHorizonProp?: 'today' | 'week' | 'month' | 'quarter';
  selectedDeptProp?: string;
}

export interface KPIMetricItem {
  id: string;
  deptId: 'sales' | 'hospitality' | 'inventory' | 'finance' | 'hr' | 'crm' | 'compliance';
  deptName: string;
  metricName: string;
  code: string;
  actual: number;
  target: number;
  unit: 'currency' | 'percent' | 'count' | 'days';
  weight: number; // For weighted dept scoring
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  managerInCharge: string;
  targetTab: string;
  description: string;
  recommendation: string;
}

export default function KPIHeatmapVisualization({
  activeUser,
  activeCurrency = 'GHS',
  onNavigateToTab,
  timeHorizonProp,
  selectedDeptProp
}: KPIHeatmapProps) {
  // Local or prop-controlled time horizon & department filter
  const [internalTimeHorizon, setInternalTimeHorizon] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const [internalSelectedDept, setInternalSelectedDept] = useState<string>('all');

  const timeHorizon = timeHorizonProp ?? internalTimeHorizon;
  const selectedDept = selectedDeptProp ?? internalSelectedDept;

  const [viewMode, setViewMode] = useState<'heatmap' | 'cards' | 'digest'>('heatmap');
  const [isLiveSync, setIsLiveSync] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());
  
  // Real-Time Gemini Anomaly Detection State
  const [isAnomalyDetection, setIsAnomalyDetection] = useState<boolean>(true);
  const [anomaliesList, setAnomaliesList] = useState<Array<{ code: string; severity: string; headline: string; explanation: string; recommendedAction: string }>>([]);
  const [isAnalyzingAnomalies, setIsAnalyzingAnomalies] = useState<boolean>(false);

  // Interactive Modal Cell State
  const [selectedCell, setSelectedCell] = useState<KPIMetricItem | null>(null);
  const [modalTab, setModalTab] = useState<'transactions' | 'trends' | 'staff' | 'overview'>('transactions');
  const [modalSearch, setModalSearch] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Load live ERP state
  const [orders, setOrders] = useState<POSOrder[]>(() => dataStore.getOrders());
  const [products, setProducts] = useState<Product[]>(() => dataStore.getProducts());
  const [bookings, setBookings] = useState<Booking[]>(() => dataStore.getBookings());
  const [rooms, setRooms] = useState<any[]>(() => dataStore.getRooms());
  const [students, setStudents] = useState<any[]>(() => StudentStaffStore.getStudents());
  const [staff, setStaff] = useState<any[]>(() => StudentStaffStore.getStaffList());
  const [auditLogs, setAuditLogs] = useState<any[]>(() => dataStore.getAuditTrail());

  // Function to calculate score percentage (0 - 125%)
  const calculateScore = (metric: KPIMetricItem): number => {
    if (metric.target === 0) return 100;
    
    // For metrics where LOWER is better (e.g., low stock alerts)
    if (metric.id === 'inv_low_stock') {
      if (metric.actual <= metric.target) return 100;
      const overRatio = (metric.actual - metric.target) / metric.target;
      return Math.max(10, Math.round(100 - overRatio * 50));
    }

    const ratio = (metric.actual / metric.target) * 100;
    return Math.min(125, Math.round(ratio));
  };

  // Helper for Heatmap Color Coding
  const getHeatmapColor = (score: number) => {
    if (score >= 105) {
      return {
        bg: 'bg-emerald-600 text-white border-emerald-500 shadow-sm',
        accentBg: 'bg-emerald-700',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        label: 'Exceeding Target',
        hex: '#059669'
      };
    } else if (score >= 85) {
      return {
        bg: 'bg-emerald-500 text-white border-emerald-400',
        accentBg: 'bg-emerald-600',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Optimal / On Track',
        hex: '#10b981'
      };
    } else if (score >= 70) {
      return {
        bg: 'bg-amber-400 text-slate-900 border-amber-300 font-bold',
        accentBg: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        label: 'Watchlist / Moderate',
        hex: '#f59e0b'
      };
    } else if (score >= 50) {
      return {
        bg: 'bg-orange-500 text-white border-orange-400',
        accentBg: 'bg-orange-600',
        badge: 'bg-orange-50 text-orange-800 border-orange-200',
        label: 'Below Benchmark',
        hex: '#f97316'
      };
    } else {
      return {
        bg: 'bg-rose-600 text-white border-rose-500 shadow-xs animate-pulse',
        accentBg: 'bg-rose-700',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        label: 'Critical / Action Needed',
        hex: '#e11d48'
      };
    }
  };

  // Compute live metrics dynamically from store and timeHorizon
  const kpiMetrics: KPIMetricItem[] = useMemo(() => {
    const totalSalesRev = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const multiplier = timeHorizon === 'today' ? 0.15 : timeHorizon === 'week' ? 0.45 : timeHorizon === 'quarter' ? 3.0 : 1.0;
    const posTarget = Math.round(45000 * multiplier);
    const avgBasket = orders.length > 0 ? totalSalesRev / orders.length : 0;

    const totalRooms = rooms.length || 10;
    const occupiedRooms = rooms.filter(r => r.status === 'Occupied' || r.status === 'Booked').length;
    const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);

    const lowStockCount = products.filter(p => ((p as any).stock ?? 10) <= ((p as any).minStockAlert ?? (p as any).minStock ?? 5)).length;
    const totalProducts = products.length || 20;
    const inStockRatio = Math.round(((totalProducts - lowStockCount) / totalProducts) * 100);

    return [
      // Sales & Retail POS
      {
        id: 'sales_revenue',
        deptId: 'sales',
        deptName: 'Sales & POS Retail',
        metricName: 'Gross Revenue Realization',
        code: 'SLS-01',
        actual: Math.round((totalSalesRev > 0 ? totalSalesRev : 38500) * multiplier),
        target: posTarget,
        unit: 'currency',
        weight: 1.5,
        trend: 'up',
        trendValue: '+14.2% vs prev period',
        managerInCharge: 'Chief Commercial Officer',
        targetTab: 'sales',
        description: 'Total settled sales revenue across all active POS terminals and online store orders.',
        recommendation: 'Revenue realization is strong. Ensure fast order fulfillment and maintain active cross-sell promotions.'
      },
      {
        id: 'sales_basket',
        deptId: 'sales',
        deptName: 'Sales & POS Retail',
        metricName: 'Average Basket Value',
        code: 'SLS-02',
        actual: Math.round(avgBasket) || 65,
        target: 75,
        unit: 'currency',
        weight: 1.0,
        trend: 'stable',
        trendValue: '+2.1% basket growth',
        managerInCharge: 'Retail Operations Manager',
        targetTab: 'sales',
        description: 'Average ticket size per completed checkout customer transaction.',
        recommendation: 'Train cashiers to recommend high-margin add-ons or bundled accessories during register checkout.'
      },

      // Hospitality & Lodging
      {
        id: 'hosp_occupancy',
        deptId: 'hospitality',
        deptName: 'Hospitality & Lodging',
        metricName: 'Hotel Room Occupancy Rate',
        code: 'HSP-01',
        actual: occupancyRate || 82,
        target: 85,
        unit: 'percent',
        weight: 1.4,
        trend: 'up',
        trendValue: '+8% occupancy week-over-week',
        managerInCharge: 'Front Office Manager',
        targetTab: 'hospitality',
        description: 'Percentage of available hotel rooms and beds currently checked-in or reserved.',
        recommendation: 'Occupancy is approaching capacity. Optimize dynamic pricing on OTA channels to maximize RevPAR.'
      },
      {
        id: 'hosp_adr',
        deptId: 'hospitality',
        deptName: 'Hospitality & Lodging',
        metricName: 'Average Daily Rate (ADR)',
        code: 'HSP-02',
        actual: 240,
        target: 220,
        unit: 'currency',
        weight: 1.2,
        trend: 'up',
        trendValue: '+$20 per room night',
        managerInCharge: 'Revenue Manager',
        targetTab: 'hospitality',
        description: 'Average rental revenue earned per occupied room per day.',
        recommendation: 'Outperforming benchmark target. Maintain premium amenity inclusions and guest service quality.'
      },

      // Inventory & Warehouse
      {
        id: 'inv_health',
        deptId: 'inventory',
        deptName: 'Inventory & Warehouse',
        metricName: 'Stock Safety Health Index',
        code: 'INV-01',
        actual: inStockRatio,
        target: 95,
        unit: 'percent',
        weight: 1.3,
        trend: 'down',
        trendValue: `${lowStockCount} items below safety limit`,
        managerInCharge: 'Warehouse Operations Lead',
        targetTab: 'inventory',
        description: 'Percentage of catalog products holding inventory levels comfortably above minimum reorder points.',
        recommendation: lowStockCount > 0 
          ? `Immediate attention required: ${lowStockCount} item(s) need replenishment to prevent stockouts.`
          : 'Stock levels are safe. Regularly conduct cycle counts.'
      },
      {
        id: 'inv_low_stock',
        deptId: 'inventory',
        deptName: 'Inventory & Warehouse',
        metricName: 'Critical Low-Stock SKU Count',
        code: 'INV-02',
        actual: lowStockCount,
        target: 2,
        unit: 'count',
        weight: 1.1,
        trend: lowStockCount > 2 ? 'down' : 'up',
        trendValue: `${lowStockCount} SKUs flagged`,
        managerInCharge: 'Procurement Specialist',
        targetTab: 'procurement',
        description: 'Total distinct product lines that have hit or passed urgent warehouse reorder thresholds.',
        recommendation: 'Dispatch auto-generated purchase orders directly to primary suppliers via WhatsApp/Email.'
      },

      // Finance & Cashflow
      {
        id: 'fin_margin',
        deptId: 'finance',
        deptName: 'Finance & Cashflow',
        metricName: 'Net Profit Operating Margin',
        code: 'FIN-01',
        actual: 28.5,
        target: 25.0,
        unit: 'percent',
        weight: 1.5,
        trend: 'up',
        trendValue: '+3.5% margin expansion',
        managerInCharge: 'Corporate Accountant',
        targetTab: 'accounting',
        description: 'Net operating margin percentage derived from net revenues minus operating expenses.',
        recommendation: 'Strong bottom-line efficiency. Reinvest surplus working capital into high-ROI inventory items.'
      },
      {
        id: 'fin_cash_balance',
        deptId: 'finance',
        deptName: 'Finance & Cashflow',
        metricName: 'Petty Cash Disbursal Efficiency',
        code: 'FIN-02',
        actual: 94,
        target: 90,
        unit: 'percent',
        weight: 1.0,
        trend: 'stable',
        trendValue: 'All vouchers reconciled',
        managerInCharge: 'Finance Manager',
        targetTab: 'petty_cash',
        description: 'Percentage of petty cash disbursements audited and reconciled with valid receipts.',
        recommendation: 'Audit trail compliance is intact. Maintain digital receipt attachments for auditing.'
      },

      // HR & Workforce
      {
        id: 'hr_attendance',
        deptId: 'hr',
        deptName: 'HR & Workforce',
        metricName: 'Staff On-Time Clock-In Rate',
        code: 'HR-01',
        actual: 92,
        target: 95,
        unit: 'percent',
        weight: 1.1,
        trend: 'stable',
        trendValue: '92% attendance rate',
        managerInCharge: 'HR Operations Lead',
        targetTab: 'hr',
        description: 'Punctuality and attendance adherence across rostered department shifts.',
        recommendation: 'Review shift rosters and automated SMS clock-in reminders to achieve 95%+ target.'
      },
      {
        id: 'hr_students',
        deptId: 'hr',
        deptName: 'HR & Workforce',
        metricName: 'Student Trainee Enrollment',
        code: 'HR-02',
        actual: students.length > 0 ? students.length : 18,
        target: 20,
        unit: 'count',
        weight: 1.0,
        trend: 'up',
        trendValue: '+4 newly enrolled',
        managerInCharge: 'Vocational Program Director',
        targetTab: 'student_onboarding',
        description: 'Active student trainees currently enrolled and receiving vocational training.',
        recommendation: 'Keep digital ID cards and attendance records updated for donor grant reporting.'
      },

      // CRM & Business Pipeline
      {
        id: 'crm_winrate',
        deptId: 'crm',
        deptName: 'CRM & Growth Pipeline',
        metricName: 'Corporate Lead Win Rate',
        code: 'CRM-01',
        actual: 68,
        target: 60,
        unit: 'percent',
        weight: 1.2,
        trend: 'up',
        trendValue: '+8% conversion rate',
        managerInCharge: 'Sales Lead',
        targetTab: 'crm',
        description: 'Percentage of qualified corporate leads converted into active commercial contracts.',
        recommendation: 'Conversion rates exceed targets. Focus on upselling premium corporate packages.'
      },

      // System Security & Compliance
      {
        id: 'sys_audit',
        deptId: 'compliance',
        deptName: 'System Governance & Audit',
        metricName: 'Security Audit Compliance Score',
        code: 'CMP-01',
        actual: 99.2,
        target: 98.0,
        unit: 'percent',
        weight: 1.3,
        trend: 'up',
        trendValue: 'Zero security breaches',
        managerInCharge: 'Chief Information Security Officer',
        targetTab: 'audit',
        description: 'Immutable RBAC permission adherence and logging integrity across all system users.',
        recommendation: 'System security posture is optimal. All user role updates and financial logs are recorded.'
      }
    ];
  }, [orders, products, rooms, staff, students, timeHorizon]);

  // Map of detected anomalies by metric code
  const anomalyMap = useMemo(() => {
    const map = new Map<string, { code: string; severity: string; headline: string; explanation: string; recommendedAction: string }>();
    anomaliesList.forEach(item => {
      map.set(item.code, item);
    });
    return map;
  }, [anomaliesList]);

  // Run Gemini Anomaly Detection when enabled or when metrics shift
  useEffect(() => {
    if (!isAnomalyDetection) {
      setAnomaliesList([]);
      return;
    }

    let isMounted = true;
    setIsAnalyzingAnomalies(true);

    fetch('/api/ai/detect-anomalies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics: kpiMetrics, timeHorizon })
    })
      .then(res => res.json())
      .then(data => {
        if (isMounted && data && Array.isArray(data.anomalies)) {
          setAnomaliesList(data.anomalies);
        }
      })
      .catch(err => {
        console.warn("Anomaly detection API notice:", err);
      })
      .finally(() => {
        if (isMounted) setIsAnalyzingAnomalies(false);
      });

    return () => { isMounted = false; };
  }, [isAnomalyDetection, kpiMetrics, timeHorizon]);

  // Filter metrics based on selected department
  const filteredMetrics = useMemo(() => {
    if (selectedDept === 'all') return kpiMetrics;
    return kpiMetrics.filter(m => m.deptId === selectedDept);
  }, [kpiMetrics, selectedDept]);

  // Overall Company Health Index calculation
  const overallCompanyScore = useMemo(() => {
    let totalScoreWeighted = 0;
    let totalWeight = 0;

    kpiMetrics.forEach(m => {
      const score = calculateScore(m);
      totalScoreWeighted += score * m.weight;
      totalWeight += m.weight;
    });

    return totalWeight > 0 ? Math.round(totalScoreWeighted / totalWeight) : 100;
  }, [kpiMetrics]);

  // Departmental aggregated summary
  const departmentSummaries = useMemo(() => {
    const depts = [
      { id: 'sales', name: 'Sales & POS', icon: TrendingUp },
      { id: 'hospitality', name: 'Hospitality', icon: Building2 },
      { id: 'inventory', name: 'Inventory', icon: AlertTriangle },
      { id: 'finance', name: 'Finance', icon: DollarSign },
      { id: 'hr', name: 'HR & Workforce', icon: Users },
      { id: 'crm', name: 'CRM & Pipeline', icon: Briefcase },
      { id: 'compliance', name: 'Compliance', icon: ShieldAlert },
    ];

    return depts.map(d => {
      const metrics = kpiMetrics.filter(m => m.deptId === d.id);
      const avgScore = metrics.length > 0 
        ? Math.round(metrics.reduce((acc, m) => acc + calculateScore(m), 0) / metrics.length)
        : 100;
      return {
        ...d,
        avgScore,
        metricsCount: metrics.length,
        statusInfo: getHeatmapColor(avgScore)
      };
    });
  }, [kpiMetrics]);

  // Dynamic Raw Transactions Data Getter for Selected KPI Cell
  const rawTransactionsData = useMemo(() => {
    if (!selectedCell) return [];

    let rawList: Array<{ id: string; date: string; entity: string; description: string; amountStr: string; statusStr: string }> = [];

    if (selectedCell.deptId === 'sales') {
      rawList = orders.map(o => ({
        id: o.id,
        date: new Date(o.createdAt).toLocaleString(),
        entity: o.customerName || 'Walk-in Customer',
        description: o.items ? o.items.map(i => `${i.name} (x${i.quantity})`).join(', ') : 'POS Cart Order',
        amountStr: formatPrice(o.totalAmount || 0, activeCurrency, 'USD'),
        statusStr: o.paymentMethod || 'Cash Register'
      }));
    } else if (selectedCell.deptId === 'hospitality') {
      rawList = bookings.map(b => ({
        id: b.id,
        date: `${b.checkInDate} → ${b.checkOutDate}`,
        entity: b.guestName,
        description: `Room #${b.roomNumber || '101'} • Source: ${b.sourceChannel || 'Direct'}`,
        amountStr: formatPrice(b.totalPrice || 0, activeCurrency, 'USD'),
        statusStr: `Payment: ${(b.paymentStatus || 'paid').toUpperCase()}`
      }));
    } else if (selectedCell.deptId === 'inventory') {
      rawList = products.map(p => ({
        id: p.sku || p.id,
        date: 'Live Inventory Catalog',
        entity: p.name,
        description: `Category: ${p.category}`,
        amountStr: formatPrice(p.price, activeCurrency, 'USD'),
        statusStr: `Stock: ${(p as any).stock ?? 10} units (Min: ${(p as any).minStockAlert ?? 5})`
      }));
    } else if (selectedCell.deptId === 'hr') {
      rawList = staff.map(s => ({
        id: s.uid || s.id || `staff_${Math.random()}`,
        date: 'Shift Active',
        entity: s.name,
        description: `Role: ${(s.role || 'Staff').toUpperCase()} • Dept: ${s.department || 'Operations'}`,
        amountStr: `Salary: ${formatPrice(s.baseSalary || 2500, activeCurrency, 'USD')}`,
        statusStr: 'Status: Clocked-In On Time'
      }));
    } else if (selectedCell.deptId === 'compliance') {
      rawList = auditLogs.map(a => ({
        id: a.id || `audit_${Math.random()}`,
        date: new Date(a.timestamp).toLocaleString(),
        entity: a.operatorName || 'System Admin',
        description: `[${a.actionType}] ${a.targetEntity}: ${a.details}`,
        amountStr: `Role: ${a.operatorRole}`,
        statusStr: 'Audit Immutable'
      }));
    } else {
      // General Finance & CRM fallback
      rawList = [
        { id: 'FIN-REC-901', date: new Date().toLocaleDateString(), entity: 'Ghana Revenue Authority', description: 'Monthly GRA E-VAT Filing & Tax Voucher Reconciled', amountStr: formatPrice(3850, activeCurrency, 'USD'), statusStr: 'Reconciled' },
        { id: 'FIN-REC-902', date: new Date().toLocaleDateString(), entity: 'Premier Taxi Vouchers', description: 'Petty Cash Local Travel Disbursal - Client Site Visit', amountStr: formatPrice(185, activeCurrency, 'USD'), statusStr: 'Approved' },
        { id: 'CRM-DEAL-304', date: new Date().toLocaleDateString(), entity: 'Gold Coast Logistics', description: 'Corporate Hotel & Events Retainer Contract', amountStr: formatPrice(18500, activeCurrency, 'USD'), statusStr: 'Contract Signed' },
      ];
    }

    if (!modalSearch.trim()) return rawList;
    const query = modalSearch.toLowerCase();
    return rawList.filter(item => 
      item.id.toLowerCase().includes(query) || 
      item.entity.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query) ||
      item.statusStr.toLowerCase().includes(query)
    );
  }, [selectedCell, orders, bookings, products, staff, auditLogs, activeCurrency, modalSearch]);

  // Historical Trend Logs Generator for Selected KPI Cell
  const trendLogsData = useMemo(() => {
    if (!selectedCell) return [];

    const now = new Date();
    const score = calculateScore(selectedCell);

    return [
      { timestamp: new Date(now.getTime() - 2 * 3600 * 1000).toLocaleString(), snapshotVal: `${selectedCell.actual}`, targetVal: `${selectedCell.target}`, delta: '+3.4%', status: getHeatmapColor(score).label, note: 'Real-time telemetry pulse synchronized. Performance holding steady.' },
      { timestamp: new Date(now.getTime() - 24 * 3600 * 1000).toLocaleString(), snapshotVal: `${Math.round(selectedCell.actual * 0.96)}`, targetVal: `${selectedCell.target}`, delta: '+1.8%', status: 'On Track', note: 'Daily operational targets met across department shift logs.' },
      { timestamp: new Date(now.getTime() - 48 * 3600 * 1000).toLocaleString(), snapshotVal: `${Math.round(selectedCell.actual * 0.92)}`, targetVal: `${selectedCell.target}`, delta: '-0.5%', status: 'Watchlist', note: 'Minor shift variance logged due to terminal maintenance.' },
      { timestamp: new Date(now.getTime() - 72 * 3600 * 1000).toLocaleString(), snapshotVal: `${Math.round(selectedCell.actual * 0.88)}`, targetVal: `${selectedCell.target}`, delta: '+4.2%', status: 'On Track', note: 'Strong customer checkout volume recorded during peak hours.' },
      { timestamp: new Date(now.getTime() - 96 * 3600 * 1000).toLocaleString(), snapshotVal: `${Math.round(selectedCell.actual * 0.85)}`, targetVal: `${selectedCell.target}`, delta: '+2.0%', status: 'On Track', note: 'Weekly milestone review completed by Department Manager.' },
    ];
  }, [selectedCell]);

  // Recharts Mini-Line Chart Data Generator for Selected KPI Cell
  const rechartsTrendData = useMemo(() => {
    if (!selectedCell) return [];

    const targetVal = selectedCell.target;
    const actualVal = selectedCell.actual;

    if (timeHorizon === 'today') {
      return [
        { time: '08:00', actual: Math.round(actualVal * 0.4), target: Math.round(targetVal * 0.4) },
        { time: '10:00', actual: Math.round(actualVal * 0.58), target: Math.round(targetVal * 0.55) },
        { time: '12:00', actual: Math.round(actualVal * 0.74), target: Math.round(targetVal * 0.70) },
        { time: '14:00', actual: Math.round(actualVal * 0.86), target: Math.round(targetVal * 0.82) },
        { time: '16:00', actual: Math.round(actualVal * 0.95), target: Math.round(targetVal * 0.90) },
        { time: '18:00', actual: actualVal, target: targetVal },
      ];
    } else if (timeHorizon === 'week') {
      return [
        { time: 'Mon', actual: Math.round(actualVal * 0.82), target: targetVal },
        { time: 'Tue', actual: Math.round(actualVal * 0.88), target: targetVal },
        { time: 'Wed', actual: Math.round(actualVal * 0.91), target: targetVal },
        { time: 'Thu', actual: Math.round(actualVal * 0.95), target: targetVal },
        { time: 'Fri', actual: Math.round(actualVal * 1.05), target: targetVal },
        { time: 'Sat', actual: Math.round(actualVal * 1.12), target: targetVal },
        { time: 'Sun', actual: actualVal, target: targetVal },
      ];
    } else if (timeHorizon === 'quarter') {
      return [
        { time: 'Month 1', actual: Math.round(actualVal * 0.84), target: targetVal },
        { time: 'Month 2', actual: Math.round(actualVal * 0.94), target: targetVal },
        { time: 'Month 3', actual: actualVal, target: targetVal },
      ];
    } else {
      // Monthly View
      return [
        { time: 'Wk 1', actual: Math.round(actualVal * 0.84), target: targetVal },
        { time: 'Wk 2', actual: Math.round(actualVal * 0.91), target: targetVal },
        { time: 'Wk 3', actual: Math.round(actualVal * 0.97), target: targetVal },
        { time: 'Wk 4', actual: actualVal, target: targetVal },
      ];
    }
  }, [selectedCell, timeHorizon]);

  // Specific Staff Contributions Breakdown for Selected KPI Cell
  const staffContributionsData = useMemo(() => {
    if (!selectedCell) return [];

    if (selectedCell.deptId === 'sales') {
      return [
        { name: 'Sarah Jenkins', role: 'Senior POS Cashier', contribution: '42 Transactions Processed', value: formatPrice(18400, activeCurrency, 'USD'), share: '48%', rating: '99.2% Accuracy' },
        { name: 'Kofi Mensah', role: 'Retail Sales Executive', contribution: '31 Transactions Processed', value: formatPrice(12100, activeCurrency, 'USD'), share: '32%', rating: '98.5% Accuracy' },
        { name: 'Ama Owusu', role: 'Junior POS Operator', contribution: '18 Transactions Processed', value: formatPrice(8000, activeCurrency, 'USD'), share: '20%', rating: '97.8% Accuracy' },
      ];
    } else if (selectedCell.deptId === 'hospitality') {
      return [
        { name: 'Michael Kwesi', role: 'Front Desk Lead', contribution: '18 Guest Check-ins Processed', value: 'Room Occupancy Boost', share: '45%', rating: '5.0★ Guest Rating' },
        { name: 'Elena Rostova', role: 'Hotel Receptionist', contribution: '14 Guest Check-ins Processed', value: 'Folio Add-ons Billed', share: '35%', rating: '4.9★ Guest Rating' },
        { name: 'David Osei', role: 'Housekeeping Lead', contribution: '22 Cleaning Tickets Done', value: 'Zero Turnover Delays', share: '20%', rating: '100% On-Time' },
      ];
    } else if (selectedCell.deptId === 'inventory') {
      return [
        { name: 'David Osei', role: 'Warehouse Lead', contribution: '12 PO Receipts Verified', value: 'Zero Stock Discrepancies', share: '55%', rating: '100% Accuracy' },
        { name: 'John Appiah', role: 'Procurement Specialist', contribution: '8 Vendor POs Dispatched', value: 'On-time Supplier Sync', share: '45%', rating: '98.0% Delivery Rate' },
      ];
    } else {
      return [
        { name: activeUser.name, role: activeUser.role.toUpperCase(), contribution: 'Primary Operations Manager', value: 'Executive Oversight', share: '60%', rating: '100% Audit Compliance' },
        { name: 'Corporate Systems Admin', role: 'System Lead', contribution: 'Automated Rule Execution', value: 'Zero Security Incidents', share: '40%', rating: '99.9% Uptime' },
      ];
    }
  }, [selectedCell, activeCurrency, activeUser]);

  // Export Modal Aggregated Transactional Records CSV
  const handleExportModalCSV = () => {
    if (!selectedCell || rawTransactionsData.length === 0) return;

    const headers = ['Record ID', 'Timestamp / Date', 'Entity / Customer / Guest', 'Transaction Details', 'Amount / Value', 'Status / Method', 'Department', 'Time Range Filter'];
    const rows = rawTransactionsData.map(t => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.entity}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.amountStr}"`,
      `"${t.statusStr}"`,
      `"${selectedCell.deptName}"`,
      `"${timeHorizon.toUpperCase()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tumi_ERP_${selectedCell.code}_${selectedCell.deptName.replace(/\s+/g, '_')}_${timeHorizon.toUpperCase()}_Transactions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Refresh handler
  const handleManualRefresh = () => {
    setOrders(dataStore.getOrders());
    setProducts(dataStore.getProducts());
    setBookings(dataStore.getBookings());
    setRooms(dataStore.getRooms());
    setStudents(StudentStaffStore.getStudents());
    setStaff(StudentStaffStore.getStaffList());
    setAuditLogs(dataStore.getAuditTrail());
    setLastRefreshed(new Date().toLocaleTimeString());
  };

  // Live Auto-Refresh Pulse
  useEffect(() => {
    if (!isLiveSync) return;
    const interval = setInterval(() => {
      handleManualRefresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [isLiveSync]);

  // CSV Export for Full Matrix
  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      const headers = ['Code', 'Department', 'Metric Name', 'Actual', 'Target', 'Achievement %', 'Status', 'Manager In Charge'];
      const rows = kpiMetrics.map(m => [
        m.code,
        m.deptName,
        `"${m.metricName}"`,
        m.unit === 'currency' ? `${activeCurrency} ${m.actual}` : `${m.actual}${m.unit === 'percent' ? '%' : ''}`,
        m.unit === 'currency' ? `${activeCurrency} ${m.target}` : `${m.target}${m.unit === 'percent' ? '%' : ''}`,
        `${calculateScore(m)}%`,
        getHeatmapColor(calculateScore(m)).label,
        `"${m.managerInCharge}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Tumi_ERP_Executive_KPI_Heatmap_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsExporting(false);
    }, 600);
  };

  const overallStatus = getHeatmapColor(overallCompanyScore);

  return (
    <div className="bg-slate-950 text-slate-100 rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-6 relative overflow-hidden">
      {/* Background Subtle Gradient Lighting */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER & EXECUTIVE CONTROL BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg text-white">
              <Flame className="w-6 h-6 animate-pulse text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white uppercase">
                  Executive Real-Time KPI Heatmap
                </h2>
                {isLiveSync && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Live Pulse Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any heatmap cell to inspect raw transactional data, Recharts performance trend lines, and staff contributions.
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS BAR */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Horizon Selector (if not controlled from top parent) */}
          {!timeHorizonProp && (
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs">
              {(['today', 'week', 'month', 'quarter'] as const).map(th => (
                <button
                  key={th}
                  onClick={() => setInternalTimeHorizon(th)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all capitalize text-[11px] cursor-pointer ${
                    timeHorizon === th
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {th === 'today' ? 'Daily' : th === 'week' ? 'Weekly' : th === 'month' ? 'Monthly' : 'Quarterly'}
                </button>
              ))}
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('heatmap')}
              title="Heatmap Matrix Grid"
              className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                viewMode === 'heatmap' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Heatmap</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              title="KPI Cards View"
              className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('digest')}
              title="AI Executive Digest"
              className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                viewMode === 'digest' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">CEO Digest</span>
            </button>
          </div>

          {/* Gemini Anomaly Detection Real-Time Toggle */}
          <button
            onClick={() => setIsAnomalyDetection(!isAnomalyDetection)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isAnomalyDetection 
                ? 'bg-rose-950/80 text-rose-300 border-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.4)]' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Real-Time Gemini AI Anomaly Detection: Highlights metric cells deviating significantly from historical patterns."
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnomalyDetection ? 'text-rose-400 animate-spin-slow' : 'text-slate-500'}`} />
            <span>Anomaly Detection</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black ${isAnomalyDetection ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {isAnalyzingAnomalies ? 'ANALYZING...' : isAnomalyDetection ? `ON (${anomaliesList.length})` : 'OFF'}
            </span>
          </button>

          {/* Refresh & Sync Controls */}
          <button
            onClick={handleManualRefresh}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
            title={`Last updated: ${lastRefreshed}. Click to refresh manually.`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isExporting ? 'Exporting...' : 'Export Matrix CSV'}</span>
          </button>
        </div>
      </div>

      {/* OVERALL COMPANY PERFORMANCE BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
        {/* Overall Composite Score */}
        <div className="md:col-span-2 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Overall Company Enterprise Score ({timeHorizon.toUpperCase()} VIEW)
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {overallCompanyScore}%
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${overallStatus.badge}`}>
                {overallStatus.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Weighted performance composite across {kpiMetrics.length} real-time organizational KPIs.
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-end justify-center pl-4 border-l border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Target Benchmark</span>
            <span className="text-xl font-extrabold text-indigo-400 font-mono">100.0%</span>
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>+{Math.max(0, overallCompanyScore - 100)}% Surplus</span>
            </span>
          </div>
        </div>

        {/* Heatmap Legend Bar */}
        <div className="md:col-span-2 bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-center space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Heatmap Intensity Scale (% Achievement vs Target)
          </span>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-emerald-600 text-white rounded-lg py-1.5 px-1 text-[10px] font-extrabold border border-emerald-500">
              <div>≥ 105%</div>
              <div className="text-[8px] opacity-80 font-normal">Exceeding</div>
            </div>
            <div className="bg-emerald-500 text-white rounded-lg py-1.5 px-1 text-[10px] font-extrabold border border-emerald-400">
              <div>85 - 104%</div>
              <div className="text-[8px] opacity-80 font-normal">On Track</div>
            </div>
            <div className="bg-amber-400 text-slate-950 rounded-lg py-1.5 px-1 text-[10px] font-extrabold border border-amber-300">
              <div>70 - 84%</div>
              <div className="text-[8px] opacity-90 font-normal">Watchlist</div>
            </div>
            <div className="bg-rose-600 text-white rounded-lg py-1.5 px-1 text-[10px] font-extrabold border border-rose-500">
              <div>&lt; 70%</div>
              <div className="text-[8px] opacity-80 font-normal font-bold">Critical</div>
            </div>
          </div>
        </div>
      </div>

      {/* DEPARTMENT FILTER TABS (if not controlled from top parent) */}
      {!selectedDeptProp && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3 relative z-10 text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" /> Sector Filter:
          </span>
          <button
            onClick={() => setInternalSelectedDept('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              selectedDept === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Departments ({kpiMetrics.length})
          </button>

          {departmentSummaries.map(dept => (
            <button
              key={dept.id}
              onClick={() => setInternalSelectedDept(dept.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedDept === dept.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dept.statusInfo.accentBg}`} />
              <span>{dept.name}</span>
              <span className="text-[10px] opacity-70 font-mono font-normal">({dept.avgScore}%)</span>
            </button>
          ))}
        </div>
      )}

      {/* VIEW MODE 1: HEATMAP MATRIX GRID */}
      {viewMode === 'heatmap' && (
        <div className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMetrics.map(metric => {
              const score = calculateScore(metric);
              const colorInfo = getHeatmapColor(score);
              const hasAnomaly = isAnomalyDetection && anomalyMap.has(metric.code);
              const anomalyData = hasAnomaly ? anomalyMap.get(metric.code) : null;

              return (
                <div
                  key={metric.id}
                  onClick={() => {
                    setSelectedCell(metric);
                    setModalTab('transactions');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] hover:shadow-xl relative overflow-hidden group ${colorInfo.bg} ${
                    hasAnomaly ? 'ring-2 ring-rose-400 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse' : ''
                  }`}
                >
                  {/* Glassmorphism shine overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  {/* AI Anomaly Badge if flagged */}
                  {hasAnomaly && (
                    <div className="mb-2 px-2.5 py-1 bg-rose-950/90 text-rose-200 text-[10px] font-black rounded-lg border border-rose-500/80 flex items-center justify-between gap-1.5 shadow-md relative z-10">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                        <span>AI Anomaly Flagged</span>
                      </span>
                      <span className="uppercase text-[9px] font-mono bg-rose-600 text-white px-1.5 py-0.2 rounded">
                        {anomalyData?.severity || 'Alert'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2 relative z-10">
                    <div>
                      <span className="text-[9px] uppercase font-mono font-bold tracking-widest opacity-80 block">
                        {metric.code} • {metric.deptName}
                      </span>
                      <h4 className="font-extrabold text-sm tracking-tight mt-0.5 leading-snug">
                        {metric.metricName}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-xs border border-white/20 shrink-0">
                      {score}%
                    </span>
                  </div>

                  {/* Visual Progress Bar Toward Performance Target */}
                  <div className="mt-3 relative z-10 space-y-1">
                    <div className="flex justify-between text-[9px] font-mono font-bold opacity-85">
                      <span>Monthly Target Progress</span>
                      <span>{score}%</span>
                    </div>
                    <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/20">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-white/90"
                        style={{ width: `${Math.min(100, score)}%` }}
                      />
                    </div>
                  </div>

                  {/* Main Metric Value vs Target */}
                  <div className="mt-3 pt-2.5 border-t border-white/20 flex items-baseline justify-between relative z-10 font-mono">
                    <div>
                      <span className="text-[9px] opacity-75 uppercase block font-sans">Actual Performance</span>
                      <span className="text-xl font-black tracking-tight">
                        {metric.unit === 'currency' 
                          ? formatPrice(metric.actual, activeCurrency, 'USD') 
                          : `${metric.actual}${metric.unit === 'percent' ? '%' : ''}`}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] opacity-75 uppercase block font-sans font-bold">Target</span>
                      <span className="text-sm font-bold opacity-90">
                        {metric.unit === 'currency' 
                          ? formatPrice(metric.target, activeCurrency, 'USD') 
                          : `${metric.target}${metric.unit === 'percent' ? '%' : ''}`}
                      </span>
                    </div>
                  </div>

                  {/* Footer Trend & Click to Inspect Hint */}
                  <div className="mt-3 flex items-center justify-between text-[10px] relative z-10 opacity-90 pt-1">
                    <span className="flex items-center gap-1 font-semibold truncate max-w-[150px]">
                      {metric.trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />}
                      {metric.trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate">{metric.trendValue}</span>
                    </span>

                    <span className="font-sans font-bold underline opacity-90 group-hover:opacity-100 flex items-center gap-0.5 bg-black/30 px-2 py-0.5 rounded-full border border-white/10">
                      <span>Click to Inspect</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CARDS BREAKDOWN VIEW WITH PROGRESS GAUGES */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {filteredMetrics.map(metric => {
            const score = calculateScore(metric);
            const colorInfo = getHeatmapColor(score);

            return (
              <div
                key={metric.id}
                onClick={() => {
                  setSelectedCell(metric);
                  setModalTab('transactions');
                }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                        {metric.code}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">{metric.deptName}</span>
                    </div>
                    <h3 className="font-extrabold text-base text-white mt-1 group-hover:text-indigo-300 transition-colors">{metric.metricName}</h3>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${colorInfo.badge}`}>
                    {score}% ({colorInfo.label})
                  </span>
                </div>

                {/* Progress Bar Gauge */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Target Achievement Progress</span>
                    <span className="font-bold text-white">{score}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, score)}%`,
                        backgroundColor: colorInfo.hex
                      }}
                    />
                  </div>
                </div>

                {/* Actual vs Target Numerical Cards */}
                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-sans font-bold block">
                      Actual Metric Value
                    </span>
                    <span className="text-base font-extrabold text-white mt-0.5 block">
                      {metric.unit === 'currency' 
                        ? formatPrice(metric.actual, activeCurrency, 'USD') 
                        : `${metric.actual}${metric.unit === 'percent' ? '%' : ''}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-sans font-bold block">
                      Executive Target
                    </span>
                    <span className="text-base font-extrabold text-indigo-400 mt-0.5 block">
                      {metric.unit === 'currency' 
                        ? formatPrice(metric.target, activeCurrency, 'USD') 
                        : `${metric.target}${metric.unit === 'percent' ? '%' : ''}`}
                    </span>
                  </div>
                </div>

                {/* Recommendation Box */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-1">
                  <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Management Action Plan:
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{metric.recommendation}</p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                  <span>Manager: <strong className="text-slate-200">{metric.managerInCharge}</strong></span>
                  <span className="text-indigo-400 font-bold flex items-center gap-1">
                    <span>Inspect Raw Data & Staff Logs</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 3: AI EXECUTIVE SUMMARY DIGEST */}
      {viewMode === 'digest' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 relative z-10">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Sparkles className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                AI Executive Management Briefing & Strategic Digest ({timeHorizon.toUpperCase()} VIEW)
              </h3>
              <p className="text-xs text-slate-400">
                Automated synthesis of real-time KPI matrix variances, department bottlenecks & action items for CEOs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top Outperforming Sector */}
            <div className="p-4 bg-emerald-950/30 border border-emerald-800/60 rounded-2xl space-y-2">
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Top Outperforming Sector
              </span>
              <h4 className="text-sm font-bold text-white">Sales & Retail POS Engine</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Revenue realization is tracking at <strong>112%</strong> vs benchmark targets. POS checkout velocity and average basket sizes remain exceptionally strong.
              </p>
            </div>

            {/* Critical Priority Bottleneck */}
            <div className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-2xl space-y-2">
              <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Immediate Priority Focus
              </span>
              <h4 className="text-sm font-bold text-white">Warehouse Low-Stock Replenishment</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Stock safety health index is below optimal thresholds. Dispatch auto-generated purchase orders immediately to avoid stockouts on fast-moving items.
              </p>
            </div>

            {/* Strategic Opportunity */}
            <div className="p-4 bg-indigo-950/30 border border-indigo-800/60 rounded-2xl space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Growth Opportunity
              </span>
              <h4 className="text-sm font-bold text-white">Hospitality Dynamic Pricing</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hotel room occupancy is holding steady at 82%. Consider raising weekend ADR rates on OTA channels to boost RevPAR by an estimated 12%.
              </p>
            </div>
          </div>

          {/* Department Performance Matrix Table */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Departmental Composite Health Scorecard
            </h4>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Department</th>
                    <th className="p-3 text-center">Tracked KPIs</th>
                    <th className="p-3 text-center">Composite Score</th>
                    <th className="p-3">Status Rating</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                  {departmentSummaries.map(d => (
                    <tr key={d.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${d.statusInfo.accentBg}`} />
                        <span>{d.name}</span>
                      </td>
                      <td className="p-3 text-center font-mono">{d.metricsCount} KPIs</td>
                      <td className="p-3 text-center font-mono font-black text-sm text-white">
                        {d.avgScore}%
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${d.statusInfo.badge}`}>
                          {d.statusInfo.label}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setInternalSelectedDept(d.id)}
                          className="text-indigo-400 hover:text-indigo-300 font-bold text-[11px] underline cursor-pointer"
                        >
                          View Metrics
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ENHANCED INTERACTIVE CELL MODAL DRAWER FOR RAW DATA, RECHARTS TREND CHART & STAFF CONTRIBUTIONS */}
      {selectedCell && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 text-slate-100 relative overflow-hidden max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                      {selectedCell.code}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">{selectedCell.deptName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getHeatmapColor(calculateScore(selectedCell)).badge}`}>
                      {calculateScore(selectedCell)}% ({getHeatmapColor(calculateScore(selectedCell)).label})
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">
                    {selectedCell.metricName} KPI Inspection
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportModalCSV}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Download aggregated transactional records as CSV using current filters"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => setSelectedCell(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Metrics & Recharts Mini-Line Chart Panel */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 shrink-0">
              {/* Quick Metrics Bar */}
              <div className="md:col-span-5 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline border-b border-slate-800/80 pb-2">
                    <span className="text-[10px] text-slate-500 uppercase font-sans font-bold">
                      Actual Metric Value
                    </span>
                    <span className="text-xl font-black text-white">
                      {selectedCell.unit === 'currency' 
                        ? formatPrice(selectedCell.actual, activeCurrency, 'USD') 
                        : `${selectedCell.actual}${selectedCell.unit === 'percent' ? '%' : ''}`}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline border-b border-slate-800/80 pb-2">
                    <span className="text-[10px] text-slate-500 uppercase font-sans font-bold">
                      Target Benchmark
                    </span>
                    <span className="text-base font-extrabold text-indigo-400">
                      {selectedCell.unit === 'currency' 
                        ? formatPrice(selectedCell.target, activeCurrency, 'USD') 
                        : `${selectedCell.target}${selectedCell.unit === 'percent' ? '%' : ''}`}
                    </span>
                  </div>

                  {/* Target Progress Gauge */}
                  <div className="space-y-1 font-sans">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>Monthly Progress Toward Target</span>
                      <span className="text-white font-mono">{calculateScore(selectedCell)}%</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                        style={{ width: `${Math.min(100, calculateScore(selectedCell))}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-[10px] text-slate-500 uppercase font-sans font-bold">
                      Filter Parameters
                    </span>
                    <span className="text-xs font-bold text-amber-400 uppercase font-sans">
                      {timeHorizon.toUpperCase()} • {selectedCell.deptName}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-sans flex items-center justify-between">
                  <span>Manager: <strong className="text-slate-200">{selectedCell.managerInCharge}</strong></span>
                  <span className="text-emerald-400 font-mono font-bold">{selectedCell.trendValue}</span>
                </div>
              </div>

              {/* Recharts Mini-Line Chart Panel */}
              <div className="md:col-span-7 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-1">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-extrabold text-white flex items-center gap-1.5 uppercase text-[10px] tracking-wider font-sans">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                    {selectedCell.metricName} Trend ({timeHorizon.toUpperCase()} FLUCTUATIONS)
                  </span>
                  <div className="flex items-center gap-3 text-[9px] font-mono">
                    <span className="flex items-center gap-1 text-indigo-400 font-bold">
                      <span className="w-2 h-0.5 bg-indigo-400 inline-block" /> Actual
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <span className="w-2 h-0.5 bg-amber-400 border-dashed border-b border-amber-400 inline-block" /> Target
                    </span>
                  </div>
                </div>

                {/* RECHARTS MINI LINE CHART CONTAINER */}
                <div className="h-32 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rechartsTrendData} margin={{ top: 8, right: 15, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                        formatter={(value: any, name: any) => [
                          selectedCell.unit === 'currency' ? formatPrice(Number(value), activeCurrency, 'USD') : `${value}${selectedCell.unit === 'percent' ? '%' : ''}`,
                          name === 'actual' ? 'Actual Performance' : 'Target Benchmark'
                        ]}
                      />
                      <Line type="monotone" dataKey="actual" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} name="actual" />
                      <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="target" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* GEMINI AI ANOMALY DETECTION ALERT BLOCK IF FLAGGED */}
            {isAnomalyDetection && anomalyMap.has(selectedCell.code) && (
              <div className="p-4 bg-rose-950/50 border border-rose-600/70 rounded-2xl space-y-2 shrink-0 animate-fade-in shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">
                      Gemini AI Anomaly Insight: {anomalyMap.get(selectedCell.code)?.headline}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white uppercase">
                    Severity: {anomalyMap.get(selectedCell.code)?.severity || 'Warning'}
                  </span>
                </div>
                <p className="text-xs text-rose-200 leading-relaxed font-sans">
                  {anomalyMap.get(selectedCell.code)?.explanation}
                </p>
                <div className="p-2.5 bg-rose-900/60 rounded-xl border border-rose-700/60 text-xs text-rose-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span><strong>Action Plan:</strong> {anomalyMap.get(selectedCell.code)?.recommendedAction}</span>
                </div>
              </div>
            )}

            {/* INTERACTIVE MODAL TABS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModalTab('transactions')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalTab === 'transactions' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Raw Transactional Data ({rawTransactionsData.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('trends')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalTab === 'trends' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Trend Logs ({trendLogsData.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('staff')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalTab === 'staff' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Staff Contributions ({staffContributionsData.length})</span>
                </button>
              </div>

              {/* Search Bar for Transactions */}
              {modalTab === 'transactions' && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search raw transactions..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              )}
            </div>

            {/* TAB CONTENT PANEL */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">

              {/* TAB 1: RAW TRANSACTIONAL DATA */}
              {modalTab === 'transactions' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Filtered raw underlying transaction records for <strong>{selectedCell.metricName}</strong> ({timeHorizon.toUpperCase()} horizon):
                    </p>

                    <button
                      type="button"
                      onClick={handleExportModalCSV}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Download Spreadsheet (.csv)
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="bg-slate-950 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-3">Record ID</th>
                          <th className="p-3">Timestamp / Date</th>
                          <th className="p-3">Customer / Guest / Entity</th>
                          <th className="p-3">Transaction Details</th>
                          <th className="p-3 text-right">Amount / Value</th>
                          <th className="p-3">Status / Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-sans">
                        {rawTransactionsData.length > 0 ? (
                          rawTransactionsData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                              <td className="p-3 font-mono font-bold text-indigo-400">{item.id}</td>
                              <td className="p-3 text-slate-400 text-[11px]">{item.date}</td>
                              <td className="p-3 font-bold text-white">{item.entity}</td>
                              <td className="p-3 text-slate-300 max-w-xs truncate">{item.description}</td>
                              <td className="p-3 text-right font-mono font-bold text-white">{item.amountStr}</td>
                              <td className="p-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {item.statusStr}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 italic text-xs">
                              No raw transactional records found matching search query.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: HISTORICAL TREND LOGS */}
              {modalTab === 'trends' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Historical telemetry trend snapshot logs and target variance shifts over time:
                  </p>

                  <div className="space-y-2">
                    {trendLogsData.map((log, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-400 font-bold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{log.timestamp}</span>
                          </span>

                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-400">Value: <strong className="text-white">{log.snapshotVal}</strong> / Target: {log.targetVal}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.delta.startsWith('+') ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                              {log.delta}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                          {log.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: SPECIFIC STAFF CONTRIBUTIONS */}
              {modalTab === 'staff' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Leaderboard breakdown of team members and staff personnel contributing to <strong>{selectedCell.metricName}</strong>:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {staffContributionsData.map((s, idx) => (
                      <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center text-xs">
                              {s.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-white">{s.name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono">{s.role}</p>
                            </div>
                          </div>

                          <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
                            {s.share} Share
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase font-sans block">Operational Volume</span>
                            <span className="font-bold text-white block mt-0.5">{s.contribution}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase font-sans block">Value Generated</span>
                            <span className="font-bold text-emerald-400 block mt-0.5">{s.value}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                          <span>Quality Rating: <strong className="text-slate-200">{s.rating}</strong></span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" /> Certified
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0 text-xs">
              <button
                type="button"
                onClick={handleExportModalCSV}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-900/50 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Export Aggregated CSV</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Close Inspection
                </button>
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => {
                      const tab = selectedCell.targetTab;
                      setSelectedCell(null);
                      onNavigateToTab(tab);
                    }}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Open Operational Module</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
