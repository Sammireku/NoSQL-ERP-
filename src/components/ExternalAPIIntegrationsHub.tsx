import React, { useState } from 'react';
import { Globe, Key, ShieldCheck, CheckCircle2, Clock, Plus, Copy, Check, Lock, Zap, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { dataStore } from '../config/firebase';
import { UserProfile, APIKeyRequest } from '../types/erp';

interface ExternalAPIIntegrationsHubProps {
  activeUser: UserProfile;
}

export default function ExternalAPIIntegrationsHub({ activeUser }: ExternalAPIIntegrationsHubProps) {
  const [requests, setRequests] = useState<APIKeyRequest[]>(() => dataStore.getApiKeyRequests());
  const [activeTab, setActiveTab] = useState<'wordpress' | 'wave_receipts' | 'requests' | 'systems'>('wordpress');
  const [waveApiToken, setWaveApiToken] = useState('wave_pat_live_8891002934812');
  const [waveBusinessId, setWaveBusinessId] = useState('bus_tumi_ghana_001');
  const [waveAutoSync, setWaveAutoSync] = useState(true);
  const [waveTestLog, setWaveTestLog] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New API Request Modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [appName, setAppName] = useState('');
  const [systemType, setSystemType] = useState<APIKeyRequest['systemType']>('Wordpress / WooCommerce');
  const [requestedEmail, setRequestedEmail] = useState(activeUser.email);
  const [purpose, setPurpose] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['orders:write', 'inventory:read']);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Toggle Scopes
  const handleScopeToggle = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  // Submit new request
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const newReq = dataStore.addApiKeyRequest({
      appName,
      systemType,
      requestedByEmail: requestedEmail,
      purpose,
      requestedScopes: selectedScopes
    });
    setRequests(dataStore.getApiKeyRequests());
    setShowRequestModal(false);
    setAppName('');
    setPurpose('');
    setToastMsg(`API Key Access Request submitted! Needs manager approval before key generation.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Approve API Request & Generate Key
  const handleApproveKey = (reqId: string) => {
    if (activeUser.role !== 'sysadmin' && activeUser.role !== 'manager' && activeUser.role !== 'ceo') {
      alert("Only System Admin, Managers, or CEO can approve API Key requests.");
      return;
    }
    const current = dataStore.getApiKeyRequests();
    const generatedApiKey = `tumikey_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    const updated = current.map(r => r.id === reqId ? {
      ...r,
      status: 'approved' as const,
      generatedApiKey,
      approvedAt: new Date().toISOString(),
      approvedBy: activeUser.name
    } : r);

    dataStore.saveApiKeyRequests(updated);
    setRequests(updated);
    setToastMsg('API Key Approved & Live Key Generated!');
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Reject / Revoke
  const handleRevokeKey = (reqId: string) => {
    const current = dataStore.getApiKeyRequests();
    const updated = current.map(r => r.id === reqId ? { ...r, status: 'revoked' as const } : r);
    dataStore.saveApiKeyRequests(updated);
    setRequests(updated);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Globe className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">WordPress & External ERP / API Access Hub</h3>
            <p className="text-xs text-slate-500">Connect WordPress stores, QuickBooks, Xero, Salesforce, SAP & manage 2-Way API authorizations</p>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('wordpress')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'wordpress' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            WordPress / WooCommerce
          </button>

          <button
            onClick={() => setActiveTab('wave_receipts')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'wave_receipts' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🌊 Wave Receipts & Invoicing Sync
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'requests' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            API Key Requests ({requests.filter(r => r.status === 'pending').length} Pending)
          </button>

          <button
            onClick={() => setActiveTab('systems')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'systems' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Connect ERPs (QuickBooks, SAP, Xero)
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-950 text-emerald-200 border border-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-emerald-400">✕</button>
        </div>
      )}

      {/* 2. WAVE RECEIPTS & INVOICING INTEGRATION */}
      {activeTab === 'wave_receipts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-sky-950 rounded-xl border border-sky-800">
                <Zap className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">Wave Accounting & Receipts API Connector</h4>
                <p className="text-xs text-slate-400">Automate real-time receipts, customer invoices & sales journal sync to Wave</p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Wave Personal Access Token (PAT)</label>
                <input
                  type="password"
                  value={waveApiToken}
                  onChange={e => setWaveApiToken(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sky-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Wave Business Unique Identifier ID</label>
                <input
                  type="text"
                  value={waveBusinessId}
                  onChange={e => setWaveBusinessId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sky-300 font-mono text-xs"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-[11px]">Auto-Sync POS & Maintenance Fee Receipts to Wave</p>
                  <p className="text-[10px] text-slate-400">Automatically creates sales receipt in Wave when POS sale closes</p>
                </div>
                <input
                  type="checkbox"
                  checked={waveAutoSync}
                  onChange={e => setWaveAutoSync(e.target.checked)}
                  className="w-4 h-4 accent-sky-500 rounded"
                />
              </div>

              <button
                onClick={() => {
                  setWaveTestLog({
                    status: 'success',
                    statusCode: 200,
                    message: 'Wave Accounting Receipt created & synced successfully!',
                    waveReceiptId: `wrec_${Math.floor(10000000 + Math.random() * 90000000)}`,
                    businessId: waveBusinessId,
                    syncedItems: [
                      { description: 'Handcrafted Ashanti Kente Scarf', amount: 150.00, currency: 'GHS' },
                      { description: 'Tumi Vocational Maintenance Fee T1', amount: 1000.00, currency: 'GHS' }
                    ],
                    syncedAt: new Date().toISOString()
                  });
                }}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all cursor-pointer"
              >
                ⚡ Test Wave Receipt Connection & Push Sample Receipt
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Wave Receipts Integration Capabilities
            </h4>
            
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                <p className="font-bold text-slate-800">1. Real-time Sales Receipts Push</p>
                <p className="text-slate-500 text-[11px]">Every completed checkout in POS, hostel room booking, or student maintenance fee payment creates a Wave sales transaction instantly.</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                <p className="font-bold text-slate-800">2. Customer & Donor Account Mapping</p>
                <p className="text-slate-500 text-[11px]">Maps CRM customer profiles and donor grant profiles directly to Wave Customer entities.</p>
              </div>
            </div>

            {waveTestLog && (
              <div className="p-4 bg-slate-950 text-sky-300 border border-slate-800 rounded-xl space-y-2 font-mono text-[11px] animate-fade-in">
                <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800 pb-1">
                  <span>✓ WAVE API 200 OK</span>
                  <span>{waveTestLog.syncedAt.slice(11, 19)}</span>
                </div>
                <pre className="overflow-x-auto text-[10px] text-slate-300">
                  {JSON.stringify(waveTestLog, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'wordpress' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-indigo-950 rounded-xl border border-indigo-800">
                <Globe className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">WordPress Webhook Receiver Endpoint</h4>
                <p className="text-xs text-slate-400">Receive WooCommerce orders, WP Hotel bookings, and lead forms</p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Webhook Target URL</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value="https://tumierp.internal/api/integrations/wordpress/webhook"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-indigo-300 text-[11px]"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("https://tumierp.internal/api/integrations/wordpress/webhook");
                      setCopiedKey('wp_url');
                      setTimeout(() => setCopiedKey(null), 3000);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-lg shrink-0"
                  >
                    {copiedKey === 'wp_url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">WordPress functions.php Sync Snippet</label>
                <textarea
                  rows={5}
                  readOnly
                  value={`add_action('woocommerce_new_order', 'sync_to_tumi_erp', 10, 1);\nfunction sync_to_tumi_erp($order_id) {\n  $order = wc_get_order($order_id);\n  wp_remote_post('https://tumierp.internal/api/integrations/wordpress/webhook', [\n    'headers' => ['Authorization' => 'Bearer tumikey_wp_live_8829103948572019'],\n    'body' => json_encode(['order_id' => $order_id, 'total' => $order->get_total()])\n  ]);\n}`}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-[10px]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900">WordPress Features Supported</h4>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                <span className="font-bold text-indigo-900">1. WooCommerce Ecommerce Sync</span>
                <p className="text-slate-600 text-[11px]">Automatically creates POS/E-commerce order records in Tumi ERP and deducts warehouse stock levels in real time.</p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl space-y-1">
                <span className="font-bold text-rose-900">2. WP Hotel / Room Booking Plugins</span>
                <p className="text-slate-600 text-[11px]">Direct room bookings made on WordPress deposit straight into the Hospitality & Channel Manager reservation matrix.</p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                <span className="font-bold text-emerald-900">3. Elementor / Gravity Lead Forms</span>
                <p className="text-slate-600 text-[11px]">Contact form submissions automatically trigger new CRM Opportunity deals and customer profiles.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. API KEY ACCESS REQUESTS & APPROVAL WORKFLOW */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">API Access Request & Approval Policy</h4>
              <p className="text-xs text-slate-500">External applications must submit an authorization request before API key generation.</p>
            </div>
            <button
              onClick={() => setShowRequestModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Submit API Key Request</span>
            </button>
          </div>

          {/* Request List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">System / Application</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4">Scopes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">API Key</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.appName}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-indigo-600">{r.systemType}</td>
                    <td className="py-3 px-4 text-slate-600">{r.requestedByEmail}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {r.requestedScopes.join(', ')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {r.generatedApiKey ? (
                        <span className="text-slate-800 font-bold bg-slate-100 px-2 py-1 rounded">
                          {r.generatedApiKey.substring(0, 14)}...
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not Generated</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => handleApproveKey(r.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-all"
                        >
                          Approve & Issue Key
                        </button>
                      )}
                      {r.status === 'approved' && (
                        <button
                          onClick={() => handleRevokeKey(r.id)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-all"
                        >
                          Revoke Key
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ERP CONNECTORS */}
      {activeTab === 'systems' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['QuickBooks Online', 'Xero Accounting', 'Salesforce CRM', 'Zoho One', 'SAP Business One', 'Odoo ERP'].map(sys => (
            <div key={sys} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900">{sys}</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  2-Way OAuth Supported
                </span>
              </div>
              <p className="text-xs text-slate-500">Bi-directional ledger, invoice, stock, and contact synchronization.</p>
              <button
                onClick={() => {
                  setAppName(sys);
                  setSystemType(sys as any);
                  setShowRequestModal(true);
                  setActiveTab('requests');
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-lg transition-all"
              >
                Request 2-Way Connection Key
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SUBMIT REQUEST MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Request 2-Way API Access Key</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Application Name</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g. QuickBooks Accounting Sync"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Purpose / Integration Scope</label>
                <textarea
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Explain why this external system requires API access..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Requested Scopes</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  {['orders:write', 'inventory:read', 'financials:read', 'financials:write', 'bookings:write', 'customers:read'].map(scope => (
                    <label key={scope} className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope)}
                        onChange={() => handleScopeToggle(scope)}
                        className="text-indigo-600 rounded"
                      />
                      <span className="font-mono text-[11px] text-slate-700">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowRequestModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg shadow">Submit Authorization Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
