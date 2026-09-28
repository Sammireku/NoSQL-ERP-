/**
 * TypeScript interfaces representing the Firestore collections,
 * subcollections, and embedded objects for the Modular Firebase-backed ERP.
 */

// 1. users (Collection) - HR & Role Profiles
export type UserRole = 'ceo' | 'sysadmin' | 'manager' | 'sales' | 'cashier' | 'warehouse' | 'auditor' | 'receptionist' | 'housekeeping' | 'maintenance' | 'accountant';

export interface UserProfile {
  uid: string; // Document ID
  name: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  department?: string;
  jobTitle?: string;
  baseSalary?: number;
  workDaysPerMonth?: number; // Configurable days/month to calculate rates
  workHoursPerDay?: number;  // Configurable hours/day to calculate rates
  dailyRate?: number;        // Auto-calculated daily pay rate
  hourlyRate?: number;       // Auto-calculated hourly pay rate
  hireDate?: string;
  permissions: string[];
  ai_skills_match_score?: number; // Computed score: 0 to 100 representing suitability
  orgId?: string; // Multi-tenant organization identity claim
  companyName?: string; // Company / Organization Name
  industry?: string;
  currency?: string;
  taxRate?: number;
  teamSize?: string;
  onboardingCompleted?: boolean;
  pin?: string; // Secure 4-digit PIN for context switching
  status?: 'active' | 'invited' | 'suspended' | 'inactive';
  employmentStatus?: 'probation' | 'confirmed' | 'suspended';
  employmentType?: 'full_time' | 'part_time' | 'probation' | 'other' | string;
  maritalStatus?: 'married' | 'single' | string;
  isMarried?: boolean;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  contactPersonName?: string;
  contactPersonRelation?: string;
  contactPersonPhone?: string;
  probationEndDate?: string;
  appraisalNotes?: string;
  whatsappNumber?: string;
  invitedBy?: string;
  tempPassword?: string;
  inviteToken?: string;
  createdAt: string; // ISO 8601 string
  updatedAt: string;
}

// Custom Tax Engine Configuration (supports GRA Multi-Tier Tax & Local Compliance)
export interface CompanyTaxConfig {
  taxMode: 'gra_standard' | 'gra_flat_3' | 'custom' | 'exempt';
  graStandardRate: number; // e.g. 15% VAT
  nhilRate: number;        // e.g. 2.5% NHIL
  getFundRate: number;     // e.g. 2.5% GETFund
  covidLevyRate: number;   // e.g. 1% COVID-19 Levy
  customTaxRate: number;   // Custom percentage
  tinNumber: string;       // Tax Identification Number (TIN / GRA TIN)
  eInvoiceEnabled: boolean;
}

// Custom POS Receipt & Invoice Template Branding
export interface ReceiptTemplateConfig {
  logoUrl?: string;
  headerTitle: string;
  subHeader: string;
  footerNotes: string;
  returnPolicyText: string;
  showTaxBreakdown: boolean;
  showTinNumber: boolean;
  showQRCode: boolean;
  primaryColor: string;
}

// Customizable Dashboard Widget Preferences
export interface DashboardWidgetConfig {
  id: string;
  title: string;
  category: 'analytics' | 'inventory' | 'finance' | 'operations' | 'quick_actions';
  enabled: boolean;
  order: number;
}

export interface CustomerLog {
  id: string;
  customerId: string;
  type: 'email' | 'call' | 'meeting' | 'system' | 'proposal';
  notes: string;
  authorName: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  productId: string;
  name: string;
  quantity: number;
  wholesalePrice: number;
}

export interface PurchaseOrder {
  id: string;
  createdAt: string;
  status: 'proposed' | 'approved' | 'received';
  items: PurchaseOrderItem[];
  totalCost: number;
  approvedBy: string | null;
  vendorId?: string;
  vendorName?: string;
  supplierReceiptCode?: string; // Unique code generated for supplier confirmation
  whatsappSent?: boolean;
  emailSent?: boolean;
}

