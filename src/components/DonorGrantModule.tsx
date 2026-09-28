import React, { useState, useEffect } from 'react';
import { 
  Building, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  Plus, 
  Download, 
  CheckCircle2, 
  FileText, 
  Users, 
  Filter, 
  ShieldCheck, 
  PieChart, 
  Layers,
  HeartHandshake,
  Globe
} from 'lucide-react';
import { UserProfile, DonorGrant } from '../types/erp';
import { dataStore } from '../config/firebase';
import { exportToCSV } from '../utils/exportUtils';
import WebDonationPluginModule from './WebDonationPluginModule';

interface DonorGrantModuleProps {
  activeUser: UserProfile;
}

export default function DonorGrantModule({ activeUser }: DonorGrantModuleProps) {
  const [subTab, setSubTab] = useState<'grants' | 'paytium'>('grants');
  const [grants, setGrants] = useState<DonorGrant[]>([]);
  const [selectedGrant, setSelectedGrant] = useState<DonorGrant | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);

  // New Grant Form State
  const [grantCode, setGrantCode] = useState('');
  const [donorName, setDonorName] = useState('');
  const [title, setTitle] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('2026-12-31');
  const [reportingFreq, setReportingFreq] = useState<DonorGrant['reportingFrequency']>('quarterly');
  const [targetBeneficiaries, setTargetBeneficiaries] = useState('100');
  const [leadCoordinator, setLeadCoordinator] = useState(activeUser.name);
  const [categoriesInput, setCategoriesInput] = useState('Toolkits, Laptops, Instructor Stipends, Lab Space, Certification');

  // Quick allocation state
  const [spendAmount, setSpendAmount] = useState('');
  const [spendCategory, setSpendCategory] = useState('Training Toolkits');
  const [spendDescription, setSpendDescription] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const list = dataStore.getGrants();
    setGrants(list);
    if (list.length > 0 && !selectedGrant) {
      setSelectedGrant(list[0]);
    }
  }, []);

  const totalGrantPortfolio = grants.reduce((sum, g) => sum + g.totalBudget, 0);
  const totalSpentAcrossGrants = grants.reduce((sum, g) => sum + g.spentAmount, 0);
  const totalBeneficiaries = grants.reduce((sum, g) => sum + g.targetBeneficiaries, 0);

  const handleCreateGrant = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetNum = Number(totalBudget);
    if (isNaN(budgetNum) || budgetNum <= 0) return;

    const newG = dataStore.addGrant({
      grantCode: grantCode.toUpperCase().trim(),
      donorName,
      title,
      totalBudget: budgetNum,
      allocatedAmount: Math.round(budgetNum * 0.75), // standard 75% initial program commitment
      spentAmount: 0,
      currency,
      startDate,
      endDate,
      status: 'active',
      reportingFrequency: reportingFreq,
      leadCoordinator,
      targetBeneficiaries: Number(targetBeneficiaries) || 50,
      eligibleCategories: categoriesInput.split(',').map(c => c.trim()).filter(Boolean)
    });

    const updated = dataStore.getGrants();
    setGrants(updated);
    setSelectedGrant(newG);
    setIsAddModalOpen(false);

    // Reset Form
    setGrantCode('');
    setDonorName('');
    setTitle('');
    setTotalBudget('');
    showToast(`Donor Grant ${newG.grantCode} registered successfully.`);
  };

  const handleAllocateSpend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrant) return;
    const amt = Number(spendAmount);
    if (isNaN(amt) || amt <= 0) return;

    dataStore.allocateGrantSpend(selectedGrant.id, amt);
    
    // Also record an audit entry
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'EXPENSE_RECORD',
      `Grants/${selectedGrant.grantCode}`,
      `Charged $${amt.toFixed(2)} to Grant ${selectedGrant.grantCode} for [${spendCategory}]: ${spendDescription || 'Allocated workshop expense'}`
    );

    const updated = dataStore.getGrants();
    setGrants(updated);
    const refreshed = updated.find(g => g.id === selectedGrant.id);
    if (refreshed) setSelectedGrant(refreshed);

    setIsAllocateModalOpen(false);
    setSpendAmount('');
    setSpendDescription('');
    showToast(`$${amt.toLocaleString()} charged against Grant ${selectedGrant.grantCode}.`);
  };

  const handleExportCSV = () => {
    const headers = [
      'Grant Code', 
      'Donor Agency', 
      'Program Title', 
      'Total Budget ($)', 
      'Spent ($)', 
      'Remaining Balance ($)', 
      'Burn-down %', 
      'Target Beneficiaries', 
      'Lead Coordinator',
      'End Date'
    ];
    const rows = grants.map(g => [
      g.grantCode,
      g.donorName,
      g.title,
      g.totalBudget,
      g.spentAmount,
      g.totalBudget - g.spentAmount,
      `${Math.round((g.spentAmount / g.totalBudget) * 100)}%`,
      g.targetBeneficiaries,
      g.leadCoordinator,
      g.endDate
    ]);
    exportToCSV('ngo_donor_grant_ledger.csv', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Module Sub-Tab Switcher */}
      <div className="flex items-center space-x-2 bg-slate-200/70 p-1.5 rounded-2xl w-fit border border-slate-300/50">
        <button
          onClick={() => setSubTab('grants')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            subTab === 'grants' 
              ? 'bg-white text-indigo-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Institutional Grant Contracts</span>
        </button>

        <button
          onClick={() => setSubTab('paytium')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            subTab === 'paytium' 
              ? 'bg-white text-indigo-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HeartHandshake className="w-4 h-4 text-emerald-600" />
          <span>Tumi Project Web Donation Form</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Live</span>
        </button>
      </div>

      {subTab === 'paytium' ? (
        <WebDonationPluginModule activeUser={activeUser} />
      ) : (
        <>
          {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Grant Accounting & Compliance
            </span>
            <span className="text-xs text-slate-400">• Institutional Donors</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Donor Grant Ledger & Allocation</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Audit international funding portfolios (EU, USAID, Mastercard Foundation), link expenditures to contract codes, and protect compliance thresholds before grant audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Grant Ledger</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Grant Contract</span>
          </button>
        </div>
      </div>

      {/* Portfolio KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Active Grant Portfolio</span>
          <p className="text-2xl font-black text-slate-900 mt-2">${totalGrantPortfolio.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Committed institutional funds</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Disbursed / Spent</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">${totalSpentAcrossGrants.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">
            {totalGrantPortfolio > 0 ? Math.round((totalSpentAcrossGrants / totalGrantPortfolio) * 100) : 0}% portfolio burn-down
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Unspent Grant Buffer</span>
          <p className="text-2xl font-black text-indigo-600 mt-2">
            ${(totalGrantPortfolio - totalSpentAcrossGrants).toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">Available for upcoming cohorts</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Contracted Beneficiaries</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalBeneficiaries}</p>
          <p className="text-xs text-slate-400 mt-1">Stipend and toolkit recipients</p>
        </div>
      </div>

      {/* Main Grant Cards & Allocation Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Grants List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Active Institutional Contracts</h2>

          {grants.map(grant => {
            const burnDownPercent = Math.round((grant.spentAmount / grant.totalBudget) * 100);
            const isSelected = selectedGrant?.id === grant.id;
            const remaining = grant.totalBudget - grant.spentAmount;

            return (
              <div 
                key={grant.id}
                onClick={() => setSelectedGrant(grant)}
                className={`bg-white border rounded-2xl p-5 shadow-sm cursor-pointer transition-all ${
                  isSelected ? 'border-indigo-600 ring-2 ring-indigo-600/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {grant.grantCode}
                      </span>
                      <span className="text-xs text-indigo-600 font-semibold">{grant.donorName}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{grant.title}</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-medium">Budget Ceilings</span>
                    <p className="text-lg font-black text-slate-900">
                      ${grant.totalBudget.toLocaleString()} <span className="text-xs text-slate-500 font-normal">{grant.currency}</span>
                    </p>
                  </div>
                </div>

                {/* Progress Burn-down */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Spent: ${grant.spentAmount.toLocaleString()} ({burnDownPercent}%)</span>
                    <span className="text-emerald-700 font-bold">Remaining: ${remaining.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        burnDownPercent > 85 ? 'bg-rose-500' : burnDownPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, burnDownPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Grant Meta Chips */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{grant.startDate} to {grant.endDate}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{grant.targetBeneficiaries} trainees targeted</span>
                    </span>
                  </div>

                  <span className="font-semibold text-slate-700">
                    Lead: {grant.leadCoordinator}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Col: Selected Grant Detail & Spend Terminal */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Grant Compliance Inspector</h2>

          {selectedGrant ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <span className="text-xs font-mono text-slate-400">SELECTED CONTRACT</span>
                <h3 className="text-lg font-bold text-slate-900">{selectedGrant.grantCode}</h3>
                <p className="text-xs text-slate-500">{selectedGrant.donorName}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Contract Status:</span>
                  <span className="font-bold text-emerald-600 uppercase">{selectedGrant.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reporting Interval:</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedGrant.reportingFrequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Committed Amount:</span>
                  <span className="font-semibold text-slate-800">${selectedGrant.allocatedAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Actual Realized Spend:</span>
                  <span className="font-bold text-slate-900">${selectedGrant.spentAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                  <span className="text-slate-700">Audit Safe Margin:</span>
                  <span className="text-indigo-600">${(selectedGrant.totalBudget - selectedGrant.spentAmount).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Eligible Line Items</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedGrant.eligibleCategories.map((cat, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsAllocateModalOpen(true)}
                  className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold shadow-md transition-all"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Allocate Workshop Expense</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
              Select a grant to inspect line-item allocations.
            </div>
          )}
        </div>
      </div>

      {/* Add New Grant Contract Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Register New Donor Grant Agreement</h3>
            <p className="text-xs text-slate-500 mt-0.5">Define funding contract details, donor requirements, and eligible line items.</p>

            <form onSubmit={handleCreateGrant} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grant Code</label>
                  <input
                    type="text"
                    value={grantCode}
                    onChange={e => setGrantCode(e.target.value)}
                    placeholder="e.g. EU-SKILLS-2026-B"
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Donor / Foundation</label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={e => setDonorName(e.target.value)}
                    placeholder="e.g. European Union"
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project / Initiative Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Clean Energy Solar Vocational Training"
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Grant Budget</label>
                  <input
                    type="number"
                    value={totalBudget}
                    onChange={e => setTotalBudget(e.target.value)}
                    placeholder="e.g. 100000"
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="GHS">GHS (₵)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Beneficiaries</label>
                  <input
                    type="number"
                    value={targetBeneficiaries}
                    onChange={e => setTargetBeneficiaries(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Frequency</label>
                  <select
                    value={reportingFreq}
                    onChange={e => setReportingFreq(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Eligible Categories (comma-separated)</label>
                <input
                  type="text"
                  value={categoriesInput}
                  onChange={e => setCategoriesInput(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20"
                >
                  Register Grant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Spend Modal */}
      {isAllocateModalOpen && selectedGrant && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Charge Spend Against Grant</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Deducting from {selectedGrant.grantCode} ({selectedGrant.donorName})
            </p>

            <form onSubmit={handleAllocateSpend} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={spendAmount}
                  onChange={e => setSpendAmount(e.target.value)}
                  placeholder="e.g. 1250.00"
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Budget Line Item</label>
                <select
                  value={spendCategory}
                  onChange={e => setSpendCategory(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                >
                  {selectedGrant.eligibleCategories.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Justification / Description</label>
                <input
                  type="text"
                  value={spendDescription}
                  onChange={e => setSpendDescription(e.target.value)}
                  placeholder="e.g. 15x Arduino and multimeter toolkits for Cohort 2026-A"
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAllocateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md"
                >
                  Confirm Grant Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
