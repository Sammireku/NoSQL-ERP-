import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  UserProfile, 
  CustomerProfile, 
  Opportunity, 
  Product, 
  InventoryLevel, 
  POSOrder,
  PurchaseOrder,
  CustomerLog,
  Vendor,
  WarehouseLocation,
  TimeCardLog,
  JournalEntry,
  AuditLogEntry,
  PettyCashAllocation,
  PettyCashExpense,
  ERPModuleConfig,
  CustomWorkflowRule,
  Room,
  Booking,
  ChannelConnection,
  ChannelSyncLog,
  APIKeyRequest,
  InternalMessage,
  TaskItem,
  MobileAppProfile,
  RoomCharge,
  CheckoutInvoiceData,
  DonorGrant,
  TraineeAttendanceLog,
  GraduatePlacementRecord,
  DigitalCertificate,
  ChartOfAccount,
  CashFlowRecord,
  FixedAssetRecord,
  InventoryValuationSnapshot,
  LeaveRequestRecord,
  PerformanceReviewRecord,
  PayrollRunRecord,
  WebDonationFormConfig,
  WebDonationTransaction,
  DonorProfile,
  CapturedDonorRecord,
  SystemMigrationJob,
  ExternalConnectorConfig,
  ProjectBudget,
  StockDepartment,
  StockLocation,
  CompanyTaxConfig,
  ReceiptTemplateConfig,
  DashboardWidgetConfig
} from '../types/erp';

// Initialize real Firebase if config is not the default placeholder
const isRealConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'placeholder-api-key';

let app;
let db: any = null;
let auth: any = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isRealConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Failed to initialize real Firebase:", error);
  }
}

// ============================================================================
// HIGH-FIDELITY SANDBOX DATA ENGINE & PERSISTENCE Fallback
// ============================================================================

// Key identifiers for localStorage
const STORAGE_KEYS = {
  USERS: 'erp_sandbox_users',
  CUSTOMERS: 'erp_sandbox_customers',
  OPPORTUNITIES: 'erp_sandbox_opportunities',
  PRODUCTS: 'erp_sandbox_products',
  INVENTORY: 'erp_sandbox_inventory',
  ORDERS: 'erp_sandbox_orders',
  OFFLINE_QUEUE: 'erp_sandbox_offline_queue',
  PURCHASE_ORDERS: 'erp_sandbox_purchase_orders',
  CUSTOMER_LOGS: 'erp_sandbox_customer_logs',
  VENDORS: 'erp_sandbox_vendors',
  TIME_CARDS: 'erp_sandbox_time_cards',
  DOUBLE_ENTRY: 'erp_sandbox_double_entry',
  WAREHOUSES: 'erp_sandbox_warehouses',
  AUDIT_TRAIL: 'erp_sandbox_audit_trail',
  PETTY_CASH_ALLOC: 'erp_sandbox_petty_cash_alloc',
  PETTY_CASH_EXP: 'erp_sandbox_petty_cash_exp',
  MODULES_CONFIG: 'erp_sandbox_modules_config',
  WORKFLOW_RULES: 'erp_sandbox_workflow_rules',
  HOSPITALITY_ROOMS: 'erp_sandbox_hospitality_rooms',
  HOSPITALITY_BOOKINGS: 'erp_sandbox_hospitality_bookings',
  CHANNEL_CONNECTIONS: 'erp_sandbox_channel_connections',
  CHANNEL_SYNC_LOGS: 'erp_sandbox_channel_sync_logs',
  API_KEY_REQUESTS: 'erp_sandbox_api_key_requests',
  INTERNAL_MESSAGES: 'erp_sandbox_internal_messages',
  TASKS: 'erp_sandbox_tasks',
  MOBILE_APP_PROFILES: 'erp_sandbox_mobile_app_profiles',
  DONOR_GRANTS: 'erp_sandbox_donor_grants',
  TRAINEE_ATTENDANCE: 'erp_sandbox_trainee_attendance',
  GRADUATE_PLACEMENTS: 'erp_sandbox_graduate_placements',
  DIGITAL_CERTIFICATES: 'erp_sandbox_digital_certificates',
  CHART_OF_ACCOUNTS: 'erp_sandbox_chart_of_accounts',
  CASH_FLOWS: 'erp_sandbox_cash_flows',
  FIXED_ASSETS: 'erp_sandbox_fixed_assets',
  INVENTORY_VALUATIONS: 'erp_sandbox_inventory_valuations',
  LEAVE_REQUESTS: 'erp_sandbox_leave_requests',
  PERFORMANCE_REVIEWS: 'erp_sandbox_performance_reviews',
  PAYROLL_RUNS: 'erp_sandbox_payroll_runs',
  WEB_DONATION_FORMS: 'erp_sandbox_web_donation_forms',
  WEB_DONATION_TRANSACTIONS: 'erp_sandbox_web_donation_transactions',
  DONOR_PROFILES: 'erp_sandbox_donor_profiles',
  CAPTURED_DONOR_DATABASE: 'erp_sandbox_captured_donor_database',
  SYSTEM_MIGRATIONS: 'erp_sandbox_system_migrations',
  WAVE_RECEIPTS: 'erp_sandbox_wave_receipts',
  EXTERNAL_CONNECTORS: 'erp_sandbox_external_connectors',
  PROJECT_BUDGETS: 'erp_sandbox_project_budgets',
  STOCK_DEPARTMENTS: 'erp_sandbox_stock_departments',
  STOCK_LOCATIONS: 'erp_sandbox_stock_locations',
  TAX_CONFIG: 'erp_sandbox_tax_config',
  RECEIPT_CONFIG: 'erp_sandbox_receipt_config',
  DASHBOARD_WIDGETS: 'erp_sandbox_dashboard_widgets',
};

export const DEFAULT_MIGRATION_JOBS: SystemMigrationJob[] = [
  {
    id: 'mig_seed_1',
    systemName: 'QuickBooks Online',
    systemCategory: 'accounting',
    recordsImported: 48,
    status: 'completed',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    summary: 'Imported Chart of Accounts, Operating Cash ledger, and recent vendor payment history.',
    details: { coaCount: 16, vendorsCount: 8, transactionsCount: 24 }
  },
  {
    id: 'mig_seed_2',
    systemName: 'BambooHR',
    systemCategory: 'hr',
    recordsImported: 12,
    status: 'completed',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    summary: 'Imported Employee Directory, Job Roles, and Leave Balance profiles.',
    details: { employeeCount: 12, departmentsCount: 4 }
  },
  {
    id: 'mig_seed_3',
    systemName: 'HubSpot CRM',
    systemCategory: 'crm',
    recordsImported: 35,
    status: 'completed',
    timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
    summary: 'Imported active Enterprise Leads, Deal Stages, and Contact Directory.',
    details: { contactsCount: 25, dealsCount: 10 }
  }
];

// Default ERP Modules Config (Selectable & Re-orderable)
export const DEFAULT_MODULES: ERPModuleConfig[] = [
  {
    id: 'sysadmin',
    name: 'System Admin Console',
    department: 'Administration',
    enabled: true,
    order: 1,
    description: 'User management, RBAC PIN security, WhatsApp invites & security rules.',
    iconName: 'ShieldCheck',
    linkedModuleIds: ['hr']
  },
  {
    id: 'builder',
    name: 'Create Dashboard',
    department: 'Administration',
    enabled: true,
    order: 2,
    description: 'Design and customize operational dashboards, widgets, and cross-department automation rules.',
    iconName: 'LayoutGrid',
    linkedModuleIds: ['pos', 'crm', 'inventory', 'financials', 'hospitality']
  },
  {
    id: 'pos',
    name: 'POS Terminal & Register',
    department: 'Sales & Checkout',
    enabled: true,
    order: 3,
    description: 'Point-of-sale checkout, offline sync, AI document scan & cash register.',
    iconName: 'ShoppingCart',
    linkedModuleIds: ['inventory', 'financials', 'customers']
  },
  {
    id: 'crm',
    name: 'Sales Deals',
    department: 'CRM & Marketing',
    enabled: true,
    order: 4,
    description: 'Visual deal pipeline, lead scoring, deal stages & conversion tracking.',
    iconName: 'TrendingUp',
    linkedModuleIds: ['customers', 'financials']
  },
  {
    id: 'customers',
    name: 'Customer Directory & Risk',
    department: 'CRM & Marketing',
    enabled: true,
    order: 5,
    description: 'Customer LTV tracking, AI churn analysis, communication history & profiles.',
    iconName: 'Users',
    linkedModuleIds: ['pos', 'crm']
  },
  {
    id: 'inventory',
    name: 'Warehouse & Inventory',
    department: 'Operations & Supply Chain',
    enabled: true,
    order: 6,
    description: 'Stock levels, SKU catalog, bin locations & AI reorder thresholds.',
    iconName: 'Package',
    linkedModuleIds: ['pos', 'procurement']
  },
  {
    id: 'hr',
    name: 'HR and Roles',
    department: 'Human Resources',
    enabled: true,
    order: 7,
    description: 'Employee profiles, role RBAC permissions, leave management, appraisals & payroll.',
    iconName: 'Briefcase',
    linkedModuleIds: ['sysadmin', 'financials']
  },
  {
    id: 'financials',
    name: 'Financial Double Ledger',
    department: 'Finance & Accounting',
    enabled: true,
    order: 8,
    description: 'Real-time double-entry journal, revenue debit/credit & audit statements.',
    iconName: 'DollarSign',
    linkedModuleIds: ['pos', 'procurement', 'petty_cash', 'hospitality']
  },
  {
    id: 'procurement',
    name: 'Procurement & Vendors',
    department: 'Operations & Supply Chain',
    enabled: true,
    order: 9,
    description: 'Supplier directory, purchase orders, restock approvals & lead times.',
    iconName: 'Truck',
    linkedModuleIds: ['inventory', 'financials']
  },
  {
    id: 'petty_cash',
    name: 'Petty Cash Disbursements',
    department: 'Finance & Accounting',
    enabled: true,
    order: 10,
    description: 'On-site petty cash allocation, receipt scanning & expenditure tracking.',
    iconName: 'Coins',
    linkedModuleIds: ['financials']
  },
  {
    id: 'hospitality',
    name: 'Hospitality & Channel Manager',
    department: 'Hospitality & Services',
    enabled: true,
    order: 11,
    description: 'Room management, direct website & OTA sync (Airbnb, Booking.com, Hostelworld).',
    iconName: 'Building2',
    linkedModuleIds: ['pos', 'financials', 'customers']
  }
];

export const DEFAULT_WORKFLOW_RULES: CustomWorkflowRule[] = [
  {
    id: 'rule_1',
    triggerModuleId: 'hospitality',
    event: 'New Guest Booking Confirmed',
    targetModuleId: 'financials',
    action: 'Auto-Post Revenue to Double-Entry Ledger (Credit: Room Revenue)',
    enabled: true
  },
  {
    id: 'rule_2',
    triggerModuleId: 'hospitality',
    event: 'Walk-In Guest Check-In',
    targetModuleId: 'pos',
    action: 'Generate POS Invoice & Process Room Charge at Front Desk',
    enabled: true
  },
  {
    id: 'rule_3',
    triggerModuleId: 'pos',
    event: 'POS Order Completed',
    targetModuleId: 'inventory',
    action: 'Deduct Item Stock Quantities in Real-Time',
    enabled: true
  },
  {
    id: 'rule_4',
    triggerModuleId: 'procurement',
    event: 'Purchase Order Status -> Received',
    targetModuleId: 'inventory',
    action: 'Auto-Restock Stock Levels & Log Restock Audit Event',
    enabled: true
  }
];

export const DEFAULT_ROOMS: Room[] = [];
export const DEFAULT_BOOKINGS: Booking[] = [];
export const DEFAULT_API_KEY_REQUESTS: APIKeyRequest[] = [];
export const DEFAULT_INTERNAL_MESSAGES: InternalMessage[] = [];
export const DEFAULT_TASKS: TaskItem[] = [];
export const DEFAULT_MOBILE_PROFILES: MobileAppProfile[] = [];
export const DEFAULT_CHANNELS: ChannelConnection[] = [];
export const DEFAULT_CHANNEL_LOGS: ChannelSyncLog[] = [];
export const DEFAULT_DONOR_GRANTS: DonorGrant[] = [];
export const DEFAULT_TRAINEE_ATTENDANCE: TraineeAttendanceLog[] = [];
export const DEFAULT_GRADUATE_PLACEMENTS: GraduatePlacementRecord[] = [];
export const DEFAULT_DIGITAL_CERTIFICATES: DigitalCertificate[] = [];
export const DEFAULT_DONOR_PROFILES: DonorProfile[] = [];
export const DEFAULT_CAPTURED_DONOR_DATABASE: CapturedDonorRecord[] = [];

