/**
 * studentStaffStore.ts
 * Manages persistent state for:
 * 1. Student Onboarding, Registration & 3-Trench Maintenance Fee Accounting
 * 2. Graduate Microfinancing Loan System (CEO Approval -> Accountant Release -> Graduate Confirmation)
 * 3. Staff Advances, Loans & In-Store POS Purchases
 * 4. Staff Probation 2-Week Alerts & AI Appraisal Questionnaires
 * 5. Staff Attendance (CSV Reconciliation) & Smart Shift Roster with Ghana Holiday Double Pay
 */

export interface MaintenancePayment {
  id: string;
  amount: number;
  date: string;
  receiptNumber: string;
  paymentMethod: 'Cash' | 'Mobile Money' | 'Bank Transfer';
  recordedBy: string;
  note?: string;
}

export interface TrenchDetails {
  trenchNumber: 1 | 2 | 3;
  monthsRange: string; // e.g. "Months 1 - 6"
  targetAmount: number; // e.g. 1/3rd of total fee
  paidAmount: number;
  dueDate: string;
  status: 'compliant' | 'partially_paid' | 'overdue' | 'completed';
  payments: MaintenancePayment[];
}

export interface StudentRegistrationRecord {
  id: string;
  name: string;
  dateOfBirth: string;
  phoneNumber: string;
  location: string;
  educationalBackground: Array<'primary' | 'jhs' | 'shs' | 'degree' | 'postgraduate' | 'masters' | 'no_education'>;
  previousSewingExperience: boolean;
  sewingExperienceDetails?: string;
  hasKids: boolean;
  contactPersonName: string;
  contactPersonRelation: string;
  contactPersonPhone: string;
  idType: 'national_id' | 'voters_id' | 'nhia_id' | 'drivers_license';
  idNumber: string;
  idPhotoUrl?: string;
  enrollmentDate: string;
  programName: string;
  cohort: string;
  status: 'active' | 'graduated' | 'suspended' | 'completed';
  
  // Maintenance Fee in 3 Trenches (6 months each)
  maintenanceFeeTotal: number; // e.g. 3000 GHS
  trenches: {
    trench1: TrenchDetails;
    trench2: TrenchDetails;
    trench3: TrenchDetails;
  };
  totalPaid: number;
  totalOutstanding: number;
  accountStatus: 'cleared' | 'pending' | 'overdue';
  
  // Store POS Billed Charges
  storePurchases?: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    status: 'unpaid' | 'paid';
  }>;
}

export interface GraduateMicroLoanRecord {
  id: string;
  graduateId: string;
  graduateName: string;
  graduatePhone: string;
  programCompleted: string;
  graduationYear: string;
  loanAmount: number;
  interestRatePercentage: number;
  repaymentFrequency: 'weekly' | 'biweekly' | 'monthly';
  totalDurationWeeksOrMonths: number;
  installmentAmount: number;
  purpose: string;
  applicationDate: string;
  
  // Workflow States
  status: 'pending' | 'verified' | 'approved' | 'disbursed' | 'pending_ceo_approval' | 'approved_by_ceo' | 'rejected_by_ceo' | 'disbursed_by_accountant' | 'confirmed_by_graduate' | 'repaying' | 'completed' | 'rejected';
  verification?: {
    verifiedBy: string;
    verifiedAt: string;
    notes?: string;
  };
  ceoApproval?: {
    approvedBy: string;
    date: string;
    notes?: string;
    digitalSignature?: string;
    authorizationCode?: string;
    remarks?: string;
  };
  accountantDisbursement?: {
    disbursedBy: string;
    date: string;
    paymentReference: string;
    disbursementMethod: 'Bank Transfer' | 'Mobile Money' | 'Cash Voucher';
  };
  graduateConfirmation?: {
    confirmedAt: string;
    signatureOrPin: string;
  };
  repayments: Array<{
    id: string;
    installmentNumber: number;
    dueDate: string;
    amountDue: number;
    amountPaid: number;
    paidDate?: string;
    status: 'pending' | 'paid' | 'overdue';
  }>;
  totalRepaid: number;
  remainingBalance: number;
}

export interface StaffSalaryAdvanceLoan {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  type: 'advance' | 'loan';
  amount: number;
  monthlyDeduction: number;
  deductionType?: 'cash' | 'percentage'; // Cash (fixed GHS) or Percentage of monthly salary
  deductionValue?: number;               // Deduction value (e.g. GHS 300 or 15%)
  remainingBalance: number;
  requestDate: string;
  purpose: string;
  status: 'pending' | 'verified' | 'approved' | 'disbursed' | 'active' | 'repaid' | 'rejected';
  verification?: {
    verifiedBy: string;
    verifiedAt: string;
    notes?: string;
  };
  ceoApproval?: {
    approvedBy: string;
    approvedAt: string;
    digitalSignature?: string;
    remarks?: string;
    authorizationCode?: string;
  };
  disbursement?: {
    disbursedBy: string;
    disbursedAt: string;
    method: 'Mobile Money' | 'Bank Transfer' | 'Cash Voucher';
    paymentReference: string;
    notes?: string;
  };
  approvedBy?: string;
  approvedDate?: string;
}

export interface StaffStoreCharge {
  id: string;
  staffId: string;
  staffName: string;
  orderId: string;
  itemsDescription: string;
  amount: number;
  date: string;
  status: 'pending_payroll_deduction' | 'deducted' | 'settled_cash';
  billedBy?: string;
}

export interface StaffProbationAlert {
  staffId: string;
  staffName: string;
  role: string;
  employmentType: 'full_time' | 'part_time' | 'probation' | 'other' | 'fulltime' | 'one_time';
  probationDurationMonths?: 3 | 6;
  startDate: string;
  probationEndDate: string;
  reminderTriggerDate: string; // 2 weeks before probationEndDate
  isAlertActive: boolean;
  appraisalDraftId?: string;
}

export interface HalfShiftConfig {
  roleName: string; // e.g. "Housekeeping", "Front Desk", "Kitchen & Catering"
  colorCategory: 'emerald' | 'indigo' | 'amber' | 'rose' | 'teal' | 'purple';
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "12:00"
  tasks?: string[];
}