// 2. customers (Collection) - CRM Customer Profiles
export interface CustomerProfile {
  id: string; // Document ID
  name: string;
  email: string;
  phone: string;
  lifetime_value: number; // Cumulative spending
  ai_churn_risk: number; // Predictive score: 0.0 to 1.0 (0% to 100% risk)
  createdAt: string;
  updatedAt: string;
  source?: string;
  bookingHistoryCount?: number;
  lastStayDate?: string;
  notes?: string;
  tag?: 'guest' | 'customer' | 'walk-in' | 'corporate' | string;
  buyingHabits?: string[];
  demands?: string[];
}

// 3. opportunities (Collection) - CRM Deals (Kanban Pipeline)
export type KanbanStage = 'New' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed';

export interface Opportunity {
  id: string; // Document ID
  title: string;
  customerName: string;
  customerId: string;
  value: number; // Deal value in currency
  kanban_stage: KanbanStage;
  createdAt: string;
  updatedAt: string;
  ai_lead_score?: number; // Real-time AI Lead Score (1-100)
}

// 4. products (Collection) - Inventory Catalog
export interface Product {
  id: string; // Document ID
  sku: string; // Stock Keeping Unit (e.g., PROD-10293)
  name: string;
  price: number;
  category: string;
  description?: string;
  imageUrl?: string; // Product image URL/base64
  variants?: Array<{
    id: string;
    sku: string;
    size?: string;
    color?: string;
    priceAdjustment?: number; // e.g. +$10 for XL or leather color
    stock: number;
  }>;
  wordpressSyncStatus?: 'synced' | 'unsynced' | 'pending';
  wordpressId?: string; // Matched ID in WooCommerce / WordPress Catalog
  wordpressLastSynced?: string;
  minStockAlert?: number;
}

// 5. inventory_levels (Collection) - Warehouse stock tracking
export interface InventoryLevel {
  id: string; // Same as Product ID (for 1:1 join performance optimization)
  productId: string;
  sku: string;
  stockLevel: number;
  ai_reorder_point: number; // AI-predicted optimal threshold to reorder stock
  lastUpdated: string;
  warehouseId?: string; // e.g. wh_main
  binLocation?: string; // e.g. Aisle 3 - Shelf 4
}

// 6. pos_orders (Collection) - Point of Sale Transaction Logs
export interface POSOrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  discountType?: 'percent' | 'cash';
  discountValue?: number;
  discountAmount?: number;
}

export interface ScannedDocumentData {
  invoiceNumber?: string;
  vendor?: string;
  tax?: number;
  date?: string;
  totalAmount?: number;
  detectedItems?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface POSOrder {
  id: string; // Document ID (auto-generated UUID)
  items: POSOrderItem[];
  totalAmount: number;
  cashierId: string;
  cashierName: string;
  status: 'pending' | 'completed' | 'synced'; // Local state tracker
  offline: boolean; // Flag to trace if order was created while client was offline
  createdAt: string; // Server timestamp or fallback local ISO string
  scanned_document_data?: ScannedDocumentData; // Multimodal AI parsed receipt info
  ai_fraud_flag: boolean; // Real-time predictive flag (true/false)
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  discountAmount?: number;
  discountType?: 'percent' | 'cash';
  discountValue?: number;
  paymentMethod?: 'Cash' | 'Mobile Money' | 'Credit / Billed' | 'Card' | string;
}

// 7. Vendors & Suppliers
export interface Vendor {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  category: string;
  leadTimeDays: number;
  address?: string;
  website?: string;
  contractTerms?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  moq?: number;
}

// 8. Warehouse Locations
export interface WarehouseLocation {
  id: string;
  name: string;
  city: string;
  address: string;
}

// 9. HR Employee Time Cards
export interface TimeCardLog {
  id: string;
  userId: string;
  userName: string;
  role?: string;
  date?: string;
  clockIn: string;
  clockOut?: string;
  hoursWorked?: number;
  status: 'active' | 'completed';
}

export type TimeCard = TimeCardLog;

// 10. Financial Journal (Double-Entry Ledger)
export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  referenceId: string; // Order or purchase order reference
  type: 'POS_SALE' | 'STOCK_PURCHASE' | 'PAYROLL_DISBURSEMENT' | 'OPERATING_EXPENSE';
  debitAccount: 'Cash' | 'Accounts_Receivable' | 'Cost_of_Goods_Sold' | 'Operating_Expense' | 'Payroll_Expense';
  creditAccount: 'Sales_Revenue' | 'Inventory_Asset' | 'Cash' | 'Accounts_Payable';
  amount: number;
}