export const DEFAULT_EXTERNAL_CONNECTORS: ExternalConnectorConfig[] = [
  {
    id: 'conn_wave',
    systemName: 'Wave Receipts & Accounting',
    systemKey: 'wave',
    category: 'Accounting',
    description: 'Extract receipt ledger items, sync expense claims, and push automated financial transaction journals to Wave accounting.',
    status: 'connected',
    healthScore: 99,
    latencyMs: 42,
    totalApiCalls24h: 1284,
    errorRate24h: 0.1,
    authType: 'api_key',
    apiKey: 'wave_live_pk_9f82a10b48c2e91a02',
    baseUrl: 'https://gql.waveapps.com/graphql/public',
    webhookUrl: 'https://api.tumi.app/v1/webhooks/wave',
    syncFrequency: 'hourly',
    lastSyncedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    recordsSyncedCount: 142,
    environment: 'production',
    enabledModules: ['Expenses', 'Receipt Ledger', 'Invoices'],
    errorLogs: [
      {
        id: 'err_w1',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        level: 'info',
        statusCode: 200,
        endpoint: '/graphql/public',
        message: 'Successfully posted 12 receipt ledger journals to Wave Accounts Receivable.',
        resolved: true
      },
      {
        id: 'err_w2',
        timestamp: new Date(Date.now() - 3600000 * 26).toISOString(),
        level: 'warning',
        statusCode: 429,
        endpoint: '/graphql/public',
        message: 'Rate limit threshold reached (60 req/min). Auto-throttled retry succeeded after 500ms.',
        resolved: true
      }
    ],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Admin'
  },
  {
    id: 'conn_afriops',
    systemName: 'AfriOps Operations & Supply Chain',
    systemKey: 'afriops',
    category: 'Logistics & Supply Chain',
    description: 'Synchronize cross-border logistics manifests, warehouse stock transfers, waybills, and fleet dispatch statuses with AfriOps ERP.',
    status: 'connected',
    healthScore: 98,
    latencyMs: 65,
    totalApiCalls24h: 2450,
    errorRate24h: 0.4,
    authType: 'oauth2',
    oauthClientId: 'afriops_client_091823',
    oauthClientSecret: '••••••••••••••••',
    baseUrl: 'https://api.afriops.io/v1',
    webhookUrl: 'https://api.tumi.app/v1/webhooks/afriops',
    syncFrequency: 'realtime',
    lastSyncedAt: new Date(Date.now() - 1800000).toISOString(),
    recordsSyncedCount: 89,
    environment: 'production',
    enabledModules: ['Waybills', 'Fleet Dispatch', 'Inventory Stock', 'Customs Docs'],
    errorLogs: [
      {
        id: 'err_a1',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        level: 'info',
        statusCode: 200,
        endpoint: '/v1/waybills/sync',
        message: 'Real-time webhook delivered: Waybill #AFO-8821 dispatched to Accra harbor warehouse.',
        resolved: true
      },
      {
        id: 'err_a2',
        timestamp: new Date(Date.now() - 3600000 * 14).toISOString(),
        level: 'warning',
        statusCode: 502,
        endpoint: '/v1/fleet/status',
        message: 'AfriOps Gateway Timeout during heavy GPS batch ping. Fallback worker retried successfully.',
        resolved: true
      }
    ],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Admin'
  },
  {
    id: 'conn_milous',
    systemName: 'Milous Project Management System',
    systemKey: 'milous',
    category: 'Project Management',
    description: 'Link internal project milestones, tasks, team capacity allocations, and time-tracking logs directly with Milous project workspaces.',
    status: 'connected',
    healthScore: 100,
    latencyMs: 28,
    totalApiCalls24h: 3890,
    errorRate24h: 0.0,
    authType: 'bearer_token',
    apiKey: 'milous_bearer_pt_8820391029381029',
    baseUrl: 'https://api.milous.app/v2',
    webhookUrl: 'https://api.tumi.app/v1/webhooks/milous',
    syncFrequency: 'realtime',
    lastSyncedAt: new Date(Date.now() - 900000).toISOString(),
    recordsSyncedCount: 310,
    environment: 'production',
    enabledModules: ['Tasks', 'Milestones', 'Time Logs', 'Capacity Allocations'],
    errorLogs: [
      {
        id: 'err_m1',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        level: 'info',
        statusCode: 200,
        endpoint: '/v2/milestones/sync',
        message: 'Milestone "Phase 2 Core Launch" completed in Milous workspace; updated local project board.',
        resolved: true
      }
    ],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Admin'
  },
  {
    id: 'conn_quickbooks',
    systemName: 'QuickBooks Online',
    systemKey: 'quickbooks',
    category: 'Accounting',
    description: 'Two-way synchronization for general ledger accounts, customer invoices, vendor bills, and tax compliance entries.',
    status: 'disconnected',
    healthScore: 0,
    latencyMs: 0,
    totalApiCalls24h: 0,
    errorRate24h: 0,
    authType: 'oauth2',
    oauthClientId: 'qb_client_3910293',
    baseUrl: 'https://quickbooks.api.intuit.com/v3',
    syncFrequency: 'daily',
    recordsSyncedCount: 0,
    environment: 'sandbox',
    enabledModules: ['Chart of Accounts', 'Customer Invoices', 'Vendor Bills'],
    errorLogs: [
      {
        id: 'err_q1',
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
        level: 'error',
        statusCode: 401,
        endpoint: '/v3/company/auth',
        message: 'OAuth refresh token expired or revoked. Please re-authenticate via Intuit OAuth screen.',
        resolved: false
      }
    ],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Admin'
  },
  {
    id: 'conn_xero',
    systemName: 'Xero Accounting API',
    systemKey: 'xero',
    category: 'Accounting',
    description: 'Automated bank reconciliation feeds, operational cash flows, and expense journal pushes.',
    status: 'disconnected',
    healthScore: 0,
    latencyMs: 0,
    totalApiCalls24h: 0,
    errorRate24h: 0,
    authType: 'oauth2',
    baseUrl: 'https://api.xero.com/api.xro/2.0',
    syncFrequency: 'hourly',
    recordsSyncedCount: 0,
    environment: 'production',
    enabledModules: ['Bank Feeds', 'Invoices', 'Expenses'],
    errorLogs: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Admin'
  }
];

// Seeding Default Data for Modular Multi-Tenant ERP
const DEFAULT_USERS: UserProfile[] = [
  {
    uid: 'user_ceo_00',
    name: 'Administrator (CEO)',
    email: 'admin@tumierp.com',
    role: 'ceo',
    department: 'Executive',
    companyName: 'My Enterprise',
    permissions: ['all_access', 'sysadmin_access', 'manage_security_rules', 'view_audit_trail', 'manage_team_roles', 'invite_users'],
    ai_skills_match_score: 99,
    pin: '1111',
    status: 'active',
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const DEFAULT_CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  { code: '1010', name: 'Operating Cash & Checking Account', category: 'asset', subcategory: 'current_asset', balance: 0.00, description: 'Primary commercial checking account for operational liquidity', isSystem: true },
  { code: '1020', name: 'Petty Cash On Hand', category: 'asset', subcategory: 'current_asset', balance: 0.00, description: 'Front desk and register cash float reserves', isSystem: true },
  { code: '1100', name: 'Accounts Receivable (Trade Debtors)', category: 'asset', subcategory: 'current_asset', balance: 0.00, description: 'Invoiced corporate credit clients and pending OTA payouts', isSystem: true },
  { code: '1200', name: 'Merchandise Inventory Asset', category: 'asset', subcategory: 'current_asset', balance: 0.00, description: 'Stock at cost held across warehouse and retail shelves', isSystem: true },
  { code: '1510', name: 'Commercial Equipment & Kitchen Assets', category: 'asset', subcategory: 'non_current_asset', balance: 0.00, description: 'Vocational training tools, commercial espresso and POS hardware', isSystem: true },
  { code: '1520', name: 'Logistics & Delivery Fleet Vehicles', category: 'asset', subcategory: 'non_current_asset', balance: 0.00, description: 'Refrigerated delivery vans and utility transit transport', isSystem: true },
  { code: '1590', name: 'Accumulated Asset Depreciation', category: 'asset', subcategory: 'non_current_asset', balance: 0.00, description: 'Contra-asset account tracking straight-line fixed asset depreciation', isSystem: true },
  { code: '2010', name: 'Accounts Payable (Trade Creditors)', category: 'liability', subcategory: 'current_liability', balance: 0.00, description: 'Outstanding vendor supply bills and wholesale procurement invoices', isSystem: true },
  { code: '2020', name: 'Accrued Staff Payroll & Withholdings', category: 'liability', subcategory: 'current_liability', balance: 0.00, description: 'Taxes withheld and net salary pending month-end disbursement', isSystem: true },
  { code: '2050', name: 'Deferred Donor Grant Revenue', category: 'liability', subcategory: 'current_liability', balance: 0.00, description: 'Restricted grant tranches received in advance of milestones', isSystem: true },
  { code: '3010', name: 'Shareholder & Founder Capital', category: 'equity', subcategory: 'equity', balance: 0.00, description: 'Initial paid-in equity capital', isSystem: true },
  { code: '3020', name: 'Retained Earnings & Accumulated Surplus', category: 'equity', subcategory: 'equity', balance: 0.00, description: 'Cumulative net operating profits carried forward', isSystem: true },
  { code: '4010', name: 'Retail POS & Product Sales', category: 'revenue', subcategory: 'operating_revenue', balance: 0.00, description: 'Gross revenues from point-of-sale merchandise transactions', isSystem: true },
  { code: '4020', name: 'Hospitality Room & Folio Revenue', category: 'revenue', subcategory: 'operating_revenue', balance: 0.00, description: 'Direct bookings and OTA room accommodations revenue', isSystem: true },
  { code: '4030', name: 'Enterprise Wholesale Contracts', category: 'revenue', subcategory: 'operating_revenue', balance: 0.00, description: 'B2B institutional training kits and bulk delivery contracts', isSystem: true },
  { code: '5010', name: 'Cost of Goods Sold (COGS)', category: 'expense', subcategory: 'cogs', balance: 0.00, description: 'Direct acquisition cost of inventory items sold', isSystem: true },
  { code: '6010', name: 'Staff Salaries & Wages Expense', category: 'expense', subcategory: 'operating_expense', balance: 0.00, description: 'Gross compensation across executive, operations, and floor staff', isSystem: true },
  { code: '6020', name: 'Facility Rent & Utilities Expense', category: 'expense', subcategory: 'operating_expense', balance: 0.00, description: 'Warehouse and retail showroom monthly occupancy leases', isSystem: true },
  { code: '6030', name: 'Depreciation & Amortization Expense', category: 'expense', subcategory: 'operating_expense', balance: 0.00, description: 'Periodic non-cash straight-line asset amortization expense', isSystem: true },
  { code: '6040', name: 'Marketing & Digital Acquisition', category: 'expense', subcategory: 'operating_expense', balance: 0.00, description: 'Campaign spend, OTA commissions, and client onboarding promotions', isSystem: true }
];

export const DEFAULT_CASH_FLOWS: CashFlowRecord[] = [];
export const DEFAULT_FIXED_ASSETS: FixedAssetRecord[] = [];
export const DEFAULT_LEAVE_REQUESTS: LeaveRequestRecord[] = [];
export const DEFAULT_PERFORMANCE_REVIEWS: PerformanceReviewRecord[] = [];
export const DEFAULT_PAYROLL_RUNS: PayrollRunRecord[] = [];

export const DEFAULT_PROJECT_BUDGETS: ProjectBudget[] = [
  {
    id: 'prj_budget_water',
    projectCode: 'PRJ-2026-WATER',
    projectTitle: 'Clean Water Well & Solar Pump Installation',
    sponsorName: 'Tumi Project Web Donation Campaign',
    totalBudgetAmount: 25000,
    allocatedAmount: 18000,
    raisedAmount: 14250,
    spentAmount: 9500,
    currency: 'USD',
    startDate: '2026-01-15',
    endDate: '2026-11-30',
    status: 'active',
    leadManager: 'Kwame Mensah',
    description: 'Community solar borehole and water distribution network for rural school district.',
    linkedFormId: 'form_water_2026',
    linkedFormTitle: 'Clean Water Infrastructure Donation Drive',
    targetBeneficiaries: 1200
  },
  {
    id: 'prj_budget_skills',
    projectCode: 'PRJ-2026-SKILLS',
    projectTitle: 'Youth Digital Innovation & Coding Bootcamp',
    sponsorName: 'Tumi Tech Education Fund',
    totalBudgetAmount: 40000,
    allocatedAmount: 30000,
    raisedAmount: 28500,
    spentAmount: 16000,
    currency: 'USD',
    startDate: '2026-02-01',
    endDate: '2026-12-31',
    status: 'active',
    leadManager: 'Ama Osei',
    description: 'Providing laptops, high-speed connectivity, and full-stack software engineering bootcamps.',
    linkedFormId: 'form_skills_2026',
    linkedFormTitle: 'Youth Coding & Digital Empowerment Fund',
    targetBeneficiaries: 350
  }
];

export const DEFAULT_STOCK_DEPARTMENTS: StockDepartment[] = [
  { id: 'dept_fb', name: 'Food & Beverage', code: 'DEPT-FB', description: 'Restaurant, Cafe, and Room Service inventory', managerName: 'Bar & Kitchen Manager' },
  { id: 'dept_hosp', name: 'Hospitality Linen & Amenities', code: 'DEPT-HOSP', description: 'Bed sheets, towels, minibar stock, toiletries', managerName: 'Head Housekeeper' },
  { id: 'dept_bar', name: 'Bar & Spirits Cellar', code: 'DEPT-BAR', description: 'Liquors, wines, craft beers, and bar supplies', managerName: 'Lead Bartender' },
  { id: 'dept_retail', name: 'Retail POS & Merchandise', code: 'DEPT-POS', description: 'Front desk souvenir shop and retail products', managerName: 'Store Manager' },
  { id: 'dept_maint', name: 'Maintenance & Tools', code: 'DEPT-MAINT', description: 'Electrical, plumbing, paint, and facility spare parts', managerName: 'Chief Engineer' }
];

export const DEFAULT_STOCK_LOCATIONS: StockLocation[] = [
  { id: 'loc_wh_main', departmentId: 'dept_retail', departmentName: 'Retail POS & Merchandise', name: 'Main Central Warehouse', code: 'LOC-WH1', buildingOrAisle: 'Building A - Bay 1' },
  { id: 'loc_pantry_fd', departmentId: 'dept_hosp', departmentName: 'Hospitality Linen & Amenities', name: 'Front Desk & Guest Pantry', code: 'LOC-FD-PANTRY', buildingOrAisle: 'Ground Floor - Room 102' },
  { id: 'loc_linen_closet', departmentId: 'dept_hosp', departmentName: 'Hospitality Linen & Amenities', name: 'Hostel Main Linen Closet', code: 'LOC-LINEN-1', buildingOrAisle: '1st Floor - Closet B' },
  { id: 'loc_bar_cellar', departmentId: 'dept_bar', departmentName: 'Bar & Spirits Cellar', name: 'Main Bar Spirits Cellar', code: 'LOC-CELLAR-A', buildingOrAisle: 'Basement Vault A' },
  { id: 'loc_kitchen_cold', departmentId: 'dept_fb', departmentName: 'Food & Beverage', name: 'Kitchen Coldroom & Dry Storage', code: 'LOC-KIT-COLD', buildingOrAisle: 'Kitchen - Aisle 2' }
];

export const DEFAULT_DONATION_FORMS: WebDonationFormConfig[] = [
  {
    id: 'form_water_2026',
    title: 'Clean Water Infrastructure Donation Drive',
    subtitle: 'Help provide clean solar-powered drinking water wells to 1,200 school children and families.',
    campaignTarget: 'Clean Water Project 2026',
    campaignGoalAmount: 25000,
    currency: 'USD',
    suggestedAmounts: [25, 50, 100, 250, 500],
    allowCustomAmount: true,
    allowRecurring: true,
    defaultRecurringInterval: 'monthly',
    collectPhone: true,
    collectAddress: true,
    collectMessage: true,
    enableGiftAid: true,
    buttonText: 'Donate to Water Project',
    primaryColor: '#0284c7',
    theme: 'emerald',
    linkedProjectId: 'prj_budget_water',
    linkedProjectTitle: 'Clean Water Well & Solar Pump Installation',
    createdDate: new Date().toISOString(),
    totalRaised: 14250,
    donorCount: 48
  },
  {
    id: 'form_skills_2026',
    title: 'Youth Coding & Digital Empowerment Fund',
    subtitle: 'Sponsor laptops, cloud developer tools, and tech mentorship for underprivileged youth.',
    campaignTarget: 'Youth Coding Bootcamp 2026',
    campaignGoalAmount: 40000,
    currency: 'USD',
    suggestedAmounts: [50, 100, 200, 500, 1000],
    allowCustomAmount: true,
    allowRecurring: true,
    defaultRecurringInterval: 'monthly',
    collectPhone: true,
    collectAddress: false,
    collectMessage: true,
    enableGiftAid: false,
    buttonText: 'Sponsor a Student',
    primaryColor: '#4f46e5',
    theme: 'indigo',
    linkedProjectId: 'prj_budget_skills',
    linkedProjectTitle: 'Youth Digital Innovation & Coding Bootcamp',
    createdDate: new Date().toISOString(),
    totalRaised: 28500,
    donorCount: 92
  }
];

export const DEFAULT_DONATION_TRANSACTIONS: WebDonationTransaction[] = [];

export const DEFAULT_TAX_CONFIG: CompanyTaxConfig = {
  taxMode: 'gra_standard',
  graStandardRate: 15.0,
  nhilRate: 2.5,
  getFundRate: 2.5,
  covidLevyRate: 1.0,
  customTaxRate: 15.0,
  tinNumber: 'C002891482X',
  eInvoiceEnabled: true
};

export const DEFAULT_RECEIPT_CONFIG: ReceiptTemplateConfig = {
  logoUrl: '',
  headerTitle: 'TUMI ENTERPRISE GLOBAL LTD',
  subHeader: 'Official Retail & Hospitality Receipt',
  footerNotes: 'Thank you for your business! Goods inspected and delivered in good condition.',
  returnPolicyText: 'Returns strictly accepted within 30 days accompanied by original receipt.',
  showTaxBreakdown: true,
  showTinNumber: true,
  showQRCode: true,
  primaryColor: '#4f46e5'
};

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'revenue_kpi', title: 'Revenue & Gross Margin', category: 'finance', enabled: true, order: 1 },
  { id: 'low_stock', title: 'Low Stock Alerts & Reorder List', category: 'inventory', enabled: true, order: 2 },
  { id: 'quick_actions', title: 'Quick Action Shortcuts', category: 'quick_actions', enabled: true, order: 3 },
  { id: 'petty_cash', title: 'Petty Cash & Expense Summary', category: 'finance', enabled: true, order: 4 },
  { id: 'gra_tax_summary', title: 'GRA E-VAT Tax Summary', category: 'finance', enabled: true, order: 5 },
  { id: 'recent_pos', title: 'Recent POS Sales Transactions', category: 'operations', enabled: true, order: 6 },
  { id: 'audit_preview', title: 'Security Audit Activity Stream', category: 'operations', enabled: true, order: 7 }
];

