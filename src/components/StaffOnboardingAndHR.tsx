import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Calendar, 
  Phone, 
  MapPin, 
  Scissors, 
  Baby, 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  FileText, 
  DollarSign, 
  ShoppingBag, 
  X, 
  Upload, 
  Trash2,
  Check,
  Send,
  Eye,
  Heart,
  UserCheck,
  Briefcase
} from 'lucide-react';
import { 
  StudentStaffStore, 
  StaffSalaryAdvanceLoan, 
  StaffStoreCharge 
} from '../utils/studentStaffStore';
import { UserProfile } from '../types/erp';
import TumiPayslipTemplate, { PayslipData } from './TumiPayslipTemplate';

interface StaffOnboardingAndHRProps {
  activeUser: UserProfile;
  users: UserProfile[];
  onAddUser: (u: UserProfile) => void;
  onUpdateUser: (uid: string, updates: Partial<UserProfile>) => void;
}

interface AppraisalQuestion {
  id: string;
  question: string;
  category: 'core_competencies' | 'punctuality' | 'teamwork' | 'quality_of_work' | 'initiative';
  ratingScale: '1_to_5' | 'yes_no' | 'descriptive';
}

interface StaffMemberFullRecord extends UserProfile {
  dateOfBirth?: string;
  phoneNumber?: string;
  location?: string;
  educationalBackground?: string[];
  previousSewingExperience?: boolean;
  sewingExperienceDetails?: string;
  hasKids?: boolean;
  // Emergency Contact Details
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  contactPersonName?: string;
  contactPersonRelation?: string;
  contactPersonPhone?: string;
  // Marital Status (checkbox & label)
  maritalStatus?: 'married' | 'single' | string;
  isMarried?: boolean;
  idType?: 'national_id' | 'voters_id' | 'nhia_id' | 'drivers_license';
  idNumber?: string;
  // Employment Type (full time, part time, probation, other)
  employmentType?: 'full_time' | 'part_time' | 'probation' | 'other' | 'fulltime' | 'one_time';
  employmentTypeOtherDetails?: string;
  probationDurationMonths?: 3 | 6;
  probationEndDate?: string;
  reminderTriggerDate?: string; // 2 weeks before probationEndDate
  appraisalApproved?: boolean;
  appraisalQuestions?: AppraisalQuestion[];
}

const EDUCATION_OPTIONS = [
  { id: 'primary', label: 'Primary School' },
  { id: 'jhs', label: 'Junior High School (JHS)' },
  { id: 'shs', label: 'Senior High School (SHS)' },
  { id: 'degree', label: "Bachelor's Degree" },
  { id: 'postgraduate', label: 'Postgraduate Diploma' },
  { id: 'masters', label: "Master's Degree" },
  { id: 'no_education', label: 'No Formal Education' }
] as const;

