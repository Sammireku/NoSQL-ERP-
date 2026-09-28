import React, { useState } from 'react';
import { 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Download, 
  Copy, 
  Edit3, 
  Save, 
  Plus, 
  UserCheck, 
  ShieldCheck, 
  Printer, 
  Clock, 
  Send, 
  Check, 
  FileCode,
  DollarSign
} from 'lucide-react';
import { UserProfile } from '../../types/erp';

export interface DraftedHRDocument {
  id: string;
  docType: 'contract' | 'confirmation_letter' | 'policy' | 'ethics_code';
  title: string;
  employeeName?: string;
  department?: string;
  content: string;
  createdAt: string;
  status: 'draft' | 'finalized' | 'signed';
  author: string;
}

const DEFAULT_DOCUMENTS: DraftedHRDocument[] = [
  {
    id: 'doc_contract_101',
    docType: 'contract',
    title: 'Standard Employment Contract - Adwoa Sarfo',
    employeeName: 'Adwoa Sarfo',
    department: 'Hospitality Front Desk',
    content: `# EMPLOYMENT CONTRACT AGREEMENT

**EMPLOYER:** Tumi Ghana Enterprise / Modular ERP  
**EMPLOYEE:** Adwoa Sarfo  
**POSITION:** Front Desk & Guest Relations Officer  
**DEPARTMENT:** Hospitality & Guest Services  
**EFFECTIVE DATE:** October 1, 2026  
**COMPENSATION:** GH₵ 3,800.00 / month  

---

### 1. APPOINTMENT & SCOPE OF WORK
The Employer hereby engages the Employee in the capacity of **Front Desk & Guest Relations Officer**. The Employee accepts appointment and agrees to discharge assigned responsibilities in accordance with Tumi Ghana operational policies.

### 2. COMPENSATION, ALLOWANCES & TAXES
The Employee shall receive a gross monthly salary of **GH₵ 3,800.00**, subject to statutory SSNIT pension contributions and GRA PAYE tax deductions. Remuneration is disbursed on the 25th of every month.

### 3. PROBATION & PERFORMANCE REVIEW
The Employee shall undergo a standard **90-Day Probationary Period** ending December 31, 2026. Prior to permanent confirmation, HR and the Managing Director will evaluate performance and issue an official confirmation notice.

### 4. WORKING HOURS & SHIFT ROSTER
Standard working hours consist of scheduled shifts outlined in the Tumi Roster Calendar. Split-shift assignments (e.g. morning housekeeping / afternoon front desk) are compensated at standard hourly rates with shift meal allowances.

### 5. CONFIDENTIALITY & CODE OF ETHICS
The Employee agrees not to disclose proprietary guest lists, financial transactions, or system access credentials to third parties during or after employment.

---

**SIGNATURES & DIGITAL ACKNOWLEDGEMENT:**

_______________________________________          _______________________________________
**Employee Signature (Adwoa Sarfo)**             **Authorized HR Lead / CEO**`,
    createdAt: '2026-09-20',
    status: 'finalized',
    author: 'CEO Management'
  },
  {
    id: 'doc_confirm_102',
    docType: 'confirmation_letter',
    title: 'Probation Confirmation Letter - Kwesi Mensah',
    employeeName: 'Kwesi Mensah',
    department: 'Vocational Training & Tailoring',
    content: `# OFFICIAL CONFIRMATION OF PERMANENT EMPLOYMENT

**REF:** TUMI-HR/CONF/2026/089  
**DATE:** September 15, 2026  
**TO:** Mr. Kwesi Mensah  
**DESIGNATION:** Master Sewing Instructor & Production Lead  

---

Dear Kwesi,

### RE: SUCCESSFUL COMPLETION OF PROBATION & FULL-TIME CONFIRMATION

We are delighted to formally confirm your appointment as **Master Sewing Instructor & Production Lead** at Tumi Ghana Enterprise, effective **October 1, 2026**.

During your 90-day probationary review, Management and the Student Affairs Committee noted your exemplary commitment, precision tailoring expertise, and mentorship toward our vocational trainees.

### REVISED REMUNERATION PACKAGE
* **New Gross Salary:** GH₵ 4,500.00 per month
* **Health & Welfare Allowance:** GH₵ 400.00 monthly tier
* **Annual Leave Entitlement:** 21 Working Days paid PTO

All other terms outlined in your initial agreement remain active and binding. Please sign and return a copy of this confirmation letter to HR.

Warm congratulations!

Sincerely,

_______________________________________  
**Chief Executive Officer & HR Committee**  
Tumi Ghana Enterprise`,
    createdAt: '2026-09-15',
    status: 'signed',
    author: 'HR Department'
  }
];

