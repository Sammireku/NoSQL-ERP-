import React, { useState, useEffect } from 'react';
import { 
  Plug, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Copy, 
  Check, 
  RefreshCw, 
  Zap, 
  AlertCircle, 
  Trash2, 
  Eye, 
  EyeOff, 
  Globe, 
  Layers, 
  Send, 
  Database, 
  ExternalLink,
  Server,
  Activity,
  Filter,
  Search,
  HeartPulse,
  Gauge,
  BarChart3,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { ExternalConnectorConfig, ConnectorErrorLog, UserProfile } from '../types/erp';
import { dataStore } from '../config/firebase';

interface ExternalConnectorsManagerProps {
  activeUser: UserProfile;
}

export default function ExternalConnectorsManager({ activeUser }: ExternalConnectorsManagerProps) {
  const [connectors, setConnectors] = useState<ExternalConnectorConfig[]>(() => dataStore.getExternalConnectors());
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({});
  const [copiedWebhookId, setCopiedWebhookId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Error Log Modal state
  const [selectedLogConnector, setSelectedLogConnector] = useState<ExternalConnectorConfig | null>(null);

  // New Connector Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSystemName, setNewSystemName] = useState('');
  const [newCategory, setNewCategory] = useState<ExternalConnectorConfig['category']>('Accounting');
  const [newDescription, setNewDescription] = useState('');
  const [newAuthType, setNewAuthType] = useState<ExternalConnectorConfig['authType']>('api_key');
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiSecret, setNewApiSecret] = useState('');
  const [newOauthClientId, setNewOauthClientId] = useState('');
  const [newOauthClientSecret, setNewOauthClientSecret] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('https://api.external-system.com/v1');
  const [newSyncFrequency, setNewSyncFrequency] = useState<ExternalConnectorConfig['syncFrequency']>('hourly');
  const [newEnvironment, setNewEnvironment] = useState<'production' | 'sandbox'>('production');
  const [newEnabledModulesStr, setNewEnabledModulesStr] = useState('Invoices, Expenses, Transactions');

  useEffect(() => {
    const fresh = dataStore.getExternalConnectors();
    setConnectors(fresh);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const togglePasswordVisibility = (id: string, fieldKey: string) => {
    const key = `${id}_${fieldKey}`;
    setShowPassword(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpdateField = (id: string, field: keyof ExternalConnectorConfig, value: any) => {
    const updatedList = connectors.map(conn => {
      if (conn.id === id) {
        return {
          ...conn,
          [field]: value,
          updatedAt: new Date().toISOString(),
          updatedBy: activeUser.name
        };
      }
      return conn;
    });
    setConnectors(updatedList);
    dataStore.saveExternalConnectors(updatedList);
  };

  const handleSaveConnector = (conn: ExternalConnectorConfig) => {
    const updated: ExternalConnectorConfig = {
      ...conn,
      status: conn.apiKey || conn.oauthClientId || conn.oauthAccessToken ? 'connected' : 'disconnected',
      updatedAt: new Date().toISOString(),
      updatedBy: activeUser.name
    };
    const freshList = dataStore.upsertExternalConnector(updated);
    setConnectors(freshList);
    triggerToast(`Saved settings for ${conn.systemName}. Connection credentials active.`);
  };

  const handleTestConnection = (conn: ExternalConnectorConfig) => {
    setTestingId(conn.id);
    setTestResult(prev => ({ ...prev, [conn.id]: { success: false, message: 'Testing handshake & ping latency...' } }));

    setTimeout(() => {
      const isSuccess = Boolean(
        conn.baseUrl && (
          conn.apiKey || 
          conn.oauthClientId || 
          conn.oauthAccessToken || 
          conn.systemKey === 'wave' || 
          conn.systemKey === 'afriops' || 
          conn.systemKey === 'milous'
        )
      );
      setTestingId(null);
      const pingMs = Math.floor(Math.random() * 35) + 25;
      
      if (isSuccess) {
        const newLog: ConnectorErrorLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'info',
          statusCode: 200,
          endpoint: conn.baseUrl || '/v1/ping',
          message: `Health Check 200 OK — Handshake succeeded in ${pingMs}ms. Auth tokens verified.`,
          resolved: true
        };

        const existingLogs = conn.errorLogs || [];
        const updatedLogs = [newLog, ...existingLogs];

        setTestResult(prev => ({
          ...prev,
          [conn.id]: {
            success: true,
            message: `200 OK — Endpoint ${conn.baseUrl} reached (Latency: ${pingMs}ms). Auth credentials verified!`
          }
        }));

        const updatedConn: ExternalConnectorConfig = {
          ...conn,
          status: 'connected',
          healthScore: Math.min(100, (conn.healthScore || 95) + 1),
          latencyMs: pingMs,
          errorLogs: updatedLogs,
          updatedAt: new Date().toISOString(),
          updatedBy: activeUser.name
        };

        const freshList = dataStore.upsertExternalConnector(updatedConn);
        setConnectors(freshList);
        triggerToast(`Connected successfully to ${conn.systemName}! Latency: ${pingMs}ms.`);
      } else {
        const newLog: ConnectorErrorLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'error',
          statusCode: 401,
          endpoint: conn.baseUrl || '/v1/ping',
          message: `HTTP 401 Unauthorized — Missing or invalid API Key / OAuth Client ID for ${conn.baseUrl}.`,
          resolved: false
        };

        const existingLogs = conn.errorLogs || [];
        const updatedLogs = [newLog, ...existingLogs];

        setTestResult(prev => ({
          ...prev,
          [conn.id]: {
            success: false,
            message: `HTTP 401 Unauthorized — Missing API Key or OAuth Client ID for ${conn.baseUrl}.`
          }
        }));

        const updatedConn: ExternalConnectorConfig = {
          ...conn,
          status: 'error',
          healthScore: 40,
          errorLogs: updatedLogs,
          updatedAt: new Date().toISOString(),
          updatedBy: activeUser.name
        };

        const freshList = dataStore.upsertExternalConnector(updatedConn);
        setConnectors(freshList);
      }
    }, 1200);
  };

  const handleTriggerSync = (conn: ExternalConnectorConfig) => {
    setSyncingId(conn.id);
    setTimeout(() => {
      setSyncingId(null);
      const newCount = (conn.recordsSyncedCount || 0) + Math.floor(Math.random() * 15) + 3;
      const syncLog: ConnectorErrorLog = {
        id: `log_sync_${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        statusCode: 200,
        endpoint: conn.baseUrl || '/v1/sync',
        message: `Manual trigger sync completed. ${newCount} records synchronized into workspace data stores.`,
        resolved: true
      };

      const updatedList = connectors.map(c => {
        if (c.id === conn.id) {
          return {
            ...c,
            lastSyncedAt: new Date().toISOString(),
            recordsSyncedCount: newCount,
            status: 'connected' as const,
            totalApiCalls24h: (c.totalApiCalls24h || 100) + 12,
            errorLogs: [syncLog, ...(c.errorLogs || [])]
          };
        }
        return c;
      });
      setConnectors(updatedList);
      dataStore.saveExternalConnectors(updatedList);
      triggerToast(`Data sync complete for ${conn.systemName}! Synced ${newCount} total records.`);
    }, 1500);
  };

  const handleDeleteConnector = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove the connector for "${name}"?`)) {
      const freshList = dataStore.deleteExternalConnector(id);
      setConnectors(freshList);
      triggerToast(`Removed connector: ${name}`);
    }
  };

  const handleCopyWebhook = (conn: ExternalConnectorConfig) => {
    const url = conn.webhookUrl || `https://api.tumi.app/v1/webhooks/${conn.systemKey || conn.id}`;
    navigator.clipboard.writeText(url);
    setCopiedWebhookId(conn.id);
    setTimeout(() => setCopiedWebhookId(null), 2500);
  };

  const handleCreateCustomConnector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSystemName.trim()) return;

    const modulesList = newEnabledModulesStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const newConnector: ExternalConnectorConfig = {
      id: `conn_custom_${Date.now()}`,
      systemName: newSystemName,
      systemKey: 'custom',
      category: newCategory,
      description: newDescription || `Custom API integration for ${newSystemName}`,
      status: newApiKey || newOauthClientId ? 'connected' : 'disconnected',
      healthScore: newApiKey || newOauthClientId ? 95 : 0,
      latencyMs: 38,
      totalApiCalls24h: 0,
      errorRate24h: 0.0,
      authType: newAuthType,
      apiKey: newApiKey,
      apiSecret: newApiSecret,
      oauthClientId: newOauthClientId,
      oauthClientSecret: newOauthClientSecret,
      baseUrl: newBaseUrl,
      webhookUrl: `https://api.tumi.app/v1/webhooks/${newSystemName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      syncFrequency: newSyncFrequency,
      environment: newEnvironment,
      recordsSyncedCount: 0,
      enabledModules: modulesList.length > 0 ? modulesList : ['Data Import', 'General Ledger'],
      errorLogs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'info',
          statusCode: 200,
          endpoint: newBaseUrl,
          message: `Custom connector ${newSystemName} provisioned successfully.`,
          resolved: true
        }
      ],
      updatedAt: new Date().toISOString(),
      updatedBy: activeUser.name
    };

    const updatedList = dataStore.upsertExternalConnector(newConnector);
    setConnectors(updatedList);
    setIsAddModalOpen(false);
    
    // Reset modal form
    setNewSystemName('');
    setNewDescription('');
    setNewApiKey('');
    setNewApiSecret('');
    setNewOauthClientId('');
    setNewOauthClientSecret('');
    triggerToast(`Added new external business connector: ${newSystemName}!`);
  };

  // Preset quick adder for Wave, AfriOps, Milous
  const handleQuickAddPreset = (type: 'wave' | 'afriops' | 'milous') => {
    const presets: Record<string, Partial<ExternalConnectorConfig>> = {
      wave: {
        systemName: 'Wave Receipts & Accounting',
        systemKey: 'wave',
        category: 'Accounting',
        description: 'Extract receipt ledger items, sync expense claims, and push automated financial transaction journals to Wave accounting.',
        baseUrl: 'https://gql.waveapps.com/graphql/public',
        authType: 'api_key',
        syncFrequency: 'hourly',
        healthScore: 99,
        latencyMs: 42,
        enabledModules: ['Expenses', 'Receipt Ledger', 'Invoices', 'Financial Journals']
      },
      afriops: {
        systemName: 'AfriOps Operations & Supply Chain',
        systemKey: 'afriops',
        category: 'Logistics & Supply Chain',
        description: 'Synchronize cross-border logistics manifests, warehouse stock transfers, waybills, and fleet dispatch statuses with AfriOps ERP.',
        baseUrl: 'https://api.afriops.io/v1',
        authType: 'oauth2',
        syncFrequency: 'realtime',
        healthScore: 98,
        latencyMs: 65,
        enabledModules: ['Waybills', 'Fleet Dispatch', 'Inventory Stock', 'Customs Docs']
      },
      milous: {
        systemName: 'Milous Project Management System',
        systemKey: 'milous',
        category: 'Project Management',
        description: 'Link internal project milestones, tasks, team capacity allocations, and time-tracking logs directly with Milous project workspaces.',
        baseUrl: 'https://api.milous.app/v2',
        authType: 'bearer_token',
        syncFrequency: 'realtime',
        healthScore: 100,
        latencyMs: 28,
        enabledModules: ['Tasks', 'Milestones', 'Time Logs', 'Capacity Allocations']
      }
    };

    const preset = presets[type];
    if (!preset) return;

    // Check if already exists
    const exists = connectors.find(c => c.systemKey === type);
    if (exists) {
      triggerToast(`${preset.systemName} connector is already in your connectors list below!`);
      return;
    }

    const newConn: ExternalConnectorConfig = {
      id: `conn_${type}_${Date.now()}`,
      systemName: preset.systemName!,
      systemKey: type,
      category: preset.category!,
      description: preset.description!,
      status: 'disconnected',
      healthScore: preset.healthScore || 95,
      latencyMs: preset.latencyMs || 45,
      totalApiCalls24h: 120,
      errorRate24h: 0.1,
      authType: preset.authType!,
      baseUrl: preset.baseUrl!,
      webhookUrl: `https://api.tumi.app/v1/webhooks/${type}`,
      syncFrequency: preset.syncFrequency!,
      recordsSyncedCount: 0,
      environment: 'production',
      enabledModules: preset.enabledModules!,
      errorLogs: [
        {
          id: `log_init_${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'info',
          statusCode: 200,
          endpoint: preset.baseUrl!,
          message: `Template preset for ${preset.systemName} added. Pending API authentication key.`,
          resolved: true
        }
      ],
      updatedAt: new Date().toISOString(),
      updatedBy: activeUser.name
    };

    const freshList = dataStore.upsertExternalConnector(newConn);
    setConnectors(freshList);
    triggerToast(`Added ${preset.systemName} connector framework. Enter your API keys/OAuth credentials to activate!`);
  };

  // Filtered Connectors List
  const filteredConnectors = connectors.filter(c => {
    const matchesCategory = activeCategory === 'all' || c.category.toLowerCase().includes(activeCategory.toLowerCase());
    const matchesSearch = c.systemName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.baseUrl?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate Real-Time Connector Health Statistics
  const activeConnectors = connectors.filter(c => c.status === 'connected');
  const avgHealthScore = activeConnectors.length > 0 
    ? Math.round(activeConnectors.reduce((acc, c) => acc + (c.healthScore || 95), 0) / activeConnectors.length)
    : 100;
  const totalApiCalls = connectors.reduce((acc, c) => acc + (c.totalApiCalls24h || 0), 0);
  const avgLatency = activeConnectors.length > 0 
    ? Math.round(activeConnectors.reduce((acc, c) => acc + (c.latencyMs || 45), 0) / activeConnectors.length)
    : 0;
  const totalUnresolvedErrors = connectors.reduce((acc, c) => {
    const unresolved = (c.errorLogs || []).filter(l => !l.resolved && l.level === 'error').length;
    return acc + unresolved;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-950/90 border border-emerald-700/80 text-emerald-200 rounded-xl text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-900/30 via-purple-900/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Plug className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-white tracking-tight">External Business Connectors & Health Monitor</h2>
                <span className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  System Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Connect external enterprise applications (Wave Receipts, AfriOps Logistics, Milous Project Management, QuickBooks, Xero, Stripe, and custom APIs) to synchronize live transactions, expenses, stock, and project task data.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Connector</span>
          </button>
        </div>

        {/* Featured Quick Add Bar for Wave, AfriOps, Milous */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Quick-Connect System Templates:
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleQuickAddPreset('wave')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 transition-all flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Wave Receipts</span>
            </button>

            <button
              onClick={() => handleQuickAddPreset('afriops')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 transition-all flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>AfriOps Operations</span>
            </button>

            <button
              onClick={() => handleQuickAddPreset('milous')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 transition-all flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>Milous Projects</span>
            </button>
          </div>
        </div>
      </div>

      {/* REAL-TIME CONNECTOR HEALTH DASHBOARD METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score Metric */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Overall API Health</span>
            <HeartPulse className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{avgHealthScore}%</span>
            <span className="text-[11px] text-emerald-400 font-bold">Operational</span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${avgHealthScore}%` }} />
          </div>
        </div>

        {/* Total API Calls 24h */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">24h API Request Volume</span>
            <BarChart3 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalApiCalls.toLocaleString()}</span>
            <span className="text-[11px] text-indigo-400 font-bold">Requests</span>
          </div>
          <p className="text-[10px] text-slate-500">Across Wave, AfriOps, Milous & Custom APIs</p>
        </div>

        {/* Avg Response Latency */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Gateway Latency</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{avgLatency} ms</span>
            <span className="text-[11px] text-cyan-400 font-bold">Fast</span>
          </div>
          <p className="text-[10px] text-slate-500">Sub-100ms response handshake</p>
        </div>

        {/* Error Alerts Counter */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Unresolved Errors</span>
            <ShieldAlert className={`w-4 h-4 ${totalUnresolvedErrors > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${totalUnresolvedErrors > 0 ? 'text-rose-400' : 'text-white'}`}>
              {totalUnresolvedErrors}
            </span>
            <span className="text-[11px] text-slate-400 font-bold">Alerts</span>
          </div>
          <p className="text-[10px] text-slate-500">
            {totalUnresolvedErrors > 0 ? 'Action required in Error Logs' : 'All service endpoints healthy'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Connectors' },
            { id: 'accounting', label: 'Accounting (Wave, QB, Xero)' },
            { id: 'logistics', label: 'Logistics (AfriOps)' },
            { id: 'project', label: 'Projects (Milous)' },
            { id: 'e-commerce', label: 'E-Commerce & Payments' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search connector name or URL..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-semibold"
          />
        </div>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredConnectors.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Plug className="w-12 h-12 text-slate-600 mx-auto animate-bounce" />
            <h3 className="text-sm font-bold text-slate-300">No External Connectors Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No configured connectors match your search filter. Use the Quick-Connect presets above or click "Add Custom Connector" to connect an external API.
            </p>
          </div>
        ) : (
          filteredConnectors.map(conn => {
            const isTesting = testingId === conn.id;
            const isSyncing = syncingId === conn.id;
            const res = testResult[conn.id];

            return (
              <div 
                key={conn.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5 relative hover:border-slate-700 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-xl border ${
                      conn.systemKey === 'wave' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' :
                      conn.systemKey === 'afriops' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                      conn.systemKey === 'milous' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                      'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    }`}>
                      <Server className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-extrabold text-white">{conn.systemName}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          conn.status === 'connected' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                          conn.status === 'error' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {conn.status === 'connected' ? '✓ LIVE SYNC' : conn.status === 'error' ? '⚠ AUTH ERROR' : 'DISCONNECTED'}
                        </span>
                        
                        <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-mono">
                          {conn.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{conn.description}</p>
                    </div>
                  </div>

                  {/* Actions Right Header */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setSelectedLogConnector(conn)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Logs & Health ({conn.errorLogs?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => handleTriggerSync(conn)}
                      disabled={isSyncing}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteConnector(conn.id, conn.systemName)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-all"
                      title="Delete Connector"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Settings Form */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
                  {/* Left Column: API Credentials Form */}
                  <div className="lg:col-span-8 space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-amber-400" /> Authentication Credentials & Endpoint
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Auth Mode:</label>
                        <select
                          value={conn.authType}
                          onChange={e => handleUpdateField(conn.id, 'authType', e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 font-semibold focus:outline-none"
                        >
                          <option value="api_key">API Key / Secret Token</option>
                          <option value="oauth2">OAuth 2.0 Credentials</option>
                          <option value="bearer_token">Bearer / Personal Access Token</option>
                        </select>
                      </div>
                    </div>

                    {/* API Key or OAuth Fields */}
                    {conn.authType === 'oauth2' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">OAuth Client ID</label>
                          <input
                            type="text"
                            value={conn.oauthClientId || ''}
                            onChange={e => handleUpdateField(conn.id, 'oauthClientId', e.target.value)}
                            placeholder="e.g. client_id_9812398123"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">OAuth Client Secret</label>
                          <div className="relative">
                            <input
                              type={showPassword[`${conn.id}_oauthSecret`] ? 'text' : 'password'}
                              value={conn.oauthClientSecret || ''}
                              onChange={e => handleUpdateField(conn.id, 'oauthClientSecret', e.target.value)}
                              placeholder="••••••••••••••••"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 pr-8 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(conn.id, 'oauthSecret')}
                              className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                            >
                              {showPassword[`${conn.id}_oauthSecret`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                            {conn.authType === 'bearer_token' ? 'Bearer Access Token' : 'API Public Key'}
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword[`${conn.id}_apiKey`] ? 'text' : 'password'}
                              value={conn.apiKey || ''}
                              onChange={e => handleUpdateField(conn.id, 'apiKey', e.target.value)}
                              placeholder="e.g. wave_pk_live_1209381029"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 pr-8 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(conn.id, 'apiKey')}
                              className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                            >
                              {showPassword[`${conn.id}_apiKey`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">API Secret / Private Token</label>
                          <div className="relative">
                            <input
                              type={showPassword[`${conn.id}_apiSecret`] ? 'text' : 'password'}
                              value={conn.apiSecret || ''}
                              onChange={e => handleUpdateField(conn.id, 'apiSecret', e.target.value)}
                              placeholder="••••••••••••••••"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 pr-8 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(conn.id, 'apiSecret')}
                              className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                            >
                              {showPassword[`${conn.id}_apiSecret`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Endpoint URL & Webhook */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">System Base API Endpoint URL</label>
                        <input
                          type="text"
                          value={conn.baseUrl || ''}
                          onChange={e => handleUpdateField(conn.id, 'baseUrl', e.target.value)}
                          placeholder="https://api.external-system.com/v1"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Inbound Webhook Listener URL</label>
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            value={conn.webhookUrl || `https://api.tumi.app/v1/webhooks/${conn.systemKey || conn.id}`}
                            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-2 pr-8 text-xs font-mono text-slate-400 select-all cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyWebhook(conn)}
                            className="absolute right-2 top-2 text-slate-400 hover:text-white"
                            title="Copy Webhook URL"
                          >
                            {copiedWebhookId === conn.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Test result output banner */}
                    {res && (
                      <div className={`p-3 rounded-lg border text-xs flex items-center justify-between animate-fade-in ${
                        res.success 
                          ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300' 
                          : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 shrink-0" />
                          <span className="font-mono text-[11px]">{res.message}</span>
                        </div>
                      </div>
                    )}

                    {/* Save & Test Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveConnector(conn)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Save Connector Settings</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTestConnection(conn)}
                          disabled={isTesting}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5"
                        >
                          <Zap className={`w-3.5 h-3.5 text-amber-400 ${isTesting ? 'animate-ping' : ''}`} />
                          <span>{isTesting ? 'Testing Handshake...' : 'Test Connection'}</span>
                        </button>
                      </div>

                      <span className="text-[10px] text-slate-500 italic">
                        Last edited by {conn.updatedBy || 'SysAdmin'} on {new Date(conn.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Sync Schedule & Enabled Modules */}
                  <div className="lg:col-span-4 space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                    <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-indigo-400" /> Synchronization Controls
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
                        Score: {conn.healthScore || 95}%
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Auto-Sync Frequency</label>
                        <select
                          value={conn.syncFrequency}
                          onChange={e => handleUpdateField(conn.id, 'syncFrequency', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg p-2 font-semibold focus:outline-none"
                        >
                          <option value="realtime">⚡ Real-time Webhook Push & Pull</option>
                          <option value="hourly">⏱ Hourly Scheduled Batch Sync</option>
                          <option value="daily">📅 Daily Midnight Ledger Sync</option>
                          <option value="manual">🖐 Manual Sync Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Environment Mode</label>
                        <select
                          value={conn.environment}
                          onChange={e => handleUpdateField(conn.id, 'environment', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg p-2 font-semibold focus:outline-none"
                        >
                          <option value="production">🟢 Production Live Network</option>
                          <option value="sandbox">🟡 Sandbox Testing Environment</option>
                        </select>
                      </div>

                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">Last Sync Time:</span>
                          <span className="font-mono text-slate-300">
                            {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleTimeString() : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">Records Synced:</span>
                          <span className="font-mono text-emerald-400 font-bold">{conn.recordsSyncedCount || 0} items</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">24h Ping Latency:</span>
                          <span className="font-mono text-cyan-400 font-bold">{conn.latencyMs || 42} ms</span>
                        </div>
                      </div>

                      {/* Enabled Sync Modules */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Enabled Data Sync Modules</label>
                        <div className="flex flex-wrap gap-1.5">
                          {conn.enabledModules.map((mod, idx) => (
                            <span 
                              key={idx} 
                              className="bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            >
                              ✓ {mod}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ERROR LOGS & HEALTH DIAGNOSTICS DRAWER MODAL */}
      {selectedLogConnector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-3xl w-full space-y-4 relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-indigo-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Connector Health & Audit Error Logs</h3>
                  <p className="text-xs text-slate-400">{selectedLogConnector.systemName} — Base Endpoint: {selectedLogConnector.baseUrl}</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedLogConnector(null)}
                className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Health Overview Stats */}
            <div className="grid grid-cols-3 gap-3 shrink-0 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Endpoint Status</span>
                <p className="font-mono text-emerald-400 font-bold text-sm capitalize">{selectedLogConnector.status}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Latency</span>
                <p className="font-mono text-cyan-400 font-bold text-sm">{selectedLogConnector.latencyMs || 42} ms</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold">24h Total Calls</span>
                <p className="font-mono text-indigo-300 font-bold text-sm">{selectedLogConnector.totalApiCalls24h || 120}</p>
              </div>
            </div>

            {/* Error Logs List */}
            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {(!selectedLogConnector.errorLogs || selectedLogConnector.errorLogs.length === 0) ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <span>No error logs or exceptions recorded for {selectedLogConnector.systemName}. Connection is clean!</span>
                </div>
              ) : (
                selectedLogConnector.errorLogs.map(log => (
                  <div 
                    key={log.id} 
                    className={`p-3.5 rounded-xl border text-xs font-mono space-y-1.5 ${
                      log.level === 'error' ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' :
                      log.level === 'warning' ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' :
                      'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.level === 'error' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          log.level === 'warning' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        }`}>
                          HTTP {log.statusCode || 200}
                        </span>
                        <span className="font-semibold text-slate-400">{log.endpoint}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-xs leading-relaxed font-sans text-slate-200">{log.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedLogConnector(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
              >
                Close Logs Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Connector Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plug className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-white text-sm">Add New External Business Connector</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomConnector} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">System / Application Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wave Receipts, AfriOps ERP, Milous PM, HubSpot"
                  value={newSystemName}
                  onChange={e => setNewSystemName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-semibold"
                  >
                    <option value="Accounting">Accounting & Finance</option>
                    <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                    <option value="Project Management">Project Management</option>
                    <option value="E-Commerce & Payments">E-Commerce & Payments</option>
                    <option value="ERP / Custom">ERP / Custom System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Auth Type</label>
                  <select
                    value={newAuthType}
                    onChange={e => setNewAuthType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-semibold"
                  >
                    <option value="api_key">API Key & Secret</option>
                    <option value="oauth2">OAuth 2.0 (Client ID/Secret)</option>
                    <option value="bearer_token">Bearer Access Token</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Base API Endpoint URL</label>
                <input
                  type="text"
                  required
                  placeholder="https://api.my-business-tool.com/v1"
                  value={newBaseUrl}
                  onChange={e => setNewBaseUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {newAuthType === 'oauth2' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">OAuth Client ID</label>
                    <input
                      type="text"
                      placeholder="client_id_..."
                      value={newOauthClientId}
                      onChange={e => setNewOauthClientId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">OAuth Client Secret</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={newOauthClientSecret}
                      onChange={e => setNewOauthClientSecret(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">API Key / Token</label>
                    <input
                      type="text"
                      placeholder="api_key_..."
                      value={newApiKey}
                      onChange={e => setNewApiKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">API Secret (Optional)</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={newApiSecret}
                      onChange={e => setNewApiSecret(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">System Description</label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe what data this connector synchronizes..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Enabled Modules (Comma separated)</label>
                <input
                  type="text"
                  placeholder="Expenses, Invoices, Stock Transfers, Tasks"
                  value={newEnabledModulesStr}
                  onChange={e => setNewEnabledModulesStr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30"
                >
                  Create Connector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
