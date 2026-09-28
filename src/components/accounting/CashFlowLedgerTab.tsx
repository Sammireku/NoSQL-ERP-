import React, { useState, useRef } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  DollarSign, 
  Calendar, 
  FileText,
  X,
  CreditCard,
  Building,
  TrendingUp,
  TrendingDown,
  Receipt,
  Camera,
  Upload,
  Sparkles,
  Eye,
  CheckCircle2,
  ExternalLink,
  ZoomIn,
  RotateCw,
  RefreshCw,
  Clock,
  Layers
} from 'lucide-react';
import { CashFlowRecord, UserProfile, ReceiptScanData } from '../../types/erp';
import { exportToCSV } from '../../utils/exportUtils';

interface CashFlowLedgerTabProps {
  cashFlows: CashFlowRecord[];
  activeUser: UserProfile;
  onAddCashFlow: (record: Omit<CashFlowRecord, 'id'>) => void;
  onUpdateCashFlow?: (id: string, updates: Partial<CashFlowRecord>) => void;
  onNavigateToWaveReceipts?: () => void;
}

export default function CashFlowLedgerTab({
  cashFlows,
  activeUser,
  onAddCashFlow,
  onUpdateCashFlow,
  onNavigateToWaveReceipts
}: CashFlowLedgerTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'operating' | 'investing' | 'financing'>('all');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'has_receipt' | 'missing_receipt'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [direction, setDirection] = useState<'inflow' | 'outflow'>('outflow');
  const [activity, setActivity] = useState<'operating' | 'investing' | 'financing'>('operating');
  const [category, setCategory] = useState('Supplier & Inventory Purchases');
  const [amount, setAmount] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Card' | 'Check' | 'Digital Wallet'>('Bank Transfer');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Receipt scanning in modal
  const [modalReceiptImage, setModalReceiptImage] = useState<string | null>(null);
  const [modalScanData, setModalScanData] = useState<ReceiptScanData | null>(null);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('');

  // Selected receipt for retrieval & image update modal
  const [retrievalFlow, setRetrievalFlow] = useState<CashFlowRecord | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isUpdatingPicture, setIsUpdatingPicture] = useState(false);

  // Retroactive attach modal
  const [attachToFlowId, setAttachToFlowId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const updateFileInputRef = useRef<HTMLInputElement | null>(null);
  const retroactiveFileInputRef = useRef<HTMLInputElement | null>(null);

  // Category presets based on activity & direction
  const getCategoryOptions = () => {
    if (direction === 'inflow') {
      if (activity === 'operating') return ['Customer Invoice Collections', 'POS Daily Cash Drop', 'Consulting Retainer', 'Customer Advance Deposit'];
      if (activity === 'investing') return ['Proceeds from Asset Sale', 'Dividend Income', 'Interest on Reserves'];
      return ['Partner Capital Inflow', 'Commercial Loan Draw', 'Shareholder Loan'];
    } else {
      if (activity === 'operating') return [
        'Supplier & Inventory Purchases', 
        'Office Supplies & Technology',
        'Meals & Business Entertainment',
        'Travel & Lodging',
        'Utilities & Cloud Infrastructure',
        'Employee Payroll Run', 
        'Office Lease & Utilities', 
        'Software Subscriptions', 
        'Corporate Taxes'
      ];
      if (activity === 'investing') return ['Fixed Asset Acquisition', 'Capital Equipment', 'Facility Leasehold Improvements'];
      return ['Debt Service Principal', 'Interest Payments', 'Owner Dividend Draw'];
    }
  };

  const handleOpenAddModal = (dir: 'inflow' | 'outflow') => {
    setDirection(dir);
    setActivity('operating');
    setCategory(dir === 'inflow' ? 'Customer Invoice Collections' : 'Supplier & Inventory Purchases');
    setAmount('');
    setCounterparty('');
    setReference(`CF-${Date.now().toString().slice(-6)}`);
    setDescription('');
    setModalReceiptImage(null);
    setModalScanData(null);
    setIsAddModalOpen(true);
  };

  // Process Receipt Image with Gemini AI OCR
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setModalReceiptImage(base64);
      setIsScanningReceipt(true);
      setScanStatusText('Gemini Vision AI analyzing receipt...');

      try {
        const res = await fetch('/api/ai/parse-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiptImageBase64: base64,
            rawTextHint: file.name
          })
        });
        const result = await res.json();
        if (result.success && result.data) {
          const d: ReceiptScanData = result.data;
          setModalScanData(d);
          if (d.totalAmount) setAmount(d.totalAmount.toString());
          if (d.merchantName) setCounterparty(d.merchantName);
          if (d.date) setDate(d.date);
          if (d.category) setCategory(d.category);
          if (d.notes) setDescription(d.notes);
          if (d.merchantName) setReference(`RCP-${d.merchantName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
          setScanStatusText('Receipt extracted! Fields auto-populated.');
        }
      } catch (err) {
        console.warn("AI parse receipt failed:", err);
      } finally {
        setIsScanningReceipt(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Update existing receipt picture on a cash flow record
  const handleUpdateReceiptPicture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!retrievalFlow || !onUpdateCashFlow) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setIsUpdatingPicture(true);

      try {
        const res = await fetch('/api/ai/parse-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiptImageBase64: base64,
            rawTextHint: file.name
          })
        });
        const result = await res.json();
        const scanData = result.success ? result.data : undefined;

        onUpdateCashFlow(retrievalFlow.id, {
          receiptImage: base64,
          receiptScanData: scanData || retrievalFlow.receiptScanData
        });

        setRetrievalFlow({
          ...retrievalFlow,
          receiptImage: base64,
          receiptScanData: scanData || retrievalFlow.receiptScanData
        });
      } catch (err) {
        onUpdateCashFlow(retrievalFlow.id, { receiptImage: base64 });
        setRetrievalFlow({ ...retrievalFlow, receiptImage: base64 });
      } finally {
        setIsUpdatingPicture(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Retroactively attach receipt to a cash flow row
  const handleRetroactiveAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!attachToFlowId || !onUpdateCashFlow) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/ai/parse-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiptImageBase64: base64,
            rawTextHint: file.name
          })
        });
        const result = await res.json();
        const scanData = result.success ? result.data : undefined;

        onUpdateCashFlow(attachToFlowId, {
          receiptImage: base64,
          receiptScanData: scanData
        });
      } catch (err) {
        onUpdateCashFlow(attachToFlowId, { receiptImage: base64 });
      } finally {
        setAttachToFlowId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    onAddCashFlow({
      date,
      type: activity,
      direction,
      activity,
      category,
      amount: numAmount,
      reference: reference.trim() || `REF-${Date.now().toString().slice(-5)}`,
      counterparty: counterparty.trim() || 'Internal Cash Flow',
      paymentMethod,
      description: description.trim() || category,
      recordedBy: activeUser.name,
      receiptImage: modalReceiptImage || undefined,
      receiptScanData: modalScanData || undefined
    });

    setIsAddModalOpen(false);
  };

  // Calculations
  const filteredFlows = cashFlows.filter(flow => {
    const matchesSearch = flow.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          flow.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          flow.counterparty.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          flow.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDir = directionFilter === 'all' || flow.direction === directionFilter;
    const matchesAct = activityFilter === 'all' || flow.activity === activityFilter;
    const matchesReceipt = receiptFilter === 'all' 
      ? true 
      : receiptFilter === 'has_receipt' 
        ? !!flow.receiptImage 
        : !flow.receiptImage;
    return matchesSearch && matchesDir && matchesAct && matchesReceipt;
  });

  const totalInflows = cashFlows.filter(c => c.direction === 'inflow').reduce((sum, c) => sum + c.amount, 0);
  const totalOutflows = cashFlows.filter(c => c.direction === 'outflow').reduce((sum, c) => sum + c.amount, 0);
  const netCashFlow = totalInflows - totalOutflows;

  const operatingNet = cashFlows.filter(c => c.activity === 'operating')
    .reduce((s, c) => s + (c.direction === 'inflow' ? c.amount : -c.amount), 0);
  const investingNet = cashFlows.filter(c => c.activity === 'investing')
    .reduce((s, c) => s + (c.direction === 'inflow' ? c.amount : -c.amount), 0);
  const financingNet = cashFlows.filter(c => c.activity === 'financing')
    .reduce((s, c) => s + (c.direction === 'inflow' ? c.amount : -c.amount), 0);

  const handleExport = () => {
    const data = filteredFlows.map(f => ({
      'Date': f.date,
      'Reference': f.reference,
      'Direction': f.direction.toUpperCase(),
      'Activity': f.activity.toUpperCase(),
      'Category': f.category,
      'Counterparty': f.counterparty,
      'Payment Method': f.paymentMethod.toUpperCase(),
      'Amount ($)': f.amount.toFixed(2),
      'Entered By': f.recordedBy,
      'Receipt Attached': f.receiptImage ? 'YES' : 'NO',
      'Description': f.description
    }));
    exportToCSV(data, `Cash_Flow_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Cash Flow Ledger & Inflow/Outflow Management
          </h2>
          <p className="text-xs text-slate-500">
            Real-time cash flow statement tracking with OCR receipt scanning, proof retrieval, and Wave expense sync
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToWaveReceipts && (
            <button
              onClick={onNavigateToWaveReceipts}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all"
            >
              <Receipt className="w-4 h-4 text-blue-600" />
              Wave Receipts Hub
            </button>
          )}

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-xs font-semibold transition-all shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={() => handleOpenAddModal('outflow')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
          >
            <ArrowDownRight className="w-4 h-4" />
            Record Outflow & Scan Receipt
          </button>
          <button
            onClick={() => handleOpenAddModal('inflow')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
          >
            <ArrowUpRight className="w-4 h-4" />
            Record Inflow
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Cash Flow</span>
            <span className={`p-1.5 rounded-lg ${netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {netCashFlow >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </span>
          </div>
          <div className={`text-xl font-black mt-2 ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            ${netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Inflows minus Disbursements</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Cash Inflow</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            +${totalInflows.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{cashFlows.filter(c => c.direction === 'inflow').length} inflow events recorded</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total Cash Outflow</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            -${totalOutflows.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {cashFlows.filter(c => c.direction === 'outflow' && c.receiptImage).length} receipts scanned & archived
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Operating Cash Net</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-xl font-black mt-2 ${operatingNet >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
            ${operatingNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Operations core cash balance</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Direction Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
            {(['all', 'inflow', 'outflow'] as const).map(dir => (
              <button
                key={dir}
                onClick={() => setDirectionFilter(dir)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                  directionFilter === dir
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {dir === 'all' ? 'All Flows' : dir}
              </button>
            ))}
          </div>

          {/* Receipt Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setReceiptFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                receiptFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              All Receipts
            </button>
            <button
              onClick={() => setReceiptFilter('has_receipt')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                receiptFilter === 'has_receipt' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-500'
              }`}
            >
              <Receipt className="w-3 h-3 text-blue-600" />
              Receipt Attached
            </button>
            <button
              onClick={() => setReceiptFilter('missing_receipt')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                receiptFilter === 'missing_receipt' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-slate-500'
              }`}
            >
              Missing Receipt
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ref, merchant, notes..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-indigo-500"
          />
        </div>
      </div>

      {/* Cash Flow Table with Receipt Proof & Retrieval */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Ref #</th>
                <th className="py-3 px-4">Receipt Proof</th>
                <th className="py-3 px-4">Activity</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payee / Payer</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount ($)</th>
                <th className="py-3 px-4">Entered By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFlows.map(flow => (
                <tr key={flow.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {flow.date}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {flow.reference}
                  </td>
                  <td className="py-3 px-4">
                    {flow.receiptImage ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRetrievalFlow(flow);
                          setZoomLevel(1);
                          setRotation(0);
                        }}
                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-[11px] transition-all shadow-2xs group"
                      >
                        <div className="w-4 h-4 rounded overflow-hidden bg-slate-200 shrink-0 border border-blue-300">
                          <img src={flow.receiptImage} alt="Receipt" className="w-full h-full object-cover" />
                        </div>
                        <span>View Receipt</span>
                        <Eye className="w-3 h-3 text-blue-500 group-hover:scale-110" />
                      </button>
                    ) : flow.direction === 'outflow' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAttachToFlowId(flow.id);
                          retroactiveFileInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-dashed border-slate-300 rounded text-[10px] font-semibold transition-all"
                      >
                        <Upload className="w-3 h-3" />
                        + Attach Receipt
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-300 italic">N/A (Inflow)</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      flow.activity === 'operating' ? 'bg-indigo-50 text-indigo-700' :
                      flow.activity === 'investing' ? 'bg-amber-50 text-amber-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>
                      {flow.activity}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{flow.category}</div>
                    {flow.description && <div className="text-[11px] text-slate-400">{flow.description}</div>}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">
                    {flow.counterparty}
                  </td>
                  <td className="py-3 px-4 capitalize text-slate-500">
                    {flow.paymentMethod.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    <span className={`inline-flex items-center gap-1 ${
                      flow.direction === 'inflow' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {flow.direction === 'inflow' ? '+' : '-'}
                      ${flow.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {flow.recordedBy}
                  </td>
                </tr>
              ))}
              {filteredFlows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No cash flow records found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden File Inputs for modal, update, and retroactive attach */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleReceiptUpload}
        accept="image/*,.pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleReceiptUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={updateFileInputRef}
        onChange={handleUpdateReceiptPicture}
        accept="image/*,.pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={retroactiveFileInputRef}
        onChange={handleRetroactiveAttach}
        accept="image/*,.pdf"
        className="hidden"
      />

      {/* RECEIPT RETRIEVAL & AUDIT MODAL */}
      {retrievalFlow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Receipt Audit: {retrievalFlow.reference}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Proof of Expense disbursement & OCR account mapping
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRetrievalFlow(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Receipt Picture Frame */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold">Original Document Image</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRotation(prev => (prev + 90) % 360)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600"
                      title="Rotate"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    {retrievalFlow.receiptImage && (
                      <a
                        href={retrievalFlow.receiptImage}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 hover:bg-slate-100 rounded text-blue-600"
                        title="Fullscreen"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="w-full h-64 bg-slate-950 rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-200">
                  {retrievalFlow.receiptImage ? (
                    <img
                      src={retrievalFlow.receiptImage}
                      alt="Disbursement Receipt"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease-in-out'
                      }}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-1" />
                      <p className="text-xs">No image attached yet</p>
                    </div>
                  )}

                  {isUpdatingPicture && (
                    <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white">
                      <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-2" />
                      <p className="text-xs font-bold">Scanning & updating picture...</p>
                    </div>
                  )}
                </div>

                {/* Picture Update & Retake Controls */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Need a clearer copy?
                  </span>
                  <button
                    type="button"
                    onClick={() => updateFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Update / Replace Picture
                  </button>
                </div>
              </div>

              {/* Transaction & Extracted Details */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Disbursed To:</span>
                  <span className="font-bold text-slate-900">{retrievalFlow.counterparty}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Transaction Date:</span>
                  <span className="font-mono text-slate-800">{retrievalFlow.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Account Category:</span>
                  <span className="font-semibold text-indigo-700">{retrievalFlow.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Payment Method:</span>
                  <span className="font-medium text-slate-700">{retrievalFlow.paymentMethod}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800">Total Paid:</span>
                  <span className="font-mono font-black text-rose-600 text-base">
                    ${retrievalFlow.amount.toFixed(2)}
                  </span>
                </div>

                {retrievalFlow.receiptScanData?.lineItems && retrievalFlow.receiptScanData.lineItems.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Extracted Items</p>
                    <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                      {retrievalFlow.receiptScanData.lineItems.map((item, i) => (
                        <div key={i} className="p-2 flex items-center justify-between text-[11px]">
                          <span className="text-slate-700">{item.description}</span>
                          {item.totalPrice !== undefined ? `$${item.totalPrice.toFixed(2)}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Logged by {retrievalFlow.recordedBy}
              </span>
              <button
                onClick={() => setRetrievalFlow(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD CASH FLOW & RECEIPT SCAN MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {direction === 'inflow' ? (
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-rose-600" />
                )}
                <span>Record Cash {direction === 'inflow' ? 'Inflow (Receipt)' : 'Outflow (Disbursement)'}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Prominent Receipt Scanner for Outflow */}
              {direction === 'outflow' && (
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-blue-600" />
                      Receipt & Image Scan (Gemini AI Parser)
                    </span>
                    {modalReceiptImage && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Receipt Staged
                      </span>
                    )}
                  </div>

                  {!modalReceiptImage ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white border border-blue-200 hover:border-blue-400 rounded-lg text-blue-700 font-bold hover:bg-blue-50 transition-all shadow-2xs"
                      >
                        <Camera className="w-4 h-4" />
                        Take Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white border border-blue-200 hover:border-blue-400 rounded-lg text-blue-700 font-bold hover:bg-blue-50 transition-all shadow-2xs"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Receipt
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-blue-100">
                      <div className="w-12 h-12 rounded overflow-hidden bg-slate-900 shrink-0 border border-blue-200">
                        <img src={modalReceiptImage} alt="Receipt" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 line-clamp-1">
                          {modalScanData?.merchantName || 'Receipt Image Uploaded'}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          {scanStatusText || 'Fields auto-populated into form'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setModalReceiptImage(null);
                          setModalScanData(null);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {isScanningReceipt && (
                    <div className="flex items-center gap-2 text-blue-700 font-medium text-[11px] animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{scanStatusText}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Direction</label>
                  <select
                    value={direction}
                    onChange={(e) => {
                      const d = e.target.value as 'inflow' | 'outflow';
                      setDirection(d);
                      setCategory(d === 'inflow' ? 'Customer Invoice Collections' : 'Supplier & Inventory Purchases');
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="inflow">Inflow (Cash Received)</option>
                    <option value="outflow">Outflow (Cash Paid Out)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Cash Activity</label>
                  <select
                    value={activity}
                    onChange={(e) => setActivity(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="operating">Operating Activity</option>
                    <option value="investing">Investing Activity</option>
                    <option value="financing">Financing Activity</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Transaction Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Classification Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {getCategoryOptions().map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payee / Payer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Industrial Supplies"
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Reference / Voucher #</label>
                  <input
                    type="text"
                    placeholder="e.g. CF-10928"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Bank Transfer">Bank Transfer (ACH / Wire)</option>
                  <option value="Digital Wallet">Digital Wallet (Mobile / Online)</option>
                  <option value="Card">Company Credit / Debit Card</option>
                  <option value="Cash">Petty Cash / Till</option>
                  <option value="Check">Commercial Check</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Memo / Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes on the cash transaction..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  className={`px-4 py-2 text-white rounded-lg font-bold shadow-xs transition-all ${
                    direction === 'inflow' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Post Cash Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
