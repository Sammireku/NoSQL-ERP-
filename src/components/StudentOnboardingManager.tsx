import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Calendar, 
  Phone, 
  MapPin, 
  BookOpen, 
  Scissors, 
  Baby, 
  UserCheck, 
  FileText, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Sparkles, 
  X, 
  Upload, 
  ShieldCheck, 
  Eye, 
  Award,
  ChevronRight,
  Send,
  Building,
  TrendingUp,
  Edit3,
  Trash2
} from 'lucide-react';
import { 
  StudentRegistrationRecord, 
  StudentStaffStore, 
  GraduateMicroLoanRecord 
} from '../utils/studentStaffStore';
import { UserProfile } from '../types/erp';
import TrenchLoanInsightsDashboard from './accounting/TrenchLoanInsightsDashboard';

interface StudentOnboardingManagerProps {
  activeUser: UserProfile;
  initialTab?: 'students' | 'microloans' | 'analytics';
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

const ID_TYPES = [
  { id: 'national_id', label: 'Ghana Card (National ID)' },
  { id: 'voters_id', label: "Voter's ID Card" },
  { id: 'nhia_id', label: 'NHIA Health Card' },
  { id: 'drivers_license', label: "Driver's License" }
] as const;

export default function StudentOnboardingManager({ activeUser, initialTab = 'students' }: StudentOnboardingManagerProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'microloans' | 'analytics'>(initialTab);
  const [students, setStudents] = useState<StudentRegistrationRecord[]>(() => StudentStaffStore.getStudents());
  const [graduateLoans, setGraduateLoans] = useState<GraduateMicroLoanRecord[]>(() => StudentStaffStore.getGraduateLoans());
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'overdue' | 'cleared'>('all');
  
  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<StudentRegistrationRecord | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payTargetStudent, setPayTargetStudent] = useState<StudentRegistrationRecord | null>(null);
  const [payTargetTrench, setPayTargetTrench] = useState<1 | 2 | 3>(1);
  const [payAmount, setPayAmount] = useState<number>(300);
  const [payMethod, setPayMethod] = useState<'Mobile Money' | 'Cash' | 'Bank Transfer'>('Mobile Money');
  const [payReceiptNote, setPayReceiptNote] = useState('');

  // Microloan Modals
  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [selectedLoanForAction, setSelectedLoanForAction] = useState<GraduateMicroLoanRecord | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [disbursementRef, setDisbursementRef] = useState('');
  const [graduatePinAck, setGraduatePinAck] = useState('');

  // Trench Maintenance Fee Configuration (Set by CEO or Manager)
  const [defaultTrenchFee, setDefaultTrenchFee] = useState<number>(() => StudentStaffStore.getDefaultTrenchMaintenanceFee());
  const [isConfigureFeeModalOpen, setIsConfigureFeeModalOpen] = useState(false);
  const [newDefaultFeeInput, setNewDefaultFeeInput] = useState<number>(() => StudentStaffStore.getDefaultTrenchMaintenanceFee());
  const [isEditStudentFeeModalOpen, setIsEditStudentFeeModalOpen] = useState(false);
  const [studentFeeToEdit, setStudentFeeToEdit] = useState<{ id: string; name: string; currentFee: number } | null>(null);
  const [editStudentFeeAmount, setEditStudentFeeAmount] = useState<number>(3000);

  // Form State for Student Registration
  const [formData, setFormData] = useState({
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
    maintenanceFeeTotal: StudentStaffStore.getDefaultTrenchMaintenanceFee()
  });

  // Microloan Form State
  const [loanFormData, setLoanFormData] = useState({
    graduateName: '',
    graduatePhone: '+233 ',
    programCompleted: 'Vocational Sewing & Fashion Tech',
    graduationYear: '2025',
    loanAmount: 2000,
    interestRatePercentage: 5,
    repaymentFrequency: 'monthly' as 'weekly' | 'biweekly' | 'monthly',
    totalDurationWeeksOrMonths: 6,
    purpose: ''
  });

  const [editingStudent, setEditingStudent] = useState<StudentRegistrationRecord | null>(null);

  useEffect(() => {
    setStudents(StudentStaffStore.getStudents());
    setGraduateLoans(StudentStaffStore.getGraduateLoans());

    const handleStudentUpdate = () => {
      setStudents(StudentStaffStore.getStudents());
    };
    window.addEventListener('tumi_students_updated', handleStudentUpdate);
    return () => {
      window.removeEventListener('tumi_students_updated', handleStudentUpdate);
    };
  }, []);

