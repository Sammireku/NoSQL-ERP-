import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Settings, 
  Receipt, 
  FileSpreadsheet, 
  LayoutGrid, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Save, 
  Upload, 
  Download, 
  QrCode, 
  Percent, 
  Coins, 
  Plus, 
  Check,
  Eye,
  Sliders
} from 'lucide-react';
import { dataStore } from '../config/firebase';
import { CompanyTaxConfig, ReceiptTemplateConfig, DashboardWidgetConfig, UserProfile } from '../types/erp';

interface EnterpriseCustomizerProps {
  activeUser: UserProfile;
}

export default function EnterpriseCustomizer({ activeUser }: EnterpriseCustomizerProps) {
  const [activeTab, setActiveTab] = useState<'tax' | 'receipt' | 'widgets' | 'csv'>('tax');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // 1. Tax Config State
  const [taxConfig, setTaxConfig] = useState<CompanyTaxConfig>(() => dataStore.getTaxConfig());

  // 2. Receipt Config State
  const [receiptConfig, setReceiptConfig] = useState<ReceiptTemplateConfig>(() => dataStore.getReceiptConfig());

  // 3. Dashboard Widgets State
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(() => dataStore.getDashboardWidgets());

  // CSV Export/Import State
  const [csvType, setCsvType] = useState<'inventory' | 'customers' | 'vendors' | 'accounts'>('inventory');

  const handleSaveTax = (e: React.FormEvent) => {
    e.preventDefault();
    dataStore.saveTaxConfig(taxConfig);
    setSaveToast("✓ GRA Tax & Compliance engine settings saved successfully!");
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    dataStore.saveReceiptConfig(receiptConfig);
    setSaveToast("✓ Custom POS & Invoice Receipt branding template updated!");
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleToggleWidget = (id: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w);
    setWidgets(updated);
    dataStore.saveDashboardWidgets(updated);
  };

  // Universal CSV Export
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = 'export.csv';

    if (csvType === 'inventory') {
      filename = `tumi_inventory_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Product ID', 'SKU', 'Product Name', 'Category', 'Price (GHS)'];
      rows = dataStore.getProducts().map(p => [p.id, p.sku, p.name, p.category || 'General', p.price.toString()]);
    } else if (csvType === 'customers') {
      filename = `tumi_customers_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Customer ID', 'Full Name', 'Email', 'Phone', 'Tag'];
      rows = dataStore.getCustomers().map(c => [c.id, c.name, c.email, c.phone || '', c.tag || 'Customer']);
    } else if (csvType === 'vendors') {
      filename = `tumi_vendors_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Vendor ID', 'Vendor Name', 'Contact Name', 'Email', 'Category'];
      rows = dataStore.getVendors().map(v => [v.id, v.name, v.contactName || '', v.email || '', v.category || 'General']);
    } else if (csvType === 'accounts') {
      filename = `tumi_ledger_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Entry ID', 'Date', 'Description', 'Type', 'Debit Account', 'Credit Account', 'Amount (GHS)'];
      rows = dataStore.getDoubleEntry().map(a => [a.id, a.date, a.description, a.type, a.debitAccount, a.creditAccount, a.amount.toString()]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {saveToast && (
        <div className="p-4 bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{saveToast}</span>
          </div>
          <button onClick={() => setSaveToast(null)} className="font-bold hover:opacity-80">✕</button>
        </div>
      )}

      {/* Main Feature Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Enterprise Customization & Compliance Engine</h2>
              <p className="text-xs text-slate-500 mt-0.5">Configure GRA local taxes, receipt branding, dashboard widget layout, and universal CSV tools.</p>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('tax')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'tax' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Percent className="w-3.5 h-3.5 text-indigo-600" />
            <span>GRA Tax & E-VAT</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipt')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'receipt' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-indigo-600" />
            <span>Receipt Branding</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('widgets')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'widgets' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
            <span>Dashboard Layout</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'csv' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>Universal CSV</span>
          </button>
        </div>
      </div>

      {/* 1. TAX ENGINE TAB */}
      {activeTab === 'tax' && (
        <form onSubmit={handleSaveTax} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              GRA Local Tax Engine & Compliance Settings
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure VAT, NHIL, GETFund, COVID Levy rates or set custom tax parameters for receipts and invoices.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1.5">Tax Operational Mode *</label>
                <select
                  value={taxConfig.taxMode}
                  onChange={(e) => setTaxConfig({ ...taxConfig, taxMode: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="gra_standard">Ghana Standard VAT Scheme (15% VAT + NHIL + GETFund + COVID Levy = 21%)</option>
                  <option value="gra_flat_3">Ghana Flat VAT Scheme (3% Flat Rate)</option>
                  <option value="custom">Custom Flat Tax Percentage</option>
                  <option value="exempt">Tax Exempt / Non-Taxable Business</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1.5">Company Tax Identification Number (TIN / GRA TIN)</label>
                <input 
                  type="text"
                  value={taxConfig.tinNumber}
                  onChange={(e) => setTaxConfig({ ...taxConfig, tinNumber: e.target.value })}
                  placeholder="e.g. C002891482X"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <label className="flex items-center space-x-2 text-xs font-bold text-emerald-900 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={taxConfig.eInvoiceEnabled}
                    onChange={(e) => setTaxConfig({ ...taxConfig, eInvoiceEnabled: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Enable GRA E-VAT Digital Signature Handshake</span>
                </label>
                <p className="text-[11px] text-emerald-700">Appends verifiable E-VAT QR codes and GRA digital signature security hash to receipts.</p>
              </div>
            </div>

            {/* Tax Breakdown Preview Panel */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Tax Breakdown Preview (GHS 100 Base Amount)</span>
              
              {taxConfig.taxMode === 'gra_standard' && (
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-600"><span>Base Net Amount:</span><span>GHS 100.00</span></div>
                  <div className="flex justify-between text-slate-600"><span>15% Standard VAT:</span><span>GHS 15.00</span></div>
                  <div className="flex justify-between text-slate-600"><span>2.5% NHIL Levy:</span><span>GHS 2.50</span></div>
                  <div className="flex justify-between text-slate-600"><span>2.5% GETFund Levy:</span><span>GHS 2.50</span></div>
                  <div className="flex justify-between text-slate-600"><span>1.0% COVID-19 Health Levy:</span><span>GHS 1.00</span></div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Total Inclusive Due:</span>
                    <span className="text-emerald-700">GHS 121.00</span>
                  </div>
                </div>
              )}

              {taxConfig.taxMode === 'gra_flat_3' && (
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-600"><span>Base Net Amount:</span><span>GHS 100.00</span></div>
                  <div className="flex justify-between text-slate-600"><span>3% Flat VAT Rate:</span><span>GHS 3.00</span></div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Total Inclusive Due:</span>
                    <span className="text-emerald-700">GHS 103.00</span>
                  </div>
                </div>
              )}

              {taxConfig.taxMode === 'custom' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Custom Tax Percentage (%)</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={taxConfig.customTaxRate}
                      onChange={(e) => setTaxConfig({ ...taxConfig, customTaxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono border-t border-slate-200 pt-2">
                    <span>Total Tax Output:</span>
                    <span className="font-bold text-emerald-700">GHS {(100 * (1 + taxConfig.customTaxRate / 100)).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {taxConfig.taxMode === 'exempt' && (
                <div className="text-slate-500 italic text-xs py-4 text-center">
                  Tax Exempt Mode Active. Zero tax added to checkout totals.
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save GRA Tax Configuration</span>
            </button>
          </div>
        </form>
      )}

      {/* 2. RECEIPT BRANDING TAB */}
      {activeTab === 'receipt' && (
        <form onSubmit={handleSaveReceipt} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              POS Receipt & Invoice Template Customization
            </h3>
            <p className="text-xs text-slate-500 mt-1">Upload brand logos, edit header titles, return policy footers, and receipt layout options.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
            {/* Left Column: Form Controls */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Company Header Title</label>
                <input 
                  type="text"
                  value={receiptConfig.headerTitle}
                  onChange={(e) => setReceiptConfig({ ...receiptConfig, headerTitle: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Sub-Header Subtitle</label>
                <input 
                  type="text"
                  value={receiptConfig.subHeader}
                  onChange={(e) => setReceiptConfig({ ...receiptConfig, subHeader: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Footer Thank You Message</label>
                <textarea 
                  rows={2}
                  value={receiptConfig.footerNotes}
                  onChange={(e) => setReceiptConfig({ ...receiptConfig, footerNotes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Return & Refund Terms Text</label>
                <textarea 
                  rows={2}
                  value={receiptConfig.returnPolicyText}
                  onChange={(e) => setReceiptConfig({ ...receiptConfig, returnPolicyText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <label className="flex items-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={receiptConfig.showTaxBreakdown}
                    onChange={(e) => setReceiptConfig({ ...receiptConfig, showTaxBreakdown: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Tax Breakdown</span>
                </label>

                <label className="flex items-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={receiptConfig.showTinNumber}
                    onChange={(e) => setReceiptConfig({ ...receiptConfig, showTinNumber: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Display GRA TIN</span>
                </label>

                <label className="flex items-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={receiptConfig.showQRCode}
                    onChange={(e) => setReceiptConfig({ ...receiptConfig, showQRCode: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>QR Code Stamp</span>
                </label>
              </div>
            </div>

            {/* Right Column: Live Receipt Preview Box */}
            <div className="lg:col-span-5 bg-slate-100 p-5 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">Live Thermal Receipt Preview</span>

              <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-md font-mono text-[11px] text-slate-800 space-y-3 max-w-xs mx-auto">
                <div className="text-center space-y-1">
                  <div className="font-extrabold text-sm uppercase tracking-wider">{receiptConfig.headerTitle || 'TUMI ENTERPRISE'}</div>
                  <div className="text-[10px] text-slate-500">{receiptConfig.subHeader}</div>
                  {receiptConfig.showTinNumber && <div className="text-[9px] text-slate-400 font-bold">GRA TIN: {taxConfig.tinNumber}</div>}
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                  <div className="flex justify-between"><span>Date: 2026-09-28</span><span>Ref: #REC-8812</span></div>
                  <div className="flex justify-between font-bold"><span>1x Kente Print Fabric</span><span>GHS 35.00</span></div>
                  <div className="flex justify-between font-bold"><span>2x USB-C Cable 2m</span><span>GHS 40.00</span></div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-right">
                  <div className="flex justify-between"><span>Subtotal:</span><span>GHS 75.00</span></div>
                  {receiptConfig.showTaxBreakdown && <div className="flex justify-between text-slate-500 text-[10px]"><span>Tax (GRA VAT 15%):</span><span>GHS 11.25</span></div>}
                  <div className="flex justify-between font-extrabold text-sm text-slate-900 border-t border-slate-200 pt-1"><span>TOTAL DUE:</span><span>GHS 86.25</span></div>
                </div>

                {receiptConfig.showQRCode && (
                  <div className="text-center py-1">
                    <QrCode className="w-12 h-12 text-slate-700 mx-auto" />
                    <span className="text-[8px] text-slate-400">Verified GRA E-VAT Receipt</span>
                  </div>
                )}

                <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[9px] text-slate-500 space-y-1">
                  <p>{receiptConfig.footerNotes}</p>
                  <p className="italic text-[8px]">{receiptConfig.returnPolicyText}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Receipt Branding Template</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. DASHBOARD WIDGETS TAB */}
      {activeTab === 'widgets' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
              Personalized Dashboard Widget Layout
            </h3>
            <p className="text-xs text-slate-500 mt-1">Enable or disable homepage dashboard widgets to customize your executive view.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {widgets.map(w => (
              <div 
                key={w.id}
                onClick={() => handleToggleWidget(w.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  w.enabled 
                    ? 'bg-indigo-50/40 border-indigo-200 text-indigo-900 shadow-3xs' 
                    : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div>
                  <div className="font-bold text-sm">{w.title}</div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono mt-0.5 block">{w.category}</span>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
                  w.enabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {w.enabled ? '✓' : '✕'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. UNIVERSAL CSV TAB */}
      {activeTab === 'csv' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              Universal Enterprise CSV Exporter & Importer
            </h3>
            <p className="text-xs text-slate-500 mt-1">Export or import CSV datasets across Inventory, CRM Customers, Vendors, or Accounting Chart of Accounts.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Select Dataset Category</label>
                <select
                  value={csvType}
                  onChange={(e) => setCsvType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800"
                >
                  <option value="inventory">Inventory Product Catalog</option>
                  <option value="customers">CRM Customers & Profiles</option>
                  <option value="vendors">Vendors & Suppliers List</option>
                  <option value="accounts">Accounting Ledger & Chart of Accounts</option>
                </select>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selected Dataset Info</span>
                <div className="font-bold text-slate-800 text-xs">
                  {csvType === 'inventory' && `Active Catalog: ${dataStore.getProducts().length} products ready for export.`}
                  {csvType === 'customers' && `CRM Profiles: ${dataStore.getCustomers().length} customers ready for export.`}
                  {csvType === 'vendors' && `Suppliers Master: ${dataStore.getVendors().length} vendors ready for export.`}
                  {csvType === 'accounts' && `Ledger Accounts: ${dataStore.getDoubleEntry().length} double-entry accounts ready for export.`}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-3 bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100">
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Export {csvType.toUpperCase()} Dataset to CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