export default function StaffOnboardingAndHR({
  activeUser,
  users,
  onAddUser,
  onUpdateUser
}: StaffOnboardingAndHRProps) {
  const [subSection, setSubSection] = useState<'directory' | 'advances_loans' | 'store_charges'>('directory');
  const [staffList, setStaffList] = useState<StaffMemberFullRecord[]>(() => {
    const raw = localStorage.getItem('tumi_erp_staff_extended_records_v1');
    if (raw) {
      try { return JSON.parse(raw); } catch { /* ignore */ }
    }
    // Seed with existing users enriched
    return users.map(u => ({
      ...u,
      dateOfBirth: '1998-04-12',
      phoneNumber: u.whatsappNumber || '+233 24 555 8891',
      location: 'Adum, Kumasi',
      educationalBackground: ['shs', 'jhs'],
      previousSewingExperience: true,
      hasKids: false,
      isMarried: u.isMarried ?? (u.maritalStatus === 'married' ? true : false),
      maritalStatus: u.maritalStatus || (u.isMarried ? 'married' : 'single'),
      emergencyContactName: u.emergencyContactName || u.contactPersonName || 'Kofi Mensah',
      emergencyContactRelation: u.emergencyContactRelation || u.contactPersonRelation || 'Brother',
      emergencyContactPhone: u.emergencyContactPhone || u.contactPersonPhone || '+233 20 111 2233',
      contactPersonName: u.contactPersonName || u.emergencyContactName || 'Kofi Mensah',
      contactPersonRelation: u.contactPersonRelation || u.emergencyContactRelation || 'Brother',
      contactPersonPhone: u.contactPersonPhone || u.emergencyContactPhone || '+233 20 111 2233',
      idType: 'national_id',
      idNumber: `GHA-${u.uid.slice(-8)}`,
      employmentType: (u.employmentType as any) || (u.employmentStatus === 'probation' ? 'probation' : 'full_time'),
      probationDurationMonths: 3,
      probationEndDate: u.employmentStatus === 'probation' ? '2026-10-15' : undefined,
      reminderTriggerDate: u.employmentStatus === 'probation' ? '2026-10-01' : undefined
    }));
  });

  const [staffLoans, setStaffLoans] = useState<StaffSalaryAdvanceLoan[]>(() => StudentStaffStore.getStaffLoans());
  const [staffStoreCharges, setStaffStoreCharges] = useState<StaffStoreCharge[]>(() => StudentStaffStore.getStaffStoreCharges());

  const [editingStaff, setEditingStaff] = useState<StaffMemberFullRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleStaffUpdate = () => {
      setStaffList(StudentStaffStore.getStaffList());
    };
    window.addEventListener('tumi_staff_updated', handleStaffUpdate);
    return () => {
      window.removeEventListener('tumi_staff_updated', handleStaffUpdate);
    };
  }, []);
  
  // Modals
  const [isRegisterStaffOpen, setIsRegisterStaffOpen] = useState(false);
  const [isAppraisalModalOpen, setIsAppraisalModalOpen] = useState(false);
  const [selectedStaffForAppraisal, setSelectedStaffForAppraisal] = useState<StaffMemberFullRecord | null>(null);
  const [appraisalQuestions, setAppraisalQuestions] = useState<AppraisalQuestion[]>([]);
  const [isGeneratingAiAppraisal, setIsGeneratingAiAppraisal] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [activePayslipData, setActivePayslipData] = useState<PayslipData | null>(null);

  // Form State for Staff Registration
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
    // Marital Status Checkbox & State
    isMarried: false,
    maritalStatus: 'single' as 'married' | 'single',
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactRelation: 'Spouse',
    emergencyContactPhone: '+233 ',
    contactPersonName: '',
    contactPersonRelation: 'Spouse',
    contactPersonPhone: '+233 ',
    idType: 'national_id' as const,
    idNumber: '',
    // Employment Type: full time, part time, probation, other
    employmentType: 'full_time' as 'full_time' | 'part_time' | 'probation' | 'other',
    employmentTypeOtherDetails: '',
    probationDurationMonths: 3 as 3 | 6
  });

  // Advance/Loan Form State
  const [loanForm, setLoanForm] = useState({
    staffId: '',
    type: 'advance' as 'advance' | 'loan',
    amount: 500,
    monthlyDeduction: 250,
    deductionType: 'cash' as 'cash' | 'percentage',
    deductionValue: 250,
    purpose: ''
  });

  const isCeoOrHr = activeUser.role === 'ceo' || activeUser.role === 'manager' || activeUser.role === 'sysadmin';

  const saveStaffList = (data: StaffMemberFullRecord[]) => {
    localStorage.setItem('tumi_erp_staff_extended_records_v1', JSON.stringify(data));
    setStaffList(data);
  };

  // Check 2-week reminders for probation
  const activeProbationReminders = staffList.filter(s => {
    if (s.employmentType !== 'probation' || !s.probationEndDate) return false;
    const end = new Date(s.probationEndDate).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((end - now) / (1000 * 3600 * 24));
    return diffDays <= 14 && diffDays >= 0;
  });

  // Handle Staff Registration
  const handleRegisterStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name.trim()) return;

    const uid = 'usr_' + Date.now();
    let probationEnd: string | undefined;
    let reminderDate: string | undefined;

    if (staffForm.employmentType === 'probation') {
      const now = new Date();
      now.setMonth(now.getMonth() + staffForm.probationDurationMonths);
      probationEnd = now.toISOString().slice(0, 10);

      const rem = new Date(now);
      rem.setDate(rem.getDate() - 14);
      reminderDate = rem.toISOString().slice(0, 10);
    }

    const baseVal = staffForm.baseSalary;
    const dDays = staffForm.workDaysPerMonth || 22;
    const dHours = staffForm.workHoursPerDay || 8;
    const daily = Number((baseVal / dDays).toFixed(2));
    const hourly = Number((daily / dHours).toFixed(2));

    const newStaff: StaffMemberFullRecord = {
      uid,
      name: staffForm.name,
      email: staffForm.email || `${staffForm.name.toLowerCase().replace(/\s+/g, '.')}@tumihostel.org`,
      role: staffForm.role,
      department: staffForm.department,
      jobTitle: staffForm.jobTitle,
      baseSalary: baseVal,
      workDaysPerMonth: dDays,
      workHoursPerDay: dHours,
      dailyRate: daily,
      hourlyRate: hourly,
      permissions: ['read', 'create'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
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
      probationDurationMonths: staffForm.employmentType === 'probation' ? staffForm.probationDurationMonths : undefined,
      probationEndDate: probationEnd,
      reminderTriggerDate: reminderDate
    };

    const updated = [newStaff, ...staffList];
    saveStaffList(updated);
    StudentStaffStore.addStaff(newStaff);
    onAddUser(newStaff);
    setIsRegisterStaffOpen(false);
  };

  // Update existing staff profile
  const handleUpdateStaffRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    let probationEnd = editingStaff.probationEndDate;
    let reminderDate = editingStaff.reminderTriggerDate;
    if (editingStaff.employmentType === 'probation' && !probationEnd) {
      const now = new Date();
      now.setMonth(now.getMonth() + (editingStaff.probationDurationMonths || 3));
      probationEnd = now.toISOString().slice(0, 10);
      const rem = new Date(now);
      rem.setDate(rem.getDate() - 14);
      reminderDate = rem.toISOString().slice(0, 10);
    } else if (editingStaff.employmentType !== 'probation') {
      probationEnd = undefined;
      reminderDate = undefined;
    }

    const baseVal = editingStaff.baseSalary || 3500;
    const dDays = editingStaff.workDaysPerMonth || 22;
    const dHours = editingStaff.workHoursPerDay || 8;
    const daily = Number((baseVal / dDays).toFixed(2));
    const hourly = Number((daily / dHours).toFixed(2));

    const updatedStaff: StaffMemberFullRecord = {
      ...editingStaff,
      baseSalary: baseVal,
      workDaysPerMonth: dDays,
      workHoursPerDay: dHours,
      dailyRate: daily,
      hourlyRate: hourly,
      isMarried: editingStaff.isMarried ?? (editingStaff.maritalStatus === 'married'),
      maritalStatus: editingStaff.isMarried ? 'married' : 'single',
      emergencyContactName: editingStaff.emergencyContactName || editingStaff.contactPersonName,
      emergencyContactRelation: editingStaff.emergencyContactRelation || editingStaff.contactPersonRelation,
      emergencyContactPhone: editingStaff.emergencyContactPhone || editingStaff.contactPersonPhone,
      contactPersonName: editingStaff.emergencyContactName || editingStaff.contactPersonName,
      contactPersonRelation: editingStaff.emergencyContactRelation || editingStaff.contactPersonRelation,
      contactPersonPhone: editingStaff.emergencyContactPhone || editingStaff.contactPersonPhone,
      probationEndDate: probationEnd,
      reminderTriggerDate: reminderDate,
      updatedAt: new Date().toISOString()
    };

    const updated = staffList.map(s => s.uid === updatedStaff.uid ? updatedStaff : s);
    saveStaffList(updated);
    StudentStaffStore.updateStaff(updatedStaff.uid, updatedStaff);
    onUpdateUser(updatedStaff.uid, updatedStaff);
    setEditingStaff(null);
  };

  // Generate AI Appraisal Questionnaire using Gemini
  const handleOpenAppraisalModal = async (staff: StaffMemberFullRecord) => {
    setSelectedStaffForAppraisal(staff);
    setIsAppraisalModalOpen(true);
    setIsGeneratingAiAppraisal(true);

    try {
      const res = await fetch('/api/ai/draft-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: staff.name,
          customInstruction: `Draft 5 customized appraisal performance review questions for employee "${staff.name}" who is concluding their ${staff.probationDurationMonths || 3}-month probation period as "${staff.jobTitle}" in "${staff.department}". Focus on core competencies, attendance punctuality, customer care, and teamwork.`
        })
      });

      // Default high quality standard questions tailored to Tumi
      const questions: AppraisalQuestion[] = [
        {
          id: 'q_1',
          question: `How consistently does ${staff.name} demonstrate proficiency in ${staff.jobTitle} core duties and procedures?`,
          category: 'core_competencies',
          ratingScale: '1_to_5'
        },
        {
          id: 'q_2',
          question: `Does the employee consistently adhere to scheduled shifts and punctuality guidelines?`,
          category: 'punctuality',
          ratingScale: '1_to_5'
        },
        {
          id: 'q_3',
          question: `Evaluate the employee's collaboration with hostel guests, vocational trainees, and fellow team members.`,
          category: 'teamwork',
          ratingScale: '1_to_5'
        },
        {
          id: 'q_4',
          question: `How effectively does the employee resolve unexpected customer service issues under pressure?`,
          category: 'initiative',
          ratingScale: '1_to_5'
        },
        {
          id: 'q_5',
          question: `Do you recommend confirming this employee to Full-Time Permanent Status?`,
          category: 'quality_of_work',
          ratingScale: 'yes_no'
        }
      ];

      setAppraisalQuestions(questions);
    } catch {
      // Fallback standard set
      setAppraisalQuestions([
        {
          id: 'q_1',
          question: `Technical proficiency in assigned responsibilities for ${staff.name}`,
          category: 'core_competencies',
          ratingScale: '1_to_5'
        },
        {
          id: 'q_2',
          question: `Reliability and punctuality across shifts`,
          category: 'punctuality',
          ratingScale: '1_to_5'
        },
        {
          id: 'q_3',
          question: `Recommend for permanent staff confirmation?`,
          category: 'quality_of_work',
          ratingScale: 'yes_no'
        }
      ]);
    } finally {
      setIsGeneratingAiAppraisal(false);
    }
  };

  // Approve Appraisal Questionnaire
  const handleApproveAppraisal = () => {
    if (!selectedStaffForAppraisal) return;

    const updated = staffList.map(s => {
      if (s.uid !== selectedStaffForAppraisal.uid) return s;
      return {
        ...s,
        appraisalApproved: true,
        appraisalQuestions
      };
    });

    saveStaffList(updated);
    setIsAppraisalModalOpen(false);
    alert(`Appraisal questionnaire approved by ${activeUser.name} (${activeUser.role.toUpperCase()}) for ${selectedStaffForAppraisal.name}. Ready for review meeting!`);
  };

  // Add Loan / Advance
  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.staffId || loanForm.amount <= 0) return;

    const staff = staffList.find(s => s.uid === loanForm.staffId);
    if (!staff) return;

    let monthlyDed = loanForm.deductionValue;
    if (loanForm.deductionType === 'percentage') {
      const baseSal = staff.baseSalary || 3500;
      monthlyDed = Number(((baseSal * loanForm.deductionValue) / 100).toFixed(2));
    }

    StudentStaffStore.addStaffLoan({
      staffId: staff.uid,
      staffName: staff.name,
      staffRole: staff.role,
      type: loanForm.type,
      amount: loanForm.amount,
      monthlyDeduction: monthlyDed,
      deductionType: loanForm.deductionType,
      deductionValue: loanForm.deductionValue,
      requestDate: new Date().toISOString().slice(0, 10),
      purpose: loanForm.purpose || `${loanForm.type === 'advance' ? 'Salary Advance' : 'Staff Emergency Loan'}`
    });

    setStaffLoans(StudentStaffStore.getStaffLoans());
    setIsLoanModalOpen(false);
  };

  // Generate Payslip View from employee profile
  const handleOpenPayslip = (staff: StaffMemberFullRecord) => {
    const advances = staffLoans.filter(l => l.staffId === staff.uid && l.type === 'advance');
    const loans = staffLoans.filter(l => l.staffId === staff.uid && l.type === 'loan');
    const storeCharges = staffStoreCharges.filter(sc => sc.staffId === staff.uid && sc.status === 'pending_payroll_deduction');

    const totalAdv = advances.reduce((s, a) => s + a.monthlyDeduction, 0);
    const totalLoanDed = loans.reduce((s, l) => s + l.monthlyDeduction, 0);
    const totalStore = storeCharges.reduce((s, sc) => s + sc.amount, 0);
    const remainingLoanBal = loans.reduce((s, l) => s + l.remainingBalance, 0);

    const base = staff.baseSalary || 3500;
    const ssnit = Number((base * 0.055).toFixed(2));
    const workedDays = 22;
    const holidaysWorked = 2; // holiday double pay simulation
    const salaryPerDay = Number((base / workedDays).toFixed(2));
    const holidayPay = Number((salaryPerDay * holidaysWorked).toFixed(2));

    setActivePayslipData({
      companyName: 'Tumi Hostel',
      employeeName: staff.name,
      designation: staff.jobTitle || staff.role.toUpperCase(),
      department: staff.department || 'Hospitality & Operations',
      dateOfJoining: staff.hireDate || '2024-01-15',
      payPeriod: 'September 2026',
      workedDays,
      holidaysWorked,
      paidLeaveDays: 2,
      salaryPerDay,
      basicSalary: base,
      bonus: 250,
      leavePay: 0,
      holidayDoublePay: holidayPay,
      advanceDeduction: totalAdv,
      loanDeduction: totalLoanDed,
      ssnitDeduction: ssnit,
      savingsDeduction: 100,
      storePurchasesDeduction: totalStore,
      loanBalanceRemaining: remainingLoanBal
    });
  };

  return (
    <div className="space-y-6">
      {/* 2-Week Probation Reminders Alert Banner */}
      {activeProbationReminders.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 text-amber-900 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">
                Probation Ending Alert: 2-Week Advance Notification ({activeProbationReminders.length} staff)
              </h4>
              <p className="text-xs text-amber-800">
                The following employees are within 2 weeks of concluding their probation periods. An AI appraisal questionnaire is ready to be drafted, customized, and approved before review.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {activeProbationReminders.map(st => (
                  <div key={st.uid} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-amber-300 text-xs shadow-2xs">
                    <span className="font-bold text-slate-900">{st.name} ({st.jobTitle})</span>
                    <span className="text-[10px] text-amber-700">Ends: {st.probationEndDate}</span>
                    <button
                      onClick={() => handleOpenAppraisalModal(st)}
                      className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[10px] flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{st.appraisalApproved ? 'View Appraisal' : 'Draft AI Appraisal'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Header & Sub-Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff Onboarding, Loans & Appraisal Engine</h2>
              <p className="text-xs text-slate-500">
                Employee registrations, probation 2-week reminders, AI appraisals, salary advances & store purchase billing.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setSubSection('directory')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subSection === 'directory' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Staff Directory ({staffList.length})
            </button>
            <button
              onClick={() => setSubSection('advances_loans')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subSection === 'advances_loans' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Advances & Loans ({staffLoans.length})
            </button>
            <button
              onClick={() => setSubSection('store_charges')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subSection === 'store_charges' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Store Charges ({staffStoreCharges.length})
            </button>
          </div>

          <button
            onClick={() => setIsRegisterStaffOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Staff</span>
          </button>
        </div>
      </div>

      {/* SUB-SECTION 1: STAFF DIRECTORY */}
      {subSection === 'directory' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search staff name, job title, phone..."
                className="w-full bg-white border border-slate-200 pl-9 pr-3 py-1.5 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Contact & Location</th>
                  <th className="py-3 px-4">Employment & Marital</th>
                  <th className="py-3 px-4">Emergency Contact</th>
                  <th className="py-3 px-4">Base Salary</th>
                  <th className="py-3 px-4">Identification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {staffList.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(staff => (
                  <tr key={staff.uid} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center font-bold text-purple-700 shrink-0">
                          {staff.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{staff.name}</span>
                          <span className="text-[11px] text-slate-500 block">
                            {staff.jobTitle || staff.role.toUpperCase()} &bull; {staff.department}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="flex items-center gap-1 text-slate-800">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{staff.phoneNumber}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{staff.location}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          staff.employmentType === 'probation' 
                            ? 'bg-amber-100 text-amber-800' 
                            : staff.employmentType === 'part_time'
                            ? 'bg-sky-100 text-sky-800'
                            : staff.employmentType === 'other'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {staff.employmentType === 'full_time' || staff.employmentType === 'fulltime'
                            ? 'Full Time'
                            : staff.employmentType === 'part_time'
                            ? 'Part Time'
                            : staff.employmentType === 'probation'
                            ? 'Probation'
                            : staff.employmentType === 'other'
                            ? (staff.employmentTypeOtherDetails || 'Other')
                            : 'Full Time'}
                        </span>
                        {staff.employmentType === 'probation' && staff.probationEndDate && (
                          <span className="block text-[10px] text-slate-400">
                            Ends: {staff.probationEndDate} ({staff.probationDurationMonths}mo)
                          </span>
                        )}
                        <div className="pt-0.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            staff.isMarried || staff.maritalStatus === 'married'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            <Heart className="w-2.5 h-2.5" />
                            <span>{staff.isMarried || staff.maritalStatus === 'married' ? 'Married' : 'Single'}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 text-xs">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-rose-500" />
                          <span>{staff.emergencyContactName || staff.contactPersonName || 'Not recorded'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {staff.emergencyContactRelation || staff.contactPersonRelation || 'Contact'} &bull; {staff.emergencyContactPhone || staff.contactPersonPhone || 'N/A'}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">
                        GHS {staff.baseSalary ? staff.baseSalary.toLocaleString() : '3,500'}
                      </span>
                      <span className="text-[10px] text-slate-400">Monthly Gross</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 block w-fit">
                        {staff.idNumber || 'GHA-VERIFIED'}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase mt-0.5 block">
                        {staff.idType?.replace('_', ' ') || 'National ID'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Open Payslip Preview */}
                        <button
                          onClick={() => handleOpenPayslip(staff)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all flex items-center gap-1"
                          title="Generate Official Payslip (Tumi Hostel Template)"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Payslip</span>
                        </button>

                        {/* Appraisal Modal */}
                        {staff.employmentType === 'probation' && (
                          <button
                            onClick={() => handleOpenAppraisalModal(staff)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-all flex items-center gap-1"
                            title="Draft or Edit AI Appraisal Questionnaire"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span>Appraisal</span>
                          </button>
                        )}

                        {/* Edit Staff Record */}
                        <button
                          onClick={() => setEditingStaff(staff)}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg transition-all"
                          title="Edit Employee Profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Staff Record */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete staff member "${staff.name}" from the database?`)) {
                              StudentStaffStore.deleteStaff(staff.uid);
                            }
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition-all"
                          title="Delete Employee Profile"
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
        </div>
      )}

      {/* SUB-SECTION 2: STAFF ADVANCES & LOANS */}
      {subSection === 'advances_loans' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Staff Salary Advances & Employee Loan Records</h3>
              <p className="text-xs text-slate-500">Tracked under employee names and automatically deducted during monthly payroll.</p>
            </div>
            <button
              onClick={() => setIsLoanModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue Advance / Loan</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Staff Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Original Amount</th>
                  <th className="py-3 px-4">Monthly Deduction</th>
                  <th className="py-3 px-4">Remaining Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {staffLoans.map(loan => (
                  <tr key={loan.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">{loan.staffName}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        loan.type === 'advance' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {loan.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">GHS {loan.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-rose-600 font-bold">GHS {loan.monthlyDeduction.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">GHS {loan.remainingBalance.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {loan.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] italic">{loan.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-SECTION 3: IN-STORE PURCHASES BILLED TO EMPLOYEES */}
      {subSection === 'store_charges' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">In-Store & POS Purchases Billed to Employees</h3>
              <p className="text-xs text-slate-500">Shop and boutique orders billed to employee account for salary deduction.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Order / Invoice Ref</th>
                  <th className="py-3 px-4">Purchased Items</th>
                  <th className="py-3 px-4">Charge Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payroll Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {staffStoreCharges.map(charge => (
                  <tr key={charge.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">{charge.staffName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{charge.orderId}</td>
                    <td className="py-3 px-4 text-slate-800">{charge.itemsDescription}</td>
                    <td className="py-3 px-4 font-bold text-rose-600 font-mono">GHS {charge.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{charge.date}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Pending Payroll Deduction
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTER NEW STAFF */}
      {isRegisterStaffOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Register New Staff Member</h3>
                <p className="text-xs text-slate-500">Capture employee profile, employment type, probation duration & contact details.</p>
              </div>
              <button onClick={() => setIsRegisterStaffOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterStaff} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.name}
                    onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                    placeholder="e.g. Kwame Mensah"
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={staffForm.dateOfBirth}
                    onChange={e => setStaffForm({ ...staffForm, dateOfBirth: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={staffForm.phoneNumber}
                    onChange={e => setStaffForm({ ...staffForm, phoneNumber: e.target.value })}
                    placeholder="+233 24 000 0000"
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / Residence *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.location}
                    onChange={e => setStaffForm({ ...staffForm, location: e.target.value })}
                    placeholder="e.g. Bantama, Kumasi"
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={staffForm.department}
                    onChange={e => setStaffForm({ ...staffForm, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={staffForm.jobTitle}
                    onChange={e => setStaffForm({ ...staffForm, jobTitle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>

                <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100/80 space-y-3.5 col-span-1 sm:col-span-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-900 block">
                    Monthly Salary & Dynamic Rates Calculator
                  </span>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Monthly Pay (GHS)</label>
                      <input
                        type="number"
                        min={500}
                        required
                        value={staffForm.baseSalary}
                        onChange={e => setStaffForm({ ...staffForm, baseSalary: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Days / Month</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        required
                        value={staffForm.workDaysPerMonth}
                        onChange={e => setStaffForm({ ...staffForm, workDaysPerMonth: Number(e.target.value) || 22 })}
                        className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Hours / Day</label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        required
                        value={staffForm.workHoursPerDay}
                        onChange={e => setStaffForm({ ...staffForm, workHoursPerDay: Number(e.target.value) || 8 })}
                        className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-white p-2 rounded-lg border border-indigo-50 text-center">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Daily Rate</span>
                      <span className="text-xs font-black text-indigo-700 font-mono">
                        GHS {Number(staffForm.baseSalary / (staffForm.workDaysPerMonth || 22)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="border-l border-slate-100">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Hourly Rate</span>
                      <span className="text-xs font-black text-indigo-700 font-mono">
                        GHS {Number((staffForm.baseSalary / (staffForm.workDaysPerMonth || 22)) / (staffForm.workHoursPerDay || 8)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ID Number (National ID / NHIA / Voter) *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.idNumber}
                    onChange={e => setStaffForm({ ...staffForm, idNumber: e.target.value })}
                    placeholder="e.g. GHA-99881122-1"
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Employment Type Config */}
              <div className="border-t border-slate-200 pt-3 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-indigo-950 text-xs">Employment Type *</label>
                  <span className="text-[10px] text-indigo-600 font-semibold">Select 1 of 4 categories</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'full_time', label: 'Full Time' },
                    { id: 'part_time', label: 'Part Time' },
                    { id: 'probation', label: 'Probation' },
                    { id: 'other', label: 'Other' }
                  ].map(item => (
                    <label 
                      key={item.id} 
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-[11px] font-bold transition-all ${
                        staffForm.employmentType === item.id 
                          ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs ring-1 ring-indigo-500' 
                          : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="empType"
                        value={item.id}
                        checked={staffForm.employmentType === item.id}
                        onChange={() => setStaffForm({ ...staffForm, employmentType: item.id as any })}
                        className="text-indigo-600"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>

                {/* If Other -> Detail Input */}
                {staffForm.employmentType === 'other' && (
                  <div className="pt-2 border-t border-indigo-100">
                    <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                      Specify Other Employment Terms (e.g. Contract, Consultant, Volunteer, Intern)
                    </label>
                    <input
                      type="text"
                      value={staffForm.employmentTypeOtherDetails}
                      onChange={e => setStaffForm({ ...staffForm, employmentTypeOtherDetails: e.target.value })}
                      placeholder="e.g. 6-Month Fixed Term Contract"
                      className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                    />
                  </div>
                )}

                {/* If Probation -> Duration Selection */}
                {staffForm.employmentType === 'probation' && (
                  <div className="mt-2 pt-2 border-t border-indigo-200/50 space-y-2">
                    <span className="font-bold text-indigo-900 block text-xs">Probation Duration:</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-indigo-950">
                        <input
                          type="radio"
                          name="probDuration"
                          value={3}
                          checked={staffForm.probationDurationMonths === 3}
                          onChange={() => setStaffForm({ ...staffForm, probationDurationMonths: 3 })}
                          className="text-indigo-600"
                        />
                        <span>3 Months</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-indigo-950">
                        <input
                          type="radio"
                          name="probDuration"
                          value={6}
                          checked={staffForm.probationDurationMonths === 6}
                          onChange={() => setStaffForm({ ...staffForm, probationDurationMonths: 6 })}
                          className="text-indigo-600"
                        />
                        <span>6 Months</span>
                      </label>
                    </div>
                    <p className="text-[10px] text-indigo-700">
                      &bull; System will automatically trigger an alert <strong>2 weeks before end date</strong> to CEO, HR and Manager to review the appraisal questionnaire.
                    </p>
                  </div>
                )}
              </div>

              {/* Marital Status Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="staffFormMaritalStatus"
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
                  <label htmlFor="staffFormMaritalStatus" className="flex flex-col cursor-pointer select-none">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <span>Marital Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        staffForm.isMarried ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {staffForm.isMarried ? 'Married' : 'Single / Unmarried'}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {staffForm.isMarried
                        ? 'Check marked: Employee is legally married (or in a registered union).'
                        : 'Check this box if the staff member is married.'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="border-t border-slate-200 pt-3 bg-rose-50/40 p-3.5 rounded-xl border border-rose-100/80 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                  <Phone className="w-3.5 h-3.5 text-rose-600" />
                  <span>Emergency Contact Person *</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Primary point of contact to reach immediately in the event of an urgent workplace or medical situation.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Full Name *</label>
                    <input
                      type="text"
                      required
                      value={staffForm.emergencyContactName}
                      onChange={e => setStaffForm({ ...staffForm, emergencyContactName: e.target.value, contactPersonName: e.target.value })}
                      placeholder="e.g. Sister Mercy Mensah"
                      className="w-full bg-white border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Relationship to Staff *</label>
                    <input
                      type="text"
                      required
                      value={staffForm.emergencyContactRelation}
                      onChange={e => setStaffForm({ ...staffForm, emergencyContactRelation: e.target.value, contactPersonRelation: e.target.value })}
                      placeholder="e.g. Spouse, Sibling, Parent"
                      className="w-full bg-white border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Emergency Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={staffForm.emergencyContactPhone}
                      onChange={e => setStaffForm({ ...staffForm, emergencyContactPhone: e.target.value, contactPersonPhone: e.target.value })}
                      placeholder="+233 24 000 0000"
                      className="w-full bg-white border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterStaffOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  Register Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AI APPRAISAL QUESTIONNAIRE (EDITABLE & APPROVABLE BY HR / CEO) */}
      {isAppraisalModalOpen && selectedStaffForAppraisal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    AI-Drafted Probation Appraisal Questionnaire
                  </h3>
                  <p className="text-xs text-slate-500">
                    Employee: {selectedStaffForAppraisal.name} ({selectedStaffForAppraisal.jobTitle}) &bull; Editable by HR or CEO
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAppraisalModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <p className="text-slate-600">
                Review and tailor each appraisal criterion below before conducting the evaluation meeting:
              </p>

              <div className="space-y-3">
                {appraisalQuestions.map((q, idx) => (
                  <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Question #{idx + 1} ({q.category.replace('_', ' ')})</span>
                      <span className="text-[10px] text-slate-400 font-mono">Scale: {q.ratingScale}</span>
                    </div>
                    <textarea
                      rows={2}
                      value={q.question}
                      onChange={e => {
                        const updated = appraisalQuestions.map(item => 
                          item.id === q.id ? { ...item, question: e.target.value } : item
                        );
                        setAppraisalQuestions(updated);
                      }}
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    const newQ: AppraisalQuestion = {
                      id: 'q_' + Date.now(),
                      question: 'Custom performance criteria...',
                      category: 'core_competencies',
                      ratingScale: '1_to_5'
                    };
                    setAppraisalQuestions([...appraisalQuestions, newQ]);
                  }}
                  className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAppraisalModalOpen(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApproveAppraisal}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Questionnaire (HR / CEO)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ISSUE SALARY ADVANCE OR LOAN */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Issue Staff Advance or Loan</h3>
                <p className="text-xs text-slate-500">Record advance against salary or multi-month staff emergency loan.</p>
              </div>
              <button onClick={() => setIsLoanModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Staff Member *</label>
                <select
                  required
                  value={loanForm.staffId}
                  onChange={e => setLoanForm({ ...loanForm, staffId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                >
                  <option value="">Choose employee...</option>
                  {staffList.map(st => (
                    <option key={st.uid} value={st.uid}>{st.name} ({st.jobTitle})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Type *</label>
                <select
                  value={loanForm.type}
                  onChange={e => setLoanForm({ ...loanForm, type: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-semibold"
                >
                  <option value="advance">Salary Advance (Single Month Deduction)</option>
                  <option value="loan">Staff Loan (Spread over Multiple Months)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Amount (GHS) *</label>
                  <input
                    type="number"
                    min={50}
                    required
                    value={loanForm.amount}
                    onChange={e => setLoanForm({ ...loanForm, amount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deduction Type *</label>
                  <select
                    value={loanForm.deductionType}
                    onChange={e => setLoanForm({ ...loanForm, deductionType: e.target.value as any, deductionValue: e.target.value === 'percentage' ? 10 : Math.round(loanForm.amount / 3) })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-semibold"
                  >
                    <option value="cash">Fixed Cash (GHS)</option>
                    <option value="percentage">Percentage (%) of Salary</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    {loanForm.deductionType === 'percentage' ? 'Deduction Percentage (%)' : 'Monthly Cash Amount (GHS)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={loanForm.deductionValue}
                    onChange={e => setLoanForm({ ...loanForm, deductionValue: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 py-1 px-2.5 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div className="flex flex-col justify-center pl-2 border-l border-indigo-100">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Estimated Monthly Deduction</span>
                  <span className="text-xs font-black text-indigo-700 font-mono">
                    GHS {(() => {
                      const staff = staffList.find(s => s.uid === loanForm.staffId);
                      const baseSal = staff?.baseSalary || 3500;
                      const calculated = loanForm.deductionType === 'percentage'
                        ? Number(((baseSal * loanForm.deductionValue) / 100).toFixed(2))
                        : loanForm.deductionValue;
                      return calculated.toLocaleString('en-US', { minimumFractionDigits: 2 });
                    })()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason / Purpose</label>
                <input
                  type="text"
                  value={loanForm.purpose}
                  onChange={e => setLoanForm({ ...loanForm, purpose: e.target.value })}
                  placeholder="e.g. Family medical emergency"
                  className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  Record & Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PAYSLIP PREVIEW (ATTACHED TUMI HOSTEL TEMPLATE) */}
      {activePayslipData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-3xl w-full my-8">
            <TumiPayslipTemplate
              data={activePayslipData}
              onClose={() => setActivePayslipData(null)}
            />
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT STAFF PROFILE */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit Staff Record: {editingStaff.name}</h3>
                  <p className="text-xs text-slate-500">Update employee details, emergency contact, marital status & employment type</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingStaff(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaffRecord} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.name}
                    onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={editingStaff.phoneNumber || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, phoneNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / Residence</label>
                  <input
                    type="text"
                    value={editingStaff.location || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, location: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly Base Pay (GHS)</label>
                  <input
                    type="number"
                    min={500}
                    value={editingStaff.baseSalary || 3500}
                    onChange={e => setEditingStaff({ ...editingStaff, baseSalary: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editingStaff.department || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={editingStaff.jobTitle || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, jobTitle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Employment Type */}
              <div className="border-t border-slate-200 pt-3 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 space-y-2">
                <label className="block font-bold text-indigo-950 text-xs">Employment Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'full_time', label: 'Full Time' },
                    { id: 'part_time', label: 'Part Time' },
                    { id: 'probation', label: 'Probation' },
                    { id: 'other', label: 'Other' }
                  ].map(item => (
                    <label 
                      key={item.id} 
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-[11px] font-bold ${
                        (editingStaff.employmentType === item.id || (item.id === 'full_time' && editingStaff.employmentType === 'fulltime'))
                          ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs ring-1 ring-indigo-500' 
                          : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="editEmpType"
                        value={item.id}
                        checked={editingStaff.employmentType === item.id || (item.id === 'full_time' && editingStaff.employmentType === 'fulltime')}
                        onChange={() => setEditingStaff({ ...editingStaff, employmentType: item.id as any })}
                        className="text-indigo-600"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>

                {editingStaff.employmentType === 'other' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                      Specify Other Employment Terms
                    </label>
                    <input
                      type="text"
                      value={editingStaff.employmentTypeOtherDetails || ''}
                      onChange={e => setEditingStaff({ ...editingStaff, employmentTypeOtherDetails: e.target.value })}
                      placeholder="e.g. Contract, Consultant, Volunteer"
                      className="w-full bg-white border border-slate-200 py-1 px-2.5 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Marital Status Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="editStaffMaritalStatus"
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
                  <label htmlFor="editStaffMaritalStatus" className="flex flex-col cursor-pointer select-none">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <span>Marital Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        (editingStaff.isMarried ?? (editingStaff.maritalStatus === 'married'))
                          ? 'bg-indigo-100 text-indigo-700' 
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {(editingStaff.isMarried ?? (editingStaff.maritalStatus === 'married')) ? 'Married' : 'Single / Unmarried'}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {(editingStaff.isMarried ?? (editingStaff.maritalStatus === 'married'))
                        ? 'Staff is marked as married.'
                        : 'Check this box if the staff member is married.'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="border-t border-slate-200 pt-3 bg-rose-50/40 p-3.5 rounded-xl border border-rose-100/80 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                  <Phone className="w-3.5 h-3.5 text-rose-600" />
                  <span>Emergency Contact Person *</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={editingStaff.emergencyContactName || editingStaff.contactPersonName || ''}
                      onChange={e => setEditingStaff({ 
                        ...editingStaff, 
                        emergencyContactName: e.target.value, 
                        contactPersonName: e.target.value 
                      })}
                      className="w-full bg-white border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Relationship *</label>
                    <input
                      type="text"
                      required
                      value={editingStaff.emergencyContactRelation || editingStaff.contactPersonRelation || ''}
                      onChange={e => setEditingStaff({ 
                        ...editingStaff, 
                        emergencyContactRelation: e.target.value, 
                        contactPersonRelation: e.target.value 
                      })}
                      className="w-full bg-white border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Emergency Phone *</label>
                    <input
                      type="tel"
                      required
                      value={editingStaff.emergencyContactPhone || editingStaff.contactPersonPhone || ''}
                      onChange={e => setEditingStaff({ 
                        ...editingStaff, 
                        emergencyContactPhone: e.target.value, 
                        contactPersonPhone: e.target.value 
                      })}
                      className="w-full bg-white border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