const DEFAULT_PRODUCTS: Product[] = [];
const DEFAULT_INVENTORY: InventoryLevel[] = [];
const DEFAULT_CUSTOMERS: CustomerProfile[] = [];
const DEFAULT_OPPORTUNITIES: Opportunity[] = [];
const DEFAULT_ORDERS: POSOrder[] = [];
const DEFAULT_VENDORS: Vendor[] = [];

const DEFAULT_WAREHOUSES: WarehouseLocation[] = [
  { id: 'wh_main', name: 'Main Warehouse', city: 'Headquarters', address: 'Facility 1' }
];

const DEFAULT_DOUBLE_ENTRY: JournalEntry[] = [];

// Load or Seed local data store helper with automatic cleanup of old mock seeds
function loadLocalStore<T>(key: string, defaultVal: T[]): T[] {
  const existing = localStorage.getItem(key);
  if (!existing) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    const parsed = JSON.parse(existing);
    // Purge outdated mock test seeds if detected in localStorage
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (key === STORAGE_KEYS.USERS && parsed.some((u: any) => u.uid === 'user_ceo_01')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.HOSPITALITY_ROOMS && parsed.some((r: any) => r.id === 'room_101')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.CHART_OF_ACCOUNTS && parsed.some((a: any) => a.code === '1010' && a.balance !== 0.0)) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.TASKS && parsed.some((t: any) => t.id === 'task_1')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.DONOR_GRANTS && parsed.some((g: any) => g.grantCode === 'GRANT-EDU-2026')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.TRAINEE_ATTENDANCE && parsed.some((a: any) => a.id === 'att_1')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.GRADUATE_PLACEMENTS && parsed.some((p: any) => p.id === 'placement_1')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.DIGITAL_CERTIFICATES && parsed.some((c: any) => c.id === 'cert_1')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.DONOR_PROFILES && parsed.some((d: any) => d.id === 'DONOR-5501')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.CAPTURED_DONOR_DATABASE && parsed.some((c: any) => c.id === 'CAP-DON-2026-001')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.LEAVE_REQUESTS && parsed.some((l: any) => l.id === 'leave_1')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.PERFORMANCE_REVIEWS && parsed.some((p: any) => p.id === 'perf_1')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.PAYROLL_RUNS && parsed.some((p: any) => p.id === 'pay_1')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.WEB_DONATION_TRANSACTIONS && parsed.some((t: any) => t.id === 'tx_don_101')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
  
      if (key === STORAGE_KEYS.PRODUCTS && parsed.some((p: any) => p.id === 'prod_lp_01')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.INVENTORY && parsed.some((i: any) => i.productId === 'prod_lp_01')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.ORDERS && parsed.some((o: any) => o.id === 'ord_auto_928374')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.CUSTOMERS && parsed.some((c: any) => c.id === 'cust_01')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.OPPORTUNITIES && parsed.some((o: any) => o.id === 'opp_01')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.DOUBLE_ENTRY && parsed.some((j: any) => j.id === 'je_01')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.VENDORS && parsed.some((v: any) => v.id === 'vend_01')) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.USERS) {
        if (!parsed.some((u: any) => u.role === 'ceo')) {
          const ceo = DEFAULT_USERS[0];
          parsed.unshift(ceo);
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
      if (key === STORAGE_KEYS.MODULES_CONFIG) {
        let changed = false;
        parsed.forEach((m: any) => {
          if (m.id === 'crm' && m.name === 'CRM Sales Kanban') {
            m.name = 'Sales Deals';
            changed = true;
          }
          if (m.id === 'hr' && m.name === 'HR & Staff Directory') {
            m.name = 'HR and Roles';
            changed = true;
          }
          if (m.id === 'builder' && m.name === 'Modular System Builder') {
            m.name = 'Create Dashboard';
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
    }
    return parsed;
  } catch {
    return defaultVal;
  }
}

function saveLocalStore<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
  triggerCallbacks(key);
}

// Simple subscriber callbacks for realtime sync
type CallbackFn = () => void;
const subscribers: Record<string, Set<CallbackFn>> = {};

function subscribeToKey(key: string, cb: CallbackFn) {
  if (!subscribers[key]) {
    subscribers[key] = new Set();
  }
  subscribers[key].add(cb);
  return () => {
    subscribers[key].delete(cb);
  };
}

function triggerCallbacks(key: string) {
  if (subscribers[key]) {
    subscribers[key].forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error("Error executing subscriber callback for key:", key, err);
      }
    });
  }
}

// ============================================================================
// CORE DATA SERVICES
// ============================================================================

