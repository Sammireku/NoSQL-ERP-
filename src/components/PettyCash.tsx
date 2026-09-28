import React, { useState, useEffect, useRef } from 'react';
import { 
  Coins, 
  Plus, 
  Upload, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  Image as ImageIcon, 
  DollarSign, 
  Check, 
  Trash2,
  Calendar,
  Sparkles,
  Loader2,
  User,
  Building,
  Maximize2,
  X
} from 'lucide-react';
import { UserProfile, PettyCashAllocation, PettyCashExpense, Vendor } from '../types/erp';
import { dataStore } from '../config/firebase';

interface PettyCashProps {
  activeUser: UserProfile;
}

export default function PettyCash({ activeUser }: PettyCashProps) {
  const [allocations, setAllocations] = useState<PettyCashAllocation[]>([]);
  const [expenses, setExpenses] = useState<PettyCashExpense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Allocation Dialog State
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [allocAmount, setAllocAmount] = useState('');
  const [allocNotes, setAllocNotes] = useState('');

  // Expense Dialog State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Office Supplies');
  const [expenseVendor, setExpenseVendor] = useState('');
  const [expenseDept, setExpenseDept] = useState('Operations');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [receiptMime, setReceiptMime] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [rawTextNotes, setRawTextNotes] = useState('');
  const [parseStatus, setParseStatus] = useState<string | null>(null);

  // Department-level limit and allocation tracking
  const [deptLimits, setDeptLimits] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('petty_cash_dept_limits');
    return saved ? JSON.parse(saved) : { 
      Sales: 500, 
      Marketing: 400, 
      Operations: 1200, 
      HR: 300, 
      Hospitality: 1000, 
      IT: 800 
    };
  });
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [tempLimits, setTempLimits] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem('petty_cash_dept_limits', JSON.stringify(deptLimits));
  }, [deptLimits]);

  // File Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Read Initial Stores
    setAllocations(dataStore.getPettyCashAllocations());
    setExpenses(dataStore.getPettyCashExpenses());
    setVendors(dataStore.getVendors());

    // Setup Subscriptions for live sync
    const unsubAlloc = dataStore.subscribeToCollection('petty_cash_alloc', () => {
      setAllocations(dataStore.getPettyCashAllocations());
    });

    const unsubExp = dataStore.subscribeToCollection('petty_cash_exp', () => {
      setExpenses(dataStore.getPettyCashExpenses());
    });

    const unsubVendors = dataStore.subscribeToCollection('vendors', () => {
      setVendors(dataStore.getVendors());
    });

    return () => {
      unsubAlloc();
      unsubExp();
      unsubVendors();
    };
  }, []);

  // Compute live calculations
  const totalAllocated = allocations.reduce((sum, item) => sum + item.amount, 0);
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBalance = totalAllocated - totalSpent;

  const handleAllocate = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(allocAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid allocation amount.");
      return;
    }

    const newAlloc: PettyCashAllocation = {
      id: 'alloc_' + Date.now(),
      amount: amountNum,
      allocatedBy: activeUser.name,
      allocatedByEmail: activeUser.email,
      timestamp: new Date().toISOString(),
      notes: allocNotes.trim() || "Routine operational replenishment"
    };

    const updated = [newAlloc, ...allocations];
    dataStore.savePettyCashAllocations(updated);
    setAllocations(updated);

    // Write to central audit log
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'ALLOCATE',
      `Petty Cash: +$${amountNum.toFixed(2)}`,
      `Allocated petty cash. Note: ${newAlloc.notes}`
    );

    // Reset Form
    setAllocAmount('');
    setAllocNotes('');
    setIsAllocModalOpen(false);
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }
    if (!expenseDesc.trim()) {
      alert("Please provide a brief description of the expense.");
      return;
    }
    if (!expenseVendor.trim()) {
      alert("Please select or specify a vendor name.");
      return;
    }

    const newExp: PettyCashExpense = {
      id: 'exp_' + Date.now(),
      amount: amountNum,
      description: expenseDesc.trim(),
      category: expenseCategory,
      vendor: expenseVendor,
      recordedBy: activeUser.name,
      timestamp: new Date().toISOString(),
      receiptImage: imagePreview || undefined,
      receiptText: rawTextNotes || undefined,
      department: expenseDept
    };

    const updated = [newExp, ...expenses];
    dataStore.savePettyCashExpenses(updated);
    setExpenses(updated);

    // If introducing a brand new vendor that doesn't exist yet, save it to database
    const vendorExists = vendors.some(v => v.name.toLowerCase() === expenseVendor.toLowerCase());
    if (!vendorExists && expenseVendor.trim()) {
      const newVendor: Vendor = {
        id: 'vendor_' + Date.now(),
        name: expenseVendor.trim(),
        contactName: "Automatic Registry",
        email: "contact@" + expenseVendor.toLowerCase().replace(/[^a-z0-9]/g, '') + ".com",
        phone: "555-0192",
        category: "General Operational",
        leadTimeDays: 3
      };
      const updatedVendors = [newVendor, ...vendors];
      dataStore.saveVendors(updatedVendors);
      setVendors(updatedVendors);
    }

    // Write to central audit log
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'EXPENSE_RECORD',
      `Petty Cash Expense: -$${amountNum.toFixed(2)}`,
      `Recorded expense to ${expenseVendor} for "${expenseDesc.trim()}".`
    );

    // Reset states
    setExpenseAmount('');
    setExpenseDesc('');
    setExpenseVendor('');
    setExpenseDept('Operations');
    setSelectedVendorId('');
    setImagePreview(null);
    setReceiptMime(null);
    setRawTextNotes('');
    setParseStatus(null);
    setIsExpenseModalOpen(false);
  };

  // Convert File to Base64 & trigger parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload a valid image receipt (JPEG, PNG, WebP).");
      return;
    }

    setReceiptMime(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setImagePreview(b64);
      // Trigger extraction
      parseReceiptWithGemini(b64, file.type, '');
    };
    reader.readAsDataURL(file);
  };

  const handleTextExtract = () => {
    if (!rawTextNotes.trim()) {
      alert("Please enter some text description or handwritten receipt details first.");
      return;
    }
    parseReceiptWithGemini('', '', rawTextNotes);
  };

  // Call server-side API to parse receipt using Gemini
  const parseReceiptWithGemini = async (base64String: string, mime: string, text: string) => {
    setIsParsing(true);
    setParseStatus("Analyzing with Gemini-3.8-Flash...");

    // Clean up base64 prefix if sending to backend
    const rawBase64 = base64String ? base64String.split(',')[1] : '';

    try {
      const response = await fetch('/api/ai/parse-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64Data: rawBase64,
          mimeType: mime,
          textInput: text
        })
      });

      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        const d = resJson.data;
        if (d.amount) setExpenseAmount(d.amount.toString());
        if (d.vendor) {
          setExpenseVendor(d.vendor);
          // Look up if this vendor matches an existing vendor code
          const found = vendors.find(v => v.name.toLowerCase() === d.vendor.toLowerCase());
          if (found) setSelectedVendorId(found.id);
        }
        if (d.description) setExpenseDesc(d.description);
        if (d.category) setExpenseCategory(d.category);
        setParseStatus("✓ Successfully parsed receipt!");
      } else {
        setParseStatus("⚠ Parsing failed. Please enter values manually.");
      }
    } catch (err) {
      console.error("Failed to parse:", err);
      setParseStatus("⚠ Offline fallback activated. Enter manually.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleVendorSelect = (vId: string) => {
    setSelectedVendorId(vId);
    if (vId === 'NEW') {
      setExpenseVendor('');
    } else {
      const found = vendors.find(v => v.id === vId);
      if (found) setExpenseVendor(found.name);
    }
  };

  const handleDeleteExpense = (id: string, amount: number) => {
    if (confirm("Are you sure you want to delete this expense? This will return the funds to petty cash.")) {
      const updated = expenses.filter(e => e.id !== id);
      dataStore.savePettyCashExpenses(updated);
      setExpenses(updated);

      dataStore.logAudit(
        activeUser.uid,
        activeUser.name,
        activeUser.role,
        'DELETE',
        `Expense Record: ${id}`,
        `Deleted expense record of $${amount.toFixed(2)}`
      );
    }
  };

  return (
    <div className="space-y-6" id="petty_cash_module">
      
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-xl border border-slate-200/80 shadow-sm transition-all hover:shadow-md duration-300">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Coins className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm font-sans">Corporate Petty Cash Management</h2>
            <p className="text-xs text-slate-500">Track and allocate corporate petty cash funds and process OCR receipt claims using AI.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {(activeUser.role === 'manager' || activeUser.role === 'ceo' || activeUser.role === 'sysadmin') && (
            <button
              onClick={() => setIsAllocModalOpen(true)}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Replenish Funds</span>
            </button>
          )}
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Record Receipt Expense</span>
          </button>
        </div>
      </div>

      {/* Balance Dashboard Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Allocated Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total replenishment</span>
            <p className="text-xl font-extrabold text-slate-800 font-mono">${totalAllocated.toFixed(2)}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Total Spent Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total disbursed</span>
            <p className="text-xl font-extrabold text-slate-800 font-mono">${totalSpent.toFixed(2)}</p>
          </div>
          <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* Live Remaining Balance Card */}
        <div className={`p-5 rounded-xl border shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 ${
          remainingBalance < 50 
            ? 'bg-amber-50/50 border-amber-200 text-amber-900' 
            : 'bg-indigo-50/40 border-indigo-100 text-indigo-950'
        }`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Live Remaining Pool</span>
            <p className="text-xl font-black font-mono">${remainingBalance.toFixed(2)}</p>
          </div>
          <div className="p-2.5 bg-white rounded-lg text-indigo-600 border border-indigo-100 shadow-sm">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* DEPARTMENTAL PETTY CASH BUDGET & USAGE MONITORS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-slate-100 rounded-lg text-slate-700">🏢</span>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Departmental Budgets & Live Usage</h3>
              <p className="text-[10px] text-slate-500">Live limits tracked and calculated centrally to prevent operational deficits</p>
            </div>
          </div>

          {(activeUser.role === 'ceo' || activeUser.role === 'accountant' || activeUser.role === 'sysadmin' || activeUser.role === 'manager') && (
            <button
              onClick={() => {
                const temp: Record<string, string> = {};
                Object.keys(deptLimits).forEach(d => {
                  temp[d] = deptLimits[d].toString();
                });
                setTempLimits(temp);
                setIsDeptModalOpen(true);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-slate-200"
            >
              ⚙ Adjust Limits
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Object.keys(deptLimits).map(dept => {
            const limit = deptLimits[dept];
            // Calculate total spent for this specific department
            const spent = expenses
              .filter(exp => exp.department === dept)
              .reduce((sum, exp) => sum + exp.amount, 0);
            const remaining = Math.max(0, limit - spent);
            const spentPercent = limit > 0 ? (spent / limit) * 100 : 0;
            const remainingPercent = limit > 0 ? (remaining / limit) * 100 : 0;

            // Status Badge
            let statusText = "Healthy";
            let statusClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
            let barColor = "bg-emerald-500";

            if (remainingPercent <= 10) {
              statusText = "Critical (Out!)";
              statusClass = "bg-rose-100 text-rose-800 border-rose-200 animate-pulse";
              barColor = "bg-rose-500";
            } else if (remainingPercent <= 30) {
              statusText = "Caution";
              statusClass = "bg-amber-50 text-amber-700 border-amber-200";
              barColor = "bg-amber-500";
            }

            return (
              <div key={dept} className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl space-y-2 flex flex-col justify-between hover:shadow-xs transition-all">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-800">{dept}</span>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider ${statusClass}`}>
                      {statusText}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">Spent:</span>
                    <span className="text-[11px] font-mono font-bold text-slate-700">${spent.toFixed(2)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Pool Limit:</span>
                    <span className="text-[11px] font-mono text-slate-500">${limit}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(100, spentPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-semibold font-mono">
                    <span>{spentPercent.toFixed(0)}% used</span>
                    <span>${remaining.toFixed(0)} left</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADJUST DEPARTMENTS BUDGET MODAL */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>⚙ Configure Departmental Limits</span>
              </h3>
              <button onClick={() => setIsDeptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const updated: Record<string, number> = {};
                Object.keys(tempLimits).forEach(dept => {
                  const val = parseFloat(tempLimits[dept]);
                  updated[dept] = isNaN(val) || val < 0 ? 0 : val;
                });
                setDeptLimits(updated);
                setIsDeptModalOpen(false);
              }} 
              className="space-y-4 text-xs"
            >
              <p className="text-[10px] text-slate-500">
                Adjust petty cash caps per corporate department. Changes will apply immediately and refresh live status progress indicators.
              </p>

              <div className="grid grid-cols-2 gap-3.5 max-h-60 overflow-y-auto pr-1">
                {Object.keys(deptLimits).map(dept => (
                  <div key={dept} className="space-y-1">
                    <label className="font-bold text-slate-700 capitalize">{dept} Pool ($)</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={tempLimits[dept] || ''}
                      onChange={(e) => setTempLimits({ ...tempLimits, [dept]: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold"
                >
                  Save Limits
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold border border-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Layout Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: List of disbursements */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Disbursement Logs & Claims</h3>
              <span className="bg-indigo-50 text-indigo-700 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                {expenses.length} Expensed
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {expenses.length > 0 ? (
                expenses.map(exp => (
                  <div key={exp.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/40 transition-colors group">
                    <div className="flex gap-3">
                      {exp.receiptImage ? (
                        <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden shrink-0 relative group/img cursor-pointer">
                          <img src={exp.receiptImage} alt="Receipt" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                            <Maximize2 className="w-4.5 h-4.5 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                          <FileText className="w-5 h-5 text-slate-400" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <p className="font-bold text-xs text-slate-800">{exp.description}</p>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            {exp.vendor}
                          </span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                            {exp.category}
                          </span>
                          {exp.department && (
                            <>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                🏢 {exp.department}
                              </span>
                            </>
                          )}
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {exp.recordedBy}
                          </span>
                        </div>
                        {exp.receiptText && (
                          <div className="bg-slate-50 p-2 rounded text-[10px] text-slate-500 font-mono max-w-md mt-1 border border-slate-100">
                            Parsed Output: {exp.receiptText}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-slate-800 font-mono">-${exp.amount.toFixed(2)}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{new Date(exp.timestamp).toLocaleDateString()}</p>
                      </div>

                      {(activeUser.role === 'manager' || activeUser.role === 'ceo' || activeUser.role === 'sysadmin') && (
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.amount)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="Void claims & return funds"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Coins className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-500 text-xs">No expensed receipts catalogued.</p>
                  <p className="text-[10px]">Staff can record claims by pressing the AI Process Claim button above.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Replenishment audits */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Allocation & Audit History</h3>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {allocations.length > 0 ? (
                allocations.map(alloc => (
                  <div key={alloc.id} className="p-4 space-y-1.5 hover:bg-slate-50/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
                        REPLENISHED
                      </span>
                      <span className="text-xs font-bold text-emerald-600 font-mono">+${alloc.amount.toFixed(2)}</span>
                    </div>

                    <p className="text-xs text-slate-600 italic font-sans leading-relaxed">
                      "{alloc.notes}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>By: {alloc.allocatedBy}</span>
                      <span>{new Date(alloc.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-slate-400 space-y-1">
                  <Plus className="w-6 h-6 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">No replenishments recorded.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* REPLENISHMENT MODAL */}
      {isAllocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Replenish Corporate Petty Cash Pool</h3>
              <button onClick={() => setIsAllocModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAllocate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Allocation replenishment amount ($)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    value={allocAmount}
                    onChange={(e) => setAllocAmount(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Allocation notes / explanation</label>
                <textarea
                  placeholder="Routine operational refresh for office stamps, taxi vouchers, or quick hardware tools."
                  rows={3}
                  value={allocNotes}
                  onChange={(e) => setAllocNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/10"
                >
                  Approve & Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setIsAllocModalOpen(false)}
                  className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD EXPENSE MODAL WITH DUALOCR & GEMINI PARSING */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-2xl w-full my-8 space-y-6 animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </span>
                <h3 className="font-bold text-slate-800 text-sm">Process Receipt Claim (AI-Powered)</h3>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* Left Column: Image/Text upload triggers parsing */}
              <div className="space-y-4">
                
                {/* Drag and Drop Receipt Section */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700 block">Option A: Upload/Drag receipt image</span>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/20 p-6 rounded-xl cursor-pointer text-center space-y-2 transition-all relative group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img src={imagePreview} alt="Receipt preview" className="max-h-24 mx-auto object-contain rounded border border-slate-200" />
                        <p className="text-[10px] text-indigo-600 font-bold">✓ Receipt captured. Auto processing...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mx-auto group-hover:scale-110 transition-transform" />
                        <p className="font-semibold text-slate-700 text-[11px]">Click or drag receipt photo</p>
                        <p className="text-[10px] text-slate-400">Supports JPEG, PNG up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Handwritten notes option */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700 block">Option B: Enter receipt text / details</span>
                  <textarea
                    placeholder="E.g., $15.50 for taxi fare to office client site from Central Station, merchant: Premier Cabs, date: today"
                    rows={3}
                    value={rawTextNotes}
                    onChange={(e) => setRawTextNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTextExtract}
                    disabled={isParsing || !rawTextNotes.trim()}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isParsing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    <span>Extract Data with LLM</span>
                  </button>
                </div>

                {/* Processing Status Feedback */}
                {parseStatus && (
                  <div className={`p-2.5 rounded-lg text-[10px] font-mono text-center border font-semibold ${
                    parseStatus.startsWith('✓') 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                      : 'bg-indigo-50 text-indigo-800 border-indigo-100 animate-pulse'
                  }`}>
                    {parseStatus}
                  </div>
                )}

              </div>

              {/* Right Column: Form fields that auto-populate and submit */}
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                
                {/* Vendor dropdown + database */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Vendor database selector</label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => handleVendorSelect(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none"
                  >
                    <option value="">-- Choose Existing Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.id})</option>
                    ))}
                    <option value="NEW">+ Register New Vendor</option>
                  </select>
                </div>

                {/* Manual/Extracted Vendor Name */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Specified Vendor Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Specify merchant name..."
                    value={expenseVendor}
                    onChange={(e) => setExpenseVendor(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Claim Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Category</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    >
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="Meals & Entertainment">Meals & Entertainment</option>
                      <option value="Travel">Travel</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Software/SaaS">Software/SaaS</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Hardware/Tools">Hardware/Tools</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>
                </div>

                {/* Department Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Allocated Department</label>
                  <select
                    value={expenseDept}
                    onChange={(e) => setExpenseDept(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  >
                    {Object.keys(deptLimits).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Disbursement details / list items</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Office stamps, whiteboard markers"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/10"
                  >
                    Post disbursement
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200"
                  >
                    Cancel
                  </button>
                </div>

              </form>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