// 11. Audit Trail Tracker
export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTOCK' | 'VOID' | 'ALLOCATE' | 'EXPENSE_RECORD';
  affectedRecord: string;
  details: string;
  attachmentImage?: string; // base64 attachment for audit review
}

// 12. Petty Cash Allocation & Tracking
export interface PettyCashAllocation {
  id: string;
  amount: number;
  allocatedBy: string;
  allocatedByEmail: string;
  timestamp: string;
  notes: string;
}

export interface PettyCashExpense {
  id: string;
  amount: number;
  description: string;
  category: string;
  vendor: string;
  recordedBy: string;
  timestamp: string;
  receiptImage?: string; // base64
  receiptText?: string;  // parsed receipt info or LLM output
  department?: string;   // e.g. 'Sales', 'Marketing', 'Operations', 'HR', 'Hospitality', 'IT'
}

// 13. System Modular Builder & Workflow Customization
export type ERPModuleId = 
  | 'sysadmin'
  | 'builder'
  | 'pos'
  | 'crm'
  | 'customers'
  | 'inventory'
  | 'hr'
  | 'financials'
  | 'procurement'
  | 'petty_cash'
  | 'hospitality'
  | 'tasks'
  | 'messaging'
  | 'mobile_app';

export interface ERPModuleConfig {
  id: ERPModuleId;
  name: string;
  department: 'Administration' | 'Sales & Checkout' | 'CRM & Marketing' | 'Operations & Supply Chain' | 'Human Resources' | 'Finance & Accounting' | 'Hospitality & Services';
  enabled: boolean;
  order: number;
  description: string;
  iconName: string;
  linkedModuleIds: ERPModuleId[];
}

export interface CustomWorkflowRule {
  id: string;
  triggerModuleId: ERPModuleId;
  event: string;
  targetModuleId: ERPModuleId;
  action: string;
  enabled: boolean;
}

// 14. Hospitality & Room Management System / Channel Manager
export type RoomType = 'Executive Suite' | 'Deluxe Room' | 'Standard Double' | 'Hostel Dorm Bed' | 'Luxury Villa';
export type RoomStatus = 'Clean' | 'Dirty' | 'Occupied' | 'Maintenance' | 'Reserved';

export interface RoomPricingTier {
  standard: number;
  weekend: number;
  holiday: number;
}

export interface RoomMaintenanceLog {
  id: string;
  date: string;
  issue: string;
  technician: string;
  resolved: boolean;
}

export interface Room {
  id: string;
  number: string;
  name: string;
  type: RoomType | string;
  status: RoomStatus;
  nightlyRate: number;
  capacity: number;
  floor: string;
  amenities: string[];
  tags?: string[];
  notes?: string;
  pricingTiers?: RoomPricingTier;
  maintenanceHistory?: RoomMaintenanceLog[];
  channelsBlocked?: Array<'Airbnb' | 'Booking.com' | 'Hostelworld' | 'Direct Website'>;
}

