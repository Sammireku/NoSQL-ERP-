import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Briefcase, 
  Package, 
  ShieldAlert, 
  Wifi, 
  WifiOff, 
  User, 
  BookOpen, 
  LogIn, 
  Menu, 
  X, 
  LayoutGrid, 
  DollarSign, 
  Truck, 
  Coins, 
  ShieldCheck, 
  ListTodo, 
  Smartphone, 
  MessageSquare, 
  QrCode, 
  Award, 
  GraduationCap, 
  Landmark,
  Sparkles,
  ChevronDown,
  RotateCcw,
  ClipboardCheck,
  Heart,
  Puzzle,
  Wrench,
  Sliders,
  Search
} from 'lucide-react';
import { UserProfile, ERPModuleConfig, UserRole } from './types/erp';
import { dataStore } from './config/firebase';
import POSCart from './components/POSCart';
import KanbanBoard from './components/KanbanBoard';
import CRMProfiles from './components/CRMProfiles';
import HRProfiles from './components/HRProfiles';
import InventoryTracker from './components/InventoryTracker';
import AuthLayout, { ProtectedRoute } from './components/AuthLayout';
import AIChatSupport from './components/AIChatSupport';
import FinancialLedger from './components/FinancialLedger';
import ProcurementWarehouse from './components/ProcurementWarehouse';
import PettyCash from './components/PettyCash';
import SystemAdminConsole from './components/SystemAdminConsole';
import AuthSystem from './components/AuthSystem';
import SystemModuleBuilder from './components/SystemModuleBuilder';
import HospitalityChannelManager from './components/HospitalityChannelManager';
import OnboardingWizard from './components/OnboardingWizard';
import AppWalkthroughGuide from './components/AppWalkthroughGuide';
import FloatingMessagingWidget from './components/FloatingMessagingWidget';
import TaskManagerModule from './components/TaskManagerModule';
import MobileAppHub from './components/MobileAppHub';
import TeamMessagingHub from './components/TeamMessagingHub';
import BeneficiaryAttendanceModule from './components/BeneficiaryAttendanceModule';
import DonorGrantModule from './components/DonorGrantModule';
import GraduatePlacementTracker from './components/GraduatePlacementTracker';
import DigitalCertificateModule from './components/DigitalCertificateModule';
import CollaborativeStockTakes from './components/CollaborativeStockTakes';
import WebDonationPluginModule from './components/WebDonationPluginModule';
import WebsitePluginsHub from './components/WebsitePluginsHub';
import GlobalSearchBar from './components/GlobalSearchBar';
import CommandPaletteModal from './components/CommandPaletteModal';
import EnterpriseCustomizer from './components/EnterpriseCustomizer';
import { TumiAppLogo } from './components/TumiLogos';


// Consolidated modular pages
import SalesDashboard from './components/SalesDashboard';
import ReturnsRefunds from './components/ReturnsRefunds';
import ProgramsModule from './components/ProgramsModule';
import MyHomeDashboard from './components/MyHomeDashboard';
import MaintenanceDashboard from './components/MaintenanceDashboard';

export type TabId = 
  | 'sysadmin' 
  | 'plugins'
  | 'builder' 
  | 'sales'
  | 'crm' 
  | 'returns'
  | 'students'
  | 'graduates'
  | 'placements'
  | 'programs'
  | 'customers' 
  | 'pos' 
  | 'inventory' 
  | 'financials' 
  | 'procurement' 
  | 'petty_cash' 
  | 'hr' 
  | 'hospitality' 
  | 'messaging' 
  | 'tasks' 
  | 'mobile_app' 
  | 'attendance' 
  | 'grants' 
  | 'web_donations'
  | 'stock_takes'
  | 'certificates'
  | 'maintenance'
  | 'enterprise_customizer';


interface NavigationDefinition {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
  category?: string;
}