export interface ShiftRosterRecord {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  date: string; // YYYY-MM-DD
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'off' | 'split_half_shifts';
  startTime: string;
  endTime: string;
  isHoliday: boolean;
  holidayName?: string;
  doublePayApplicable: boolean;
  isExtraShift: boolean;
  swapRequested: boolean;
  swapWithStaffId?: string;
  swapWithStaffName?: string;
  swapStatus?: 'none' | 'pending_approval' | 'approved' | 'rejected';
  swapApprovedBy?: string;

  // Multi-Role Half Shift & Card Color Tasking
  morningHalfShift?: HalfShiftConfig;
  afternoonHalfShift?: HalfShiftConfig;
  tasks?: string[];
  cardColor?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'teal' | 'purple';
}

export interface AttendanceCsvRow {
  employeeId: string;
  employeeName: string;
  date: string;
  clockInTime: string;
  clockOutTime: string;
  hoursWorked: number;
  isHoliday: boolean;
  status: 'present' | 'late' | 'absent' | 'leave';
}

// Official Ghana Statutory Holidays
export const GHANA_HOLIDAYS_2026: Array<{ date: string; name: string }> = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-01-07', name: 'Constitution Day' },
  { date: '2026-03-06', name: 'Independence Day' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-06', name: 'Easter Monday' },
  { date: '2026-05-01', name: "Workers' Day" },
  { date: '2026-05-25', name: 'Africa Union Day' },
  { date: '2026-06-17', name: 'Eid al-Adha (estimated)' },
  { date: '2026-08-04', name: "Founders' Day" },
  { date: '2026-09-21', name: 'Kwame Nkrumah Memorial Day' },
  { date: '2026-12-04', name: "National Farmers' Day" },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-12-26', name: 'Boxing Day' },
];

export function isGhanaHoliday(dateStr: string): { isHoliday: boolean; holidayName?: string } {
  const match = GHANA_HOLIDAYS_2026.find(h => h.date === dateStr);
  if (match) return { isHoliday: true, holidayName: match.name };
  return { isHoliday: false };
}

// Initial Seed Data
const INITIAL_STUDENTS: StudentRegistrationRecord[] = [
  {
    id: 'std_101',
    name: 'Akua Mansa Afriyie',
    dateOfBirth: '2004-05-14',
    phoneNumber: '+233 24 555 1201',
    location: 'Kumasi, Ashanti Region',
    educationalBackground: ['shs', 'primary', 'jhs'],
    previousSewingExperience: true,
    sewingExperienceDetails: 'Apprenticed with local seamstress for 8 months in basic embroidery',
    hasKids: false,
    contactPersonName: 'Kwabena Afriyie',
    contactPersonRelation: 'Father',
    contactPersonPhone: '+233 20 888 4412',
    idType: 'national_id',
    idNumber: 'GHA-789012345-1',
    enrollmentDate: '2026-01-15',
    programName: 'Vocational Sewing & Fashion Tech',
    cohort: 'Cohort 2026-A',
    status: 'active',
    maintenanceFeeTotal: 3000,
    trenches: {
      trench1: {
        trenchNumber: 1,
        monthsRange: 'Months 1 - 6 (Foundations)',
        targetAmount: 1000,
        paidAmount: 1000,
        dueDate: '2026-07-15',
        status: 'completed',
        payments: [
          { id: 'p_1', amount: 500, date: '2026-01-20', receiptNumber: 'REC-TR1-01', paymentMethod: 'Mobile Money', recordedBy: 'Adwoa Reception' },
          { id: 'p_2', amount: 500, date: '2026-03-10', receiptNumber: 'REC-TR1-02', paymentMethod: 'Cash', recordedBy: 'Kwame Accountant' }
        ]
      },
      trench2: {
        trenchNumber: 2,
        monthsRange: 'Months 7 - 12 (Advanced Tailoring)',
        targetAmount: 1000,
        paidAmount: 400,
        dueDate: '2027-01-15',
        status: 'partially_paid',
        payments: [
          { id: 'p_3', amount: 400, date: '2026-08-05', receiptNumber: 'REC-TR2-01', paymentMethod: 'Mobile Money', recordedBy: 'Kwame Accountant' }
        ]
      },
      trench3: {
        trenchNumber: 3,
        monthsRange: 'Months 13 - 18 (Entrepreneurship)',
        targetAmount: 1000,
        paidAmount: 0,
        dueDate: '2027-07-15',
        status: 'partially_paid',
        payments: []
      }
    },
    totalPaid: 1400,
    totalOutstanding: 1600,
    accountStatus: 'pending',
    storePurchases: [
      { id: 'sp_1', description: 'Industrial Tailoring Shears & Tape Measure', amount: 120, date: '2026-08-12', status: 'unpaid' }
    ]
  },
  {
    id: 'std_102',
    name: 'Grace Serwaa Boateng',
    dateOfBirth: '2002-11-20',
    phoneNumber: '+233 50 333 9982',
    location: 'Bantama, Kumasi',
    educationalBackground: ['shs'],
    previousSewingExperience: false,
    sewingExperienceDetails: 'None - complete beginner passionate about fashion design',
    hasKids: true,
    contactPersonName: 'Dorothy Boateng',
    contactPersonRelation: 'Mother',
    contactPersonPhone: '+233 27 777 0019',
    idType: 'voters_id',
    idNumber: 'VOT-GH-99882211',
    enrollmentDate: '2026-02-01',
    programName: 'Garment Construction & Design',
    cohort: 'Cohort 2026-A',
    status: 'active',
    maintenanceFeeTotal: 3000,
    trenches: {
      trench1: {
        trenchNumber: 1,
        monthsRange: 'Months 1 - 6 (Foundations)',
        targetAmount: 1000,
        paidAmount: 200, // Delinquent (< 1/3rd paid by close of trench)
        dueDate: '2026-08-01',
        status: 'overdue',
        payments: [
          { id: 'p_4', amount: 200, date: '2026-02-10', receiptNumber: 'REC-TR1-03', paymentMethod: 'Cash', recordedBy: 'Adwoa Reception' }
        ]
      },
      trench2: {
        trenchNumber: 2,
        monthsRange: 'Months 7 - 12 (Advanced Tailoring)',
        targetAmount: 1000,
        paidAmount: 0,
        dueDate: '2027-02-01',
        status: 'partially_paid',
        payments: []
      },
      trench3: {
        trenchNumber: 3,
        monthsRange: 'Months 13 - 18 (Entrepreneurship)',
        targetAmount: 1000,
        paidAmount: 0,
        dueDate: '2027-08-01',
        status: 'partially_paid',
        payments: []
      }
    },
    totalPaid: 200,
    totalOutstanding: 2800,
    accountStatus: 'overdue'
  },
  {
    id: 'std_103',
    name: 'Eunice Osei Bonsu',
    dateOfBirth: '2003-08-09',
    phoneNumber: '+233 24 111 8844',
    location: 'Asokwa, Kumasi',
    educationalBackground: ['degree', 'shs'],
    previousSewingExperience: true,
    sewingExperienceDetails: 'Pattern drafting self-taught on YouTube',
    hasKids: false,
    contactPersonName: 'Pastor Stephen Bonsu',
    contactPersonRelation: 'Guardian',
    contactPersonPhone: '+233 20 444 3322',
    idType: 'nhia_id',
    idNumber: 'NHIA-00994411',
    enrollmentDate: '2026-01-10',
    programName: 'Industrial Apparel Manufacturing',
    cohort: 'Cohort 2026-A',
    status: 'active',
    maintenanceFeeTotal: 3000,
    trenches: {
      trench1: {
        trenchNumber: 1,
        monthsRange: 'Months 1 - 6 (Foundations)',
        targetAmount: 1000,
        paidAmount: 1000,
        dueDate: '2026-07-10',
        status: 'completed',
        payments: [
          { id: 'p_5', amount: 1000, date: '2026-01-12', receiptNumber: 'REC-TR1-04', paymentMethod: 'Bank Transfer', recordedBy: 'Kwame Accountant' }
        ]
      },
      trench2: {
        trenchNumber: 2,
        monthsRange: 'Months 7 - 12 (Advanced Tailoring)',
        targetAmount: 1000,
        paidAmount: 1000,
        dueDate: '2027-01-10',
        status: 'completed',
        payments: [
          { id: 'p_6', amount: 1000, date: '2026-07-14', receiptNumber: 'REC-TR2-02', paymentMethod: 'Mobile Money', recordedBy: 'Kwame Accountant' }
        ]
      },
      trench3: {
        trenchNumber: 3,
        monthsRange: 'Months 13 - 18 (Entrepreneurship)',
        targetAmount: 1000,
        paidAmount: 1000,
        dueDate: '2027-07-10',
        status: 'completed',
        payments: [
          { id: 'p_7', amount: 1000, date: '2026-09-01', receiptNumber: 'REC-TR3-01', paymentMethod: 'Cash', recordedBy: 'Kwame Accountant' }
        ]
      }
    },
    totalPaid: 3000,
    totalOutstanding: 0,
    accountStatus: 'cleared'
  }
];

