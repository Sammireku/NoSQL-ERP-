import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  Download, 
  CheckCircle2, 
  X, 
  DollarSign, 
  Building, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  User, 
  ArrowRightLeft 
} from 'lucide-react';
import { StudentStaffStore } from '../../utils/studentStaffStore';
import { UserProfile } from '../../types/erp';
import { dataStore } from '../../config/firebase';
import { exportToCSV } from '../../utils/exportUtils';

interface PayrollPayslipsTabProps {
  activeUser: UserProfile;
}

export default function PayrollPayslipsTab({ activeUser }: PayrollPayslipsTabProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewingPayslip, setViewingPayslip] = useState<any | null>(null);

  // Load datasets dynamically
  const staffList = useMemo(() => {
    try {
      return dataStore.getUsers().filter(u => u.role !== 'sysadmin');
    } catch (e) {
      return [];
    }
  }, []);

  const timecards = useMemo(() => {
    try {
      return dataStore.getTimeCards();
    } catch (e) {
      return [];
    }
  }, []);

  const staffLoans = useMemo(() => {
    try {
      return StudentStaffStore.getStaffLoans();
    } catch (e) {
      return [];
    }
  }, []);

  // Compute monthly summary for each staff member
  const payslipData = useMemo(() => {
    return staffList.map(staff => {
      const baseSalary = staff.baseSalary || 3500;
      const workDays = staff.workDaysPerMonth || 22;
      const workHours = staff.workHoursPerDay || 8;
      const dailyRate = staff.dailyRate || Number((baseSalary / workDays).toFixed(2));
      const hourlyRate = staff.hourlyRate || Number((dailyRate / workHours).toFixed(2));

      // Filter completed timecards for this staff in the selected month
      const staffCards = timecards.filter(tc => {
        if (tc.userId !== staff.uid) return false;
        if (!tc.date) return false;
        return tc.date.startsWith(selectedMonth) && tc.status === 'completed';
      });

      const shiftsCount = staffCards.length;
      
      // Compute total hours, regular hours, and overtime from timecards
      let totalHoursWorked = 0;
      let regularHours = 0;
      let overtimeHours = 0;
      let holidayHours = 0;

      staffCards.forEach(tc => {
        const hours = tc.hoursWorked || 8;
        totalHoursWorked += hours;
        
        // Detect if holiday shift (for simplicity, if noted or a custom flag)
        const isHoliday = tc.clockOut === undefined || (tc as any).notes?.toLowerCase().includes('holiday') || (tc as any).isHoliday;
        
        if (isHoliday) {
          holidayHours += hours;
        } else {
          if (hours > workHours) {
            regularHours += workHours;
            overtimeHours += (hours - workHours);
          } else {
            regularHours += hours;
          }
        }
      });

      // Regular Earnings, Overtime, and Holiday Earnings
      const regularEarnings = Number((regularHours * hourlyRate).toFixed(2));
      const overtimeEarnings = Number((overtimeHours * hourlyRate * 1.5).toFixed(2));
      const holidayEarnings = Number((holidayHours * hourlyRate * 2.0).toFixed(2));

      // Subtotal of worked earnings, or default base if no biometrics found
      const earnedBasic = shiftsCount > 0 ? regularEarnings : baseSalary;
      const totalOvertime = overtimeEarnings;
      const totalHoliday = holidayEarnings;
      const grossEarnings = Number((earnedBasic + totalOvertime + totalHoliday).toFixed(2));

      // Loan Deductions for this selected month
      const employeeActiveLoans = staffLoans.filter(l => 
        (l.staffId === staff.uid || l.staffName.toLowerCase() === staff.name.toLowerCase()) &&
        (l.status === 'approved' || l.status === 'disbursed' || l.status === 'active') &&
        l.remainingBalance > 0
      );

      let loanDeduction = 0;
      const loanDetails: any[] = [];

      employeeActiveLoans.forEach(loan => {
        let deductAmt = loan.monthlyDeduction;
        if (loan.deductionType === 'percentage' && loan.deductionValue) {
          deductAmt = Number(((baseSalary * loan.deductionValue) / 100).toFixed(2));
        } else if (loan.deductionType === 'cash' && loan.deductionValue) {
          deductAmt = loan.deductionValue;
        }
        
        const actualDeduct = Math.min(loan.remainingBalance, deductAmt);
        loanDeduction += actualDeduct;
        loanDetails.push({
          id: loan.id,
          type: loan.type,
          purpose: loan.purpose,
          originalAmount: loan.amount,
          remaining: loan.remainingBalance,
          deductedThisMonth: actualDeduct,
          deductionType: loan.deductionType,
          deductionValue: loan.deductionValue
        });
      });

      // Statutory deductions (SSNIT and Taxes)
      const ssnitContribution = Number((earnedBasic * 0.055).toFixed(2)); // 5.5% employee SSNIT
      const incomeTax = Number(((grossEarnings - ssnitContribution) * 0.10).toFixed(2)); // 10% PAYE Bracket estimate

      const totalDeductions = Number((loanDeduction + ssnitContribution + incomeTax).toFixed(2));
      const netPayable = Number((grossEarnings - totalDeductions).toFixed(2));

      return {
        staff,
        baseSalary,
        workDays,
        workHours,
        dailyRate,
        hourlyRate,
        shiftsCount,
        totalHoursWorked: Number(totalHoursWorked.toFixed(1)),
        regularHours,
        overtimeHours,
        holidayHours,
        earnings: {
          regular: regularEarnings,
          overtime: overtimeEarnings,
          holiday: holidayEarnings,
          basic: earnedBasic,
          gross: grossEarnings
        },
        deductions: {
          loans: Number(loanDeduction.toFixed(2)),
          loanDetails,
          ssnit: ssnitContribution,
          tax: incomeTax,
          total: totalDeductions
        },
        netPayable
      };
    });
  }, [staffList, timecards, staffLoans, selectedMonth]);

  // Filtered list
  const filteredPayslips = useMemo(() => {
    if (!searchTerm.trim()) return payslipData;
    const term = searchTerm.toLowerCase();
    return payslipData.filter(p => 
      p.staff.name.toLowerCase().includes(term) ||
      p.staff.role.toLowerCase().includes(term) ||
      (p.staff.department && p.staff.department.toLowerCase().includes(term))
    );
  }, [payslipData, searchTerm]);

  // CSV Export for Payslips Run
  const handleExportPayrollRun = () => {
    const records = filteredPayslips.map(p => ({
      'Employee ID': p.staff.uid,
      'Name': p.staff.name,
      'Role/Job Title': p.staff.jobTitle || p.staff.role.toUpperCase(),
      'Department': p.staff.department || 'Operations',
      'Pay Month': selectedMonth,
      'Base Monthly Salary (GHS)': p.baseSalary.toFixed(2),
      'Shifts Logged': p.shiftsCount,
      'Hours Worked': p.totalHoursWorked,
      'Gross Earnings (GHS)': p.earnings.gross.toFixed(2),
      'SSNIT 5.5% Contribution': p.deductions.ssnit.toFixed(2),
      'PAYE Tax (GHS)': p.deductions.tax.toFixed(2),
      'Loan Deductions (GHS)': p.deductions.loans.toFixed(2),
      'Total Deductions (GHS)': p.deductions.total.toFixed(2),
      'Net Payable Salary (GHS)': p.netPayable.toFixed(2)
    }));
    exportToCSV(records, `ERP_Payroll_Payslips_Run_${selectedMonth}`);
  };

  return (
    <div className="space-y-5">
      {/* Search and Period Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3.5">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Select Pay Period</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="font-bold text-xs text-slate-800 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
            >
              <option value="2026-09">September 2026 (Current Period)</option>
              <option value="2026-08">August 2026 (Past Period)</option>
              <option value="2026-07">July 2026 (Past Period)</option>
              <option value="2026-06">June 2026 (Past Period)</option>
              <option value="2026-05">May 2026 (Past Period)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff name or role..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-indigo-500"
            />
          </div>

          <button
            onClick={handleExportPayrollRun}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Payroll Run</span>
          </button>
        </div>
      </div>

      {/* Main Payslip Management Board */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Staff Monthly Payslips Matrix</h3>
          </div>
          <span className="px-2.5 py-1 bg-white border border-slate-200 text-[10px] text-slate-600 font-bold rounded-lg font-mono">
            Active Workers: {filteredPayslips.length} Profiles
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/60 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="py-2.5 px-4">Employee Details</th>
                <th className="py-2.5 px-3">Base & Rate Card</th>
                <th className="py-2.5 px-3">Shifts Logged</th>
                <th className="py-2.5 px-3">Gross Earnings</th>
                <th className="py-2.5 px-3">Statutory Deductions</th>
                <th className="py-2.5 px-3">Loan Deductions</th>
                <th className="py-2.5 px-3 font-extrabold text-indigo-900">Net Payable</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayslips.map(row => (
                <tr key={row.staff.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-800">{row.staff.name}</div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {row.staff.jobTitle || row.staff.role} | {row.staff.department || 'Operations'}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-800 font-mono">GHS {row.baseSalary.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-400 font-mono">
                      {row.workDays}d @ GHS {row.dailyRate}/d
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {row.shiftsCount > 0 ? (
                      <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                        {row.shiftsCount} Shifts ({row.totalHoursWorked} hrs)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-full text-[10px] font-bold">
                        Standard Base No Logs
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800 font-mono">
                    GHS {row.earnings.gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono">
                    <div>Tax: GHS {row.deductions.tax}</div>
                    <div className="text-[10px]">SSNIT: GHS {row.deductions.ssnit}</div>
                  </td>
                  <td className="py-3 px-3">
                    {row.deductions.loans > 0 ? (
                      <div className="font-semibold text-rose-600 font-mono flex items-center gap-1">
                        <span>GHS {row.deductions.loans.toLocaleString()}</span>
                        <span className="text-[9px] bg-rose-50 px-1 py-0.5 rounded border border-rose-100 font-bold">
                          {row.deductions.loanDetails.length} Loan
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-black text-indigo-700 font-mono">
                    GHS {row.netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setViewingPayslip(row)}
                      className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View Payslip</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RENDER DYNAMIC CORPORATE PAYSLIP MODAL */}
      {viewingPayslip && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-250">
            
            {/* Modal Actions Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-xs uppercase tracking-wider">Official Corporate Pay Slip Ledger</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>
                <button
                  onClick={() => setViewingPayslip(null)}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PRINTABLE DUAL-COLUMN PAYSLIP TEMPLATE */}
            <div id="printable-payslip" className="p-8 space-y-6 bg-white text-slate-800 font-sans print:p-0">
              
              {/* Header Business block */}
              <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-5">
                <div>
                  <h2 className="text-xl font-black text-indigo-900 tracking-tight uppercase flex items-center gap-1.5">
                    <span>🏢</span> enterprise erp software
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Corporate Financial Services & Staffing Services Ltd.
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Accra Central Industrial Area, Ring Road, Ghana
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-800 font-black text-[10px] uppercase rounded-lg">
                    {selectedMonth} Pay Slip
                  </span>
                  <p className="text-[9px] text-slate-400 font-mono mt-1">Generated: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Employee Information Block */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <span className="text-[8px] text-slate-400 font-extrabold uppercase block tracking-wider">Employee Particulars</span>
                  <div className="text-sm font-black text-slate-900">{viewingPayslip.staff.name}</div>
                  <div className="text-[10px] font-bold text-slate-600 capitalize">
                    {viewingPayslip.staff.jobTitle || viewingPayslip.staff.role}
                  </div>
                  <div className="text-[10px] text-slate-500">Department: {viewingPayslip.staff.department || 'Operations'}</div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[8px] text-slate-400 font-extrabold uppercase block tracking-wider">Compensation Parameters</span>
                  <div className="text-xs font-bold text-slate-700">Contract: Full Time Staff</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Rate Card: GHS {viewingPayslip.baseSalary}/mo | {viewingPayslip.workDays}d standard
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Daily: GHS {viewingPayslip.dailyRate}/d | Hourly: GHS {viewingPayslip.hourlyRate}/h
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Dual Columns */}
              <div className="grid grid-cols-2 gap-6 items-start">
                
                {/* Column 1: Gross Earnings */}
                <div className="space-y-3">
                  <div className="border-b border-indigo-900 pb-1.5">
                    <h4 className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">1. Regular & Bonus Earnings</h4>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Basic Salary Wages</span>
                      <span className="font-mono font-semibold">GHS {viewingPayslip.earnings.basic.toFixed(2)}</span>
                    </div>
                    {viewingPayslip.earnings.overtime > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-medium">
                        <span>Overtime Shift Bonus (1.5x)</span>
                        <span className="font-mono font-semibold">+GHS {viewingPayslip.earnings.overtime.toFixed(2)}</span>
                      </div>
                    )}
                    {viewingPayslip.earnings.holiday > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-medium">
                        <span>Statutory Holiday Pay (2.0x)</span>
                        <span className="font-mono font-semibold">+GHS {viewingPayslip.earnings.holiday.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between items-center font-bold text-slate-800 text-xs">
                    <span>Gross Taxable Earnings</span>
                    <span className="font-mono">GHS {viewingPayslip.earnings.gross.toFixed(2)}</span>
                  </div>
                </div>

                {/* Column 2: Deductions */}
                <div className="space-y-3">
                  <div className="border-b border-rose-900 pb-1.5">
                    <h4 className="text-[10px] font-black text-rose-950 uppercase tracking-wider">2. Taxes & Auto-Deductions</h4>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>SSNIT Employee (5.5%)</span>
                      <span className="font-mono text-rose-600 font-semibold">-GHS {viewingPayslip.deductions.ssnit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>PAYE Income Tax (10%)</span>
                      <span className="font-mono text-rose-600 font-semibold">-GHS {viewingPayslip.deductions.tax.toFixed(2)}</span>
                    </div>

                    {/* Active Loan Installment Deductions list */}
                    {viewingPayslip.deductions.loanDetails.map((loan: any) => (
                      <div key={loan.id} className="flex justify-between items-start text-rose-700 font-medium bg-rose-50/40 p-1.5 rounded-lg border border-rose-100/50">
                        <div className="text-[9px]">
                          <span className="capitalize block font-extrabold">{loan.type === 'advance' ? 'Salary Advance' : 'Staff Loan'} Deduct</span>
                          <span className="text-[8px] text-slate-400 block">Bal: GHS {loan.remaining}</span>
                        </div>
                        <span className="font-mono text-[10px] font-bold shrink-0">-GHS {loan.deductedThisMonth.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between items-center font-bold text-rose-700 text-xs">
                    <span>Total Subtracted Deductions</span>
                    <span className="font-mono">GHS {viewingPayslip.deductions.total.toFixed(2)}</span>
                  </div>
                </div>

              </div>

              {/* Net Disbursed Grand Total Panel */}
              <div className="bg-indigo-900 text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <span className="text-[9px] font-black text-indigo-200 block uppercase tracking-widest">
                    NET DISBURSEMENT PAYOUT WAGE
                  </span>
                  <p className="text-[10px] text-indigo-100 font-medium">
                    Deposited / Disbursed via Electronic Funds Transfer (EFT) or Mobile Money
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono tracking-tight">
                    GHS {viewingPayslip.netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Sign-off Authorizations Footer */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100 text-center text-[10px] font-semibold text-slate-400">
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-1.5">
                    <span className="font-bold font-mono text-indigo-700 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{activeUser.name} [Verified]</span>
                    </span>
                  </div>
                  <span className="uppercase tracking-wider">authorized ceo / head accountant</span>
                </div>
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-1.5 h-5 flex items-center justify-center">
                    <span className="text-slate-300 italic font-mono">[Signature or Biometric PIN Input]</span>
                  </div>
                  <span className="uppercase tracking-wider">employee acknowledgment receipt</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
