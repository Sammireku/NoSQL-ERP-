import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Scale, 
  Edit3, 
  Check, 
  X, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { ChartOfAccount } from '../../types/erp';
import { exportToCSV } from '../../utils/exportUtils';

interface ChartOfAccountsTabProps {
  accounts: ChartOfAccount[];
  onAddAccount: (account: ChartOfAccount) => void;
  onUpdateAccount: (code: string, updates: Partial<ChartOfAccount>) => void;
}

export default function ChartOfAccountsTab({
  accounts,
  onAddAccount,
  onUpdateAccount
}: ChartOfAccountsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState<string>('');

  // Form State for new account
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cogs'>('asset');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [newNormalBalance, setNewNormalBalance] = useState<'debit' | 'credit'>('debit');
  const [newInitialBalance, setNewInitialBalance] = useState('0');
  const [newDescription, setNewDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Accounts' },
    { id: 'asset', label: 'Assets (1000s)' },
    { id: 'liability', label: 'Liabilities (2000s)' },
    { id: 'equity', label: 'Equity (3000s)' },
    { id: 'revenue', label: 'Revenues (4000s)' },
    { id: 'cogs', label: 'COGS (5000s)' },
    { id: 'expense', label: 'Expenses (6000s)' }
  ];

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (acc.description && acc.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || acc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCategoryChange = (cat: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cogs') => {
    setNewCategory(cat);
    if (cat === 'asset' || cat === 'expense' || cat === 'cogs') {
      setNewNormalBalance('debit');
    } else {
      setNewNormalBalance('credit');
    }
  };

  const handleSubmitNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      setFormError('Account code and account name are required.');
      return;
    }

    if (accounts.some(a => a.code === newCode.trim())) {
      setFormError(`Account with code ${newCode} already exists in ledger.`);
      return;
    }

    const created: ChartOfAccount = {
      code: newCode.trim(),
      name: newName.trim(),
      category: newCategory,
      subcategory: newSubcategory as any,
      normalBalance: newNormalBalance,
      balance: parseFloat(newInitialBalance) || 0,
      description: newDescription.trim() || ''
    };

    onAddAccount(created);
    setIsAddModalOpen(false);
    // Reset form
    setNewCode('');
    setNewName('');
    setNewSubcategory('');
    setNewInitialBalance('0');
    setNewDescription('');
    setFormError(null);
  };

  const handleSaveEdit = (code: string) => {
    const parsed = parseFloat(editBalance);
    if (!isNaN(parsed)) {
      onUpdateAccount(code, { balance: parsed });
    }
    setEditingCode(null);
  };

  const handleExport = () => {
    const exportData = filteredAccounts.map(a => ({
      'Account Code': a.code,
      'Account Name': a.name,
      'Category': a.category.toUpperCase(),
      'Subcategory': a.subcategory || '',
      'Normal Balance': (a.normalBalance || 'debit').toUpperCase(),
      'Balance ($)': a.balance.toFixed(2),
      'Status': 'ACTIVE',
      'Description': a.description || ''
    }));
    exportToCSV(exportData, `Chart_of_Accounts_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            General Ledger Chart of Accounts (COA)
          </h2>
          <p className="text-xs text-slate-500">Standardized master ledger accounts for financial accounting and balance reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Account</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search code or account title..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-indigo-500"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Account Code</th>
                <th className="py-3 px-4">Account Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Subcategory</th>
                <th className="py-3 px-4">Normal Balance</th>
                <th className="py-3 px-4 text-right">Current Balance</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map(acc => {
                const isEditing = editingCode === acc.code;
                const getCategoryBadge = (cat: string) => {
                  switch (cat) {
                    case 'asset': return 'bg-blue-50 text-blue-700 border-blue-100';
                    case 'liability': return 'bg-rose-50 text-rose-700 border-rose-100';
                    case 'equity': return 'bg-purple-50 text-purple-700 border-purple-100';
                    case 'revenue': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    case 'cogs': return 'bg-amber-50 text-amber-700 border-amber-100';
                    case 'expense': return 'bg-orange-50 text-orange-700 border-orange-100';
                    default: return 'bg-slate-50 text-slate-700 border-slate-100';
                  }
                };

                return (
                  <tr key={acc.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {acc.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{acc.name}</div>
                      {acc.description && <div className="text-[11px] text-slate-400">{acc.description}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getCategoryBadge(acc.category)}`}>
                        {acc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 capitalize">
                      {acc.subcategory ? acc.subcategory.replace('_', ' ') : '—'}
                    </td>
                    <td className="py-3 px-4 uppercase text-[11px] font-medium text-slate-500">
                      {acc.normalBalance}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={editBalance}
                            onChange={(e) => setEditBalance(e.target.value)}
                            className="w-24 px-2 py-1 bg-white border border-indigo-500 rounded text-right font-mono text-xs"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(acc.code)}
                            className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingCode(null)}
                            className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span>${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {!isEditing && (
                        <button
                          onClick={() => {
                            setEditingCode(acc.code);
                            setEditBalance(acc.balance.toString());
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                          title="Adjust Balance"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No matching accounts found for query "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Create New Ledger Account
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNewAccount} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Account Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1040, 6150"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => handleCategoryChange(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="cogs">Cost of Goods Sold (COGS)</option>
                    <option value="expense">Operating Expense</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PayPal Clearing Account"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Subcategory</label>
                  <input
                    type="text"
                    placeholder="e.g. current_asset"
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Normal Balance</label>
                  <select
                    value={newNormalBalance}
                    onChange={(e) => setNewNormalBalance(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Initial Opening Balance ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newInitialBalance}
                  onChange={(e) => setNewInitialBalance(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Purpose of this ledger account..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-all"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