// 15. External System Integrations & API Access Approval
export interface APIKeyRequest {
  id: string;
  appName: string; // e.g. "QuickBooks Online", "WooCommerce WP Store", "Xero Accounting"
  systemType: 'Wordpress / WooCommerce' | 'QuickBooks' | 'Xero' | 'Salesforce' | 'Zoho' | 'SAP' | 'Odoo' | 'Custom REST API';
  requestedByEmail: string;
  purpose: string;
  requestedScopes: string[]; // e.g. ['sales:write', 'inventory:read', 'bookings:write']
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  generatedApiKey?: string;
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface ConnectorErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  statusCode?: number;
  endpoint?: string;
  message: string;
  resolved?: boolean;
}

export interface ExternalConnectorConfig {
  id: string;
  systemName: string;
  systemKey: 'wave' | 'afriops' | 'milous' | 'quickbooks' | 'xero' | 'stripe' | 'custom';
  category: 'Accounting' | 'Logistics & Supply Chain' | 'Project Management' | 'E-Commerce & Payments' | 'ERP / Custom';
  description: string;
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  healthScore?: number; // 0 - 100%
  latencyMs?: number;
  totalApiCalls24h?: number;
  errorRate24h?: number; // percentage
  authType: 'api_key' | 'oauth2' | 'bearer_token';
  apiKey?: string;
  apiSecret?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthTenantId?: string;
  baseUrl?: string;
  webhookUrl?: string;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  lastSyncedAt?: string;
  recordsSyncedCount?: number;
  environment: 'production' | 'sandbox';
  enabledModules: string[];
  errorLogs?: ConnectorErrorLog[];
  updatedAt: string;
  updatedBy: string;
}

// 16. In-House Messaging & Team Chat
export interface InternalMessage {
  id: string;
  channelId: string; // e.g., 'general', 'housekeeping', 'frontdesk', 'maintenance', 'management', 'financials'
  recipientUid?: string; // Optional direct user recipient
  recipientRole?: UserRole; // Optional direct role target
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  roomTag?: string; // e.g., "102"
  bookingTag?: string; // e.g., "book_101"
  timestamp: string;
  readBy?: string[]; // Array of user UIDs who read the message
  convertedToTaskId?: string; // ID of task if AI parsed
}

// 17. Task & Todo Manager (Supervisor & User Collaboration)
export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'To Do' | 'In Progress' | 'Under Review' | 'Completed';
export type TaskCategory = 'POS & Sales' | 'Inventory' | 'Hospitality' | 'Financials' | 'System & Security' | 'General';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  assignedToUid: string;
  assignedToName: string;
  assignedToRole: UserRole;
  createdByUid: string;
  createdByName: string;
  createdByRole: UserRole;
  isSupervisorTask: boolean;
  dueDate: string; // YYYY-MM-DD
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  sourceMessageId?: string; // Linked message if AI-generated
  sourceMessageText?: string;
  supervisorNotes?: string;
  completionComment?: string;
}

// 18. Mobile & Tablet App Profiles with Preset Permissions
export interface MobileAppProfile {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userEmail: string;
  assignedModules: ERPModuleId[];
  pinCode?: string;
  appTitle: string;
  downloadToken: string;
  qrCodeDataUrl: string;
  createdAt: string;
  lastSyncAt?: string;
}

export type ChannelName = 'Airbnb' | 'Booking.com' | 'Hostelworld' | 'Direct Website' | 'Walk-In POS' | 'Walk-In Hostel Front Desk' | 'Google Calendar' | 'Outlook Calendar' | 'Expedia';

export interface RoomCharge {
  id: string;
  orderId?: string;
  description: string;
  amount: number;
  category: 'Shop / POS Purchase' | 'Minibar' | 'Room Service' | 'Spa / Amenities' | 'Laundry' | 'Maintenance / Damage' | 'Incidental' | 'Room Stay Extension';
  timestamp: string;
  billedBy: string;
  status: 'billed_to_room' | 'settled' | 'refunded';
}

export interface GuestAmenityRecommendation {
  id: string;
  name: string;
  category: RoomCharge['category'];
  price: number;
  confidenceScore: number; // 0 - 100 percentage
  justification: string;
  recommendedAction?: 'charge_folio' | 'add_to_cart';
  suggestedTags?: string[];
  popularityRank?: number;
}

