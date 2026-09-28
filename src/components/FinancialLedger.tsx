import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Building, 
  Package, 
  Scale, 
  FileText, 
  BookOpen, 
  ArrowRightLeft,
  Sparkles,
  Loader2,
  Plus,
  Printer,
  Download,
  CheckCircle2,
  X,
  Receipt,
  Search
} from 'lucide-react';
import { dataStore } from '../config/firebase';
import { 
  UserProfile, 
  ChartOfAccount, 
  CashFlowRecord, 
  FixedAssetRecord, 
  Product, 
  InventoryLevel, 
  POSOrder, 
  DonorGrant 
} from '../types/erp';
import FinancialOverviewTab from './accounting/FinancialOverviewTab';
import ChartOfAccountsTab from './accounting/ChartOfAccountsTab';
import CashFlowLedgerTab from './accounting/CashFlowLedgerTab';
import WaveReceiptsManager from './accounting/WaveReceiptsManager';
import FixedAssetsTab from './accounting/FixedAssetsTab';
import InventoryValuationTab from './accounting/InventoryValuationTab';
import FinancialReportsTab from './accounting/FinancialReportsTab';
import LoanManagementTab from './accounting/LoanManagementTab';
import PayrollPayslipsTab from './accounting/PayrollPayslipsTab';
import ReceiptLookupInterface from './accounting/ReceiptLookupInterface';
import { exportToCSV } from '../utils/exportUtils';

