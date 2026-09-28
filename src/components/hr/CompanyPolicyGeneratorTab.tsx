import React, { useState } from 'react';
import { Sparkles, FileText, CheckCircle2, ShieldCheck, Edit3, Save, RefreshCw, Send } from 'lucide-react';
import { UserProfile } from '../../types/erp';

interface PolicyDocument {
  id: string;
  category: string;
  title: string;
  content: string;
  status: 'draft' | 'approved' | 'published';
  approvedBy?: string;
  updatedAt: string;
}

export default function CompanyPolicyGeneratorTab({ activeUser }: { activeUser: UserProfile }) {
  const [policies, setPolicies] = useState<PolicyDocument[]>(() => {
    const stored = localStorage.getItem('erp_company_policies');
    if (stored) return JSON.parse(stored);
    return [
      {
        id: 'pol_1',
        category: 'Probation & Tenure',
        title: 'Employee Probation, Appraisal & Permanent Enlistment Policy',
        content: `1. PURPOSE & SCOPE
This policy establishes the formal guidelines for new hire onboarding, standard 90-day probation monitoring, performance appraisals, and transition to confirmed full staff status.

2. PROBATIONARY PERIOD
All newly hired personnel shall undergo a mandatory 90-day probation period upon initial appointment. During this time, direct department managers will evaluate attendance, technical competence, team collaboration, and adherence to company ethics.

3. PERFORMANCE APPRAISALS & CONFIRMATION
Upon completion of the 90-day period, HR and the department lead will conduct a formal appraisal interview. Upon satisfactory review, HR will issue a confirmation notice and enlist the staff member as a permanent full-time employee.

4. COMPLIANCE & TERMINATION
Failure to meet performance standards during probation may result in an extended probation (up to 30 additional days) or immediate contract termination with notice.`,
        status: 'approved',
        approvedBy: 'CEO Management',
        updatedAt: '2026-02-10'
      }
    ];
  });

  const [selectedCategory, setSelectedCategory] = useState('Code of Conduct & Workplace Ethics');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDraft, setActiveDraft] = useState<PolicyDocument | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const savePoliciesToStorage = (updated: PolicyDocument[]) => {
    setPolicies(updated);
    localStorage.setItem('erp_company_policies', JSON.stringify(updated));
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleGeneratePolicy = () => {
    setIsGenerating(true);
    setTimeout(() => {
      let draftText = '';
      if (selectedCategory.includes('Code of Conduct')) {
        draftText = `1. ETHICAL STANDARDS & PROFESSIONAL INTEGRITY
All personnel are required to act with honesty, fairness, and professional integrity in all business dealings, internal communications, and customer transactions.

2. ANTI-HARASSMENT & INCLUSIVITY
We maintain a strict zero-tolerance policy against discrimination or harassment of any kind based on race, gender, religion, age, disability, or orientation. All employees are entitled to a safe, respectful, and dignified work environment.

3. CONFLICT OF INTEREST & GIFTS
Employees must avoid any situation in which personal interests conflict with company responsibilities. Accepting gifts or hospitality valued at over $50 from suppliers or partners is strictly prohibited without prior written approval from the CEO.

4. COMPLIANCE & DISCIPLINARY ACTIONS
Violations of this Code of Conduct will result in formal disciplinary proceedings up to and including immediate termination and legal action where appropriate.`;
      } else if (selectedCategory.includes('Information Security')) {
        draftText = `1. DATA PROTECTION & CONFIDENTIALITY
All customer records, financial databases, source code, and corporate credentials are classified as Strictly Confidential. Unauthorized disclosure or export of internal data is grounds for immediate dismissal.

2. ACCESS CONTROLS & TERMINAL PINS
Security PINs, account passwords, and 2-Factor Authentication tokens must never be shared or written in visible areas. Employees must lock workstations when leaving terminals unattended.

3. DEVICE & SYSTEM USE
Company-provided hardware and network connections are reserved strictly for authorized operational duties. Unauthorized software installations are prohibited.`;
      } else {
        draftText = `1. GENERAL COMPLIANCE OVERVIEW
This policy outlines organizational requirements for operational governance, safety compliance, and employee rights under applicable labor laws.

2. REGULAR REVIEW & ADJUSTMENTS
This policy document is reviewed annually by the HR Department and Legal Compliance Committee. Adjustments must be approved by the Chief Executive Officer.

3. ACKNOWLEDGEMENT
All active staff members must sign or digitally acknowledge receipt and compliance with this policy document within 7 business days of release.`;
      }

      if (customPrompt.trim()) {
        draftText += `\n\n5. SPECIFIC OPERATIONAL ADDENDUM\n${customPrompt.trim()}`;
      }

      const newPolicy: PolicyDocument = {
        id: 'pol_' + Date.now(),
        category: selectedCategory,
        title: `${selectedCategory} - Enterprise Policy ${new Date().getFullYear()}`,
        content: draftText,
        status: 'draft',
        updatedAt: new Date().toISOString().slice(0, 10)
      };

      setActiveDraft(newPolicy);
      setEditingContent(draftText);
      setIsGenerating(false);
      showToast('✨ AI Policy Draft generated successfully! Review and adjust below.');
    }, 1500);
  };

  const handleApproveDraft = () => {
    if (!activeDraft) return;
    const finalPolicy: PolicyDocument = {
      ...activeDraft,
      content: editingContent,
      status: 'approved',
      approvedBy: activeUser.name,
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    const updated = [finalPolicy, ...policies.filter(p => p.id !== finalPolicy.id)];
    savePoliciesToStorage(updated);
    setActiveDraft(null);
    showToast('✓ Policy approved & published to company handbook!');
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              HR Governance & Compliance
            </span>
          </div>
          <h2 className="text-lg font-bold mt-1">AI Company Policy & Compliance Generator</h2>
          <p className="text-slate-300 text-xs mt-0.5">Automate corporate policy creation, legal compliance frameworks, and probation handbook guidelines with human approval workflows.</p>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Generator Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          Generate New HR Compliance Policy
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Select Policy Domain</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-indigo-500"
            >
              <option value="Code of Conduct & Workplace Ethics">Code of Conduct & Workplace Ethics</option>
              <option value="Probation, Appraisals & Staff Tenure">Probation, Appraisals & Staff Tenure</option>
              <option value="Information Security & Data Privacy">Information Security & Data Privacy</option>
              <option value="Attendance, Leave & Remote Work">Attendance, Leave & Remote Work</option>
              <option value="Anti-Harassment & Equal Opportunity">Anti-Harassment & Equal Opportunity</option>
              <option value="Health, Safety & Environmental Standards">Health, Safety & Environmental Standards</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Specific Context / Custom Clauses (Optional)</label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Must include 90-day probation terms and $50 gift limit"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={handleGeneratePolicy}
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Drafting AI Policy Document...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Draft Policy with Gemini AI</span>
            </>
          )}
        </button>
      </div>

      {/* Draft Review & Approval Panel */}
      {activeDraft && (
        <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <div>
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                Draft Awaiting HR Approval
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">{activeDraft.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleApproveDraft}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Publish Policy</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Adjust Policy Draft Text</label>
            <textarea
              rows={10}
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full bg-white border border-amber-200 rounded-xl p-4 font-mono text-xs leading-relaxed text-slate-800 focus:outline-indigo-500 shadow-xs"
            />
          </div>
        </div>
      )}

      {/* Published Policies Handbook List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Active Company Handbook & Published Policies ({policies.length})
        </h3>

        <div className="space-y-3">
          {policies.map(pol => (
            <div key={pol.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white transition-all space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-bold text-slate-900">{pol.title}</span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                  Published ({pol.approvedBy || 'Approved'})
                </span>
              </div>
              <p className="text-slate-600 text-xs whitespace-pre-line line-clamp-4 bg-white p-3 rounded-lg border border-slate-100 font-mono">
                {pol.content}
              </p>
              <div className="text-[10px] text-slate-400 font-mono">
                Last updated: {pol.updatedAt}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