export const dataStore = {
  // Load and refresh state arrays
  getUsers: () => loadLocalStore<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS),
  saveUsers: (users: UserProfile[]) => {
    saveLocalStore(STORAGE_KEYS.USERS, users);
  },
  addUser: (user: UserProfile) => {
    const current = loadLocalStore<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const updated = [user, ...current.filter(u => u.uid !== user.uid)];
    saveLocalStore(STORAGE_KEYS.USERS, updated);
    return user;
  },
  updateUser: (uid: string, updates: Partial<UserProfile>) => {
    const current = loadLocalStore<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const updated = current.map(u => u.uid === uid ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u);
    saveLocalStore(STORAGE_KEYS.USERS, updated);
  },
  deleteUser: (uid: string) => {
    const current = loadLocalStore<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const updated = current.filter(u => u.uid !== uid);
    saveLocalStore(STORAGE_KEYS.USERS, updated);
  },
  getProducts: () => loadLocalStore<Product>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS),
  getInventory: () => loadLocalStore<InventoryLevel>(STORAGE_KEYS.INVENTORY, DEFAULT_INVENTORY),
  getCustomers: () => loadLocalStore<CustomerProfile>(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS),
  getOpportunities: () => loadLocalStore<Opportunity>(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES),
  getOrders: () => loadLocalStore<POSOrder>(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS),
  getOfflineQueue: () => loadLocalStore<POSOrder>(STORAGE_KEYS.OFFLINE_QUEUE, []),
  getPurchaseOrders: () => loadLocalStore<PurchaseOrder>(STORAGE_KEYS.PURCHASE_ORDERS, []),
  getCustomerLogs: () => loadLocalStore<CustomerLog>(STORAGE_KEYS.CUSTOMER_LOGS, []),
  getVendors: () => loadLocalStore<Vendor>(STORAGE_KEYS.VENDORS, DEFAULT_VENDORS),
  getWarehouses: () => loadLocalStore<WarehouseLocation>(STORAGE_KEYS.WAREHOUSES, DEFAULT_WAREHOUSES),
  getTimeCards: () => loadLocalStore<TimeCardLog>(STORAGE_KEYS.TIME_CARDS, []),
  getDoubleEntry: () => loadLocalStore<JournalEntry>(STORAGE_KEYS.DOUBLE_ENTRY, DEFAULT_DOUBLE_ENTRY),
  getAuditTrail: () => loadLocalStore<AuditLogEntry>(STORAGE_KEYS.AUDIT_TRAIL, []),
  getPettyCashAllocations: () => loadLocalStore<PettyCashAllocation>(STORAGE_KEYS.PETTY_CASH_ALLOC, []),
  getPettyCashExpenses: () => loadLocalStore<PettyCashExpense>(STORAGE_KEYS.PETTY_CASH_EXP, []),

  // Stock Departments & Locations Setup
  getStockDepartments: () => loadLocalStore<StockDepartment>(STORAGE_KEYS.STOCK_DEPARTMENTS, DEFAULT_STOCK_DEPARTMENTS),
  saveStockDepartments: (depts: StockDepartment[]) => {
    saveLocalStore(STORAGE_KEYS.STOCK_DEPARTMENTS, depts);
  },
  addStockDepartment: (dept: StockDepartment) => {
    const current = loadLocalStore<StockDepartment>(STORAGE_KEYS.STOCK_DEPARTMENTS, DEFAULT_STOCK_DEPARTMENTS);
    const updated = [dept, ...current.filter(d => d.id !== dept.id)];
    saveLocalStore(STORAGE_KEYS.STOCK_DEPARTMENTS, updated);
    return dept;
  },
  getStockLocations: () => loadLocalStore<StockLocation>(STORAGE_KEYS.STOCK_LOCATIONS, DEFAULT_STOCK_LOCATIONS),
  saveStockLocations: (locs: StockLocation[]) => {
    saveLocalStore(STORAGE_KEYS.STOCK_LOCATIONS, locs);
  },
  addStockLocation: (loc: StockLocation) => {
    const current = loadLocalStore<StockLocation>(STORAGE_KEYS.STOCK_LOCATIONS, DEFAULT_STOCK_LOCATIONS);
    const updated = [loc, ...current.filter(l => l.id !== loc.id)];
    saveLocalStore(STORAGE_KEYS.STOCK_LOCATIONS, updated);
    return loc;
  },

  // Modular System Customizer
  getModulesConfig: () => loadLocalStore<ERPModuleConfig>(STORAGE_KEYS.MODULES_CONFIG, DEFAULT_MODULES),
  saveModulesConfig: (modules: ERPModuleConfig[]) => {
    saveLocalStore(STORAGE_KEYS.MODULES_CONFIG, modules);
  },
  getWorkflowRules: () => loadLocalStore<CustomWorkflowRule>(STORAGE_KEYS.WORKFLOW_RULES, DEFAULT_WORKFLOW_RULES),
  saveWorkflowRules: (rules: CustomWorkflowRule[]) => {
    saveLocalStore(STORAGE_KEYS.WORKFLOW_RULES, rules);
  },

  // Enterprise Customizations (Tax, Receipts, Dashboard Widgets)
  getTaxConfig: () => {
    const raw = localStorage.getItem(STORAGE_KEYS.TAX_CONFIG);
    return raw ? JSON.parse(raw) as CompanyTaxConfig : DEFAULT_TAX_CONFIG;
  },
  saveTaxConfig: (config: CompanyTaxConfig) => {
    localStorage.setItem(STORAGE_KEYS.TAX_CONFIG, JSON.stringify(config));
    window.dispatchEvent(new Event('tumi_tax_config_updated'));
  },
  getReceiptConfig: () => {
    const raw = localStorage.getItem(STORAGE_KEYS.RECEIPT_CONFIG);
    return raw ? JSON.parse(raw) as ReceiptTemplateConfig : DEFAULT_RECEIPT_CONFIG;
  },
  saveReceiptConfig: (config: ReceiptTemplateConfig) => {
    localStorage.setItem(STORAGE_KEYS.RECEIPT_CONFIG, JSON.stringify(config));
    window.dispatchEvent(new Event('tumi_receipt_config_updated'));
  },
  getDashboardWidgets: () => loadLocalStore<DashboardWidgetConfig>(STORAGE_KEYS.DASHBOARD_WIDGETS, DEFAULT_DASHBOARD_WIDGETS),
  saveDashboardWidgets: (widgets: DashboardWidgetConfig[]) => {
    saveLocalStore(STORAGE_KEYS.DASHBOARD_WIDGETS, widgets);
    window.dispatchEvent(new Event('tumi_dashboard_widgets_updated'));
  },

  // Hospitality & Channel Manager
  getRooms: () => loadLocalStore<Room>(STORAGE_KEYS.HOSPITALITY_ROOMS, DEFAULT_ROOMS),
  saveRooms: (rooms: Room[]) => {
    saveLocalStore(STORAGE_KEYS.HOSPITALITY_ROOMS, rooms);
  },
  addRoom: (room: Room) => {
    const current = loadLocalStore<Room>(STORAGE_KEYS.HOSPITALITY_ROOMS, DEFAULT_ROOMS);
    const updated = [room, ...current.filter(r => r.id !== room.id)];
    saveLocalStore(STORAGE_KEYS.HOSPITALITY_ROOMS, updated);
    return room;
  },
  updateRoomStatus: (roomId: string, status: Room['status']) => {
    const current = loadLocalStore<Room>(STORAGE_KEYS.HOSPITALITY_ROOMS, DEFAULT_ROOMS);
    const updated = current.map(r => r.id === roomId ? { ...r, status } : r);
    saveLocalStore(STORAGE_KEYS.HOSPITALITY_ROOMS, updated);
  },
  updateRoom: (room: Room) => {
    const current = loadLocalStore<Room>(STORAGE_KEYS.HOSPITALITY_ROOMS, DEFAULT_ROOMS);
    const updated = current.map(r => r.id === room.id ? room : r);
    saveLocalStore(STORAGE_KEYS.HOSPITALITY_ROOMS, updated);
    return room;
  },
  updateRoomTagsAndCategory: (roomId: string, amenities: string[], tags?: string[], category?: string) => {
    const current = loadLocalStore<Room>(STORAGE_KEYS.HOSPITALITY_ROOMS, DEFAULT_ROOMS);
    const updated = current.map(r => r.id === roomId ? {
      ...r,
      amenities: [...amenities],
      tags: tags !== undefined ? [...tags] : r.tags,
      type: (category !== undefined ? category : r.type) as any
    } : r);
    saveLocalStore(STORAGE_KEYS.HOSPITALITY_ROOMS, updated);
    return updated.find(r => r.id === roomId);
  },
  renameTagGlobally: (oldTag: string, newTag: string) => {
    const current = loadLocalStore<Room>(STORAGE_KEYS.HOSPITALITY_ROOMS, DEFAULT_ROOMS);
    const cleanOld = oldTag.trim().toLowerCase();
    const cleanNew = newTag.trim();
    const updated = current.map(r => ({
      ...r,
      amenities: r.amenities.map(a => a.trim().toLowerCase() === cleanOld ? cleanNew : a),
      tags: r.tags ? r.tags.map(t => t.trim().toLowerCase() === cleanOld ? cleanNew : t) : undefined
    }));
    saveLocalStore(STORAGE_KEYS.HOSPITALITY_ROOMS, updated);
    return updated;
  },
  renameCategoryGlobally: (oldCategory: string, newCategory: string) => {
    const current = loadLocalStore<Room>(STORAGE_KEYS.HOSPITALITY_ROOMS, DEFAULT_ROOMS);
    const cleanOld = oldCategory.trim().toLowerCase();
    const cleanNew = newCategory.trim();
    const updated = current.map(r => ({
      ...r,
      type: r.type.toString().trim().toLowerCase() === cleanOld ? cleanNew : r.type
    }));
    saveLocalStore(STORAGE_KEYS.HOSPITALITY_ROOMS, updated);
    return updated;
  },

  getBookings: () => loadLocalStore<Booking>(STORAGE_KEYS.HOSPITALITY_BOOKINGS, DEFAULT_BOOKINGS),
  saveBookings: (bookings: Booking[]) => {
    saveLocalStore(STORAGE_KEYS.HOSPITALITY_BOOKINGS, bookings);
  },
  addBooking: (booking: Booking) => {
    const current = loadLocalStore<Booking>(STORAGE_KEYS.HOSPITALITY_BOOKINGS, DEFAULT_BOOKINGS);
    const updated = [booking, ...current];
    saveLocalStore(STORAGE_KEYS.HOSPITALITY_BOOKINGS, updated);
    
    // Auto-update room status if check-in or confirmed
    if (booking.status === 'checked_in' && booking.roomId) {
      const rooms = loadLocalStore<Room>(STORAGE_KEYS.HOSPITALITY_ROOMS, DEFAULT_ROOMS);
      const updatedRooms = rooms.map(r => r.id === booking.roomId ? { ...r, status: 'Occupied' as const } : r);
      saveLocalStore(STORAGE_KEYS.HOSPITALITY_ROOMS, updatedRooms);
    }
    return booking;
  },

  // Assign booking to room (e.g. via drag-and-drop or modal)
  assignBookingToRoom: (bookingId: string, roomId: string, currentUser?: UserProfile): Booking => {
    const bookings = loadLocalStore<Booking>(STORAGE_KEYS.HOSPITALITY_BOOKINGS, DEFAULT_BOOKINGS);
    const rooms = loadLocalStore<Room>(STORAGE_KEYS.HOSPITALITY_ROOMS, DEFAULT_ROOMS);
    const bIndex = bookings.findIndex(b => b.id === bookingId);
    const targetRoom = rooms.find(r => r.id === roomId);

    if (bIndex < 0) throw new Error(`Booking ${bookingId} not found.`);
    if (!targetRoom) throw new Error(`Room ${roomId} not found.`);

    const targetBooking = bookings[bIndex];
    const updatedBooking: Booking = {
      ...targetBooking,
      roomId: targetRoom.id,
      roomNumber: targetRoom.number,
      unassigned: false
    };

    bookings[bIndex] = updatedBooking;
    saveLocalStore(STORAGE_KEYS.HOSPITALITY_BOOKINGS, bookings);

    if (updatedBooking.status === 'checked_in') {
      dataStore.updateRoomStatus(targetRoom.id, 'Occupied');
    }

    if (currentUser) {
      dataStore.logAudit(
        currentUser.uid,
        currentUser.name,
        currentUser.role,
        'UPDATE',
        `booking_${updatedBooking.id}`,
        `Auto-assigned booking for ${updatedBooking.guestName} to Room #${targetRoom.number} (${targetRoom.type}) via drag-and-drop`
      );
    }

    return updatedBooking;
  },

  // Bill shop/POS or incidental purchases directly to room folio
  addRoomCharge: (bookingId: string, charge: Omit<RoomCharge, 'id' | 'timestamp' | 'status'>, billedBy: string): RoomCharge => {
    const bookings = loadLocalStore<Booking>(STORAGE_KEYS.HOSPITALITY_BOOKINGS, DEFAULT_BOOKINGS);
    const bIndex = bookings.findIndex(b => b.id === bookingId);
    if (bIndex < 0) throw new Error(`Active booking ${bookingId} not found.`);

    const targetBooking = bookings[bIndex];
    const newCharge: RoomCharge = {
      ...charge,
      id: 'chg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      status: 'billed_to_room'
    };

    const existingCharges = targetBooking.roomCharges || [];
    const updatedCharges = [...existingCharges, newCharge];
    const updatedTotalPrice = Number((targetBooking.totalPrice + charge.amount).toFixed(2));

    bookings[bIndex] = {
      ...targetBooking,
      roomCharges: updatedCharges,
      totalPrice: updatedTotalPrice
    };

    saveLocalStore(STORAGE_KEYS.HOSPITALITY_BOOKINGS, bookings);

    dataStore.logAudit(
      billedBy,
      billedBy,
      'cashier',
      'ALLOCATE',
      `room_charge_${newCharge.id}`,
      `Billed $${charge.amount.toFixed(2)} (${charge.description}) to Room #${targetBooking.roomNumber} - Guest: ${targetBooking.guestName}`
    );

    return newCharge;
  },

  // Automated Task Trigger on Checkout: creates cleaning and optional maintenance tickets
  triggerCheckoutAutomation: (
    booking: Booking,
    currentUser: UserProfile,
    checkoutNotes?: string,
    issueMaintenanceTicket?: boolean,
    maintenanceIssue?: string
  ) => {
    // 1. Mark room as Dirty (needs housekeeping)
    if (booking.roomId) {
      dataStore.updateRoomStatus(booking.roomId, 'Dirty');
    }

    // 2. Generate Automated Housekeeping Cleaning Ticket in TaskManagerModule
    const cleaningTask = dataStore.addTask({
      title: `[Automated Cleaning] Turnover & Deep Clean: Room #${booking.roomNumber}`,
      description: `Automated Housekeeping ticket triggered upon checkout of ${booking.guestName} (${booking.sourceChannel} - ${booking.id}). Turnover bed linens, sanitize bathroom, restock guest amenities, inspect minibar, and vacuum. Mark Clean when complete. Notes: ${checkoutNotes || 'Standard checkout turnover'}.`,
      assignedToUid: currentUser.uid,
      assignedToName: 'Housekeeping Lead / Assigned Attendant',
      assignedToRole: 'warehouse',
      createdByUid: currentUser.uid,
      createdByName: `${currentUser.name} (Automated Checkout Trigger)`,
      createdByRole: currentUser.role,
      isSupervisorTask: true,
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'High',
      category: 'Hospitality',
      status: 'To Do',
      supervisorNotes: `Auto-generated on guest checkout from Hospitality Channel Manager. Room #${booking.roomNumber} marked DIRTY.`
    });

    let maintenanceTask: TaskItem | null = null;
    if (issueMaintenanceTicket) {
      maintenanceTask = dataStore.addTask({
        title: `[Automated Maintenance] Repair Inspection: Room #${booking.roomNumber}`,
        description: maintenanceIssue || `Maintenance inspection required following checkout of Room #${booking.roomNumber}. Inspect plumbing, HVAC, electrical fixtures, and door lock hardware.`,
        assignedToUid: currentUser.uid,
        assignedToName: 'Facility Maintenance Lead',
        assignedToRole: 'warehouse',
        createdByUid: currentUser.uid,
        createdByName: `${currentUser.name} (Automated Checkout Trigger)`,
        createdByRole: currentUser.role,
        isSupervisorTask: true,
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'Urgent',
        category: 'Hospitality',
        status: 'To Do',
        supervisorNotes: `Reported during checkout inspection for Room #${booking.roomNumber}.`
      });
    }

    dataStore.logAudit(
      currentUser.uid,
      currentUser.name,
      currentUser.role,
      'CREATE',
      `task_${cleaningTask.id}`,
      `Automated Housekeeping cleaning ticket generated upon checkout of ${booking.guestName} (Room #${booking.roomNumber})`
    );

    return { cleaningTask, maintenanceTask };
  },

  // CRM Profile Sync for Guest
  findOrCreateCustomerForGuest: (booking: Booking): CustomerProfile => {
    const customers = dataStore.getCustomers();
    const guestEmailClean = booking.guestEmail?.trim().toLowerCase();
    const guestNameClean = booking.guestName?.trim().toLowerCase();

    const existing = customers.find(c => 
      (guestEmailClean && c.email?.trim().toLowerCase() === guestEmailClean) ||
      (guestNameClean && c.name?.trim().toLowerCase() === guestNameClean)
    );

    if (existing) {
      const updated = customers.map(c => {
        if (c.id === existing.id) {
          const prevHabits = c.buyingHabits || [];
          const newHabit = `Stayed Room #${booking.roomNumber}`;
          const buyingHabits = prevHabits.includes(newHabit) ? prevHabits : [...prevHabits, newHabit];
          return {
            ...c,
            lifetime_value: Number(((c.lifetime_value || 0) + (booking.totalPrice || 0)).toFixed(2)),
            bookingHistoryCount: (c.bookingHistoryCount || 0) + 1,
            lastStayDate: booking.checkOutDate,
            tag: c.tag || 'guest',
            buyingHabits,
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      });
      dataStore.saveCustomers(updated);
      return updated.find(c => c.id === existing.id)!;
    } else {
      const newCustomer: CustomerProfile = {
        id: 'cust_crm_' + Date.now(),
        name: booking.guestName,
        email: booking.guestEmail || `guest_${Date.now()}@hotel.com`,
        phone: booking.guestPhone || '+1 (555) 019-2831',
        lifetime_value: Number((booking.totalPrice || 0).toFixed(2)),
        ai_churn_risk: 0.12,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: booking.sourceChannel,
        bookingHistoryCount: 1,
        lastStayDate: booking.checkOutDate,
        tag: 'guest',
        buyingHabits: [`Stayed Room #${booking.roomNumber}`, `${booking.sourceChannel} Channel`],
        demands: ['Prefers Standard Check-in', 'Housekeeping service'],
        notes: `Guest linked via Hospitality Room #${booking.roomNumber}. Channel: ${booking.sourceChannel}. Verified for CRM amenity recommendations and automated PDF folios.`
      };
      customers.unshift(newCustomer);
      dataStore.saveCustomers(customers);
      return newCustomer;
    }
  },

  // Automated Checkout Execution with Email Invoice Dispatch & CRM Sync
  completeBookingCheckoutAndInvoice: async (
    booking: Booking,
    currentUser: UserProfile,
    invoiceData: CheckoutInvoiceData,
    checkoutNotes?: string,
    issueMaintenanceTicket?: boolean,
    maintenanceIssue?: string
  ) => {
    // 1. Mark booking as checked_out and store invoice details
    const bookings = dataStore.getBookings();
    const updatedBookings = bookings.map(b => {
      if (b.id === booking.id) {
        return {
          ...b,
          status: 'checked_out' as const,
          checkoutNotes: checkoutNotes || b.checkoutNotes,
          invoiceSentAt: invoiceData.issuedAt,
          invoiceRecipientEmail: invoiceData.dispatchedToEmail,
          invoiceNumber: invoiceData.invoiceNumber,
          invoiceData
        };
      }
      return b;
    });
    dataStore.saveBookings(updatedBookings);

    // 2. Trigger automated housekeeping / maintenance tickets
    const automationResult = dataStore.triggerCheckoutAutomation(
      booking,
      currentUser,
      checkoutNotes,
      issueMaintenanceTicket,
      maintenanceIssue
    );

    // 3. Sync CRM customer profile and record email dispatch log
    const crmCustomer = dataStore.findOrCreateCustomerForGuest(booking);
    const customerLogs = dataStore.getCustomerLogs();
    customerLogs.unshift({
      id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      customerId: crmCustomer.id,
      type: 'email',
      createdAt: new Date().toISOString(),
      authorName: `${currentUser.name} (Automated Dispatch Engine)`,
      notes: `Official Folio Tax Invoice #${invoiceData.invoiceNumber} ($${invoiceData.grandTotal.toFixed(2)}) auto-generated as PDF and emailed to CRM address ${invoiceData.dispatchedToEmail}. Room #${booking.roomNumber} checkout settled with $0.00 balance due.`
    });
    dataStore.saveCustomerLogs(customerLogs);

    // 4. Audit Trail
    dataStore.logAudit(
      currentUser.uid,
      currentUser.name,
      currentUser.role,
      'UPDATE',
      `booking_${booking.id}`,
      `Checkout completed and automated PDF Invoice #${invoiceData.invoiceNumber} ($${invoiceData.grandTotal.toFixed(2)}) emailed to ${invoiceData.dispatchedToEmail} for ${booking.guestName} (Room #${booking.roomNumber}).`
    );

    // 5. Backend notification dispatch
    try {
      await fetch('/api/hospitality/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          invoiceNumber: invoiceData.invoiceNumber,
          guestName: booking.guestName,
          recipientEmail: invoiceData.dispatchedToEmail,
          grandTotal: invoiceData.grandTotal,
          roomNumber: booking.roomNumber,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate
        })
      });
    } catch (err) {
      console.warn("Backend invoice email trigger exception:", err);
    }

    return {
      updatedBooking: updatedBookings.find(b => b.id === booking.id)!,
      crmCustomer,
      automationResult
    };
  },

  // Calendar Sync auto-blocking reservation
  syncExternalCalendarReservation: (eventData: {
    provider: 'Google Calendar' | 'Outlook Calendar';
    eventId: string;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    checkInDate: string;
    checkOutDate: string;
    roomNumber?: string;
    roomId?: string;
    totalPrice?: number;
    specialRequests?: string;
  }): Booking => {
    const rooms = dataStore.getRooms();
    const matchedRoom = eventData.roomId 
      ? rooms.find(r => r.id === eventData.roomId)
      : (eventData.roomNumber ? rooms.find(r => r.number === eventData.roomNumber) : rooms[0]);

    const newBooking: Booking = {
      id: `cal_sync_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      roomId: matchedRoom ? matchedRoom.id : '',
      roomNumber: matchedRoom ? matchedRoom.number : 'Unassigned',
      guestName: eventData.guestName || `${eventData.provider} Reservation`,
      guestEmail: eventData.guestEmail || `sync@${eventData.provider.toLowerCase().replace(/\s+/g, '')}.com`,
      guestPhone: eventData.guestPhone || '+1 (555) 900-1122',
      checkInDate: eventData.checkInDate,
      checkOutDate: eventData.checkOutDate,
      guestsCount: 2,
      totalPrice: eventData.totalPrice || 360,
      sourceChannel: eventData.provider,
      status: 'confirmed',
      paymentStatus: 'paid',
      specialRequests: eventData.specialRequests || `Auto-synced from ${eventData.provider}. Room availability blocked.`,
      unassigned: !matchedRoom,
      externalCalendarSync: {
        provider: eventData.provider,
        externalEventId: eventData.eventId,
        syncedAt: new Date().toISOString(),
        autoBlocked: true
      },
      createdAt: new Date().toISOString()
    };

    dataStore.addBooking(newBooking);

    // If assigned, block room availability
    if (matchedRoom) {
      dataStore.updateRoomStatus(matchedRoom.id, 'Reserved');
    }

    // Add channel sync log
    dataStore.addChannelSyncLog({
      channelName: eventData.provider,
      event: 'Auto-Block Room Availability',
      status: 'success',
      timestamp: new Date().toISOString(),
      details: `Auto-blocked ${matchedRoom ? `Room #${matchedRoom.number}` : 'unassigned slot'} for ${eventData.guestName} (${eventData.checkInDate} to ${eventData.checkOutDate})`
    });

    return newBooking;
  },

  getChannelConnections: () => loadLocalStore<ChannelConnection>(STORAGE_KEYS.CHANNEL_CONNECTIONS, DEFAULT_CHANNELS),
  saveChannelConnections: (channels: ChannelConnection[]) => {
    saveLocalStore(STORAGE_KEYS.CHANNEL_CONNECTIONS, channels);
  },
  updateChannelSync: (channelId: string, lastSyncedAt: string) => {
    const current = loadLocalStore<ChannelConnection>(STORAGE_KEYS.CHANNEL_CONNECTIONS, DEFAULT_CHANNELS);
    const updated = current.map(c => c.id === channelId ? { ...c, lastSyncedAt, status: 'connected' as const } : c);
    saveLocalStore(STORAGE_KEYS.CHANNEL_CONNECTIONS, updated);
  },

  getChannelSyncLogs: () => loadLocalStore<ChannelSyncLog>(STORAGE_KEYS.CHANNEL_SYNC_LOGS, DEFAULT_CHANNEL_LOGS),
  addChannelSyncLog: (log: Omit<ChannelSyncLog, 'id'>) => {
    const logs = loadLocalStore<ChannelSyncLog>(STORAGE_KEYS.CHANNEL_SYNC_LOGS, DEFAULT_CHANNEL_LOGS);
    const newLog: ChannelSyncLog = {
      ...log,
      id: 'synclog_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    };
    logs.unshift(newLog);
    saveLocalStore(STORAGE_KEYS.CHANNEL_SYNC_LOGS, logs);
    return newLog;
  },

  // External API Key Access Requests
  getApiKeyRequests: () => loadLocalStore<APIKeyRequest>(STORAGE_KEYS.API_KEY_REQUESTS, DEFAULT_API_KEY_REQUESTS),
  saveApiKeyRequests: (requests: APIKeyRequest[]) => {
    saveLocalStore(STORAGE_KEYS.API_KEY_REQUESTS, requests);
  },
  addApiKeyRequest: (req: Omit<APIKeyRequest, 'id' | 'requestedAt' | 'status'>) => {
    const current = loadLocalStore<APIKeyRequest>(STORAGE_KEYS.API_KEY_REQUESTS, DEFAULT_API_KEY_REQUESTS);
    const newReq: APIKeyRequest = {
      ...req,
      id: 'req_' + Date.now(),
      status: 'pending',
      requestedAt: new Date().toISOString()
    };
    const updated = [newReq, ...current];
    saveLocalStore(STORAGE_KEYS.API_KEY_REQUESTS, updated);
    return newReq;
  },

  // External Systems & 3rd Party Connectors Credentials
  getExternalConnectors: () => loadLocalStore<ExternalConnectorConfig>(STORAGE_KEYS.EXTERNAL_CONNECTORS, DEFAULT_EXTERNAL_CONNECTORS),
  saveExternalConnectors: (connectors: ExternalConnectorConfig[]) => {
    saveLocalStore(STORAGE_KEYS.EXTERNAL_CONNECTORS, connectors);
  },
  upsertExternalConnector: (connector: ExternalConnectorConfig) => {
    const list = loadLocalStore<ExternalConnectorConfig>(STORAGE_KEYS.EXTERNAL_CONNECTORS, DEFAULT_EXTERNAL_CONNECTORS);
    const existingIndex = list.findIndex(c => c.id === connector.id);
    let updated: ExternalConnectorConfig[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = connector;
    } else {
      updated = [connector, ...list];
    }
    saveLocalStore(STORAGE_KEYS.EXTERNAL_CONNECTORS, updated);
    return updated;
  },
  deleteExternalConnector: (id: string) => {
    const list = loadLocalStore<ExternalConnectorConfig>(STORAGE_KEYS.EXTERNAL_CONNECTORS, DEFAULT_EXTERNAL_CONNECTORS);
    const updated = list.filter(c => c.id !== id);
    saveLocalStore(STORAGE_KEYS.EXTERNAL_CONNECTORS, updated);
    return updated;
  },

  // In-House Team Chat & Messaging
  getInternalMessages: () => loadLocalStore<InternalMessage>(STORAGE_KEYS.INTERNAL_MESSAGES, DEFAULT_INTERNAL_MESSAGES),
  saveInternalMessages: (messages: InternalMessage[]) => {
    saveLocalStore(STORAGE_KEYS.INTERNAL_MESSAGES, messages);
  },
  addInternalMessage: (msg: Omit<InternalMessage, 'id' | 'timestamp'>) => {
    const current = loadLocalStore<InternalMessage>(STORAGE_KEYS.INTERNAL_MESSAGES, DEFAULT_INTERNAL_MESSAGES);
    const newMsg: InternalMessage = {
      ...msg,
      id: 'msg_' + Date.now(),
      timestamp: new Date().toISOString()
    };
    const updated = [...current, newMsg];
    saveLocalStore(STORAGE_KEYS.INTERNAL_MESSAGES, updated);
    return newMsg;
  },

  // Task & Todo Manager (Supervisor & User Collaboration)
  getTasks: () => loadLocalStore<TaskItem>(STORAGE_KEYS.TASKS, DEFAULT_TASKS),
  saveTasks: (tasks: TaskItem[]) => {
    saveLocalStore(STORAGE_KEYS.TASKS, tasks);
  },
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const current = loadLocalStore<TaskItem>(STORAGE_KEYS.TASKS, DEFAULT_TASKS);
    const now = new Date().toISOString();
    const newTask: TaskItem = {
      ...task,
      id: 'task_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      createdAt: now,
      updatedAt: now
    };
    const updated = [newTask, ...current];
    saveLocalStore(STORAGE_KEYS.TASKS, updated);
    return newTask;
  },
  updateTaskStatus: (taskId: string, newStatus: TaskItem['status'], comment?: string) => {
    const current = loadLocalStore<TaskItem>(STORAGE_KEYS.TASKS, DEFAULT_TASKS);
    const updated = current.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: newStatus,
          completionComment: comment !== undefined ? comment : t.completionComment,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    saveLocalStore(STORAGE_KEYS.TASKS, updated);
  },

  // Mobile & Tablet App Profiles
  getMobileAppProfiles: () => loadLocalStore<MobileAppProfile>(STORAGE_KEYS.MOBILE_APP_PROFILES, DEFAULT_MOBILE_PROFILES),
  saveMobileAppProfiles: (profiles: MobileAppProfile[]) => {
    saveLocalStore(STORAGE_KEYS.MOBILE_APP_PROFILES, profiles);
  },

  saveVendors: (vendors: Vendor[]) => {
    saveLocalStore(STORAGE_KEYS.VENDORS, vendors);
  },
  saveWarehouses: (warehouses: WarehouseLocation[]) => {
    saveLocalStore(STORAGE_KEYS.WAREHOUSES, warehouses);
  },
  saveTimeCards: (timeCards: TimeCardLog[]) => {
    saveLocalStore(STORAGE_KEYS.TIME_CARDS, timeCards);
  },
  saveDoubleEntry: (entries: JournalEntry[]) => {
    saveLocalStore(STORAGE_KEYS.DOUBLE_ENTRY, entries);
  },
  saveAuditTrail: (logs: AuditLogEntry[]) => {
    saveLocalStore(STORAGE_KEYS.AUDIT_TRAIL, logs);
  },
  logAudit: (userId: string, userName: string, userRole: string, action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTOCK' | 'VOID' | 'ALLOCATE' | 'EXPENSE_RECORD', affectedRecord: string, details: string, attachmentImage?: string) => {
    const logs = loadLocalStore<AuditLogEntry>(STORAGE_KEYS.AUDIT_TRAIL, []);
    const newEntry: AuditLogEntry = {
      id: 'audit_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      userId,
      userName,
      userRole,
      timestamp: new Date().toISOString(),
      action,
      affectedRecord,
      details,
      attachmentImage
    };
    logs.unshift(newEntry);
    saveLocalStore(STORAGE_KEYS.AUDIT_TRAIL, logs);
  },
  savePettyCashAllocations: (allocs: PettyCashAllocation[]) => {
    saveLocalStore(STORAGE_KEYS.PETTY_CASH_ALLOC, allocs);
  },
  savePettyCashExpenses: (exps: PettyCashExpense[]) => {
    saveLocalStore(STORAGE_KEYS.PETTY_CASH_EXP, exps);
  },

  saveInventory: (inventory: InventoryLevel[]) => {
    saveLocalStore(STORAGE_KEYS.INVENTORY, inventory);
  },

  savePurchaseOrders: (orders: PurchaseOrder[]) => {
    saveLocalStore(STORAGE_KEYS.PURCHASE_ORDERS, orders);
  },

  saveCustomerLogs: (logs: CustomerLog[]) => {
    saveLocalStore(STORAGE_KEYS.CUSTOMER_LOGS, logs);
  },

  saveCustomers: (customers: CustomerProfile[]) => {
    saveLocalStore(STORAGE_KEYS.CUSTOMERS, customers);
  },

  saveOrders: (orders: POSOrder[]) => {
    saveLocalStore(STORAGE_KEYS.ORDERS, orders);
  },

  // Update operations with simulated validation and RBAC checks
  updateOpportunity: (updatedOpp: Opportunity, currentUser: UserProfile) => {
    // SECURITY RULE ENFORCEMENT
    // Check if moving to 'Closed' without Manager permissions
    const originalOpps = dataStore.getOpportunities();
    const original = originalOpps.find(o => o.id === updatedOpp.id);
    
    if (original) {
      const stageChangedToClosed = updatedOpp.kanban_stage === 'Closed' && original.kanban_stage !== 'Closed';
      const editingAlreadyClosed = original.kanban_stage === 'Closed';
      
      if (currentUser.role !== 'manager' && currentUser.role !== 'ceo' && currentUser.role !== 'sysadmin') {
        if (stageChangedToClosed) {
          throw new Error(JSON.stringify({
            error: "PERMISSION_DENIED: Moving opportunities to 'Closed' requires the 'manager' or 'ceo' role.",
            operationType: 'update',
            path: `opportunities/${updatedOpp.id}`,
            authInfo: {
              userId: currentUser.uid,
              email: currentUser.email,
              role: currentUser.role
            }
          }));
        }
        if (editingAlreadyClosed) {
          throw new Error(JSON.stringify({
            error: "PERMISSION_DENIED: Opportunities already marked as 'Closed' are locked and can only be modified by a 'manager' or 'ceo'.",
            operationType: 'update',
            path: `opportunities/${updatedOpp.id}`,
            authInfo: {
              userId: currentUser.uid,
              email: currentUser.email,
              role: currentUser.role
            }
          }));
        }
      }
    }

    const oList = originalOpps.map(o => o.id === updatedOpp.id ? { ...updatedOpp, updatedAt: new Date().toISOString() } : o);
    saveLocalStore(STORAGE_KEYS.OPPORTUNITIES, oList);
  },

  createOpportunity: (newOpp: Opportunity) => {
    const opps = dataStore.getOpportunities();
    opps.unshift(newOpp);
    saveLocalStore(STORAGE_KEYS.OPPORTUNITIES, opps);
  },

  deleteOpportunity: (oppId: string, currentUser: UserProfile) => {
    if (currentUser.role !== 'manager' && currentUser.role !== 'ceo' && currentUser.role !== 'sysadmin') {
      throw new Error(JSON.stringify({
        error: "PERMISSION_DENIED: Deleting opportunities requires the 'manager' or 'ceo' role.",
        operationType: 'delete',
        path: `opportunities/${oppId}`,
        authInfo: {
          userId: currentUser.uid,
          email: currentUser.email,
          role: currentUser.role
        }
      }));
    }
    const opps = dataStore.getOpportunities().filter(o => o.id !== oppId);
    saveLocalStore(STORAGE_KEYS.OPPORTUNITIES, opps);
  },

  updateProductPriceAndSKU: (prodId: string, sku: string, price: number, currentUser: UserProfile) => {
    if (currentUser.role !== 'manager' && currentUser.role !== 'ceo' && currentUser.role !== 'sysadmin' && currentUser.role !== 'warehouse') {
      throw new Error(JSON.stringify({
        error: "PERMISSION_DENIED: Modifying product pricing or catalog data is restricted to managers, CEO, and inventory managers.",
        operationType: 'update',
        path: `products/${prodId}`,
        authInfo: {
          userId: currentUser.uid,
          email: currentUser.email,
          role: currentUser.role
        }
      }));
    }
    const products = dataStore.getProducts().map(p => p.id === prodId ? { ...p, sku, price } : p);
    saveLocalStore(STORAGE_KEYS.PRODUCTS, products);

    // Also update sku on inventory level
    const inventory = dataStore.getInventory().map(i => i.productId === prodId ? { ...i, sku, lastUpdated: new Date().toISOString() } : i);
    saveLocalStore(STORAGE_KEYS.INVENTORY, inventory);
  },

  updateStockLevel: (prodId: string, deltaQuantity: number) => {
    const inventory = dataStore.getInventory().map(i => {
      if (i.productId === prodId) {
        const newStock = Math.max(0, i.stockLevel + deltaQuantity);
        return {
          ...i,
          stockLevel: newStock,
          lastUpdated: new Date().toISOString()
        };
      }
      return i;
    });
    saveLocalStore(STORAGE_KEYS.INVENTORY, inventory);
  },

  updateReorderPoint: (prodId: string, threshold: number, currentUser: UserProfile) => {
    if (currentUser.role !== 'manager' && currentUser.role !== 'ceo' && currentUser.role !== 'sysadmin' && currentUser.role !== 'warehouse') {
      throw new Error(JSON.stringify({
        error: "PERMISSION_DENIED: Modifying safety thresholds is restricted to managers, CEO, and inventory managers.",
        operationType: 'update',
        path: `inventory_levels/${prodId}`,
        authInfo: {
          userId: currentUser.uid,
          email: currentUser.email,
          role: currentUser.role
        }
      }));
    }
    const inventory = dataStore.getInventory().map(i => i.productId === prodId ? { ...i, ai_reorder_point: threshold, lastUpdated: new Date().toISOString() } : i);
    saveLocalStore(STORAGE_KEYS.INVENTORY, inventory);
  },

  updateUserSkillsMatchScore: (userId: string, newScore: number) => {
    const users = dataStore.getUsers().map(u => u.uid === userId ? { ...u, ai_skills_match_score: newScore, updatedAt: new Date().toISOString() } : u);
    saveLocalStore(STORAGE_KEYS.USERS, users);
  },

  assignUserRole: async (targetUid: string, newRole: 'manager' | 'sales' | 'cashier', currentUser: UserProfile) => {
    // 1. Authorize the caller
    if (currentUser.role !== 'manager' && currentUser.role !== 'ceo' && currentUser.role !== 'sysadmin') {
      throw new Error(JSON.stringify({
        error: "PERMISSION_DENIED: Only managers and CEO can assign roles.",
        operationType: 'update',
        path: `users/${targetUid}`,
        authInfo: {
          userId: currentUser.uid,
          email: currentUser.email,
          role: currentUser.role
        }
      }));
    }

    // Map roles to permissions
    const permissionsMap = {
      manager: ['all_access', 'approve_invoice', 'rbac_bypass', 'force_sync', 'edit_crm_all', 'void_pos'],
      sales: ['view_crm', 'edit_crm_partial', 'create_crm'],
      cashier: ['checkout_pos', 'view_inventory_levels', 'view_receipts']
    };

    const newPermissions = permissionsMap[newRole] || [];

    // Sandbox Update
    const users = dataStore.getUsers().map(u => 
      u.uid === targetUid 
        ? { ...u, role: newRole, permissions: newPermissions, updatedAt: new Date().toISOString() } 
        : u
    );
    saveLocalStore(STORAGE_KEYS.USERS, users);

    // If real Firebase is initialized, trigger the callable cloud function too
    if (isRealConfig) {
      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions(app);
        const setRoleFn = httpsCallable(functions, 'setRole');
        await setRoleFn({ uid: targetUid, role: newRole });
        console.log(`Successfully assigned custom claim role '${newRole}' to user '${targetUid}' on production.`);
      } catch (error) {
        console.error("Failed to set production Custom Claim role:", error);
        throw error;
      }
    }
  },

  createUserRecord: (newUser: UserProfile, currentUser: UserProfile) => {
    if (currentUser.role !== 'manager' && currentUser.role !== 'ceo' && currentUser.role !== 'sysadmin') {
      throw new Error(JSON.stringify({
        error: "PERMISSION_DENIED: Creating new user records is restricted to managers and CEO.",
        operationType: 'create',
        path: `users/${newUser.uid}`,
        authInfo: {
          userId: currentUser.uid,
          email: currentUser.email,
          role: currentUser.role
        }
      }));
    }
    const users = dataStore.getUsers();
    users.push(newUser);
    saveLocalStore(STORAGE_KEYS.USERS, users);
  },

  createProduct: (newProduct: Product, currentUser: UserProfile) => {
    if (currentUser.role !== 'manager' && currentUser.role !== 'ceo' && currentUser.role !== 'sysadmin' && currentUser.role !== 'warehouse') {
      throw new Error(JSON.stringify({
        error: "PERMISSION_DENIED: Creating new product catalog profiles is restricted to managers, CEO, and inventory managers.",
        operationType: 'create',
        path: `products/${newProduct.id}`,
        authInfo: {
          userId: currentUser.uid,
          email: currentUser.email,
          role: currentUser.role
        }
      }));
    }
    const products = dataStore.getProducts();
    products.push(newProduct);
    saveLocalStore(STORAGE_KEYS.PRODUCTS, products);

    // Auto-create matching inventory node for newly introduced catalog product
    const inventory = dataStore.getInventory();
    inventory.push({
      id: newProduct.id,
      productId: newProduct.id,
      sku: newProduct.sku,
      stockLevel: 0,
      ai_reorder_point: 10,
      lastUpdated: new Date().toISOString()
    });
    saveLocalStore(STORAGE_KEYS.INVENTORY, inventory);
  },

  createCustomer: (newCustomer: CustomerProfile, currentUser: UserProfile) => {
    if (currentUser.role !== 'manager' && currentUser.role !== 'ceo' && currentUser.role !== 'sysadmin' && currentUser.role !== 'sales') {
      throw new Error(JSON.stringify({
        error: "PERMISSION_DENIED: Only managers, CEO, and sales staff can register new customer profiles.",
        operationType: 'create',
        path: `customers/${newCustomer.id}`,
        authInfo: {
          userId: currentUser.uid,
          email: currentUser.email,
          role: currentUser.role
        }
      }));
    }
    const customers = dataStore.getCustomers();
    customers.push(newCustomer);
    saveLocalStore(STORAGE_KEYS.CUSTOMERS, customers);
  },

  // CRM Customer profile enrichment & sync from guest booking confirmations
  upsertCustomerFromGuest: (guestInfo: {
    name: string;
    email: string;
    phone?: string;
    totalSpend?: number;
    source?: string;
    stayDate?: string;
    roomNumber?: string;
    notes?: string;
    tag?: string;
    buyingHabits?: string[];
    demands?: string[];
  }): { customer: CustomerProfile; isNew: boolean } => {
    const customers = dataStore.getCustomers();
    const cleanEmail = (guestInfo.email || '').trim().toLowerCase();
    const cleanPhone = (guestInfo.phone || '').replace(/\D/g, '');

    const existingIndex = customers.findIndex(c => {
      const cEmail = (c.email || '').trim().toLowerCase();
      const cPhone = (c.phone || '').replace(/\D/g, '');
      return (cleanEmail && cEmail === cleanEmail) || (cleanPhone && cPhone && cleanPhone === cPhone);
    });

    const now = new Date().toISOString();
    let targetProfile: CustomerProfile;
    let isNew = false;

    if (existingIndex >= 0) {
      const existing = customers[existingIndex];
      const updatedLTV = Number(((existing.lifetime_value || 0) + (guestInfo.totalSpend || 0)).toFixed(2));
      const updatedCount = (existing.bookingHistoryCount || 1) + 1;

      // Merge habits & demands
      const existingHabits = existing.buyingHabits || [];
      const newHabits = guestInfo.buyingHabits || [];
      const mergedHabits = Array.from(new Set([...existingHabits, ...newHabits]));

      const existingDemands = existing.demands || [];
      const newDemands = guestInfo.demands || [];
      const mergedDemands = Array.from(new Set([...existingDemands, ...newDemands]));

      targetProfile = {
        ...existing,
        name: guestInfo.name || existing.name,
        phone: guestInfo.phone || existing.phone,
        lifetime_value: updatedLTV,
        bookingHistoryCount: updatedCount,
        lastStayDate: guestInfo.stayDate || now.split('T')[0],
        notes: guestInfo.notes ? `${existing.notes ? existing.notes + ' | ' : ''}${guestInfo.notes}` : existing.notes,
        tag: guestInfo.tag || existing.tag || 'customer',
        buyingHabits: mergedHabits,
        demands: mergedDemands,
        updatedAt: now
      };
      customers[existingIndex] = targetProfile;
    } else {
      isNew = true;
      targetProfile = {
        id: 'cust_crm_' + Date.now(),
        name: guestInfo.name || 'Hospitality Guest',
        email: cleanEmail || `guest_${Date.now()}@traveler.com`,
        phone: guestInfo.phone || '+1 (555) 000-0000',
        lifetime_value: Number((guestInfo.totalSpend || 0).toFixed(2)),
        ai_churn_risk: 0.12,
        source: guestInfo.source || 'POS Terminal / Walk-in',
        bookingHistoryCount: 1,
        lastStayDate: guestInfo.stayDate || now.split('T')[0],
        notes: guestInfo.notes || `Created via Walk-in POS checkout or guest registration`,
        tag: guestInfo.tag || 'customer',
        buyingHabits: guestInfo.buyingHabits || [],
        demands: guestInfo.demands || [],
        createdAt: now,
        updatedAt: now
      };
      customers.push(targetProfile);
    }

    saveLocalStore(STORAGE_KEYS.CUSTOMERS, customers);

    // Also register an entry in Customer Interaction Logs
    const logs = dataStore.getCustomerLogs();
    logs.unshift({
      id: 'log_crm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      customerId: targetProfile.id,
      type: 'system',
      notes: `CRM Sync: Logged customer touchpoint. Tag: ${targetProfile.tag}, Source: ${guestInfo.source || 'Retail/POS'}, Amount: $${guestInfo.totalSpend || 0}`,
      authorName: 'AI Guest Profile Extractor',
      createdAt: now
    });
    saveLocalStore(STORAGE_KEYS.CUSTOMER_LOGS, logs);

    return { customer: targetProfile, isNew };
  },

  updateCustomerChurnRisk: (customerId: string, risk: number) => {
    const customers = dataStore.getCustomers().map(c => c.id === customerId ? { ...c, ai_churn_risk: risk, updatedAt: new Date().toISOString() } : c);
    saveLocalStore(STORAGE_KEYS.CUSTOMERS, customers);
  },

  updateCustomer: (customerId: string, updates: Partial<CustomerProfile>) => {
    const customers = dataStore.getCustomers().map(c => c.id === customerId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
    saveLocalStore(STORAGE_KEYS.CUSTOMERS, customers);
    
    // Auto-trigger a localized custom event for real-time CRM component updates
    window.dispatchEvent(new CustomEvent('tumi_customer_updated', { detail: { customerId, updates } }));
  },

  updateOpportunityLeadScore: (oppId: string, score: number) => {
    const opps = dataStore.getOpportunities().map(o => o.id === oppId ? { ...o, ai_lead_score: score, updatedAt: new Date().toISOString() } : o);
    saveLocalStore(STORAGE_KEYS.OPPORTUNITIES, opps);
  },

  // POS Order Processing (Offline-Ready)
  submitPOSOrder: (
    orderItems: Array<{productId: string, name: string, quantity: number, price: number, discountType?: 'percent' | 'cash', discountValue?: number, discountAmount?: number}>, 
    cashier: UserProfile, 
    isNetworkOnline: boolean, 
    scannedDocData?: any,
    customerName?: string,
    customerPhone?: string,
    customerEmail?: string,
    discountAmount?: number,
    discountType?: 'percent' | 'cash',
    discountValue?: number
  ): POSOrder => {
    // 1. Calculate and inject individual item discounts
    const itemLevelDiscountsSum = orderItems.reduce((acc, item) => {
      const sub = item.price * item.quantity;
      let disc = 0;
      if (item.discountValue && item.discountValue > 0) {
        if (item.discountType === 'percent') {
          disc = Number(((sub * item.discountValue) / 100).toFixed(2));
        } else {
          disc = Number(Math.min(item.discountValue, sub).toFixed(2));
        }
      }
      item.discountAmount = disc;
      return acc + disc;
    }, 0);

    const totalBeforeItemDiscounts = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalAmount = Number((totalBeforeItemDiscounts - itemLevelDiscountsSum).toFixed(2));
    
    const discAmount = discountAmount || 0;
    const finalBillable = Number((Math.max(0, totalAmount - discAmount) * 1.08).toFixed(2));
    const orderId = 'ord_auto_' + Math.floor(100000 + Math.random() * 900000);
    
    const newOrder: POSOrder = {
      id: orderId,
      items: orderItems,
      totalAmount,
      cashierId: cashier.uid,
      cashierName: cashier.name,
      status: isNetworkOnline ? 'synced' : 'completed',
      offline: !isNetworkOnline,
      createdAt: new Date().toISOString(),
      scanned_document_data: scannedDocData,
      ai_fraud_flag: false, // Default to clear, updated by background job
      customerName,
      customerPhone,
      customerEmail,
      discountAmount: discAmount,
      discountType,
      discountValue
    };

    if (isNetworkOnline) {
      // Direct Save
      const currentOrders = dataStore.getOrders();
      currentOrders.unshift(newOrder);
      saveLocalStore(STORAGE_KEYS.ORDERS, currentOrders);

      // Add Double Entry General Ledger Record
      try {
        const doubleEntry = dataStore.getDoubleEntry();
        doubleEntry.unshift({
          id: 'je_' + Date.now() + '_pos',
          date: new Date().toISOString(),
          description: `POS Cash Checkout Sale - Order #${orderId}${discAmount > 0 ? ` (Discount: $${discAmount})` : ''}`,
          referenceId: orderId,
          type: 'POS_SALE',
          debitAccount: 'Cash',
          creditAccount: 'Sales_Revenue',
          amount: finalBillable
        });
        saveLocalStore(STORAGE_KEYS.DOUBLE_ENTRY, doubleEntry);
      } catch (err) {
        console.error("Failed to write to double entry ledger:", err);
      }

      // Instantly deduct inventory
      orderItems.forEach(item => {
        dataStore.updateStockLevel(item.productId, -item.quantity);
      });

      // Trigger asynchronous server-side predictive audit for fraud
      fetch('/api/ai/check-fraud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems,
          totalAmount,
          cashierName: cashier.name,
          offline: false
        })
      })
      .then(res => res.json())
      .then(analytics => {
        if (analytics && analytics.ai_fraud_flag !== undefined) {
          const refreshedOrders = dataStore.getOrders().map(o => o.id === orderId ? { ...o, ai_fraud_flag: analytics.ai_fraud_flag } : o);
          saveLocalStore(STORAGE_KEYS.ORDERS, refreshedOrders);
        }
      })
      .catch(err => console.error("Predictive audit failed:", err));

    } else {
      // Local Caching Mode: Save to offline-first cache
      const queue = dataStore.getOfflineQueue();
      queue.push(newOrder);
      saveLocalStore(STORAGE_KEYS.OFFLINE_QUEUE, queue);
    }

    return newOrder;
  },

  // Seamless synchronisation of offline logs when back online
  syncOfflineQueue: async (cashier: UserProfile) => {
    const queue = dataStore.getOfflineQueue();
    if (queue.length === 0) return { syncedCount: 0 };

    const currentOrders = dataStore.getOrders();
    const updatedOrders = [...currentOrders];

    for (const offlineOrder of queue) {
      const syncedOrder: POSOrder = {
        ...offlineOrder,
        status: 'synced',
        offline: true, // preserve history that it was created offline
      };

      updatedOrders.unshift(syncedOrder);

      // Deduct inventory
      offlineOrder.items.forEach(item => {
        dataStore.updateStockLevel(item.productId, -item.quantity);
      });

      // Background fraud analysis for previously offline transactions
      try {
        const response = await fetch('/api/ai/check-fraud', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: offlineOrder.items,
            totalAmount: offlineOrder.totalAmount,
            cashierName: offlineOrder.cashierName,
            offline: true
          })
        });
        const analytics = await response.json();
        if (analytics && analytics.ai_fraud_flag !== undefined) {
          syncedOrder.ai_fraud_flag = analytics.ai_fraud_flag;
        }
      } catch (err) {
        console.warn("Background fraud sync failed for order:", offlineOrder.id, err);
      }
    }

    // Save synced logs & clear queue
    saveLocalStore(STORAGE_KEYS.ORDERS, updatedOrders);
    saveLocalStore(STORAGE_KEYS.OFFLINE_QUEUE, []);

    // Dispatch event for UI Toast notification in POS and Inventory modules
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-queue-synced', {
        detail: { syncedCount: queue.length, timestamp: new Date().toISOString() }
      }));
    }

    return { syncedCount: queue.length };
  },

  // ----------------------------------------------------
  // NGO Skills Development & Donor Grant Data Handlers
  // ----------------------------------------------------
  getGrants: () => loadLocalStore<DonorGrant>(STORAGE_KEYS.DONOR_GRANTS, DEFAULT_DONOR_GRANTS),
  saveGrants: (grants: DonorGrant[]) => {
    saveLocalStore(STORAGE_KEYS.DONOR_GRANTS, grants);
  },
  addGrant: (grant: Omit<DonorGrant, 'id'>) => {
    const current = loadLocalStore<DonorGrant>(STORAGE_KEYS.DONOR_GRANTS, DEFAULT_DONOR_GRANTS);
    const newGrant: DonorGrant = {
      ...grant,
      id: 'grant_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    };
    const updated = [newGrant, ...current];
    saveLocalStore(STORAGE_KEYS.DONOR_GRANTS, updated);
    return newGrant;
  },
  allocateGrantSpend: (grantId: string, amount: number) => {
    const grants = loadLocalStore<DonorGrant>(STORAGE_KEYS.DONOR_GRANTS, DEFAULT_DONOR_GRANTS);
    const updated = grants.map(g => {
      if (g.id === grantId) {
        return {
          ...g,
          spentAmount: Math.min(g.totalBudget, (g.spentAmount || 0) + amount)
        };
      }
      return g;
    });
    saveLocalStore(STORAGE_KEYS.DONOR_GRANTS, updated);
  },

  // ----------------------------------------------------
  // Project Budgets Data Handlers
  // ----------------------------------------------------
  getProjectBudgets: () => loadLocalStore<ProjectBudget>(STORAGE_KEYS.PROJECT_BUDGETS, DEFAULT_PROJECT_BUDGETS),
  saveProjectBudgets: (budgets: ProjectBudget[]) => {
    saveLocalStore(STORAGE_KEYS.PROJECT_BUDGETS, budgets);
  },
  addProjectBudget: (budget: Omit<ProjectBudget, 'id' | 'raisedAmount' | 'spentAmount' | 'allocatedAmount'>) => {
    const current = loadLocalStore<ProjectBudget>(STORAGE_KEYS.PROJECT_BUDGETS, DEFAULT_PROJECT_BUDGETS);
    const newBudget: ProjectBudget = {
      ...budget,
      id: 'prj_budget_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      raisedAmount: 0,
      allocatedAmount: Math.round(budget.totalBudgetAmount * 0.75),
      spentAmount: 0
    };
    const updated = [newBudget, ...current];
    saveLocalStore(STORAGE_KEYS.PROJECT_BUDGETS, updated);
    return newBudget;
  },
  updateProjectBudget: (updatedBudget: ProjectBudget) => {
    const current = loadLocalStore<ProjectBudget>(STORAGE_KEYS.PROJECT_BUDGETS, DEFAULT_PROJECT_BUDGETS);
    const updatedList = current.map(b => b.id === updatedBudget.id ? updatedBudget : b);
    saveLocalStore(STORAGE_KEYS.PROJECT_BUDGETS, updatedList);
    return updatedList;
  },

  // ----------------------------------------------------
  // Tumi Project Web Donation & Payment Plugin Handlers
  // ----------------------------------------------------
  getDonationForms: () => loadLocalStore<WebDonationFormConfig>(STORAGE_KEYS.WEB_DONATION_FORMS, DEFAULT_DONATION_FORMS),
  saveDonationForms: (forms: WebDonationFormConfig[]) => {
    saveLocalStore(STORAGE_KEYS.WEB_DONATION_FORMS, forms);
  },
  addDonationForm: (form: Omit<WebDonationFormConfig, 'id' | 'createdDate' | 'totalRaised' | 'donorCount'>) => {
    const current = loadLocalStore<WebDonationFormConfig>(STORAGE_KEYS.WEB_DONATION_FORMS, DEFAULT_DONATION_FORMS);
    const newForm: WebDonationFormConfig = {
      ...form,
      id: 'form_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      createdDate: new Date().toISOString(),
      totalRaised: 0,
      donorCount: 0
    };
    const updated = [newForm, ...current];
    saveLocalStore(STORAGE_KEYS.WEB_DONATION_FORMS, updated);
    return newForm;
  },
  getDonationTransactions: () => loadLocalStore<WebDonationTransaction>(STORAGE_KEYS.WEB_DONATION_TRANSACTIONS, DEFAULT_DONATION_TRANSACTIONS),
  getDonorProfiles: () => loadLocalStore<DonorProfile>(STORAGE_KEYS.DONOR_PROFILES, DEFAULT_DONOR_PROFILES),
  saveDonorProfiles: (profiles: DonorProfile[]) => saveLocalStore(STORAGE_KEYS.DONOR_PROFILES, profiles),
  getCapturedDonorDatabase: () => loadLocalStore<CapturedDonorRecord>(STORAGE_KEYS.CAPTURED_DONOR_DATABASE, DEFAULT_CAPTURED_DONOR_DATABASE),
  saveCapturedDonorDatabase: (records: CapturedDonorRecord[]) => saveLocalStore(STORAGE_KEYS.CAPTURED_DONOR_DATABASE, records),
  
  recordWebDonation: (donation: Omit<WebDonationTransaction, 'id' | 'createdAt' | 'receiptNumber' | 'paymentStatus' | 'transactionRef'>) => {
    const txs = loadLocalStore<WebDonationTransaction>(STORAGE_KEYS.WEB_DONATION_TRANSACTIONS, DEFAULT_DONATION_TRANSACTIONS);
    const receiptNum = 'RCPT-DON-' + new Date().getFullYear() + '-' + String(txs.length + 1).padStart(3, '0');
    const newTx: WebDonationTransaction = {
      ...donation,
      id: 'don_tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      transactionRef: 'TUMI-TX-' + Math.floor(100000 + Math.random() * 900000),
      paymentStatus: 'completed',
      receiptNumber: receiptNum,
      createdAt: new Date().toISOString()
    };
    const updatedTxs = [newTx, ...txs];
    saveLocalStore(STORAGE_KEYS.WEB_DONATION_TRANSACTIONS, updatedTxs);

    // 1. Update matching donation form statistics
    const forms = loadLocalStore<WebDonationFormConfig>(STORAGE_KEYS.WEB_DONATION_FORMS, DEFAULT_DONATION_FORMS);
    const updatedForms = forms.map(f => {
      if (f.id === donation.formId) {
        return {
          ...f,
          totalRaised: (f.totalRaised || 0) + donation.amount,
          donorCount: (f.donorCount || 0) + 1
        };
      }
      return f;
    });
    saveLocalStore(STORAGE_KEYS.WEB_DONATION_FORMS, updatedForms);

    // 2. If linked to a Project Budget, update project budget raised amount
    if (donation.linkedProjectId) {
      const projectBudgets = loadLocalStore<ProjectBudget>(STORAGE_KEYS.PROJECT_BUDGETS, DEFAULT_PROJECT_BUDGETS);
      const updatedProjectBudgets = projectBudgets.map(pb => {
        if (pb.id === donation.linkedProjectId) {
          return {
            ...pb,
            raisedAmount: (pb.raisedAmount || 0) + donation.amount
          };
        }
        return pb;
      });
      saveLocalStore(STORAGE_KEYS.PROJECT_BUDGETS, updatedProjectBudgets);
    }

    // 3. If linked to an ERP Grant, update grant budget allocation
    if (donation.linkedGrantCode) {
      const grants = loadLocalStore<DonorGrant>(STORAGE_KEYS.DONOR_GRANTS, DEFAULT_DONOR_GRANTS);
      const updatedGrants = grants.map(g => {
        if (g.grantCode === donation.linkedGrantCode) {
          return {
            ...g,
            allocatedAmount: (g.allocatedAmount || 0) + donation.amount
          };
        }
        return g;
      });
      saveLocalStore(STORAGE_KEYS.DONOR_GRANTS, updatedGrants);
    }

    // 3. Update/Store in Primary DONOR DATABASE (DONOR_PROFILES)
    const donorProfiles = loadLocalStore<DonorProfile>(STORAGE_KEYS.DONOR_PROFILES, DEFAULT_DONOR_PROFILES);
    const existingIndex = donorProfiles.findIndex(dp => dp.email.toLowerCase() === donation.donorEmail.toLowerCase());
    const histItem = {
      transactionId: newTx.id,
      receiptNumber: receiptNum,
      amount: donation.amount,
      currency: donation.currency,
      date: newTx.createdAt,
      formTitle: donation.formTitle,
      paymentMethod: donation.paymentMethod,
      donorMessage: donation.donorMessage
    };

    const freqCat: 'one_time' | 'monthly' | 'quarterly' | 'annually' = donation.isRecurring 
      ? (donation.recurringInterval as any || 'monthly') 
      : 'one_time';

    let updatedProfiles: DonorProfile[];
    if (existingIndex >= 0) {
      const existing = donorProfiles[existingIndex];
      const updatedDonor: DonorProfile = {
        ...existing,
        name: donation.donorName || existing.name,
        phone: donation.donorPhone || existing.phone,
        address: donation.donorAddress || existing.address,
        totalDonated: existing.totalDonated + donation.amount,
        donationCount: existing.donationCount + 1,
        lastDonationDate: newTx.createdAt,
        status: donation.isRecurring ? 'recurring' : (existing.totalDonated + donation.amount >= 500 ? 'vip' : 'active'),
        frequencyCategory: donation.isRecurring ? freqCat : (existing.frequencyCategory || 'one_time'),
        notes: donation.donorMessage ? `${existing.notes ? existing.notes + ' | ' : ''}Message: "${donation.donorMessage}"` : existing.notes,
        linkedGrants: donation.linkedGrantCode && !existing.linkedGrants?.includes(donation.linkedGrantCode) 
          ? [...(existing.linkedGrants || []), donation.linkedGrantCode] 
          : (existing.linkedGrants || []),
        donationsHistory: [histItem, ...(existing.donationsHistory || [])]
      };
      updatedProfiles = [...donorProfiles];
      updatedProfiles[existingIndex] = updatedDonor;
    } else {
      const newDonor: DonorProfile = {
        id: 'DONOR-' + Math.floor(1000 + Math.random() * 9000),
        name: donation.donorName,
        email: donation.donorEmail,
        phone: donation.donorPhone,
        address: donation.donorAddress,
        totalDonated: donation.amount,
        donationCount: 1,
        firstDonationDate: newTx.createdAt,
        lastDonationDate: newTx.createdAt,
        status: donation.isRecurring ? 'recurring' : (donation.amount >= 500 ? 'vip' : 'active'),
        frequencyCategory: freqCat,
        notes: donation.donorMessage ? `Message: "${donation.donorMessage}"` : undefined,
        tags: ['Web Plugin Lead', donation.formTitle],
        linkedGrants: donation.linkedGrantCode ? [donation.linkedGrantCode] : [],
        donationsHistory: [histItem]
      };
      updatedProfiles = [newDonor, ...donorProfiles];
    }
    saveLocalStore(STORAGE_KEYS.DONOR_PROFILES, updatedProfiles);

    // 4. Capture in SEPARATE EXTERNAL DONOR DATABASE (CAPTURED_DONOR_DATABASE)
    const capturedDb = loadLocalStore<CapturedDonorRecord>(STORAGE_KEYS.CAPTURED_DONOR_DATABASE, DEFAULT_CAPTURED_DONOR_DATABASE);
    const newCapturedRecord: CapturedDonorRecord = {
      id: 'CAP-DON-' + new Date().getFullYear() + '-' + String(capturedDb.length + 1).padStart(3, '0'),
      donorName: donation.donorName,
      donorEmail: donation.donorEmail,
      donorPhone: donation.donorPhone,
      donorAddress: donation.donorAddress,
      donorMessage: donation.donorMessage,
      donationAmount: donation.amount,
      currency: donation.currency,
      capturedAt: newTx.createdAt,
      formId: donation.formId,
      formTitle: donation.formTitle,
      paymentMethod: donation.paymentMethod,
      receiptNumber: receiptNum,
      syncStatus: 'captured',
      databaseSource: 'External Web Capture Database'
    };
    saveLocalStore(STORAGE_KEYS.CAPTURED_DONOR_DATABASE, [newCapturedRecord, ...capturedDb]);

    // 5. Post to Double-Entry Ledger
    const journalEntries = loadLocalStore<JournalEntry>(STORAGE_KEYS.DOUBLE_ENTRY, DEFAULT_DOUBLE_ENTRY);
    const newEntry: JournalEntry = {
      id: 'je_don_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      referenceId: receiptNum,
      description: `Tumi Project Web Donation (${donation.formTitle}) from ${donation.donorName}`,
      type: 'POS_SALE',
      debitAccount: 'Cash',
      creditAccount: 'Sales_Revenue',
      amount: donation.amount
    };
    saveLocalStore(STORAGE_KEYS.DOUBLE_ENTRY, [newEntry, ...journalEntries]);

    // 6. Audit Log
    dataStore.logAudit(
      'public_donor',
      donation.donorName,
      'donor',
      'CREATE',
      `web_donation_${newTx.id}`,
      `Received web donation of $${donation.amount.toFixed(2)} (${donation.currency}) from ${donation.donorName} (${donation.donorEmail}). Captured in Donor Profile DB and Separate External Donor Database. Receipt: ${receiptNum}`
    );

    return newTx;
  },

  // Trainee Attendance & QR Badge Terminal
  getAttendanceLogs: () => loadLocalStore<TraineeAttendanceLog>(STORAGE_KEYS.TRAINEE_ATTENDANCE, DEFAULT_TRAINEE_ATTENDANCE),
  saveAttendanceLogs: (logs: TraineeAttendanceLog[]) => {
    saveLocalStore(STORAGE_KEYS.TRAINEE_ATTENDANCE, logs);
  },
  recordAttendance: (record: Omit<TraineeAttendanceLog, 'id'>) => {
    const current = loadLocalStore<TraineeAttendanceLog>(STORAGE_KEYS.TRAINEE_ATTENDANCE, DEFAULT_TRAINEE_ATTENDANCE);
    const newRecord: TraineeAttendanceLog = {
      ...record,
      id: 'att_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    };
    const updated = [newRecord, ...current];
    saveLocalStore(STORAGE_KEYS.TRAINEE_ATTENDANCE, updated);
    return newRecord;
  },

  // Graduate Employment & Placement Tracking
  getGraduatePlacements: () => loadLocalStore<GraduatePlacementRecord>(STORAGE_KEYS.GRADUATE_PLACEMENTS, DEFAULT_GRADUATE_PLACEMENTS),
  saveGraduatePlacements: (placements: GraduatePlacementRecord[]) => {
    saveLocalStore(STORAGE_KEYS.GRADUATE_PLACEMENTS, placements);
  },
  addGraduatePlacement: (placement: Omit<GraduatePlacementRecord, 'id'>) => {
    const current = loadLocalStore<GraduatePlacementRecord>(STORAGE_KEYS.GRADUATE_PLACEMENTS, DEFAULT_GRADUATE_PLACEMENTS);
    const newPlacement: GraduatePlacementRecord = {
      ...placement,
      id: 'place_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    };
    const updated = [newPlacement, ...current];
    saveLocalStore(STORAGE_KEYS.GRADUATE_PLACEMENTS, updated);
    return newPlacement;
  },

  // Digital Credentials & Certificates
  getDigitalCertificates: () => loadLocalStore<DigitalCertificate>(STORAGE_KEYS.DIGITAL_CERTIFICATES, DEFAULT_DIGITAL_CERTIFICATES),
  saveDigitalCertificates: (certs: DigitalCertificate[]) => {
    saveLocalStore(STORAGE_KEYS.DIGITAL_CERTIFICATES, certs);
  },
  issueCertificate: (cert: Omit<DigitalCertificate, 'id'>) => {
    const current = loadLocalStore<DigitalCertificate>(STORAGE_KEYS.DIGITAL_CERTIFICATES, DEFAULT_DIGITAL_CERTIFICATES);
    const newCert: DigitalCertificate = {
      ...cert,
      id: 'cert_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    };
    const updated = [newCert, ...current];
    saveLocalStore(STORAGE_KEYS.DIGITAL_CERTIFICATES, updated);
    return newCert;
  },

  // Complete Financial & Accounting Software Data Services
  getChartOfAccounts: () => loadLocalStore<ChartOfAccount>(STORAGE_KEYS.CHART_OF_ACCOUNTS, DEFAULT_CHART_OF_ACCOUNTS),
  saveChartOfAccounts: (accounts: ChartOfAccount[]) => {
    saveLocalStore(STORAGE_KEYS.CHART_OF_ACCOUNTS, accounts);
  },
  addAccount: (account: ChartOfAccount) => {
    const accounts = loadLocalStore<ChartOfAccount>(STORAGE_KEYS.CHART_OF_ACCOUNTS, DEFAULT_CHART_OF_ACCOUNTS);
    const updated = [...accounts.filter(a => a.code !== account.code), account].sort((a, b) => a.code.localeCompare(b.code));
    saveLocalStore(STORAGE_KEYS.CHART_OF_ACCOUNTS, updated);
    return account;
  },
  updateAccount: (code: string, updates: Partial<ChartOfAccount>) => {
    const accounts = loadLocalStore<ChartOfAccount>(STORAGE_KEYS.CHART_OF_ACCOUNTS, DEFAULT_CHART_OF_ACCOUNTS);
    const updated = accounts.map(a => a.code === code ? { ...a, ...updates } : a);
    saveLocalStore(STORAGE_KEYS.CHART_OF_ACCOUNTS, updated);
  },

  getCashFlows: () => loadLocalStore<CashFlowRecord>(STORAGE_KEYS.CASH_FLOWS, DEFAULT_CASH_FLOWS),
  saveCashFlows: (flows: CashFlowRecord[]) => {
    saveLocalStore(STORAGE_KEYS.CASH_FLOWS, flows);
  },
  addCashFlow: (record: Omit<CashFlowRecord, 'id'>) => {
    const flows = loadLocalStore<CashFlowRecord>(STORAGE_KEYS.CASH_FLOWS, DEFAULT_CASH_FLOWS);
    const newRecord: CashFlowRecord = {
      ...record,
      id: 'cf_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    };
    const updated = [newRecord, ...flows];
    saveLocalStore(STORAGE_KEYS.CASH_FLOWS, updated);

    // Automatically update Operating Cash account balance
    const accounts = loadLocalStore<ChartOfAccount>(STORAGE_KEYS.CHART_OF_ACCOUNTS, DEFAULT_CHART_OF_ACCOUNTS);
    const cashAcc = accounts.find(a => a.code === '1010');
    if (cashAcc) {
      cashAcc.balance = record.direction === 'inflow' 
        ? Number((cashAcc.balance + record.amount).toFixed(2))
        : Number((cashAcc.balance - record.amount).toFixed(2));
      saveLocalStore(STORAGE_KEYS.CHART_OF_ACCOUNTS, accounts);
    }
    return newRecord;
  },
  updateCashFlow: (id: string, updates: Partial<CashFlowRecord>) => {
    const flows = loadLocalStore<CashFlowRecord>(STORAGE_KEYS.CASH_FLOWS, DEFAULT_CASH_FLOWS);
    const updated = flows.map(f => f.id === id ? { ...f, ...updates } : f);
    saveLocalStore(STORAGE_KEYS.CASH_FLOWS, updated);
    return updated.find(f => f.id === id);
  },
  deleteCashFlow: (id: string) => {
    const flows = loadLocalStore<CashFlowRecord>(STORAGE_KEYS.CASH_FLOWS, DEFAULT_CASH_FLOWS);
    const updated = flows.filter(f => f.id !== id);
    saveLocalStore(STORAGE_KEYS.CASH_FLOWS, updated);
  },

  // System Migration & External Integration Jobs
  getSystemMigrationJobs: () => loadLocalStore<SystemMigrationJob>(STORAGE_KEYS.SYSTEM_MIGRATIONS, DEFAULT_MIGRATION_JOBS),
  saveSystemMigrationJobs: (jobs: SystemMigrationJob[]) => saveLocalStore(STORAGE_KEYS.SYSTEM_MIGRATIONS, jobs),
  addSystemMigrationJob: (job: Omit<SystemMigrationJob, 'id' | 'timestamp'>) => {
    const current = loadLocalStore<SystemMigrationJob>(STORAGE_KEYS.SYSTEM_MIGRATIONS, DEFAULT_MIGRATION_JOBS);
    const newJob: SystemMigrationJob = {
      ...job,
      id: 'mig_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString()
    };
    saveLocalStore(STORAGE_KEYS.SYSTEM_MIGRATIONS, [newJob, ...current]);
    return newJob;
  },

  getFixedAssets: () => loadLocalStore<FixedAssetRecord>(STORAGE_KEYS.FIXED_ASSETS, DEFAULT_FIXED_ASSETS),
  saveFixedAssets: (assets: FixedAssetRecord[]) => {
    saveLocalStore(STORAGE_KEYS.FIXED_ASSETS, assets);
  },
  addFixedAsset: (asset: Omit<FixedAssetRecord, 'id' | 'accumulatedDepreciation' | 'currentBookValue'>) => {
    const assets = loadLocalStore<FixedAssetRecord>(STORAGE_KEYS.FIXED_ASSETS, DEFAULT_FIXED_ASSETS);
    const newAsset: FixedAssetRecord = {
      ...asset,
      id: 'fa_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      accumulatedDepreciation: 0,
      currentBookValue: asset.purchaseCost
    };
    const updated = [newAsset, ...assets];
    saveLocalStore(STORAGE_KEYS.FIXED_ASSETS, updated);
    return newAsset;
  },
  updateFixedAsset: (id: string, updates: Partial<FixedAssetRecord>) => {
    const assets = loadLocalStore<FixedAssetRecord>(STORAGE_KEYS.FIXED_ASSETS, DEFAULT_FIXED_ASSETS);
    const updated = assets.map(a => a.id === id ? { ...a, ...updates } : a);
    saveLocalStore(STORAGE_KEYS.FIXED_ASSETS, updated);
  },

  getInventoryValuations: () => loadLocalStore<InventoryValuationSnapshot>(STORAGE_KEYS.INVENTORY_VALUATIONS, []),
  saveInventoryValuations: (vals: InventoryValuationSnapshot[]) => {
    saveLocalStore(STORAGE_KEYS.INVENTORY_VALUATIONS, vals);
  },
  addInventoryValuation: (val: Omit<InventoryValuationSnapshot, 'id'>) => {
    const vals = loadLocalStore<InventoryValuationSnapshot>(STORAGE_KEYS.INVENTORY_VALUATIONS, []);
    const newSnapshot: InventoryValuationSnapshot = {
      ...val,
      id: 'val_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    };
    const updated = [newSnapshot, ...vals];
    saveLocalStore(STORAGE_KEYS.INVENTORY_VALUATIONS, updated);
    return newSnapshot;
  },

  // Complete HR & Roles Services
  getLeaveRequests: () => loadLocalStore<LeaveRequestRecord>(STORAGE_KEYS.LEAVE_REQUESTS, DEFAULT_LEAVE_REQUESTS),
  saveLeaveRequests: (leaves: LeaveRequestRecord[]) => {
    saveLocalStore(STORAGE_KEYS.LEAVE_REQUESTS, leaves);
  },
  addLeaveRequest: (req: Omit<LeaveRequestRecord, 'id' | 'status' | 'requestedAt'>) => {
    const current = loadLocalStore<LeaveRequestRecord>(STORAGE_KEYS.LEAVE_REQUESTS, DEFAULT_LEAVE_REQUESTS);
    const newReq: LeaveRequestRecord = {
      ...req,
      id: 'lv_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      status: 'pending',
      requestedAt: new Date().toISOString()
    };
    const updated = [newReq, ...current];
    saveLocalStore(STORAGE_KEYS.LEAVE_REQUESTS, updated);
    return newReq;
  },
  updateLeaveRequestStatus: (id: string, status: 'approved' | 'rejected', reviewerName: string, reviewerNotes?: string) => {
    const current = loadLocalStore<LeaveRequestRecord>(STORAGE_KEYS.LEAVE_REQUESTS, DEFAULT_LEAVE_REQUESTS);
    const updated = current.map(l => l.id === id ? {
      ...l,
      status,
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
      reviewerNotes: reviewerNotes || l.reviewerNotes
    } : l);
    saveLocalStore(STORAGE_KEYS.LEAVE_REQUESTS, updated);
  },

  getPerformanceReviews: () => loadLocalStore<PerformanceReviewRecord>(STORAGE_KEYS.PERFORMANCE_REVIEWS, DEFAULT_PERFORMANCE_REVIEWS),
  savePerformanceReviews: (reviews: PerformanceReviewRecord[]) => {
    saveLocalStore(STORAGE_KEYS.PERFORMANCE_REVIEWS, reviews);
  },
  addPerformanceReview: (review: Omit<PerformanceReviewRecord, 'id'>) => {
    const current = loadLocalStore<PerformanceReviewRecord>(STORAGE_KEYS.PERFORMANCE_REVIEWS, DEFAULT_PERFORMANCE_REVIEWS);
    const newRev: PerformanceReviewRecord = {
      ...review,
      id: 'pr_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    };
    const updated = [newRev, ...current];
    saveLocalStore(STORAGE_KEYS.PERFORMANCE_REVIEWS, updated);
    return newRev;
  },

  getPayrollRuns: () => loadLocalStore<PayrollRunRecord>(STORAGE_KEYS.PAYROLL_RUNS, DEFAULT_PAYROLL_RUNS),
  savePayrollRuns: (runs: PayrollRunRecord[]) => {
    saveLocalStore(STORAGE_KEYS.PAYROLL_RUNS, runs);
  },
  addPayrollRun: (run: Omit<PayrollRunRecord, 'id'>) => {
    const current = loadLocalStore<PayrollRunRecord>(STORAGE_KEYS.PAYROLL_RUNS, DEFAULT_PAYROLL_RUNS);
    const newRun: PayrollRunRecord = {
      ...run,
      id: 'pay_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    };
    const updated = [newRun, ...current];
    saveLocalStore(STORAGE_KEYS.PAYROLL_RUNS, updated);
    return newRun;
  },

  // Listeners that simulate real-time onSnapshot triggers
  subscribeToCollection: (collectionName: 'users' | 'products' | 'inventory' | 'customers' | 'opportunities' | 'orders' | 'offline_queue' | 'purchase_orders' | 'customer_logs' | 'vendors' | 'warehouses' | 'double_entry' | 'audit_trail' | 'petty_cash_alloc' | 'petty_cash_exp' | 'time_cards', callback: CallbackFn) => {
    let key = '';
    switch (collectionName) {
      case 'users': key = STORAGE_KEYS.USERS; break;
      case 'products': key = STORAGE_KEYS.PRODUCTS; break;
      case 'inventory': key = STORAGE_KEYS.INVENTORY; break;
      case 'customers': key = STORAGE_KEYS.CUSTOMERS; break;
      case 'opportunities': key = STORAGE_KEYS.OPPORTUNITIES; break;
      case 'orders': key = STORAGE_KEYS.ORDERS; break;
      case 'offline_queue': key = STORAGE_KEYS.OFFLINE_QUEUE; break;
      case 'purchase_orders': key = STORAGE_KEYS.PURCHASE_ORDERS; break;
      case 'customer_logs': key = STORAGE_KEYS.CUSTOMER_LOGS; break;
      case 'vendors': key = STORAGE_KEYS.VENDORS; break;
      case 'warehouses': key = STORAGE_KEYS.WAREHOUSES; break;
      case 'double_entry': key = STORAGE_KEYS.DOUBLE_ENTRY; break;
      case 'audit_trail': key = STORAGE_KEYS.AUDIT_TRAIL; break;
      case 'petty_cash_alloc': key = STORAGE_KEYS.PETTY_CASH_ALLOC; break;
      case 'petty_cash_exp': key = STORAGE_KEYS.PETTY_CASH_EXP; break;
      case 'time_cards': key = STORAGE_KEYS.TIME_CARDS; break;
    }
    return subscribeToKey(key, callback);
  }
};

// Error handling standard conforming exactly to FirestoreErrorInfo
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    role?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, activeUser?: UserProfile) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: activeUser?.uid || 'anonymous',
      email: activeUser?.email || 'anonymous',
      role: activeUser?.role || 'none',
    },
    operationType,
    path
  };
  console.error('Firestore Error Payload:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// Export real or fallback instances
export { db, auth };
export const sandboxMode = !isRealConfig;
