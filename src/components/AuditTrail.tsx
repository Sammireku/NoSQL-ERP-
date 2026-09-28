import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  User, 
  Clock, 
  Tag, 
  FileText, 
  RefreshCw,
  X
} from 'lucide-react';
import { AuditLogEntry, UserProfile } from '../types/erp';
import { dataStore } from '../config/firebase';

interface AuditTrailProps {
  activeUser: UserProfile;
}

export default function AuditTrail({ activeUser }: AuditTrailProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch
    setLogs(dataStore.getAuditTrail());

    // Subscribe to real-time additions
    const unsub = dataStore.subscribeToCollection('audit_trail', () => {
      setLogs(dataStore.getAuditTrail());
    });

    return () => unsub();
  }, []);

  const clearLogs = () => {
    if (confirm("Are you sure you want to clear the audit history? This action is irreversible.")) {
      dataStore.saveAuditTrail([]);
      setLogs([]);
      dataStore.logAudit(
        activeUser.uid,
        activeUser.name,
        activeUser.role,
        'DELETE',
        'Audit Log DB',
        'Cleared all history logs.'
      );
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.affectedRecord.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    const matchesRole = selectedRole === 'ALL' || log.userRole === selectedRole;

    return matchesSearch && matchesAction && matchesRole;
  });

  // Unique actions and roles for filter options
  const actionsList: Array<AuditLogEntry['action']> = [
    'CREATE', 'UPDATE', 'DELETE', 'RESTOCK', 'VOID', 'ALLOCATE', 'EXPENSE_RECORD'
  ];

  return (
    <div className="space-y-6" id="audit_trail_module">
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-xl border border-slate-200/80 shadow-sm transition-all hover:shadow-md duration-300">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm font-sans">Database Security & Audit Trail</h2>
            <p className="text-xs text-slate-500">Searchable history of system transactions, role updates, inventory restocks, and voids.</p>
          </div>
        </div>

        {(activeUser.role === 'manager' || activeUser.role === 'ceo' || activeUser.role === 'sysadmin') && (
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200 hover:border-rose-200 flex items-center gap-1.5"
          >
            Clear Log History
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Search logs by staff name, record name, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Action Type Filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Tag className="w-4 h-4 text-slate-400" />
          </span>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none"
          >
            <option value="ALL">All Actions</option>
            {actionsList.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        {/* Staff Role Filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <User className="w-4 h-4 text-slate-400" />
          </span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none"
          >
            <option value="ALL">All Roles</option>
            <option value="manager">Managers</option>
            <option value="sales">Sales Team</option>
            <option value="cashier">Cashiers</option>
          </select>
        </div>
      </div>

      {/* Main Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Authorized User</th>
                <th className="p-4">Action Type</th>
                <th className="p-4">Affected Record</th>
                <th className="p-4">Change Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => {
                  let actionColor = "bg-slate-100 text-slate-700";
                  if (log.action === 'CREATE') actionColor = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                  if (log.action === 'DELETE') actionColor = "bg-rose-50 text-rose-700 border border-rose-100";
                  if (log.action === 'UPDATE') actionColor = "bg-amber-50 text-amber-700 border border-amber-100";
                  if (log.action === 'VOID') actionColor = "bg-red-50 text-red-700 border border-red-100";
                  if (log.action === 'RESTOCK') actionColor = "bg-blue-50 text-blue-700 border border-blue-100";
                  if (log.action === 'ALLOCATE') actionColor = "bg-purple-50 text-purple-700 border border-purple-100";
                  if (log.action === 'EXPENSE_RECORD') actionColor = "bg-cyan-50 text-cyan-700 border border-cyan-100";

                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                            {log.userName[0]}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800">{log.userName}</p>
                            <span className="text-[10px] text-indigo-500 uppercase font-mono font-bold tracking-wider">{log.userRole}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${actionColor}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-800">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {log.affectedRecord}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-sans leading-relaxed max-w-sm">
                        <div className="flex flex-col gap-1">
                          <span>{log.details}</span>
                          {log.attachmentImage && (
                            <button
                              type="button"
                              onClick={() => setViewingAttachment(log.attachmentImage || null)}
                              className="self-start text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100/60 border border-indigo-100 rounded-lg px-2 py-0.5 mt-1 transition-all"
                            >
                              📎 View Receipt Audit Attachment
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ClipboardList className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-500 text-sm">No activity records match your filter parameters.</p>
                      <p className="text-[11px] text-slate-400">Wait for staff activity or update warehouse catalog items to generate logs.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footnotes */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Active Listener: <strong>Real-time subscribe</strong></span>
          <span>Logs Cache Limit: None (Local Sandbox Persistent)</span>
        </div>
      </div>

      {/* Attachment Lightbox Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                📷 Attached Audit Document Preview
              </span>
              <button
                type="button"
                onClick={() => setViewingAttachment(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-6 bg-slate-100 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-y-auto">
              <img 
                src={viewingAttachment} 
                alt="Audit Trail Receipt Document Attachment" 
                className="max-w-full h-auto object-contain rounded-xl border border-slate-250 shadow-sm bg-white" 
              />
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-150 text-[10px] text-slate-400 text-center font-mono">
              Base64 Ingestion Attachment Asset • Verified Genuine
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