// Master Navigation Items Definition categorized for group-based display
const ALL_NAV_ITEMS: NavigationDefinition[] = [
  {
    id: 'sysadmin',
    label: 'System Admin Page',
    icon: ShieldCheck,
    allowedRoles: ['sysadmin', 'ceo']
  },
  {
    id: 'plugins',
    label: 'Website Plugins',
    icon: Puzzle,
    allowedRoles: ['sysadmin', 'ceo']
  },
  {
    id: 'builder',
    label: 'Customize Dashboard', // Replaced dynamically with "My home"
    icon: LayoutGrid,
    allowedRoles: ['sysadmin', 'ceo', 'manager', 'cashier', 'warehouse', 'accountant', 'receptionist', 'sales']
  },
  
  // Sales Category
  {
    id: 'sales',
    label: 'sales',
    icon: ShoppingCart,
    allowedRoles: ['cashier', 'manager', 'ceo', 'sales'],
    category: 'Sales'
  },
  {
    id: 'pos',
    label: 'Point of Sale (POS)',
    icon: QrCode,
    allowedRoles: ['cashier', 'manager', 'ceo'],
    category: 'Sales'
  },
  {
    id: 'crm',
    label: 'sales deals',
    icon: TrendingUp,
    allowedRoles: ['sales', 'manager', 'ceo'],
    category: 'Sales'
  },
  {
    id: 'returns',
    label: 'returns and refunds',
    icon: RotateCcw,
    allowedRoles: ['cashier', 'manager', 'ceo'],
    category: 'Sales'
  },

  // Programs Category
  {
    id: 'students',
    label: 'current students',
    icon: Users,
    allowedRoles: ['receptionist', 'manager', 'ceo', 'sales'],
    category: 'Programs'
  },
  {
    id: 'graduates',
    label: 'graduates',
    icon: GraduationCap,
    allowedRoles: ['receptionist', 'manager', 'ceo', 'sales'],
    category: 'Programs'
  },
  {
    id: 'placements',
    label: 'm & e placement list',
    icon: Briefcase,
    allowedRoles: ['sales', 'manager', 'ceo'],
    category: 'Programs'
  },
  {
    id: 'programs',
    label: 'running programs',
    icon: BookOpen,
    allowedRoles: ['receptionist', 'manager', 'ceo', 'sales'],
    category: 'Programs'
  },
  {
    id: 'attendance',
    label: 'attendance & clock-in',
    icon: QrCode,
    allowedRoles: ['receptionist', 'manager', 'ceo', 'accountant', 'sysadmin'],
    category: 'Programs'
  },

  // Operations Category
  {
    id: 'inventory',
    label: 'Warehouse Inventory',
    icon: Package,
    allowedRoles: ['warehouse', 'manager', 'ceo'],
    category: 'Operations'
  },
  {
    id: 'procurement',
    label: 'Procurement Logistics',
    icon: Truck,
    allowedRoles: ['warehouse', 'manager', 'ceo', 'accountant', 'sysadmin'],
    category: 'Operations'
  },
  {
    id: 'stock_takes',
    label: 'Collaborative Stock Takes',
    icon: ClipboardCheck,
    allowedRoles: ['warehouse', 'manager', 'ceo', 'accountant'],
    category: 'Operations'
  },
  {
    id: 'hospitality',
    label: 'Hospitality Front Desk',
    icon: Building2,
    allowedRoles: ['receptionist', 'housekeeping', 'manager', 'ceo'],
    category: 'Operations'
  },
  {
    id: 'maintenance',
    label: 'Maintenance & Renewals',
    icon: Wrench,
    allowedRoles: ['ceo', 'manager', 'sysadmin', 'receptionist', 'housekeeping', 'maintenance'],
    category: 'Operations'
  },

  // Finance Category
  {
    id: 'financials',
    label: 'Financial Ledger',
    icon: DollarSign,
    allowedRoles: ['accountant', 'manager', 'auditor', 'ceo'],
    category: 'Finance'
  },
  {
    id: 'petty_cash',
    label: 'Petty Cash',
    icon: Coins,
    allowedRoles: ['accountant', 'manager', 'ceo'],
    category: 'Finance'
  },
  {
    id: 'grants',
    label: 'Donor Grants',
    icon: Landmark,
    allowedRoles: ['accountant', 'auditor', 'manager', 'ceo'],
    category: 'Finance'
  },
  {
    id: 'web_donations',
    label: 'Web Donation Plugin',
    icon: Heart,
    allowedRoles: ['accountant', 'auditor', 'manager', 'ceo', 'sales'],
    category: 'Finance'
  },

  // Workplace Category
  {
    id: 'hr',
    label: 'HR and Roles',
    icon: Users,
    allowedRoles: ['manager', 'ceo'],
    category: 'Workplace'
  },
  {
    id: 'tasks',
    label: 'Tasks & Todos',
    icon: ListTodo,
    allowedRoles: ['cashier', 'sales', 'warehouse', 'receptionist', 'housekeeping', 'maintenance', 'accountant', 'manager', 'sysadmin', 'ceo'],
    category: 'Workplace'
  },
  {
    id: 'messaging',
    label: 'Team Messaging',
    icon: MessageSquare,
    allowedRoles: ['cashier', 'sales', 'warehouse', 'receptionist', 'housekeeping', 'maintenance', 'accountant', 'auditor', 'manager', 'sysadmin', 'ceo'],
    category: 'Workplace'
  },
  {
    id: 'certificates',
    label: 'Digital Credentials',
    icon: Award,
    allowedRoles: ['manager', 'ceo'],
    category: 'Programs'
  },
  {
    id: 'mobile_app',
    label: 'Mobile Apps',
    icon: Smartphone,
    allowedRoles: ['sysadmin', 'ceo'],
    category: 'Workplace'
  },
  {
    id: 'enterprise_customizer',
    label: 'Tax & Customizer',
    icon: Sliders,
    allowedRoles: ['accountant', 'auditor', 'manager', 'sysadmin', 'ceo'],
    category: 'Workplace'
  }
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeUserIdx, setActiveUserIdx] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('builder'); // starts at builder dashboard
  const [modules, setModules] = useState<ERPModuleConfig[]>(() => dataStore.getModulesConfig());

  // Global Currency Default to Ghana Cedi
  useEffect(() => {
    if (!localStorage.getItem('erp_active_currency')) {
      localStorage.setItem('erp_active_currency', 'GHS');
      window.dispatchEvent(new Event('tumi_currency_rates_updated'));
      window.dispatchEvent(new Event('currencyChange'));
    }
  }, []);

  // Local customize state
  const [isDesktopCreated, setIsDesktopCreated] = useState(() => {
    return localStorage.getItem('erp_is_desktop_created') === 'true';
  });

  // Modal states
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Keyboard shortcut listener for Cmd + K Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [claimsRotatedToast, setClaimsRotatedToast] = useState(false);
  const [activeDropdownCategory, setActiveDropdownCategory] = useState<string | null>(null);

  const [staffList, setStaffList] = useState(() => dataStore.getUsers());
  const activeUser = staffList[activeUserIdx] || staffList[0];
  const refreshStaffList = () => setStaffList(dataStore.getUsers());

  useEffect(() => {
    if (activeUser) {
      localStorage.setItem('erp_active_user_uid', activeUser.uid);
    }
  }, [activeUser]);

  // Dynamically compute visible tabs based on user role and desktop status
  const visibleNavItems = useMemo(() => {
    return ALL_NAV_ITEMS.map(item => {
      if (item.id === 'builder') {
        return {
          ...item,
          label: isDesktopCreated ? 'My home' : 'Customize Dashboard'
        };
      }
      return item;
    }).filter(item => {
      const userRoles = activeUser?.roles || [activeUser?.role];
      if (activeUser?.role === 'ceo' || userRoles.includes('ceo')) return true; // CEO has all privileges
      if (item.id === 'sysadmin') return activeUser?.role === 'sysadmin' || userRoles.includes('sysadmin'); // Only sysadmin (and CEO)
      return item.allowedRoles.some(r => userRoles.includes(r));
    });
  }, [activeUser?.role, activeUser?.roles, isDesktopCreated]);

  // Ensure active tab is within user's allowed tabs upon role switch
  useEffect(() => {
    const isCurrentlyAllowed = visibleNavItems.some(item => item.id === activeTab);
    if (!isCurrentlyAllowed && visibleNavItems.length > 0) {
      setActiveTab(visibleNavItems[0].id);
    }
  }, [activeUser.role, visibleNavItems, activeTab]);

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail === 'string') {
        setActiveTab(customEvent.detail as any);
      } else if (customEvent.detail && customEvent.detail.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };
    window.addEventListener('tumi_navigate_tab', handleNavigate);
    return () => {
      window.removeEventListener('tumi_navigate_tab', handleNavigate);
    };
  }, []);

  const handleVerifyPin = (pin: string) => {
    const idx = staffList.findIndex(s => (s.pin || '1111') === pin);
    if (idx !== -1) {
      setActiveUserIdx(idx);
      setIsLoggedIn(true);
      setPinInput('');
      setPinError(null);
      setIsPinModalOpen(false);
      setClaimsRotatedToast(true);
      setTimeout(() => setClaimsRotatedToast(false), 3000);
    } else {
      setPinError('Invalid Secure PIN. Authorization failure.');
      setPinInput('');
    }
  };

  const toggleNetwork = () => {
    const newOnlineState = !isOnline;
    setIsOnline(newOnlineState);

    if (newOnlineState) {
      dataStore.syncOfflineQueue(activeUser)
        .then(result => {
          if (result && result.syncedCount > 0) {
            console.log(`Synced ${result.syncedCount} transaction logs back online.`);
          }
        })
        .catch(err => console.error("Auto synchronisation failed:", err));
    }
  };

  return (
    <AuthLayout
      activeUser={activeUser}
      onChangeUser={(uid) => {
        const idx = staffList.findIndex(s => s.uid === uid);
        if (idx !== -1) {
          setActiveUserIdx(idx);
          setIsLoggedIn(true);
        }
      }}
      onStartOnboarding={(u) => {
        setIsLoggedIn(true);
        setIsOnboardingOpen(true);
      }}
      staffList={staffList}
    >
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-800 antialiased font-sans">
      
      {/* 1. Sleek, Short-Height Header */}
      <header className="bg-white border-b border-slate-200/80 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-13 gap-3">
            
            {/* Logo & Brand (Image 1: Orange circular icon before Tumi ERP) */}
            <div className="flex items-center space-x-2.5 shrink-0">
              <TumiAppLogo className="w-8 h-8 shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold tracking-tight text-slate-900">Tumi ERP</span>
                <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-bold px-1.5 py-0.2 rounded-md uppercase hidden sm:inline-block">
                  Ghana Enterprise
                </span>
              </div>
            </div>

            {/* Global Natural Language Gemini-Powered Search Bar */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <GlobalSearchBar
                onNavigateTab={(tabId) => setActiveTab(tabId)}
                activeUserRole={activeUser?.role}
              />
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-all cursor-pointer shrink-0"
                title="Open Command Palette (Cmd + K)"
              >
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] font-bold">Command</span>
                <kbd className="bg-white px-1 py-0.2 rounded border border-slate-200 text-[9px] font-mono text-slate-500 font-bold">⌘K</kbd>
              </button>
            </div>

            {/* Clean, Compact Controls */}
            <div className="flex items-center gap-2">
              
              {isLoggedIn ? (
                <>
                  {/* Global Currency Selector Pill */}
                  <div className="flex items-center bg-indigo-50/80 border border-indigo-200/80 rounded-lg py-1 px-2 text-xs text-indigo-900 font-bold">
                    <span className="text-[10px] uppercase tracking-wider text-indigo-500 mr-1 hidden sm:inline">Currency:</span>
                    <select
                      value={localStorage.getItem('erp_active_currency') || 'GHS'}
                      onChange={(e) => {
                        const val = e.target.value;
                        localStorage.setItem('erp_active_currency', val);
                        window.dispatchEvent(new Event('currencyChange'));
                        // Force re-render of current header
                        setActiveUserIdx(prev => prev);
                      }}
                      className="bg-transparent text-xs font-bold text-indigo-900 focus:outline-none cursor-pointer"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="GHS">GHS (GH₵)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="ZAR">ZAR (R)</option>
                    </select>
                  </div>

                  {/* Quick Role Switcher Pill (User Profile) */}
                  <motion.div 
                    key={activeUser.uid}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg py-1 px-2.5 text-xs text-slate-700"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                    <select
                       value={activeUser.uid}
                       onChange={(e) => {
                         const idx = staffList.findIndex(s => s.uid === e.target.value);
                         if (idx !== -1) setActiveUserIdx(idx);
                       }}
                       className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer pr-1"
                    >
                      {staffList.map(s => (
                        <option key={s.uid} value={s.uid}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </motion.div>

                  {/* Setup Wizard Button */}
                  <button
                    onClick={() => setIsOnboardingOpen(true)}
                    className="hidden sm:flex items-center gap-1 bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-700 text-xs py-1 px-2.5 rounded-lg font-bold border border-indigo-200/80 transition-all shadow-xs"
                    title="Launch Enterprise Setup Wizard"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Setup Wizard</span>
                  </button>

                  {/* Guide Button */}
                  <button
                    onClick={() => setIsWalkthroughOpen(true)}
                    className="hidden sm:flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-1 px-2.5 rounded-lg font-medium border border-slate-200 transition-all"
                  >
                    <BookOpen className="w-3 h-3 text-slate-500" />
                    <span>Guide</span>
                  </button>

                  {/* Switch PIN / Account Button */}
                  <button
                    onClick={() => setIsPinModalOpen(true)}
                    className="hidden sm:flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-1 px-2.5 rounded-lg font-medium border border-slate-200 transition-all"
                    title="Terminal PIN fast login"
                  >
                    <span>PIN</span>
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={() => setIsLoggedIn(false)}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs py-1 px-2.5 rounded-lg font-bold border border-slate-200 transition-all"
                  >
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Login Button when not logged in */}
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1 px-2.5 rounded-lg font-bold transition-all shadow-xs"
                  >
                    <LogIn className="w-3 h-3" />
                    <span>Login</span>
                  </button>
                </>
              )}

              {/* Online / Offline Status Badge (Only CEO & SysAdmin can toggle) */}
              {activeUser?.role === 'ceo' || activeUser?.role === 'sysadmin' ? (
                <button
                  onClick={toggleNetwork}
                  className="flex items-center space-x-1 py-1 px-2 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-100 bg-white text-slate-700 transition-all cursor-pointer shadow-2xs"
                  title={isOnline ? 'System Online (Click to switch offline)' : 'System Offline (Click to switch online)'}
                >
                  {isOnline ? (
                    <Wifi className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-rose-600" />
                  )}
                  <span className="hidden sm:inline text-[11px]">{isOnline ? 'Online' : 'Offline'}</span>
                </button>
              ) : (
                <div
                  className="flex items-center space-x-1 py-1 px-2 rounded-lg text-xs font-semibold border border-slate-200/80 bg-slate-50 text-slate-600 cursor-default select-none"
                  title={isOnline ? 'System Online (Managed by Administrator)' : 'System Offline (Managed by Administrator)'}
                >
                  {isOnline ? (
                    <Wifi className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-rose-600" />
                  )}
                  <span className="hidden sm:inline text-[11px]">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
              )}

              {/* Mobile Drawer Menu Toggle (extreme right on mobile) */}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden flex items-center justify-center p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200"
                aria-label="Toggle navigation menu"
              >
                {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE DROPDOWN DRAWER (Filtered by User Role and Grouped by Category) */}
      {mobileNavOpen && (
        <>
          {/* Semi-transparent click-outside backdrop overlay */}
          <div 
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-xs md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute left-0 right-0 z-50 bg-white border-b border-slate-200 text-slate-700 p-5 space-y-4 shadow-2xl animate-fade-in md:hidden">
            <div className="flex items-center justify-between border-b pb-2">
              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                Available Modules ({activeUser.role.toUpperCase()})
              </p>
              <button onClick={() => setMobileNavOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Uncategorized items first */}
              {visibleNavItems.filter(item => !item.category).map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
                    className={`w-full flex items-center space-x-3 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                      isActive ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Categorized groups */}
              {['Sales', 'Programs', 'Operations', 'Finance', 'Workplace'].map(category => {
                const categoryItems = visibleNavItems.filter(item => item.category === category);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={category} className="space-y-1">
                    <p className="text-[9px] uppercase text-slate-400 font-bold tracking-wider pl-1">{category}</p>
                    <div className="grid grid-cols-1 gap-1">
                      {categoryItems.map(subItem => {
                        const SubIcon = subItem.icon;
                        const isSubActive = activeTab === subItem.id;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => { setActiveTab(subItem.id); setMobileNavOpen(false); }}
                            className={`w-full flex items-center space-x-3 py-2 px-3.5 text-xs rounded-lg transition-all ${
                              isSubActive 
                                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' 
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100/50'
                            }`}
                          >
                            <SubIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="capitalize">{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 2. Desktop Navigation Bar: STRICTLY ROLE-SPECIFIC TABS GROUPED BY CATEGORIES */}
      <nav className="hidden md:block bg-white border-b border-slate-200/90 shadow-2xs sticky top-13 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1.5 py-1.5 scrollbar-none relative">
            
            {/* Render Top Level Items (Uncategorized) */}
            {visibleNavItems.filter(item => !item.category).map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isSpecialAdmin = item.id === 'sysadmin' || item.id === 'builder';

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setActiveDropdownCategory(null);
                  }}
                  className={`flex items-center space-x-1.5 py-1.5 px-3.5 text-xs rounded-lg transition-all shrink-0 font-semibold ${
                    isActive
                      ? isSpecialAdmin 
                        ? 'bg-purple-700 text-white shadow-xs font-bold' 
                        : 'bg-indigo-600 text-white shadow-xs font-bold'
                      : isSpecialAdmin
                        ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Visual Divider if top-level items exist */}
            {visibleNavItems.some(item => !item.category) && (
              <div className="h-5 w-px bg-slate-200 mx-1.5" />
            )}

            {/* Render Categorized Dropdowns */}
            {['Sales', 'Programs', 'Operations', 'Finance', 'Workplace'].map(category => {
              const categoryItems = visibleNavItems.filter(item => item.category === category);
              if (categoryItems.length === 0) return null;

              const isCategoryActive = categoryItems.some(item => item.id === activeTab);
              const isOpen = activeDropdownCategory === category;

              return (
                <div 
                  key={category} 
                  className="relative shrink-0"
                  onMouseEnter={() => setActiveDropdownCategory(category)}
                  onMouseLeave={() => setActiveDropdownCategory(null)}
                >
                  <button
                    onClick={() => setActiveDropdownCategory(isOpen ? null : category)}
                    className={`flex items-center space-x-1.5 py-1.5 px-3 text-xs rounded-lg font-semibold transition-all ${
                      isCategoryActive
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>{category}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} />
                  </button>

                  {/* Floating Panel on Hover / Click */}
                  {isOpen && (
                    <div className="absolute left-0 mt-0.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in duration-100">
                      {categoryItems.map(subItem => {
                        const SubIcon = subItem.icon;
                        const isSubActive = activeTab === subItem.id;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              setActiveTab(subItem.id);
                              setActiveDropdownCategory(null);
                            }}
                            className={`w-full text-left flex items-center space-x-2.5 py-2 px-3.5 text-xs transition-all ${
                              isSubActive
                                ? 'bg-indigo-50 text-indigo-700 font-bold'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className="capitalize">{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 3. Main Workspace Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {/* Enterprise Customizer (Tax Engine, Receipt Branding, Dashboard Widgets, Universal CSV) */}
            {activeTab === 'enterprise_customizer' && (
              <ProtectedRoute allowedRoles={['accountant', 'auditor', 'manager', 'sysadmin', 'ceo']} userRole={activeUser.role} componentName="Tax & Customizer Console">
                <EnterpriseCustomizer activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* System Admin Console - ONLY visible to sysadmin and CEO */}
            {activeTab === 'sysadmin' && (
              <ProtectedRoute allowedRoles={['sysadmin']} userRole={activeUser.role} componentName="System Admin Console">
                <SystemAdminConsole activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Website Plugins Hub - ONLY visible to sysadmin and CEO */}
            {activeTab === 'plugins' && (
              <ProtectedRoute allowedRoles={['sysadmin']} userRole={activeUser.role} componentName="Website Plugins Hub">
                <WebsitePluginsHub activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Customizable Home Dashboard / "My home" */}
            {activeTab === 'builder' && (
              <MyHomeDashboard 
                activeUser={activeUser}
                onNavigateToTab={(tabId) => setActiveTab(tabId as any)}
                isDesktopCreated={isDesktopCreated}
                setIsDesktopCreated={setIsDesktopCreated}
                modules={modules}
              />
            )}

            {/* Unified Sales Dashboard (WooCommerce sync, offline sales, tracker) */}
            {activeTab === 'sales' && (
              <ProtectedRoute allowedRoles={['cashier', 'manager', 'sales']} userRole={activeUser.role} componentName="Sales Dashboard">
                <SalesDashboard 
                  activeUser={activeUser} 
                  isOnline={isOnline} 
                  toggleNetwork={toggleNetwork} 
                />
              </ProtectedRoute>
            )}

            {/* Sales Deals (crm Kanban board) */}
            {activeTab === 'crm' && (
              <ProtectedRoute allowedRoles={['sales', 'manager']} userRole={activeUser.role} componentName="Sales Deals">
                <KanbanBoard activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Returns and Refunds */}
            {activeTab === 'returns' && (
              <ProtectedRoute allowedRoles={['cashier', 'manager']} userRole={activeUser.role} componentName="Returns and Refunds">
                <ReturnsRefunds activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Programs Sub-tabs mapped to single ProgramsModule */}
            {activeTab === 'students' && (
              <ProtectedRoute allowedRoles={['receptionist', 'manager', 'sales']} userRole={activeUser.role} componentName="Current Students">
                <ProgramsModule activeUser={activeUser} initialSubTab="students" />
              </ProtectedRoute>
            )}

            {activeTab === 'graduates' && (
              <ProtectedRoute allowedRoles={['receptionist', 'manager', 'sales']} userRole={activeUser.role} componentName="Graduates">
                <ProgramsModule activeUser={activeUser} initialSubTab="graduates" />
              </ProtectedRoute>
            )}

            {activeTab === 'placements' && (
              <ProtectedRoute allowedRoles={['sales', 'manager']} userRole={activeUser.role} componentName="M&E Placements">
                <ProgramsModule activeUser={activeUser} initialSubTab="placements" />
              </ProtectedRoute>
            )}

            {activeTab === 'programs' && (
              <ProtectedRoute allowedRoles={['receptionist', 'manager', 'ceo', 'sales']} userRole={activeUser.role} componentName="Running Programs">
                <ProgramsModule activeUser={activeUser} initialSubTab="programs" />
              </ProtectedRoute>
            )}

            {/* CRM Customers */}
            {activeTab === 'customers' && (
              <ProtectedRoute allowedRoles={['sales', 'manager']} userRole={activeUser.role} componentName="CRM Customer Profiles">
                <CRMProfiles activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* POS Cart */}
            {activeTab === 'pos' && (
              <ProtectedRoute allowedRoles={['cashier', 'manager']} userRole={activeUser.role} componentName="POS Checkout">
                <POSCart 
                  activeUser={activeUser} 
                  isOnline={isOnline} 
                  toggleNetwork={toggleNetwork} 
                />
              </ProtectedRoute>
            )}

            {/* Warehouse Inventory */}
            {activeTab === 'inventory' && (
              <ProtectedRoute allowedRoles={['warehouse', 'manager']} userRole={activeUser.role} componentName="Warehouse Inventory">
                <InventoryTracker activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Financial Accounting Software Suite */}
            {activeTab === 'financials' && (
              <ProtectedRoute allowedRoles={['accountant', 'manager', 'auditor']} userRole={activeUser.role} componentName="Financial Ledger">
                <FinancialLedger activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Procurement Warehouse Logistics */}
            {activeTab === 'procurement' && (
              <ProtectedRoute allowedRoles={['warehouse', 'manager']} userRole={activeUser.role} componentName="Procurement & Logistics">
                <ProcurementWarehouse activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Collaborative Stock Takes */}
            {activeTab === 'stock_takes' && (
              <ProtectedRoute allowedRoles={['warehouse', 'manager', 'accountant']} userRole={activeUser.role} componentName="Collaborative Stock Takes">
                <CollaborativeStockTakes activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Petty Cash */}
            {activeTab === 'petty_cash' && (
              <ProtectedRoute allowedRoles={['accountant', 'manager']} userRole={activeUser.role} componentName="Petty Cash">
                <PettyCash activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* HR and Roles (formerly HR users directory) */}
            {activeTab === 'hr' && (
              <ProtectedRoute allowedRoles={['manager']} userRole={activeUser.role} componentName="HR and Roles">
                <HRProfiles activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Hospitality & Front Desk */}
            {activeTab === 'hospitality' && (
              <ProtectedRoute allowedRoles={['receptionist', 'housekeeping', 'manager']} userRole={activeUser.role} componentName="Hospitality & Front Desk">
                <HospitalityChannelManager activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Tasks & Todos */}
            {activeTab === 'tasks' && (
              <ProtectedRoute allowedRoles={['cashier', 'sales', 'warehouse', 'receptionist', 'housekeeping', 'maintenance', 'accountant', 'manager', 'sysadmin']} userRole={activeUser.role} componentName="Tasks & Todos">
                <TaskManagerModule activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Team Messaging */}
            {activeTab === 'messaging' && (
              <ProtectedRoute allowedRoles={['cashier', 'sales', 'warehouse', 'receptionist', 'housekeeping', 'maintenance', 'accountant', 'auditor', 'manager', 'sysadmin']} userRole={activeUser.role} componentName="Team Messaging">
                <TeamMessagingHub activeUser={activeUser} staffList={staffList} />
              </ProtectedRoute>
            )}

            {/* Trainee Attendance & Staff Biometric Clock-In */}
            {activeTab === 'attendance' && (
              <ProtectedRoute allowedRoles={['receptionist', 'manager', 'ceo', 'accountant', 'sysadmin']} userRole={activeUser.role} componentName="Trainee & Staff Attendance">
                <BeneficiaryAttendanceModule activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Donor Grants */}
            {activeTab === 'grants' && (
              <ProtectedRoute allowedRoles={['accountant', 'auditor', 'manager']} userRole={activeUser.role} componentName="Donor Grants">
                <DonorGrantModule activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Web Donation Plugin */}
            {activeTab === 'web_donations' && (
              <ProtectedRoute allowedRoles={['accountant', 'auditor', 'manager', 'sales']} userRole={activeUser.role} componentName="Web Donation Plugin">
                <WebDonationPluginModule activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Digital Credentials */}
            {activeTab === 'certificates' && (
              <ProtectedRoute allowedRoles={['manager']} userRole={activeUser.role} componentName="Digital Credentials">
                <DigitalCertificateModule activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Mobile Apps Hub */}
            {activeTab === 'mobile_app' && (
              <ProtectedRoute allowedRoles={['sysadmin', 'ceo']} userRole={activeUser.role} componentName="Mobile Apps">
                <MobileAppHub activeUser={activeUser} />
              </ProtectedRoute>
            )}

            {/* Maintenance & Renewals Dashboard */}
            {activeTab === 'maintenance' && (
              <ProtectedRoute allowedRoles={['ceo', 'manager', 'sysadmin', 'receptionist', 'housekeeping', 'maintenance']} userRole={activeUser.role} componentName="Maintenance & Compliance">
                <MaintenanceDashboard activeUser={activeUser} />
              </ProtectedRoute>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Tumi ERP Enterprise Systems • Role-Based Access Control</span>
          <span className="text-[11px] text-slate-400">Authenticated as: <strong className="text-slate-600">{activeUser.name}</strong> ({activeUser.role.toUpperCase()})</span>
        </div>
      </footer>

      {/* Modals & Floating Tools */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto animate-in zoom-in-95 duration-150">
            <AuthSystem
              activeUser={activeUser}
              onSelectUser={(u) => {
                const idx = staffList.findIndex(s => s.uid === u.uid);
                if (idx !== -1) setActiveUserIdx(idx);
                setIsLoggedIn(true);
                setIsAuthModalOpen(false);
              }}
              onClose={() => setIsAuthModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Floating RAG Staff Chat Support Interface */}
      <AIChatSupport activeUser={activeUser} />

      {/* Floating Team Role Messaging Widget */}
      <FloatingMessagingWidget 
        activeUser={activeUser} 
        onOpenTaskManagerWithMessages={() => setActiveTab('tasks')} 
      />

      {/* Claims Rotated Toast */}
      <AnimatePresence>
        {claimsRotatedToast && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-16 right-4 z-50 bg-emerald-900 text-emerald-100 border border-emerald-800 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-2.5"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div>
              <p className="text-xs font-bold">Role Claim Switched</p>
              <p className="text-[10px] text-emerald-300">Active session: {activeUser.name} ({activeUser.role.toUpperCase()})</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth System Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
            <AuthSystem
              activeUser={activeUser}
              onSelectUser={(selected) => {
                const updatedList = dataStore.getUsers();
                const idx = updatedList.findIndex(s => s.uid === selected.uid || s.email.toLowerCase() === selected.email.toLowerCase());
                if (idx !== -1) {
                  setActiveUserIdx(idx);
                } else {
                  dataStore.addUser(selected);
                  const freshList = dataStore.getUsers();
                  const freshIdx = freshList.findIndex(s => s.uid === selected.uid || s.email.toLowerCase() === selected.email.toLowerCase());
                  setActiveUserIdx(freshIdx !== -1 ? freshIdx : 0);
                }
                setStaffList(dataStore.getUsers());
                setIsLoggedIn(true);
                setIsAuthModalOpen(false);
                setClaimsRotatedToast(true);
                setTimeout(() => setClaimsRotatedToast(false), 3000);
              }}
              onClose={() => setIsAuthModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Terminal PIN Entry Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full space-y-5 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl inline-block mb-2">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Fast PIN Terminal Switch</h3>
              <p className="text-[11px] text-slate-400">Enter your secure 4-digit employee PIN</p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="flex justify-center space-x-3">
                {[0, 1, 2, 3].map((idx) => {
                  const val = pinInput[idx];
                  return (
                    <div 
                      key={idx} 
                      className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center font-mono font-bold text-xs ${
                        val 
                          ? 'bg-indigo-600 border-indigo-600 text-white scale-110' 
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {val ? '•' : ''}
                    </div>
                  );
                })}
              </div>
              {pinError && (
                <p className="text-[10px] text-rose-600 font-bold text-center animate-pulse">{pinError}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (pinInput.length < 4) {
                      setPinError(null);
                      const newVal = pinInput + num;
                      setPinInput(newVal);
                      if (newVal.length === 4) handleVerifyPin(newVal);
                    }
                  }}
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 active:bg-slate-200 rounded-xl font-bold font-mono text-sm transition-all"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinInput('')}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase transition-all"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pinInput.length < 4) {
                    setPinError(null);
                    const newVal = pinInput + '0';
                    setPinInput(newVal);
                    if (newVal.length === 4) handleVerifyPin(newVal);
                  }
                }}
                className="py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 active:bg-slate-200 rounded-xl font-bold font-mono text-sm transition-all"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase transition-all shadow-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      {isWalkthroughOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="max-w-5xl w-full max-h-[92vh] overflow-y-auto">
            <AppWalkthroughGuide
              activeUser={activeUser}
              onNavigateToTab={(tabId) => {
                setActiveTab(tabId as any);
                setIsWalkthroughOpen(false);
              }}
              onClose={() => setIsWalkthroughOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Onboarding Setup Wizard Overlay */}
      {(isOnboardingOpen || (isLoggedIn && activeUser && activeUser.onboardingCompleted === false)) && (
        <OnboardingWizard
          activeUser={activeUser}
          onComplete={(updatedUser) => {
            setIsOnboardingOpen(false);
            const refreshed = dataStore.getUsers();
            setStaffList(refreshed);
            const idx = refreshed.findIndex(s => s.uid === updatedUser.uid);
            if (idx !== -1) setActiveUserIdx(idx);
            setIsLoggedIn(true);
          }}
          onClose={() => setIsOnboardingOpen(false)}
        />
      )}

      {/* Global Command Palette Modal (Cmd + K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        activeUser={activeUser}
        onNavigateTab={(tabId) => setActiveTab(tabId)}
      />

      </div>
    </AuthLayout>
  );
}
