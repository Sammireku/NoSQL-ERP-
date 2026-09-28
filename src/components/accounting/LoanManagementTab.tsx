import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  Plus, 
  Filter, 
  Sparkles, 
  UserCheck, 
  CreditCard, 
  ArrowRight, 
  Send, 
  X, 
  Download, 
  ChevronRight, 
  Check, 
  PenTool, 
  Hash, 
  Phone, 
  Calendar,
  Lock,
  Layers,
  Users,
  TrendingUp
} from 'lucide-react';
import { 
  StudentStaffStore, 
  GraduateMicroLoanRecord, 
  StaffSalaryAdvanceLoan 
} from '../../utils/studentStaffStore';
import { UserProfile, ChartOfAccount } from '../../types/erp';
import { exportToCSV } from '../../utils/exportUtils';
import TrenchLoanInsightsDashboard from './TrenchLoanInsightsDashboard';

interface LoanManagementTabProps {
  activeUser: UserProfile;
  accounts?: ChartOfAccount[];
  onAddCashFlow?: (newFlow: any) => void;
  onRefreshLedger?: () => void;
}

export type LoanCategory = 'all' | 'graduate_microfinance' | 'staff_loan_advance';
export type LoanStage = 'all' | 'pending' | 'verified' | 'approved' | 'disbursed' | 'active' | 'repaid';