export interface CheckoutInvoiceData {
  invoiceNumber: string;
  issuedAt: string;
  bookingId: string;
  roomNumber: string;
  roomType: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  crmCustomerId?: string;
  checkInDate: string;
  checkOutDate: string;
  nightsCount: number;
  sourceChannel: ChannelName;
  roomRate: number;
  accommodationTotal: number;
  charges: RoomCharge[];
  subtotal: number;
  taxesAndFees: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  settledBy: string;
  paymentMethod: string;
  dispatchedToEmail: string;
  emailDeliveryStatus: 'sent' | 'pending' | 'failed';
  emailDeliveryTimestamp?: string;
  pdfDataUri?: string;
}

export interface Booking {
  id: string;
  roomId: string;
  roomNumber: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestAddress?: string;
  guestIdType?: 'Passport' | 'National ID' | 'Drivers License' | 'Residency Card';
  guestIdNumber?: string;
  guestIdImage?: string; // base64 photo or URL
  guestParsedFromImage?: boolean;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  guestsCount: number;
  totalPrice: number;
  sourceChannel: ChannelName;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  paymentStatus: 'paid' | 'deposit' | 'pending' | 'unpaid' | 'partially_paid';
  specialRequests?: string;
  createdAt: string;
  onlineReceiptNumber?: string; // Online payment receipt # / transaction reference
  billingType?: 'pay_now_pos' | 'online_receipt' | 'bill_to_individual'; // Payment routing preference
  amountPaid?: number; // Total amount paid to date
  extendedStayHistory?: Array<{
    extendedAt: string;
    previousCheckOutDate: string;
    newCheckOutDate: string;
    additionalNights: number;
    additionalAmount: number;
    paymentMode: 'pay_now_pos' | 'pos' | 'online_receipt' | 'bill_to_individual';
    onlineReceiptNumber?: string;
  }>;
  roomCharges?: RoomCharge[];
  unassigned?: boolean;
  externalCalendarSync?: {
    provider: 'Google Calendar' | 'Outlook Calendar' | 'iCal';
    externalEventId?: string;
    syncedAt?: string;
    autoBlocked?: boolean;
  };
  checkoutNotes?: string;
  invoiceSentAt?: string;
  invoiceRecipientEmail?: string;
  invoiceNumber?: string;
  invoiceData?: CheckoutInvoiceData;
  posOrderId?: string; // Reference to POS checkout order
}

export interface StockDepartment {
  id: string;
  name: string;
  code: string;
  description?: string;
  managerName?: string;
}

export interface StockLocation {
  id: string;
  departmentId: string;
  departmentName: string;
  name: string;
  code: string;
  buildingOrAisle?: string;
}

export interface ChannelConnection {
  id: string;
  channelName: ChannelName;
  status: 'connected' | 'syncing' | 'disconnected';
  autoPriceSync: boolean;
  autoCalendarSync: boolean;
  iCalUrl?: string;
  apiKeyMasked?: string;
  lastSyncedAt?: string;
  activeListingsCount: number;
}

export interface ChannelSyncLog {
  id: string;
  channelName: string;
  event: string;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
  details: string;
}

// ----------------------------------------------------
// NGO & Skills Development Extension Types
// ----------------------------------------------------

export interface DonorGrant {
  id: string;
  grantCode: string; // e.g. "GRANT-2026-EU-SKILLS"
  donorName: string; // e.g. "European Union Development Fund", "USAID", "Mastercard Foundation"
  title: string; // e.g. "Youth Digital Skills & Vocational Empowerment"
  totalBudget: number;
  allocatedAmount: number;
  spentAmount: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'pending' | 'closed' | 'auditing';
  reportingFrequency: 'monthly' | 'quarterly' | 'annual';
  leadCoordinator: string;
  targetBeneficiaries: number;
  eligibleCategories: string[];
  linkedFormId?: string;
  linkedFormTitle?: string;
}

