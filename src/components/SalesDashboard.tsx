import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  RefreshCw, 
  Globe, 
  Store, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  Search, 
  SlidersHorizontal,
  Receipt,
  Calendar,
  Eye,
  Printer,
  Package,
  Tag,
  BarChart3,
  X,
  User,
  CalendarDays,
  CreditCard,
  Smartphone,
  Coins,
  History,
  Percent,
  RotateCcw,
  Sliders,
  FileSpreadsheet
} from 'lucide-react';
import { UserProfile, POSOrder, POSOrderItem, Product, InventoryLevel } from '../types/erp';
import { dataStore } from '../config/firebase';
import { formatPrice } from '../utils/currency';
import { getProductHistory, ProductHistoryEvent } from '../utils/productHistory';
import { exportToCSV } from '../utils/exportUtils';
import { generateExecutiveSalesPDF } from '../utils/salesPdfReport';
import TransactionInsightsView from './accounting/TransactionInsightsView';

interface SalesDashboardProps {
  activeUser: UserProfile;
  isOnline: boolean;
  toggleNetwork: () => void;
}

export default function SalesDashboard({ activeUser, isOnline, toggleNetwork }: SalesDashboardProps) {
  // WooCommerce Connection Configuration States
  const [wpApiUrl, setWpApiUrl] = useState(() => localStorage.getItem('erp_wp_api_url') || 'https://tumi-shop.co.za');
  const [wpConsumerKey, setWpConsumerKey] = useState(() => localStorage.getItem('erp_wp_consumer_key') || 'ck_f7e9148d28a3910c22bf33d905a611b8');
  const [wpConsumerSecret, setWpConsumerSecret] = useState(() => localStorage.getItem('erp_wp_consumer_secret') || 'cs_a55e2d19b4f9188e7b99c13d8032c510');
  
  // Dashboard Active Tab: 'pos_hub' | 'analytics' | 'payments_discounts' | 'product_history' | 'receipts'
  const [mainTab, setMainTab] = useState<'pos_hub' | 'analytics' | 'payments_discounts' | 'product_history' | 'receipts'>('pos_hub');

  // Core Data States
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryLevel[]>([]);
  const [cart, setCart] = useState<POSOrderItem[]>([]);
  
  // POS Hub Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<'all' | 'physical' | 'online'>('all');
  
  // Sync Engine states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- SALES LOOKUP STATES (Analytics) ---
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'per_item' | 'per_category' | 'per_date'>('per_item');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [itemSortBy, setItemSortBy] = useState<'revenue' | 'quantity' | 'name'>('revenue');
  
  // Date Range filter for Analytics
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // --- PRODUCT HISTORY STATE ---
  const [selectedHistoryProduct, setSelectedReceiptHistoryProduct] = useState<Product | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // --- RECEIPT FINDER SPECIFIC SEARCH FIELDS ---
  const [receiptNoFilter, setReceiptNoFilter] = useState<string>('');
  const [customerNameFilter, setCustomerNameFilter] = useState<string>('');
  const [receiptDateFilter, setReceiptDateFilter] = useState<string>('');
  const [itemFilter, setItemFilter] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<POSOrder | null>(null);

  // Load orders, products, and inventory
  useEffect(() => {
    setOrders(dataStore.getOrders());
    const prods = dataStore.getProducts();
    setProducts(prods);
    setInventory(dataStore.getInventory());
    if (prods.length > 0 && !selectedHistoryProduct) {
      setSelectedReceiptHistoryProduct(prods[0]);
    }
    
    // Auto-save credentials on change
    localStorage.setItem('erp_wp_api_url', wpApiUrl);
    localStorage.setItem('erp_wp_consumer_key', wpConsumerKey);
    localStorage.setItem('erp_wp_consumer_secret', wpConsumerSecret);
  }, [wpApiUrl, wpConsumerKey, wpConsumerSecret]);

  // Handle local POS cart checkout
  const handleAddToBag = (prod: Product) => {
    const existing = cart.find(item => item.productId === prod.id);
    if (existing) {
      setCart(cart.map(item => item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { productId: prod.id, name: prod.name, price: prod.price, quantity: 1 }]);
    }
  };

  const handleUpdateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter(item => item.productId !== productId));
    } else {
      setCart(cart.map(item => item.productId === productId ? { ...item, quantity: qty } : item));
    }
  };

  const handlePOSCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderId = 'pos-' + Math.floor(100000 + Math.random() * 900000);

    const newOrder: POSOrder = {
      id: orderId,
      items: cart,
      totalAmount: totalAmount,
      cashierId: activeUser.uid,
      cashierName: activeUser.name,
      status: 'completed',
      offline: !isOnline,
      createdAt: new Date().toISOString(),
      ai_fraud_flag: false,
      paymentMethod: 'cash'
    };

    // Deduct stock levels and save
    cart.forEach(item => {
      dataStore.updateStockLevel(item.productId, -item.quantity);
      
      // Log audit
      dataStore.logAudit(
        activeUser.uid,
        activeUser.name,
        activeUser.role,
        'UPDATE',
        `prod_${item.productId}`,
        `Sold -${item.quantity} units of ${item.name} at POS Register (Order #${orderId})`
      );
    });
    setInventory(dataStore.getInventory());

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    
    // Save locally
    const currentOrders = dataStore.getOrders();
    currentOrders.unshift(newOrder);
    localStorage.setItem('erp_sandbox_pos_orders', JSON.stringify(currentOrders));

    // Post to Double-Entry General Ledger
    try {
      const doubleEntry = dataStore.getDoubleEntry();
      doubleEntry.unshift({
        id: 'je_' + Date.now() + '_pos',
        date: new Date().toISOString(),
        description: `POS Retail Cash Checkout - Order #${orderId}`,
        debitAccount: '1010' as any,
        creditAccount: '4010' as any,
        amount: totalAmount,
        createdBy: activeUser.name,
        verified: true,
        category: 'operating'
      } as any);
      localStorage.setItem('erp_sandbox_double_entry', JSON.stringify(doubleEntry));
    } catch (err) {
      console.error(err);
    }

    setCart([]);
    setProducts(dataStore.getProducts());
    setSuccessMsg(`✓ Sale #${orderId} successfully logged! Stock counts auto-adjusted and revenue posted to Ledger.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // WooCommerce Sync Engine Simulation
  const handleTriggerWPSync = () => {
    setIsSyncing(true);
    setSyncLogs([]);

    const logStep = (msg: string, delay: number) => {
      setTimeout(() => {
        setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
      }, delay);
    };

    logStep(`🔌 Initiating WooCommerce REST API connection handshake to ${wpApiUrl}...`, 100);
    logStep(`🔑 Authorizing credentials (CK: ${wpConsumerKey.slice(0, 6)}... CS: ${wpConsumerSecret.slice(0, 6)}...)...`, 400);
    logStep(`📦 Reading physical product levels from local ERP inventory database...`, 800);
    logStep(`⬆ Synchronizing physical stock counts for WooCommerce SKUs...`, 1300);
    logStep(`📥 Fetching pending online orders from WooCommerce online shop...`, 1800);

    setTimeout(() => {
      const order1Id = 'wc-' + Math.floor(10000 + Math.random() * 90000);
      const order2Id = 'wc-' + Math.floor(10000 + Math.random() * 90000);

      const onlineOrders: POSOrder[] = [
        {
          id: order1Id,
          items: [
            { productId: 'prod_1', name: 'Wireless Pro Mouse', price: 49.99, quantity: 2 }
          ],
          totalAmount: 99.98,
          cashierId: 'woocommerce_bot',
          cashierName: 'WordPress WooCommerce API',
          status: 'synced',
          offline: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          ai_fraud_flag: false,
          paymentMethod: 'card'
        },
        {
          id: order2Id,
          items: [
            { productId: 'prod_2', name: 'Ergonomic Executive Desk', price: 299.99, quantity: 1 }
          ],
          totalAmount: 299.99,
          cashierId: 'woocommerce_bot',
          cashierName: 'WordPress WooCommerce API',
          status: 'synced',
          offline: false,
          createdAt: new Date().toISOString(),
          ai_fraud_flag: false,
          paymentMethod: 'card'
        }
      ];

      const currentOrders = dataStore.getOrders();
      const newToInsert = onlineOrders.filter(oo => !currentOrders.some(co => co.id === oo.id));
      
      if (newToInsert.length > 0) {
        newToInsert.forEach(oo => {
          oo.items.forEach(item => {
            dataStore.updateStockLevel(item.productId, -item.quantity);
          });

          const doubleEntry = dataStore.getDoubleEntry();
          doubleEntry.unshift({
            id: 'je_' + Date.now() + '_wc_' + oo.id,
            date: oo.createdAt,
            description: `WooCommerce Online Sync Sale - Order #${oo.id}`,
            debitAccount: '1020' as any,
            creditAccount: '4010' as any,
            amount: oo.totalAmount,
            createdBy: 'WooCommerce Sync Bot',
            verified: true,
            category: 'operating'
          } as any);
          localStorage.setItem('erp_sandbox_double_entry', JSON.stringify(doubleEntry));
        });

        const mergedOrders = [...newToInsert, ...currentOrders];
        localStorage.setItem('erp_sandbox_pos_orders', JSON.stringify(mergedOrders));
        setOrders(mergedOrders);
        setProducts(dataStore.getProducts());

        logStep(`📥 Pulled online order #${order1Id} from WordPress (Total: ${formatPrice(99.98)}). Stock level adjusted.`, 2200);
        logStep(`📥 Pulled online order #${order2Id} from WordPress (Total: ${formatPrice(299.99)}). Stock level adjusted.`, 2500);
      } else {
        logStep(`ℹ WooCommerce online sales are already up-to-date. No new sales to import.`, 2300);
      }

      logStep(`✨ Live synchronization completed! WooCommerce catalog synced & ERP sales tracker updated.`, 3000);

      setTimeout(() => {
        setIsSyncing(false);
        setSuccessMsg("✓ Physical and Online Shops are now fully synchronized! Online sales loaded into database.");
        setTimeout(() => setSuccessMsg(null), 4000);
      }, 3200);

    }, 2000);
  };

  // --- PAYMENT METHOD BREAKDOWN ---
  const paymentBreakdown = useMemo(() => {
    let cashSum = 0, cashCount = 0;
    let momoSum = 0, momoCount = 0;
    let cardSum = 0, cardCount = 0;
    let billedSum = 0, billedCount = 0;

    orders.forEach(o => {
      const pm = (o.paymentMethod || '').toLowerCase();
      const isOnline = o.cashierId === 'woocommerce_bot';
      const isBilled = (o as any).billedToAccount || pm === 'room_folio' || pm === 'billed_to_account';

      if (isBilled) {
        billedSum += o.totalAmount;
        billedCount += 1;
      } else if (pm === 'momo' || pm === 'mobile_money') {
        momoSum += o.totalAmount;
        momoCount += 1;
      } else if (pm === 'card' || pm === 'stripe' || pm === 'stripe_terminal' || isOnline) {
        cardSum += o.totalAmount;
        cardCount += 1;
      } else {
        // Cash default
        cashSum += o.totalAmount;
        cashCount += 1;
      }
    });

    return {
      cash: { total: cashSum, count: cashCount },
      momo: { total: momoSum, count: momoCount },
      card: { total: cardSum, count: cardCount },
      billed: { total: billedSum, count: billedCount }
    };
  }, [orders]);

  // --- DISCOUNTS OVERVIEW SUMMARY ---
  const discountsOverview = useMemo(() => {
    let totalDiscountGranted = 0;
    let discountedOrdersCount = 0;
    let percentDiscountCount = 0;
    let cashDiscountCount = 0;
    const discountedOrdersList: Array<{
      order: POSOrder;
      discountAmount: number;
      discountType: string;
      discountValue: number;
    }> = [];

    orders.forEach(o => {
      const amt = o.discountAmount || 0;
      if (amt > 0) {
        totalDiscountGranted += amt;
        discountedOrdersCount += 1;
        if (o.discountType === 'percent') {
          percentDiscountCount += 1;
        } else {
          cashDiscountCount += 1;
        }
        discountedOrdersList.push({
          order: o,
          discountAmount: amt,
          discountType: o.discountType || 'cash',
          discountValue: o.discountValue || amt
        });
      }
    });

    return {
      totalDiscountGranted,
      discountedOrdersCount,
      percentDiscountCount,
      cashDiscountCount,
      discountedOrdersList
    };
  }, [orders]);

  // --- FILTERED ORDERS FOR POS HUB LOG ---
  const filteredPOSOrders = useMemo(() => {
    return orders.filter(o => {
      const isOnlineSale = o.cashierId === 'woocommerce_bot';
      if (filterChannel === 'physical' && isOnlineSale) return false;
      if (filterChannel === 'online' && !isOnlineSale) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const matchesSearch = o.id.toLowerCase().includes(q) ||
                            o.cashierName.toLowerCase().includes(q) ||
                            (o.customerName && o.customerName.toLowerCase().includes(q)) ||
                            o.items.some(item => item.name.toLowerCase().includes(q));
      return matchesSearch;
    });
  }, [orders, filterChannel, searchQuery]);

  // Overall KPI Metrics
  const totalPOSSales = orders.filter(o => o.cashierId !== 'woocommerce_bot').reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOnlineSales = orders.filter(o => o.cashierId === 'woocommerce_bot').reduce((sum, o) => sum + o.totalAmount, 0);
  const totalRevenue = totalPOSSales + totalOnlineSales;

  // --- DATE-FILTERED ORDERS FOR ANALYTICS LOOKUPS ---
  const dateFilteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return orders.filter(o => {
      const orderDateObj = new Date(o.createdAt);
      const orderDateStr = orderDateObj.toISOString().split('T')[0];

      if (datePreset === 'today') {
        return orderDateStr === todayStr;
      }
      if (datePreset === 'yesterday') {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        return orderDateStr === yest.toISOString().split('T')[0];
      }
      if (datePreset === '7days') {
        const diffDays = (now.getTime() - orderDateObj.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (datePreset === '30days') {
        const diffDays = (now.getTime() - orderDateObj.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      if (datePreset === 'custom') {
        if (customStartDate && orderDateStr < customStartDate) return false;
        if (customEndDate && orderDateStr > customEndDate) return false;
        return true;
      }
      return true; // 'all'
    });
  }, [orders, datePreset, customStartDate, customEndDate]);

  // --- SALES PER ITEM CALCULATIONS ---
  const salesPerItemData = useMemo(() => {
    const itemMap = new Map<string, {
      id: string;
      name: string;
      sku: string;
      category: string;
      quantitySold: number;
      revenue: number;
      avgPrice: number;
    }>();

    dateFilteredOrders.forEach(order => {
      order.items.forEach(item => {
        const key = item.productId || item.name;
        const matchedProd = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.name.toLowerCase());
        const cat = matchedProd?.category || 'General Products';
        const sku = matchedProd?.sku || 'N/A';

        const existing = itemMap.get(key) || {
          id: key,
          name: item.name,
          sku: sku,
          category: cat,
          quantitySold: 0,
          revenue: 0,
          avgPrice: item.price
        };

        existing.quantitySold += item.quantity;
        existing.revenue += (item.price * item.quantity);
        itemMap.set(key, existing);
      });
    });

    let list = Array.from(itemMap.values());

    if (itemSearchQuery.trim()) {
      const q = itemSearchQuery.toLowerCase().trim();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }

    if (selectedCategoryFilter !== 'all') {
      list = list.filter(i => i.category.toLowerCase() === selectedCategoryFilter.toLowerCase());
    }

    list.sort((a, b) => {
      if (itemSortBy === 'quantity') return b.quantitySold - a.quantitySold;
      if (itemSortBy === 'name') return a.name.localeCompare(b.name);
      return b.revenue - a.revenue;
    });

    return list;
  }, [dateFilteredOrders, products, itemSearchQuery, selectedCategoryFilter, itemSortBy]);

  // --- SALES PER CATEGORY CALCULATIONS ---
  const salesPerCategoryData = useMemo(() => {
    const catMap = new Map<string, {
      category: string;
      revenue: number;
      unitsSold: number;
      ordersCount: Set<string>;
    }>();

    dateFilteredOrders.forEach(order => {
      order.items.forEach(item => {
        const matchedProd = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.name.toLowerCase());
        const cat = matchedProd?.category || 'General Products';

        const existing = catMap.get(cat) || {
          category: cat,
          revenue: 0,
          unitsSold: 0,
          ordersCount: new Set<string>()
        };

        existing.revenue += (item.price * item.quantity);
        existing.unitsSold += item.quantity;
        existing.ordersCount.add(order.id);
        catMap.set(cat, existing);
      });
    });

    const list = Array.from(catMap.values()).map(c => ({
      category: c.category,
      revenue: c.revenue,
      unitsSold: c.unitsSold,
      ordersCount: c.ordersCount.size
    }));

    list.sort((a, b) => b.revenue - a.revenue);
    return list;
  }, [dateFilteredOrders, products]);

  // --- SALES PER DATE BREAKDOWN ---
  const salesPerDateData = useMemo(() => {
    const dateMap = new Map<string, {
      date: string;
      revenue: number;
      ordersCount: number;
      itemsCount: number;
    }>();

    dateFilteredOrders.forEach(order => {
      const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
      const itemsInOrder = order.items.reduce((s, i) => s + i.quantity, 0);

      const existing = dateMap.get(dateStr) || {
        date: dateStr,
        revenue: 0,
        ordersCount: 0,
        itemsCount: 0
      };

      existing.revenue += order.totalAmount;
      existing.ordersCount += 1;
      existing.itemsCount += itemsInOrder;
      dateMap.set(dateStr, existing);
    });

    const list = Array.from(dateMap.values());
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [dateFilteredOrders]);

  // --- DEDICATED RECEIPT FINDER SEARCH ---
  const searchedReceipts = useMemo(() => {
    return orders.filter(order => {
      if (receiptNoFilter.trim()) {
        const queryNo = receiptNoFilter.toLowerCase().trim();
        if (!order.id.toLowerCase().includes(queryNo)) return false;
      }

      if (customerNameFilter.trim()) {
        const queryCust = customerNameFilter.toLowerCase().trim();
        const custName = order.customerName || '';
        const cashierName = order.cashierName || '';
        if (!custName.toLowerCase().includes(queryCust) && !cashierName.toLowerCase().includes(queryCust)) {
          return false;
        }
      }

      if (receiptDateFilter.trim()) {
        const orderDateStr = new Date(order.createdAt).toISOString().split('T')[0];
        if (orderDateStr !== receiptDateFilter.trim()) return false;
      }

      if (itemFilter.trim()) {
        const queryItem = itemFilter.toLowerCase().trim();
        const hasMatchingItem = order.items.some(it => 
          it.name.toLowerCase().includes(queryItem) || 
          it.productId.toLowerCase().includes(queryItem)
        );
        if (!hasMatchingItem) return false;
      }

      return true;
    });
  }, [orders, receiptNoFilter, customerNameFilter, receiptDateFilter, itemFilter]);

  // Handle Print Thermal Receipt
  const handlePrintReceipt = (order: POSOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const dateStr = new Date(order.createdAt || Date.now()).toLocaleString();
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>POS Receipt - Order #${order.id}</title>
          <style>
            body { font-family: monospace; width: 320px; padding: 15px; margin: 0 auto; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 10px 0; }
            .item-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
            .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">TUMI ENTERPRISE ERP STORE</div>
          <div class="center" style="font-size: 11px;">Accra / Kumasi Hub, Ghana</div>
          <div class="line"></div>
          <div style="font-size: 11px;">
            <div>Receipt ID: #${order.id}</div>
            <div>Date: ${dateStr}</div>
            <div>Customer: ${order.customerName || 'Walk-In Customer'}</div>
            <div>Cashier: ${order.cashierName}</div>
          </div>
          <div class="line"></div>
          ${order.items.map(item => `
            <div class="item-row">
              <span>${item.name} x${item.quantity}</span>
              <span>${formatPrice(item.price * item.quantity)}</span>
            </div>
          `).join('')}
          <div class="line"></div>
          <div class="total-row">
            <span>TOTAL PAID:</span>
            <span>${formatPrice(order.totalAmount)}</span>
          </div>
          <div class="line"></div>
          <div class="center" style="font-size: 10px; margin-top: 15px;">
            Thank you for your business!<br/>
            *** OFFICIAL SALES RECEIPT ***
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  // Get list of unique categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set);
  }, [products]);

  // Compute selected product history
  const activeProductHistory = useMemo(() => {
    if (!selectedHistoryProduct) return [];
    return getProductHistory(selectedHistoryProduct);
  }, [selectedHistoryProduct, orders]);

  // Filter products for history selector
  const filteredHistoryProducts = useMemo(() => {
    if (!historySearchQuery.trim()) return products;
    const q = historySearchQuery.toLowerCase().trim();
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, historySearchQuery]);

  // Handle Executive PDF Report Generation
  const handleGeneratePDF = () => {
    const totalRev = totalPOSSales + totalOnlineSales;
    const totalCount = orders.length;

    generateExecutiveSalesPDF({
      generatedBy: `${activeUser.name} (${activeUser.role.toUpperCase()})`,
      generatedDate: new Date().toLocaleString(),
      totalRevenue: totalRev,
      totalPOSSales,
      totalOnlineSales,
      totalOrders: totalCount,
      salesPerItem: salesPerItemData.map(i => ({
        name: i.name,
        sku: i.sku,
        category: i.category,
        quantitySold: i.quantitySold,
        avgPrice: i.avgPrice,
        revenue: i.revenue,
        sharePct: totalRev > 0 ? ((i.revenue / totalRev) * 100).toFixed(1) : '0'
      })),
      salesPerCategory: salesPerCategoryData.map(c => ({
        category: c.category,
        unitsSold: c.unitsSold,
        ordersCount: c.ordersCount,
        revenue: c.revenue,
        sharePct: totalRev > 0 ? ((c.revenue / totalRev) * 100).toFixed(1) : '0'
      })),
      salesPerDate: salesPerDateData.map(d => ({
        date: d.date,
        ordersCount: d.ordersCount,
        itemsCount: d.itemsCount,
        aov: d.ordersCount > 0 ? d.revenue / d.ordersCount : 0,
        revenue: d.revenue
      })),
      paymentBreakdown: {
        cash: { total: paymentBreakdown.cash.total, count: paymentBreakdown.cash.count },
        momo: { total: paymentBreakdown.momo.total, count: paymentBreakdown.momo.count },
        card: { total: paymentBreakdown.card.total, count: paymentBreakdown.card.count },
        billed: { total: paymentBreakdown.billed.total, count: paymentBreakdown.billed.count }
      },
      discountsOverview: {
        totalDiscountGranted: discountsOverview.totalDiscountGranted,
        discountedOrdersCount: discountsOverview.discountedOrdersCount
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              Retail & Wholesale Sales Hub
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {isOnline ? '● Live REST API Connected' : 'Offline Mode'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mt-1 font-sans">Sales, Payment Methods & Product Stock Audit</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track Cash/MoMo/Card/Billed-to sales, analyze discounts, and inspect full product restock & movement timelines.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGeneratePDF}
            className="px-3.5 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Download and share PDF Report</span>
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition-all flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showConfig ? 'Hide WooCommerce Settings' : 'WooCommerce Settings'}</span>
          </button>

          <button
            onClick={handleTriggerWPSync}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Physical & Online</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center border-b border-slate-200 bg-white px-4 pt-3 rounded-2xl gap-2 shadow-2xs">
        <button
          onClick={() => setMainTab('pos_hub')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            mainTab === 'pos_hub'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>POS Register & Live Sales Log</span>
        </button>

        <button
          onClick={() => setMainTab('analytics')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            mainTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span>Sales Lookups (Item, Category, Date)</span>
        </button>

        <button
          onClick={() => setMainTab('payments_discounts')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            mainTab === 'payments_discounts'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Coins className="w-4 h-4 text-amber-600" />
          <span>Payment Methods & Discounts</span>
        </button>

        <button
          onClick={() => setMainTab('product_history')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            mainTab === 'product_history'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4 text-purple-600" />
          <span>Product History & Stock Audit</span>
        </button>

        <button
          onClick={() => setMainTab('receipts')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            mainTab === 'receipts'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4 text-sky-600" />
          <span>Receipt Finder & Invoice Lookup</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* WooCommerce Connection Settings Box */}
      {showConfig && (
        <div className="p-5 bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider">WooCommerce REST API Configuration</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">v3 REST Endpoint</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">WordPress Shop URL</label>
              <input
                type="url"
                value={wpApiUrl}
                onChange={e => setWpApiUrl(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Consumer Key (CK)</label>
              <input
                type="text"
                value={wpConsumerKey}
                onChange={e => setWpConsumerKey(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Consumer Secret (CS)</label>
              <input
                type="password"
                value={wpConsumerSecret}
                onChange={e => setWpConsumerSecret(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>All stock level updates and POS ticket handshakes are encrypted through basic credentials auth.</span>
          </div>
        </div>
      )}

      {/* Sync Connection Logs Terminal */}
      {isSyncing && (
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[10.5px] text-slate-300 space-y-1.5 shadow-inner">
          <p className="text-slate-400 font-bold border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 animate-spin text-sky-400" />
            <span>WooCommerce Sync Engine Terminal Logs:</span>
          </p>
          <div className="max-h-36 overflow-y-auto space-y-1">
            {syncLogs.map((log, i) => (
              <p key={i} className="animate-fade-in">{log}</p>
            ))}
          </div>
        </div>
      )}

      {/* Live Sales KPI Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Physical Shop Revenue</span>
            <span className="text-xl font-extrabold text-slate-800 mt-1 block">{formatPrice(totalPOSSales)}</span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
              <Store className="w-3 h-3 text-slate-400" /> In-Store Checkout Registers
            </span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Store className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Online Store Sales</span>
            <span className="text-xl font-extrabold text-slate-800 mt-1 block">{formatPrice(totalOnlineSales)}</span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
              <Globe className="w-3 h-3 text-sky-500 animate-pulse" /> Live REST API Streamed
            </span>
          </div>
          <div className="p-3 bg-sky-50 rounded-xl">
            <Globe className="w-5 h-5 text-sky-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Combined Gross Sales</span>
            <span className="text-xl font-extrabold text-slate-800 mt-1 block">{formatPrice(totalRevenue)}</span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" /> Consolidated Sales Tracker
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: POS REGISTER & LIVE ORDERS LOG */}
      {/* ========================================================================= */}
      {mainTab === 'pos_hub' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Live Register Checkout (7 Columns) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-indigo-600" /> Active Register Checkout
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Select catalog items to add to cart</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {products.map(prod => {
                const invItem = inventory.find(i => i.productId === prod.id || i.sku === prod.sku);
                const quantity = invItem ? invItem.stockLevel : 10;
                return (
                  <button
                    key={prod.id}
                    onClick={() => handleAddToBag(prod)}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-left transition-all flex flex-col justify-between hover:border-indigo-300"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">{prod.name}</span>
                        <span className="text-[9px] font-mono text-slate-400 font-bold uppercase shrink-0">{prod.sku}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{prod.category}</span>
                    </div>

                    <div className="flex items-end justify-between pt-2.5 border-t border-slate-200/50 mt-2 w-full">
                      <span className="text-xs font-mono font-black text-slate-700">{formatPrice(prod.price)}</span>
                      <span className={`text-[10px] font-bold font-sans ${quantity <= 5 ? 'text-rose-600' : 'text-slate-500'}`}>
                        Stock: {quantity} units
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Cart items list */}
            {cart.length > 0 && (
              <form onSubmit={handlePOSCheckout} className="border-t border-slate-100 pt-4 space-y-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Shopping Cart Items</span>
                <div className="divide-y divide-slate-100 max-h-[180px] overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.productId} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{formatPrice(item.price)} each</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.productId, item.quantity - 1)}
                            className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-black"
                          >
                            -
                          </button>
                          <span className="px-2.5 font-bold font-mono text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.productId, item.quantity + 1)}
                            className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-black"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-mono font-bold text-slate-700 w-20 text-right">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart Footer */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Total Checkout Cost:</span>
                    <span className="text-lg font-mono font-black text-slate-800 block">
                      {formatPrice(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 uppercase tracking-wider"
                  >
                    ✓ Complete Cash Checkout
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* RIGHT: Live Sales Tracker Log (5 Columns) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Consolidated Sales Tracker Log
              </h3>
              
              <div className="flex gap-1.5">
                <select
                  value={filterChannel}
                  onChange={e => setFilterChannel(e.target.value as any)}
                  className="p-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-600 focus:outline-none"
                >
                  <option value="all">All Channels</option>
                  <option value="physical">🏢 Physical Store</option>
                  <option value="online">🌐 WordPress Sync</option>
                </select>
              </div>
            </div>

            {/* Search box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search sales transactions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredPOSOrders.length === 0 ? (
                <p className="text-center text-slate-400 italic text-xs py-8">No transaction logs match search filters.</p>
              ) : (
                filteredPOSOrders.map(order => {
                  const isOnlineSale = order.cashierId === 'woocommerce_bot';
                  return (
                    <div key={order.id} className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl space-y-2 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-slate-800 text-[11px]">#{order.id}</span>
                          <span className="text-[9px] text-slate-400 block font-mono">{new Date(order.createdAt).toLocaleString()}</span>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-slate-800 text-xs block">{formatPrice(order.totalAmount || 0)}</span>
                          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                            isOnlineSale 
                              ? 'bg-sky-50 text-sky-700 border border-sky-100' 
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          }`}>
                            {isOnlineSale ? <Globe className="w-2.5 h-2.5" /> : <Store className="w-2.5 h-2.5" />}
                            {isOnlineSale ? 'Online Sale' : 'Physical POS'}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-200/50 pt-1.5 text-[11px] text-slate-600">
                        <p className="font-semibold text-[10px] text-slate-400 uppercase tracking-wide">Sold Items:</p>
                        <div className="space-y-0.5 mt-0.5">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span>{it.name} <strong className="text-slate-700">x{it.quantity}</strong></span>
                              <span className="font-mono font-medium">{formatPrice(it.price * it.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SALES LOOKUPS (PER ITEM, PER CATEGORY, SPECIFIC DATES) */}
      {/* ========================================================================= */}
      {mainTab === 'analytics' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          
          {/* Controls Bar: Sub-tabs & Date Presets */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            
            {/* Sub-tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setAnalyticsSubTab('per_item')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  analyticsSubTab === 'per_item' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Sales Per Item</span>
              </button>

              <button
                onClick={() => setAnalyticsSubTab('per_category')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  analyticsSubTab === 'per_category' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Sales Per Category</span>
              </button>

              <button
                onClick={() => setAnalyticsSubTab('per_date')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  analyticsSubTab === 'per_date' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Sales On Specific Dates</span>
              </button>
            </div>

            {/* Date Preset Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Timeframe:</span>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                {(['all', 'today', 'yesterday', '7days', '30days', 'custom'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setDatePreset(p)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      datePreset === p ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    {p === 'all' ? 'All Time' : p === '7days' ? '7 Days' : p === '30days' ? '30 Days' : p}
                  </button>
                ))}
              </div>

              {/* Custom Date Range Inputs */}
              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700"
                  />
                  <span className="text-slate-400 font-bold">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700"
                  />
                </div>
              )}
            </div>

          </div>

          {/* SUB-VIEW 1: SALES PER ITEM */}
          {analyticsSubTab === 'per_item' && (
            <div className="space-y-4">
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by product name, SKU, or category..."
                    value={itemSearchQuery}
                    onChange={e => setItemSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Category:</span>
                  <select
                    value={selectedCategoryFilter}
                    onChange={e => setSelectedCategoryFilter(e.target.value)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value="all">All Categories ({categoriesList.length})</option>
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <span className="text-[10px] font-bold uppercase text-slate-400 ml-2">Sort By:</span>
                  <select
                    value={itemSortBy}
                    onChange={e => setItemSortBy(e.target.value as any)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value="revenue">💰 Total Revenue (High to Low)</option>
                    <option value="quantity">📦 Quantity Sold (High to Low)</option>
                    <option value="name">🔤 Product Name (A-Z)</option>
                  </select>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                      <th className="py-3 px-4">Product / Item Name</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Units Sold</th>
                      <th className="py-3 px-4 text-right">Avg Unit Price</th>
                      <th className="py-3 px-4 text-right">Total Revenue</th>
                      <th className="py-3 px-4 text-right">% Sales Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {salesPerItemData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 italic">
                          No product sales records found for this filter/timeframe.
                        </td>
                      </tr>
                    ) : (
                      salesPerItemData.map((item, idx) => {
                        const totalPeriodRev = salesPerItemData.reduce((s, i) => s + i.revenue, 0);
                        const share = totalPeriodRev > 0 ? ((item.revenue / totalPeriodRev) * 100).toFixed(1) : '0';

                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800">{item.name}</td>
                            <td className="py-3 px-4 font-mono text-[10px] text-slate-500 uppercase">{item.sku}</td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600">
                              {item.quantitySold} units
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600">
                              {formatPrice(item.avgPrice)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-slate-800">
                              {formatPrice(item.revenue)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                              {share}%
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* SUB-VIEW 2: SALES PER CATEGORY */}
          {analyticsSubTab === 'per_category' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {salesPerCategoryData.map(cat => {
                  const totalCatRev = salesPerCategoryData.reduce((s, c) => s + c.revenue, 0);
                  const sharePct = totalCatRev > 0 ? ((cat.revenue / totalCatRev) * 100).toFixed(1) : '0';

                  return (
                    <button
                      key={cat.category}
                      onClick={() => {
                        setSelectedCategoryFilter(cat.category);
                        setAnalyticsSubTab('per_item');
                      }}
                      className="p-4 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-left space-y-2 group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">{cat.category}</span>
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                      </div>

                      <div>
                        <span className="text-lg font-mono font-extrabold text-slate-900 block">
                          {formatPrice(cat.revenue)}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-sans">
                          {cat.unitsSold} units sold ({cat.ordersCount} orders)
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                        <div 
                          className="bg-indigo-600 h-full rounded-full" 
                          style={{ width: `${Math.min(100, parseFloat(sharePct))}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-emerald-600 block text-right">
                        {sharePct}% of Total Sales
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                      <th className="py-3 px-4">Product Category</th>
                      <th className="py-3 px-4 text-center">Unique Orders</th>
                      <th className="py-3 px-4 text-center">Total Units Sold</th>
                      <th className="py-3 px-4 text-right">Gross Category Revenue</th>
                      <th className="py-3 px-4 text-right">% Contribution</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {salesPerCategoryData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                          No category revenue recorded for selected period.
                        </td>
                      </tr>
                    ) : (
                      salesPerCategoryData.map((cat, idx) => {
                        const totalCatRev = salesPerCategoryData.reduce((s, c) => s + c.revenue, 0);
                        const share = totalCatRev > 0 ? ((cat.revenue / totalCatRev) * 100).toFixed(1) : '0';

                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{cat.category}</span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                              {cat.ordersCount} orders
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600">
                              {cat.unitsSold} units
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                              {formatPrice(cat.revenue)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                              {share}%
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedCategoryFilter(cat.category);
                                  setAnalyticsSubTab('per_item');
                                }}
                                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[10px] rounded-lg transition-all"
                              >
                                View Items →
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* SUB-VIEW 3: SALES ON SPECIFIC DATES */}
          {analyticsSubTab === 'per_date' && (
            <div className="space-y-6">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                      <th className="py-3 px-4">Transaction Date</th>
                      <th className="py-3 px-4 text-center">Completed Orders</th>
                      <th className="py-3 px-4 text-center">Total Quantity Sold</th>
                      <th className="py-3 px-4 text-right">Average Order Value (AOV)</th>
                      <th className="py-3 px-4 text-right">Daily Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {salesPerDateData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 italic">
                          No sales recorded on the selected dates.
                        </td>
                      </tr>
                    ) : (
                      salesPerDateData.map((d, idx) => {
                        const aov = d.ordersCount > 0 ? d.revenue / d.ordersCount : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-800 flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{d.date}</span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                              {d.ordersCount} orders
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600">
                              {d.itemsCount} items
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600">
                              {formatPrice(aov)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                              {formatPrice(d.revenue)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PAYMENT METHODS & DISCOUNTS OVERVIEW */}
      {/* ========================================================================= */}
      {mainTab === 'payments_discounts' && (
        <div className="space-y-6">
          
          {/* Payment Method Cards */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Sales Revenue By Payment Channel
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Cash */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-emerald-600" /> Cash Register Sales
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full font-mono">
                    {paymentBreakdown.cash.count} orders
                  </span>
                </div>
                <span className="text-xl font-mono font-extrabold text-slate-900 block">
                  {formatPrice(paymentBreakdown.cash.total)}
                </span>
                <p className="text-[10px] text-slate-500">In-store physical tender & float</p>
              </div>

              {/* MoMo */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-amber-600" /> Mobile Money (MoMo)
                  </span>
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full font-mono">
                    {paymentBreakdown.momo.count} orders
                  </span>
                </div>
                <span className="text-xl font-mono font-extrabold text-slate-900 block">
                  {formatPrice(paymentBreakdown.momo.total)}
                </span>
                <p className="text-[10px] text-slate-500">MTN MoMo, Telecel Cash & AT Money</p>
              </div>

              {/* Card / Credit */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Credit Card / Stripe
                  </span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full font-mono">
                    {paymentBreakdown.card.count} orders
                  </span>
                </div>
                <span className="text-xl font-mono font-extrabold text-slate-900 block">
                  {formatPrice(paymentBreakdown.card.total)}
                </span>
                <p className="text-[10px] text-slate-500">Stripe Terminal & WooCommerce Online</p>
              </div>

              {/* Billed To */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-rose-600" /> Billed To / Folio Account
                  </span>
                  <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full font-mono">
                    {paymentBreakdown.billed.count} orders
                  </span>
                </div>
                <span className="text-xl font-mono font-extrabold text-slate-900 block">
                  {formatPrice(paymentBreakdown.billed.total)}
                </span>
                <p className="text-[10px] text-slate-500">Room Folio, Payroll, Student Trench</p>
              </div>

            </div>
          </div>

          {/* Discounts Overview Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-indigo-600" /> Overview on Discounts Given
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consolidated tracking of promotional markdowns, flat cash discounts, and customer concessions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-center">
                  <span className="text-[9px] uppercase font-bold text-indigo-400 block">Total Discounts Granted</span>
                  <span className="text-sm font-mono font-black text-indigo-900">{formatPrice(discountsOverview.totalDiscountGranted)}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl text-center">
                  <span className="text-[9px] uppercase font-bold text-emerald-600 block">Discounted Sales</span>
                  <span className="text-sm font-mono font-black text-emerald-900">{discountsOverview.discountedOrdersCount} orders</span>
                </div>
              </div>
            </div>

            {/* Discounted Orders List Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-3 px-4">Receipt ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Discount Type</th>
                    <th className="py-3 px-4 text-right">Discount Amount</th>
                    <th className="py-3 px-4 text-right">Net Final Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {discountsOverview.discountedOrdersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                        No promotional discounts have been applied to sales yet.
                      </td>
                    </tr>
                  ) : (
                    discountsOverview.discountedOrdersList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 text-[11px]">#{item.order.id}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {new Date(item.order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {item.order.customerName || 'Walk-In Customer'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            {item.discountType === 'percent' ? `${item.discountValue}% Off` : 'Flat Cash'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                          -{formatPrice(item.discountAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          {formatPrice(item.order.totalAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PRODUCT STOCK HISTORY & AUDIT TIMELINE */}
      {/* ========================================================================= */}
      {mainTab === 'product_history' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" /> Complete Product Stock Movement History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect when an item was restocked, how many were added, each sale, each refund, and all stock adjustments.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Product Selector List (4 columns) */}
            <div className="lg:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Select Catalog Product:</span>
              
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter products..."
                  value={historySearchQuery}
                  onChange={e => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
                {filteredHistoryProducts.map(p => {
                  const inv = inventory.find(i => i.productId === p.id);
                  const stock = inv ? inv.stockLevel : 10;
                  const isSelected = selectedHistoryProduct?.id === p.id;

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedReceiptHistoryProduct(p)}
                      className={`w-full p-3 rounded-xl text-left border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-white hover:bg-slate-100/70 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs line-clamp-1">{p.name}</p>
                        <p className={`text-[10px] font-mono ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                          SKU: {p.sku}
                        </p>
                      </div>

                      <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {stock} in stock
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Complete Product Timeline (8 columns) */}
            <div className="lg:col-span-8 space-y-4">
              {selectedHistoryProduct ? (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4">
                  
                  {/* Product Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          {selectedHistoryProduct.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">SKU: {selectedHistoryProduct.sku}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedHistoryProduct.name}</h3>
                    </div>

                    <div className="bg-white border border-slate-200 p-3 rounded-xl text-right shrink-0">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Price & Stock</span>
                      <span className="text-sm font-mono font-black text-slate-900 block">
                        {formatPrice(selectedHistoryProduct.price)} | {
                          inventory.find(i => i.productId === selectedHistoryProduct.id)?.stockLevel || 0
                        } Units
                      </span>
                    </div>
                  </div>

                  {/* Audit Timeline Feed */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Chronological Stock Movement Audit Feed ({activeProductHistory.length} events)
                    </span>

                    {activeProductHistory.map(evt => {
                      const isRestock = evt.type === 'restock';
                      const isSale = evt.type === 'sale';
                      const isRefund = evt.type === 'refund';

                      return (
                        <div 
                          key={evt.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                            isRestock ? 'bg-emerald-50/60 border-emerald-200' :
                            isSale ? 'bg-indigo-50/60 border-indigo-200' :
                            isRefund ? 'bg-amber-50/60 border-amber-200' :
                            'bg-slate-100/60 border-slate-200'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded ${
                                isRestock ? 'bg-emerald-600 text-white' :
                                isSale ? 'bg-indigo-600 text-white' :
                                isRefund ? 'bg-amber-600 text-white' :
                                'bg-slate-600 text-white'
                              }`}>
                                {evt.type.toUpperCase()}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-slate-700">{evt.referenceId}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(evt.timestamp).toLocaleString()}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-slate-800">{evt.details}</p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Authorized by / Client: <strong className="text-slate-700">{evt.userOrCustomer}</strong>
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`font-mono text-sm font-black block ${
                              evt.quantityChange > 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                              {evt.quantityChange > 0 ? `+${evt.quantityChange}` : `${evt.quantityChange}`} Units
                            </span>
                            {evt.unitPrice && (
                              <span className="text-[10px] font-mono text-slate-500 block">
                                @ {formatPrice(evt.unitPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              ) : (
                <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold">No Product Selected</p>
                  <p className="text-[10px]">Select a product from the left catalog panel to view full restock, sale, and refund history.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DEDICATED RECEIPT FINDER & INVOICE LOOKUP */}
      {/* ========================================================================= */}
      {mainTab === 'receipts' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" /> Dedicated Receipt & Invoice Finder
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instantly find receipts based on Receipt Number, Customer Name, Specific Date, or Items Purchased.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  1. Receipt Number / ID
                </label>
                <div className="relative">
                  <Receipt className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. pos-100234 or wc-12345"
                    value={receiptNoFilter}
                    onChange={e => setReceiptNoFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  2. Customer Name / Cashier
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Amma Konadu, Walk-in..."
                    value={customerNameFilter}
                    onChange={e => setCustomerNameFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  3. Transaction Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={receiptDateFilter}
                    onChange={e => setReceiptDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  4. Item / Product Purchased
                </label>
                <div className="relative">
                  <Package className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Mouse, Uniform, Sewing Machine..."
                    value={itemFilter}
                    onChange={e => setItemFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

            </div>

            {(receiptNoFilter || customerNameFilter || receiptDateFilter || itemFilter) && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setReceiptNoFilter('');
                    setCustomerNameFilter('');
                    setReceiptDateFilter('');
                    setItemFilter('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Clear All Search Filters
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <div className="lg:col-span-8 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-3 px-4">Receipt ID</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Items Included</th>
                    <th className="py-3 px-4 text-right">Total Paid</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {searchedReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                        No receipts match your specific search criteria. Try clearing search inputs.
                      </td>
                    </tr>
                  ) : (
                    searchedReceipts.map(order => {
                      const dateObj = new Date(order.createdAt);
                      const displayDate = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                      const displayTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600 text-[11px]">#{order.id}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-700 block">{displayDate}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{displayTime}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block">
                              {order.customerName || 'Walk-In Customer'}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">Cashier: {order.cashierName}</span>
                          </td>
                          <td className="py-3 px-4 max-w-[200px]">
                            <span className="font-semibold text-slate-700 block truncate">
                              {order.items.map(it => `${it.name} (x${it.quantity})`).join(', ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{order.items.length} line item(s)</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                            {formatPrice(order.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedReceipt(order)}
                                className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-md transition-colors"
                                title="View Full Receipt Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintReceipt(order)}
                                className="p-1.5 hover:bg-slate-100 hover:text-slate-800 text-slate-500 rounded-md transition-colors"
                                title="Reprint Receipt / Invoice"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-4">
              {selectedReceipt ? (
                <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-400" /> Receipt Details
                    </h3>
                    <button 
                      type="button"
                      onClick={() => setSelectedReceipt(null)}
                      className="text-slate-400 hover:text-slate-100 font-bold text-xs"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-300 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Reference:</span>
                      <span className="font-mono font-bold text-indigo-400">#{selectedReceipt.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date & Time:</span>
                      <span className="font-mono">{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Processed By:</span>
                      <span className="font-semibold">{selectedReceipt.cashierName}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
                    <p className="font-bold text-slate-400">Customer profile:</p>
                    <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      {selectedReceipt.customerName || 'Walk-In Cash Customer'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Line Items</p>
                    <div className="divide-y divide-slate-800 border-t border-b border-slate-800 py-1 max-h-48 overflow-y-auto pr-1">
                      {selectedReceipt.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-2 text-xs">
                          <div>
                            <span className="text-slate-300 font-medium block">{item.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{formatPrice(item.price)} x {item.quantity}</span>
                          </div>
                          <span className="text-slate-200 font-bold font-mono">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between text-white font-extrabold text-sm border-t border-slate-800 pt-3">
                    <span>Total Amount Paid:</span>
                    <span className="font-mono text-emerald-400">{formatPrice(selectedReceipt.totalAmount)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(selectedReceipt)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Thermal Receipt / Invoice</span>
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-2">
                  <Receipt className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
                  <p className="text-xs font-semibold">No Receipt Selected</p>
                  <p className="text-[10px] max-w-[200px] mx-auto">Click the eye icon next to any receipt row to preview full invoice details.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
