import React, { useState, useEffect } from 'react';
import { 
  Puzzle, 
  Package, 
  Heart, 
  Building2, 
  Globe, 
  Code2, 
  Copy, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  RefreshCw, 
  ExternalLink, 
  DollarSign, 
  Layers, 
  Smartphone, 
  FileCode, 
  Tag, 
  Database, 
  UserCheck, 
  Download, 
  ShoppingCart, 
  Eye, 
  Zap, 
  Radio, 
  Key, 
  Check, 
  ChevronRight,
  Info
} from 'lucide-react';
import { UserProfile, Product, InventoryLevel } from '../types/erp';
import { dataStore } from '../config/firebase';
import WebDonationPluginModule from './WebDonationPluginModule';
import { exportToCSV } from '../utils/exportUtils';

interface WebsitePluginsHubProps {
  activeUser: UserProfile;
}

export default function WebsitePluginsHub({ activeUser }: WebsitePluginsHubProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'product_catalog' | 'donations' | 'room_booking'>('overview');
  
  // Product Catalog Plugin States
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryLevels, setInventoryLevels] = useState<InventoryLevel[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showStockBadge, setShowStockBadge] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [enableDirectCheckout, setEnableDirectCheckout] = useState(true);
  const [pluginTheme, setPluginTheme] = useState<'indigo' | 'emerald' | 'dark' | 'amber'>('indigo');
  
  // Shortcode / Code Snippet Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Cart / Direct Order Simulation for Web Product Catalog Widget
  const [simulatedCart, setSimulatedCart] = useState<{ product: Product; qty: number }[]>([]);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Load Products & Inventory
  useEffect(() => {
    setProducts(dataStore.getProducts());
    setInventoryLevels(dataStore.getInventory());
  }, []);

  const handleCopyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const getStockForProduct = (productId: string) => {
    const inv = inventoryLevels.find(i => i.productId === productId);
    return inv ? inv.stockLevel : 0;
  };

  const handleAddToCart = (product: Product) => {
    const existing = simulatedCart.find(c => c.product.id === product.id);
    if (existing) {
      setSimulatedCart(simulatedCart.map(c => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setSimulatedCart([...simulatedCart, { product, qty: 1 }]);
    }
  };

  const handleSimulateWebOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (simulatedCart.length === 0) return;

    // Deduct stock in dataStore
    simulatedCart.forEach(item => {
      dataStore.updateStockLevel(item.product.id, -item.qty);
    });

    // Refresh inventory levels
    setInventoryLevels(dataStore.getInventory());
    const totalVal = simulatedCart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
    
    setOrderSuccessMsg(`Simulated Web Order placed successfully! Value: $${totalVal.toFixed(2)}. Inventory stock updated.`);
    setSimulatedCart([]);
    setTimeout(() => setOrderSuccessMsg(null), 4000);
  };

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category || 'General')))];

  // Colors mapping for live widget theme
  const themeColors = {
    indigo: { primary: 'bg-indigo-600 hover:bg-indigo-700 text-white', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', border: 'border-indigo-500' },
    emerald: { primary: 'bg-emerald-600 hover:bg-emerald-700 text-white', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-emerald-500' },
    dark: { primary: 'bg-slate-900 hover:bg-slate-800 text-white', badge: 'bg-slate-100 text-slate-800 border-slate-300', border: 'border-slate-800' },
    amber: { primary: 'bg-amber-600 hover:bg-amber-700 text-white', badge: 'bg-amber-50 text-amber-800 border-amber-200', border: 'border-amber-500' }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner - Strictly Executive / SysAdmin Only */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-purple-400/30 tracking-wider uppercase flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-purple-300" />
                <span>Restricted Access: System Admin & CEO Only</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-400/30 tracking-wider uppercase flex items-center space-x-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>Web Plugins Live Sync</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
              <Puzzle className="w-7 h-7 text-indigo-400" />
              <span>Website Plugins Control Center</span>
            </h1>

            <p className="text-xs text-slate-300 leading-relaxed">
              Central executive hub for configuring, managing, and embedding external website plugins linked directly to your ERP backend. Deploy shortcodes, iFrames, and public API extensions for live Product Inventory, Web Donations, and Room Bookings.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
              <span className="text-[10px] text-slate-300 font-medium block uppercase tracking-wider">Active Plugins</span>
              <span className="text-xl font-black text-white">3 Modules</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
              <span className="text-[10px] text-slate-300 font-medium block uppercase tracking-wider">Web Catalog Items</span>
              <span className="text-xl font-black text-indigo-300">{products.length} Products</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-300 font-medium block uppercase tracking-wider">Sync Status</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center justify-center space-x-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected</span>
              </span>
            </div>
          </div>
        </div>

        {/* Executive Sub-Navigation Tabs */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Plugins Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('product_catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'product_catalog'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Product Inventory & Catalog Plugin</span>
          </button>

          <button
            onClick={() => setActiveTab('donations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'donations'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Web Donations Module Plugin</span>
          </button>

          <button
            onClick={() => setActiveTab('room_booking')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'room_booking'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Hospitality Room Booking Plugin</span>
          </button>
        </div>
      </div>

      {/* 2. TAB 1: PLUGINS OVERVIEW & INTEGRATION STATUS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Plugin Card 1: Product Inventory & Catalog */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Package className="w-6 h-6" />
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                    Active & Synced
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">Product Inventory & Catalog Plugin</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Embeds your live ERP warehouse stock, product photos, prices, and categories on any external website (WordPress, Webflow, Shopify).
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Shortcode:</span>
                    <span className="font-bold text-indigo-600">[tumi-product-catalog]</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Inventory Sync:</span>
                    <span className="text-emerald-600 font-bold">Real-time bi-directional</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('product_catalog')}
                className="w-full mt-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 border border-indigo-200/80"
              >
                <span>Configure Catalog Plugin</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Plugin Card 2: Web Donations Module */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                    <Heart className="w-6 h-6" />
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                    Active & Synced
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">Tumi Project Web Donation Form Plugin</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Tumi Project website donation widget & form generator. Links project budgets with real-time donor lead capture into Donor CRM & External Database.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Shortcode:</span>
                    <span className="font-bold text-rose-600">[tumi_project_donation_form]</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Ledger Posting:</span>
                    <span className="text-emerald-600 font-bold">Auto General Ledger #1010</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('donations')}
                className="w-full mt-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 border border-rose-200/80"
              >
                <span>Manage Donations Plugin</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Plugin Card 3: Hospitality Room Booking */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                    Active & Synced
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">Hospitality Room Booking Plugin</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Direct public website booking widget for hotel rooms, conference halls, and resort amenities linked with Front Desk PMS.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Shortcode:</span>
                    <span className="font-bold text-emerald-600">[tumi-room-booking]</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">PMS Sync:</span>
                    <span className="text-emerald-600 font-bold">Front Desk Calendar</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('room_booking')}
                className="w-full mt-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 border border-emerald-200/80"
              >
                <span>Manage Hospitality Plugin</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Master API Key & Webhook Endpoint Settings */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-sm">
              <Key className="w-5 h-5" />
              <span>Master Web Plugin API Credentials & Webhook Endpoint</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Public Web Plugin API Endpoint</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-xs text-slate-800">
                  <span className="truncate flex-1">{window.location.origin}/api/plugins/v2/catalog</span>
                  <button
                    onClick={() => handleCopyCode(`${window.location.origin}/api/plugins/v2/catalog`, 'api_url')}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {copiedKey === 'api_url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Secret Plugin Authentication Bearer Token</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-xs text-slate-800">
                  <span className="truncate flex-1">tumi_plugin_sec_9948271038472910</span>
                  <button
                    onClick={() => handleCopyCode('tumi_plugin_sec_9948271038472910', 'bearer')}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {copiedKey === 'bearer' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: PRODUCT INVENTORY & CATALOG PLUGIN */}
      {activeTab === 'product_catalog' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 text-xs text-indigo-600 font-bold mb-1">
                  <Package className="w-4 h-4" />
                  <span>Website Product Catalog Extension</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Product Inventory & Catalog Plugin Configurator</h2>
                <p className="text-xs text-slate-500">Configure how your warehouse products, prices, and live stock levels display on your external website.</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopyCode(`[tumi-product-catalog category="${selectedCategory}" show_stock="${showStockBadge}"]`, 'shortcode_cat')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs transition-all"
                >
                  {copiedKey === 'shortcode_cat' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>Copy Catalog Shortcode</span>
                </button>
              </div>
            </div>

            {/* Plugin Customization Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Filter Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c === 'all' ? 'All Product Categories' : c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Widget Visual Theme</label>
                <select
                  value={pluginTheme}
                  onChange={(e) => setPluginTheme(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="indigo">Indigo Corporate</option>
                  <option value="emerald">Emerald Modern</option>
                  <option value="dark">Dark Luxury</option>
                  <option value="amber">Warm Amber</option>
                </select>
              </div>

              <div className="flex flex-col justify-center space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={showStockBadge}
                    onChange={(e) => setShowStockBadge(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Display Real-time Stock Badge</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Display Unit Price Tag</span>
                </label>
              </div>

              <div className="flex flex-col justify-center space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={enableDirectCheckout}
                    onChange={(e) => setEnableDirectCheckout(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Enable Direct Online Cart & Order</span>
                </label>
              </div>
            </div>

            {/* Embed Snippet Codes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>1. WordPress Shortcode</span>
                  <button
                    onClick={() => handleCopyCode(`[tumi-product-catalog category="${selectedCategory}" show_stock="${showStockBadge}"]`, 'wp_cat')}
                    className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                  >
                    {copiedKey === 'wp_cat' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs border border-slate-800">
                  <code>[tumi-product-catalog category="{selectedCategory}" show_stock="{showStockBadge ? 'true' : 'false'}"]</code>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>2. Universal JavaScript & iFrame Embed</span>
                  <button
                    onClick={() => handleCopyCode(`<iframe src="${window.location.origin}/plugin/catalog" width="100%" height="600" frameborder="0"></iframe>`, 'iframe_cat')}
                    className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                  >
                    {copiedKey === 'iframe_cat' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Code</span>
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs border border-slate-800 truncate">
                  <code>{`<iframe src="${window.location.origin}/plugin/catalog" width="100%" height="600" frameborder="0"></iframe>`}</code>
                </div>
              </div>
            </div>

            {/* LIVE INTERACTIVE WEBSITE PREVIEW WIDGET */}
            <div className="border-2 border-indigo-100 rounded-3xl p-6 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 pl-2">Live Website Preview Widget</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search website products..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none w-48"
                    />
                  </div>
                </div>
              </div>

              {orderSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{orderSuccessMsg}</span>
                </div>
              )}

              {/* Product Grid Widget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {products
                  .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
                  .filter(p => p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || p.sku.toLowerCase().includes(catalogSearch.toLowerCase()))
                  .map((product) => {
                    const stock = getStockForProduct(product.id);
                    return (
                      <div key={product.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between hover:shadow-md transition-all">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {product.sku}
                            </span>
                            {showStockBadge && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                stock > 5 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                stock > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {stock > 0 ? `In Stock (${stock})` : 'Out of Stock'}
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-slate-900">{product.name}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2">{product.description || 'Enterprise quality product catalog item synced live from ERP warehouse.'}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          {showPrice ? (
                            <span className="text-sm font-black text-slate-900">
                              ${product.price.toFixed(2)}
                            </span>
                          ) : <div />}

                          {enableDirectCheckout && (
                            <button
                              disabled={stock <= 0}
                              onClick={() => handleAddToCart(product)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                                stock > 0 
                                  ? themeColors[pluginTheme].primary 
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>{stock > 0 ? 'Add to Cart' : 'Sold Out'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Cart Summary Drawer in Live Preview */}
              {simulatedCart.length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-lg space-y-3 mt-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <ShoppingCart className="w-4 h-4 text-indigo-600" />
                      <span>Simulated Website Visitor Cart ({simulatedCart.reduce((a, b) => a + b.qty, 0)} Items)</span>
                    </span>
                    <button
                      onClick={() => setSimulatedCart([])}
                      className="text-[11px] text-slate-400 hover:text-rose-600"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {simulatedCart.map(item => (
                      <div key={item.product.id} className="text-xs flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                        <div>
                          <span className="font-bold text-slate-800">{item.product.name}</span>
                          <span className="text-[10px] text-slate-500 ml-2">(${item.product.price.toFixed(2)} x {item.qty})</span>
                        </div>
                        <span className="font-bold text-slate-900">${(item.product.price * item.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-700">Total Order Amount:</span>
                    <span className="text-sm font-black text-emerald-600">
                      ${simulatedCart.reduce((sum, i) => sum + (i.product.price * i.qty), 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={handleSimulateWebOrder}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Simulated Web Order & Deduct Stock</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 3: WEB DONATION PLUGIN MODULE */}
      {activeTab === 'donations' && (
        <div className="space-y-4">
          <div className="bg-rose-950/80 rounded-2xl p-4 text-white border border-rose-800/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold">Tumi Project Web Donation Form Plugin</h3>
                <p className="text-xs text-rose-200">Tumi Project website donation widget builder, shortcode generator, project budget tracking, and donor lead capture database.</p>
              </div>
            </div>
            <span className="bg-rose-500/30 text-rose-200 border border-rose-400/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
              Embedded Plugin
            </span>
          </div>

          <WebDonationPluginModule activeUser={activeUser} />
        </div>
      )}

      {/* 5. TAB 4: HOSPITALITY ROOM BOOKING PLUGIN */}
      {activeTab === 'room_booking' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-600 font-bold mb-1">
                <Building2 className="w-4 h-4" />
                <span>Website Hospitality Direct Booking Extension</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Hospitality Room Booking Plugin</h2>
              <p className="text-xs text-slate-500">Public web widget for hotel room reservations, hall rentals, and direct online bookings linked with Front Desk PMS.</p>
            </div>

            <button
              onClick={() => handleCopyCode('[tumi-room-booking theme="emerald"]', 'wp_room')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs transition-all"
            >
              {copiedKey === 'wp_room' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>Copy Shortcode</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-800">1. WordPress Shortcode</span>
              <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs border border-slate-800">
                <code>[tumi-room-booking theme="emerald" allow_online_payment="true"]</code>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-800">2. Website iFrame Code</span>
              <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs border border-slate-800 truncate">
                <code>{`<iframe src="${window.location.origin}/plugin/booking" width="100%" height="550" frameborder="0"></iframe>`}</code>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 text-center space-y-3">
            <Building2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">Front Desk Hospitality Sync Active</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Direct website bookings submitted through this plugin automatically register guest profiles, allocate room availability, and post deposit receipts to your Hospitality Front Desk PMS.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
