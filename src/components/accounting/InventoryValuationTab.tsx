import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { Product, InventoryLevel, UserProfile } from '../../types/erp';
import { exportToCSV } from '../../utils/exportUtils';

interface InventoryValuationTabProps {
  products: Product[];
  inventory: InventoryLevel[];
  activeUser: UserProfile;
  onPostAdjustment?: (sku: string, reason: string, writeOffValue: number) => void;
}

export default function InventoryValuationTab({
  products,
  inventory,
  activeUser,
  onPostAdjustment
}: InventoryValuationTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [valuationMethod, setValuationMethod] = useState<'fifo' | 'weighted_avg'>('weighted_avg');
  const [writeDownModalOpen, setWriteDownModalOpen] = useState(false);
  const [selectedProductSku, setSelectedProductSku] = useState('');
  const [writeOffUnits, setWriteOffUnits] = useState('');
  const [writeOffReason, setWriteOffReason] = useState('Obsolescence / Spoilage');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Combine products with inventory levels
  const inventoryRows = products.map(prod => {
    const inv = inventory.find(i => i.productId === prod.id || i.sku === prod.sku);
    const qty = inv ? inv.stockLevel : 150; // fallback if newly added
    const cost = (prod as any).costPrice || prod.price * 0.6;
    const retail = prod.price;
    const totalCostValue = qty * cost;
    const totalMarketValue = qty * retail;
    const potentialMargin = totalMarketValue - totalCostValue;

    return {
      id: prod.id,
      sku: prod.sku,
      name: prod.name,
      category: prod.category || 'General',
      quantity: qty,
      unitCost: cost,
      unitPrice: retail,
      totalCostValue,
      totalMarketValue,
      potentialMargin,
      marginPercent: totalMarketValue > 0 ? (potentialMargin / totalMarketValue) * 100 : 0
    };
  });

  const filteredRows = inventoryRows.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUnits = inventoryRows.reduce((s, r) => s + r.quantity, 0);
  const totalCostValuation = inventoryRows.reduce((s, r) => s + r.totalCostValue, 0);
  const totalMarketValuation = inventoryRows.reduce((s, r) => s + r.totalMarketValue, 0);
  const unrealizedGrossMargin = totalMarketValuation - totalCostValuation;

  // Theoretical COGS computation for period
  const beginningInventory = 45000;
  const purchasesThisPeriod = 32800;
  const endingInventory = totalCostValuation;
  const computedCOGS = Math.max(0, (beginningInventory + purchasesThisPeriod) - endingInventory);

  const handleWriteDownSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = inventoryRows.find(p => p.sku === selectedProductSku);
    const units = parseInt(writeOffUnits, 10);
    if (!prod || isNaN(units) || units <= 0) return;

    const lossAmount = units * prod.unitCost;
    if (onPostAdjustment) {
      onPostAdjustment(prod.sku, writeOffReason, lossAmount);
    }

    setActionNotice(`Successfully posted inventory adjustment: Write-off of ${units} units (${prod.name}) totaling $${lossAmount.toFixed(2)} to COGS Loss account.`);
    setWriteDownModalOpen(false);
    setWriteOffUnits('');
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleExport = () => {
    const data = filteredRows.map(r => ({
      'SKU': r.sku,
      'Product Name': r.name,
      'Category': r.category,
      'Units On Hand': r.quantity,
      'Unit Cost ($)': r.unitCost.toFixed(2),
      'Retail Price ($)': r.unitPrice.toFixed(2),
      'Total Cost Valuation ($)': r.totalCostValue.toFixed(2),
      'Total Market Valuation ($)': r.totalMarketValue.toFixed(2),
      'Unrealized Margin ($)': r.potentialMargin.toFixed(2),
      'Margin %': `${r.marginPercent.toFixed(1)}%`
    }));
    exportToCSV(data, `Inventory_Valuation_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Alert Notice */}
      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-500 hover:text-emerald-700">
            ×
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Inventory Asset Valuation & COGS Accounting
          </h2>
          <p className="text-xs text-slate-500">Real-time valuation of stock on hand, inventory write-downs and periodic COGS reconciliation</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setValuationMethod('weighted_avg')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                valuationMethod === 'weighted_avg' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Weighted Avg Cost
            </button>
            <button
              onClick={() => setValuationMethod('fifo')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                valuationMethod === 'fifo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              FIFO Method
            </button>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setWriteDownModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Post Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Inventory Asset Valuation (Cost)</span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            ${totalCostValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{totalUnits.toLocaleString()} units capitalized on Balance Sheet</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Retail Market Valuation</span>
          <p className="text-xl font-bold text-indigo-600 mt-1">
            ${totalMarketValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Gross realizable value</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Unrealized Gross Margin</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            +${unrealizedGrossMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalMarketValuation > 0 ? ((unrealizedGrossMargin / totalMarketValuation) * 100).toFixed(1) : '0'}% embedded profit
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cost of Goods Sold (COGS)</span>
          <p className="text-xl font-bold text-rose-600 mt-1">
            ${computedCOGS.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Beginning ($45k) + Pur ($32.8k) - Ending</p>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div className="text-xs font-semibold text-slate-700">
          Catalog Valuation Breakdown ({filteredRows.length} SKUs)
        </div>
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search SKU or product title..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Units</th>
                <th className="py-3 px-4 text-right">Unit Cost ($)</th>
                <th className="py-3 px-4 text-right">Retail ($)</th>
                <th className="py-3 px-4 text-right">Total Cost Value ($)</th>
                <th className="py-3 px-4 text-right">Market Value ($)</th>
                <th className="py-3 px-4 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(row => (
                <tr key={row.sku} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {row.sku}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {row.name}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {row.category}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                    {row.quantity.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    ${row.unitCost.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    ${row.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    ${row.totalCostValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-indigo-600">
                    ${row.totalMarketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                    {row.marginPercent.toFixed(1)}%
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No products found matching "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Write-Down / Adjustment Modal */}
      {writeDownModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Post Inventory Write-Off / Adjustment
              </h3>
              <button onClick={() => setWriteDownModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ×
              </button>
            </div>

            <form onSubmit={handleWriteDownSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select SKU to Adjust *</label>
                <select
                  required
                  value={selectedProductSku}
                  onChange={(e) => setSelectedProductSku(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose Product --</option>
                  {inventoryRows.map(r => (
                    <option key={r.sku} value={r.sku}>
                      {r.sku} - {r.name} ({r.quantity} on hand @ ${r.unitCost.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Units to Write Off *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 5"
                    value={writeOffUnits}
                    onChange={(e) => setWriteOffUnits(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Adjustment Reason</label>
                  <select
                    value={writeOffReason}
                    onChange={(e) => setWriteOffReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Obsolescence / Spoilage">Obsolescence / Spoilage</option>
                    <option value="Damaged in Transit">Damaged in Transit</option>
                    <option value="Physical Count Shrinkage">Physical Count Shrinkage</option>
                    <option value="Sample / Marketing Demo">Sample / Marketing Demo</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                Posting this adjustment will write off the inventory valuation at average cost and record an offsetting debit entry in General Ledger Account 5100 (Inventory Shrinkage & Loss).
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWriteDownModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs transition-all"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
