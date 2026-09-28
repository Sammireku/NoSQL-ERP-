import React, { useRef } from 'react';
import { Printer, Download, X, Building, CheckCircle2, DollarSign } from 'lucide-react';
import { exportToCSV } from '../utils/exportUtils';
import { TumiDocLogo } from './TumiLogos';

export interface PayslipData {
  companyName?: string; // Default: "Tumi Hostel"
  employeeName: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  payPeriod: string;
  workedDays: number;
  holidaysWorked: number;
  paidLeaveDays: number;
  salaryPerDay: number;
  
  // Earnings
  basicSalary: number;
  bonus: number;
  leavePay: number;
  holidayDoublePay?: number;
  
  // Deductions
  advanceDeduction: number;
  loanDeduction: number;
  ssnitDeduction: number; // 5.5% in Ghana
  savingsDeduction: number;
  storePurchasesDeduction: number;
  
  // Balances
  loanBalanceRemaining: number;
}

interface TumiPayslipTemplateProps {
  data: PayslipData;
  onClose?: () => void;
}

export default function TumiPayslipTemplate({ data, onClose }: TumiPayslipTemplateProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const totalEarnings = Number((
    data.basicSalary + 
    data.bonus + 
    data.leavePay + 
    (data.holidayDoublePay || 0)
  ).toFixed(2));

  const totalDeductions = Number((
    data.advanceDeduction + 
    data.loanDeduction + 
    data.ssnitDeduction + 
    data.savingsDeduction + 
    data.storePurchasesDeduction
  ).toFixed(2));

  const netPay = Number((totalEarnings - totalDeductions).toFixed(2));

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const csvRows = [
      { Category: 'Company', Field: 'Name', Value: data.companyName || 'Tumi Hostel' },
      { Category: 'Employee', Field: 'Name', Value: data.employeeName },
      { Category: 'Employee', Field: 'Designation', Value: data.designation },
      { Category: 'Employee', Field: 'Department', Value: data.department },
      { Category: 'Payroll', Field: 'Pay Period', Value: data.payPeriod },
      { Category: 'Attendance', Field: 'Worked Days', Value: data.workedDays },
      { Category: 'Attendance', Field: 'Holidays', Value: data.holidaysWorked },
      { Category: 'Earnings', Field: 'Basic Salary', Value: data.basicSalary },
      { Category: 'Earnings', Field: 'Bonus', Value: data.bonus },
      { Category: 'Earnings', Field: 'Leave', Value: data.leavePay },
      { Category: 'Earnings', Field: 'Total Earnings', Value: totalEarnings },
      { Category: 'Deductions', Field: 'Salary Advance', Value: data.advanceDeduction },
      { Category: 'Deductions', Field: 'Loan Deduction', Value: data.loanDeduction },
      { Category: 'Deductions', Field: 'SSNIT', Value: data.ssnitDeduction },
      { Category: 'Deductions', Field: 'Savings', Value: data.savingsDeduction },
      { Category: 'Deductions', Field: 'Store Purchases (POS)', Value: data.storePurchasesDeduction },
      { Category: 'Deductions', Field: 'Total Deductions', Value: totalDeductions },
      { Category: 'Summary', Field: 'Net Pay', Value: netPay },
      { Category: 'Summary', Field: 'Loan Balance Remaining', Value: data.loanBalanceRemaining }
    ];
    exportToCSV(csvRows, `Payslip_${data.employeeName.replace(/\s+/g, '_')}_${data.payPeriod.replace(/\s+/g, '_')}.csv`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-3xl w-full mx-auto my-4 text-slate-800 font-sans">
      {/* Action Toolbar */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Official Payslip Preview</span>
          <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Verified Template</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV Export</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Payslip</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Payslip Document Body (Matches User Spreadsheet Template) */}
      <div ref={printRef} className="p-8 print:p-0 space-y-6">
        {/* Header Title with Document Logo */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col items-center justify-center text-center">
          <TumiDocLogo className="mb-2" />
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
            {data.companyName || 'Tumi Hostel'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Tumi Vocational Project & Hospitality Enterprise &bull; Official Employee Payslip</p>
        </div>

        {/* Employee & Pay Period Details Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs border border-slate-300 p-4 rounded-lg bg-slate-50/50">
          {/* Left Column */}
          <div className="space-y-2">
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-600">Date of joining:</span>
              <span className="font-bold text-slate-900">{data.dateOfJoining || '2024-01-15'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-600">Pay period:</span>
              <span className="font-bold text-slate-900">{data.payPeriod}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-600">Worked days:</span>
              <span className="font-bold text-slate-900">{data.workedDays} days</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-600">Holidays (Double Pay):</span>
              <span className="font-bold text-indigo-700">{data.holidaysWorked} days</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-600">Salary per day:</span>
              <span className="font-bold text-slate-900">GHS {data.salaryPerDay.toFixed(2)}</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-2">
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-600">Employee name:</span>
              <span className="font-bold text-slate-900 uppercase">{data.employeeName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-600">Designation:</span>
              <span className="font-bold text-slate-900">{data.designation}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-600">Department:</span>
              <span className="font-bold text-slate-900">{data.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-600">Paid leave:</span>
              <span className="font-bold text-slate-900">{data.paidLeaveDays} days</span>
            </div>
          </div>
        </div>

        {/* Earnings & Deductions Table (Matches Spreadsheet Structure Exactly) */}
        <div className="border-2 border-slate-900 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
                <th className="py-2.5 px-4 border-r border-slate-800 w-1/4">Earnings</th>
                <th className="py-2.5 px-4 border-r-2 border-slate-900 text-right w-1/4">Amount (GHS)</th>
                <th className="py-2.5 px-4 border-r border-slate-800 w-1/4">Deductions</th>
                <th className="py-2.5 px-4 text-right w-1/4">Amount (GHS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 px-4 font-semibold border-r border-slate-200">Basic salary</td>
                <td className="py-2 px-4 text-right font-mono border-r-2 border-slate-900">{data.basicSalary.toFixed(2)}</td>
                <td className="py-2 px-4 font-semibold border-r border-slate-200">Advance</td>
                <td className="py-2 px-4 text-right font-mono text-rose-600">{data.advanceDeduction.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-semibold border-r border-slate-200">Bonus</td>
                <td className="py-2 px-4 text-right font-mono border-r-2 border-slate-900">{data.bonus.toFixed(2)}</td>
                <td className="py-2 px-4 font-semibold border-r border-slate-200">Loan</td>
                <td className="py-2 px-4 text-right font-mono text-rose-600">{data.loanDeduction.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-semibold border-r border-slate-200">Leave</td>
                <td className="py-2 px-4 text-right font-mono border-r-2 border-slate-900">{data.leavePay.toFixed(2)}</td>
                <td className="py-2 px-4 font-semibold border-r border-slate-200">SSNIT (5.5%)</td>
                <td className="py-2 px-4 text-right font-mono text-rose-600">{data.ssnitDeduction.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-semibold border-r border-slate-200">
                  {data.holidayDoublePay ? 'Holiday Double Pay' : ''}
                </td>
                <td className="py-2 px-4 text-right font-mono border-r-2 border-slate-900">
                  {data.holidayDoublePay ? data.holidayDoublePay.toFixed(2) : ''}
                </td>
                <td className="py-2 px-4 font-semibold border-r border-slate-200">Savings</td>
                <td className="py-2 px-4 text-right font-mono text-rose-600">{data.savingsDeduction.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-semibold border-r border-slate-200"></td>
                <td className="py-2 px-4 text-right font-mono border-r-2 border-slate-900"></td>
                <td className="py-2 px-4 font-semibold border-r border-slate-200 text-indigo-700">
                  Store Purchases (POS)
                </td>
                <td className="py-2 px-4 text-right font-mono text-rose-600">{data.storePurchasesDeduction.toFixed(2)}</td>
              </tr>
              <tr className="bg-slate-50 font-bold border-t border-slate-300">
                <td className="py-2 px-4 border-r border-slate-200"></td>
                <td className="py-2 px-4 text-right border-r-2 border-slate-900"></td>
                <td className="py-2 px-4 border-r border-slate-200 text-slate-900">Total deductions</td>
                <td className="py-2 px-4 text-right font-mono text-rose-700">{totalDeductions.toFixed(2)}</td>
              </tr>
              {/* Totals & Net Pay Row */}
              <tr className="bg-slate-100 font-black text-sm border-t-2 border-slate-900">
                <td className="py-3 px-4 uppercase tracking-wider text-slate-900 border-r border-slate-300">
                  Total Earnings
                </td>
                <td className="py-3 px-4 text-right font-mono border-r-2 border-slate-900 text-slate-900">
                  GHS {totalEarnings.toFixed(2)}
                </td>
                <td className="py-3 px-4 uppercase tracking-wider text-emerald-800 border-r border-slate-300">
                  Net pay
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-700">
                  GHS {netPay.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Loan Balance Row at Bottom */}
        <div className="flex items-center justify-between border-2 border-slate-900 p-3 rounded-lg bg-amber-50/50">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Loan balance remaining:
          </span>
          <span className="font-mono font-bold text-sm text-slate-900">
            GHS {data.loanBalanceRemaining.toFixed(2)}
          </span>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 pt-8 text-xs text-slate-600">
          <div className="border-t border-slate-400 pt-2 text-center">
            <span className="font-semibold block">Employee Signature</span>
            <span className="text-[10px] text-slate-400">Acknowledged & received</span>
          </div>
          <div className="border-t border-slate-400 pt-2 text-center">
            <span className="font-semibold block">Authorized Signatory / Accountant</span>
            <span className="text-[10px] text-slate-400">Tumi Enterprise ERP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