export interface ProjectBudget {
  id: string;
  projectCode: string; // e.g. "PRJ-2026-WATER"
  projectTitle: string; // e.g. "Community Water & Sanitation Project"
  sponsorName?: string; // e.g. "Tumi Web Donation Campaign" or "Global Fund"
  totalBudgetAmount: number;
  allocatedAmount: number;
  raisedAmount: number; // Real-time donations raised via linked Tumi Web Donation Forms
  spentAmount: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  leadManager: string;
  description?: string;
  linkedFormId?: string;
  linkedFormTitle?: string;
  targetBeneficiaries?: number;
}

export interface TraineeAttendanceLog {
  id: string;
  traineeId: string;
  traineeName: string;
  traineeEmail: string;
  badgeId: string; // QR / Barcode identification code
  programName: string;
  cohort: string;
  sessionDate: string; // YYYY-MM-DD
  sessionTopic: string;
  checkInTime: string; // HH:mm
  status: 'present' | 'late' | 'excused' | 'absent';
  notes?: string;
  verifiedBy: string;
}

export interface GraduatePlacementRecord {
  id: string;
  traineeId: string;
  traineeName: string;
  traineeEmail: string;
  traineePhone: string;
  programName: string;
  cohort: string;
  graduationDate: string;
  employmentStatus: 'employed_full_time' | 'employed_part_time' | 'self_employed_freelance' | 'business_founder' | 'apprenticeship_internship' | 'seeking_employment' | 'further_education';
  employerName?: string;
  jobTitle?: string;
  monthlySalary?: number;
  currency?: string;
  placementDate?: string;
  verificationStatus: 'verified' | 'pending_proof' | 'unconfirmed';
  notes?: string;
  followUps: {
    period: '30_days' | '90_days' | '180_days';
    date: string;
    stillEmployed: boolean;
    feedbackNotes: string;
    conductedBy: string;
  }[];
}

export interface DigitalCertificate {
  id: string;
  certificateNumber: string; // e.g. "CERT-2026-SKILLS-90142"
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  programName: string;
  trackSpecialization: string;
  completionDate: string;
  issueDate: string;
  gradeOrHonors: 'Distinction' | 'Merit' | 'Pass' | 'Certified Practitioner';
  issuingOrganization: string;
  donorSponsorName?: string;
  accreditedBy?: string;
  qrVerificationCode: string;
  pdfDataUri?: string;
  verificationUrl?: string;
  emailDispatchedAt?: string;
}

// 21b. Google Forms-Style Graduate Assessment & Tracer Forms
export type FormQuestionType = 
  | 'short_answer' 
  | 'paragraph' 
  | 'multiple_choice' 
  | 'checkboxes' 
  | 'dropdown' 
  | 'linear_scale' 
  | 'date';

export interface FormQuestion {
  id: string;
  title: string;
  type: FormQuestionType;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  required: boolean;
  helpText?: string;
}

export interface GraduateAssessmentForm {
  id: string;
  title: string;
  description: string;
  category: 'tracer_study' | 'career_growth' | 'impact_assessment' | 'employer_evaluation' | 'general';
  targetPeriod: '6_months' | '1_year' | '2_years' | 'custom';
  isTemplate: boolean;
  status: 'published' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  questions: FormQuestion[];
  themeColor?: string;
  responseCount?: number;
  tags?: string[];
}

export interface GraduateFormResponse {
  id: string;
  formId: string;
  formTitle: string;
  graduateId: string;
  graduateName: string;
  graduateEmail: string;
  graduatePhone?: string;
  programName: string;
  cohort: string;
  milestone: '6_months' | '1_year' | '2_years' | 'custom';
  submittedAt: string;
  answers: Record<string, any>;
  verified: boolean;
  employmentStatusReported?: string;
  monthlySalaryReported?: number;
  satisfactionScore?: number;
  reviewerNotes?: string;
}