export default function FinancialLedger({ activeUser }: { activeUser: UserProfile }) {
  // Navigation within Financial Ledger Suite
  const [subTab, setSubTab] = useState<'overview' | 'coa' | 'cashflow' | 'loans' | 'wave-receipts' | 'receipt-lookup' | 'assets' | 'inventory' | 'journal' | 'reports' | 'payslips'>('overview');

  // Primary Accounting Datasets
  const [accounts, setAccounts] = useState<ChartOfAccount[]>(() => dataStore.getChartOfAccounts());
  const [cashFlows, setCashFlows] = useState<CashFlowRecord[]>(() => dataStore.getCashFlows());
  const [fixedAssets, setFixedAssets] = useState<FixedAssetRecord[]>(() => dataStore.getFixedAssets());
  const [products, setProducts] = useState<Product[]>(() => dataStore.getProducts());
  const [inventory, setInventory] = useState<InventoryLevel[]>(() => dataStore.getInventory());
  const [orders, setOrders] = useState<POSOrder[]>(() => dataStore.getOrders());
  const [doubleEntry, setDoubleEntry] = useState<any[]>(() => dataStore.getDoubleEntry());
  const [grants, setGrants] = useState<DonorGrant[]>(() => dataStore.getGrants());

  // General Journal Modal & AI States
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalDesc, setJournalDesc] = useState('');
  const [journalAmount, setJournalAmount] = useState('');
  const [debitAccountCode, setDebitAccountCode] = useState('1010');
  const [creditAccountCode, setCreditAccountCode] = useState('4010');
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);

  // Sync with dataStore changes
  useEffect(() => {
    setAccounts(dataStore.getChartOfAccounts());
    setCashFlows(dataStore.getCashFlows());
    setFixedAssets(dataStore.getFixedAssets());
    setProducts(dataStore.getProducts());
    setInventory(dataStore.getInventory());
    setOrders(dataStore.getOrders());
    setDoubleEntry(dataStore.getDoubleEntry());
    setGrants(dataStore.getGrants());

    const unsubDouble = dataStore.subscribeToCollection('double_entry', () => {
      setDoubleEntry(dataStore.getDoubleEntry());
    });
    const unsubOrders = dataStore.subscribeToCollection('orders', () => {
      setOrders(dataStore.getOrders());
    });

    return () => {
      unsubDouble();
      unsubOrders();
    };
  }, []);

  // Handlers for Accounts
  const handleAddAccount = (newAcc: ChartOfAccount) => {
    dataStore.addAccount(newAcc);
    setAccounts(dataStore.getChartOfAccounts());
  };

  const handleUpdateAccount = (code: string, updates: Partial<ChartOfAccount>) => {
    dataStore.updateAccount(code, updates);
    setAccounts(dataStore.getChartOfAccounts());
  };

  // Handlers for Cash Flows
  const handleAddCashFlow = (newFlow: Omit<CashFlowRecord, 'id'>) => {
    dataStore.addCashFlow(newFlow);
    setCashFlows(dataStore.getCashFlows());
    setAccounts(dataStore.getChartOfAccounts()); // cash balance updated
  };

  const handleUpdateCashFlow = (id: string, updates: Partial<CashFlowRecord>) => {
    dataStore.updateCashFlow(id, updates);
    setCashFlows(dataStore.getCashFlows());
    setAccounts(dataStore.getChartOfAccounts());
  };

  // Handlers for Fixed Assets
  const handleAddFixedAsset = (newAsset: Omit<FixedAssetRecord, 'id' | 'accumulatedDepreciation' | 'currentBookValue'>) => {
    dataStore.addFixedAsset(newAsset);
    setFixedAssets(dataStore.getFixedAssets());
  };

  const handleUpdateFixedAsset = (id: string, updates: Partial<FixedAssetRecord>) => {
    dataStore.updateFixedAsset(id, updates);
    setFixedAssets(dataStore.getFixedAssets());
  };

  const handlePostDepreciationJournal = (amount: number) => {
    // Record depreciation in journal
    const deEntry = {
      id: 'JE-DEP-' + Date.now().toString().slice(-4),
      timestamp: new Date().toISOString(),
      accountName: 'Depreciation Expense / Accumulated Depreciation',
      description: `Monthly Straight-Line Depreciation Run`,
      debit: amount,
      credit: amount,
      type: 'depreciation_expense'
    };
    const updated = [deEntry, ...doubleEntry];
    dataStore.saveDoubleEntry(updated);
    setDoubleEntry(updated);
  };

  const handlePostInventoryAdjustment = (sku: string, reason: string, writeOffValue: number) => {
    // Record inventory write-off in double entry
    const deEntry = {
      id: 'JE-INV-' + Date.now().toString().slice(-4),
      timestamp: new Date().toISOString(),
      accountName: 'Inventory Write-Down / Loss (SKU: ' + sku + ')',
      description: `Stock Write-Off Adjustment: ${reason}`,
      debit: writeOffValue,
      credit: writeOffValue,
      type: 'cogs_adjustment'
    };
    const updated = [deEntry, ...doubleEntry];
    dataStore.saveDoubleEntry(updated);
    setDoubleEntry(updated);
  };

  // AI live categorization for Journal Entries
  const handleAnalyzeJournalEntry = async () => {
    if (!journalDesc.trim()) return;
    setAnalyzingAi(true);
    try {
      const res = await fetch('/api/categorize-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: journalDesc,
          amount: parseFloat(journalAmount) || 100,
          type: 'journal_entry'
        })
      });
      const data = await res.json();
      if (data.success && data.categorization) {
        setAiSuggestion(data.categorization);
        if (data.categorization.suggestedDebitAccount) {
          const matchedDebit = accounts.find(a => a.name.toLowerCase().includes(data.categorization.suggestedDebitAccount.toLowerCase()));
          if (matchedDebit) setDebitAccountCode(matchedDebit.code);
        }
        if (data.categorization.suggestedCreditAccount) {
          const matchedCredit = accounts.find(a => a.name.toLowerCase().includes(data.categorization.suggestedCreditAccount.toLowerCase()));
          if (matchedCredit) setCreditAccountCode(matchedCredit.code);
        }
      }
    } catch (e) {
      console.error("AI journal analysis failed:", e);
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleSaveJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(journalAmount);
    if (isNaN(num) || num <= 0 || !journalDesc.trim()) return;

    const debitAcc = accounts.find(a => a.code === debitAccountCode);
    const creditAcc = accounts.find(a => a.code === creditAccountCode);

    const deEntry = {
      id: 'JE-' + Date.now().toString().slice(-5),
      timestamp: new Date().toISOString(),
      accountName: `${debitAcc?.name || 'Debit Acc'} / ${creditAcc?.name || 'Credit Acc'}`,
      description: journalDesc.trim(),
      debit: num,
      credit: num,
      type: 'manual_journal',
      author: activeUser.name
    };

    const updated = [deEntry, ...doubleEntry];
    dataStore.saveDoubleEntry(updated);
    setDoubleEntry(updated);

    // Update account balances
    if (debitAcc) {
      const newBal = debitAcc.normalBalance === 'debit' ? debitAcc.balance + num : debitAcc.balance - num;
      handleUpdateAccount(debitAcc.code, { balance: Number(newBal.toFixed(2)) });
    }
    if (creditAcc) {
      const newBal = creditAcc.normalBalance === 'credit' ? creditAcc.balance + num : creditAcc.balance - num;
      handleUpdateAccount(creditAcc.code, { balance: Number(newBal.toFixed(2)) });
    }

    setIsJournalModalOpen(false);
    setJournalDesc('');
    setJournalAmount('');
    setAiSuggestion(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-xs">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Financial Accounting Software Suite
              <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase">
                GAAP / IFRS
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              General Ledger, Chart of Accounts, Cash Flows, Capital Assets, Inventory Valuation & Financial Statements
            </p>
          </div>
        </div>

        {/* Accounting Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200">
          {[
            { id: 'overview', label: 'Financial Health', icon: TrendingUp },
            { id: 'coa', label: 'Chart of Accounts', icon: Scale },
            { id: 'cashflow', label: 'Cash Flows', icon: DollarSign },
            { id: 'loans', label: 'Microfinance & Staff Loans', icon: ArrowRightLeft },
            { id: 'wave-receipts', label: 'Wave Receipts & OCR', icon: Receipt },
            { id: 'receipt-lookup', label: 'Receipts & Sales Finder', icon: Search },
            { id: 'assets', label: 'Fixed Assets', icon: Building },
            { id: 'inventory', label: 'Inventory Costing', icon: Package },
            { id: 'journal', label: 'General Journal', icon: BookOpen },
            { id: 'reports', label: 'Financial Reports', icon: FileText },
            { id: 'payslips', label: 'Payroll Payslips', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {subTab === 'overview' && (
        <FinancialOverviewTab
          accounts={accounts}
          cashFlows={cashFlows}
          fixedAssets={fixedAssets}
          inventory={inventory}
          orders={orders}
          onNavigateTab={(tab) => setSubTab(tab as any)}
        />
      )}

      {subTab === 'coa' && (
        <ChartOfAccountsTab
          accounts={accounts}
          onAddAccount={handleAddAccount}
          onUpdateAccount={handleUpdateAccount}
        />
      )}

      {subTab === 'cashflow' && (
        <CashFlowLedgerTab
          cashFlows={cashFlows}
          activeUser={activeUser}
          onAddCashFlow={handleAddCashFlow}
          onUpdateCashFlow={handleUpdateCashFlow}
          onNavigateToWaveReceipts={() => setSubTab('wave-receipts')}
        />
      )}

      {subTab === 'loans' && (
        <LoanManagementTab
          activeUser={activeUser}
          accounts={accounts}
          onAddCashFlow={handleAddCashFlow}
          onRefreshLedger={() => {
            setCashFlows(dataStore.getCashFlows());
            setAccounts(dataStore.getChartOfAccounts());
          }}
        />
      )}

      {subTab === 'wave-receipts' && (
        <WaveReceiptsManager
          activeUser={activeUser}
          accounts={accounts}
          onAddCashFlow={handleAddCashFlow}
          onRefreshLedger={() => {
            setCashFlows(dataStore.getCashFlows());
            setAccounts(dataStore.getChartOfAccounts());
          }}
        />
      )}

      {subTab === 'receipt-lookup' && (
        <ReceiptLookupInterface orders={orders} />
      )}

      {subTab === 'assets' && (
        <FixedAssetsTab
          fixedAssets={fixedAssets}
          activeUser={activeUser}
          onAddFixedAsset={handleAddFixedAsset}
          onUpdateFixedAsset={handleUpdateFixedAsset}
          onPostDepreciationJournal={handlePostDepreciationJournal}
        />
      )}

      {subTab === 'inventory' && (
        <InventoryValuationTab
          products={products}
          inventory={inventory}
          activeUser={activeUser}
          onPostAdjustment={handlePostInventoryAdjustment}
        />
      )}

      {subTab === 'reports' && (
        <FinancialReportsTab
          accounts={accounts}
          cashFlows={cashFlows}
          fixedAssets={fixedAssets}
          activeUser={activeUser}
        />
      )}

      {subTab === 'payslips' && (
        <PayrollPayslipsTab activeUser={activeUser} />
      )}

      {/* DOUBLE-ENTRY GENERAL JOURNAL TAB */}
      {subTab === 'journal' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Double-Entry General Journal Ledger
              </h2>
              <p className="text-xs text-slate-500">Chronological transaction journal with Debits = Credits balance enforcement</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const data = doubleEntry.map(e => ({
                    'Journal Ref': e.id,
                    'Timestamp': e.timestamp,
                    'Account Name': e.accountName,
                    'Description': e.description,
                    'Debit ($)': e.debit,
                    'Credit ($)': e.credit,
                    'Type': e.type
                  }));
                  exportToCSV(data, `Journal_Vouchers_${new Date().toISOString().slice(0, 10)}.csv`);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setIsJournalModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Journal Voucher</span>
              </button>
            </div>
          </div>

          {/* Journal Entries Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Voucher Ref</th>
                    <th className="py-3 px-4">Account Pair / Details</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Debit ($)</th>
                    <th className="py-3 px-4 text-right">Credit ($)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doubleEntry.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(entry.timestamp || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {entry.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {entry.accountName || 'Commercial Ledger Entry'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {entry.description}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        ${(entry.debit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                        ${(entry.credit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-100 uppercase">
                          Posted
                        </span>
                      </td>
                    </tr>
                  ))}
                  {doubleEntry.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No double-entry journal vouchers logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Journal Voucher Modal */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Post General Journal Voucher
              </h3>
              <button onClick={() => setIsJournalModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJournalEntry} className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-medium text-slate-700">Transaction Description *</label>
                  <button
                    type="button"
                    onClick={handleAnalyzeJournalEntry}
                    disabled={analyzingAi || !journalDesc.trim()}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold disabled:opacity-40"
                  >
                    {analyzingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span>AI Suggest Accounts</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paid annual cybersecurity audit and cloud server retainer"
                  value={journalDesc}
                  onChange={(e) => setJournalDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {aiSuggestion && (
                <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-lg text-indigo-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gemini AI Auto-Categorization ({Math.round(aiSuggestion.confidence * 100)}% confidence)</span>
                  </div>
                  <p>{aiSuggestion.reasoning}</p>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Total Balanced Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="0.00"
                  value={journalAmount}
                  onChange={(e) => setJournalAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-emerald-700 mb-1">Debit Account (Dr)</label>
                  <select
                    value={debitAccountCode}
                    onChange={(e) => setDebitAccountCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {accounts.map(a => (
                      <option key={a.code} value={a.code}>{a.code} - {a.name} ({a.category})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-rose-700 mb-1">Credit Account (Cr)</label>
                  <select
                    value={creditAccountCode}
                    onChange={(e) => setCreditAccountCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    {accounts.map(a => (
                      <option key={a.code} value={a.code}>{a.code} - {a.name} ({a.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-[11px] flex justify-between items-center">
                <span>Verification: Debit ${parseFloat(journalAmount) || 0} = Credit ${parseFloat(journalAmount) || 0}</span>
                <span className="font-bold text-emerald-600">Perfectly Balanced</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-all"
                >
                  Post Journal Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
