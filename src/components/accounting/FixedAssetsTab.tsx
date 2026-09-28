import React, { useState } from 'react';
import { 
  Building, 
  Plus, 
  Search, 
  Download, 
  Calculator, 
  CheckCircle2, 
  Calendar, 
  X,
  Truck,
  Monitor,
  Wrench,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { FixedAssetRecord, UserProfile } from '../../types/erp';
import { exportToCSV } from '../../utils/exportUtils';

interface FixedAssetsTabProps {
  fixedAssets: FixedAssetRecord[];
  activeUser: UserProfile;
  onAddFixedAsset: (asset: Omit<FixedAssetRecord, 'id' | 'accumulatedDepreciation' | 'currentBookValue'>) => void;
  onUpdateFixedAsset: (id: string, updates: Partial<FixedAssetRecord>) => void;
  onPostDepreciationJournal?: (totalDepreciation: number) => void;
}

export default function FixedAssetsTab({
  fixedAssets,
  activeUser,
  onAddFixedAsset,
  onUpdateFixedAsset,
  onPostDepreciationJournal
}: FixedAssetsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [depreciationToast, setDepreciationToast] = useState<string | null>(null);

  // Add Asset form state
  const [assetName, setAssetName] = useState('');
  const [category, setCategory] = useState<'machinery' | 'vehicles' | 'it_equipment' | 'furniture' | 'buildings'>('it_equipment');
  const [tag, setTag] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchaseCost, setPurchaseCost] = useState('');
  const [salvageValue, setSalvageValue] = useState('0');
  const [usefulLifeYears, setUsefulLifeYears] = useState('5');
  const [location, setLocation] = useState('Main Headquarters');
  const [formError, setFormError] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Assets' },
    { id: 'machinery', label: 'Machinery & Tools' },
    { id: 'vehicles', label: 'Fleet & Logistics' },
    { id: 'it_equipment', label: 'IT & Hardware' },
    { id: 'furniture', label: 'Furniture & Fixtures' },
    { id: 'buildings', label: 'Buildings & Leasehold' }
  ];

  const filteredAssets = fixedAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (asset.location && asset.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = categoryFilter === 'all' || asset.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalCost = fixedAssets.reduce((sum, a) => sum + a.purchaseCost, 0);
  const totalDepreciation = fixedAssets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0);
  const totalBookValue = fixedAssets.reduce((sum, a) => sum + a.currentBookValue, 0);

  // Annual & Monthly depreciation
  const annualDepreciation = fixedAssets.reduce((sum, a) => {
    if (a.status !== 'active') return sum;
    const depreciable = Math.max(0, a.purchaseCost - a.salvageValue);
    return sum + (depreciable / Math.max(1, a.usefulLifeYears));
  }, 0);
  const monthlyDepreciation = annualDepreciation / 12;

  // Run Periodic Depreciation calculation
  const handleRunDepreciation = () => {
    let periodicTotal = 0;
    fixedAssets.forEach(asset => {
      if (asset.status !== 'active') return;
      const depreciable = Math.max(0, asset.purchaseCost - asset.salvageValue);
      const monthlyAmount = Number(((depreciable / Math.max(1, asset.usefulLifeYears)) / 12).toFixed(2));
      const maxRemaining = Math.max(0, asset.currentBookValue - asset.salvageValue);
      const actualDep = Math.min(monthlyAmount, maxRemaining);

      if (actualDep > 0) {
        periodicTotal += actualDep;
        const newAccum = Number((asset.accumulatedDepreciation + actualDep).toFixed(2));
        const newBook = Number(Math.max(asset.salvageValue, asset.purchaseCost - newAccum).toFixed(2));
        onUpdateFixedAsset(asset.id, {
          accumulatedDepreciation: newAccum,
          currentBookValue: newBook
        });
      }
    });

    if (onPostDepreciationJournal && periodicTotal > 0) {
      onPostDepreciationJournal(periodicTotal);
    }

    setDepreciationToast(`Periodic straight-line depreciation run complete: $${periodicTotal.toFixed(2)} amortized across active capital assets.`);
    setTimeout(() => setDepreciationToast(null), 4500);
  };

  const handleSubmitNewAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(purchaseCost);
    const salvage = parseFloat(salvageValue) || 0;
    const life = parseInt(usefulLifeYears, 10) || 5;

    if (!assetName.trim() || isNaN(cost) || cost <= 0) {
      setFormError('Asset title and valid acquisition cost are required.');
      return;
    }

    onAddFixedAsset({
      assetTag: tag.trim() || `AST-${Date.now().toString().slice(-5)}`,
      name: assetName.trim(),
      category,
      tag: tag.trim() || `AST-${Date.now().toString().slice(-5)}`,
      purchaseDate,
      purchaseCost: cost,
      salvageValue: salvage,
      usefulLifeYears: life,
      depreciationMethod: 'straight_line',
      status: 'active',
      location: location.trim() || 'Headquarters'
    });

    setIsAddModalOpen(false);
    setAssetName('');
    setTag('');
    setPurchaseCost('');
    setSalvageValue('0');
    setUsefulLifeYears('5');
    setFormError(null);
  };

  const handleExport = () => {
    const data = filteredAssets.map(a => ({
      'Tag ID': a.tag,
      'Asset Name': a.name,
      'Category': a.category.toUpperCase(),
      'Purchase Date': a.purchaseDate,
      'Cost ($)': a.purchaseCost.toFixed(2),
      'Salvage Value ($)': a.salvageValue.toFixed(2),
      'Useful Life (Yrs)': a.usefulLifeYears,
      'Accumulated Dep ($)': a.accumulatedDepreciation.toFixed(2),
      'Net Book Value ($)': a.currentBookValue.toFixed(2),
      'Status': a.status.toUpperCase(),
      'Location': a.location || ''
    }));
    exportToCSV(data, `Fixed_Asset_Register_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {depreciationToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{depreciationToast}</span>
          </div>
          <button onClick={() => setDepreciationToast(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            Fixed Asset Register & Depreciation Schedule
          </h2>
          <p className="text-xs text-slate-500">Track capital machinery, vehicles, IT infrastructure and post straight-line amortization</p>
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
            onClick={handleRunDepreciation}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
            title="Calculate and post monthly straight-line depreciation"
          >
            <Calculator className="w-4 h-4" />
            <span>Post Monthly Depreciation</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fixed Asset</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Capital Cost</span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{fixedAssets.length} capitalized physical assets</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Accumulated Depreciation</span>
          <p className="text-xl font-bold text-amber-600 mt-1">
            -${totalDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Contra-asset amortization</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Net Book Value</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            ${totalBookValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Reported on balance sheet</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly Run Rate</span>
          <p className="text-xl font-bold text-purple-600 mt-1">
            ${monthlyDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Straight-line expense</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === cat.id
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
            placeholder="Search asset, tag ID, location..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-indigo-500"
          />
        </div>
      </div>

      {/* Asset Register Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Tag ID</th>
                <th className="py-3 px-4">Asset Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Acquired</th>
                <th className="py-3 px-4 text-right">Cost ($)</th>
                <th className="py-3 px-4 text-right">Life / Salvage</th>
                <th className="py-3 px-4 text-right">Accum Dep ($)</th>
                <th className="py-3 px-4 text-right">Net Book Value ($)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {asset.tag}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{asset.name}</div>
                    <div className="text-[11px] text-slate-400">{asset.location || 'Headquarters'}</div>
                  </td>
                  <td className="py-3 px-4 capitalize text-slate-600">
                    {asset.category.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {asset.purchaseDate}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                    ${asset.purchaseCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500">
                    <div>{asset.usefulLifeYears} yrs</div>
                    <div className="text-[10px] text-slate-400">Res: ${asset.salvageValue}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-600 font-semibold">
                    -${asset.accumulatedDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                    ${asset.currentBookValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      asset.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                      asset.status === 'maintenance' ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No fixed assets found matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Fixed Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Capitalize New Fixed Asset
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNewAsset} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Asset Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Caterpillar Diesel Generator 50kVA"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Asset Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="machinery">Machinery & Heavy Equipment</option>
                    <option value="vehicles">Fleet & Logistics Vehicles</option>
                    <option value="it_equipment">IT & Server Infrastructure</option>
                    <option value="furniture">Furniture & Office Fixtures</option>
                    <option value="buildings">Buildings & Leasehold Improvements</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Asset Tag ID</label>
                  <input
                    type="text"
                    placeholder="e.g. FA-2026-08"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Purchase Cost ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    placeholder="0.00"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Salvage Value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={salvageValue}
                    onChange={(e) => setSalvageValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Useful Life (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={usefulLifeYears}
                    onChange={(e) => setUsefulLifeYears(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Acquisition Date</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Physical Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Warehouse 2 - Sector B"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
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
                  Save & Capitalize Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