const INITIAL_GRADUATE_LOANS: GraduateMicroLoanRecord[] = [
  {
    id: 'loan_grad_001',
    graduateId: 'grad_2025_09',
    graduateName: 'Abena Kyerewaa',
    graduatePhone: '+233 24 990 1234',
    programCompleted: 'Vocational Sewing & Fashion Tech',
    graduationYear: '2025',
    loanAmount: 2500,
    interestRatePercentage: 5,
    repaymentFrequency: 'monthly',
    totalDurationWeeksOrMonths: 6,
    installmentAmount: 437.5,
    purpose: 'Procure 1 Juki Industrial Direct-Drive Sewing Machine for start-up workshop',
    applicationDate: '2026-08-15',
    status: 'confirmed_by_graduate',
    ceoApproval: {
      approvedBy: 'Samuel Mireku (CEO)',
      date: '2026-08-18',
      notes: 'Approved under Tumi Women Entrepreneurship Seed Capital Fund.'
    },
    accountantDisbursement: {
      disbursedBy: 'Kwame Boateng (Accountant)',
      date: '2026-08-20',
      paymentReference: 'MOMO-DISB-998811',
      disbursementMethod: 'Mobile Money'
    },
    graduateConfirmation: {
      confirmedAt: '2026-08-21T10:30:00Z',
      signatureOrPin: 'Verified via OTP PIN: 8812'
    },
    repayments: [
      { id: 'rep_1', installmentNumber: 1, dueDate: '2026-09-20', amountDue: 437.5, amountPaid: 437.5, paidDate: '2026-09-19', status: 'paid' },
      { id: 'rep_2', installmentNumber: 2, dueDate: '2026-10-20', amountDue: 437.5, amountPaid: 0, status: 'pending' },
      { id: 'rep_3', installmentNumber: 3, dueDate: '2026-11-20', amountDue: 437.5, amountPaid: 0, status: 'pending' },
      { id: 'rep_4', installmentNumber: 4, dueDate: '2026-12-20', amountDue: 437.5, amountPaid: 0, status: 'pending' },
      { id: 'rep_5', installmentNumber: 5, dueDate: '2027-01-20', amountDue: 437.5, amountPaid: 0, status: 'pending' },
      { id: 'rep_6', installmentNumber: 6, dueDate: '2027-02-20', amountDue: 437.5, amountPaid: 0, status: 'pending' }
    ],
    totalRepaid: 437.5,
    remainingBalance: 2187.5
  },
  {
    id: 'loan_grad_002',
    graduateId: 'grad_2025_14',
    graduateName: 'Comfort Dankwa',
    graduatePhone: '+233 50 112 4499',
    programCompleted: 'Garment Construction & Design',
    graduationYear: '2025',
    loanAmount: 1800,
    interestRatePercentage: 4,
    repaymentFrequency: 'biweekly',
    totalDurationWeeksOrMonths: 12,
    installmentAmount: 156,
    purpose: 'Initial fabric rolls and industrial steam ironing station',
    applicationDate: '2026-09-10',
    status: 'approved_by_ceo',
    ceoApproval: {
      approvedBy: 'Samuel Mireku (CEO)',
      date: '2026-09-12',
      notes: 'Strong business plan. Awaiting disbursement from Accountant.'
    },
    repayments: [],
    totalRepaid: 0,
    remainingBalance: 1872
  },
  {
    id: 'loan_grad_003',
    graduateId: 'grad_2025_22',
    graduateName: 'Patricia Yeboah',
    graduatePhone: '+233 27 665 0091',
    programCompleted: 'Industrial Apparel Manufacturing',
    graduationYear: '2025',
    loanAmount: 3200,
    interestRatePercentage: 5,
    repaymentFrequency: 'weekly',
    totalDurationWeeksOrMonths: 16,
    installmentAmount: 210,
    purpose: 'Overlock 4-thread machine and cutting table for bridal workshop',
    applicationDate: '2026-09-18',
    status: 'pending_ceo_approval',
    repayments: [],
    totalRepaid: 0,
    remainingBalance: 3360
  }
];

