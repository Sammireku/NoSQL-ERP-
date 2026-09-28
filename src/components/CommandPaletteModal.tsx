import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  ShoppingBag, 
  Users, 
  Package, 
  Coins, 
  FileText, 
  ShieldCheck, 
  Settings, 
  PlusCircle, 
  Upload, 
  Receipt,
  ArrowRight,
  X,
  Building2,
  ListTodo
} from 'lucide-react';
import { dataStore } from '../config/firebase';
import { UserProfile, Product, CustomerProfile } from '../types/erp';
import { TabId } from '../App';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserProfile;
  onNavigateTab: (tabId: TabId) => void;
}

export default function CommandPaletteModal({ isOpen, onClose, activeUser, onNavigateTab }: CommandPaletteModalProps) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);

  useEffect(() => {
    if (isOpen) {
      setProducts(dataStore.getProducts());
      setCustomers(dataStore.getCustomers());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Search shortcuts
  const navigationShortcuts: Array<{ id: TabId; label: string; category: string; icon: any }> = [
    { id: 'builder', label: 'Dashboard & Customizer', category: 'Navigation', icon: Settings },
    { id: 'pos', label: 'POS Terminal & Register', category: 'Sales', icon: ShoppingBag },
    { id: 'inventory', label: 'Inventory Catalog & Stock Levels', category: 'Stock', icon: Package },
    { id: 'procurement', label: 'Procurement, POs & AI Ingestion', category: 'Stock', icon: Receipt },
    { id: 'crm', label: 'CRM & Customer Database', category: 'Sales', icon: Users },
    { id: 'petty_cash', label: 'Petty Cash & Expense Tracking', category: 'Finance', icon: Coins },
    { id: 'financials', label: 'Double-Entry Accounting & Ledger', category: 'Finance', icon: FileText },
    { id: 'hr', label: 'HR Directory & Employee Roles', category: 'Workplace', icon: Users },
    { id: 'tasks', label: 'Tasks & Team Todos', category: 'Workplace', icon: ListTodo },
    { id: 'sysadmin', label: 'System Admin Console & RBAC', category: 'Admin', icon: ShieldCheck }
  ];

  const filteredNav = navigationShortcuts.filter(item => 
    !q || item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
  );

  const filteredProducts = products.filter(p => 
    q && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)))
  ).slice(0, 5);

  const filteredCustomers = customers.filter(c => 
    q && (c.name.toLowerCase().includes(q) || (c.phone && c.phone.toLowerCase().includes(q)) || c.email.toLowerCase().includes(q))
  ).slice(0, 5);

  const handleSelectNav = (tabId: TabId) => {
    onNavigateTab(tabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col">
        {/* Search Header Bar */}
        <div className="p-4 border-b border-slate-150 flex items-center gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input 
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search products, customers, or jump to tab... (ESC to close)"
            className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
          />
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List Area */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 font-sans text-xs">
          {/* Quick Actions Shortcuts */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5 flex items-center justify-between">
              <span>Quick Navigation Jump</span>
              <span className="font-mono text-[9px]">Cmd + K / Ctrl + K</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filteredNav.map(item => {
                const IconComp = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    className="p-2.5 rounded-xl text-left bg-slate-50 hover:bg-indigo-50/60 border border-slate-100 hover:border-indigo-150 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-white text-indigo-600 rounded-lg border border-slate-100 shadow-3xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{item.label}</div>
                        <span className="text-[10px] text-slate-400">{item.category}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Matching Search */}
          {filteredProducts.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-500" />
                <span>Matching Catalog Products ({filteredProducts.length})</span>
              </div>
              <div className="space-y-1">
                {filteredProducts.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => handleSelectNav('inventory')}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{p.sku} • Category: {p.category || 'General'}</div>
                    </div>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      GHS {p.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer CRM Matching Search */}
          {filteredCustomers.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Matching CRM Customers ({filteredCustomers.length})</span>
              </div>
              <div className="space-y-1">
                {filteredCustomers.map(c => (
                  <div 
                    key={c.id}
                    onClick={() => handleSelectNav('crm')}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{c.name}</div>
                      <div className="text-[10px] text-slate-400">{c.phone || c.email}</div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {c.tag || 'Customer'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {q && filteredNav.length === 0 && filteredProducts.length === 0 && filteredCustomers.length === 0 && (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Sparkles className="w-6 h-6 text-slate-300 mx-auto" />
              <div className="text-xs font-bold text-slate-600">No matching results found for "{query}"</div>
              <p className="text-[11px] text-slate-400">Try searching for "POS", "Inventory", "Accounting", or product names.</p>
            </div>
          )}
        </div>

        {/* Command Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-150 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span>Press <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-3xs text-slate-700 font-bold">ESC</kbd> to exit</span>
          </div>
          <div className="flex items-center gap-1 text-indigo-600 font-bold">
            <Sparkles className="w-3 h-3" />
            <span>Tumi Command Palette v2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
