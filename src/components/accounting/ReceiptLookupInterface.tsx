import React, { useState, useMemo, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  User, 
  Package, 
  Calendar, 
  Eye, 
  X, 
  CheckCircle2, 
  Download,
  Building2, 
  Sparkles,
  Sliders,
  DollarSign,
  FileText,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  Layers
} from 'lucide-react';
import { 
  POSOrder, 
  Opportunity, 
  CustomerProfile, 
  UserProfile, 
  ReceiptTemplateConfig, 
  CompanyTaxConfig 
} from '../../types/erp';
import { dataStore } from '../../config/firebase';
import { formatPrice } from '../../utils/currency';
import { 
  downloadFinancialInvoicePDF, 
  getFinancialInvoiceDataUri,
  FinancialInvoiceOptions 
} from '../../services/financialInvoiceService';

export interface UnifiedInvoiceRecord {
  id: string;
  sourceType: 'pos' | 'deal';
  invoiceNumber: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  date: string;
  amount: number;
  status: string;
  operatorOrRep: string;
  itemCount: number;
  itemsSummary: string;
  rawPOSOrder?: POSOrder;
  rawDeal?: Opportunity;
}

interface ReceiptLookupInterfaceProps {
  orders?: POSOrder[];
  deals?: Opportunity[];
  customers?: CustomerProfile[];
  activeUser?: UserProfile;
}

