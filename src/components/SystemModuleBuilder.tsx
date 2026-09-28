import React, { useState } from 'react';
import { 
  LayoutGrid, 
  GripVertical, 
  Check, 
  Plus, 
  Trash2, 
  ArrowRight, 
  SlidersHorizontal,
  Layers,
  Sparkles,
  Link as LinkIcon,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
  Briefcase,
  DollarSign,
  Truck,
  Coins,
  Building2,
  RefreshCw,
  Eye,
  Zap
} from 'lucide-react';
import { ERPModuleConfig, CustomWorkflowRule, ERPModuleId, UserProfile } from '../types/erp';
import { dataStore } from '../config/firebase';

interface SystemModuleBuilderProps {
  activeUser: UserProfile;
  modules: ERPModuleConfig[];
  onModulesChange: (newModules: ERPModuleConfig[]) => void;
  onNavigateToTab: (tabId: string) => void;
}

export default function SystemModuleBuilder({
  activeUser,
  modules,
  onModulesChange,
  onNavigateToTab
}: SystemModuleBuilderProps) {
  const [workflowRules, setWorkflowRules] = useState<CustomWorkflowRule[]>(() => dataStore.getWorkflowRules());
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // New Workflow Rule form state
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [triggerMod, setTriggerMod] = useState<ERPModuleId>('hospitality');
  const [targetMod, setTargetMod] = useState<ERPModuleId>('financials');
  const [ruleEvent, setRuleEvent] = useState('New Booking Received');
  const [ruleAction, setRuleAction] = useState('Auto-Post Revenue to Financial Ledger');

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 'LayoutGrid': return <LayoutGrid className="w-5 h-5 text-indigo-400" />;
      case 'ShoppingCart': return <ShoppingCart className="w-5 h-5 text-blue-400" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5 text-cyan-400" />;
      case 'Users': return <Users className="w-5 h-5 text-violet-400" />;
      case 'Package': return <Package className="w-5 h-5 text-amber-400" />;
      case 'Briefcase': return <Briefcase className="w-5 h-5 text-purple-400" />;
      case 'DollarSign': return <DollarSign className="w-5 h-5 text-emerald-400" />;
      case 'Truck': return <Truck className="w-5 h-5 text-orange-400" />;
      case 'Coins': return <Coins className="w-5 h-5 text-yellow-400" />;
      case 'Building2': return <Building2 className="w-5 h-5 text-rose-400" />;
      default: return <Layers className="w-5 h-5 text-indigo-400" />;
    }
  };

  const handleToggleModule = (id: ERPModuleId) => {
    const updated = modules.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m);
    onModulesChange(updated);
    dataStore.saveModulesConfig(updated);
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'UPDATE',
      `module_${id}`,
      `Toggled module ${id} status`
    );
  };

  const handleMoveModule = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const newModules = [...modules];
    const temp = newModules[index];
    newModules[index] = newModules[targetIndex];
    newModules[targetIndex] = temp;

    // Recalculate order numbers
    const reordered = newModules.map((m, idx) => ({ ...m, order: idx + 1 }));
    onModulesChange(reordered);
    dataStore.saveModulesConfig(reordered);
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: CustomWorkflowRule = {
      id: 'rule_' + Date.now(),
      triggerModuleId: triggerMod,
      event: ruleEvent,
      targetModuleId: targetMod,
      action: ruleAction,
      enabled: true
    };
    const updated = [newRule, ...workflowRules];
    setWorkflowRules(updated);
    dataStore.saveWorkflowRules(updated);
    setShowAddRuleModal(false);
  };

  const handleToggleRule = (id: string) => {
    const updated = workflowRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    setWorkflowRules(updated);
    dataStore.saveWorkflowRules(updated);
  };

  const handleDeleteRule = (id: string) => {
    const updated = workflowRules.filter(r => r.id !== id);
    setWorkflowRules(updated);
    dataStore.saveWorkflowRules(updated);
  };

  // Preset Template loader
  const applyPresetTemplate = (templateType: 'hotel' | 'retail' | 'full') => {
    let updated = [...modules];
    if (templateType === 'hotel') {
      updated = modules.map(m => ({
        ...m,
        enabled: ['sysadmin', 'builder', 'pos', 'customers', 'financials', 'hospitality', 'petty_cash'].includes(m.id)
      }));
    } else if (templateType === 'retail') {
      updated = modules.map(m => ({
        ...m,
        enabled: ['sysadmin', 'builder', 'pos', 'crm', 'customers', 'inventory', 'procurement', 'financials'].includes(m.id)
      }));
    } else {
      updated = modules.map(m => ({ ...m, enabled: true }));
    }
    onModulesChange(updated);
    dataStore.saveModulesConfig(updated);
  };

  const departments = ['ALL', 'Administration', 'Sales & Checkout', 'CRM & Marketing', 'Operations & Supply Chain', 'Human Resources', 'Finance & Accounting', 'Hospitality & Services'];

  const filteredModules = selectedDeptFilter === 'ALL' 
    ? modules 
    : modules.filter(m => m.department === selectedDeptFilter);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-indigo-900/80 border border-indigo-700/50 text-indigo-300 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Dynamic System Composer
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Modular System & Department Linker
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Pick and choose active ERP modules across departments. Drag-and-drop or re-order tabs, configure cross-department automated pipelines, and tailor the enterprise OS to your business model.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="bg-slate-950/80 border border-indigo-900/50 p-4 rounded-xl space-y-3 shrink-0">
            <p className="text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider">
              Quick System Presets
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyPresetTemplate('hotel')}
                className="bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 text-xs font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Hotel & Resort</span>
              </button>
              <button
                onClick={() => applyPresetTemplate('retail')}
                className="bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-800/80 text-xs font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
                <span>Retail & Wholesale</span>
              </button>
              <button
                onClick={() => applyPresetTemplate('full')}
                className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/80 text-xs font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>All Modules Enabled</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Department Filter Tabs */}
      <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-none border-b border-slate-200">
        {departments.map(dept => (
          <button
            key={dept}
            onClick={() => setSelectedDeptFilter(dept)}
            className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              selectedDeptFilter === dept
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {dept === 'ALL' ? 'All Departments' : dept}
          </button>
        ))}
      </div>

      {/* Main Grid Layout: Modules Configurator (Left) & Pipeline Linker (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Module Picker & Order List (8 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Department Modules Configuration ({modules.filter(m => m.enabled).length}/{modules.length} Active)
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Drag or use Up/Down controls to re-order
            </span>
          </div>

          <div className="space-y-3">
            {filteredModules.map((mod, idx) => (
              <div
                key={mod.id}
                className={`p-4 rounded-xl border transition-all ${
                  mod.enabled 
                    ? 'bg-white border-slate-200 shadow-sm hover:border-indigo-300' 
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    {/* Move Controls */}
                    <div className="flex flex-col items-center justify-center space-y-1 pt-1 shrink-0 text-slate-400">
                      <button
                        onClick={() => handleMoveModule(idx, 'up')}
                        disabled={idx === 0}
                        className="hover:text-indigo-600 disabled:opacity-20 p-0.5"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      <button
                        onClick={() => handleMoveModule(idx, 'down')}
                        disabled={idx === filteredModules.length - 1}
                        className="hover:text-indigo-600 disabled:opacity-20 p-0.5"
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Icon */}
                    <div className="p-2.5 bg-slate-100 rounded-xl shrink-0 mt-0.5">
                      {getModuleIcon(mod.iconName)}
                    </div>

                    {/* Module Content */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-slate-900">{mod.name}</h3>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                          {mod.department}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-normal">{mod.description}</p>
                      
                      {/* Linked Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-mono text-slate-400 font-semibold flex items-center gap-1">
                          <LinkIcon className="w-3 h-3 text-indigo-500" /> Linked Data Pipeline:
                        </span>
                        {mod.linkedModuleIds.map(linkId => (
                          <span key={linkId} className="text-[9px] font-mono bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100">
                            {linkId.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => onNavigateToTab(mod.id)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                      title="Open Module"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleModule(mod.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        mod.enabled ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          mod.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-Department Automated Workflow Linker (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LinkIcon className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Cross-Department Automation Links
              </h2>
            </div>
            <button
              onClick={() => setShowAddRuleModal(true)}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Rule</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Define visual data pipes and automated triggers between modules. When an event occurs in one department, actions automatically propagate across the enterprise ledger.
            </p>

            <div className="space-y-3">
              {workflowRules.map(rule => (
                <div 
                  key={rule.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    rule.enabled ? 'bg-slate-900 text-white border-slate-800' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-mono font-bold">
                        <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded uppercase">
                          {rule.triggerModuleId}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded uppercase">
                          {rule.targetModuleId}
                        </span>
                      </div>

                      <div className="text-xs font-semibold">
                        <p className="text-indigo-300 font-mono text-[11px]">WHEN: {rule.event}</p>
                        <p className="text-slate-300 text-[11px]">THEN: {rule.action}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`text-xs px-2 py-1 rounded font-mono font-bold ${
                          rule.enabled ? 'bg-emerald-900/60 text-emerald-300' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {rule.enabled ? 'ACTIVE' : 'OFF'}
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded transition-all"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Workflow Rule Modal */}
      {showAddRuleModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-indigo-600" />
                Create Cross-Department Automation Rule
              </h3>
              <button 
                onClick={() => setShowAddRuleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Trigger Source Module (WHEN)
                </label>
                <select
                  value={triggerMod}
                  onChange={(e) => setTriggerMod(e.target.value as ERPModuleId)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.department})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trigger Event Description
                </label>
                <input
                  type="text"
                  value={ruleEvent}
                  onChange={(e) => setRuleEvent(e.target.value)}
                  placeholder="e.g., Booking Confirmed or Order Completed"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Target Destination Module (THEN)
                </label>
                <select
                  value={targetMod}
                  onChange={(e) => setTargetMod(e.target.value as ERPModuleId)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.department})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Automated Action Description
                </label>
                <input
                  type="text"
                  value={ruleAction}
                  onChange={(e) => setRuleAction(e.target.value)}
                  placeholder="e.g., Deduct Stock Levels or Post Revenue to Ledger"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow"
                >
                  Save Automation Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