const INITIAL_STAFF_LOANS: StaffSalaryAdvanceLoan[] = [
  {
    id: 'sla_01',
    staffId: 'usr_reception_01',
    staffName: 'Adwoa Sarfo',
    staffRole: 'receptionist',
    type: 'advance',
    amount: 500,
    monthlyDeduction: 500,
    remainingBalance: 500,
    requestDate: '2026-09-05',
    purpose: 'Emergency family medical expenses',
    status: 'approved',
    approvedBy: 'CEO Samuel Mireku',
    approvedDate: '2026-09-06'
  },
  {
    id: 'sla_02',
    staffId: 'usr_hk_02',
    staffName: 'Kwesi Mensah',
    staffRole: 'housekeeping',
    type: 'loan',
    amount: 1800,
    monthlyDeduction: 300,
    remainingBalance: 1200,
    requestDate: '2026-06-10',
    purpose: 'Children school fees tuition payment',
    status: 'active',
    approvedBy: 'CEO Samuel Mireku',
    approvedDate: '2026-06-12'
  }
];

const INITIAL_STAFF_STORE_CHARGES: StaffStoreCharge[] = [
  {
    id: 'ssc_01',
    staffId: 'usr_reception_01',
    staffName: 'Adwoa Sarfo',
    orderId: 'ORD-POS-8891',
    itemsDescription: 'Hostel Shop: 2x Bottled Water, 1x Shower Gel',
    amount: 45,
    date: '2026-09-14',
    status: 'pending_payroll_deduction'
  },
  {
    id: 'ssc_02',
    staffId: 'usr_hk_02',
    staffName: 'Kwesi Mensah',
    orderId: 'ORD-POS-9012',
    itemsDescription: 'Tumi Boutique: 1x Handcrafted Fabric Bag',
    amount: 120,
    date: '2026-09-18',
    status: 'pending_payroll_deduction'
  }
];

export class StudentStaffStore {
  private static STORAGE_KEY_STUDENTS = 'tumi_erp_students_data_v2';
  private static STORAGE_KEY_STAFF_EXTENDED = 'tumi_erp_staff_extended_records_v1';
  private static STORAGE_KEY_GRAD_LOANS = 'tumi_erp_grad_loans_v2';
  private static STORAGE_KEY_STAFF_LOANS = 'tumi_erp_staff_advances_v2';
  private static STORAGE_KEY_STAFF_STORE = 'tumi_erp_staff_store_charges_v2';
  private static STORAGE_KEY_ROSTER = 'tumi_erp_shift_roster_v2';
  private static STORAGE_KEY_DEFAULT_TRENCH_FEE = 'tumi_erp_default_trench_fee_v2';

  static getDefaultTrenchMaintenanceFee(): number {
    const raw = localStorage.getItem(this.STORAGE_KEY_DEFAULT_TRENCH_FEE);
    if (!raw) return 3000;
    try {
      const val = Number(raw);
      return isNaN(val) || val <= 0 ? 3000 : val;
    } catch {
      return 3000;
    }
  }

  static setDefaultTrenchMaintenanceFee(fee: number, updatedBy: string = 'CEO / Manager') {
    if (fee <= 0) return;
    localStorage.setItem(this.STORAGE_KEY_DEFAULT_TRENCH_FEE, fee.toString());
  }

  static updateStudentTrenchFee(studentId: string, newTotalFee: number, updatedBy: string = 'CEO / Manager'): StudentRegistrationRecord | null {
    const list = this.getStudents();
    let updatedRecord: StudentRegistrationRecord | null = null;
    const targetPerTrench = Math.round(newTotalFee / 3);

    const updated = list.map(st => {
      if (st.id !== studentId) return st;

      const t1Paid = st.trenches.trench1.paidAmount;
      const t2Paid = st.trenches.trench2.paidAmount;
      const t3Paid = st.trenches.trench3.paidAmount;
      const totalPaid = t1Paid + t2Paid + t3Paid;
      const totalOutstanding = Math.max(0, newTotalFee - totalPaid);

      const modified: StudentRegistrationRecord = {
        ...st,
        maintenanceFeeTotal: newTotalFee,
        trenches: {
          trench1: {
            ...st.trenches.trench1,
            targetAmount: targetPerTrench,
            status: t1Paid >= targetPerTrench ? 'completed' : 'partially_paid'
          },
          trench2: {
            ...st.trenches.trench2,
            targetAmount: targetPerTrench,
            status: t2Paid >= targetPerTrench ? 'completed' : 'partially_paid'
          },
          trench3: {
            ...st.trenches.trench3,
            targetAmount: targetPerTrench,
            status: t3Paid >= targetPerTrench ? 'completed' : 'partially_paid'
          }
        },
        totalPaid,
        totalOutstanding,
        accountStatus: totalOutstanding === 0 ? 'cleared' : 'pending'
      };
      updatedRecord = modified;
      return modified;
    });

    this.saveStudents(updated);
    return updatedRecord;
  }

