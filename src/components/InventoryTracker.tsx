import React, { useState, useEffect } from 'react';
import { 
  Database, 
  AlertTriangle, 
  Edit3, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  DollarSign,
  Package,
  X,
  Plus,
  Minus,
  Briefcase,
  Loader2,
  ChevronDown,
  ArrowRightLeft,
  ShoppingBag,
  Clock
} from 'lucide-react';
import { Product, InventoryLevel, UserProfile, PurchaseOrder } from '../types/erp';
import { dataStore } from '../config/firebase';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { exportToCSV } from '../utils/exportUtils';

interface InventoryTrackerProps {
  activeUser: UserProfile;
}

export default function InventoryTracker({ activeUser }: InventoryTrackerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const handleExportCSV = () => {
    const headers = ['Product ID', 'Product Name', 'SKU', 'Category', 'Unit Price', 'Stock Level', 'Safety Reorder Point'];
    const rows = products.map(p => {
      const inv = dbInventory.find(i => i.productId === p.id);
      return [
        p.id,
        p.name,
        p.sku,
        p.category,
        p.price,
        inv ? inv.stockLevel : 0,
        inv ? inv.ai_reorder_point : 5
      ];
    });
    exportToCSV('warehouse_inventory_export.csv', headers, rows);
  };
  
  // Interactive editing states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editSKU, setEditSKU] = useState('');
  const [editThreshold, setEditThreshold] = useState('');

  // Interactive product creation states
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSKU, setNewProdSKU] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdImageUrl, setNewProdImageUrl] = useState('');
  
  // Variant lists
  const [newProdVariants, setNewProdVariants] = useState<Array<{ id: string; sku: string; color?: string; size?: string; stock: number; priceAdjustment?: number }>>([]);
  const [varColor, setVarColor] = useState('');
  const [varSize, setVarSize] = useState('');
  const [varStock, setVarStock] = useState('10');
  const [varPriceAdj, setVarPriceAdj] = useState('0');

  // WordPress Synchronization settings states
  const [isSyncingWithWordpress, setIsSyncingWithWordpress] = useState(false);
  const [wordpressSyncLog, setWordpressSyncLog] = useState<string[]>([]);
  const [wpApiUrl, setWpApiUrl] = useState('https://mywordpress-store.com');
  const [wpConsumerKey, setWpConsumerKey] = useState('ck_1234567890abcdef...');
  const [wpConsumerSecret, setWpConsumerSecret] = useState('cs_abcdef1234567890...');
  const [showWpConfig, setShowWpConfig] = useState(false);

  // Restock modal states
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('10');
  const [restockPrice, setRestockPrice] = useState('');
  
  // Security blocked state
  const [blockedEdit, setBlockedEdit] = useState<{
    path: string;
    authRole: string;
    actionAttempted: string;
  } | null>(null);

  // Sync toast state
  const [syncToast, setSyncToast] = useState<{ show: boolean; count: number; timestamp: string } | null>(null);

  // Use our high-performance debounced and paginated query hook
  const { 
    data: dbInventory, 
    loading: dbLoading, 
    hasMore, 
    loadMore 
  } = useFirestoreQuery<InventoryLevel>({ pageSize: 4, debounceMs: 200 });

  useEffect(() => {
    setProducts(dataStore.getProducts());
    setPurchaseOrders(dataStore.getPurchaseOrders());

    const unsubProducts = dataStore.subscribeToCollection('products', () => {
      setProducts(dataStore.getProducts());
    });

    const unsubPOs = dataStore.subscribeToCollection('purchase_orders', () => {
      setPurchaseOrders(dataStore.getPurchaseOrders());
    });

    const handleOfflineSynced = (e: any) => {
      const count = e.detail?.syncedCount || 0;
      if (count > 0) {
        setSyncToast({ show: true, count, timestamp: new Date().toLocaleTimeString() });
        setTimeout(() => setSyncToast(null), 6000);
      }
    };
    window.addEventListener('offline-queue-synced', handleOfflineSynced);

    return () => {
      unsubProducts();
      unsubPOs();
      window.removeEventListener('offline-queue-synced', handleOfflineSynced);
    };
  }, []);

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    setEditPrice(p.price.toString());
    setEditSKU(p.sku);
    const inv = dbInventory.find(i => i.productId === p.id);
    setEditThreshold(inv ? inv.ai_reorder_point.toString() : '5');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const newPrice = parseFloat(editPrice) || editingProduct.price;
    const newSKU = editSKU.trim() || editingProduct.sku;
    const newThreshold = parseInt(editThreshold, 10) || 5;

    try {
      dataStore.updateProductPriceAndSKU(editingProduct.id, newSKU, newPrice, activeUser);
      dataStore.updateReorderPoint(editingProduct.id, newThreshold, activeUser);
      setEditingProduct(null);
    } catch (err: any) {
      // Revert & show RBAC blocked dialog
      try {
        const errorDetails = JSON.parse(err.message);
        setBlockedEdit({
          path: errorDetails.path,
          authRole: errorDetails.authInfo.role,
          actionAttempted: `Modify Catalog Specs & Thresholds (SKU: ${newSKU}, Price: $${newPrice}, Threshold: ${newThreshold})`
        });
      } catch (e) {
        console.error("Failed to parse edit security error:", err);
      }
    }
  };

  const adjustStock = (prodId: string, amount: number) => {
    dataStore.updateStockLevel(prodId, amount);
    const prod = products.find(p => p.id === prodId);
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      amount > 0 ? 'RESTOCK' : 'UPDATE',
      `Inventory Stock: ${prod?.name || prodId}`,
      `${amount > 0 ? 'Increased' : 'Decreased'} stock count manually by ${Math.abs(amount)} unit(s).`
    );
  };

  const handleRestockClick = (p: Product) => {
    setRestockProduct(p);
    setRestockQty('10');
    setRestockPrice(p.price.toString());
  };

  const handleSaveRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;

    const qtyToAdd = parseInt(restockQty, 10);
    const newPrice = parseFloat(restockPrice);

    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      alert("Please enter a valid positive quantity to add.");
      return;
    }
    if (isNaN(newPrice) || newPrice <= 0) {
      alert("Please enter a valid positive retail price.");
      return;
    }

    try {
      // 1. Add stock level
      dataStore.updateStockLevel(restockProduct.id, qtyToAdd);

      // 2. Adjust catalog price if modified
      if (newPrice !== restockProduct.price) {
        dataStore.updateProductPriceAndSKU(restockProduct.id, restockProduct.sku, newPrice, activeUser);
      }

      // 3. Log Audit Trail event
      dataStore.logAudit(
        activeUser.uid,
        activeUser.name,
        activeUser.role,
        'RESTOCK',
        `Inventory & Catalog: ${restockProduct.name}`,
        `Restocked +${qtyToAdd} units. Price updated to $${newPrice.toFixed(2)}.`
      );

      setRestockProduct(null);
    } catch (err: any) {
      try {
        const errorDetails = JSON.parse(err.message);
        setBlockedEdit({
          path: errorDetails.path,
          authRole: errorDetails.authInfo.role,
          actionAttempted: `Restock item & adjust retail catalog price (Qty: +${qtyToAdd}, Price: $${newPrice.toFixed(2)})`
        });
      } catch (e) {
        console.error("Restock error:", err);
        alert(err.message || "An error occurred during restocking.");
      }
    }
  };

  // Automated Purchase Order generation based on safety threshold triggers
  const handleGeneratePOs = () => {
    const lowStockItems = products.filter(product => {
      const inv = dbInventory.find(i => i.productId === product.id);
      if (!inv) return false;
      return inv.stockLevel <= inv.ai_reorder_point;
    });

    if (lowStockItems.length === 0) {
      alert("No low stock items detected. Warehouse inventory counts are above defined thresholds.");
      return;
    }

    // Map low stock products to proposed PO items
    const poItems = lowStockItems.map(product => {
      const inv = dbInventory.find(i => i.productId === product.id);
      const reorderPt = inv ? inv.ai_reorder_point : 5;
      const quantityToOrder = reorderPt * 2 + 15; // standard bulk formula
      
      // Wholesale unit price (typically 50% discount off standard retail catalog listing)
      const wholesalePrice = Number((product.price * 0.55).toFixed(2));

      return {
        productId: product.id,
        name: product.name,
        quantity: quantityToOrder,
        wholesalePrice: wholesalePrice
      };
    });

    const totalCost = poItems.reduce((sum, item) => sum + (item.wholesalePrice * item.quantity), 0);

    const newPO: PurchaseOrder = {
      id: 'po-' + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toISOString(),
      status: 'proposed',
      items: poItems,
      totalCost: Number(totalCost.toFixed(2)),
      approvedBy: null
    };

    const updatedPOs = [newPO, ...purchaseOrders];
    dataStore.savePurchaseOrders(updatedPOs);
    setPurchaseOrders(updatedPOs);
  };

  // Rotate Procurement state: Proposed -> Approved -> Received
  const handleUpdatePOStatus = (poId: string, targetStatus: 'approved' | 'received') => {
    const updatedPOs = purchaseOrders.map(po => {
      if (po.id !== poId) return po;

      const updated = { ...po, status: targetStatus };
      if (targetStatus === 'approved') {
        updated.approvedBy = activeUser.name;
      }

      // If status shifts to RECEIVED, fulfill quantities to actual database stock
      if (targetStatus === 'received') {
        po.items.forEach(item => {
          dataStore.updateStockLevel(item.productId, item.quantity);
        });
      }

      return updated;
    });

    dataStore.savePurchaseOrders(updatedPOs);
    setPurchaseOrders(updatedPOs);
  };

  // WordPress WooCommerce REST API integration simulation handler
  const handleWordpressSync = () => {
    setIsSyncingWithWordpress(true);
    setWordpressSyncLog([]);

    const logStep = (msg: string, delay: number) => {
      setTimeout(() => {
        setWordpressSyncLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
      }, delay);
    };

    logStep(`🔌 Connecting to WordPress REST API v3 at ${wpApiUrl}...`, 200);
    logStep(`🔑 Authenticating with WooCommerce credentials (Consumer Key: ${wpConsumerKey.slice(0, 8)}...)...`, 600);
    logStep(`📁 Querying WordPress WooCommerce Product Catalog listings...`, 1200);
    logStep(`🔍 Matching local SKU codes with WooCommerce catalog ids...`, 1800);

    setTimeout(() => {
      // Perform local update to dataStore marking all products as synced
      const nowStr = new Date().toLocaleString();
      const updatedProducts = products.map((prod, index) => {
        const wpId = prod.wordpressId || (1020 + index).toString();
        const updated = {
          ...prod,
          wordpressId: wpId,
          wordpressSyncStatus: 'synced' as const,
          wordpressLastSynced: nowStr
        };
        // Update inside dataStore
        dataStore.updateProductPriceAndSKU(prod.id, prod.sku, prod.price, activeUser);
        // We'll also update the mock dataStore's internal product sync attributes
        const dsProd = dataStore.getProducts().find(p => p.id === prod.id);
        if (dsProd) {
          dsProd.wordpressId = wpId;
          dsProd.wordpressSyncStatus = 'synced';
          dsProd.wordpressLastSynced = nowStr;
        }
        return updated;
      });

      setProducts(updatedProducts);
      
      logStep(`✓ Product 'Wireless Pro Mouse' successfully synced with WooCommerce ID #1020.`, 2200);
      logStep(`✓ Product 'Ergonomic Desk' successfully synced with WooCommerce ID #1021.`, 2500);
      logStep(`✨ Sync Complete! Successfully pushed inventory stock counts and pulled catalog details from your WordPress site.`, 3000);

      setTimeout(() => {
        setIsSyncingWithWordpress(false);
        // Trigger generic sync toast
        setSyncToast({ show: true, count: products.length, timestamp: new Date().toLocaleTimeString() });
        setTimeout(() => setSyncToast(null), 4000);
      }, 3400);

    }, 2000);
  };

  const handleAddVariant = () => {
    if (!varColor.trim() && !varSize.trim()) {
      alert("Please enter a color or size for this product variant.");
      return;
    }
    const colorLabel = varColor.trim() ? varColor.trim() : '';
    const sizeLabel = varSize.trim() ? varSize.trim() : '';
    const skuLabel = `${newProdSKU.trim().toUpperCase()}-${colorLabel.slice(0, 2).toUpperCase()}-${sizeLabel.toUpperCase()}`;

    const newVar = {
      id: 'var_' + Date.now() + Math.random().toString().slice(-3),
      sku: skuLabel,
      color: colorLabel || undefined,
      size: sizeLabel || undefined,
      stock: parseInt(varStock, 10) || 0,
      priceAdjustment: parseFloat(varPriceAdj) || 0
    };

    setNewProdVariants([...newProdVariants, newVar]);
    setVarColor('');
    setVarSize('');
    setVarStock('10');
    setVarPriceAdj('0');
  };

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdSKU.trim() || !newProdPrice.trim()) {
      alert("All fields are required to register a new product.");
      return;
    }

    const priceNum = parseFloat(newProdPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Please provide a valid unit price.");
      return;
    }

    const newProduct: Product = {
      id: 'prod_' + Math.floor(1000 + Math.random() * 9000),
      name: newProdName.trim(),
      sku: newProdSKU.trim().toUpperCase(),
      price: priceNum,
      category: newProdCategory,
      imageUrl: newProdImageUrl.trim() || undefined,
      variants: newProdVariants.length > 0 ? newProdVariants : undefined,
      wordpressSyncStatus: 'unsynced'
    };

    try {
      dataStore.createProduct(newProduct, activeUser);
      setIsCreateProductModalOpen(false);
      setNewProdName('');
      setNewProdSKU('');
      setNewProdPrice('');
      setNewProdCategory('Hardware');
      setNewProdImageUrl('');
      setNewProdVariants([]);
    } catch (err: any) {
      try {
        const errorDetails = JSON.parse(err.message);
        setBlockedEdit({
          path: errorDetails.path,
          authRole: errorDetails.authInfo.role,
          actionAttempted: `Introduce Product Profile (SKU: ${newProduct.sku}, Name: ${newProduct.name}, Price: $${newProduct.price})`
        });
      } catch (e) {
        console.error("Failed to parse create product security error:", err);
      }
    }
  };

  return (
    <div className="space-y-6 relative" id="inventory_tracker_module">
      {/* Visual Toast Notification for Offline Sync */}
      {syncToast && syncToast.show && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3.5 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span>Firestore Offline Sync Complete</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">SUCCESS</span>
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Successfully synced <strong>{syncToast.count} offline transaction(s)</strong> to Firestore database at {syncToast.timestamp}!
            </p>
          </div>
          <button 
            onClick={() => setSyncToast(null)} 
            className="ml-3 text-slate-400 hover:text-white font-bold p-1 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>
      )}
      {/* Title section */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm font-sans">Warehouse Catalog & Procurement Systems</h2>
            <p className="text-xs text-slate-500">Live inventory levels tracked against safety thresholds with automatic bulk PO generators.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(activeUser.role === 'manager' || activeUser.role === 'ceo' || activeUser.role === 'sysadmin') && (
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Export CSV</span>
            </button>
          )}
          <button
            onClick={() => setShowWpConfig(!showWpConfig)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 border ${
              showWpConfig 
                ? 'bg-sky-100 border-sky-300 text-sky-800' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <span>🌐 WordPress Sync</span>
          </button>
          {(activeUser.role === 'ceo' || activeUser.role === 'manager' || activeUser.role === 'sysadmin' || activeUser.role === 'warehouse') && (
            <button
              onClick={() => setIsCreateProductModalOpen(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Add Catalog Product</span>
            </button>
          )}
          <button
            onClick={handleGeneratePOs}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Generate PO for Low Stock</span>
          </button>
        </div>
      </div>

      {/* WORDPRESS WOOCOMMERCE SYNC CONFIGURATION PANEL */}
      {showWpConfig && (
        <div className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg">⚡</span>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-white">WooCommerce WordPress Product Sync</h3>
                <p className="text-[10px] text-slate-400">Establish direct real-time product catalogs and stock count syncing</p>
              </div>
            </div>
            <button
              onClick={() => setShowWpConfig(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">WordPress Site URL</label>
              <input
                type="url"
                value={wpApiUrl}
                onChange={e => setWpApiUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">WooCommerce Consumer Key</label>
              <input
                type="text"
                value={wpConsumerKey}
                onChange={e => setWpConsumerKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">WooCommerce Consumer Secret</label>
              <input
                type="password"
                value={wpConsumerSecret}
                onChange={e => setWpConsumerSecret(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col md:flex-row gap-4 items-stretch justify-between">
            <div className="flex-1 bg-slate-950 p-3 rounded-lg border border-slate-800/80 min-h-[100px] flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                  Live Sync Connection Logs:
                </p>
                {wordpressSyncLog.length === 0 ? (
                  <p className="text-[11px] text-slate-600 italic">No sync run started. Hit 'Trigger Sync' to connect to WooCommerce...</p>
                ) : (
                  <div className="space-y-1 font-mono text-[10px] text-slate-300 max-h-24 overflow-y-auto">
                    {wordpressSyncLog.map((log, i) => (
                      <p key={i}>{log}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full md:w-64 bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Active Inventory Sync Status</p>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                  <span className="text-xs font-bold text-sky-400">REST API Ready</span>
                </div>
                <p className="text-[9px] text-slate-500">Pressing sync registers local items directly on WooCommerce & merges online orders.</p>
              </div>

              <button
                type="button"
                disabled={isSyncingWithWordpress}
                onClick={handleWordpressSync}
                className="w-full mt-3 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 animate-pulse"
              >
                {isSyncingWithWordpress ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing WooCommerce...</span>
                  </>
                ) : (
                  <>
                    <span>🔄 Trigger WooCommerce Live Sync</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog & Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="p-4">SKU / Catalog Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Unit Price</th>
                <th className="p-4 text-center">Stock Level</th>
                <th className="p-4">Safety Threshold</th>
                <th className="p-4">Reorder Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="p-3 bg-slate-100 text-slate-400 rounded-full mb-3">
                        <Package className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-700">No Inventory Products Registered</h4>
                      <p className="text-xs text-slate-400 mt-1 mb-4">Your catalog is currently empty. Add your first item to begin tracking stock levels.</p>
                      {(activeUser.role === 'ceo' || activeUser.role === 'manager' || activeUser.role === 'sysadmin' || activeUser.role === 'warehouse') ? (
                        <button
                          onClick={() => setIsCreateProductModalOpen(true)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Product</span>
                        </button>
                      ) : (
                        <p className="text-xs text-rose-500 font-bold">Product addition is restricted to CEO, Managers, and Inventory Managers.</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map(product => {
                  // Find matching level from our paginated, debounced subscription state
                  const inv = dbInventory.find(i => i.productId === product.id);
                  
                  // If it is loaded, display it. Otherwise show a loading placeholder
                  const loaded = !!inv;
                  const stock = inv ? inv.stockLevel : 0;
                  const reorderPt = inv ? inv.ai_reorder_point : 5;
                  const isLowStock = stock <= reorderPt;

                  return (
                    <tr 
                      key={product.id} 
                      className={`transition-colors ${
                        isLowStock && loaded 
                          ? 'bg-rose-50/50 hover:bg-rose-100/50 border-l-4 border-l-rose-500' 
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{product.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="font-mono text-[9px] text-slate-400 bg-slate-50 px-1 rounded border border-slate-100 font-semibold">{product.sku}</span>
                            
                            {/* WordPress WooCommerce sync status indicators */}
                            {product.wordpressId ? (
                              <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                WooCommerce #{product.wordpressId}
                              </span>
                            ) : (
                              <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                                Not Synced
                              </span>
                            )}
                          </div>

                          {/* Render variants summary list if present */}
                          {product.variants && product.variants.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              <span className="text-[8px] uppercase tracking-wider font-bold text-indigo-500">Variants:</span>
                              {product.variants.map((v) => (
                                <span 
                                  key={v.id} 
                                  className="text-[8px] font-semibold bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded border border-indigo-100/50"
                                  title={`SKU: ${v.sku} | Initial Stock: ${v.stock}`}
                                >
                                  {v.color || ''} {v.size ? `(${v.size})` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded font-medium">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="p-4">
                      {loaded ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => adjustStock(product.id, -1)}
                            className="p-1 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 rounded transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`font-mono font-bold w-10 text-center text-sm ${
                            isLowStock 
                              ? 'text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded' 
                              : 'text-slate-800'
                          }`}>
                            {stock}
                          </span>
                          <button 
                            onClick={() => adjustStock(product.id, 1)}
                            className="p-1 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 rounded transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 font-mono text-[11px] italic">
                          (Page Limit...)
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-700">
                      {loaded ? (
                        <div className="flex items-center space-x-1">
                          <span>{reorderPt} units</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {!loaded ? (
                        <span className="text-[10px] text-slate-400 italic">Not loaded in view</span>
                      ) : isLowStock ? (
                        <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit uppercase tracking-wider">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Low Stock Warning
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" /> Optimal Count
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleEditClick(product)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Edit Price, SKU & Threshold"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRestockClick(product)}
                          className="py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200 transition-all flex items-center gap-1"
                          title="Restock Item & Update Pricing"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Restock</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Pagination actions bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>
            Showing <span className="text-slate-800 font-bold">{dbInventory.length}</span> of <span className="text-slate-800 font-bold">{products.length}</span> warehouse stock profiles.
          </div>
          
          <div className="flex items-center gap-2">
            {dbLoading && (
              <span className="flex items-center gap-1.5 text-indigo-600 font-mono text-[11px] animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> syncing...
              </span>
            )}
            
            {hasMore ? (
              <button
                onClick={loadMore}
                disabled={dbLoading}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
              >
                <span>Fetch Next Page Cursors</span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
            ) : (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg font-bold font-mono text-[11px]">
                ✓ All cursors in sync
              </span>
            )}
          </div>
        </div>
      </div>

      {/* PROCUREMENT & PURCHASE ORDERS WORKSPACE */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Replenishment & Purchase Orders Ledger</h3>
        </div>

        {purchaseOrders.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-2">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold">No active Purchase Orders found</p>
            <p className="text-[10px] text-slate-400 leading-normal max-w-sm mx-auto">
              Click <strong>"Generate PO for Low Stock"</strong> above to scan warehouse deficits and formulate replenishment transactions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchaseOrders.map((po) => (
              <div 
                key={po.id} 
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-4 ${
                  po.status === 'received' 
                    ? 'bg-slate-50 border-slate-200/80 text-slate-500' 
                    : po.status === 'approved'
                    ? 'bg-indigo-50/20 border-indigo-100 text-slate-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block font-mono">ID: {po.id}</span>
                      <span className="text-[10px] text-slate-400 block">{new Date(po.createdAt).toLocaleString()}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded uppercase font-mono ${
                      po.status === 'received' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : po.status === 'approved'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {po.status}
                    </span>
                  </div>

                  {/* PO Items summary lists */}
                  <div className="mt-3.5 space-y-1 pt-3 border-t border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider mb-1">Replenishment Items</span>
                    {po.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[10px] leading-relaxed">
                        <span className="font-semibold text-slate-700 truncate max-w-[180px]">{item.name}</span>
                        <span className="font-mono text-slate-500">
                          Qty: <strong>{item.quantity}</strong> @ ${item.wholesalePrice.toFixed(2)} (whsle)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3.5 border-t border-slate-100/60 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Total PO cost</span>
                    <strong className="text-xs font-mono font-bold text-slate-800">${po.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {po.status === 'proposed' && (
                      <button
                        onClick={() => handleUpdatePOStatus(po.id, 'approved')}
                        disabled={activeUser.role !== 'manager' && activeUser.role !== 'ceo' && activeUser.role !== 'sysadmin'}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-2.5 py-1 rounded text-[10px] transition-all"
                      >
                        Authorize & Pay PO
                      </button>
                    )}
                    {po.status === 'approved' && (
                      <button
                        onClick={() => handleUpdatePOStatus(po.id, 'received')}
                        disabled={activeUser.role !== 'manager' && activeUser.role !== 'ceo' && activeUser.role !== 'sysadmin'}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-2.5 py-1 rounded text-[10px] transition-all"
                      >
                        Mark Goods Received
                      </button>
                    )}
                    {po.status === 'received' && (
                      <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> INVENTORY FULFILLED
                      </span>
                    )}
                  </div>
                </div>

                {po.status !== 'received' && activeUser.role !== 'manager' && activeUser.role !== 'ceo' && activeUser.role !== 'sysadmin' && (
                  <span className="text-[9px] text-amber-600 italic leading-none pt-1">
                    * Authorization requires Active Manager or CEO profile switch.
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Editor Form Drawer Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form 
            onSubmit={handleSaveProduct} 
            className="bg-white rounded-xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in fade-in zoom-in duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Modify Product Specs</h3>
              <button type="button" onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500">Product Name:</p>
              <p className="text-sm font-bold text-slate-800">{editingProduct.name}</p>
            </div>

             <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">SKU Number</label>
                <input 
                  type="text" 
                  value={editSKU} 
                  onChange={e => setEditSKU(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Unit Price ($)</label>
                <input 
                  type="text" 
                  value={editPrice} 
                  onChange={e => setEditPrice(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Safety stock threshold (low stock alarm)</label>
                <input 
                  type="number" 
                  value={editThreshold} 
                  onChange={e => setEditThreshold(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-3 flex space-x-2">
              <button 
                type="submit" 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-semibold animate-all"
              >
                Save Specs
              </button>
              <button 
                type="button" 
                onClick={() => setEditingProduct(null)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE NEW PRODUCT MODAL */}
      {isCreateProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
          <form 
            onSubmit={handleCreateProductSubmit} 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-lg w-full space-y-5 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>Register New Product Profile</span>
              </h3>
              <button type="button" onClick={() => setIsCreateProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Basic Specs */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide border-b pb-1">Product Specifications</h4>
                
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Product Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Wireless Pro Mouse"
                    value={newProdName} 
                    onChange={e => setNewProdName(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">SKU Code / ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. PROD_MS_09"
                    value={newProdSKU} 
                    onChange={e => setNewProdSKU(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Retail Price ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={newProdPrice} 
                      onChange={e => setNewProdPrice(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Category</label>
                    <input 
                      type="text"
                      placeholder="e.g. Electronics"
                      value={newProdCategory} 
                      onChange={e => setNewProdCategory(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                {/* Product Image Selection & Input */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase">Product Image URL</label>
                  <input 
                    type="text"
                    placeholder="Paste URL or click preset below..."
                    value={newProdImageUrl} 
                    onChange={e => setNewProdImageUrl(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  
                  {/* Preset quick selection images with referrerPolicy */}
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Preset Assets:</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewProdImageUrl('https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200&auto=format&fit=crop&q=60')}
                        className="p-1 border border-slate-200 rounded hover:border-indigo-500 hover:bg-indigo-50 text-[9px] font-semibold text-slate-600 truncate flex-1"
                      >
                        🖱️ Tech Mouse
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewProdImageUrl('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=60')}
                        className="p-1 border border-slate-200 rounded hover:border-indigo-500 hover:bg-indigo-50 text-[9px] font-semibold text-slate-600 truncate flex-1"
                      >
                        🎧 Headphones
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewProdImageUrl('https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=60')}
                        className="p-1 border border-slate-200 rounded hover:border-indigo-500 hover:bg-indigo-50 text-[9px] font-semibold text-slate-600 truncate flex-1"
                      >
                        👟 Sneakers
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Variants Configuration */}
              <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide border-b pb-1">Product Variants (Sizes/Colors)</h4>
                
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-0.5">Color Option</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Red, Black"
                      value={varColor}
                      onChange={e => setVarColor(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-0.5">Size Option</label>
                    <input 
                      type="text" 
                      placeholder="e.g. XL, Medium, 12"
                      value={varSize}
                      onChange={e => setVarSize(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-0.5">Initial Stock</label>
                    <input 
                      type="number" 
                      value={varStock}
                      onChange={e => setVarStock(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-0.5">Price Adjust ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="+0.00"
                      value={varPriceAdj}
                      onChange={e => setVarPriceAdj(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  ➕ Add Variant Specs
                </button>

                {/* Display Current Added Variants list */}
                {newProdVariants.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Registered Variants ({newProdVariants.length}):</p>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 border border-slate-200/60 rounded p-1 bg-white">
                      {newProdVariants.map((v, i) => (
                        <div key={v.id} className="text-[10px] text-slate-600 bg-slate-50 p-1 rounded flex justify-between items-center border border-slate-100">
                          <span className="truncate max-w-[120px]">
                            {v.color && <span className="bg-slate-200 text-slate-700 px-1 rounded mr-0.5">{v.color}</span>}
                            {v.size && <span className="bg-indigo-100 text-indigo-700 px-1 rounded">{v.size}</span>}
                          </span>
                          <span className="font-mono text-[9px] text-slate-500">
                            Qty: {v.stock} | Adj: {v.priceAdjustment >= 0 ? `+$${v.priceAdjustment}` : `-$${Math.abs(v.priceAdjustment || 0)}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setNewProdVariants(newProdVariants.filter((_, idx) => idx !== i))}
                            className="text-red-500 hover:text-red-700 ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 flex space-x-2 border-t border-slate-100">
              <button 
                type="submit" 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-semibold"
              >
                Register Product Profile
              </button>
              <button 
                type="button" 
                onClick={() => setIsCreateProductModalOpen(false)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {restockProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-40 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Restock Inventory Product</h3>
              <button onClick={() => setRestockProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRestock} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-1">
                <p className="font-bold text-slate-700 text-xs">{restockProduct.name}</p>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>SKU: {restockProduct.sku}</span>
                  <span>Retail Price: ${restockProduct.price.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Quantity of new stock to add</label>
                <input 
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Update unit catalog retail price ($)</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={restockPrice}
                  onChange={(e) => setRestockPrice(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 block">Managers can update catalog prices directly during replenishment.</span>
              </div>

              <div className="pt-2 flex space-x-2">
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-semibold transition-all shadow-md shadow-indigo-500/10"
                >
                  Confirm Restock
                </button>
                <button 
                  type="button" 
                  onClick={() => setRestockProduct(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECURITY BLOCK ALERTS */}
      {blockedEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-rose-100 shadow-2xl p-6 relative">
            <button 
              onClick={() => setBlockedEdit(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Security Policy Denied Edit</h3>
                <p className="text-[10px] text-rose-600 font-bold uppercase font-mono">CODE: PERMISSION_DENIED</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                <p className="text-slate-600">
                  Write mutation on catalog documents is secured strictly against non-managers.
                </p>
                <div className="text-[11px] space-y-1 pt-2 border-t border-slate-100 font-mono">
                  <p><span className="text-slate-400 font-sans">Role used:</span> <span className="font-bold text-rose-600 capitalize">{blockedEdit.authRole}</span></p>
                  <p><span className="text-slate-400 font-sans">Path:</span> {blockedEdit.path}</p>
                  <p><span className="text-slate-400 font-sans">Action:</span> {blockedEdit.actionAttempted}</p>
                </div>
              </div>

              <div className="bg-slate-950 text-emerald-400 font-mono text-[10px] p-4 rounded-lg leading-relaxed">
                <p className="text-slate-500">// Rule matches on product nodes</p>
                <p>match /products/&#123;productId&#125; &#123;</p>
                <p>&nbsp;&nbsp;allow read: if isAuthenticated();</p>
                <p className="text-rose-400 font-bold">&nbsp;&nbsp;allow write: if isManager(); // Denied here</p>
                <p>&#125;</p>
              </div>

              <div className="text-xs text-rose-800 bg-rose-50/50 p-3 rounded border border-rose-100 leading-tight">
                To commit changes to the global products catalog database, you must toggle the active employee profile in the top header to <strong>Sarah Jenkins (Manager)</strong>. Sales and Cashiers are restricted to read-only access.
              </div>

              <button 
                onClick={() => setBlockedEdit(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                Dismiss Policy Notice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