export interface ProgramAssessmentMilestoneAlerts {
  sixMonths: boolean;
  oneYear: boolean;
  twoYears: boolean;
  customMonths?: number;
  alertRecipients: ('ceo' | 'manager')[];
  linkedFormIds?: {
    sixMonths?: string;
    oneYear?: string;
    twoYears?: string;
  };
  calculatedDates?: {
    completionDate: string;
    sixMonthsDate: string;
    oneYearDate: string;
    twoYearsDate: string;
  };
}

// 22. Professional Financial & Accounting Software Types
export type AccountCategory = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cogs';

export interface ChartOfAccount {
  code: string; // e.g., '1010', '1200', '2010', '3010', '4010', '5010'
  name: string;
  category: AccountCategory;
  subcategory: 'current_asset' | 'non_current_asset' | 'current_liability' | 'long_term_liability' | 'equity' | 'operating_revenue' | 'cogs' | 'operating_expense';
  balance: number;
  description: string;
  isSystem?: boolean;
  normalBalance?: 'debit' | 'credit';
}

export interface ReceiptItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ReceiptScanData {
  merchantName?: string;
  date?: string;
  totalAmount?: number;
  taxAmount?: number;
  currency?: string;
  category?: string;
  suggestedAccountCode?: string;
  suggestedAccountName?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  lineItems?: ReceiptItem[];
  rawText?: string;
  confidence?: number;
}

export interface CashFlowRecord {
  id: string;
  date: string;
  type: 'operating' | 'investing' | 'financing';
  direction: 'inflow' | 'outflow';
  amount: number;
  category: string;
  reference: string;
  description: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Card' | 'Check' | 'Digital Wallet';
  recordedBy: string;
  activity?: string;
  counterparty?: string;
  receiptImage?: string; // base64 or photo URL
  receiptFileName?: string;
  receiptFileType?: string;
  receiptUploadedAt?: string;
  receiptScanData?: ReceiptScanData;
  accountCode?: string; // Chart of Accounts code (e.g. '5010')
  accountName?: string; // Chart of Accounts name
  taxDeductible?: boolean;
  status?: 'draft' | 'pending_review' | 'verified' | 'reconciled';
}

export interface SystemMigrationJob {
  id: string;
  systemName: string;
  systemCategory: 'accounting' | 'hr' | 'crm';
  recordsImported: number;
  status: 'idle' | 'in_progress' | 'completed' | 'failed';
  timestamp: string;
  summary: string;
  details?: Record<string, any>;
}

export interface FixedAssetRecord {
  id: string;
  assetTag: string;
  name: string;
  category: 'machinery' | 'vehicle' | 'vehicles' | 'it_equipment' | 'furniture_fixtures' | 'furniture' | 'building_leasehold' | 'buildings';
  purchaseDate: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  depreciationMethod: 'straight_line';
  accumulatedDepreciation: number;
  currentBookValue: number;
  status: 'active' | 'under_maintenance' | 'maintenance' | 'disposed';
  location: string;
  tag?: string;
}

export interface InventoryValuationSnapshot {
  id: string;
  date: string;
  method: 'FIFO' | 'Weighted_Average';
  totalUnits: number;
  totalAssetValue: number;
  cogsCalculated: number;
  writeDownAmount: number;
  status: 'verified' | 'reconciled';
}

// 23. Comprehensive Human Resources & RBAC Types
export interface LeaveRequestRecord {
  id: string;
  userId: string;
  userName: string;
  employeeName?: string;
  employeeId?: string;
  role: UserRole;
  leaveType: 'annual' | 'sick' | 'personal' | 'unpaid' | 'maternity_paternity';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
}