export default function AIDocumentDraftingTab({ activeUser }: { activeUser: UserProfile }) {
  const [docList, setDocList] = useState<DraftedHRDocument[]>(() => {
    const saved = localStorage.getItem('tumi_hr_ai_documents_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return DEFAULT_DOCUMENTS;
  });

  // Active Document Selector
  const [activeDocId, setActiveDocId] = useState<string>(DEFAULT_DOCUMENTS[0].id);
  const activeDoc = docList.find(d => d.id === activeDocId) || docList[0];

  // Generator Form State
  const [docType, setDocType] = useState<'contract' | 'confirmation_letter' | 'policy' | 'ethics_code'>('contract');
  const [employeeName, setEmployeeName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('Hospitality Front Desk');
  const [currency, setCurrency] = useState('GHS');
  const [salary, setSalary] = useState('3800');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [probationMonths, setProbationMonths] = useState(3);
  const [policyTopic, setPolicyTopic] = useState('Workplace Code of Ethics & Anti-Harassment');
  const [customNotes, setCustomNotes] = useState('');

  // Execution States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);

  const saveToStorage = (list: DraftedHRDocument[]) => {
    setDocList(list);
    localStorage.setItem('tumi_hr_ai_documents_v1', JSON.stringify(list));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/hr/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType,
          employeeName: employeeName.trim() || 'John Doe',
          roleTitle: roleTitle.trim() || 'Operations Specialist',
          department,
          salary,
          currency,
          startDate,
          probationMonths,
          customNotes,
          policyTopic
        })
      });

      const data = await res.json();
      if (data.success && data.document) {
        const titleLabel = docType === 'contract' 
          ? `Employment Contract - ${employeeName || 'New Hire'}`
          : docType === 'confirmation_letter'
          ? `Confirmation Letter - ${employeeName || 'Staff Member'}`
          : `Company Policy - ${policyTopic || 'Workplace Code'}`;

        const newDoc: DraftedHRDocument = {
          id: 'doc_' + Date.now(),
          docType,
          title: titleLabel,
          employeeName: employeeName || 'New Hire',
          department,
          content: data.document,
          createdAt: new Date().toISOString().slice(0, 10),
          status: 'draft',
          author: `${activeUser.name} (${activeUser.role.toUpperCase()})`
        };

        const updated = [newDoc, ...docList];
        saveToStorage(updated);
        setActiveDocId(newDoc.id);
      }
    } catch (err) {
      console.error("Failed to generate AI contract:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEdit = () => {
    if (!activeDoc) return;
    const updated = docList.map(d => d.id === activeDoc.id ? { ...d, content: editedContent } : d);
    saveToStorage(updated);
    setIsEditing(false);
  };

  const handleCopyText = () => {
    if (!activeDoc) return;
    navigator.clipboard.writeText(activeDoc.content);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${activeDoc?.title || 'HR Document'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            h1, h2, h3 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
            .header { text-align: center; border-bottom: 3px double #4338ca; padding-bottom: 15px; margin-bottom: 30px; }
            .logo-title { font-size: 24px; font-weight: bold; color: #4338ca; letter-spacing: 1px; }
            .sub-header { font-size: 12px; color: #64748b; text-transform: uppercase; }
            pre { font-family: inherit; white-space: pre-wrap; font-size: 14px; }
            .footer { margin-top: 50px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-title">TUMI GHANA ENTERPRISE</div>
            <div class="sub-header">Human Resources, Staff Contracts & Legal Compliance Engine</div>
          </div>
          <pre>${activeDoc?.content}</pre>
          <div class="footer">
            Official Tumi Enterprise Document &bull; Generated on ${new Date().toLocaleDateString()} &bull; Strictly Confidential
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              AI HR Contract, Letter & Policy Generator
              <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase">
                Gemini 3.8 Flash
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Draft employment contracts, confirmation letters, company codes of ethics, and workplace policies instantly.
            </p>
          </div>
        </div>

        {copiedToast && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>Document text copied to clipboard!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: FORM & GENERATOR CONTROLS */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileCode className="w-4 h-4 text-indigo-600" />
              <span>Document Configuration & Parameters</span>
            </h3>

            {/* Document Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Document Category</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'contract', label: 'Employment Contract', icon: FileText },
                  { id: 'confirmation_letter', label: 'Confirmation Letter', icon: UserCheck },
                  { id: 'policy', label: 'Workplace Policy', icon: ShieldCheck },
                  { id: 'ethics_code', label: 'Code of Ethics', icon: Sparkles }
                ].map(type => {
                  const Icon = type.icon;
                  const isSel = docType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setDocType(type.id as any)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 font-bold transition-all ${
                        isSel
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSel ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="text-[11px] leading-tight">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs for Contract & Confirmation */}
            {(docType === 'contract' || docType === 'confirmation_letter') && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee Full Name</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={e => setEmployeeName(e.target.value)}
                    placeholder="e.g. Adwoa Sarfo"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Job Title / Position</label>
                    <input
                      type="text"
                      value={roleTitle}
                      onChange={e => setRoleTitle(e.target.value)}
                      placeholder="e.g. Front Desk Officer"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                    <select
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="Hospitality Front Desk">Hospitality Front Desk</option>
                      <option value="Housekeeping & Guest Care">Housekeeping & Guest Care</option>
                      <option value="Vocational Tailoring & Production">Vocational Tailoring & Production</option>
                      <option value="Administration & Operations">Administration & Operations</option>
                      <option value="Finance & Accounts">Finance & Accounts</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Salary</label>
                    <div className="flex gap-1">
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="bg-slate-100 border border-slate-200 px-2 rounded-xl text-xs font-bold"
                      >
                        <option value="GHS">GH₵ (GHS)</option>
                        <option value="USD">$ (USD)</option>
                        <option value="EUR">€ (EUR)</option>
                      </select>
                      <input
                        type="number"
                        value={salary}
                        onChange={e => setSalary(e.target.value)}
                        placeholder="3800"
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {docType === 'contract' ? 'Effective Start Date' : 'Confirmation Date'}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {docType === 'contract' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Probation Duration</label>
                    <select
                      value={probationMonths}
                      onChange={e => setProbationMonths(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value={3}>3 Months Probation</option>
                      <option value={6}>6 Months Probation</option>
                      <option value={0}>No Probation (Immediate Full-Time)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Inputs for Policy & Ethics */}
            {(docType === 'policy' || docType === 'ethics_code') && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Policy Subject / Focus Area</label>
                  <input
                    type="text"
                    value={policyTopic}
                    onChange={e => setPolicyTopic(e.target.value)}
                    placeholder="e.g. Workplace Conduct, Anti-Harassment, & Dress Code"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Department Scope</label>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="All Company Departments & Vocational Trainees">All Company Departments & Vocational Trainees</option>
                    <option value="Hospitality Front Desk & Housekeeping">Hospitality Front Desk & Housekeeping</option>
                    <option value="Production Tailoring Workshop">Production Tailoring Workshop</option>
                    <option value="Finance & POS Cashiers">Finance & POS Cashiers</option>
                  </select>
                </div>
              </div>
            )}

            {/* Custom Notes / Specific Clauses */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Special Clauses & Operational Instructions</label>
              <textarea
                rows={3}
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="e.g. Include clause for half-shift role splitting between Housekeeping in morning and Front Desk in afternoon, or meal allowance"
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Drafting Document with Gemini AI...' : 'Draft Document with AI'}</span>
            </button>
          </div>

          {/* DRAFT DOCUMENTS LIBRARY */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Saved HR Documents Library</span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px]">{docList.length}</span>
            </h3>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {docList.map(doc => {
                const isActive = doc.id === activeDocId;
                return (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setActiveDocId(doc.id);
                      setIsEditing(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 truncate max-w-[200px]">{doc.title}</span>
                      <span className="text-[9px] uppercase px-2 py-0.5 rounded font-bold bg-slate-200 text-slate-700">
                        {doc.docType.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Author: {doc.author}</span>
                      <span>{doc.createdAt}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW & EDITOR */}
        <div className="lg:col-span-7 space-y-4">
          {activeDoc ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-full">
              {/* Document Header Bar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{activeDoc.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>Created: {activeDoc.createdAt}</span>
                    <span>&bull;</span>
                    <span className="capitalize text-indigo-700 font-semibold">Status: {activeDoc.status}</span>
                  </div>
                </div>

                {/* Toolbar buttons */}
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <button
                      onClick={() => {
                        setEditedContent(activeDoc.content);
                        setIsEditing(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-200"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Edit Document</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  )}

                  <button
                    onClick={handleCopyText}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-200"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copy</span>
                  </button>

                  <button
                    onClick={handlePrintPDF}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>
                </div>
              </div>

              {/* Document Body Render */}
              <div className="p-6 overflow-y-auto max-h-[700px] bg-slate-50/30 font-sans">
                {isEditing ? (
                  <textarea
                    rows={22}
                    value={editedContent}
                    onChange={e => setEditedContent(e.target.value)}
                    className="w-full bg-white border border-slate-300 p-4 rounded-xl text-xs font-mono text-slate-900 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-hidden shadow-inner"
                  />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-xs text-slate-800 leading-relaxed space-y-4">
                    {/* Official Letterhead Header */}
                    <div className="border-b-2 border-indigo-600 pb-4 mb-6 flex items-center justify-between">
                      <div>
                        <span className="text-xl font-black text-indigo-900 tracking-wider block">TUMI GHANA ENTERPRISE</span>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">Human Resources & Executive Governance Directorate</span>
                        <span className="text-[10px] text-slate-400 block">Adum Commercial District, Kumasi &bull; +233 24 555 8891</span>
                      </div>
                      <div className="text-right text-[10px] text-slate-500">
                        <span className="block font-bold text-slate-700">Ref: {activeDoc.id.toUpperCase()}</span>
                        <span className="block">{activeDoc.createdAt}</span>
                      </div>
                    </div>

                    {/* Pre-formatted content */}
                    <div className="whitespace-pre-wrap font-sans space-y-2">
                      {activeDoc.content}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-700">No Document Selected</p>
              <p className="text-xs">Select a document from the library or generate a new one using the left panel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
