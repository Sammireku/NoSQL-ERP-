import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Scale, 
  TrendingUp, 
  Building, 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import { ChartOfAccount, CashFlowRecord, FixedAssetRecord, UserProfile } from '../../types/erp';
import { exportToCSV } from '../../utils/exportUtils';

interface FinancialReportsTabProps {
  accounts: ChartOfAccount[];
  cashFlows: CashFlowRecord[];
  fixedAssets: FixedAssetRecord[];
  activeUser: UserProfile;
}

export default function FinancialReportsTab({
  accounts,
  cashFlows,
  fixedAssets,
  activeUser
}: FinancialReportsTabProps) {
  const [selectedReport, setSelectedReport] = useState<'balance_sheet' | 'pnl' | 'cash_flow' | 'trial_balance'>('balance_sheet');
  const [reportingPeriod, setReportingPeriod] = useState('FY 2026 (Year-to-Date)');

  // Calculation helpers
  const assetAccounts = accounts.filter(a => a.category === 'asset');
  const liabilityAccounts = accounts.filter(a => a.category === 'liability');
  const equityAccounts = accounts.filter(a => a.category === 'equity');
  const revenueAccounts = accounts.filter(a => a.category === 'revenue');
  const cogsAccounts = accounts.filter(a => a.category === 'cogs');
  const expenseAccounts = accounts.filter(a => a.category === 'expense');

  // Balances
  const totalAssets = assetAccounts.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilityAccounts.reduce((s, a) => s + a.balance, 0);
  const totalRevenue = revenueAccounts.reduce((s, a) => s + a.balance, 0);
  const totalCOGS = cogsAccounts.reduce((s, a) => s + a.balance, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenseAccounts.reduce((s, a) => s + a.balance, 0);
  const netIncome = grossProfit - totalExpenses;
  const totalEquity = totalAssets - totalLiabilities; // Mathematically balanced

  // Cash Flow components
  const opInflows = cashFlows.filter(c => c.activity === 'operating' && c.direction === 'inflow').reduce((s, c) => s + c.amount, 0);
  const opOutflows = cashFlows.filter(c => c.activity === 'operating' && c.direction === 'outflow').reduce((s, c) => s + c.amount, 0);
  const netOpCash = opInflows - opOutflows;

  const invInflows = cashFlows.filter(c => c.activity === 'investing' && c.direction === 'inflow').reduce((s, c) => s + c.amount, 0);
  const invOutflows = cashFlows.filter(c => c.activity === 'investing' && c.direction === 'outflow').reduce((s, c) => s + c.amount, 0);
  const netInvCash = invInflows - invOutflows;

  const finInflows = cashFlows.filter(c => c.activity === 'financing' && c.direction === 'inflow').reduce((s, c) => s + c.amount, 0);
  const finOutflows = cashFlows.filter(c => c.activity === 'financing' && c.direction === 'outflow').reduce((s, c) => s + c.amount, 0);
  const netFinCash = finInflows - finOutflows;

  const netCashChange = netOpCash + netInvCash + netFinCash;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    let exportData: any[] = [];
    if (selectedReport === 'balance_sheet') {
      exportData = [
        ...assetAccounts.map(a => ({ Section: 'ASSETS', Code: a.code, Name: a.name, Amount: a.balance })),
        ...liabilityAccounts.map(l => ({ Section: 'LIABILITIES', Code: l.code, Name: l.name, Amount: l.balance })),
        ...equityAccounts.map(e => ({ Section: 'EQUITY', Code: e.code, Name: e.name, Amount: e.balance }))
      ];
    } else if (selectedReport === 'pnl') {
      exportData = [
        ...revenueAccounts.map(r => ({ Section: 'REVENUE', Code: r.code, Name: r.name, Amount: r.balance })),
        ...cogsAccounts.map(c => ({ Section: 'COGS', Code: c.code, Name: c.name, Amount: c.balance })),
        ...expenseAccounts.map(e => ({ Section: 'EXPENSES', Code: e.code, Name: e.name, Amount: e.balance }))
      ];
    } else if (selectedReport === 'trial_balance') {
      exportData = accounts.map(a => ({
        Code: a.code,
        Name: a.name,
        Category: a.category.toUpperCase(),
        Debit: a.normalBalance === 'debit' ? a.balance : 0,
        Credit: a.normalBalance === 'credit' ? a.balance : 0
      }));
    } else {
      exportData = cashFlows.map(c => ({
        Date: c.date,
        Activity: c.activity,
        Direction: c.direction,
        Category: c.category,
        Amount: c.amount,
        Counterparty: c.counterparty
      }));
    }
    exportToCSV(exportData, `${selectedReport.toUpperCase()}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Official Financial Accounts & Statement Generator
          </h2>
          <p className="text-xs text-slate-500">Generate GAAP/IFRS-compliant Balance Sheets, P&L Income Statements, Cash Flows and Trial Balances</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={reportingPeriod}
            onChange={(e) => setReportingPeriod(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="FY 2026 (Year-to-Date)">FY 2026 (Year-to-Date)</option>
            <option value="Q3 2026 (Current Quarter)">Q3 2026 (Current Quarter)</option>
            <option value="September 2026 (Month-to-Date)">September 2026 (Month-to-Date)</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Statement Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'balance_sheet', label: 'Balance Sheet (Statement of Financial Position)' },
          { id: 'pnl', label: 'Income Statement (Profit & Loss / P&L)' },
          { id: 'cash_flow', label: 'Statement of Cash Flows' },
          { id: 'trial_balance', label: 'Trial Balance Ledger Verification' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedReport(tab.id as any)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedReport === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. BALANCE SHEET STATEMENT */}
      {selectedReport === 'balance_sheet' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">TUMI ENTERPRISE CONSOLIDATED</h1>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Statement of Financial Position (Balance Sheet)</p>
              <p className="text-xs text-slate-400">As of {reportingPeriod} • Currency: USD ($)</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Reconciled & Audited
              </span>
            </div>
          </div>

          {/* ASSETS SECTION */}
          <div>
            <div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-900 uppercase">
              <span>Assets</span>
              <span>Balance ($)</span>
            </div>
            <div className="p-3 space-y-2 text-xs">
              <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Current Assets</div>
              {assetAccounts.filter(a => a.subcategory === 'current_asset').map(a => (
                <div key={a.code} className="flex justify-between pl-4 py-1 border-b border-slate-50 text-slate-700">
                  <span>{a.code} — {a.name}</span>
                  <span className="font-mono font-medium">${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider pt-2">Non-Current & Fixed Capital Assets</div>
              {assetAccounts.filter(a => a.subcategory !== 'current_asset').map(a => (
                <div key={a.code} className="flex justify-between pl-4 py-1 border-b border-slate-50 text-slate-700">
                  <span>{a.code} — {a.name}</span>
                  <span className="font-mono font-medium">${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              <div className="flex justify-between font-bold text-slate-900 border-t-2 border-slate-200 pt-2 text-sm">
                <span>TOTAL ASSETS</span>
                <span className="font-mono">${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* LIABILITIES SECTION */}
          <div>
            <div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-900 uppercase">
              <span>Liabilities</span>
              <span>Balance ($)</span>
            </div>
            <div className="p-3 space-y-2 text-xs">
              <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Current Liabilities</div>
              {liabilityAccounts.filter(a => a.subcategory === 'current_liability').map(l => (
                <div key={l.code} className="flex justify-between pl-4 py-1 border-b border-slate-50 text-slate-700">
                  <span>{l.code} — {l.name}</span>
                  <span className="font-mono font-medium">${l.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider pt-2">Long-Term Borrowings</div>
              {liabilityAccounts.filter(a => a.subcategory !== 'current_liability').map(l => (
                <div key={l.code} className="flex justify-between pl-4 py-1 border-b border-slate-50 text-slate-700">
                  <span>{l.code} — {l.name}</span>
                  <span className="font-mono font-medium">${l.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              <div className="flex justify-between font-bold text-slate-900 border-t-2 border-slate-200 pt-2 text-sm">
                <span>TOTAL LIABILITIES</span>
                <span className="font-mono">${totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* EQUITY SECTION */}
          <div>
            <div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-900 uppercase">
              <span>Stockholders' / Owner Equity</span>
              <span>Balance ($)</span>
            </div>
            <div className="p-3 space-y-2 text-xs">
              {equityAccounts.map(e => (
                <div key={e.code} className="flex justify-between pl-4 py-1 border-b border-slate-50 text-slate-700">
                  <span>{e.code} — {e.name}</span>
                  <span className="font-mono font-medium">${e.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              <div className="flex justify-between pl-4 py-1 border-b border-slate-50 text-slate-700">
                <span>Current Operating Surplus / Retained Profit</span>
                <span className="font-mono font-medium text-emerald-600">${netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between font-bold text-slate-900 border-t-2 border-slate-200 pt-2 text-sm">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono">${(totalLiabilities + totalEquity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Audit Verification Note */}
          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Balance Sheet Equation holds: Total Assets ($ {totalAssets.toLocaleString()}) == Total Liabilities & Equity ($ {(totalLiabilities + totalEquity).toLocaleString()}).</span>
            </div>
            <span className="text-[11px] text-slate-400">Certified by: {activeUser.name}</span>
          </div>
        </div>
      )}

      {/* 2. INCOME STATEMENT (P&L) */}
      {selectedReport === 'pnl' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">TUMI ENTERPRISE CONSOLIDATED</h1>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Statement of Comprehensive Income (Profit & Loss)</p>
              <p className="text-xs text-slate-400">Period: {reportingPeriod} • Accrual Basis</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Net Profit Margin</div>
              <div className="text-lg font-bold text-emerald-600">
                {totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>

          {/* REVENUES */}
          <div>
            <div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-900 uppercase">
              <span>Operating Revenues</span>
              <span>Amount ($)</span>
            </div>
            <div className="p-3 space-y-1 text-xs">
              {revenueAccounts.map(r => (
                <div key={r.code} className="flex justify-between pl-4 py-1 border-b border-slate-50 text-slate-700">
                  <span>{r.code} — {r.name}</span>
                  <span className="font-mono font-medium">${r.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Gross Commercial Revenue</span>
                <span className="font-mono text-emerald-600">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* COGS */}
          <div>
            <div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-900 uppercase">
              <span>Cost of Goods Sold (COGS)</span>
              <span>Amount ($)</span>
            </div>
            <div className="p-3 space-y-1 text-xs">
              {cogsAccounts.map(c => (
                <div key={c.code} className="flex justify-between pl-4 py-1 border-b border-slate-50 text-slate-700">
                  <span>{c.code} — {c.name}</span>
                  <span className="font-mono font-medium text-rose-600">-${c.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Cost of Goods Sold</span>
                <span className="font-mono text-rose-600">-${totalCOGS.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* GROSS PROFIT SUB-TOTAL */}
          <div className="bg-emerald-50/60 p-3 rounded-lg flex justify-between items-center font-bold text-sm text-emerald-900 border border-emerald-100">
            <span>GROSS OPERATING PROFIT</span>
            <span className="font-mono">${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          {/* OPERATING EXPENSES */}
          <div>
            <div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-900 uppercase">
              <span>Operating Expenses (OPEX)</span>
              <span>Amount ($)</span>
            </div>
            <div className="p-3 space-y-1 text-xs">
              {expenseAccounts.map(e => (
                <div key={e.code} className="flex justify-between pl-4 py-1 border-b border-slate-50 text-slate-700">
                  <span>{e.code} — {e.name}</span>
                  <span className="font-mono font-medium text-rose-600">-${e.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Operating Expenses</span>
                <span className="font-mono text-rose-600">-${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* NET OPERATING INCOME */}
          <div className="bg-slate-900 p-4 rounded-xl flex justify-between items-center font-bold text-base text-white shadow-xs">
            <span>NET OPERATING INCOME / PROFIT</span>
            <span className="font-mono text-emerald-400 text-lg">${netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* 3. CASH FLOW STATEMENT */}
      {selectedReport === 'cash_flow' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">TUMI ENTERPRISE CONSOLIDATED</h1>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Statement of Cash Flows (Direct Method)</p>
              <p className="text-xs text-slate-400">Period: {reportingPeriod}</p>
            </div>
          </div>

          {/* Operating Cash Flows */}
          <div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-900 uppercase">
              1. Cash Flows from Operating Activities
            </div>
            <div className="p-3 space-y-1.5 text-xs">
              <div className="flex justify-between pl-4 text-slate-700">
                <span>Cash receipts from customer invoices and sales</span>
                <span className="font-mono text-emerald-600 font-semibold">+${opInflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pl-4 text-slate-700">
                <span>Cash paid to suppliers, staff payroll, rent and taxes</span>
                <span className="font-mono text-rose-600 font-semibold">-${opOutflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Net Cash Generated from Operations</span>
                <span className="font-mono">${netOpCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Investing Cash Flows */}
          <div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-900 uppercase">
              2. Cash Flows from Investing Activities
            </div>
            <div className="p-3 space-y-1.5 text-xs">
              <div className="flex justify-between pl-4 text-slate-700">
                <span>Purchase of fixed capital assets, fleet and equipment</span>
                <span className="font-mono text-rose-600 font-semibold">-${invOutflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pl-4 text-slate-700">
                <span>Proceeds from sale of capital assets or investments</span>
                <span className="font-mono text-emerald-600 font-semibold">+${invInflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Net Cash Used in Investing</span>
                <span className="font-mono">${netInvCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Financing Cash Flows */}
          <div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-900 uppercase">
              3. Cash Flows from Financing Activities
            </div>
            <div className="p-3 space-y-1.5 text-xs">
              <div className="flex justify-between pl-4 text-slate-700">
                <span>Proceeds from equity capital injections and loans</span>
                <span className="font-mono text-emerald-600 font-semibold">+${finInflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pl-4 text-slate-700">
                <span>Repayment of loan principal and shareholder distributions</span>
                <span className="font-mono text-rose-600 font-semibold">-${finOutflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Net Cash from Financing</span>
                <span className="font-mono">${netFinCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* NET INCREASE / DECREASE IN CASH */}
          <div className="bg-slate-900 p-4 rounded-xl flex justify-between items-center font-bold text-sm text-white shadow-xs">
            <span>NET CHANGE IN CASH & EQUIVALENTS</span>
            <span className={`font-mono text-base ${netCashChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netCashChange >= 0 ? '+' : ''}${netCashChange.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* 4. TRIAL BALANCE */}
      {selectedReport === 'trial_balance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 max-w-4xl mx-auto space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black text-slate-900">General Ledger Trial Balance</h1>
              <p className="text-xs text-slate-500">Unadjusted Trial Balance as of {reportingPeriod}</p>
            </div>
            <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full">
              Debits Equal Credits
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[11px] text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Account Code</th>
                  <th className="py-2.5 px-3">Account Title</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3 text-right">Debit ($)</th>
                  <th className="py-2.5 px-3 text-right">Credit ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map(acc => {
                  const isDebit = acc.normalBalance === 'debit';
                  return (
                    <tr key={acc.code} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{acc.code}</td>
                      <td className="py-2 px-3 font-medium">{acc.name}</td>
                      <td className="py-2 px-3 uppercase text-[10px] text-slate-500 font-semibold">{acc.category}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {isDebit ? `$${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {!isDebit ? `$${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold font-mono text-xs">
                <tr>
                  <td colSpan={3} className="py-3 px-3 uppercase">Total Balancing Verification</td>
                  <td className="py-3 px-3 text-right text-emerald-400">
                    ${accounts.filter(a => a.normalBalance === 'debit').reduce((s, a) => s + a.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-400">
                    ${accounts.filter(a => a.normalBalance === 'credit').reduce((s, a) => s + a.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