export default function LoanManagementTab({
  activeUser,
  accounts = [],
  onAddCashFlow,
  onRefreshLedger
}: LoanManagementTabProps) {
  // Datasets
  const [gradLoans, setGradLoans] = useState<GraduateMicroLoanRecord[]>(() => StudentStaffStore.getGraduateLoans());
  const [staffLoans, setStaffLoans] = useState<StaffSalaryAdvanceLoan[]>(() => StudentStaffStore.getStaffLoans());

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState<LoanCategory>('all');
  const [stageFilter, setStageFilter] = useState<LoanStage>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Modals & Active Actions
  const [selectedLoanItem, setSelectedLoanItem] = useState<{ isGrad: boolean; item: any } | null>(null);
  const [isCeoSignOffModalOpen, setIsCeoSignOffModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for CEO Sign-Off
  const [ceoSignatureName, setCeoSignatureName] = useState(activeUser.name || 'Samuel Mireku (CEO)');
  const [ceoRemarks, setCeoRemarks] = useState('Approved following credit review and board-mandated microfinancing governance criteria.');
  const [ceoAuthPin, setCeoAuthPin] = useState('CEO-2026-AUTH');
  const [isSubmittingSignOff, setIsSubmittingSignOff] = useState(false);

  // Form states for Verification
  const [verifierNotes, setVerifierNotes] = useState('Applicant identity, guarantor contact, and repayment capacity checked and verified compliant.');

  // Form states for Disbursement
  const [disbursementMethod, setDisbursementMethod] = useState<'Mobile Money' | 'Bank Transfer' | 'Cash Voucher'>('Mobile Money');
  const [disbursementRef, setDisbursementRef] = useState('');
  const [disbursementNotes, setDisbursementNotes] = useState('');

  // Form states for New Request
  const [newRequestType, setNewRequestType] = useState<'graduate' | 'staff'>('graduate');
  const [newGradName, setNewGradName] = useState('');
  const [newGradPhone, setNewGradPhone] = useState('+233 ');
  const [newGradProgram, setNewGradProgram] = useState('Vocational Sewing & Fashion Tech');
  const [newStaffId, setNewStaffId] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Hospitality Staff');
  const [newLoanType, setNewLoanType] = useState<'advance' | 'loan'>('advance');
  const [newAmount, setNewAmount] = useState<number>(1500);
  const [newTerm, setNewTerm] = useState<number>(6);
  const [newInterest, setNewInterest] = useState<number>(5);
  const [newPurpose, setNewPurpose] = useState('');
  const [newDeductionType, setNewDeductionType] = useState<'cash' | 'percentage'>('cash');
  const [newDeductionValue, setNewDeductionValue] = useState<number>(250);

  // Load actual ERP staff list
  const erpUsers = useMemo(() => {
    try {
      const raw = localStorage.getItem('erp_users') || '[]';
      return JSON.parse(raw) as any[];
    } catch (e) {
      return [];
    }
  }, []);

  const isCeo = activeUser.role === 'ceo' || activeUser.role === 'sysadmin' || activeUser.name.toLowerCase().includes('mireku');
  const isAccountantOrManager = activeUser.role === 'accountant' || activeUser.role === 'manager' || isCeo;

  const reloadData = () => {
    setGradLoans(StudentStaffStore.getGraduateLoans());
    setStaffLoans(StudentStaffStore.getStaffLoans());
    if (onRefreshLedger) onRefreshLedger();
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Normalize unified status helper
  const getNormalizedStage = (status: string): 'pending' | 'verified' | 'approved' | 'disbursed' | 'active' | 'repaid' | 'rejected' => {
    if (status === 'pending_ceo_approval' || status === 'pending') return 'pending';
    if (status === 'verified') return 'verified';
    if (status === 'approved_by_ceo' || status === 'approved') return 'approved';
    if (status === 'disbursed_by_accountant' || status === 'disbursed' || status === 'confirmed_by_graduate') return 'disbursed';
    if (status === 'repaying' || status === 'active') return 'active';
    if (status === 'completed' || status === 'repaid') return 'repaid';
    if (status === 'rejected_by_ceo' || status === 'rejected') return 'rejected';
    return 'pending';
  };

  // Unified items list
  const unifiedItems = useMemo(() => {
    const list: Array<{
      id: string;
      isGrad: boolean;
      applicantName: string;
      categoryLabel: string;
      contact: string;
      amount: number;
      monthlyOrInstallment: number;
      purpose: string;
      requestDate: string;
      stage: 'pending' | 'verified' | 'approved' | 'disbursed' | 'active' | 'repaid' | 'rejected';
      rawStatus: string;
      remainingBalance: number;
      verification?: any;
      ceoApproval?: any;
      disbursement?: any;
      rawItem: any;
    }> = [];

    // Add graduate microloans
    gradLoans.forEach(gl => {
      const stage = getNormalizedStage(gl.status);
      list.push({
        id: gl.id,
        isGrad: true,
        applicantName: gl.graduateName,
        categoryLabel: `Graduate Microfinance (${gl.programCompleted})`,
        contact: gl.graduatePhone,
        amount: gl.loanAmount,
        monthlyOrInstallment: gl.installmentAmount,
        purpose: gl.purpose,
        requestDate: gl.applicationDate,
        stage,
        rawStatus: gl.status,
        remainingBalance: gl.remainingBalance,
        verification: gl.verification,
        ceoApproval: gl.ceoApproval,
        disbursement: gl.accountantDisbursement,
        rawItem: gl
      });
    });

    // Add staff loans
    staffLoans.forEach(sl => {
      const stage = getNormalizedStage(sl.status);
      list.push({
        id: sl.id,
        isGrad: false,
        applicantName: sl.staffName,
        categoryLabel: `Staff ${sl.type === 'advance' ? 'Salary Advance' : 'Personal Loan'} (${sl.staffRole})`,
        contact: 'Employee File',
        amount: sl.amount,
        monthlyOrInstallment: sl.monthlyDeduction,
        purpose: sl.purpose,
        requestDate: sl.requestDate,
        stage,
        rawStatus: sl.status,
        remainingBalance: sl.remainingBalance,
        verification: sl.verification,
        ceoApproval: sl.ceoApproval,
        disbursement: sl.disbursement,
        rawItem: sl
      });
    });

    return list.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [gradLoans, staffLoans]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return unifiedItems.filter(item => {
      if (categoryFilter === 'graduate_microfinance' && !item.isGrad) return false;
      if (categoryFilter === 'staff_loan_advance' && item.isGrad) return false;
      if (stageFilter !== 'all' && item.stage !== stageFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = item.applicantName.toLowerCase().includes(q) ||
          item.categoryLabel.toLowerCase().includes(q) ||
          item.purpose.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [unifiedItems, categoryFilter, stageFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = unifiedItems.length;
    const pendingCount = unifiedItems.filter(i => i.stage === 'pending').length;
    const verifiedCount = unifiedItems.filter(i => i.stage === 'verified').length;
    const approvedCount = unifiedItems.filter(i => i.stage === 'approved').length;
    const disbursedCount = unifiedItems.filter(i => i.stage === 'disbursed' || i.stage === 'active').length;
    const totalPrincipal = unifiedItems.reduce((acc, i) => acc + i.amount, 0);
    const totalOutstanding = unifiedItems.reduce((acc, i) => acc + (i.remainingBalance || 0), 0);

    return {
      totalCount,
      pendingCount,
      verifiedCount,
      approvedCount,
      disbursedCount,
      totalPrincipal,
      totalOutstanding
    };
  }, [unifiedItems]);

  // ACTION: Verify
  const handleExecuteVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanItem) return;

    StudentStaffStore.verifyLoan(selectedLoanItem.item.id, selectedLoanItem.isGrad, {
      name: `${activeUser.name} (${activeUser.role.toUpperCase()})`,
      notes: verifierNotes
    });

    reloadData();
    setIsVerifyModalOpen(false);
    showToast(`Request for ${selectedLoanItem.item.applicantName || selectedLoanItem.item.graduateName || selectedLoanItem.item.staffName} verified and escalated to CEO for digital sign-off.`);
  };

  // ACTION: CEO Sign-Off
  const handleExecuteCeoSignOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanItem) return;
    setIsSubmittingSignOff(true);

    setTimeout(() => {
      const generatedCode = `CEO-SIG-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      
      StudentStaffStore.ceoSignOffLoan(selectedLoanItem.item.id, selectedLoanItem.isGrad, {
        approvedBy: ceoSignatureName || `${activeUser.name} (CEO)`,
        digitalSignature: `DIGITAL-SIGN-HASH[${ceoSignatureName}]-AUTH-KEY-${Date.now()}`,
        remarks: ceoRemarks,
        authCode: generatedCode
      });

      reloadData();
      setIsSubmittingSignOff(false);
      setIsCeoSignOffModalOpen(false);
      showToast(`Final CEO Digital Sign-off granted (Auth Code: ${generatedCode}). Disbursal is now unlocked for Accounting.`);
    }, 600);
  };

  // ACTION: Disburse Payout
  const handleExecuteDisbursement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanItem) return;

    const refCode = disbursementRef.trim() || `DISB-${Date.now().toString().slice(-6)}`;
    const targetAmount = selectedLoanItem.item.amount || selectedLoanItem.item.loanAmount;
    const recipientName = selectedLoanItem.item.applicantName || selectedLoanItem.item.graduateName || selectedLoanItem.item.staffName;

    StudentStaffStore.disburseLoan(selectedLoanItem.item.id, selectedLoanItem.isGrad, {
      disbursedBy: `${activeUser.name} (${activeUser.role.toUpperCase()})`,
      method: disbursementMethod,
      paymentReference: refCode,
      notes: disbursementNotes || `Disbursed via ${disbursementMethod} with reference ${refCode}`
    });

    // Auto-record Cash Flow in Financial Accounting Suite if available
    if (onAddCashFlow) {
      onAddCashFlow({
        date: new Date().toISOString().slice(0, 10),
        description: `Loan Disbursement: ${recipientName} (${selectedLoanItem.isGrad ? 'Vocational Microfinance' : 'Staff Loan/Advance'}) Ref: ${refCode}`,
        category: 'financing_expense',
        type: 'cash_out',
        amount: targetAmount,
        accountCode: '1010', // Operating Cash
        reconciled: true,
        referenceNumber: refCode,
        metadata: {
          loanId: selectedLoanItem.item.id,
          recipient: recipientName,
          disbursedBy: activeUser.name
        }
      });
    }

    reloadData();
    setIsDisburseModalOpen(false);
    showToast(`Loan successfully disbursed! GHS ${targetAmount.toLocaleString()} paid out to ${recipientName} via ${disbursementMethod} [Ref: ${refCode}]. Ledger updated.`);
  };

  // ACTION: Create New Request
  const handleCreateNewRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAmount <= 0) return;

    if (newRequestType === 'graduate') {
      if (!newGradName.trim()) return;
      const totalRepay = Number(newAmount) * (1 + (Number(newInterest) || 0) / 100);
      const computedInstallment = Math.round(totalRepay / (Number(newTerm) || 6));

      StudentStaffStore.addGraduateLoan({
        graduateId: 'grad_' + Date.now(),
        graduateName: newGradName.trim(),
        graduatePhone: newGradPhone.trim(),
        programCompleted: newGradProgram,
        graduationYear: '2026',
        loanAmount: Number(newAmount),
        interestRatePercentage: Number(newInterest),
        repaymentFrequency: 'monthly',
        totalDurationWeeksOrMonths: Number(newTerm),
        installmentAmount: computedInstallment,
        purpose: newPurpose || 'Vocational workshop starter equipment and tools financing',
        applicationDate: new Date().toISOString().slice(0, 10)
      });
      showToast(`New Graduate Microfinance request for ${newGradName} logged with status: PENDING.`);
    } else {
      if (!newStaffName.trim()) return;
      
      const targetUser = erpUsers.find(u => u.uid === newStaffId || u.name.toLowerCase() === newStaffName.toLowerCase());
      const staffBaseSalary = targetUser?.baseSalary || 3500;

      let deductionPerMonth = newDeductionValue;
      if (newDeductionType === 'percentage') {
        deductionPerMonth = Number(((staffBaseSalary * newDeductionValue) / 100).toFixed(2));
      }

      StudentStaffStore.addStaffLoan({
        staffId: newStaffId || (targetUser?.uid) || ('usr_stf_' + Date.now().toString().slice(-4)),
        staffName: newStaffName.trim(),
        staffRole: newStaffRole || targetUser?.jobTitle || 'Staff Member',
        type: newLoanType,
        amount: Number(newAmount),
        monthlyDeduction: deductionPerMonth,
        deductionType: newDeductionType,
        deductionValue: newDeductionValue,
        requestDate: new Date().toISOString().slice(0, 10),
        purpose: newPurpose || (newLoanType === 'advance' ? 'Emergency mid-month salary advance' : 'Staff welfare and educational support loan')
      });
      showToast(`New Staff ${newLoanType === 'advance' ? 'Advance' : 'Loan'} request for ${newStaffName} logged with status: PENDING. Conditions: GHS ${deductionPerMonth}/mo (${newDeductionType === 'percentage' ? `${newDeductionValue}% of GHS ${staffBaseSalary}` : 'fixed cash'}).`);
    }

    reloadData();
    setIsNewRequestModalOpen(false);
    // Reset inputs
    setNewGradName('');
    setNewStaffName('');
    setNewPurpose('');
  };

  // Export CSV
  const handleExportRegister = () => {
    const data = filteredItems.map(item => ({
      'Loan ID': item.id,
      'Applicant Name': item.applicantName,
      'Category': item.categoryLabel,
      'Principal Amount (GHS)': item.amount.toFixed(2),
      'Monthly / Installment (GHS)': item.monthlyOrInstallment.toFixed(2),
      'Remaining Balance (GHS)': item.remainingBalance.toFixed(2),
      'Stage': item.stage.toUpperCase(),
      'Request Date': item.requestDate,
      'Purpose': item.purpose,
      'CEO Approval': item.ceoApproval?.approvedBy || 'Pending',
      'Disbursement Ref': item.disbursement?.paymentReference || 'N/A'
    }));
    exportToCSV(data, `Loan_Microfinance_Register_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold p-1">
            ✕
          </button>
        </div>
      )}

      {/* Main Suite Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Building className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Microfinancing & Staff Loan Management Hub
                <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  4-Stage Approval
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                End-to-end governance pipeline for Vocational Graduate Microfinance and Staff Salary Advances / Loans with CEO digital sign-off and accounting integration.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              showAnalytics
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{showAnalytics ? 'Hide Analytics' : '3-Trenches & Loan Charts'}</span>
          </button>
          <button
            onClick={handleExportRegister}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Register</span>
          </button>
          <button
            onClick={() => {
              setDisbursementRef(`DISB-${Date.now().toString().slice(-6)}`);
              setIsNewRequestModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Loan / Advance Request</span>
          </button>
        </div>
      </div>

      {/* Optional Embedded Recharts Insights Terminal */}
      {showAnalytics && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-200">
          <TrenchLoanInsightsDashboard />
        </div>
      )}

      {/* 4-Stage Governance KPI Tracker Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Stage 1: Pending */}
        <div 
          onClick={() => setStageFilter(stageFilter === 'pending' ? 'all' : 'pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            stageFilter === 'pending'
              ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" /> Stage 1: Pending
            </span>
            <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded-full font-extrabold">{metrics.pendingCount}</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.pendingCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting preliminary review</p>
        </div>

        {/* Stage 2: Verified */}
        <div 
          onClick={() => setStageFilter(stageFilter === 'verified' ? 'all' : 'verified')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            stageFilter === 'verified'
              ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-300'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Stage 2: Verified
            </span>
            <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded-full font-extrabold">{metrics.verifiedCount}</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.verifiedCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Ready for CEO sign-off</p>
        </div>

        {/* Stage 3: Approved */}
        <div 
          onClick={() => setStageFilter(stageFilter === 'approved' ? 'all' : 'approved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            stageFilter === 'approved'
              ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-300'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Stage 3: CEO Approved
            </span>
            <span className="text-[10px] bg-purple-100 px-2 py-0.5 rounded-full font-extrabold">{metrics.approvedCount}</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.approvedCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">CEO digital sign-off completed</p>
        </div>

        {/* Stage 4: Disbursed */}
        <div 
          onClick={() => setStageFilter(stageFilter === 'disbursed' ? 'all' : 'disbursed')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            stageFilter === 'disbursed'
              ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-300'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Stage 4: Disbursed
            </span>
            <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full font-extrabold">{metrics.disbursedCount}</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.disbursedCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Funds released to applicant</p>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full md:w-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              categoryFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Portfolios ({unifiedItems.length})
          </button>
          <button
            onClick={() => setCategoryFilter('graduate_microfinance')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              categoryFilter === 'graduate_microfinance' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Graduate Microfinance ({gradLoans.length})
          </button>
          <button
            onClick={() => setCategoryFilter('staff_loan_advance')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              categoryFilter === 'staff_loan_advance' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff Loans & Advances ({staffLoans.length})
          </button>
        </div>

        {/* Search & Stage Filter Dropdown */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search applicant, purpose, ID..."
              className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value as LoanStage)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">All Status Stages</option>
            <option value="pending">Stage 1: Pending</option>
            <option value="verified">Stage 2: Verified</option>
            <option value="approved">Stage 3: Approved (CEO)</option>
            <option value="disbursed">Stage 4: Disbursed</option>
            <option value="active">Active Repayment</option>
            <option value="repaid">Fully Repaid</option>
          </select>
        </div>
      </div>

      {/* Main Request Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <span>Loan & Microfinance Underwriting Ledger</span>
            <span className="text-[11px] text-slate-400 font-normal">({filteredItems.length} records shown)</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Portfolio Balance Outstanding: <strong className="text-slate-900">GHS {metrics.totalOutstanding.toLocaleString()}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Applicant & Details</th>
                <th className="py-3 px-4">Portfolio Category</th>
                <th className="py-3 px-4">Principal & Installment</th>
                <th className="py-3 px-4">Purpose / Memo</th>
                <th className="py-3 px-4 text-center">Governance Status</th>
                <th className="py-3 px-4 text-right">Remaining Bal</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 italic">
                    No loan or microfinance requests found matching this filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const stage = item.stage;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Applicant & Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            item.isGrad ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {item.applicantName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{item.applicantName}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" /> {item.requestDate} &bull; {item.contact}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Portfolio Category */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.isGrad ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {item.isGrad ? '🎓 Graduate Microfinance' : '👔 Staff Advance / Loan'}
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5 truncate max-w-[180px]">
                          {item.categoryLabel}
                        </span>
                      </td>

                      {/* Principal & Installment */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block font-mono">
                          GHS {item.amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          GHS {item.monthlyOrInstallment.toLocaleString()} / mo
                        </span>
                      </td>

                      {/* Purpose */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <span className="text-slate-600 text-[11px] line-clamp-2" title={item.purpose}>
                          {item.purpose || 'General vocational / personal support'}
                        </span>
                      </td>

                      {/* Governance Status */}
                      <td className="py-3.5 px-4 text-center">
                        {stage === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                          </span>
                        )}
                        {stage === 'verified' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <UserCheck className="w-3 h-3 text-blue-600" /> Verified (Needs CEO)
                          </span>
                        )}
                        {stage === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            <ShieldCheck className="w-3 h-3 text-purple-600" /> CEO Approved
                          </span>
                        )}
                        {(stage === 'disbursed' || stage === 'active') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disbursed & Active
                          </span>
                        )}
                        {stage === 'repaid' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Check className="w-3 h-3 text-slate-500" /> Fully Repaid
                          </span>
                        )}
                        {stage === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <X className="w-3 h-3 text-rose-600" /> Rejected
                          </span>
                        )}
                      </td>

                      {/* Remaining Balance */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold text-slate-900 block">
                          GHS {item.remainingBalance.toLocaleString()}
                        </span>
                        {item.remainingBalance <= 0 && (
                          <span className="text-[10px] text-emerald-600 font-bold">Cleared</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Stage 1: Verify */}
                          {stage === 'pending' && (
                            <button
                              onClick={() => {
                                setSelectedLoanItem({ isGrad: item.isGrad, item: item.rawItem });
                                setIsVerifyModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-all flex items-center gap-1 text-[11px]"
                              title="Verify applicant details, terms and guarantor"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Verify</span>
                            </button>
                          )}

                          {/* Stage 2: CEO Sign-off */}
                          {stage === 'verified' && (
                            <button
                              onClick={() => {
                                setSelectedLoanItem({ isGrad: item.isGrad, item: item.rawItem });
                                setIsCeoSignOffModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all flex items-center gap-1 text-[11px] shadow-2xs"
                              title="CEO Executive Digital Sign-off"
                            >
                              <PenTool className="w-3 h-3" />
                              <span>CEO Sign-Off</span>
                            </button>
                          )}

                          {/* Stage 3: Disburse */}
                          {stage === 'approved' && (
                            <button
                              onClick={() => {
                                setSelectedLoanItem({ isGrad: item.isGrad, item: item.rawItem });
                                setDisbursementRef(`DISB-${Date.now().toString().slice(-6)}`);
                                setIsDisburseModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all flex items-center gap-1 text-[11px] shadow-2xs"
                              title="Disburse payout via Mobile Money or Bank Transfer"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Disburse</span>
                            </button>
                          )}

                          {/* Details Drawer / Modal trigger */}
                          <button
                            onClick={() => setSelectedLoanItem({ isGrad: item.isGrad, item: item.rawItem })}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-all"
                            title="Inspect Complete Audit Trail & Sign-off Details"
                          >
                            <FileText className="w-3.5 h-3.5" />
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

      {/* MODAL 1: CEO DIGITAL SIGN-OFF INTERFACE */}
      {isCeoSignOffModalOpen && selectedLoanItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-purple-200" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight">Executive CEO Digital Sign-Off</h3>
                  <p className="text-xs text-purple-200">
                    Mandatory digital authorization for Microfinance & Staff Loan disbursements
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCeoSignOffModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleExecuteCeoSignOff} className="p-6 space-y-4 text-xs">
              {/* Applicant Card Summary */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950 text-sm">
                    {selectedLoanItem.item.applicantName || selectedLoanItem.item.graduateName || selectedLoanItem.item.staffName}
                  </span>
                  <span className="font-mono font-black text-purple-800 text-sm">
                    GHS {(selectedLoanItem.item.amount || selectedLoanItem.item.loanAmount).toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-purple-900">
                  <strong>Category:</strong> {selectedLoanItem.isGrad ? 'Vocational Graduate Microfinancing' : 'Staff Salary Advance / Loan'} &bull; 
                  <strong className="ml-1">Purpose:</strong> {selectedLoanItem.item.purpose}
                </p>
                {selectedLoanItem.item.verification && (
                  <div className="pt-2 border-t border-purple-200/80 text-[10px] text-purple-800 flex items-center gap-1.5">
                    <UserCheck className="w-3 h-3 text-blue-600 shrink-0" />
                    <span>Verified by: {selectedLoanItem.item.verification.verifiedBy} &bull; {selectedLoanItem.item.verification.notes}</span>
                  </div>
                )}
              </div>

              {/* CEO Digital Credentials Input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  CEO Signatory Authority Name *
                </label>
                <input
                  type="text"
                  required
                  value={ceoSignatureName}
                  onChange={e => setCeoSignatureName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Executive Approval Remarks & Board Policy Confirmation *
                </label>
                <textarea
                  rows={3}
                  required
                  value={ceoRemarks}
                  onChange={e => setCeoRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Executive Digital Key / Authorization PIN</span>
                  <span className="text-[10px] text-purple-600 font-normal">Encrypted Biometric Hash</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={ceoAuthPin}
                    onChange={e => setCeoAuthPin(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Digital Watermark / Seal Preview */}
              <div className="p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-purple-600" />
                  <div>
                    <span className="font-bold text-[11px] block text-slate-900">Digital Signature Stamp</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      SHA256: {Math.random().toString(36).substring(2, 10).toUpperCase()}-CEO-TUMI-ENTERPRISE
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                  AUTHENTICATED
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCeoSignOffModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSignOff}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 transition-all"
                >
                  {isSubmittingSignOff ? (
                    <span>Cryptographically Signing...</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Execute Final CEO Digital Sign-Off</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VERIFICATION MODAL */}
      {isVerifyModalOpen && selectedLoanItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Underwriting Verification Check
              </h3>
              <button onClick={() => setIsVerifyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteVerification} className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block">
                  {selectedLoanItem.item.applicantName || selectedLoanItem.item.graduateName || selectedLoanItem.item.staffName}
                </span>
                <span className="text-slate-500 text-[11px] block">
                  Amount Requested: GHS {(selectedLoanItem.item.amount || selectedLoanItem.item.loanAmount).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Credit & Eligibility Verification Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={verifierNotes}
                  onChange={e => setVerifierNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Verified & Escalate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DISBURSEMENT MODAL */}
      {isDisburseModalOpen && selectedLoanItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Accounting Payout & Fund Disbursement
              </h3>
              <button onClick={() => setIsDisburseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteDisbursement} className="space-y-3.5 text-xs">
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950">
                    {selectedLoanItem.item.applicantName || selectedLoanItem.item.graduateName || selectedLoanItem.item.staffName}
                  </span>
                  <span className="font-black text-emerald-800 font-mono text-sm">
                    GHS {(selectedLoanItem.item.amount || selectedLoanItem.item.loanAmount).toLocaleString()}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 mt-1">
                  CEO Digital Sign-Off Status: <strong className="text-emerald-900">AUTHORIZED</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Disbursement Channel *</label>
                <select
                  value={disbursementMethod}
                  onChange={e => setDisbursementMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Mobile Money">MTN / Vodafone Mobile Money</option>
                  <option value="Bank Transfer">Commercial Bank Direct Transfer</option>
                  <option value="Cash Voucher">Cash Voucher (Hostel Safe Petty Cash)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transaction Reference Code *</label>
                <input
                  type="text"
                  required
                  value={disbursementRef}
                  onChange={e => setDisbursementRef(e.target.value)}
                  placeholder="e.g. MOMO-GH-9988112"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Disbursement Notes & Ledger Tag</label>
                <textarea
                  rows={2}
                  value={disbursementNotes}
                  onChange={e => setDisbursementNotes(e.target.value)}
                  placeholder="e.g. Payout executed to MTN wallet registered in applicant's name."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDisburseModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Release Funds & Post to Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: NEW LOAN / ADVANCE REQUEST */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Initiate New Loan or Microfinance Request
              </h3>
              <button onClick={() => setIsNewRequestModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewRequest} className="space-y-4 text-xs">
              {/* Request Type Toggle */}
              <div className="flex rounded-xl bg-slate-100 p-1 font-bold text-xs">
                <button
                  type="button"
                  onClick={() => setNewRequestType('graduate')}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    newRequestType === 'graduate' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  🎓 Graduate Microfinance
                </button>
                <button
                  type="button"
                  onClick={() => setNewRequestType('staff')}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    newRequestType === 'staff' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  👔 Staff Advance / Loan
                </button>
              </div>

              {/* Graduate Fields */}
              {newRequestType === 'graduate' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Graduate Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Abena Serwaa Boateng"
                      value={newGradName}
                      onChange={e => setNewGradName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phone Number (MoMo) *</label>
                      <input
                        type="text"
                        required
                        value={newGradPhone}
                        onChange={e => setNewGradPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Program Completed</label>
                      <input
                        type="text"
                        value={newGradProgram}
                        onChange={e => setNewGradProgram(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Staff Fields */}
              {newRequestType === 'staff' && (
                <div className="space-y-3.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Request Type *</label>
                      <select
                        value={newLoanType}
                        onChange={e => setNewLoanType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="advance">Salary Advance (Short Term)</option>
                        <option value="loan">Staff Personal Loan (Multi-Month)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Select Staff Member *</label>
                      <select
                        required
                        value={newStaffId}
                        onChange={e => {
                          const targetUid = e.target.value;
                          const found = erpUsers.find(u => u.uid === targetUid);
                          if (found) {
                            setNewStaffId(found.uid);
                            setNewStaffName(found.name);
                            setNewStaffRole(found.jobTitle || found.role.toUpperCase());
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Select Employee --</option>
                        {erpUsers.map(u => (
                          <option key={u.uid} value={u.uid}>
                            {u.name} (GHS {u.baseSalary || 3500}/mo)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Role / Job Title</label>
                      <input
                        type="text"
                        value={newStaffRole}
                        onChange={e => setNewStaffRole(e.target.value)}
                        placeholder="e.g. Housekeeping Staff"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Deduction Condition *</label>
                      <div className="flex gap-1.5 p-0.5 bg-slate-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setNewDeductionType('cash');
                            setNewDeductionValue(Math.round(newAmount / (newTerm || 3)));
                          }}
                          className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                            newDeductionType === 'cash' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                          }`}
                        >
                          Fixed Cash (GHS)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewDeductionType('percentage');
                            setNewDeductionValue(10); // Default 10%
                          }}
                          className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                            newDeductionType === 'percentage' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                          }`}
                        >
                          Salary %
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                    <div>
                      <label className="block text-[10px] font-extrabold text-indigo-950 mb-1">
                        {newDeductionType === 'percentage' ? 'Deduction Percentage (%)' : 'Deduction Amount (GHS)'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={newDeductionValue}
                        onChange={e => setNewDeductionValue(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-indigo-200 bg-white rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="flex flex-col justify-center pl-2 border-l border-indigo-100">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Estimated Monthly Deduction</span>
                      <span className="text-sm font-black text-indigo-800 font-mono">
                        GHS {(() => {
                          const targetUser = erpUsers.find(u => u.uid === newStaffId || u.name.toLowerCase() === newStaffName.toLowerCase());
                          const baseSal = targetUser?.baseSalary || 3500;
                          const calculated = newDeductionType === 'percentage'
                            ? Number(((baseSal * newDeductionValue) / 100).toFixed(2))
                            : newDeductionValue;
                          return calculated.toLocaleString('en-US', { minimumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Common Financial Fields */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Principal (GHS) *</label>
                  <input
                    type="number"
                    min={50}
                    step={10}
                    required
                    value={newAmount}
                    onChange={e => setNewAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Term (Months) *</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    required
                    value={newTerm}
                    onChange={e => setNewTerm(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Interest / Fee (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={newInterest}
                    onChange={e => setNewInterest(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Purpose / Justification *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detail the use of funds and planned repayment..."
                  value={newPurpose}
                  onChange={e => setNewPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Submit Underwriting Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DETAILED AUDIT TRAIL INSPECTOR */}
      {selectedLoanItem && !isCeoSignOffModalOpen && !isVerifyModalOpen && !isDisburseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Loan File & Governance Trail
              </h3>
              <button onClick={() => setSelectedLoanItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedLoanItem.item.applicantName || selectedLoanItem.item.graduateName || selectedLoanItem.item.staffName}
                  </span>
                  <span className="font-mono font-black text-indigo-700 text-sm">
                    GHS {(selectedLoanItem.item.amount || selectedLoanItem.item.loanAmount).toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  <strong>Memo:</strong> {selectedLoanItem.item.purpose}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                  <span>Balance: GHS {(selectedLoanItem.item.remainingBalance ?? 0).toLocaleString()}</span>
                  <span>Date: {selectedLoanItem.item.requestDate || selectedLoanItem.item.applicationDate}</span>
                </div>
              </div>

              {/* 4-Stage History Timeline */}
              <div className="space-y-2 border-l-2 border-slate-200 pl-3.5 ml-2">
                {/* Stage 1 */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white" />
                  <span className="font-bold text-slate-800 block text-[11px]">1. Request Initiated</span>
                  <span className="text-[10px] text-slate-400">
                    Logged on {selectedLoanItem.item.requestDate || selectedLoanItem.item.applicationDate}
                  </span>
                </div>

                {/* Stage 2 */}
                <div className="relative pt-2">
                  <div className={`absolute -left-[21px] top-2.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    selectedLoanItem.item.verification ? 'bg-blue-500' : 'bg-slate-300'
                  }`} />
                  <span className="font-bold text-slate-800 block text-[11px]">2. Underwriting Verification</span>
                  {selectedLoanItem.item.verification ? (
                    <span className="text-[10px] text-blue-700 block">
                      Verified by {selectedLoanItem.item.verification.verifiedBy} &bull; {selectedLoanItem.item.verification.notes}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Pending credit & eligibility check</span>
                  )}
                </div>

                {/* Stage 3 */}
                <div className="relative pt-2">
                  <div className={`absolute -left-[21px] top-2.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    selectedLoanItem.item.ceoApproval ? 'bg-purple-600' : 'bg-slate-300'
                  }`} />
                  <span className="font-bold text-slate-800 block text-[11px]">3. CEO Executive Digital Sign-Off</span>
                  {selectedLoanItem.item.ceoApproval ? (
                    <div className="text-[10px] text-purple-900 bg-purple-50 p-2 rounded-lg border border-purple-200 mt-1">
                      <span className="font-bold block">Authorized by: {selectedLoanItem.item.ceoApproval.approvedBy}</span>
                      <span className="font-mono block text-[9px] text-purple-700 mt-0.5">
                        Code: {selectedLoanItem.item.ceoApproval.authorizationCode || 'CEO-AUTH-APPROVED'}
                      </span>
                      {selectedLoanItem.item.ceoApproval.remarks && (
                        <span className="text-slate-600 italic block mt-0.5">&ldquo;{selectedLoanItem.item.ceoApproval.remarks}&rdquo;</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Awaiting CEO final sign-off</span>
                  )}
                </div>

                {/* Stage 4 */}
                <div className="relative pt-2">
                  <div className={`absolute -left-[21px] top-2.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    (selectedLoanItem.item.disbursement || selectedLoanItem.item.accountantDisbursement) ? 'bg-emerald-500' : 'bg-slate-300'
                  }`} />
                  <span className="font-bold text-slate-800 block text-[11px]">4. Accounting Disbursement</span>
                  {(selectedLoanItem.item.disbursement || selectedLoanItem.item.accountantDisbursement) ? (
                    <div className="text-[10px] text-emerald-900 bg-emerald-50 p-2 rounded-lg border border-emerald-200 mt-1">
                      <span className="font-bold block">
                        Released by: {(selectedLoanItem.item.disbursement || selectedLoanItem.item.accountantDisbursement).disbursedBy}
                      </span>
                      <span className="font-mono block text-[9px] text-emerald-700 mt-0.5">
                        Ref: {(selectedLoanItem.item.disbursement || selectedLoanItem.item.accountantDisbursement).paymentReference} &bull; 
                        Method: {(selectedLoanItem.item.disbursement || selectedLoanItem.item.accountantDisbursement).method || (selectedLoanItem.item.disbursement || selectedLoanItem.item.accountantDisbursement).disbursementMethod}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Pending payout release</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedLoanItem(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