  static getStudents(): StudentRegistrationRecord[] {
    const raw = localStorage.getItem(this.STORAGE_KEY_STUDENTS);
    if (!raw) {
      this.saveStudents(INITIAL_STUDENTS);
      return INITIAL_STUDENTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_STUDENTS;
    }
  }

  static saveStudents(data: StudentRegistrationRecord[]) {
    localStorage.setItem(this.STORAGE_KEY_STUDENTS, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tumi_students_updated'));
    }
  }

  static addStudent(student: Omit<StudentRegistrationRecord, 'id' | 'totalPaid' | 'totalOutstanding' | 'accountStatus'>): StudentRegistrationRecord {
    const students = this.getStudents();
    const id = 'std_' + Date.now();
    const t1Paid = student.trenches.trench1.paidAmount || 0;
    const t2Paid = student.trenches.trench2.paidAmount || 0;
    const t3Paid = student.trenches.trench3.paidAmount || 0;
    const totalPaid = t1Paid + t2Paid + t3Paid;
    const totalOutstanding = Math.max(0, student.maintenanceFeeTotal - totalPaid);

    const newRecord: StudentRegistrationRecord = {
      ...student,
      id,
      totalPaid,
      totalOutstanding,
      accountStatus: totalOutstanding === 0 ? 'cleared' : (student.trenches.trench1.status === 'overdue' ? 'overdue' : 'pending')
    };

    const updated = [newRecord, ...students];
    this.saveStudents(updated);
    return newRecord;
  }

  static updateStudent(studentId: string, updates: Partial<StudentRegistrationRecord>): StudentRegistrationRecord | null {
    const students = this.getStudents();
    let updatedRecord: StudentRegistrationRecord | null = null;
    const updated = students.map(st => {
      if (st.id !== studentId) return st;
      const modified = { ...st, ...updates };
      const t1Paid = modified.trenches.trench1.paidAmount || 0;
      const t2Paid = modified.trenches.trench2.paidAmount || 0;
      const t3Paid = modified.trenches.trench3.paidAmount || 0;
      const totalPaid = t1Paid + t2Paid + t3Paid;
      const totalOutstanding = Math.max(0, modified.maintenanceFeeTotal - totalPaid);
      modified.totalPaid = totalPaid;
      modified.totalOutstanding = totalOutstanding;
      modified.accountStatus = totalOutstanding === 0 ? 'cleared' : (modified.trenches.trench1.status === 'overdue' ? 'overdue' : 'pending');
      updatedRecord = modified;
      return modified;
    });
    this.saveStudents(updated);
    return updatedRecord;
  }

  static deleteStudent(studentId: string): boolean {
    const students = this.getStudents();
    const filtered = students.filter(st => st.id !== studentId);
    if (filtered.length !== students.length) {
      this.saveStudents(filtered);
      return true;
    }
    return false;
  }

  // --- STAFF MANAGEMENT METHODS ---
  static getStaffList(): any[] {
    const raw = localStorage.getItem(this.STORAGE_KEY_STAFF_EXTENDED);
    if (raw) {
      try { return JSON.parse(raw); } catch { /* ignore */ }
    }
    const usersRaw = localStorage.getItem('erp_users') || '[]';
    try {
      const uList = JSON.parse(usersRaw);
      if (Array.isArray(uList) && uList.length > 0) {
        return uList.map((u: any) => ({
          ...u,
          dateOfBirth: u.dateOfBirth || '1998-04-12',
          phoneNumber: u.phoneNumber || u.whatsappNumber || '+233 24 555 8891',
          location: u.location || 'Adum, Kumasi',
          educationalBackground: u.educationalBackground || ['shs', 'jhs'],
          previousSewingExperience: u.previousSewingExperience ?? true,
          sewingExperienceDetails: u.sewingExperienceDetails || 'Apprentice experience',
          hasKids: u.hasKids ?? false,
          emergencyContactName: u.emergencyContactName || u.contactPersonName || 'Kofi Mensah',
          emergencyContactRelation: u.emergencyContactRelation || u.contactPersonRelation || 'Brother',
          emergencyContactPhone: u.emergencyContactPhone || u.contactPersonPhone || '+233 20 111 2233',
          contactPersonName: u.contactPersonName || u.emergencyContactName || 'Kofi Mensah',
          contactPersonRelation: u.contactPersonRelation || u.emergencyContactRelation || 'Brother',
          contactPersonPhone: u.contactPersonPhone || u.emergencyContactPhone || '+233 20 111 2233',
          isMarried: u.isMarried ?? (u.maritalStatus === 'married' ? true : false),
          maritalStatus: u.maritalStatus || (u.isMarried ? 'married' : 'single'),
          idType: u.idType || 'national_id',
          idNumber: u.idNumber || `GHA-${u.uid.slice(-8)}`,
          employmentType: u.employmentType || (u.employmentStatus === 'probation' ? 'probation' : 'full_time'),
          probationDurationMonths: u.probationDurationMonths || 3
        }));
      }
    } catch (e) {}
    return [];
  }

  static saveStaffList(data: any[]) {
    localStorage.setItem(this.STORAGE_KEY_STAFF_EXTENDED, JSON.stringify(data));
    localStorage.setItem('erp_users', JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tumi_staff_updated'));
    }
  }

