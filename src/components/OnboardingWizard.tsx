import React, { useState } from 'react';
import { 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Globe, 
  DollarSign, 
  Users, 
  ShieldCheck, 
  LayoutGrid, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Landmark, 
  Briefcase, 
  HelpCircle, 
  Lightbulb, 
  Check, 
  X,
  Play,
  RotateCcw,
  Zap,
  Star,
  Trash2,
  Edit3
} from 'lucide-react';
import { UserProfile, UserRole } from '../types/erp';
import { dataStore } from '../config/firebase';

interface OnboardingWizardProps {
  activeUser: UserProfile;
  onComplete: (updatedUser: UserProfile) => void;
  onClose?: () => void;
}

const PREDEFINED_INDUSTRIES = [
  'Retail & E-commerce',
  'Hospitality & Lodging',
  'Education & Non-Profit',
  'Wholesale & Logistics',
  'Services & Consulting',
  'Healthcare & Wellness',
  'Manufacturing & Construction'
];

export default function OnboardingWizard({ activeUser, onComplete, onClose }: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(1);

  // Helper to parse existing industry string into multi-select state
  const parseInitialIndustries = (indStr?: string) => {
    if (!indStr) return { selected: ['Retail & E-commerce'], customText: '' };
    const parts = indStr.split(',').map(s => s.trim()).filter(Boolean);
    const selected: string[] = [];
    const customParts: string[] = [];

    parts.forEach(p => {
      if (PREDEFINED_INDUSTRIES.includes(p)) {
        selected.push(p);
      } else {
        customParts.push(p);
      }
    });

    if (customParts.length > 0) {
      selected.push('Other');
    }

    if (selected.length === 0) {
      selected.push('Retail & E-commerce');
    }

    return { selected, customText: customParts.join(', ') };
  };

  const initialIndState = parseInitialIndustries(activeUser.industry);

  // Step 1: Company Profile
  const [companyName, setCompanyName] = useState(activeUser.companyName || 'Enterprise Global');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(initialIndState.selected);
  const [otherIndustryText, setOtherIndustryText] = useState(initialIndState.customText);
  const [currency, setCurrency] = useState(activeUser.currency || localStorage.getItem('erp_active_currency') || 'GHS');
  const [taxRate, setTaxRate] = useState<number>(activeUser.taxRate || 15);
  const [teamSize, setTeamSize] = useState(activeUser.teamSize || '1-10 Employees');

  // Step 2: Enabled Modules
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'pos', 'inventory', 'crm', 'financials', 'tasks', 'messaging', 'hospitality', 'grants'
  ]);

  // Step 3: Team Invites
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('cashier');
  const [staffInvites, setStaffInvites] = useState<{ name: string; email: string; role: UserRole; pin: string }[]>([
    { name: 'Sarah Jenkins', email: 'sarah@company.com', role: 'manager', pin: '1111' },
    { name: 'David Mensah', email: 'david@company.com', role: 'cashier', pin: '2222' }
  ]);
  const [editingInviteIndex, setEditingInviteIndex] = useState<number | null>(null);
  const [editInviteName, setEditInviteName] = useState('');
  const [editInviteEmail, setEditInviteEmail] = useState('');
  const [editInviteRole, setEditInviteRole] = useState<UserRole>('cashier');
  const [editInvitePin, setEditInvitePin] = useState('1111');

  // Step 4: Environment Seeding
  const [seedDataPreference, setSeedDataPreference] = useState<'sample' | 'clean'>('sample');

  // Step 5: Launching state
  const [isLaunching, setIsLaunching] = useState(false);

  const availableModuleList = [
    { id: 'pos', name: 'POS Register & Sales', icon: ShoppingCart, desc: 'Point-of-sale checkout, receipts & offline checkout sync', dept: 'Sales' },
    { id: 'inventory', name: 'Warehouse Inventory', icon: Package, desc: 'Product catalog, stock levels & low stock alerts', dept: 'Operations' },
    { id: 'crm', name: 'CRM & Deals Pipeline', icon: TrendingUp, desc: 'Kanban lead tracker, quotes & customer profiles', dept: 'Sales' },
    { id: 'hospitality', name: 'Hospitality & OTAs', icon: Building2, desc: 'Room booking calendar, housekeeping & OTA sync', dept: 'Operations' },
    { id: 'financials', name: 'Financial Ledger', icon: DollarSign, desc: 'Double-entry bookkeeping, trial balance & P&L reports', dept: 'Finance' },
    { id: 'grants', name: 'Donor Grants & Funding', icon: Landmark, desc: 'Grant disbursements, milestone budgets & donor logs', dept: 'Finance' },
    { id: 'hr', name: 'HR & Team Payroll', icon: Users, desc: 'Employee profiles, timecards, leave requests & payroll', dept: 'Workplace' },
    { id: 'tasks', name: 'Tasks & Voice Todos', icon: Zap, desc: 'Operational shift task board & voice commands', dept: 'Workplace' },
  ];

  const toggleIndustryOption = (ind: string) => {
    if (selectedIndustries.includes(ind)) {
      if (selectedIndustries.length > 1) {
        setSelectedIndustries(selectedIndustries.filter(i => i !== ind));
      }
    } else {
      setSelectedIndustries([...selectedIndustries, ind]);
    }
  };

  const getFinalIndustryString = () => {
    const list: string[] = [];
    selectedIndustries.forEach(i => {
      if (i === 'Other') {
        if (otherIndustryText.trim()) list.push(otherIndustryText.trim());
      } else {
        list.push(i);
      }
    });
    return list.length > 0 ? list.join(', ') : 'General Enterprise';
  };

  const handleAddStaffInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail) return;
    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
    setStaffInvites([
      ...staffInvites,
      { name: newStaffName, email: newStaffEmail, role: newStaffRole, pin: generatedPin }
    ]);
    setNewStaffName('');
    setNewStaffEmail('');
  };

  const handleDeleteStaffInvite = (index: number) => {
    setStaffInvites(staffInvites.filter((_, i) => i !== index));
    if (editingInviteIndex === index) {
      setEditingInviteIndex(null);
    }
  };

  const handleStartEditInvite = (index: number) => {
    const inv = staffInvites[index];
    setEditingInviteIndex(index);
    setEditInviteName(inv.name);
    setEditInviteEmail(inv.email);
    setEditInviteRole(inv.role);
    setEditInvitePin(inv.pin);
  };

  const handleSaveEditInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInviteIndex === null || !editInviteName.trim() || !editInviteEmail.trim()) return;
    const updated = [...staffInvites];
    updated[editingInviteIndex] = {
      name: editInviteName.trim(),
      email: editInviteEmail.trim(),
      role: editInviteRole,
      pin: editInvitePin.trim() || '1111'
    };
    setStaffInvites(updated);
    setEditingInviteIndex(null);
  };

  const toggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      if (selectedModules.length > 1) {
        setSelectedModules(selectedModules.filter(m => m !== id));
      }
    } else {
      setSelectedModules([...selectedModules, id]);
    }
  };

  const handleFinishOnboarding = () => {
    setIsLaunching(true);

    try {
      const finalIndustry = getFinalIndustryString();

      // Update active currency in localStorage
      localStorage.setItem('erp_active_currency', currency);
      window.dispatchEvent(new Event('currencyChange'));

      // Save staff invites to dataStore
      staffInvites.forEach(invite => {
        const existing = dataStore.getUsers().find(u => u.email.toLowerCase() === invite.email.toLowerCase());
        if (!existing) {
          dataStore.addUser({
            uid: `user_invite_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: invite.name,
            email: invite.email,
            role: invite.role,
            companyName: companyName,
            pin: invite.pin,
            permissions: invite.role === 'manager' ? ['all_access'] : ['view_crm', 'checkout_pos'],
            status: 'invited',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      });

      // Update user profile with completed onboarding status
      const updatedUser: UserProfile = {
        ...activeUser,
        companyName,
        industry: finalIndustry,
        currency,
        taxRate,
        teamSize,
        onboardingCompleted: true,
        updatedAt: new Date().toISOString()
      };

      // Save in local dataStore
      dataStore.addUser(updatedUser);

      // Save in localStorage
      localStorage.setItem('erp_is_desktop_created', 'true');
      localStorage.setItem('erp_user_onboarding_done', 'true');

      setTimeout(() => {
        setIsLaunching(false);
        onComplete(updatedUser);
      }, 800);
    } catch (err) {
      console.error('Failed to complete onboarding launch:', err);
      setIsLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full my-8 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200 relative">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 relative border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300 bg-indigo-900/60 border border-indigo-700/60 px-2.5 py-0.5 rounded-full">
                    Setup Wizard • Step {step} of 5
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                  Enterprise Onboarding Portal
                </h2>
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                title="Exit wizard"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400 mt-2">
              <span className={step >= 1 ? 'text-indigo-300 font-bold' : ''}>1. Company</span>
              <span className={step >= 2 ? 'text-indigo-300 font-bold' : ''}>2. Modules</span>
              <span className={step >= 3 ? 'text-indigo-300 font-bold' : ''}>3. Team</span>
              <span className={step >= 4 ? 'text-indigo-300 font-bold' : ''}>4. Data</span>
              <span className={step >= 5 ? 'text-emerald-400 font-bold' : ''}>5. Launch</span>
            </div>
          </div>
        </div>

        {/* STEP 1: COMPANY & REGIONAL SETUP */}
        {step === 1 && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>Organization & Regional Settings</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure your company details, select multiple industry/sectors, primary operating currency, and tax parameters.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Tumi Global Enterprises"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl py-2.5 px-3.5 text-xs text-slate-900 font-medium focus:outline-none transition-all"
                />
              </div>

              {/* Multi-Industry & Sector Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Industry Sectors & Operating Domains (Select Multiple)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[...PREDEFINED_INDUSTRIES, 'Other'].map(ind => {
                    const isSelected = selectedIndustries.includes(ind);
                    return (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => toggleIndustryOption(ind)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-900 ring-2 ring-indigo-200/60'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate mr-1">{ind}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Other Custom Sector Text Input */}
                {selectedIndustries.includes('Other') && (
                  <div className="mt-2.5 animate-in fade-in duration-150">
                    <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                      Specify Other / Custom Industry Sector
                    </label>
                    <input
                      type="text"
                      value={otherIndustryText}
                      onChange={e => setOtherIndustryText(e.target.value)}
                      placeholder="e.g. Renewable Energy, Real Estate Development, Agribusiness"
                      className="w-full bg-indigo-50/50 border border-indigo-300 focus:border-indigo-600 focus:bg-white rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Operating Currency
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl py-2.5 px-3.5 text-xs text-slate-900 font-bold focus:outline-none transition-all"
                  >
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="GHS">GHS (GH₵ - Ghana Cedi)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="ZAR">ZAR (R - South African Rand)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Default VAT / Sales Tax (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={taxRate}
                    onChange={e => setTaxRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl py-2.5 px-3.5 text-xs text-slate-900 font-medium focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Organization Size
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['1-5 Employees', '6-20 Employees', '21-50 Employees', '50+ Employees'].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTeamSize(size)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                        teamSize === size 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MODULE SUITE SELECTION */}
        {step === 2 && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-600" />
                <span>Select Operational Suite Modules</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Choose the tools and workspaces you want enabled for your enterprise environment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {availableModuleList.map(mod => {
                const IconComp = mod.icon;
                const isSelected = selectedModules.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 ${
                      isSelected 
                        ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-200 shadow-xs' 
                        : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">{mod.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">{mod.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: INITIAL TEAM MEMBER SETUP */}
        {step === 3 && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Invite Team Members & Assign Role PINs</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Add staff members and assign secure 4-digit PINs. You can edit or delete invited team members anytime before launch.
              </p>
            </div>

            {/* Add New Staff Invitation Form */}
            <form onSubmit={handleAddStaffInvite} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Add New Staff Invitation</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newStaffName}
                  onChange={e => setNewStaffName(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={newStaffEmail}
                  onChange={e => setNewStaffEmail(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
                <select
                  value={newStaffRole}
                  onChange={e => setNewStaffRole(e.target.value as UserRole)}
                  className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                >
                  <option value="manager">Manager</option>
                  <option value="sales">Sales Executive</option>
                  <option value="cashier">Cashier</option>
                  <option value="accountant">Accountant</option>
                  <option value="warehouse">Warehouse Mgr</option>
                  <option value="receptionist">Receptionist</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                + Add Staff Invitation
              </button>
            </form>

            {/* Edit Invited Team Member Modal/Inline Overlay */}
            {editingInviteIndex !== null && (
              <form onSubmit={handleSaveEditInvite} className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-indigo-600" />
                    Edit Invited Team Member #{editingInviteIndex + 1}
                  </span>
                  <button type="button" onClick={() => setEditingInviteIndex(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={editInviteName}
                    onChange={e => setEditInviteName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={editInviteEmail}
                    onChange={e => setEditInviteEmail(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <select
                    value={editInviteRole}
                    onChange={e => setEditInviteRole(e.target.value as UserRole)}
                    className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="manager">Manager</option>
                    <option value="sales">Sales Executive</option>
                    <option value="cashier">Cashier</option>
                    <option value="accountant">Accountant</option>
                    <option value="warehouse">Warehouse Mgr</option>
                    <option value="receptionist">Receptionist</option>
                  </select>
                  <input
                    type="text"
                    placeholder="PIN"
                    value={editInvitePin}
                    onChange={e => setEditInvitePin(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingInviteIndex(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* List of Invited Team Members */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Invited Team Members ({staffInvites.length})</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {staffInvites.map((invite, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 bg-indigo-100 text-indigo-700 font-bold rounded-lg flex items-center justify-center text-xs shrink-0">
                        {invite.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{invite.name}</span>
                        <span className="text-[10px] text-slate-500">{invite.email} • <strong className="uppercase text-indigo-600">{invite.role}</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-mono font-bold">
                        PIN: {invite.pin}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEditInvite(idx)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit invited team member"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStaffInvite(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete invited team member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: ENVIRONMENT & SEED DATA */}
        {step === 4 && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-indigo-600" />
                <span>Workspace Data Initialization</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Choose how you want your new workspace populated upon first launch.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setSeedDataPreference('sample')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                  seedDataPreference === 'sample' 
                    ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-200 shadow-md' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
                    <Star className="w-5 h-5" />
                  </div>
                  {seedDataPreference === 'sample' && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Start with Sample Demo Records</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pre-loads your database with sample catalog items, hotel room types, CRM deals, and financial entries so you can immediately test all features.
                </p>
              </div>

              <div
                onClick={() => setSeedDataPreference('clean')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                  seedDataPreference === 'clean' 
                    ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-200 shadow-md' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-slate-700 text-white rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  {seedDataPreference === 'clean' && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Clean Production Slate</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Starts with a 100% empty production database. Ideal when you are ready to input your actual store inventory, real customer profiles, and official ledgers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: LAUNCH & CONFIRMATION */}
        {step === 5 && (
          <div className="p-6 sm:p-8 space-y-6 text-center animate-in fade-in duration-150">
            <div className="inline-flex p-4 bg-emerald-100 text-emerald-600 rounded-3xl shadow-sm mb-1">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">Your Enterprise Workspace is Ready!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Your company profile, active modules, and team credentials have been configured and synchronized.
              </p>
            </div>

            {/* Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left max-w-md mx-auto space-y-2 text-xs text-slate-700">
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500">Organization:</span>
                <strong className="text-slate-900 font-bold">{companyName}</strong>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500">Sectors & Size:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={getFinalIndustryString()}>
                  {getFinalIndustryString()} ({teamSize})
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500">Currency & Tax:</span>
                <span className="font-bold text-indigo-700">{currency} ({taxRate}% VAT)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Enabled Suite Modules:</span>
                <span className="font-bold text-emerald-700">{selectedModules.length} Modules Active</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinishOnboarding}
              disabled={isLaunching}
              className="w-full max-w-md py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-600 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <span>{isLaunching ? 'Setting Up Workspace...' : 'Launch My Production Workspace'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 sm:px-8 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : <div />}

          {step < 5 && (
            <button
              type="button"
              onClick={() => setStep(s => Math.min(5, s + 1))}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 ml-auto"
            >
              <span>Continue to Step {step + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