  const isCeo = activeUser.role === 'ceo' || activeUser.role === 'sysadmin' || activeUser.name.toLowerCase().includes('mireku');
  const isManager = activeUser.role === 'manager';
  const isCeoOrManager = isCeo || isManager;
  const isAccountant = activeUser.role === 'accountant' || isCeoOrManager;

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phoneNumber.includes(searchQuery) ||
        s.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.idNumber.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchQuery) return false;

      if (filterStatus === 'compliant') return s.accountStatus === 'cleared' || s.trenches.trench1.status === 'completed';
      if (filterStatus === 'overdue') return s.trenches.trench1.status === 'overdue' || s.trenches.trench2.status === 'overdue' || s.accountStatus === 'overdue';
      if (filterStatus === 'cleared') return s.accountStatus === 'cleared';
      return true;
    });
  }, [students, searchQuery, filterStatus]);

  // Handle register student
  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const trenchTarget = Math.round(formData.maintenanceFeeTotal / 3);

    const newStudent = StudentStaffStore.addStudent({
      name: formData.name,
      dateOfBirth: formData.dateOfBirth,
      phoneNumber: formData.phoneNumber,
      location: formData.location,
      educationalBackground: formData.educationalBackground,
      previousSewingExperience: formData.previousSewingExperience,
      sewingExperienceDetails: formData.sewingExperienceDetails,
      hasKids: formData.hasKids,
      contactPersonName: formData.contactPersonName,
      contactPersonRelation: formData.contactPersonRelation,
      contactPersonPhone: formData.contactPersonPhone,
      idType: formData.idType,
      idNumber: formData.idNumber || `GH-${Date.now().toString().slice(-6)}`,
      idPhotoUrl: formData.idPhotoUrl,
      enrollmentDate: new Date().toISOString().slice(0, 10),
      programName: formData.programName,
      cohort: formData.cohort,
      status: 'active',
      maintenanceFeeTotal: formData.maintenanceFeeTotal,
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

    setStudents(StudentStaffStore.getStudents());
    setIsRegisterModalOpen(false);
    setSelectedStudentForDetails(newStudent);
  };

  // Record Trench Payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTargetStudent || payAmount <= 0) return;

    StudentStaffStore.recordTrenchPayment(payTargetStudent.id, payTargetTrench, {
      amount: payAmount,
      date: new Date().toISOString().slice(0, 10),
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      paymentMethod: payMethod,
      recordedBy: `${activeUser.name} (${activeUser.role})`,
      note: payReceiptNote
    });

    const refreshed = StudentStaffStore.getStudents();
    setStudents(refreshed);
    const updatedSelected = refreshed.find(s => s.id === payTargetStudent.id);
    if (updatedSelected) setSelectedStudentForDetails(updatedSelected);
    setIsPayModalOpen(false);
  };

  // Submit Microloan Request
  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanFormData.graduateName.trim()) return;

    const totalLoanWithInterest = loanFormData.loanAmount * (1 + (loanFormData.interestRatePercentage || 0) / 100);
    const calculatedInstallment = Number((totalLoanWithInterest / (loanFormData.totalDurationWeeksOrMonths || 12)).toFixed(2));

    StudentStaffStore.addGraduateLoan({
      graduateId: 'grad_' + Date.now(),
      graduateName: loanFormData.graduateName,
      graduatePhone: loanFormData.graduatePhone,
      programCompleted: loanFormData.programCompleted,
      graduationYear: loanFormData.graduationYear,
      loanAmount: loanFormData.loanAmount,
      interestRatePercentage: loanFormData.interestRatePercentage,
      repaymentFrequency: loanFormData.repaymentFrequency,
      totalDurationWeeksOrMonths: loanFormData.totalDurationWeeksOrMonths,
      installmentAmount: calculatedInstallment,
      purpose: loanFormData.purpose || 'Equipment financing (sewing machines & startup inventory)',
      applicationDate: new Date().toISOString().slice(0, 10)
    });

    setGraduateLoans(StudentStaffStore.getGraduateLoans());
    setIsNewLoanModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Student & Graduate Management</h1>
              <p className="text-xs text-slate-500">
                Onboarding registrations, 3-trench maintenance fees, and graduate microfinancing loan system.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('students')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'students' 
                  ? 'bg-white text-indigo-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Current Students & Trenches ({students.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('microloans')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'microloans' 
                  ? 'bg-white text-emerald-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                Graduate Microfinancing ({graduateLoans.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'analytics' 
                  ? 'bg-white text-indigo-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                Trench & Loan Analytics
              </span>
            </button>
          </div>

          {activeTab === 'students' && (
            <div className="flex items-center gap-2">
              {isCeoOrManager && (
                <button
                  onClick={() => {
                    setNewDefaultFeeInput(defaultTrenchFee);
                    setIsConfigureFeeModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 px-3 rounded-xl border border-slate-300 shadow-2xs transition-all"
                  title="Configure standard cohort 3-trench maintenance fee (CEO / Manager)"
                >
                  <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Set Trench Fee (GHS {defaultTrenchFee.toLocaleString()})</span>
                </button>
              )}
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, maintenanceFeeTotal: defaultTrenchFee }));
                  setIsRegisterModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Student</span>
              </button>
            </div>
          )}

          {activeTab === 'microloans' && (
            <button
              onClick={() => setIsNewLoanModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Loan Application</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: CURRENT STUDENTS & 3-TRENCH MAINTENANCE FEES */}
      {activeTab === 'students' && (
        <div className="space-y-5">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Enrolled</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{students.length}</p>
              <p className="text-[11px] text-indigo-600 font-medium mt-1">Active vocational trainees</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Fees Collected</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                GHS {students.reduce((acc, s) => acc + s.totalPaid, 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Across all trenches</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Outstanding Fees</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                GHS {students.reduce((acc, s) => acc + s.totalOutstanding, 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Due before graduation</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Trench Compliance Rule</span>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Min 1/3rd paid per trench</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">6-month trench periods</p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, location, ID..."
                className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-700 py-1.5 px-2.5 rounded-lg focus:outline-hidden"
              >
                <option value="all">All Students ({students.length})</option>
                <option value="compliant">Compliant (1/3rd Met)</option>
                <option value="overdue">Delinquent / Overdue</option>
                <option value="cleared">Fully Cleared (100%)</option>
              </select>
            </div>
          </div>

          {/* Student Listing Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Student Profile</th>
                    <th className="py-3 px-4">Contact & Location</th>
                    <th className="py-3 px-4">Background & Sewing</th>
                    <th className="py-3 px-4">Identification</th>
                    <th className="py-3 px-4">3-Trench Progress</th>
                    <th className="py-3 px-4">Account Balance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No students found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => {
                      const t1 = student.trenches.trench1;
                      const t2 = student.trenches.trench2;
                      const t3 = student.trenches.trench3;
                      const isT1Compliant = t1.paidAmount >= t1.targetAmount;
                      const hasKids = student.hasKids;

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 shrink-0">
                                {student.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{student.name}</span>
                                <span className="text-[11px] text-slate-500 block">
                                  DOB: {student.dateOfBirth} | {student.cohort}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-slate-800">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{student.phoneNumber}</span>
                              </div>
                              <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{student.location}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Kin: {student.contactPersonName} ({student.contactPersonRelation})
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex flex-wrap gap-1">
                                {student.educationalBackground.slice(0, 2).map(edu => (
                                  <span key={edu} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
                                    {edu}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 text-[11px]">
                                {student.previousSewingExperience ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                    <Scissors className="w-2.5 h-2.5" /> Has Sewing Exp
                                  </span>
                                ) : (
                                  <span className="text-slate-400">No sewing exp</span>
                                )}
                                {hasKids && (
                                  <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                    <Baby className="w-2.5 h-2.5" /> Has Kids
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 block w-fit">
                              {student.idNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase mt-0.5 block">
                              {student.idType.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 min-w-[180px]">
                            {/* Visual 3-trench status bars */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                <span>3 Trenches (6mo ea)</span>
                                <span>
                                  {Math.round((student.totalPaid / student.maintenanceFeeTotal) * 100)}% Paid
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                <div className="space-y-0.5">
                                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div 
                                      className={`h-full ${t1.paidAmount >= t1.targetAmount ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                      style={{ width: `${Math.min(100, (t1.paidAmount / t1.targetAmount) * 100)}%` }} 
                                    />
                                  </div>
                                  <span className="text-[9px] text-slate-400 block text-center">T1: {t1.paidAmount}/{t1.targetAmount}</span>
                                </div>

                                <div className="space-y-0.5">
                                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div 
                                      className={`h-full ${t2.paidAmount >= t2.targetAmount ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                      style={{ width: `${Math.min(100, (t2.paidAmount / t2.targetAmount) * 100)}%` }} 
                                    />
                                  </div>
                                  <span className="text-[9px] text-slate-400 block text-center">T2: {t2.paidAmount}/{t2.targetAmount}</span>
                                </div>

                                <div className="space-y-0.5">
                                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div 
                                      className={`h-full ${t3.paidAmount >= t3.targetAmount ? 'bg-emerald-500' : 'bg-slate-400'}`} 
                                      style={{ width: `${Math.min(100, (t3.paidAmount / t3.targetAmount) * 100)}%` }} 
                                    />
                                  </div>
                                  <span className="text-[9px] text-slate-400 block text-center">T3: {t3.paidAmount}/{t3.targetAmount}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-bold text-slate-900 block">
                                GHS {student.totalPaid.toLocaleString()}
                              </span>
                              {student.totalOutstanding > 0 ? (
                                <span className="text-[11px] font-semibold text-rose-600 block">
                                  Due: GHS {student.totalOutstanding.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-emerald-600 block flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Fully Cleared
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setPayTargetStudent(student);
                                  setPayTargetTrench(1);
                                  setIsPayModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-all"
                                title="Record Trench Fee Installment"
                              >
                                Record Pay
                              </button>
                              <button
                                onClick={() => setSelectedStudentForDetails(student)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-all"
                                title="View Full Onboarding & Account Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete student record "${student.name}"?`)) {
                                    StudentStaffStore.deleteStudent(student.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all"
                                title="Delete Student Record"
                              >
                                <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* TAB 2: GRADUATE MICROFINANCING LOAN SYSTEM */}
      {activeTab === 'microloans' && (
        <div className="space-y-5">
          {/* Microloans Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Microloans</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{graduateLoans.length}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">Start-up & machine financing</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Awaiting CEO Approval</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {graduateLoans.filter(l => l.status === 'pending_ceo_approval').length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Requires CEO sign-off</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Ready for Accountant</span>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {graduateLoans.filter(l => l.status === 'approved_by_ceo').length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Funds pending release</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Funds Disbursed</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                GHS {graduateLoans
                  .filter(l => l.status === 'disbursed_by_accountant' || l.status === 'confirmed_by_graduate' || l.status === 'repaying' || l.status === 'completed')
                  .reduce((sum, l) => sum + l.loanAmount, 0)
                  .toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Empowering women entrepreneurs</p>
            </div>
          </div>

          {/* Microloans Approval Workflow Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Graduate Loan Applications & Multi-Stage Approvals</h3>
                <p className="text-xs text-slate-500">
                  Workflow: Application Submitted &rarr; CEO Approval &rarr; Accountant Fund Release &rarr; Graduate Acknowledgment
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Graduate Profile</th>
                    <th className="py-3 px-4">Loan Details</th>
                    <th className="py-3 px-4">Repayment Schedule</th>
                    <th className="py-3 px-4">Workflow Status</th>
                    <th className="py-3 px-4">Audited Sign-Offs</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {graduateLoans.map(loan => {
                    const status = loan.status;

                    return (
                      <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-bold text-slate-900 block">{loan.graduateName}</span>
                            <span className="text-[11px] text-slate-500 block">
                              {loan.graduatePhone} | {loan.programCompleted} ({loan.graduationYear})
                            </span>
                            <p className="text-[10px] text-indigo-700 mt-0.5 line-clamp-1 italic">
                              "{loan.purpose}"
                            </p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-sm font-bold text-slate-900 block">
                            GHS {loan.loanAmount.toLocaleString()}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {loan.interestRatePercentage}% fee | Term: {loan.totalDurationWeeksOrMonths} {loan.repaymentFrequency}s
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-bold text-slate-800 block">
                              GHS {loan.installmentAmount} / {loan.repaymentFrequency}
                            </span>
                            <span className="text-[11px] text-emerald-600 block">
                              Repaid: GHS {loan.totalRepaid} | Rem: GHS {loan.remainingBalance}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {status === 'pending_ceo_approval' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> Awaiting CEO
                            </span>
                          )}
                          {status === 'approved_by_ceo' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <ShieldCheck className="w-3 h-3" /> CEO Approved (Awaiting Accountant)
                            </span>
                          )}
                          {status === 'disbursed_by_accountant' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                              <DollarSign className="w-3 h-3" /> Funds Disbursed (Awaiting Graduate Ack)
                            </span>
                          )}
                          {status === 'confirmed_by_graduate' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Active & Verified by Graduate
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[11px] space-y-0.5">
                          {loan.ceoApproval && (
                            <p className="text-slate-600">
                              <span className="font-semibold text-slate-800">CEO:</span> {loan.ceoApproval.approvedBy} on {loan.ceoApproval.date}
                            </p>
                          )}
                          {loan.accountantDisbursement && (
                            <p className="text-slate-600">
                              <span className="font-semibold text-slate-800">Acct:</span> {loan.accountantDisbursement.disbursedBy} ({loan.accountantDisbursement.paymentReference})
                            </p>
                          )}
                          {loan.graduateConfirmation && (
                            <p className="text-emerald-700 font-medium">
                              &bull; Graduate confirmed receipt
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* CEO Approval Trigger */}
                            {status === 'pending_ceo_approval' && (
                              <button
                                onClick={() => {
                                  if (!isCeo) {
                                    alert('Only the CEO or Administrator can approve microfinance loan applications.');
                                    return;
                                  }
                                  StudentStaffStore.updateGraduateLoanStatus(loan.id, 'ceo_approve', {
                                    approvedBy: `${activeUser.name} (${activeUser.role.toUpperCase()})`,
                                    notes: 'Verified eligibility and financial repayment viability.'
                                  });
                                  setGraduateLoans(StudentStaffStore.getGraduateLoans());
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all"
                              >
                                CEO Verify & Approve
                              </button>
                            )}

                            {/* Accountant Fund Release */}
                            {status === 'approved_by_ceo' && (
                              <button
                                onClick={() => {
                                  if (!isAccountant) {
                                    alert('Only the Accountant or CEO can indicate disbursement and release funds.');
                                    return;
                                  }
                                  const ref = prompt('Enter Disbursement Payment / Mobile Money Reference Code:', `MOMO-REF-${Date.now().toString().slice(-6)}`);
                                  if (!ref) return;
                                  StudentStaffStore.updateGraduateLoanStatus(loan.id, 'accountant_disburse', {
                                    disbursedBy: `${activeUser.name} (Accountant)`,
                                    paymentReference: ref,
                                    disbursementMethod: 'Mobile Money'
                                  });
                                  setGraduateLoans(StudentStaffStore.getGraduateLoans());
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all"
                              >
                                Release Funds (Acct)
                              </button>
                            )}

                            {/* Graduate Confirmation */}
                            {status === 'disbursed_by_accountant' && (
                              <button
                                onClick={() => {
                                  const pin = prompt(`Enter Graduate Verification PIN / Receipt Signature for ${loan.graduateName}:`, '8812');
                                  if (!pin) return;
                                  StudentStaffStore.updateGraduateLoanStatus(loan.id, 'graduate_confirm', {
                                    signatureOrPin: `Graduate verified via PIN: ${pin}`
                                  });
                                  setGraduateLoans(StudentStaffStore.getGraduateLoans());
                                }}
                                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-all"
                              >
                                Graduate Confirm
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: '3 TRENCHES' & STAFF LOAN REPAYMENT VISUAL DASHBOARD */}
      {activeTab === 'analytics' && (
        <TrenchLoanInsightsDashboard 
          onRecordPaymentClick={(studentId, trenchNumber) => {
            const target = students.find(s => s.id === studentId);
            if (target) {
              setPayTargetStudent(target);
              setPayTargetTrench(trenchNumber);
              setIsPayModalOpen(true);
            }
          }}
        />
      )}

      {/* MODAL 1: STUDENT REGISTRATION / ONBOARDING FORM */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">New Student Onboarding & Registration</h3>
                <p className="text-xs text-slate-500">Capture bio-data, education, sewing experience, emergency contacts & ID.</p>
              </div>
              <button 
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterStudent} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Basic Bio-Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Student Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ama Serwaa Appiah"
                    className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Birth (Calendar / Dropdown) *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number (Phone Textbox) *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+233 24 000 0000"
                    className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / Residence *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Asokwa, Kumasi"
                    className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Educational Background Multi-Checkbox */}
              <div className="border-t border-slate-200 pt-4">
                <label className="block font-bold text-slate-700 mb-2">
                  Educational Background (Multi-Checkbox Selection) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EDUCATION_OPTIONS.map(opt => {
                    const isChecked = formData.educationalBackground.includes(opt.id);
                    return (
                      <label 
                        key={opt.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, educationalBackground: [...formData.educationalBackground, opt.id] });
                            } else {
                              setFormData({ ...formData, educationalBackground: formData.educationalBackground.filter(x => x !== opt.id) });
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Sewing Experience & Kids */}
              <div className="border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.previousSewingExperience}
                      onChange={e => setFormData({ ...formData, previousSewingExperience: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Previous Sewing Experience (Yes / No)</span>
                  </label>
                  {formData.previousSewingExperience && (
                    <input
                      type="text"
                      value={formData.sewingExperienceDetails}
                      onChange={e => setFormData({ ...formData, sewingExperienceDetails: e.target.value })}
                      placeholder="Describe experience (e.g. 6 months apprentice, basic needlework)"
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs text-slate-900"
                    />
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasKids}
                      onChange={e => setFormData({ ...formData, hasKids: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Has Children / Kids (Yes / No)</span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">Helps Tumi coordinate daycare & family-friendly class scheduling.</p>
                </div>
              </div>

              {/* Emergency Contact Person */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-800 mb-2">Emergency Contact Person</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Person Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.contactPersonName}
                      onChange={e => setFormData({ ...formData, contactPersonName: e.target.value })}
                      placeholder="e.g. Kwabena Mensah"
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Relation to Student *</label>
                    <input
                      type="text"
                      required
                      value={formData.contactPersonRelation}
                      onChange={e => setFormData({ ...formData, contactPersonRelation: e.target.value })}
                      placeholder="e.g. Mother, Uncle, Spouse"
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.contactPersonPhone}
                      onChange={e => setFormData({ ...formData, contactPersonPhone: e.target.value })}
                      placeholder="+233 20 000 0000"
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Identification & Image Upload */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-800 mb-2">Identification Verification</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ID Document Type</label>
                    <div className="space-y-1.5">
                      {ID_TYPES.map(idOpt => (
                        <label key={idOpt.id} className="flex items-center gap-2 cursor-pointer text-[11px]">
                          <input
                            type="radio"
                            name="idTypeRadio"
                            value={idOpt.id}
                            checked={formData.idType === idOpt.id}
                            onChange={() => setFormData({ ...formData, idType: idOpt.id as any })}
                            className="text-indigo-600"
                          />
                          <span>{idOpt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">ID Number Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.idNumber}
                        onChange={e => setFormData({ ...formData, idNumber: e.target.value })}
                        placeholder="e.g. GHA-789012345-1"
                        className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs text-slate-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Identification Photo / Image</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center bg-slate-50">
                        <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <span className="text-[11px] text-slate-500 block">Click to upload scanned ID card / photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => setFormData({ ...formData, idPhotoUrl: reader.result as string });
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="text-[10px] text-slate-500 mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance Fee Config (Set by CEO or Manager) */}
              <div className="border-t border-slate-200 pt-4 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-indigo-950 block">Program Maintenance Fee (3 Trenches, 6mo each)</span>
                    <span className="text-[10px] text-slate-500">Spread across 18-month curriculum in 3 equal trenches</span>
                  </div>
                  {isCeoOrManager ? (
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">
                      Editable by CEO / Manager
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                      Set by CEO / Manager
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">Total Fee (GHS):</label>
                  <input
                    type="number"
                    min={300}
                    step={100}
                    required
                    disabled={!isCeoOrManager}
                    value={formData.maintenanceFeeTotal}
                    onChange={e => setFormData({ ...formData, maintenanceFeeTotal: Number(e.target.value) })}
                    className={`px-3 py-1.5 border rounded-lg text-xs font-mono font-bold w-36 ${
                      isCeoOrManager 
                        ? 'bg-white border-indigo-300 text-indigo-950 focus:ring-2 focus:ring-indigo-500' 
                        : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                    }`}
                  />
                  <span className="text-[11px] text-slate-500">
                    =&gt; GHS {Math.round(formData.maintenanceFeeTotal / 3).toLocaleString()} per 6-month trench target
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Trench 1 (Mo 1-6)</span>
                    <span className="font-bold text-slate-800 font-mono">
                      GHS {Math.round(formData.maintenanceFeeTotal / 3).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Trench 2 (Mo 7-12)</span>
                    <span className="font-bold text-slate-800 font-mono">
                      GHS {Math.round(formData.maintenanceFeeTotal / 3).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Trench 3 (Mo 13-18)</span>
                    <span className="font-bold text-slate-800 font-mono">
                      GHS {Math.round(formData.maintenanceFeeTotal / 3).toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-indigo-900">
                  &bull; Students may pay in multiple installments during each trench, but at least 1/3rd (GHS {Math.round(formData.maintenanceFeeTotal / 3).toLocaleString()}) must be paid before close of each trench.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-all"
                >
                  Complete Student Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STUDENT ACCOUNT DETAILS & 3-TRENCH MAINTENANCE LEDGER */}
      {selectedStudentForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  {selectedStudentForDetails.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedStudentForDetails.name}</h3>
                  <p className="text-xs text-slate-500">
                    ID: {selectedStudentForDetails.idNumber} | {selectedStudentForDetails.programName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudentForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              {/* Account Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-indigo-700">Total Program Fee</span>
                      {isCeoOrManager && (
                        <button
                          onClick={() => {
                            setStudentFeeToEdit({
                              id: selectedStudentForDetails.id,
                              name: selectedStudentForDetails.name,
                              currentFee: selectedStudentForDetails.maintenanceFeeTotal
                            });
                            setEditStudentFeeAmount(selectedStudentForDetails.maintenanceFeeTotal);
                            setIsEditStudentFeeModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                          title="Adjust program fee agreement (CEO / Manager)"
                        >
                          Edit Fee (CEO/Mgr)
                        </button>
                      )}
                    </div>
                    <p className="text-xl font-bold text-indigo-950 mt-0.5">
                      GHS {selectedStudentForDetails.maintenanceFeeTotal.toLocaleString()}
                    </p>
                  </div>
                  <span className="text-[10px] text-indigo-600">
                    3 Trenches &times; GHS {Math.round(selectedStudentForDetails.maintenanceFeeTotal / 3).toLocaleString()}
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Total Paid</span>
                  <p className="text-xl font-bold text-emerald-950 mt-0.5">
                    GHS {selectedStudentForDetails.totalPaid.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-emerald-600">
                    {Math.round((selectedStudentForDetails.totalPaid / selectedStudentForDetails.maintenanceFeeTotal) * 100)}% Complete
                  </span>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-amber-700">Outstanding Balance</span>
                  <p className="text-xl font-bold text-amber-950 mt-0.5">
                    GHS {selectedStudentForDetails.totalOutstanding.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-amber-600">Program Graduation Requirement</span>
                </div>
              </div>

              {/* 3 Trenches Breakdown */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>3-Trench Program Schedule & Installment Ledgers</span>
                  <span className="text-xs font-normal text-slate-500">Each trench is 6 months</span>
                </h4>

                {[1, 2, 3].map(trenchIdx => {
                  const key = `trench${trenchIdx}` as 'trench1' | 'trench2' | 'trench3';
                  const trench = selectedStudentForDetails.trenches[key];
                  const isMet = trench.paidAmount >= trench.targetAmount;
                  const isOverdue = trench.status === 'overdue';

                  return (
                    <div key={trenchIdx} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              Trench {trenchIdx}: {trench.monthsRange}
                            </span>
                            {isMet ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Met 1/3rd Requirement
                              </span>
                            ) : isOverdue ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Overdue Delinquent
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                In Progress
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Target: GHS {trench.targetAmount} due before {trench.dueDate}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-bold text-slate-900 block">
                              GHS {trench.paidAmount} / {trench.targetAmount}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {Math.max(0, trench.targetAmount - trench.paidAmount)} remaining
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setPayTargetStudent(selectedStudentForDetails);
                              setPayTargetTrench(trenchIdx as 1 | 2 | 3);
                              setIsPayModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all"
                          >
                            + Add Payment
                          </button>
                        </div>
                      </div>

                      {/* Payment Installments History */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Installments Paid ({trench.payments.length})
                        </span>
                        {trench.payments.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">No payments logged yet for this trench.</p>
                        ) : (
                          <div className="space-y-1">
                            {trench.payments.map(p => (
                              <div key={p.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-[11px]">
                                <div>
                                  <span className="font-bold text-slate-800">GHS {p.amount.toLocaleString()}</span>
                                  <span className="text-slate-500 ml-2">via {p.paymentMethod}</span>
                                  <span className="text-[10px] text-slate-400 ml-2">({p.receiptNumber})</span>
                                </div>
                                <div className="text-slate-500 text-[10px]">
                                  {p.date} &bull; Recorded by {p.recordedBy}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Billed POS Purchases */}
              {selectedStudentForDetails.storePurchases && selectedStudentForDetails.storePurchases.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs">POS / Store Purchases Billed to Student</h4>
                  <div className="space-y-1">
                    {selectedStudentForDetails.storePurchases.map(sp => (
                      <div key={sp.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                        <div>
                          <span className="font-semibold text-slate-800">{sp.description}</span>
                          <span className="text-[10px] text-slate-400 ml-2">{sp.date}</span>
                        </div>
                        <span className="font-bold text-rose-600">GHS {sp.amount} (Billed)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD TRENCH PAYMENT INSTALLMENT */}
      {isPayModalOpen && payTargetStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Record Maintenance Fee Installment</h3>
                <p className="text-xs text-slate-500">For student: {payTargetStudent.name}</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Trench Period</label>
                <select
                  value={payTargetTrench}
                  onChange={e => {
                    const trenchNum = Number(e.target.value) as 1 | 2 | 3;
                    setPayTargetTrench(trenchNum);
                    // Also reset payAmount to a sensible bit installment or remaining balance
                    const trenchKey = `trench${trenchNum}` as 'trench1' | 'trench2' | 'trench3';
                    const details = payTargetStudent.trenches[trenchKey];
                    const remaining = Math.max(0, details.targetAmount - details.paidAmount);
                    setPayAmount(remaining > 0 ? Math.min(100, remaining) : 0);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>Trench 1 (Months 1 - 6)</option>
                  <option value={2}>Trench 2 (Months 7 - 12)</option>
                  <option value={3}>Trench 3 (Months 13 - 18)</option>
                </select>
              </div>

              {(() => {
                const trenchKey = `trench${payTargetTrench}` as 'trench1' | 'trench2' | 'trench3';
                const details = payTargetStudent.trenches[trenchKey];
                const targetAmt = details?.targetAmount || 0;
                const paidAmt = details?.paidAmount || 0;
                const remainingAmt = Math.max(0, targetAmt - paidAmt);

                return (
                  <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-indigo-900 uppercase">Trench {payTargetTrench} Ledger</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        details.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {details.status === 'completed' ? 'Fully Cleared' : 'Repaying in Bits'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center bg-white p-2 rounded-lg border border-indigo-50 font-mono">
                      <div>
                        <span className="text-[8px] text-slate-400 block font-bold uppercase">Target Total</span>
                        <span className="text-xs font-black text-slate-700">GHS {targetAmt}</span>
                      </div>
                      <div className="border-l border-slate-100">
                        <span className="text-[8px] text-slate-400 block font-bold uppercase">Paid to Date</span>
                        <span className="text-xs font-black text-emerald-600">GHS {paidAmt}</span>
                      </div>
                      <div className="border-l border-slate-100">
                        <span className="text-[8px] text-slate-400 block font-bold uppercase">Outstanding</span>
                        <span className="text-xs font-black text-indigo-700">GHS {remainingAmt}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-indigo-950 bg-indigo-100/50 p-2 rounded-lg leading-relaxed flex items-center gap-1.5 font-medium">
                      <span>💡</span>
                      <span>
                        Students can pay this trench in arbitrary <strong>small bits / installments</strong> over the 6-month interval until cleared.
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Payment Amount (GHS) *</label>
                  <span className="text-[10px] font-extrabold text-indigo-600">Enter custom or select preset</span>
                </div>
                <input
                  type="number"
                  min={1}
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-sm font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {/* Bit Payment Presets */}
                <div className="grid grid-cols-5 gap-1.5 mt-2">
                  {[50, 100, 200, 500].map(amt => {
                    const trenchKey = `trench${payTargetTrench}` as 'trench1' | 'trench2' | 'trench3';
                    const remaining = Math.max(0, payTargetStudent.trenches[trenchKey].targetAmount - payTargetStudent.trenches[trenchKey].paidAmount);
                    const isDisabled = remaining <= 0 || amt > remaining;
                    return (
                      <button
                        key={amt}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setPayAmount(Math.min(amt, remaining))}
                        className={`py-1 rounded-lg border text-[10px] font-bold transition-all ${
                          isDisabled 
                            ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                            : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                        }`}
                      >
                        +GHS {amt}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      const trenchKey = `trench${payTargetTrench}` as 'trench1' | 'trench2' | 'trench3';
                      const details = payTargetStudent.trenches[trenchKey];
                      setPayAmount(Math.max(0, details.targetAmount - details.paidAmount));
                    }}
                    className="py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase transition-all col-span-1"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Mobile Money">Mobile Money (MTN / Telecel / AT)</option>
                  <option value="Cash">Cash (In-person receipt)</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Receipt Note / Trans Ref</label>
                <input
                  type="text"
                  value={payReceiptNote}
                  onChange={e => setPayReceiptNote(e.target.value)}
                  placeholder="e.g. MOMO txn ID 991829 or Cash Voucher #09"
                  className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Confirm & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: NEW GRADUATE MICROLOAN APPLICATION */}
      {isNewLoanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">New Graduate Microfinancing Application</h3>
                <p className="text-xs text-slate-500">Seed funding & equipment financing for program graduates.</p>
              </div>
              <button onClick={() => setIsNewLoanModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Graduate Full Name *</label>
                  <input
                    type="text"
                    required
                    value={loanFormData.graduateName}
                    onChange={e => setLoanFormData({ ...loanFormData, graduateName: e.target.value })}
                    placeholder="e.g. Abena Kyerewaa"
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Graduate Phone *</label>
                  <input
                    type="tel"
                    required
                    value={loanFormData.graduatePhone}
                    onChange={e => setLoanFormData({ ...loanFormData, graduatePhone: e.target.value })}
                    placeholder="+233 24 000 0000"
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loan Amount (GHS) *</label>
                  <input
                    type="number"
                    min={200}
                    required
                    value={loanFormData.loanAmount}
                    onChange={e => setLoanFormData({ ...loanFormData, loanAmount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Repayment Frequency *</label>
                  <select
                    value={loanFormData.repaymentFrequency}
                    onChange={e => setLoanFormData({ ...loanFormData, repaymentFrequency: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-semibold"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Number of Installments</label>
                  <input
                    type="number"
                    min={2}
                    max={52}
                    value={loanFormData.totalDurationWeeksOrMonths}
                    onChange={e => setLoanFormData({ ...loanFormData, totalDurationWeeksOrMonths: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Interest / Admin Fee (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={loanFormData.interestRatePercentage}
                    onChange={e => setLoanFormData({ ...loanFormData, interestRatePercentage: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Purpose / Equipment Required *</label>
                <textarea
                  rows={2}
                  required
                  value={loanFormData.purpose}
                  onChange={e => setLoanFormData({ ...loanFormData, purpose: e.target.value })}
                  placeholder="e.g. Purchase 1 Juki industrial machine and overlock cutter for tailoring business"
                  className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewLoanModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Submit for CEO Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURE DEFAULT TRENCH MAINTENANCE FEE (CEO / MANAGER ONLY) */}
      {isConfigureFeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                Configure Cohort Trench Maintenance Fee
              </h3>
              <button onClick={() => setIsConfigureFeeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                StudentStaffStore.setDefaultTrenchMaintenanceFee(newDefaultFeeInput);
                setDefaultTrenchFee(newDefaultFeeInput);
                setFormData(prev => ({ ...prev, maintenanceFeeTotal: newDefaultFeeInput }));
                setIsConfigureFeeModalOpen(false);
              }}
              className="space-y-4 text-xs"
            >
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-indigo-900">
                <span className="font-bold block mb-1">Executive Fee Setting Authority (CEO & Manager)</span>
                <p className="text-[11px]">
                  Adjusting this setting establishes the standard 18-month vocational maintenance fee for incoming cohorts. The fee is partitioned across 3 six-month trenches (1/3rd payable per trench).
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Total Program Fee (GHS) *</label>
                <input
                  type="number"
                  min={300}
                  step={100}
                  required
                  value={newDefaultFeeInput}
                  onChange={e => setNewDefaultFeeInput(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Trench 1 (Mo 1-6)</span>
                  <span className="font-bold text-slate-900 font-mono">GHS {Math.round(newDefaultFeeInput / 3).toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Trench 2 (Mo 7-12)</span>
                  <span className="font-bold text-slate-900 font-mono">GHS {Math.round(newDefaultFeeInput / 3).toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Trench 3 (Mo 13-18)</span>
                  <span className="font-bold text-slate-900 font-mono">GHS {Math.round(newDefaultFeeInput / 3).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConfigureFeeModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Standard Trench Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT INDIVIDUAL STUDENT TRENCH FEE (CEO / MANAGER ONLY) */}
      {isEditStudentFeeModalOpen && studentFeeToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                Adjust Student Maintenance Fee Agreement
              </h3>
              <button onClick={() => setIsEditStudentFeeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                StudentStaffStore.updateStudentTrenchFee(studentFeeToEdit.id, editStudentFeeAmount);
                const updatedList = StudentStaffStore.getStudents();
                setStudents(updatedList);
                if (selectedStudentForDetails && selectedStudentForDetails.id === studentFeeToEdit.id) {
                  const updatedStudent = updatedList.find(s => s.id === studentFeeToEdit.id);
                  if (updatedStudent) setSelectedStudentForDetails(updatedStudent);
                }
                setIsEditStudentFeeModalOpen(false);
              }}
              className="space-y-4 text-xs"
            >
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block text-sm">{studentFeeToEdit.name}</span>
                <span className="text-slate-500 text-[11px]">
                  Current Total Fee: GHS {studentFeeToEdit.currentFee.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Total Program Maintenance Fee (GHS) *</label>
                <input
                  type="number"
                  min={300}
                  step={100}
                  required
                  value={editStudentFeeAmount}
                  onChange={e => setEditStudentFeeAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-indigo-700 block">Trench 1 Target</span>
                  <span className="font-bold text-indigo-950 font-mono">GHS {Math.round(editStudentFeeAmount / 3).toLocaleString()}</span>
                </div>
                <div className="bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-indigo-700 block">Trench 2 Target</span>
                  <span className="font-bold text-indigo-950 font-mono">GHS {Math.round(editStudentFeeAmount / 3).toLocaleString()}</span>
                </div>
                <div className="bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-indigo-700 block">Trench 3 Target</span>
                  <span className="font-bold text-indigo-950 font-mono">GHS {Math.round(editStudentFeeAmount / 3).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditStudentFeeModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Update Fee Agreement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
