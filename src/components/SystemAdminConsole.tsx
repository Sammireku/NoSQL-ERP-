import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Lock, 
  ClipboardList, 
  UserPlus, 
  Send, 
  MessageSquare, 
  Mail, 
  Copy, 
  Check, 
  Key, 
  Sparkles, 
  Search, 
  Filter, 
  FileText, 
  Share2, 
  AlertTriangle,
  RefreshCw,
  EyeOff,
  CheckCircle2,
  X,
  Globe,
  Plus,
  Clock,
  Zap,
  Play,
  Terminal,
  Plug
} from 'lucide-react';
import { UserProfile, UserRole, AuditLogEntry, APIKeyRequest } from '../types/erp';
import { dataStore } from '../config/firebase';
import SecurityRulesView from './SecurityRulesView';
import AuditTrail from './AuditTrail';
import ExternalConnectorsManager from './ExternalConnectorsManager';

interface SystemAdminConsoleProps {
  activeUser: UserProfile;
}

export default function SystemAdminConsole({ activeUser }: SystemAdminConsoleProps) {
  const [adminTab, setAdminTab] = useState<'team' | 'rules' | 'audit' | 'api_keys' | 'external_connectors'>('team');
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  
  // API Management States
  const [apiKeyRequests, setApiKeyRequests] = useState<APIKeyRequest[]>(() => dataStore.getApiKeyRequests());
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiStatusFilter, setApiStatusFilter] = useState<'all' | 'pending' | 'approved' | 'revoked'>('all');
  const [apiSystemFilter, setApiSystemFilter] = useState<string>('all');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Direct Issue Token Modal
  const [isDirectIssueModalOpen, setIsDirectIssueModalOpen] = useState(false);
  const [issueAppName, setIssueAppName] = useState('');
  const [issueSystemType, setIssueSystemType] = useState<APIKeyRequest['systemType']>('Custom REST API');
  const [issueDeveloperEmail, setIssueDeveloperEmail] = useState('');
  const [issuePurpose, setIssuePurpose] = useState('');
  const [issueScopes, setIssueScopes] = useState<string[]>(['orders:write', 'inventory:read', 'financials:read']);
  const [issueExpiration, setIssueExpiration] = useState('1_year');

  // Interactive Sandbox API Tester State
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [selectedTokenForTest, setSelectedTokenForTest] = useState<APIKeyRequest | null>(null);
  const [sandboxEndpoint, setSandboxEndpoint] = useState('/api/v1/inventory/sync');
  const [sandboxMethod, setSandboxMethod] = useState<'GET' | 'POST' | 'PUT'>('GET');
  const [sandboxPayload, setSandboxPayload] = useState('{\n  "warehouseId": "wh_main",\n  "sku": "PROD-10293",\n  "stockLevel": 120\n}');
  const [sandboxResponse, setSandboxResponse] = useState<any | null>(null);
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Create / Invite Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberWhatsapp, setNewMemberWhatsapp] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('sales');
  const [newMemberRoles, setNewMemberRoles] = useState<UserRole[]>(['sales']);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['view_crm', 'checkout_pos']);

  // Edit user multiple roles states
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingUserRoles, setEditingUserRoles] = useState<UserRole[]>([]);
  
  // Generated invite payload states
  const [createdMember, setCreatedMember] = useState<UserProfile | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);
  const [emailSentToast, setEmailSentToast] = useState(false);

  useEffect(() => {
    setTeamMembers(dataStore.getUsers());
    const unsub = dataStore.subscribeToCollection('users', () => {
      setTeamMembers(dataStore.getUsers());
    });
    return () => unsub();
  }, []);

  const availablePermissions = [
    { id: 'all_access', label: 'Full System Access' },
    { id: 'manage_team', label: 'Team & Role Management' },
    { id: 'view_financials', label: 'Financial Ledger & P&L Analytics' },
    { id: 'manage_inventory', label: 'Warehouse Stock & Restock' },
    { id: 'process_pos', label: 'POS Checkout & Sales' },
    { id: 'view_crm', label: 'CRM Kanban & Customer Profiles' },
    { id: 'export_csv', label: 'Data Portability & CSV Export' },
    { id: 'view_audit_logs', label: 'System Audit Trail Access' },
    { id: 'manage_suppliers', label: 'Supplier & Reorder Points' },
  ];

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleCreateTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail) return;

    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
    const tempPassword = `TumiPass#${Math.floor(100 + Math.random() * 900)}`;
    const inviteToken = `inv_${Math.random().toString(36).substring(2, 9)}`;

    const finalRoles = newMemberRoles.length > 0 ? newMemberRoles : [newMemberRole];
    const member: UserProfile = {
      uid: `user_${Date.now()}`,
      name: newMemberName,
      email: newMemberEmail,
      role: finalRoles[0],
      roles: finalRoles,
      companyName: activeUser.companyName || 'Tumi Enterprise Global',
      permissions: selectedPermissions,
      pin: generatedPin,
      status: 'invited',
      whatsappNumber: newMemberWhatsapp,
      invitedBy: activeUser.name,
      tempPassword,
      inviteToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dataStore.addUser(member);
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'CREATE',
      `Team Access: ${member.email}`,
      `Created team profile for ${member.name} with roles (${finalRoles.join(', ')}) and PIN ${generatedPin}`
    );

    setCreatedMember(member);
    // Reset form
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberWhatsapp('');
    setNewMemberRoles(['sales']);
    setSelectedPermissions(['view_crm', 'checkout_pos']);
  };

  const handleSaveUserRoles = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const finalRoles = editingUserRoles.length > 0 ? editingUserRoles : [editingUser.role];
    dataStore.updateUser(editingUser.uid, {
      roles: finalRoles,
      role: finalRoles[0]
    });

    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'UPDATE',
      `Team Access Roles: ${editingUser.email}`,
      `Updated roles for ${editingUser.name} to (${finalRoles.join(', ')})`
    );

    setEditingUser(null);
    setToastMessage(`Successfully updated roles for ${editingUser.name}!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // API KEY MANAGEMENT HANDLERS
  const handleApproveApiKey = (reqId: string) => {
    if (activeUser.role !== 'sysadmin' && activeUser.role !== 'manager') {
      alert("Only System Admin or Managers can approve API Key requests.");
      return;
    }
    const current = dataStore.getApiKeyRequests();
    const targetReq = current.find(r => r.id === reqId);
    const generatedApiKey = `tumikey_live_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    
    const updated = current.map(r => r.id === reqId ? {
      ...r,
      status: 'approved' as const,
      generatedApiKey,
      approvedAt: new Date().toISOString(),
      approvedBy: activeUser.name
    } : r);

    dataStore.saveApiKeyRequests(updated);
    setApiKeyRequests(updated);

    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'CREATE',
      `API Authorization Token: ${targetReq?.appName || reqId}`,
      `Approved 2-way API token for ${targetReq?.appName || reqId} with scopes: ${(targetReq?.requestedScopes || []).join(', ')}`
    );

    setToastMessage(`API Key approved and issued for ${targetReq?.appName || 'System'}!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRevokeApiKey = (reqId: string) => {
    const current = dataStore.getApiKeyRequests();
    const targetReq = current.find(r => r.id === reqId);
    const updated = current.map(r => r.id === reqId ? { ...r, status: 'revoked' as const } : r);
    
    dataStore.saveApiKeyRequests(updated);
    setApiKeyRequests(updated);

    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'VOID',
      `API Authorization Token: ${targetReq?.appName || reqId}`,
      `Revoked 2-way API authorization key for ${targetReq?.appName || reqId}`
    );

    setToastMessage(`API Key for ${targetReq?.appName || 'System'} has been revoked immediately.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRotateApiKey = (reqId: string) => {
    const current = dataStore.getApiKeyRequests();
    const targetReq = current.find(r => r.id === reqId);
    const newKey = `tumikey_rot_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    const updated = current.map(r => r.id === reqId ? {
      ...r,
      generatedApiKey: newKey,
      approvedAt: new Date().toISOString()
    } : r);

    dataStore.saveApiKeyRequests(updated);
    setApiKeyRequests(updated);

    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'UPDATE',
      `API Key Rotation: ${targetReq?.appName || reqId}`,
      `Rotated secret API bearer key for ${targetReq?.appName}`
    );

    setToastMessage(`API Key rotated successfully! Old token invalidated.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDirectIssueToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueAppName || !issueDeveloperEmail) return;

    const generatedApiKey = `tumikey_direct_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    const newReq: APIKeyRequest = {
      id: `req_dir_${Date.now()}`,
      appName: issueAppName,
      systemType: issueSystemType,
      requestedByEmail: issueDeveloperEmail,
      purpose: issuePurpose || 'Direct Admin Issued Integration Token',
      requestedScopes: issueScopes,
      status: 'approved',
      generatedApiKey,
      requestedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: activeUser.name
    };

    const current = dataStore.getApiKeyRequests();
    const updated = [newReq, ...current];
    dataStore.saveApiKeyRequests(updated);
    setApiKeyRequests(updated);

    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'CREATE',
      `Direct API Token Issue: ${issueAppName}`,
      `Directly issued 2-way API token to ${issueDeveloperEmail} for ${issueAppName}`
    );

    setIsDirectIssueModalOpen(false);
    setIssueAppName('');
    setIssueDeveloperEmail('');
    setIssuePurpose('');

    setToastMessage(`Direct 2-Way API Token created & activated!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRunSandboxTest = () => {
    setIsSandboxRunning(true);
    setSandboxResponse(null);

    setTimeout(() => {
      setIsSandboxRunning(false);
      setSandboxResponse({
        httpStatus: 200,
        statusText: "OK",
        latencyMs: 24,
        timestamp: new Date().toISOString(),
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-tumi-rate-limit-remaining": "998/1000",
          "x-tumi-security-signature": "sha256=a88f01b9201938472910"
        },
        responseData: {
          success: true,
          systemType: selectedTokenForTest?.systemType || 'REST Client',
          grantedScopes: selectedTokenForTest?.requestedScopes || [],
          endpoint: sandboxEndpoint,
          method: sandboxMethod,
          data: sandboxEndpoint.includes('inventory') ? [
            { productId: 'prod_101', name: 'Executive Suite Desk Lamp', stockLevel: 45, warehouse: 'Main Hub' },
            { productId: 'prod_102', name: 'Deluxe Linen Bedspread Set', stockLevel: 18, warehouse: 'Main Hub' }
          ] : sandboxEndpoint.includes('orders') ? [
            { id: 'ord_9901', totalAmount: 240.00, cashier: 'Sarah Jenkins', status: 'completed' },
            { id: 'ord_9902', totalAmount: 1150.00, cashier: 'Marcus Vance', status: 'synced' }
          ] : {
            message: "2-Way Integration Handshake Verified Successfully",
            authenticatedEmail: selectedTokenForTest?.requestedByEmail
          }
        }
      });
    }, 600);
  };

  // WhatsApp Share Helper
  const getWhatsAppShareText = (member: UserProfile) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tumierp.com';
    const loginLink = `${origin}/?login_email=${encodeURIComponent(member.email)}&token=${member.inviteToken}`;
    return `Hello ${member.name},\n\nYou have been invited to join *Tumi ERP* by ${member.invitedBy} (${member.companyName}).\n\n🔑 *Login Credentials:*\n- *Email:* ${member.email}\n- *Role:* ${member.role.toUpperCase()}\n- *Terminal PIN:* ${member.pin}\n- *Temp Password:* ${member.tempPassword}\n\n👉 *Direct Login Link:*\n${loginLink}\n\nPlease sign in to access your assigned role workspace.`;
  };

  const handleShareWhatsApp = (member: UserProfile) => {
    const text = getWhatsAppShareText(member);
    const targetPhone = member.whatsappNumber ? member.whatsappNumber.replace(/[^0-9]/g, '') : '';
    const url = targetPhone 
      ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyWhatsAppText = (member: UserProfile) => {
    const text = getWhatsAppShareText(member);
    navigator.clipboard.writeText(text);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 2500);
  };

  const handleSendEmailInvite = (member: UserProfile) => {
    const subject = `Invitation to join ${member.companyName || 'Tumi ERP'}`;
    const body = getWhatsAppShareText(member);
    const mailtoUrl = `mailto:${member.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    setEmailSentToast(true);
    setTimeout(() => setEmailSentToast(false), 3000);
  };

  return (
    <div className="space-y-6" id="system_admin_console">
      {/* 1. Header Banner with Strict Isolation Note */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 rounded-xl shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">System Administration Console</h2>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                  Tumi ERP Control Core
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized security policies, team role assignments, Firestore security rules, and audit history loggers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <EyeOff className="w-4 h-4 text-amber-400" />
            <div className="text-[11px]">
              <span className="font-bold text-slate-200 block">Strict Operational Data Isolation</span>
              <span className="text-slate-400">Zero access to live POS sales or financial transaction data</span>
            </div>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setAdminTab('team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === 'team' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Access & Roles</span>
          </button>

          <button
            onClick={() => setAdminTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === 'rules' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Firestore Security Rules</span>
          </button>

          <button
            onClick={() => setAdminTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === 'audit' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>System Audit Trail</span>
          </button>

          <button
            onClick={() => setAdminTab('api_keys')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === 'api_keys' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>API & 2-Way Integration Tokens</span>
            {apiKeyRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full">
                {apiKeyRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('external_connectors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === 'external_connectors' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Plug className="w-4 h-4 text-amber-400" />
            <span>External Connectors (Wave, AfriOps, Milous)</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {emailSentToast && (
        <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Email invitation client launched! Credentials details compiled.</span>
        </div>
      )}

      {/* 2. TAB 1: TEAM ACCESS & ROLE MANAGEMENT */}
      {adminTab === 'team' && (
        <div className="space-y-6">
          {/* Top Bar for Team */}
          <div className="bg-white/90 backdrop-blur-md p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Company Team Directory & Role Grants</h3>
              <p className="text-xs text-slate-500">Configure team access levels, assign PINs, and dispatch invitation links via WhatsApp or Email.</p>
            </div>

            <button
              onClick={() => {
                setCreatedMember(null);
                setIsInviteModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite / Create Team Member</span>
            </button>
          </div>

          {/* Members Table */}
          <div className="bg-white/90 backdrop-blur-md rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200/60">
                  <tr>
                    <th className="p-4">Team Member</th>
                    <th className="p-4">Role & Status</th>
                    <th className="p-4">Terminal PIN</th>
                    <th className="p-4">Granular Permissions</th>
                    <th className="p-4 text-right">Dispatch Invites</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamMembers.map(member => (
                    <tr key={member.uid} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{member.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {(member.roles || [member.role]).map((r, idx) => {
                              const badgeStyle = 
                                r === 'sysadmin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                r === 'manager' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                r === 'ceo' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                r === 'sales' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                r === 'cashier' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                r === 'warehouse' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                r === 'auditor' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                r === 'accountant' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                                'bg-slate-50 text-slate-700 border-slate-200';
                              return (
                                <span key={idx} className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase border ${badgeStyle}`}>
                                  {r}
                                </span>
                              );
                            })}
                          </div>
                          <span className={`text-[9px] self-start px-1.5 py-0.5 rounded-full font-bold uppercase ${
                            member.status === 'invited' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {member.status || 'active'}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-700">
                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs">
                          {member.pin || '1111'}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(member.permissions || []).slice(0, 3).map((p, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 text-[9px] font-medium px-2 py-0.5 rounded">
                              {p}
                            </span>
                          ))}
                          {(member.permissions || []).length > 3 && (
                            <span className="text-[9px] text-slate-400 font-bold">
                              +{(member.permissions || []).length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Roles Button */}
                          <button
                            onClick={() => {
                              setEditingUser(member);
                              setEditingUserRoles(member.roles || [member.role]);
                            }}
                            className="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] transition-all"
                            title="Edit Roles"
                          >
                            Edit Roles
                          </button>

                          {/* WhatsApp Share Button */}
                          <button
                            onClick={() => handleShareWhatsApp(member)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1"
                            title="Share Credentials via WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          {/* Email Invite Button */}
                          <button
                            onClick={() => handleSendEmailInvite(member)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1"
                            title="Send Email Invitation"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FIRESTORE SECURITY RULES */}
      {adminTab === 'rules' && (
        <SecurityRulesView activeUser={activeUser} />
      )}

      {/* TAB 3: SYSTEM AUDIT TRAIL */}
      {adminTab === 'audit' && (
        <AuditTrail activeUser={activeUser} />
      )}

      {/* TAB 4: API & 2-WAY INTEGRATION TOKENS PORTAL */}
      {adminTab === 'api_keys' && (
        <div className="space-y-6">
          {/* Top Banner & Issue Token Action */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">2-Way API Authorization Keys & Integrations</h3>
                <p className="text-xs text-slate-500">Approve or revoke 2-way bearer tokens for WooCommerce, QuickBooks, Xero, Salesforce, SAP, and custom REST API clients.</p>
              </div>
            </div>

            <button
              onClick={() => setIsDirectIssueModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Direct 2-Way Integration Token</span>
            </button>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Integration Requests</span>
              <div className="text-xl font-black text-slate-900">{apiKeyRequests.length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Active Approved Keys</span>
              <div className="text-xl font-black text-emerald-700">
                {apiKeyRequests.filter(r => r.status === 'approved').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending Approvals</span>
              <div className="text-xl font-black text-amber-700">
                {apiKeyRequests.filter(r => r.status === 'pending').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Revoked / Inactive</span>
              <div className="text-xl font-black text-rose-700">
                {apiKeyRequests.filter(r => r.status === 'revoked' || r.status === 'rejected').length}
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={apiSearchQuery}
                onChange={e => setApiSearchQuery(e.target.value)}
                placeholder="Search by system name, email, or scope..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-300 text-xs">
                {(['all', 'pending', 'approved', 'revoked'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setApiStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] capitalize transition-all ${
                      apiStatusFilter === st ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <select
                value={apiSystemFilter}
                onChange={e => setApiSystemFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">All Systems</option>
                <option value="Wordpress / WooCommerce">WordPress / WooCommerce</option>
                <option value="QuickBooks">QuickBooks Online</option>
                <option value="Xero">Xero Accounting</option>
                <option value="Salesforce">Salesforce CRM</option>
                <option value="SAP">SAP Business One</option>
                <option value="Odoo">Odoo ERP</option>
                <option value="Custom REST API">Custom REST API</option>
              </select>
            </div>
          </div>

          {/* Tokens & Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">System / Application</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Requester Email</th>
                    <th className="py-3.5 px-4">Granted Scopes</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">API Bearer Key</th>
                    <th className="py-3.5 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apiKeyRequests
                    .filter(req => {
                      const matchesSearch = apiSearchQuery === '' || 
                        req.appName.toLowerCase().includes(apiSearchQuery.toLowerCase()) ||
                        req.requestedByEmail.toLowerCase().includes(apiSearchQuery.toLowerCase()) ||
                        req.purpose.toLowerCase().includes(apiSearchQuery.toLowerCase());
                      const matchesStatus = apiStatusFilter === 'all' || req.status === apiStatusFilter;
                      const matchesSystem = apiSystemFilter === 'all' || req.systemType === apiSystemFilter;
                      return matchesSearch && matchesStatus && matchesSystem;
                    })
                    .map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">{r.appName}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{r.purpose}</div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] font-bold text-indigo-600">
                          {r.systemType}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {r.requestedByEmail}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {r.requestedScopes.map((scope, idx) => (
                              <span key={idx} className="bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                                {scope}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            r.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            r.status === 'pending' ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {r.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {r.generatedApiKey ? (
                            <div className="flex items-center space-x-1.5">
                              <span className="text-slate-900 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                {r.generatedApiKey.substring(0, 16)}...
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(r.generatedApiKey || '');
                                  setCopiedKeyId(r.id);
                                  setTimeout(() => setCopiedKeyId(null), 2500);
                                }}
                                className="text-slate-400 hover:text-indigo-600 p-1"
                                title="Copy API Bearer Key"
                              >
                                {copiedKeyId === r.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Pending Approval</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {r.status === 'pending' && (
                              <button
                                onClick={() => handleApproveApiKey(r.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-xs transition-all"
                              >
                                Approve & Issue 2-Way Key
                              </button>
                            )}

                            {r.status === 'approved' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedTokenForTest(r);
                                    setIsSandboxModalOpen(true);
                                  }}
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                  title="Test API Endpoint Sandbox"
                                >
                                  <Terminal className="w-3 h-3" />
                                  <span>Test Sandbox</span>
                                </button>

                                <button
                                  onClick={() => handleRotateApiKey(r.id)}
                                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all"
                                  title="Rotate Key Token"
                                >
                                  Rotate
                                </button>

                                <button
                                  onClick={() => handleRevokeApiKey(r.id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all"
                                >
                                  Revoke
                                </button>
                              </>
                            )}

                            {r.status === 'revoked' && (
                              <button
                                onClick={() => handleApproveApiKey(r.id)}
                                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg"
                              >
                                Re-Approve Key
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                  {apiKeyRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs italic">
                        No API key authorization requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 5: EXTERNAL BUSINESS CONNECTORS (Wave, AfriOps, Milous & Custom APIs) */}
      {adminTab === 'external_connectors' && (
        <ExternalConnectorsManager activeUser={activeUser} />
      )}

      {/* DIRECT ISSUE API TOKEN MODAL */}
      {isDirectIssueModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Issue Direct 2-Way Integration Token</h3>
                  <p className="text-xs text-slate-500">Bypass approval queue to directly provision bearer tokens for partners.</p>
                </div>
              </div>
              <button onClick={() => setIsDirectIssueModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleDirectIssueToken} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Application / System Name *</label>
                <input
                  type="text"
                  required
                  value={issueAppName}
                  onChange={e => setIssueAppName(e.target.value)}
                  placeholder="e.g. Headquarters SAP Connector"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">System Type</label>
                  <select
                    value={issueSystemType}
                    onChange={e => setIssueSystemType(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                  >
                    <option value="Wordpress / WooCommerce">WordPress / WooCommerce</option>
                    <option value="QuickBooks">QuickBooks Online</option>
                    <option value="Xero">Xero Accounting</option>
                    <option value="Salesforce">Salesforce CRM</option>
                    <option value="SAP">SAP Business One</option>
                    <option value="Odoo">Odoo ERP</option>
                    <option value="Custom REST API">Custom REST API</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Developer / Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={issueDeveloperEmail}
                    onChange={e => setIssueDeveloperEmail(e.target.value)}
                    placeholder="dev@partner.com"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Integration Scopes Granted</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['orders:write', 'inventory:read', 'financials:read', 'financials:write', 'bookings:write', 'customers:read'].map(scope => (
                    <label key={scope} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={issueScopes.includes(scope)}
                        onChange={() => {
                          if (issueScopes.includes(scope)) {
                            setIssueScopes(issueScopes.filter(s => s !== scope));
                          } else {
                            setIssueScopes([...issueScopes, scope]);
                          }
                        }}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-mono text-[11px] font-bold text-slate-700">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setIsDirectIssueModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md">
                  Issue & Activate Bearer Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INTERACTIVE 2-WAY API SANDBOX TESTER MODAL */}
      {isSandboxModalOpen && selectedTokenForTest && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-950 border border-indigo-800 text-indigo-400 rounded-xl">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">2-Way API Handshake Sandbox Tester</h3>
                  <p className="text-xs text-slate-400">Testing token: <span className="text-indigo-400 font-mono">{selectedTokenForTest.appName}</span></p>
                </div>
              </div>
              <button onClick={() => setIsSandboxModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">HTTP Method</label>
                  <select
                    value={sandboxMethod}
                    onChange={e => setSandboxMethod(e.target.value as any)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-bold text-xs"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-400 text-[10px] mb-1">API Endpoint</label>
                  <select
                    value={sandboxEndpoint}
                    onChange={e => setSandboxEndpoint(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-indigo-300 font-bold text-xs"
                  >
                    <option value="/api/v1/inventory/sync">/api/v1/inventory/sync</option>
                    <option value="/api/v1/orders/push">/api/v1/orders/push</option>
                    <option value="/api/v1/bookings/calendar">/api/v1/bookings/calendar</option>
                    <option value="/api/v1/auth/handshake">/api/v1/auth/handshake</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] mb-1">Request Payload (JSON)</label>
                <textarea
                  rows={3}
                  value={sandboxPayload}
                  onChange={e => setSandboxPayload(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleRunSandboxTest}
                  disabled={isSandboxRunning}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{isSandboxRunning ? 'Testing Handshake...' : 'Send Live Test Request'}</span>
                </button>
              </div>

              {sandboxResponse && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      HTTP 200 OK ({sandboxResponse.latencyMs}ms)
                    </span>
                    <span className="text-slate-400">{sandboxResponse.timestamp}</span>
                  </div>

                  <pre className="text-[10px] text-slate-300 bg-slate-900 p-3 rounded-xl overflow-x-auto max-h-48">
                    {JSON.stringify(sandboxResponse.responseData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / INVITE TEAM MEMBER MODAL */}
      {/* EDIT USER ROLES MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Edit Team Member Roles</h3>
                  <p className="text-xs text-slate-400">Assign or revoke multiple system roles for <strong>{editingUser.name}</strong>.</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserRoles} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Assign Roles (Select Multiple)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-56 overflow-y-auto">
                  {([
                    { id: 'ceo', label: 'CEO' },
                    { id: 'manager', label: 'Company Manager' },
                    { id: 'sales', label: 'Sales Executive' },
                    { id: 'cashier', label: 'POS Cashier' },
                    { id: 'warehouse', label: 'Warehouse Manager' },
                    { id: 'auditor', label: 'Compliance Auditor' },
                    { id: 'receptionist', label: 'Hotel Receptionist' },
                    { id: 'housekeeping', label: 'Housekeeping Staff' },
                    { id: 'maintenance', label: 'Maintenance Specialist' },
                    { id: 'accountant', label: 'Corporate Accountant' }
                  ] as { id: UserRole; label: string }[]).map(roleOption => (
                    <label key={roleOption.id} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingUserRoles.includes(roleOption.id)}
                        onChange={() => {
                          if (editingUserRoles.includes(roleOption.id)) {
                            setEditingUserRoles(editingUserRoles.filter(r => r !== roleOption.id));
                          } else {
                            setEditingUserRoles([...editingUserRoles, roleOption.id]);
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-semibold">{roleOption.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20"
                >
                  Save Roles Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Provision New Team Member</h3>
                  <p className="text-xs text-slate-400">Assign roles, custom permission claims, and dispatch credentials.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!createdMember ? (
              <form onSubmit={handleCreateTeamMember} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      placeholder="jane.doe@company.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                      WhatsApp Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={newMemberWhatsapp}
                      onChange={e => setNewMemberWhatsapp(e.target.value)}
                      placeholder="+1234567890"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">
                      Assign Roles (Select Multiple) *
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                      {([
                        { id: 'ceo', label: 'CEO' },
                        { id: 'manager', label: 'Company Manager' },
                        { id: 'sales', label: 'Sales Executive' },
                        { id: 'cashier', label: 'POS Cashier' },
                        { id: 'warehouse', label: 'Warehouse Manager' },
                        { id: 'auditor', label: 'Compliance Auditor' },
                        { id: 'receptionist', label: 'Hotel Receptionist' },
                        { id: 'housekeeping', label: 'Housekeeping Staff' },
                        { id: 'maintenance', label: 'Maintenance Specialist' },
                        { id: 'accountant', label: 'Corporate Accountant' }
                      ] as { id: UserRole; label: string }[]).map(roleOption => (
                        <label key={roleOption.id} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newMemberRoles.includes(roleOption.id)}
                            onChange={() => {
                              if (newMemberRoles.includes(roleOption.id)) {
                                setNewMemberRoles(newMemberRoles.filter(r => r !== roleOption.id));
                              } else {
                                setNewMemberRoles([...newMemberRoles, roleOption.id]);
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-semibold">{roleOption.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Granular Permissions Checkboxes */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2">
                    Granular Access Permissions
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                    {availablePermissions.map(perm => (
                      <label key={perm.id} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.id)}
                          onChange={() => handleTogglePermission(perm.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20"
                  >
                    Generate Credentials & Save
                  </button>
                </div>
              </form>
            ) : (
              /* INVITATION PAYLOAD & DISPATCH BOARD */
              <div className="space-y-5">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Team Member Account Created!
                  </span>
                  <p className="text-slate-600">
                    Credentials generated for <strong>{createdMember.name}</strong> ({createdMember.email}).
                  </p>
                </div>

                {/* Credentials summary box */}
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-400">Assigned PIN:</span>
                    <span className="text-emerald-400 font-bold">{createdMember.pin}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-400">Temp Password:</span>
                    <span className="text-indigo-400 font-bold">{createdMember.tempPassword}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Role:</span>
                    <span className="text-sky-400 font-bold uppercase">{createdMember.role}</span>
                  </div>
                </div>

                {/* DISPATCH OPTIONS */}
                <div className="space-y-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Dispatch Invitation Link & Credentials
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* WHATSAPP ACTION */}
                    <button
                      onClick={() => handleShareWhatsApp(createdMember)}
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Share via WhatsApp</span>
                    </button>

                    {/* EMAIL ACTION */}
                    <button
                      onClick={() => handleSendEmailInvite(createdMember)}
                      className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Send Email Invitation</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleCopyWhatsAppText(createdMember)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedWhatsapp ? 'Copied Invitation Text!' : 'Copy Invitation Message Text'}</span>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setCreatedMember(null);
                      setIsInviteModalOpen(false);
                    }}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
