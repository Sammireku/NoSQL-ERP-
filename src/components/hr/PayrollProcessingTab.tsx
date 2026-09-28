import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Download, 
  DollarSign, 
  Printer, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  Users, 
  ShieldCheck, 
  X,
  Building
} from 'lucide-react';
import { PayrollRunRecord, UserProfile } from '../../types/erp';
import { exportToCSV } from '../../utils/exportUtils';
import TumiPayslipTemplate, { PayslipData } from '../TumiPayslipTemplate';
import { StudentStaffStore } from '../../utils/studentStaffStore';

interface PayrollProcessingTabProps {
  payrollRuns: PayrollRunRecord[];
  users: UserProfile[];
  activeUser: UserProfile;
  onAddPayrollRun: (run: Omit<PayrollRunRecord, 'id' | 'processedAt'>) => void;
  onUpdatePayrollStatus: (id: string, status: 'disbursed') => void;
}

export default function PayrollProcessingTab({
  payrollRuns,
  users,
  activeUser,
  onAddPayrollRun,
  onUpdatePayrollStatus
}: PayrollProcessingTabProps) {
  const [selectedRun, setSelectedRun] = useState<PayrollRunRecord | null>(payrollRuns[0] || null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [periodMonth, setPeriodMonth] = useState('September 2026');
  const [viewingPaySlipEmployee, setViewingPaySlipEmployee] = useState<any | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Active user's department or selected run
  const activeRun = selectedRun || payrollRuns[0];

  const handleRunPayroll = (e: React.FormEvent) => {
    e.preventDefault();

    // Query employee store charges and staff loans directly from profiles
    const allStoreCharges = StudentStaffStore.getStaffStoreCharges();
    const allStaffLoans = StudentStaffStore.getStaffLoans();

    const staffDeductionsList: Array<{ staffId: string; staffName: string; storeAmount: number; loanAdvanceDeduction: number }> = [];

    // Compute payroll items for all active staff
    const activeStaff = users.filter(u => u.status !== 'inactive');
    const items = activeStaff.map(emp => {
      const base = emp.baseSalary || 4200;
      const tax = Number((base * 0.15).toFixed(2));
      const pension = Number((base * 0.05).toFixed(2));

      // 1. Pending Store Purchases for employee
      const employeeStoreCharges = allStoreCharges.filter(sc => 
        (sc.staffId && sc.staffId === emp.uid) ||
        sc.staffName.toLowerCase() === emp.name.toLowerCase()
      ).filter(sc => sc.status === 'pending_payroll_deduction');
      const storeTotal = Number(employeeStoreCharges.reduce((acc, sc) => acc + sc.amount, 0).toFixed(2));

      // 2. Active / Disbursed / Approved Advances & Loans for employee
      const employeeLoans = allStaffLoans.filter(l => 
        (l.staffId && l.staffId === emp.uid) ||
        l.staffName.toLowerCase() === emp.name.toLowerCase()
      ).filter(l => l.status === 'approved' || l.status === 'disbursed' || l.status === 'active');
      
      const loanAdvanceTotal = Number(employeeLoans.reduce((acc, l) => {
        let deduction = l.monthlyDeduction;
        if (l.deductionType === 'percentage' && l.deductionValue) {
          deduction = Number(((base * l.deductionValue) / 100).toFixed(2));
        } else if (l.deductionType === 'cash' && l.deductionValue) {
          deduction = l.deductionValue;
        }
        const actualDeduction = Math.min(l.remainingBalance, deduction);
        return acc + actualDeduction;
      }, 0).toFixed(2));

      staffDeductionsList.push({
        staffId: emp.uid,
        staffName: emp.name,
        storeAmount: storeTotal,
        loanAdvanceDeduction: loanAdvanceTotal
      });

      const totalDeductions = Number((tax + pension + storeTotal + loanAdvanceTotal).toFixed(2));
      const net = Math.max(0, Number((base - totalDeductions).toFixed(2)));

      return {
        employeeId: emp.uid,
        employeeName: emp.name,
        role: emp.role,
        baseSalary: base,
        deductions: totalDeductions,
        taxWithheld: tax,
        storeDeduction: storeTotal,
        loanAdvanceDeduction: loanAdvanceTotal,
        netPay: net
      };
    });

    const totalGross = items.reduce((s, i) => s + i.baseSalary, 0);
    const totalDeductions = items.reduce((s, i) => s + i.deductions, 0);
    const totalNet = items.reduce((s, i) => s + i.netPay, 0);

    const newRun = {
      period: periodMonth,
      totalGross,
      totalDeductions,
      totalNet,
      employeeCount: items.length,
      status: 'disbursed' as const,
      items
    };

    // Apply automatic deductions in StudentStaffStore
    const deductionResult = StudentStaffStore.applyPayrollDeductions(periodMonth, staffDeductionsList);

    onAddPayrollRun(newRun);
    setIsProcessModalOpen(false);
    setSuccessToast(`Payroll run for ${periodMonth} successfully processed and disbursed (GHS ${totalNet.toLocaleString()} net). Automatically deducted linked store purchases (${deductionResult.updatedStoreCount} orders) and updated loan balances.`);
    setTimeout(() => setSuccessToast(null), 6000);
  };

  const handleExport = () => {
    if (!activeRun) return;
    const data = activeRun.items.map(item => ({
      'Payroll Period': activeRun.period,
      'Employee ID': item.employeeId,
      'Employee Name': item.employeeName,
      'Role': item.role.toUpperCase(),
      'Base Gross Pay (GHS)': item.baseSalary.toFixed(2),
      'Tax & Statutory (GHS)': (item.taxWithheld || 0).toFixed(2),
      'Store Purchases Deducted (GHS)': (item.storeDeduction || 0).toFixed(2),
      'Loan / Advance Deducted (GHS)': (item.loanAdvanceDeduction || 0).toFixed(2),
      'Total Deductions (GHS)': item.deductions.toFixed(2),
      'Net Disbursed Pay (GHS)': item.netPay.toFixed(2),
      'Status': activeRun.status.toUpperCase()
    }));
    exportToCSV(data, `Payroll_Summary_${activeRun.period.replace(/\s+/g, '_')}.csv`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-500 hover:text-emerald-700">
            ×
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Automated Enterprise Payroll Processing & Pay Slips
          </h2>
          <p className="text-xs text-slate-500">Calculate gross salaries, statutory tax withholdings, pension deductions and disburse electronic pay slips</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Register</span>
          </button>
          <button
            onClick={() => setIsProcessModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Process New Payroll Run</span>
          </button>
        </div>
      </div>

      {/* Period Selection & Summary KPI Cards */}
      {activeRun && (
        <>
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Viewing Payroll Run:</span>
              <select
                value={activeRun.id}
                onChange={(e) => {
                  const run = payrollRuns.find(r => r.id === e.target.value);
                  if (run) setSelectedRun(run);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-slate-900 focus:outline-none"
              >
                {payrollRuns.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.period} — {r.employeeCount} Employees (${r.totalNet.toLocaleString()} Net)
                  </option>
                ))}
              </select>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold uppercase">
              {activeRun.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Gross Compensation</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ${activeRun.totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{activeRun.employeeCount} staff members</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tax & Pension Deductions</span>
              <p className="text-xl font-bold text-amber-600 mt-1">
                -${activeRun.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">15% income tax + 5% pension</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Disbursed to Staff</span>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                ${activeRun.totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Direct deposit disbursements</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Disbursement Date</span>
              <p className="text-xl font-bold text-indigo-600 mt-1">
                {activeRun.processedAt ? new Date(activeRun.processedAt).toLocaleDateString() : 'Current Month'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Processed via Bank Transfer</p>
            </div>
          </div>

          {/* Itemized Payroll Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Itemized Employee Salary, Store Charges & Loan Deductions
                </span>
                <span className="text-[11px] text-slate-500">
                  Profile store purchases and salary advances are automatically calculated and deducted
                </span>
              </div>
              <span className="text-xs text-slate-400">{activeRun.items.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-right">Base Gross</th>
                    <th className="py-3 px-4 text-right">Tax & Statutory</th>
                    <th className="py-3 px-4 text-right">Store Purchases</th>
                    <th className="py-3 px-4 text-right">Loan / Advance</th>
                    <th className="py-3 px-4 text-right">Total Deductions</th>
                    <th className="py-3 px-4 text-right">Net Disbursed</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeRun.items.map(item => (
                    <tr key={item.employeeId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.employeeName}
                      </td>
                      <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">
                        {item.role}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                        GHS {item.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-600">
                        -GHS {(item.taxWithheld || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-purple-700">
                        {(item.storeDeduction && item.storeDeduction > 0) ? (
                          <span className="font-bold text-purple-700">-GHS {item.storeDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">GHS 0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-indigo-700">
                        {(item.loanAdvanceDeduction && item.loanAdvanceDeduction > 0) ? (
                          <span className="font-bold text-indigo-700">-GHS {item.loanAdvanceDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">GHS 0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 font-bold">
                        -GHS {item.deductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        GHS {item.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setViewingPaySlipEmployee(item)}
                          className="flex items-center justify-center gap-1 mx-auto px-2.5 py-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50/60 hover:bg-indigo-100 rounded transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Pay Slip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Official Tumi Hostel Pay Slip Modal */}
      {viewingPaySlipEmployee && activeRun && (() => {
        const staffLoans = StudentStaffStore.getStaffLoans().filter(l => l.staffName.toLowerCase() === viewingPaySlipEmployee.employeeName.toLowerCase());
        const advances = staffLoans.filter(l => l.type === 'advance');
        const loans = staffLoans.filter(l => l.type === 'loan');
        const totalAdv = advances.reduce((s, a) => s + a.monthlyDeduction, 0);
        const totalLoan = loans.reduce((s, l) => s + l.monthlyDeduction, 0);
        const remainingLoanBal = loans.reduce((s, l) => s + l.remainingBalance, 0);

        const storeCharges = StudentStaffStore.getStaffStoreCharges().filter(sc => 
          sc.staffName.toLowerCase() === viewingPaySlipEmployee.employeeName.toLowerCase()
        );
        const totalStore = storeCharges.reduce((s, sc) => s + sc.amount, 0);

        const workedDays = 22;
        const holidaysWorked = 2;
        const salaryPerDay = Number((viewingPaySlipEmployee.baseSalary / workedDays).toFixed(2));
        const holidayDoublePay = Number((salaryPerDay * holidaysWorked).toFixed(2));
        const ssnit = Number((viewingPaySlipEmployee.baseSalary * 0.055).toFixed(2));

        const payslipData: PayslipData = {
          companyName: 'Tumi Hostel',
          employeeName: viewingPaySlipEmployee.employeeName,
          designation: viewingPaySlipEmployee.role?.toUpperCase() || 'STAFF',
          department: 'Hospitality & Operations',
          dateOfJoining: '2024-01-15',
          payPeriod: activeRun.period,
          workedDays,
          holidaysWorked,
          paidLeaveDays: 2,
          salaryPerDay,
          basicSalary: viewingPaySlipEmployee.baseSalary,
          bonus: 250,
          leavePay: 0,
          holidayDoublePay,
          advanceDeduction: totalAdv,
          loanDeduction: totalLoan,
          ssnitDeduction: ssnit,
          savingsDeduction: 100,
          storePurchasesDeduction: totalStore,
          loanBalanceRemaining: remainingLoanBal
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-3xl w-full my-6">
              <TumiPayslipTemplate
                data={payslipData}
                onClose={() => setViewingPaySlipEmployee(null)}
              />
            </div>
          </div>
        );
      })()}

      {/* Process Payroll Run Modal */}
      {isProcessModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Execute Monthly Payroll Cycle
              </h3>
              <button onClick={() => setIsProcessModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRunPayroll} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Payroll Cycle Month *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October 2026"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {(() => {
                const pendingCharges = StudentStaffStore.getStaffStoreCharges().filter(c => c.status === 'pending_payroll_deduction');
                const totalPendingStore = pendingCharges.reduce((s, c) => s + c.amount, 0);
                const activeLoans = StudentStaffStore.getStaffLoans().filter(l => l.status === 'approved' || l.status === 'disbursed' || l.status === 'active');
                const totalMonthlyLoans = activeLoans.reduce((s, l) => s + Math.min(l.remainingBalance, l.monthlyDeduction), 0);

                return (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-indigo-900 text-xs space-y-1.5">
                    <span className="font-bold block">Automated Profile Deductions Linked:</span>
                    <div className="flex justify-between items-center text-[11px]">
                      <span>Active Personnel to Process:</span>
                      <span className="font-bold">{users.filter(u => u.status !== 'inactive').length} members</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span>Pending Staff Store Purchases:</span>
                      <span className="font-bold font-mono text-purple-700">
                        GHS {totalPendingStore.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({pendingCharges.length} items)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span>Staff Loans / Salary Advances:</span>
                      <span className="font-bold font-mono text-indigo-700">
                        GHS {totalMonthlyLoans.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({activeLoans.length} active)
                      </span>
                    </div>
                    <p className="text-[10px] text-indigo-800 pt-1 border-t border-indigo-200">
                      • Running this cycle will automatically mark store purchases as deducted and reduce employee loan balances.
                    </p>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProcessModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-all"
                >
                  Disburse & Finalize Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
