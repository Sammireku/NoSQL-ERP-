import React, { useState } from 'react';
import { 
  AlertCircle, 
  Search, 
  Plus, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  User, 
  GraduationCap, 
  Briefcase, 
  X, 
  Send, 
  Filter, 
  ChevronRight,
  Check,
  FileText
} from 'lucide-react';
import { UserProfile } from '../../types/erp';

export interface ComplaintTicket {
  id: string;
  ticketId: string; // e.g. TKT-2026-8801
  complainantType: 'staff' | 'student';
  complainantName: string;
  departmentOrClass: string;
  category: 'Workplace Conduct' | 'Roster & Shift Discrepancy' | 'Payroll & Allowance' | 'Vocational Training & Academic' | 'Equipment & Facilities' | 'General Safety & Harassment';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  description: string;
  status: 'submitted' | 'under_review' | 'investigating' | 'resolved' | 'closed';
  submittedAt: string;
  aiAnalysis?: {
    summary: string;
    riskAssessment: string;
    recommendedActions: string[];
    draftResponse: string;
  };
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

const DEFAULT_TICKETS: ComplaintTicket[] = [
  {
    id: 'tkt_101',
    ticketId: 'TKT-2026-8801',
    complainantType: 'staff',
    complainantName: 'Sister Ama Darko',
    departmentOrClass: 'Housekeeping & Guest Care',
    category: 'Roster & Shift Discrepancy',
    priority: 'Medium',
    description: 'I noticed my double shift allocation on Saturday includes both morning housekeeping and afternoon front desk without the required 1-hour rest interval.',
    status: 'investigating',
    submittedAt: '2026-09-21 09:30 AM',
    aiAnalysis: {
      summary: 'Shift overlap query regarding half-shift split roles between Housekeeping and Front Desk on Saturday.',
      riskAssessment: 'Moderate risk - Roster schedule friction impacting staff rest and performance.',
      recommendedActions: [
        'Review Roster Calendar for Saturday and introduce a 1-hour rest slot between 12:00 PM and 1:00 PM.',
        'Assign a backup floor trainee during the 1-hour interval.',
        'Send formal updated shift notification to Sister Ama.'
      ],
      draftResponse: 'Dear Sister Ama,\n\nThank you for bringing this shift alignment concern to our attention. We have reviewed Saturday\'s roster and updated your half-shift schedule to include a 1-hour break between Housekeeping and Front Desk duties.\n\nWarm regards,\nHR Management'
    }
  },
  {
    id: 'tkt_102',
    ticketId: 'TKT-2026-8802',
    complainantType: 'student',
    complainantName: 'Abena Osei',
    departmentOrClass: 'Tailoring Batch 2026-B',
    category: 'Vocational Training & Academic',
    priority: 'Low',
    description: 'Requesting extra machine time on industrial overlock machines after 4:00 PM to finish practical project garments.',
    status: 'submitted',
    submittedAt: '2026-09-22 02:15 PM'
  }
];

export default function ComplaintsQueryDeskTab({ activeUser }: { activeUser: UserProfile }) {
  const [tickets, setTickets] = useState<ComplaintTicket[]>(() => {
    const saved = localStorage.getItem('tumi_complaints_desk_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return DEFAULT_TICKETS;
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [complainantFilter, setComplainantFilter] = useState<'all' | 'staff' | 'student'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string>(DEFAULT_TICKETS[0].id);

  // New Complaint Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newComplainantType, setNewComplainantType] = useState<'staff' | 'student'>('staff');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('Hospitality Front Desk');
  const [newCategory, setNewCategory] = useState<ComplaintTicket['category']>('Workplace Conduct');
  const [newPriority, setNewPriority] = useState<ComplaintTicket['priority']>('Medium');
  const [newDescription, setNewDescription] = useState('');

  // Resolution & AI States
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [resolutionNoteInput, setResolutionNoteInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || tickets[0];

  const saveToStorage = (updated: ComplaintTicket[]) => {
    setTickets(updated);
    localStorage.setItem('tumi_complaints_desk_v1', JSON.stringify(updated));
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Submit New Complaint
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDescription.trim()) return;

    const ticketNum = `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: ComplaintTicket = {
      id: 'tkt_' + Date.now(),
      ticketId: ticketNum,
      complainantType: newComplainantType,
      complainantName: newName.trim(),
      departmentOrClass: newDept,
      category: newCategory,
      priority: newPriority,
      description: newDescription.trim(),
      status: 'submitted',
      submittedAt: new Date().toLocaleString()
    };

    const updated = [newTicket, ...tickets];
    saveToStorage(updated);
    setSelectedTicketId(newTicket.id);
    setIsNewModalOpen(false);
    // Reset form
    setNewName('');
    setNewDescription('');
    showToast(`Complaint ticket ${ticketNum} lodged successfully!`);
  };

  // Trigger AI Resolution Assistant
  const handleRunAiResolution = async () => {
    if (!selectedTicket) return;
    setIsAnalyzingAi(true);

    try {
      const res = await fetch('/api/hr/ai-complaint-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.ticketId,
          complainantName: selectedTicket.complainantName,
          complainantType: selectedTicket.complainantType,
          category: selectedTicket.category,
          description: selectedTicket.description,
          priority: selectedTicket.priority
        })
      });

      const data = await res.json();
      if (data.success && data.resolution) {
        const updated = tickets.map(t => {
          if (t.id !== selectedTicket.id) return t;
          return {
            ...t,
            status: t.status === 'submitted' ? ('under_review' as const) : t.status,
            aiAnalysis: data.resolution
          };
        });
        saveToStorage(updated);
        showToast('AI Resolution analysis and draft response generated!');
      }
    } catch (err) {
      console.error("AI Resolution Error:", err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Mark Ticket Status
  const handleUpdateStatus = (status: ComplaintTicket['status']) => {
    if (!selectedTicket) return;
    const updated = tickets.map(t => {
      if (t.id !== selectedTicket.id) return t;
      return {
        ...t,
        status,
        resolutionNotes: resolutionNoteInput || t.resolutionNotes,
        resolvedBy: status === 'resolved' || status === 'closed' ? `${activeUser.name} (${activeUser.role.toUpperCase()})` : t.resolvedBy,
        resolvedAt: status === 'resolved' || status === 'closed' ? new Date().toLocaleString() : t.resolvedAt
      };
    });
    saveToStorage(updated);
    showToast(`Ticket ${selectedTicket.ticketId} updated to status: ${status.replace('_', ' ').toUpperCase()}`);
  };

  // Filtered Tickets
  const filteredTickets = tickets.filter(t => {
    const matchesComplainant = complainantFilter === 'all' || t.complainantType === complainantFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      t.ticketId.toLowerCase().includes(query) ||
      t.complainantName.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query);

    return matchesComplainant && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Staff & Vocational Student Complaints Desk
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase">
                Grievance & Query Ombudsman
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Dedicated grievance resolution system for employees, teachers, and vocational trainees with AI mediation support.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Lodge Complaint / Query</span>
        </button>
      </div>

      {toastMsg && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Complainant Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setComplainantFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                complainantFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              All Grievances
            </button>
            <button
              onClick={() => setComplainantFilter('staff')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                complainantFilter === 'staff' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Staff Only</span>
            </button>
            <button
              onClick={() => setComplainantFilter('student')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                complainantFilter === 'student' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Students Only</span>
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search ticket #, name, category..."
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* MAIN TWO-COLUMN VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: TICKET LIST */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span>Complaint Tickets ({filteredTickets.length})</span>
            </h3>

            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredTickets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No complaint tickets found matching filter criteria.
                </div>
              ) : (
                filteredTickets.map(ticket => {
                  const isActive = ticket.id === selectedTicketId;
                  const isStaff = ticket.complainantType === 'staff';

                  return (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                          {isStaff ? (
                            <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>{ticket.ticketId}</span>
                        </span>
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                          ticket.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                          ticket.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {ticket.priority}
                        </span>
                      </div>

                      <span className="font-bold text-slate-900 block text-xs truncate">{ticket.complainantName}</span>
                      <p className="text-[11px] text-slate-500 line-clamp-1 my-1">{ticket.description}</p>

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/50 mt-2">
                        <span className="text-slate-500">{ticket.category}</span>
                        <span className={`font-bold capitalize px-1.5 py-0.2 rounded text-[10px] ${
                          ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                          ticket.status === 'investigating' ? 'bg-amber-100 text-amber-800' :
                          'bg-sky-100 text-sky-800'
                        }`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED TICKET & AI RESOLUTION DESK */}
        <div className="lg:col-span-7 space-y-4">
          {selectedTicket ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-full space-y-4 p-6">
              {/* Ticket Top Header */}
              <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                      {selectedTicket.ticketId}
                    </span>
                    <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-xl ${
                      selectedTicket.complainantType === 'staff' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {selectedTicket.complainantType === 'staff' ? 'Staff Member' : 'Vocational Student'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-2">{selectedTicket.complainantName}</h2>
                  <p className="text-xs text-slate-500">{selectedTicket.departmentOrClass} &bull; Logged: {selectedTicket.submittedAt}</p>
                </div>

                {/* AI Resolution Trigger Button */}
                <button
                  onClick={handleRunAiResolution}
                  disabled={isAnalyzingAi}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <Sparkles className={`w-4 h-4 ${isAnalyzingAi ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzingAi ? 'Analyzing Grievance...' : 'AI Resolution Assist'}</span>
                </button>
              </div>

              {/* Grievance Narrative Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Grievance / Query Statement</span>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {/* AI ANALYSIS & MEDIATION PACKAGE */}
              {selectedTicket.aiAnalysis && (
                <div className="p-5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-indigo-200/60 pb-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-indigo-950 text-xs uppercase tracking-wider">AI HR Ombudsman & Investigation Package</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
                      <span className="font-bold text-indigo-900 block">Executive Summary</span>
                      <p className="text-slate-700 leading-relaxed text-[11px]">{selectedTicket.aiAnalysis.summary}</p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
                      <span className="font-bold text-indigo-900 block">Risk Assessment</span>
                      <p className="text-slate-700 leading-relaxed text-[11px]">{selectedTicket.aiAnalysis.riskAssessment}</p>
                    </div>
                  </div>

                  {/* Recommended Action Steps */}
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-2 text-xs">
                    <span className="font-bold text-indigo-900 block">Recommended Investigation & Action Steps:</span>
                    <ul className="space-y-1 text-slate-700 text-[11px]">
                      {selectedTicket.aiAnalysis.recommendedActions.map((act, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Draft Response Letter */}
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-2 text-xs">
                    <span className="font-bold text-indigo-900 block">Draft Formal Response to Complainant:</span>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] whitespace-pre-wrap font-sans">
                      {selectedTicket.aiAnalysis.draftResponse}
                    </div>
                  </div>
                </div>
              )}

              {/* RESOLUTION ACTIONS & STATUS UPDATE */}
              <div className="border-t border-slate-200 pt-4 space-y-3 text-xs">
                <span className="font-bold text-slate-900 block">HR / Ombudsman Resolution Ledger</span>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Official Resolution Notes / Outcome</label>
                  <textarea
                    rows={2}
                    value={resolutionNoteInput}
                    onChange={e => setResolutionNoteInput(e.target.value)}
                    placeholder="Enter resolution notes, mediation outcome, or action taken..."
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-slate-500 font-semibold">Update Status:</span>
                  <button
                    onClick={() => handleUpdateStatus('under_review')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 text-xs"
                  >
                    Under Review
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('investigating')}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl border border-amber-200 text-xs"
                  >
                    Investigating
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('resolved')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs text-xs"
                  >
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('closed')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-xs text-xs"
                  >
                    Close Ticket
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-700">No Ticket Selected</p>
            </div>
          )}
        </div>
      </div>

      {/* NEW COMPLAINT MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Lodge Staff or Student Grievance</h3>
                  <p className="text-xs text-slate-500">Submit a formal inquiry or confidential report.</p>
                </div>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-4 text-xs">
              {/* Complainant Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Complainant Category</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewComplainantType('staff')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 ${
                      newComplainantType === 'staff' ? 'bg-indigo-50 border-indigo-600 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Staff Member</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewComplainantType('student')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 ${
                      newComplainantType === 'student' ? 'bg-emerald-50 border-emerald-600 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Vocational Student</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Complainant Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Sister Ama Darko"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grievance Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="Workplace Conduct">Workplace Conduct</option>
                    <option value="Roster & Shift Discrepancy">Roster & Shift Discrepancy</option>
                    <option value="Payroll & Allowance">Payroll & Allowance</option>
                    <option value="Vocational Training & Academic">Vocational Training & Academic</option>
                    <option value="Equipment & Facilities">Equipment & Facilities</option>
                    <option value="General Safety & Harassment">General Safety & Harassment</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Urgent">Urgent / Immediate Action</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Incident Narrative</label>
                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Describe the query, concern, incident date, or assistance requested..."
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Lodge Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
