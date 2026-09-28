import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight, 
  Download, 
  Filter, 
  PieChart as PieChartIcon, 
  Layers, 
  CreditCard,
  Briefcase,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { 
  StudentStaffStore, 
  StudentRegistrationRecord, 
  StaffSalaryAdvanceLoan, 
  GraduateMicroLoanRecord 
} from '../../utils/studentStaffStore';
import { exportToCSV } from '../../utils/exportUtils';

interface TrenchLoanInsightsDashboardProps {
  onRecordPaymentClick?: (studentId: string, trenchNumber: 1 | 2 | 3) => void;
  className?: string;
}

const COLORS = {
  paid: '#10b981',       // Emerald
  outstanding: '#f59e0b',// Amber
  repaid: '#6366f1',     // Indigo
  remaining: '#f43f5e',  // Rose
  disbursed: '#3b82f6',  // Blue
  neutral: '#94a3b8'     // Slate
};

export default function TrenchLoanInsightsDashboard({ 
  onRecordPaymentClick,
  className = '' 
}: TrenchLoanInsightsDashboardProps) {
  const [students, setStudents] = useState<StudentRegistrationRecord[]>(() => StudentStaffStore.getStudents());
  const [staffLoans, setStaffLoans] = useState<StaffSalaryAdvanceLoan[]>(() => StudentStaffStore.getStaffLoans());
  const [graduateLoans, setGraduateLoans] = useState<GraduateMicroLoanRecord[]>(() => StudentStaffStore.getGraduateLoans());
  
  // Filters
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [viewScope, setViewScope] = useState<'all' | 'trenches' | 'staff_loans'>('all');
  const [activeLedgerTab, setActiveLedgerTab] = useState<'students' | 'staff_loans'>('students');

  const refreshData = () => {
    setStudents(StudentStaffStore.getStudents());
    setStaffLoans(StudentStaffStore.getStaffLoans());
    setGraduateLoans(StudentStaffStore.getGraduateLoans());
  };

  // Cohort options
  const cohortOptions = useMemo(() => {
    const cohorts = new Set<string>();
    students.forEach(s => {
      if (s.cohort) cohorts.add(s.cohort);
    });
    return Array.from(cohorts);
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (selectedCohort === 'all') return students;
    return students.filter(s => s.cohort === selectedCohort);
  }, [students, selectedCohort]);

  // 1. CALCULATE '3 TRENCHES' METRICS
  const trenchStats = useMemo(() => {
    let t1Target = 0, t1Paid = 0;
    let t2Target = 0, t2Paid = 0;
    let t3Target = 0, t3Paid = 0;

    filteredStudents.forEach(s => {
      t1Target += s.trenches.trench1.targetAmount;
      t1Paid += s.trenches.trench1.paidAmount;

      t2Target += s.trenches.trench2.targetAmount;
      t2Paid += s.trenches.trench2.paidAmount;

      t3Target += s.trenches.trench3.targetAmount;
      t3Paid += s.trenches.trench3.paidAmount;
    });

    const totalTarget = t1Target + t2Target + t3Target;
    const totalPaid = t1Paid + t2Paid + t3Paid;
    const totalOutstanding = Math.max(0, totalTarget - totalPaid);
    const overallRate = totalTarget > 0 ? Math.round((totalPaid / totalTarget) * 100) : 0;

    const t1Outstanding = Math.max(0, t1Target - t1Paid);
    const t2Outstanding = Math.max(0, t2Target - t2Paid);
    const t3Outstanding = Math.max(0, t3Target - t3Paid);

    return {
      totalTarget,
      totalPaid,
      totalOutstanding,
      overallRate,
      trench1: {
        target: t1Target,
        paid: t1Paid,
        outstanding: t1Outstanding,
        rate: t1Target > 0 ? Math.round((t1Paid / t1Target) * 100) : 0
      },
      trench2: {
        target: t2Target,
        paid: t2Paid,
        outstanding: t2Outstanding,
        rate: t2Target > 0 ? Math.round((t2Paid / t2Target) * 100) : 0
      },
      trench3: {
        target: t3Target,
        paid: t3Paid,
        outstanding: t3Outstanding,
        rate: t3Target > 0 ? Math.round((t3Paid / t3Target) * 100) : 0
      }
    };
  }, [filteredStudents]);

  // 2. CALCULATE STAFF LOANS & ADVANCES METRICS
  const staffLoanStats = useMemo(() => {
    let totalDisbursed = 0;
    let totalRemaining = 0;
    let totalMonthlyDeductions = 0;
    let activeLoansCount = 0;

    staffLoans.forEach(l => {
      totalDisbursed += l.amount;
      totalRemaining += l.remainingBalance;
      totalMonthlyDeductions += Math.min(l.remainingBalance, l.monthlyDeduction);
      if (l.remainingBalance > 0) activeLoansCount++;
    });

    const totalRepaid = Math.max(0, totalDisbursed - totalRemaining);
    const recoveryRate = totalDisbursed > 0 ? Math.round((totalRepaid / totalDisbursed) * 100) : 0;

    return {
      totalDisbursed,
      totalRepaid,
      totalRemaining,
      recoveryRate,
      totalMonthlyDeductions,
      activeLoansCount
    };
  }, [staffLoans]);

  // 3. RECHARTS DATA PREPARATION: 3 Trenches Stacked Bar Chart
  const trenchBarChartData = useMemo(() => {
    return [
      {
        name: 'Trench 1 (Mo 1-6)',
        shortName: 'Trench 1',
        Paid: trenchStats.trench1.paid,
        Outstanding: trenchStats.trench1.outstanding,
        Target: trenchStats.trench1.target,
        Rate: `${trenchStats.trench1.rate}%`
      },
      {
        name: 'Trench 2 (Mo 7-12)',
        shortName: 'Trench 2',
        Paid: trenchStats.trench2.paid,
        Outstanding: trenchStats.trench2.outstanding,
        Target: trenchStats.trench2.target,
        Rate: `${trenchStats.trench2.rate}%`
      },
      {
        name: 'Trench 3 (Mo 13-18)',
        shortName: 'Trench 3',
        Paid: trenchStats.trench3.paid,
        Outstanding: trenchStats.trench3.outstanding,
        Target: trenchStats.trench3.target,
        Rate: `${trenchStats.trench3.rate}%`
      }
    ];
  }, [trenchStats]);

  // 4. RECHARTS DATA PREPARATION: Staff Loan Repayment by Employee
  const staffLoanBarData = useMemo(() => {
    return staffLoans.map(l => {
      const repaid = Math.max(0, l.amount - l.remainingBalance);
      return {
        name: l.staffName.split(' ')[0] || l.staffName,
        fullName: l.staffName,
        role: l.staffRole,
        type: l.type === 'advance' ? 'Advance' : 'Loan',
        Disbursed: l.amount,
        Repaid: repaid,
        Remaining: l.remainingBalance,
        MonthlyDeduction: l.monthlyDeduction
      };
    });
  }, [staffLoans]);

  // 5. RECHARTS DATA PREPARATION: Pie Charts (Paid vs Outstanding)
  const studentPieData = useMemo(() => [
    { name: 'Paid / Collected', value: trenchStats.totalPaid, color: COLORS.paid },
    { name: 'Outstanding Receivables', value: trenchStats.totalOutstanding, color: COLORS.outstanding }
  ], [trenchStats]);

  const staffLoanPieData = useMemo(() => [
    { name: 'Repaid to Date', value: staffLoanStats.totalRepaid, color: COLORS.repaid },
    { name: 'Remaining Balance', value: staffLoanStats.totalRemaining, color: COLORS.remaining }
  ], [staffLoanStats]);

  // Export Summary Report as CSV
  const handleExportSummary = () => {
    const summaryRows = [
      {
        Category: 'Student Maintenance Fee - Trench 1',
        Target_Amount_GHS: trenchStats.trench1.target,
        Paid_Amount_GHS: trenchStats.trench1.paid,
        Outstanding_GHS: trenchStats.trench1.outstanding,
        Collection_Rate: `${trenchStats.trench1.rate}%`
      },
      {
        Category: 'Student Maintenance Fee - Trench 2',
        Target_Amount_GHS: trenchStats.trench2.target,
        Paid_Amount_GHS: trenchStats.trench2.paid,
        Outstanding_GHS: trenchStats.trench2.outstanding,
        Collection_Rate: `${trenchStats.trench2.rate}%`
      },
      {
        Category: 'Student Maintenance Fee - Trench 3',
        Target_Amount_GHS: trenchStats.trench3.target,
        Paid_Amount_GHS: trenchStats.trench3.paid,
        Outstanding_GHS: trenchStats.trench3.outstanding,
        Collection_Rate: `${trenchStats.trench3.rate}%`
      },
      {
        Category: 'Total Student 3-Trenches Summary',
        Target_Amount_GHS: trenchStats.totalTarget,
        Paid_Amount_GHS: trenchStats.totalPaid,
        Outstanding_GHS: trenchStats.totalOutstanding,
        Collection_Rate: `${trenchStats.overallRate}%`
      },
      {
        Category: 'Staff Loans & Salary Advances',
        Target_Amount_GHS: staffLoanStats.totalDisbursed,
        Paid_Amount_GHS: staffLoanStats.totalRepaid,
        Outstanding_GHS: staffLoanStats.totalRemaining,
        Collection_Rate: `${staffLoanStats.recoveryRate}%`
      }
    ];

    exportToCSV(summaryRows, `Trench_and_Loan_Insights_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner / Executive Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                Visual Analytics & Financial Control
              </span>
              <span className="text-slate-400 text-xs">• Recharts Intelligence</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
              '3 Trenches' & Staff Loan Repayment Terminal
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Real-time visualization of vocational student 3-trench fee schedules, collection progression, and staff salary advance loan recovery across monthly payroll cycles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Cohort Selector */}
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs">
              <Filter className="w-3.5 h-3.5 text-indigo-300" />
              <select
                value={selectedCohort}
                onChange={e => setSelectedCohort(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">All Cohorts ({students.length})</option>
                {cohortOptions.map(c => (
                  <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                ))}
              </select>
            </div>

            {/* View Scope Toggle */}
            <div className="bg-white/10 backdrop-blur-md p-0.5 rounded-xl border border-white/20 flex text-xs">
              <button
                onClick={() => setViewScope('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  viewScope === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Combined
              </button>
              <button
                onClick={() => setViewScope('trenches')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  viewScope === 'trenches' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                3 Trenches
              </button>
              <button
                onClick={() => setViewScope('staff_loans')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  viewScope === 'staff_loans' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Staff Loans
              </button>
            </div>

            <button
              onClick={refreshData}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportSummary}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK INSIGHTS / KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 3-Trenches Overall Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">3-Trenches Fees Billed</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            GHS {trenchStats.totalTarget.toLocaleString()}
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-emerald-600 font-semibold">Collected: GHS {trenchStats.totalPaid.toLocaleString()}</span>
              <span className="font-bold text-slate-700">{trenchStats.overallRate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, trenchStats.overallRate)}%` }}
              />
            </div>
            <span className="text-[10px] text-amber-600 font-medium block">
              Outstanding Receivables: GHS {trenchStats.totalOutstanding.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 2: Trench 1 Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Trench 1 (Mo 1-6)</span>
              <span className="text-[10px] text-slate-400">Foundations Phase</span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
              {trenchStats.trench1.rate}%
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">
            GHS {trenchStats.trench1.paid.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Target: GHS {trenchStats.trench1.target.toLocaleString()} • Bal: GHS {trenchStats.trench1.outstanding.toLocaleString()}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, trenchStats.trench1.rate)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Trench 2 & 3 Combined */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Trenches 2 & 3</span>
              <span className="text-[10px] text-slate-400">Mo 7-18 Advanced Tracks</span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg">
              Mo 7-18
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Trench 2</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                GHS {trenchStats.trench2.paid.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">({trenchStats.trench2.rate}%)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Trench 3</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                GHS {trenchStats.trench3.paid.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">({trenchStats.trench3.rate}%)</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 block mt-2 pt-2 border-t border-slate-100">
            Total Mo 7-18 Bal: GHS {(trenchStats.trench2.outstanding + trenchStats.trench3.outstanding).toLocaleString()}
          </span>
        </div>

        {/* Card 4: Staff Loans & Advances Recovery */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Loans Recovery</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-indigo-950 mt-2 font-mono">
            GHS {staffLoanStats.totalRepaid.toLocaleString()}
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-indigo-600 font-semibold">Recovery Rate:</span>
              <span className="font-bold text-slate-700">{staffLoanStats.recoveryRate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, staffLoanStats.recoveryRate)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
              <span>Disbursed: GHS {staffLoanStats.totalDisbursed.toLocaleString()}</span>
              <span className="text-rose-600 font-bold">Bal: GHS {staffLoanStats.totalRemaining.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS ROW 1: 3 TRENCHES BAR CHART & STAFF LOANS BAR CHART */}
      {(viewScope === 'all' || viewScope === 'trenches') && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                '3 Trenches' Payment Progress Visualization
              </h3>
              <p className="text-xs text-slate-500">
                Target vs. Paid vs. Outstanding across the 18-month curriculum in 3 equal six-month trenches.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-xs bg-emerald-500" />
                <span className="text-slate-600 font-medium">Paid Amount (GHS)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-xs bg-amber-500" />
                <span className="text-slate-600 font-medium">Outstanding (GHS)</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trenchBarChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `GHS ${val}`}
                />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    `GHS ${Number(value).toLocaleString()}`, 
                    name === 'Paid' ? 'Collected Amount' : 'Outstanding Receivables'
                  ]}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} 
                />
                <Bar 
                  dataKey="Paid" 
                  name="Paid Amount" 
                  stackId="trench" 
                  fill={COLORS.paid} 
                  radius={[0, 0, 4, 4]} 
                />
                <Bar 
                  dataKey="Outstanding" 
                  name="Outstanding Receivables" 
                  stackId="trench" 
                  fill={COLORS.outstanding} 
                  radius={[6, 6, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
              <span className="font-bold text-emerald-950 block">Trench 1 (Foundations)</span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                {trenchStats.trench1.rate}% complete. Students must clear at least GHS 1,000 before proceeding to advanced tailoring.
              </p>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
              <span className="font-bold text-amber-950 block">Trench 2 (Advanced Tailoring)</span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                {trenchStats.trench2.rate}% complete. GHS {trenchStats.trench2.outstanding.toLocaleString()} outstanding across active students.
              </p>
            </div>
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
              <span className="font-bold text-indigo-950 block">Trench 3 (Final Enterprise)</span>
              <p className="text-[11px] text-indigo-800 mt-0.5">
                {trenchStats.trench3.rate}% complete. Mandatory clearance required before microloan qualification.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CHARTS ROW 2: STAFF LOANS BY BORROWER & PIE DISTRIBUTION CHARTS */}
      {(viewScope === 'all' || viewScope === 'staff_loans') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staff Loan Repayment Bar Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Staff Salary Advance & Loan Repayment Status
                </h3>
                <p className="text-xs text-slate-500">
                  Repaid vs. remaining balances for active personnel under automated monthly payroll deduction.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                GHS {staffLoanStats.totalMonthlyDeductions.toLocaleString()}/mo deduction pool
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={staffLoanBarData}
                  margin={{ top: 15, right: 20, left: 15, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `GHS ${val}`}
                  />
                  <Tooltip 
                    formatter={(val: any, name: any) => [`GHS ${Number(val).toLocaleString()}`, name]}
                    labelFormatter={(label: any, payload: any) => {
                      const item = payload?.[0]?.payload;
                      return item ? `${item.fullName} (${item.type} • ${item.role})` : label;
                    }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} 
                  />
                  <Bar dataKey="Disbursed" name="Principal (GHS)" fill={COLORS.disbursed} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Repaid" name="Repaid (GHS)" fill={COLORS.paid} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Remaining" name="Remaining (GHS)" fill={COLORS.remaining} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              * Active deductions are automatically deducted from monthly payroll disbursement in the HR & Team Payroll module.
            </p>
          </div>

          {/* Outstanding vs. Paid Distribution Donut */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-amber-500" />
                Portfolio Exposure Split
              </h3>
              <p className="text-xs text-slate-500">
                Overall outstanding receivables vs. recovered capital.
              </p>
            </div>

            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={studentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {studentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`GHS ${Number(val).toLocaleString()}`, 'Amount']} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Rate</span>
                <span className="text-xl font-black text-slate-900">{trenchStats.overallRate}%</span>
                <span className="text-[9px] text-emerald-600 font-semibold">Trench Collected</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-700">Trench Fees Paid:</span>
                </div>
                <span className="font-bold font-mono text-emerald-700">GHS {trenchStats.totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-slate-700">Trench Fees Due:</span>
                </div>
                <span className="font-bold font-mono text-amber-700">GHS {trenchStats.totalOutstanding.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-slate-700">Staff Loan Balances:</span>
                </div>
                <span className="font-bold font-mono text-rose-700">GHS {staffLoanStats.totalRemaining.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED LEDGER TABLE & DRILLDOWN TABS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-900 text-sm">Itemized Payment & Repayment Ledger</h3>
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveLedgerTab('students')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  activeLedgerTab === 'students' 
                    ? 'bg-white text-indigo-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Students 3-Trenches ({filteredStudents.length})
              </button>
              <button
                onClick={() => setActiveLedgerTab('staff_loans')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  activeLedgerTab === 'staff_loans' 
                    ? 'bg-white text-indigo-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Staff Loans & Advances ({staffLoans.length})
              </button>
            </div>
          </div>

          <span className="text-xs text-slate-500">
            {activeLedgerTab === 'students' ? 'Showing individual trench targets and payment states' : 'Showing loan principal, deductions, and residual balance'}
          </span>
        </div>

        {activeLedgerTab === 'students' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Cohort</th>
                  <th className="py-3 px-4 text-right">Total Agreement</th>
                  <th className="py-3 px-4 text-center">Trench 1 (Mo 1-6)</th>
                  <th className="py-3 px-4 text-center">Trench 2 (Mo 7-12)</th>
                  <th className="py-3 px-4 text-center">Trench 3 (Mo 13-18)</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => {
                  const t1 = student.trenches.trench1;
                  const t2 = student.trenches.trench2;
                  const t3 = student.trenches.trench3;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {student.name}
                        <span className="block text-[10px] text-slate-400 font-normal">{student.phoneNumber}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{student.cohort}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        GHS {student.maintenanceFeeTotal.toLocaleString()}
                      </td>

                      {/* Trench 1 */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                          t1.paidAmount >= t1.targetAmount 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : t1.paidAmount > 0 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          GHS {t1.paidAmount}/{t1.targetAmount}
                        </span>
                      </td>

                      {/* Trench 2 */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                          t2.paidAmount >= t2.targetAmount 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : t2.paidAmount > 0 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          GHS {t2.paidAmount}/{t2.targetAmount}
                        </span>
                      </td>

                      {/* Trench 3 */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                          t3.paidAmount >= t3.targetAmount 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : t3.paidAmount > 0 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          GHS {t3.paidAmount}/{t3.targetAmount}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        GHS {student.totalPaid.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                        GHS {student.totalOutstanding.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          student.accountStatus === 'cleared'
                            ? 'bg-emerald-100 text-emerald-800'
                            : student.accountStatus === 'overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {student.accountStatus === 'cleared' && <CheckCircle2 className="w-3 h-3" />}
                          {student.accountStatus === 'overdue' && <AlertTriangle className="w-3 h-3" />}
                          {student.accountStatus.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Type & Role</th>
                  <th className="py-3 px-4 text-right">Principal Disbursed</th>
                  <th className="py-3 px-4 text-right">Repaid to Date</th>
                  <th className="py-3 px-4 text-right">Remaining Balance</th>
                  <th className="py-3 px-4 text-right">Monthly Deduction</th>
                  <th className="py-3 px-4 text-center">Recovery Progress</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffLoans.map(loan => {
                  const repaid = Math.max(0, loan.amount - loan.remainingBalance);
                  const rate = loan.amount > 0 ? Math.round((repaid / loan.amount) * 100) : 0;

                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {loan.staffName}
                        <span className="block text-[10px] text-slate-400 font-normal">Purpose: {loan.purpose}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          loan.type === 'advance' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {loan.type.toUpperCase()}
                        </span>
                        <span className="block text-[11px] text-slate-500 capitalize mt-0.5">{loan.staffRole}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        GHS {loan.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        GHS {repaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                        GHS {loan.remainingBalance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                        GHS {loan.monthlyDeduction.toLocaleString()}/mo
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="w-24 mx-auto space-y-1">
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-1.5 rounded-full" 
                              style={{ width: `${Math.min(100, rate)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-600">{rate}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold capitalize">
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
