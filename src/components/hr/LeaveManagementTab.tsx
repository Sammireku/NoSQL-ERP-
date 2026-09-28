import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Search, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  FileText, 
  AlertCircle,
  X
} from 'lucide-react';
import { LeaveRequestRecord, UserProfile } from '../../types/erp';
import { exportToCSV } from '../../utils/exportUtils';

interface LeaveManagementTabProps {
  leaveRequests: LeaveRequestRecord[];
  users: UserProfile[];
  activeUser: UserProfile;
  onAddLeaveRequest: (req: Omit<LeaveRequestRecord, 'id' | 'status' | 'requestedAt'>) => void;
  onUpdateStatus: (id: string, status: 'approved' | 'rejected', notes?: string) => void;
}

export default function LeaveManagementTab({
  leaveRequests,
  users,
  activeUser,
  onAddLeaveRequest,
  onUpdateStatus
}: LeaveManagementTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Form states
  const [selectedUserId, setSelectedUserId] = useState(activeUser.uid);
  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'personal' | 'maternity_paternity' | 'unpaid'>('annual');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  const [daysCount, setDaysCount] = useState('3');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredRequests = leaveRequests.filter(req => {
    const matchesSearch = req.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.leaveType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = leaveRequests.filter(l => l.status === 'pending').length;
  const approvedCount = leaveRequests.filter(l => l.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(l => l.status === 'rejected').length;

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = users.find(u => u.uid === selectedUserId) || activeUser;
    const days = parseInt(daysCount, 10);
    if (!reason.trim() || isNaN(days) || days <= 0) {
      setFormError('Please provide a valid leave reason and number of days.');
      return;
    }

    onAddLeaveRequest({
      userId: emp.uid,
      userName: emp.name,
      role: emp.role,
      employeeId: emp.uid,
      employeeName: emp.name,
      leaveType,
      startDate,
      endDate,
      daysCount: days,
      reason: reason.trim()
    });

    setIsApplyModalOpen(false);
    setReason('');
    setFormError(null);
  };

  const handleConfirmReview = (status: 'approved' | 'rejected') => {
    if (!reviewingId) return;
    onUpdateStatus(reviewingId, status, reviewNotes.trim() || undefined);
    setReviewingId(null);
    setReviewNotes('');
  };

  const handleExport = () => {
    const data = filteredRequests.map(l => ({
      'Request ID': l.id,
      'Employee': l.employeeName,
      'Leave Type': l.leaveType.toUpperCase(),
      'Start Date': l.startDate,
      'End Date': l.endDate,
      'Days Count': l.daysCount,
      'Status': l.status.toUpperCase(),
      'Reason': l.reason,
      'Reviewed By': l.reviewedBy || '',
      'Reviewer Notes': l.reviewerNotes || ''
    }));
    exportToCSV(data, `Leave_Requests_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Leave & Absence Management System
          </h2>
          <p className="text-xs text-slate-500">Track paid time off (PTO), sick leave, medical leaves and manage manager approval workflows</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Leave Request</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Approvals</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Requires review by manager or CEO</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved Leaves</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{approvedCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Authorized time off</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rejected / Withdrawn</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-700 mt-1">{rejectedCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Declined requests</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-medium text-slate-400 mr-1">Status:</span>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee or leave reason..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-indigo-500"
          />
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4 text-center">Days</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Reviewed By</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map(req => {
                const isPending = req.status === 'pending';
                const canReview = activeUser.role === 'manager' || activeUser.role === 'ceo' || activeUser.role === 'sysadmin';

                return (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {req.employeeName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {req.leaveType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {req.startDate} → {req.endDate}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {req.daysCount}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                      {req.reason}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        req.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {req.reviewedBy ? (
                        <div>
                          <div className="font-medium text-slate-800">{req.reviewedBy}</div>
                          {req.reviewerNotes && <div className="text-[10px] text-slate-400">{req.reviewerNotes}</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isPending && canReview && (
                        <button
                          onClick={() => setReviewingId(req.id)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold"
                        >
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No leave requests found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-3">Review Leave Request</h3>
            <p className="text-xs text-slate-500 mb-4">Add optional reviewer notes and approve or decline this PTO request.</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Reviewer Feedback Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Approved. Department staffing covered by Alex."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewingId(null)}
                  className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmReview('rejected')}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmReview('approved')}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Leave Request Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Submit Employee Leave Request
              </h3>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Employee *</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Leave Category</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="annual">Annual Vacation Leave</option>
                    <option value="sick">Medical / Sick Leave</option>
                    <option value="personal">Personal Urgent Leave</option>
                    <option value="maternity_paternity">Maternity / Paternity Leave</option>
                    <option value="unpaid">Unpaid Leave of Absence</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Number of Days</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={daysCount}
                    onChange={(e) => setDaysCount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Reason / Notes *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify purpose of leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-all"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