export default function ReceiptLookupInterface({ 
  orders: propOrders, 
  deals: propDeals,
  customers: propCustomers,
  activeUser 
}: ReceiptLookupInterfaceProps) {
  // Datasets
  const [orders, setOrders] = useState<POSOrder[]>(() => propOrders || dataStore.getOrders());
  const [deals, setDeals] = useState<Opportunity[]>(() => propDeals || dataStore.getOpportunities());
  const [customers, setCustomers] = useState<CustomerProfile[]>(() => propCustomers || dataStore.getCustomers());

  // Enterprise Customizer Branding & Tax Engine State
  const [receiptConfig, setReceiptConfig] = useState<ReceiptTemplateConfig>(() => dataStore.getReceiptConfig());
  const [taxConfig, setTaxConfig] = useState<CompanyTaxConfig>(() => dataStore.getTaxConfig());

  // Filters & Tabs
  const [filterSource, setFilterSource] = useState<'all' | 'pos' | 'deal'>('all');
  const [onlyFinalized, setOnlyFinalized] = useState<boolean>(true);
  const [receiptNoFilter, setReceiptNoFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [receiptDateFilter, setReceiptDateFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');

  // Selection & In-App PDF Preview States
  const [selectedRecord, setSelectedRecord] = useState<UnifiedInvoiceRecord | null>(null);
  const [previewPdfUri, setPreviewPdfUri] = useState<string | null>(null);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Sync datasets and listen for Enterprise Customizer updates
  useEffect(() => {
    if (propOrders) setOrders(propOrders);
    else setOrders(dataStore.getOrders());

    if (propDeals) setDeals(propDeals);
    else setDeals(dataStore.getOpportunities());

    if (propCustomers) setCustomers(propCustomers);
    else setCustomers(dataStore.getCustomers());

    const handleReceiptUpdate = () => {
      setReceiptConfig(dataStore.getReceiptConfig());
    };
    const handleTaxUpdate = () => {
      setTaxConfig(dataStore.getTaxConfig());
    };

    window.addEventListener('tumi_receipt_config_updated', handleReceiptUpdate);
    window.addEventListener('tumi_tax_config_updated', handleTaxUpdate);

    return () => {
      window.removeEventListener('tumi_receipt_config_updated', handleReceiptUpdate);
      window.removeEventListener('tumi_tax_config_updated', handleTaxUpdate);
    };
  }, [propOrders, propDeals, propCustomers]);

  // Normalize POS orders & CRM sales deals into unified invoice records
  const unifiedRecords: UnifiedInvoiceRecord[] = useMemo(() => {
    const list: UnifiedInvoiceRecord[] = [];

    // 1. Finalized POS Transactions
    orders.forEach(order => {
      const isCompleted = order.status === 'completed' || order.status === 'synced' || !order.status;
      if (onlyFinalized && !isCompleted) return;

      const itemsDesc = (order.items || []).map(i => `${i.name} (x${i.quantity})`).join(', ');

      list.push({
        id: `pos-${order.id}`,
        sourceType: 'pos',
        invoiceNumber: `INV-POS-${order.id}`,
        title: `POS Retail Order #${order.id}`,
        clientName: order.customerName || 'Walk-In Customer',
        clientEmail: order.customerEmail,
        clientPhone: order.customerPhone,
        date: order.createdAt || new Date().toISOString(),
        amount: order.totalAmount || 0,
        status: isCompleted ? 'Finalized / Settled' : (order.status || 'Pending'),
        operatorOrRep: order.cashierName || 'Cashier Desk',
        itemCount: (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0),
        itemsSummary: itemsDesc || 'General Retail Merchandise',
        rawPOSOrder: order
      });
    });

    // 2. Finalized Sales Deals (CRM Deals)
    deals.forEach(deal => {
      const isClosed = deal.kanban_stage === 'Closed';
      if (onlyFinalized && !isClosed) return;

      // Try finding customer profile
      const matchedCustomer = customers.find(c => c.id === deal.customerId || c.name.toLowerCase() === deal.customerName.toLowerCase());

      list.push({
        id: `deal-${deal.id}`,
        sourceType: 'deal',
        invoiceNumber: `INV-DEAL-${deal.id}`,
        title: deal.title || 'Corporate Sales Contract',
        clientName: deal.customerName || matchedCustomer?.name || 'Corporate Account',
        clientEmail: matchedCustomer?.email,
        clientPhone: matchedCustomer?.phone,
        date: deal.updatedAt || deal.createdAt || new Date().toISOString(),
        amount: deal.value || 0,
        status: isClosed ? 'Closed / Finalized Contract' : `Pipeline (${deal.kanban_stage})`,
        operatorOrRep: 'Sales Directorate',
        itemCount: 1,
        itemsSummary: `${deal.title} (Commercial Scope)`,
        rawDeal: deal
      });
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, deals, customers, onlyFinalized]);

  // Multi-parameter Search Filter
  const filteredRecords = useMemo(() => {
    return unifiedRecords.filter(rec => {
      // Source filter
      if (filterSource !== 'all' && rec.sourceType !== filterSource) return false;

      // 1. Ref / ID
      if (receiptNoFilter.trim()) {
        const q = receiptNoFilter.toLowerCase().trim();
        if (!rec.id.toLowerCase().includes(q) && !rec.invoiceNumber.toLowerCase().includes(q)) {
          return false;
        }
      }

      // 2. Customer / Rep Name
      if (customerNameFilter.trim()) {
        const q = customerNameFilter.toLowerCase().trim();
        const clientMatch = (rec.clientName || '').toLowerCase().includes(q);
        const repMatch = (rec.operatorOrRep || '').toLowerCase().includes(q);
        if (!clientMatch && !repMatch) return false;
      }

      // 3. Date
      if (receiptDateFilter.trim()) {
        const recordDateStr = new Date(rec.date).toISOString().split('T')[0];
        if (recordDateStr !== receiptDateFilter.trim()) return false;
      }

      // 4. Item / Scope description
      if (itemFilter.trim()) {
        const q = itemFilter.toLowerCase().trim();
        const itemMatch = (rec.itemsSummary || '').toLowerCase().includes(q);
        const titleMatch = (rec.title || '').toLowerCase().includes(q);
        if (!itemMatch && !titleMatch) return false;
      }

      return true;
    });
  }, [unifiedRecords, filterSource, receiptNoFilter, customerNameFilter, receiptDateFilter, itemFilter]);

  // Construct options for PDF generation
  const buildInvoiceOptions = (rec: UnifiedInvoiceRecord): FinancialInvoiceOptions => {
    const matchedCustomer = customers.find(c => 
      c.name.toLowerCase() === rec.clientName.toLowerCase() || 
      (rec.rawDeal && c.id === rec.rawDeal.customerId)
    );

    return {
      type: rec.sourceType,
      posOrder: rec.rawPOSOrder,
      deal: rec.rawDeal,
      customer: matchedCustomer || null,
      receiptConfig,
      taxConfig,
      activeUser,
      invoiceNumber: rec.invoiceNumber,
      issueDate: rec.date
    };
  };

  // Download PDF Handler
  const handleDownloadPDF = (rec: UnifiedInvoiceRecord) => {
    try {
      const opts = buildInvoiceOptions(rec);
      downloadFinancialInvoicePDF(opts);
      setDownloadToast(`✓ Official PDF Invoice ${rec.invoiceNumber} downloaded successfully!`);
      setTimeout(() => setDownloadToast(null), 4000);
    } catch (err) {
      console.error("PDF download failed:", err);
    }
  };

  // Preview PDF in Modal
  const handlePreviewPDF = (rec: UnifiedInvoiceRecord) => {
    try {
      const opts = buildInvoiceOptions(rec);
      const uri = getFinancialInvoiceDataUri(opts);
      setSelectedRecord(rec);
      setPreviewPdfUri(uri);
    } catch (err) {
      console.error("PDF preview generation failed:", err);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6 animate-fade-in">
      {/* Toast alert */}
      {downloadToast && (
        <div className="p-3.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{downloadToast}</span>
          </div>
          <button onClick={() => setDownloadToast(null)} className="font-bold hover:opacity-80">✕</button>
        </div>
      )}

      {/* Header with Enterprise Branding Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" /> 
            <span>Financial Ledger Invoice & Receipts Center</span>
            <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full uppercase">
              PDF Service
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and download certified corporate PDF invoices from any finalized POS transaction or CRM Sales deal, styled with your custom Enterprise Customizer branding.
          </p>
        </div>

        {/* Live Branding Badge indicator from Enterprise Customizer */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span className="truncate max-w-[150px]">{receiptConfig.headerTitle || 'Tumi Enterprise'}</span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>TIN: <strong className="font-mono text-slate-800">{taxConfig.tinNumber || 'Standard'}</strong></span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600">
            <Sliders className="w-3.5 h-3.5" />
            <span>Branded</span>
          </div>
        </div>
      </div>

      {/* Filter Source Pills & Toggle Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilterSource('all')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterSource === 'all' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>All Finalized ({unifiedRecords.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSource('pos')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterSource === 'pos' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-indigo-600" />
            <span>POS Retail Checkout ({unifiedRecords.filter(r => r.sourceType === 'pos').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSource('deal')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterSource === 'deal' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sales Deals / Contracts ({unifiedRecords.filter(r => r.sourceType === 'deal').length})</span>
          </button>
        </div>

        {/* Finalized Only Checkbox */}
        <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <input 
            type="checkbox"
            checked={onlyFinalized}
            onChange={(e) => setOnlyFinalized(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span>Only Finalized / Settled Transactions</span>
        </label>
      </div>

      {/* 4 Dedicated Search Inputs Grid */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Field 1: Invoice / Ref ID */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              1. Document Ref / Invoice ID
            </label>
            <div className="relative">
              <Receipt className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. pos-100234 or opp-102"
                value={receiptNoFilter}
                onChange={e => setReceiptNoFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          {/* Field 2: Customer / Rep Name */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              2. Client / Billed Account / Cashier
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. Ashanti, Konadu, Walk-in..."
                value={customerNameFilter}
                onChange={e => setCustomerNameFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          {/* Field 3: Specific Date */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              3. Transaction Date
            </label>
            <input
              type="date"
              value={receiptDateFilter}
              onChange={e => setReceiptDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          {/* Field 4: Item Name / Scope */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              4. Item / Contract Scope
            </label>
            <div className="relative">
              <Package className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. Uniforms, Fabric, Retainer..."
                value={itemFilter}
                onChange={e => setItemFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

        </div>

        {/* Clear Filters Action */}
        {(receiptNoFilter || customerNameFilter || receiptDateFilter || itemFilter) && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                setReceiptNoFilter('');
                setCustomerNameFilter('');
                setReceiptDateFilter('');
                setItemFilter('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear All Search Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Results Table & Right Detail Drawer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Results List (8 columns) */}
        <div className="lg:col-span-8 border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Invoice Ref</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Client / Billed To</th>
                  <th className="py-3 px-3">Scope / Items</th>
                  <th className="py-3 px-3 text-right">Settled Amount</th>
                  <th className="py-3 px-3 text-right">PDF Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                      No finalized transactions or deals match your query. Try clearing filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(rec => {
                    const dateObj = new Date(rec.date);
                    const displayDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    const isSelected = selectedRecord?.id === rec.id;

                    return (
                      <tr 
                        key={rec.id} 
                        className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                      >
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            rec.sourceType === 'pos'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {rec.sourceType === 'pos' ? 'POS' : 'DEAL'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-600 text-[11px] whitespace-nowrap">
                          {rec.invoiceNumber}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-700 block text-[11px]">{displayDate}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{rec.operatorOrRep}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 block truncate max-w-[140px]">
                            {rec.clientName}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                            {rec.clientEmail || rec.clientPhone || 'Direct Client'}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[180px]">
                          <span className="font-medium text-slate-700 block truncate text-[11px]">
                            {rec.itemsSummary}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {rec.itemCount} item(s) • {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                          {formatPrice(rec.amount)}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {/* Download PDF button */}
                            <button
                              type="button"
                              onClick={() => handleDownloadPDF(rec)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                              title="Download Branded PDF Invoice"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">PDF</span>
                            </button>

                            {/* Preview PDF */}
                            <button
                              type="button"
                              onClick={() => handlePreviewPDF(rec)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors border border-slate-200"
                              title="Preview PDF in Interactive Modal"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* View Details Drawer */}
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(rec)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                              title="View Full Ledger Record"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Detail & Actions Drawer (4 columns) */}
        <div className="lg:col-span-4">
          {selectedRecord ? (
            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-400" /> 
                  <span>Invoice Record Details</span>
                </h3>
                <button 
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="text-slate-400 hover:text-slate-100 font-bold text-xs"
                >
                  ✕ Close
                </button>
              </div>

              {/* Record Summary */}
              <div className="text-[11px] text-slate-300 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Invoice Number:</span>
                  <span className="font-mono font-bold text-indigo-400">{selectedRecord.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Source Type:</span>
                  <span className="font-bold uppercase tracking-wider text-slate-200">
                    {selectedRecord.sourceType === 'pos' ? 'POS Retail Transaction' : 'CRM B2B Sales Deal'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date Logged:</span>
                  <span className="font-mono">{new Date(selectedRecord.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Managed / Sold By:</span>
                  <span className="font-semibold">{selectedRecord.operatorOrRep}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-400 font-bold">{selectedRecord.status}</span>
                </div>
              </div>

              {/* Client Profile Box */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] space-y-1">
                <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Client / Recipient</p>
                <p className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  {selectedRecord.clientName}
                </p>
                {selectedRecord.clientEmail && (
                  <p className="text-slate-400">{selectedRecord.clientEmail}</p>
                )}
                {selectedRecord.clientPhone && (
                  <p className="text-slate-400 font-mono">{selectedRecord.clientPhone}</p>
                )}
              </div>

              {/* Enterprise Customizer Branding Applied Notice */}
              <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Enterprise Customizer Branding Applied</span>
                </div>
                <p className="text-slate-400 text-[10px]">
                  Header: <strong className="text-slate-200">{receiptConfig.headerTitle}</strong> • TIN: <strong className="text-slate-200">{taxConfig.tinNumber}</strong>
                </p>
                <p className="text-slate-400 text-[10px]">
                  Mode: <strong className="text-slate-200">{taxConfig.taxMode}</strong> • Return Policy: Active
                </p>
              </div>

              {/* Total Amount Settled */}
              <div className="flex justify-between text-white font-extrabold text-sm border-t border-slate-800 pt-3">
                <span>Total Amount Settled:</span>
                <span className="font-mono text-emerald-400 text-base">{formatPrice(selectedRecord.amount)}</span>
              </div>

              {/* PDF Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedRecord)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Official PDF Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreviewPDF(selectedRecord)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700"
                >
                  <Eye className="w-4 h-4" />
                  <span>Interactive PDF Live Preview</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-3">
              <Receipt className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Select an Invoice to Inspect</p>
              <p className="text-[11px] max-w-[220px] mx-auto text-slate-500">
                Click "PDF" to download directly, or the eye icon to preview the rendered PDF invoice with your Enterprise Customizer branding.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* INTERACTIVE IN-APP PDF PREVIEW MODAL */}
      {previewPdfUri && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden border border-slate-300">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    PDF Invoice Preview: {selectedRecord.invoiceNumber}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Client: {selectedRecord.clientName} • Amount: {formatPrice(selectedRecord.amount)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedRecord)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPdfUri(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded PDF iframe */}
            <div className="flex-1 w-full bg-slate-100 p-2 overflow-hidden">
              <iframe
                src={previewPdfUri}
                title="Invoice PDF Preview"
                className="w-full h-full rounded-xl border border-slate-300 shadow-inner bg-white"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Branding synced from <strong>Enterprise Customizer</strong> (Header: {receiptConfig.headerTitle})</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewPdfUri(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