  static addStaff(staffData: any): any {
    const list = this.getStaffList();
    const uid = staffData.uid || 'usr_' + Date.now();
    const baseVal = staffData.baseSalary || 3500;
    const dDays = staffData.workDaysPerMonth || 22;
    const dHours = staffData.workHoursPerDay || 8;
    const daily = Number((baseVal / dDays).toFixed(2));
    const hourly = Number((daily / dHours).toFixed(2));

    const newStaff = {
      ...staffData,
      uid,
      baseSalary: baseVal,
      workDaysPerMonth: dDays,
      workHoursPerDay: dHours,
      dailyRate: daily,
      hourlyRate: hourly,
      permissions: staffData.permissions || ['read', 'create'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: staffData.status || 'active'
    };

    const updated = [newStaff, ...list];
    this.saveStaffList(updated);
    return newStaff;
  }

  static updateStaff(uid: string, updates: any): any | null {
    const list = this.getStaffList();
    let updatedRecord: any = null;
    const updated = list.map(s => {
      if (s.uid !== uid) return s;
      const baseVal = updates.baseSalary ?? s.baseSalary ?? 3500;
      const dDays = updates.workDaysPerMonth ?? s.workDaysPerMonth ?? 22;
      const dHours = updates.workHoursPerDay ?? s.workHoursPerDay ?? 8;
      const daily = Number((baseVal / dDays).toFixed(2));
      const hourly = Number((daily / dHours).toFixed(2));

      const modified = {
        ...s,
        ...updates,
        baseSalary: baseVal,
        workDaysPerMonth: dDays,
        workHoursPerDay: dHours,
        dailyRate: daily,
        hourlyRate: hourly,
        updatedAt: new Date().toISOString()
      };
      updatedRecord = modified;
      return modified;
    });

    this.saveStaffList(updated);
    return updatedRecord;
  }

  static deleteStaff(uid: string): boolean {
    const list = this.getStaffList();
    const filtered = list.filter(s => s.uid !== uid);
    if (filtered.length !== list.length) {
      this.saveStaffList(filtered);
      return true;
    }
    return false;
  }

  static recordTrenchPayment(studentId: string, trenchNum: 1 | 2 | 3, payment: Omit<MaintenancePayment, 'id'>) {
    const students = this.getStudents();
    const updated = students.map(st => {
      if (st.id !== studentId) return st;
      const key = `trench${trenchNum}` as 'trench1' | 'trench2' | 'trench3';
      const currentTrench = st.trenches[key];
      const newPayment: MaintenancePayment = {
        ...payment,
        id: 'pay_' + Date.now()
      };
      const newPaid = currentTrench.paidAmount + payment.amount;
      const isMet = newPaid >= currentTrench.targetAmount;

      const updatedTrench: TrenchDetails = {
        ...currentTrench,
        paidAmount: newPaid,
        status: isMet ? 'completed' : 'partially_paid',
        payments: [...currentTrench.payments, newPayment]
      };

      const updatedTrenches = {
        ...st.trenches,
        [key]: updatedTrench
      };

      const totalPaid = updatedTrenches.trench1.paidAmount + updatedTrenches.trench2.paidAmount + updatedTrenches.trench3.paidAmount;
      const totalOutstanding = Math.max(0, st.maintenanceFeeTotal - totalPaid);

      return {
        ...st,
        trenches: updatedTrenches,
        totalPaid,
        totalOutstanding,
        accountStatus: totalOutstanding === 0 ? ('cleared' as const) : ('pending' as const)
      };
    });

    this.saveStudents(updated);
    return updated;
  }

  // Microloans
  static getGraduateLoans(): GraduateMicroLoanRecord[] {
    const raw = localStorage.getItem(this.STORAGE_KEY_GRAD_LOANS);
    if (!raw) {
      this.saveGraduateLoans(INITIAL_GRADUATE_LOANS);
      return INITIAL_GRADUATE_LOANS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_GRADUATE_LOANS;
    }
  }

  static saveGraduateLoans(loans: GraduateMicroLoanRecord[]) {
    localStorage.setItem(this.STORAGE_KEY_GRAD_LOANS, JSON.stringify(loans));
  }

  static addGraduateLoan(loan: Omit<GraduateMicroLoanRecord, 'id' | 'status' | 'repayments' | 'totalRepaid' | 'remainingBalance'>): GraduateMicroLoanRecord {
    const list = this.getGraduateLoans();
    const id = 'loan_grad_' + Date.now();
    const totalWithInterest = loan.loanAmount * (1 + loan.interestRatePercentage / 100);

    // generate repayment installments
    const installments = [];
    const count = loan.totalDurationWeeksOrMonths || 6;
    const instAmt = Number((totalWithInterest / count).toFixed(2));
    const start = new Date(loan.applicationDate || new Date().toISOString());

    for (let i = 1; i <= count; i++) {
      const d = new Date(start);
      if (loan.repaymentFrequency === 'weekly') d.setDate(d.getDate() + i * 7);
      else if (loan.repaymentFrequency === 'biweekly') d.setDate(d.getDate() + i * 14);
      else d.setMonth(d.getMonth() + i);

      installments.push({
        id: `rep_${id}_${i}`,
        installmentNumber: i,
        dueDate: d.toISOString().slice(0, 10),
        amountDue: instAmt,
        amountPaid: 0,
        status: 'pending' as const
      });
    }

    const newRecord: GraduateMicroLoanRecord = {
      ...loan,
      id,
      installmentAmount: instAmt,
      status: 'pending_ceo_approval',
      repayments: installments,
      totalRepaid: 0,
      remainingBalance: totalWithInterest
    };

    const updated = [newRecord, ...list];
    this.saveGraduateLoans(updated);
    return newRecord;
  }

  static updateGraduateLoanStatus(
    loanId: string, 
    action: 'ceo_approve' | 'ceo_reject' | 'accountant_disburse' | 'graduate_confirm',
    payload: any
  ) {
    const list = this.getGraduateLoans();
    const updated = list.map(l => {
      if (l.id !== loanId) return l;

      if (action === 'ceo_approve') {
        return {
          ...l,
          status: 'approved_by_ceo' as const,
          ceoApproval: {
            approvedBy: payload.approvedBy || 'CEO',
            date: new Date().toISOString().slice(0, 10),
            notes: payload.notes
          }
        };
      }
      if (action === 'ceo_reject') {
        return {
          ...l,
          status: 'rejected_by_ceo' as const,
          ceoApproval: {
            approvedBy: payload.approvedBy || 'CEO',
            date: new Date().toISOString().slice(0, 10),
            notes: payload.notes || 'Declined'
          }
        };
      }
      if (action === 'accountant_disburse') {
        return {
          ...l,
          status: 'disbursed_by_accountant' as const,
          accountantDisbursement: {
            disbursedBy: payload.disbursedBy || 'Accountant',
            date: new Date().toISOString().slice(0, 10),
            paymentReference: payload.paymentReference || ('DISB-' + Date.now().toString().slice(-6)),
            disbursementMethod: payload.disbursementMethod || 'Mobile Money'
          }
        };
      }
      if (action === 'graduate_confirm') {
        return {
          ...l,
          status: 'confirmed_by_graduate' as const,
          graduateConfirmation: {
            confirmedAt: new Date().toISOString(),
            signatureOrPin: payload.signatureOrPin || 'Acknowledged receipt in person'
          }
        };
      }
      return l;
    });

    this.saveGraduateLoans(updated);
    return updated;
  }

  // Staff Advances & Loans
  static getStaffLoans(): StaffSalaryAdvanceLoan[] {
    const raw = localStorage.getItem(this.STORAGE_KEY_STAFF_LOANS);
    if (!raw) {
      this.saveStaffLoans(INITIAL_STAFF_LOANS);
      return INITIAL_STAFF_LOANS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_STAFF_LOANS;
    }
  }

  static saveStaffLoans(data: StaffSalaryAdvanceLoan[]) {
    localStorage.setItem(this.STORAGE_KEY_STAFF_LOANS, JSON.stringify(data));
  }

  static addStaffLoan(req: Omit<StaffSalaryAdvanceLoan, 'id' | 'status' | 'remainingBalance'>): StaffSalaryAdvanceLoan {
    const list = this.getStaffLoans();
    const newRecord: StaffSalaryAdvanceLoan = {
      ...req,
      id: 'sla_' + Date.now(),
      remainingBalance: req.amount,
      status: 'approved'
    };
    const updated = [newRecord, ...list];
    this.saveStaffLoans(updated);
    return newRecord;
  }

  // Unified 4-Stage Loan Tracking: Pending -> Verified -> Approved -> Disbursed
  static verifyLoan(id: string, isGradLoan: boolean, verifier: { name: string; notes?: string }) {
    if (isGradLoan) {
      const list = this.getGraduateLoans();
      const updated = list.map(l => {
        if (l.id !== id) return l;
        return {
          ...l,
          status: 'verified' as const,
          verification: {
            verifiedBy: verifier.name,
            verifiedAt: new Date().toISOString(),
            notes: verifier.notes || 'Eligibility, identity and repayment terms verified'
          }
        };
      });
      this.saveGraduateLoans(updated);
      return updated;
    } else {
      const list = this.getStaffLoans();
      const updated = list.map(l => {
        if (l.id !== id) return l;
        return {
          ...l,
          status: 'verified' as const,
          verification: {
            verifiedBy: verifier.name,
            verifiedAt: new Date().toISOString(),
            notes: verifier.notes || 'Staff tenure and salary advance eligibility verified'
          }
        };
      });
      this.saveStaffLoans(updated);
      return updated;
    }
  }

  static ceoSignOffLoan(id: string, isGradLoan: boolean, signOff: { approvedBy: string; digitalSignature: string; remarks?: string; authCode?: string }) {
    if (isGradLoan) {
      const list = this.getGraduateLoans();
      const updated = list.map(l => {
        if (l.id !== id) return l;
        return {
          ...l,
          status: 'approved' as const,
          ceoApproval: {
            approvedBy: signOff.approvedBy,
            date: new Date().toISOString().slice(0, 10),
            notes: signOff.remarks || 'Executive CEO digital sign-off completed',
            digitalSignature: signOff.digitalSignature,
            authorizationCode: signOff.authCode || ('CEO-AUTH-' + Date.now().toString().slice(-4)),
            remarks: signOff.remarks
          }
        };
      });
      this.saveGraduateLoans(updated);
      return updated;
    } else {
      const list = this.getStaffLoans();
      const updated = list.map(l => {
        if (l.id !== id) return l;
        return {
          ...l,
          status: 'approved' as const,
          ceoApproval: {
            approvedBy: signOff.approvedBy,
            approvedAt: new Date().toISOString(),
            digitalSignature: signOff.digitalSignature,
            remarks: signOff.remarks || 'Executive CEO digital sign-off granted',
            authorizationCode: signOff.authCode || ('CEO-AUTH-' + Date.now().toString().slice(-4))
          },
          approvedBy: signOff.approvedBy,
          approvedDate: new Date().toISOString().slice(0, 10)
        };
      });
      this.saveStaffLoans(updated);
      return updated;
    }
  }

  static disburseLoan(id: string, isGradLoan: boolean, disbursement: { disbursedBy: string; method: 'Mobile Money' | 'Bank Transfer' | 'Cash Voucher'; paymentReference: string; notes?: string }) {
    if (isGradLoan) {
      const list = this.getGraduateLoans();
      const updated = list.map(l => {
        if (l.id !== id) return l;
        return {
          ...l,
          status: 'disbursed' as const,
          accountantDisbursement: {
            disbursedBy: disbursement.disbursedBy,
            date: new Date().toISOString().slice(0, 10),
            paymentReference: disbursement.paymentReference,
            disbursementMethod: disbursement.method
          }
        };
      });
      this.saveGraduateLoans(updated);
      return updated;
    } else {
      const list = this.getStaffLoans();
      const updated = list.map(l => {
        if (l.id !== id) return l;
        return {
          ...l,
          status: 'disbursed' as const,
          disbursement: {
            disbursedBy: disbursement.disbursedBy,
            disbursedAt: new Date().toISOString(),
            method: disbursement.method,
            paymentReference: disbursement.paymentReference,
            notes: disbursement.notes
          }
        };
      });
      this.saveStaffLoans(updated);
      return updated;
    }
  }

  // Deduct store purchases and loan advances during payroll cycle simulation
  static applyPayrollDeductions(payrollPeriod: string, staffDeductions: Array<{ staffId: string; staffName: string; storeAmount: number; loanAdvanceDeduction: number }>) {
    // 1. Mark store charges as deducted
    const allStoreCharges = this.getStaffStoreCharges();
    const updatedStore = allStoreCharges.map(sc => {
      const deductionEntry = staffDeductions.find(d => 
        (d.staffId && sc.staffId === d.staffId) || 
        sc.staffName.toLowerCase() === d.staffName.toLowerCase()
      );
      if (deductionEntry && deductionEntry.storeAmount > 0 && sc.status === 'pending_payroll_deduction') {
        return {
          ...sc,
          status: 'deducted' as const,
          billedBy: `Deducted via Payroll [${payrollPeriod}]`
        };
      }
      return sc;
    });
    this.saveStaffStoreCharges(updatedStore);

    // 2. Reduce staff loan / advance balances
    const allStaffLoans = this.getStaffLoans();
    const updatedLoans = allStaffLoans.map(loan => {
      const deductionEntry = staffDeductions.find(d => 
        (d.staffId && loan.staffId === d.staffId) || 
        loan.staffName.toLowerCase() === d.staffName.toLowerCase()
      );
      if (deductionEntry && (loan.status === 'approved' || loan.status === 'disbursed' || loan.status === 'active')) {
        let individualDeduct = loan.monthlyDeduction;
        if (loan.deductionType === 'percentage' && loan.deductionValue) {
          const usersRaw = localStorage.getItem('erp_users') || '[]';
          let baseSal = 3500;
          try {
            const uList = JSON.parse(usersRaw);
            const foundUser = uList.find((u: any) => u.uid === loan.staffId);
            if (foundUser) baseSal = foundUser.baseSalary || 3500;
          } catch (e) {}
          individualDeduct = Number(((baseSal * loan.deductionValue) / 100).toFixed(2));
        } else if (loan.deductionType === 'cash' && loan.deductionValue) {
          individualDeduct = loan.deductionValue;
        }
        const deductAmount = Math.min(loan.remainingBalance, individualDeduct);
        const newBalance = Math.max(0, Number((loan.remainingBalance - deductAmount).toFixed(2)));
        return {
          ...loan,
          remainingBalance: newBalance,
          status: newBalance <= 0 ? ('repaid' as const) : ('active' as const)
        };
      }
      return loan;
    });
    this.saveStaffLoans(updatedLoans);

    return {
      updatedStoreCount: updatedStore.filter(s => s.status === 'deducted').length,
      updatedLoans
    };
  }

  // Staff Store Charges
  static getStaffStoreCharges(): StaffStoreCharge[] {
    const raw = localStorage.getItem(this.STORAGE_KEY_STAFF_STORE);
    if (!raw) {
      this.saveStaffStoreCharges(INITIAL_STAFF_STORE_CHARGES);
      return INITIAL_STAFF_STORE_CHARGES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_STAFF_STORE_CHARGES;
    }
  }

  static saveStaffStoreCharges(charges: StaffStoreCharge[]) {
    localStorage.setItem(this.STORAGE_KEY_STAFF_STORE, JSON.stringify(charges));
  }

  static addStaffStoreCharge(charge: {
    staffId: string;
    staffName: string;
    amount: number;
    itemsDescription: string;
    billedBy?: string;
    orderId?: string;
    date?: string;
    status?: 'pending_payroll_deduction' | 'deducted' | 'settled_cash';
  }): StaffStoreCharge {
    const list = this.getStaffStoreCharges();
    const newRecord: StaffStoreCharge = {
      id: 'ssc_' + Date.now(),
      staffId: charge.staffId,
      staffName: charge.staffName,
      amount: charge.amount,
      itemsDescription: charge.itemsDescription,
      billedBy: charge.billedBy,
      orderId: charge.orderId || ('ord_' + Date.now()),
      date: charge.date || new Date().toISOString().slice(0, 10),
      status: charge.status || 'pending_payroll_deduction'
    };
    const updated = [newRecord, ...list];
    this.saveStaffStoreCharges(updated);
    return newRecord;
  }

  // Roster & Shifts
  static getRoster(): ShiftRosterRecord[] {
    const raw = localStorage.getItem(this.STORAGE_KEY_ROSTER);
    if (!raw) {
      const generated = this.generateInitialRoster();
      this.saveRoster(generated);
      return generated;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveRoster(roster: ShiftRosterRecord[]) {
    localStorage.setItem(this.STORAGE_KEY_ROSTER, JSON.stringify(roster));
  }

  static generateInitialRoster(): ShiftRosterRecord[] {
    const staffMembers = [
      { id: 'usr_reception_01', name: 'Adwoa Sarfo', dept: 'Front Desk' },
      { id: 'usr_hk_02', name: 'Kwesi Mensah', dept: 'Housekeeping' },
      { id: 'usr_trainer_03', name: 'Sister Ama Darko', dept: 'Vocational Training' },
      { id: 'usr_kitchen_04', name: 'Kofi Addo', dept: 'Hostel Kitchen' }
    ];

    const records: ShiftRosterRecord[] = [];
    const today = new Date();

    // 14 days schedule
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      const dateStr = targetDate.toISOString().slice(0, 10);
      const holCheck = isGhanaHoliday(dateStr);

      staffMembers.forEach((member, idx) => {
        const isOff = (dayOffset + idx) % 7 === 6;
        const shiftType: ShiftRosterRecord['shiftType'] = isOff 
          ? 'off' 
          : (idx % 2 === 0 ? 'morning' : 'afternoon');

        records.push({
          id: `rst_${dateStr}_${member.id}`,
          staffId: member.id,
          staffName: member.name,
          department: member.dept,
          date: dateStr,
          shiftType,
          startTime: shiftType === 'morning' ? '07:00' : shiftType === 'afternoon' ? '14:00' : '00:00',
          endTime: shiftType === 'morning' ? '15:00' : shiftType === 'afternoon' ? '22:00' : '00:00',
          isHoliday: holCheck.isHoliday,
          holidayName: holCheck.holidayName,
          doublePayApplicable: holCheck.isHoliday && shiftType !== 'off',
          isExtraShift: false,
          swapRequested: false
        });
      });
    }

    return records;
  }
}