export interface PerformanceReviewRecord {
  id: string;
  userId: string;
  userName: string;
  employeeName?: string;
  role: UserRole;
  reviewerId: string;
  reviewerName: string;
  reviewDate: string;
  period: 'Q1 2026' | 'Q2 2026' | 'Q3 2026' | 'Q4 2026' | 'Annual 2026' | string;
  overallRating: number; // 1 to 5
  rating?: number;
  keyAchievements: string;
  achievements?: string;
  developmentAreas: string;
  areasForImprovement?: string;
  goalsNextPeriod: string;
  status: 'draft' | 'completed';
}

export interface EmployeePayrollSlip {
  employeeId: string;
  employeeName: string;
  role: UserRole;
  department?: string;
  baseSalary: number;
  overtimeOrBonuses?: number;
  taxWithheld?: number;
  deductions?: number;
  storeDeduction?: number;
  loanAdvanceDeduction?: number;
  netPay?: number;
  insurancePensionDeductions?: number;
  netPayable?: number;
  status?: 'paid' | 'pending' | 'disbursed';
}

export interface PayrollRunRecord {
  id: string;
  payPeriod?: string;
  period?: string;
  runDate?: string;
  runBy?: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeesCount?: number;
  employeeCount?: number;
  processedAt?: string;
  status: 'processed' | 'pending' | 'disbursed';
  items: EmployeePayrollSlip[];
}

// 23. Tumi Project Web Donation & Payment Plugin Interfaces
export interface WebDonationFormConfig {
  id: string;
  title: string;
  subtitle: string;
  campaignTarget: string;
  campaignGoalAmount?: number;
  currency: string;
  suggestedAmounts: number[];
  allowCustomAmount: boolean;
  allowRecurring: boolean;
  defaultRecurringInterval: 'one_time' | 'monthly' | 'annually';
  collectPhone: boolean;
  collectAddress: boolean;
  collectMessage?: boolean;
  enableGiftAid: boolean;
  buttonText: string;
  primaryColor: string;
  theme: 'indigo' | 'emerald' | 'dark' | 'amber' | 'rose';
  redirectSuccessUrl?: string;
  linkedGrantCode?: string;
  linkedProjectId?: string;
  linkedProjectTitle?: string;
  createdDate: string;
  totalRaised?: number;
  donorCount?: number;
}

export interface WebDonationTransaction {
  id: string;
  formId: string;
  formTitle: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  donorAddress?: string;
  donorMessage?: string;
  amount: number;
  currency: string;
  isRecurring: boolean;
  recurringInterval?: 'monthly' | 'annually' | 'quarterly';
  paymentMethod: 'credit_card' | 'apple_pay' | 'mollie' | 'ideal' | 'paypal' | 'mobile_money';
  paymentStatus: 'completed' | 'processing' | 'failed';
  transactionRef: string;
  giftAidClaimed: boolean;
  createdAt: string;
  linkedGrantCode?: string;
  linkedProjectId?: string;
  linkedProjectTitle?: string;
  receiptNumber: string;
}

// 24. Donor Profiles (Donor Database) & Captured Donor Lead Records (Separate Database)
export interface DonorProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  totalDonated: number;
  donationCount: number;
  firstDonationDate: string;
  lastDonationDate: string;
  status: 'active' | 'recurring' | 'lapsed' | 'vip';
  frequencyCategory?: 'one_time' | 'monthly' | 'quarterly' | 'annually';
  tags?: string[];
  linkedGrants?: string[];
  notes?: string;
  donationsHistory: {
    transactionId: string;
    receiptNumber: string;
    amount: number;
    currency: string;
    date: string;
    formTitle: string;
    paymentMethod: string;
    donorMessage?: string;
  }[];
}

export interface CapturedDonorRecord {
  id: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  donorAddress?: string;
  donorMessage?: string;
  donationAmount: number;
  currency: string;
  capturedAt: string;
  formId: string;
  formTitle: string;
  paymentMethod: string;
  receiptNumber: string;
  syncStatus: 'captured' | 'synced_to_crm' | 'exported';
  databaseSource: 'External Web Capture Database';
}





