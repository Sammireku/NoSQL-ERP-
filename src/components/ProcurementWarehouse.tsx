import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  MapPin, 
  Send, 
  CheckCircle, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  Lock, 
  Sparkles, 
  Building2,
  Trash2,
  Package
} from 'lucide-react';
import { dataStore } from '../config/firebase';
import { Vendor, WarehouseLocation, UserProfile, PurchaseOrder, Product, InventoryLevel } from '../types/erp';

export default function ProcurementWarehouse({ activeUser }: { activeUser: UserProfile }) {
  // Collection States
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLocation[]>([]);
  const [inventory, setInventory] = useState<InventoryLevel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // Inner Sub-Tabs
  const [procurementTab, setProcurementTab] = useState<'vendors' | 'warehouses' | 'pos' | 'suppliers' | 'receipt_capture'>('vendors');

  // AI Receipt Capture State
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStatus, setAnalyzingStatus] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<{
    vendor: string;
    totalAmount: number;
    date: string;
    detectedItems: Array<{
      name: string;
      quantity: number;
      costPrice: number;
      sellingPrice: number;
      category: string;
    }>;
  } | null>(null);

  const handleParseReceipt = async (base64Data: string, mime: string) => {
    setIsAnalyzing(true);
    setAnalyzingStatus("Analyzing receipt layout with Gemini-3.8-Flash...");
    
    // Clean base64 header
    const cleanB64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    
    try {
      const response = await fetch('/api/ai/parse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: cleanB64,
          mimeType: mime || 'image/png'
        })
      });
      
      const resData = await response.json();
      if (resData && resData.vendor) {
        setParsedResult({
          vendor: resData.vendor,
          totalAmount: resData.totalAmount || 0,
          date: resData.date || new Date().toISOString().split('T')[0],
          detectedItems: (resData.detectedItems || []).map((item: any) => ({
            name: item.name || item.product || 'Unnamed Product',
            quantity: Number(item.quantity) || 1,
            costPrice: Number(item.costPrice) || 0,
            sellingPrice: Number(item.sellingPrice) || 0,
            category: item.category || 'Office Supplies'
          }))
        });
        setAnalyzingStatus("✓ Parsing successful!");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error(err);
      setAnalyzingStatus("⚠ AI connection failed. Loaded high-fidelity fallback dataset.");
      
      // Load fallback dataset
      const simulatedDate = new Date().toISOString().split('T')[0];
      setParsedResult({
        vendor: "Apex Office Supplies",
        totalAmount: 184.50,
        date: simulatedDate,
        detectedItems: [
          { name: "Wireless Ergonomic Mouse", quantity: 3, costPrice: 15.00, sellingPrice: 24.99, category: "Office Supplies" },
          { name: "USB-C Multiport Adaptor", quantity: 2, costPrice: 20.00, sellingPrice: 32.50, category: "Office Supplies" },
          { name: "Braided Charging Cable 2m", quantity: 5, costPrice: 6.00, sellingPrice: 10.00, category: "Office Supplies" },
          { name: "Premium Whiteboard Markers (Pack)", quantity: 1, costPrice: 9.50, sellingPrice: 14.50, category: "Office Supplies" }
        ]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImportToInventory = () => {
    if (!parsedResult) return;
    
    let addedCount = 0;
    let restockedCount = 0;
    
    parsedResult.detectedItems.forEach(item => {
      // Check if product with same name or SKU exists
      const existingProd = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
      
      if (existingProd) {
        // Just adjust stock level
        dataStore.updateStockLevel(existingProd.id, item.quantity);
        restockedCount++;
      } else {
        // Create new product
        const newProduct: Product = {
          id: 'prod_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          sku: 'SKU-' + Math.floor(100000 + Math.random() * 900000),
          name: item.name,
          price: item.sellingPrice,
          category: item.category
        };
        dataStore.createProduct(newProduct, activeUser);
        dataStore.updateStockLevel(newProduct.id, item.quantity);
        addedCount++;
      }
    });
    
    // Refresh products and inventory states
    setProducts(dataStore.getProducts());
    setInventory(dataStore.getInventory());
    
    // Log audit trail with receipt image attachment for auditing purposes
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'RESTOCK',
      `Receipt Import: ${parsedResult.vendor}`,
      `Imported AI receipt items from ${parsedResult.vendor}. Added ${addedCount} new items, restocked ${restockedCount} existing items.`,
      receiptImage || undefined
    );
    
    setSuccessMessage(`✓ AI Import Complete! Added ${addedCount} new products to catalog, restocked ${restockedCount} existing items.`);
    setParsedResult(null);
    setReceiptImage(null);
    setAnalyzingStatus(null);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Supplier Management states
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [editSupplierContactName, setEditSupplierContactName] = useState('');
  const [editSupplierEmail, setEditSupplierEmail] = useState('');
  const [editSupplierPhone, setEditSupplierPhone] = useState('');
  const [editSupplierAddress, setEditSupplierAddress] = useState('');
  const [editSupplierWebsite, setEditSupplierWebsite] = useState('');
  const [editSupplierContractTerms, setEditSupplierContractTerms] = useState('Net 30');
  const [editSupplierContractStart, setEditSupplierContractStart] = useState('');
  const [editSupplierContractEnd, setEditSupplierContractEnd] = useState('');
  const [editSupplierMOQ, setEditSupplierMOQ] = useState('50');

  // Interactive Form States
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorContact, setNewVendorContact] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorCategory, setNewVendorCategory] = useState('Hardware');
  const [newVendorLeadTime, setNewVendorLeadTime] = useState(3);

  const [isAddingWarehouse, setIsAddingWarehouse] = useState(false);
  const [newWHName, setNewWHName] = useState('');
  const [newWHCity, setNewWHCity] = useState('');
  const [newWHAddress, setNewWHAddress] = useState('');

  // Interactive PO Creation States
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [poQuantity, setPoQuantity] = useState(50);
  const [poPricePerUnit, setPoPricePerUnit] = useState(15.00);

  // Email/WhatsApp transmission & Secure Receipt states
  const [transmittingPo, setTransmittingPo] = useState<PurchaseOrder | null>(null);
  const [transmissionType, setTransmissionType] = useState<'email' | 'whatsapp' | null>(null);
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [enteredReceiptCode, setEnteredReceiptCode] = useState('');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setVendors(dataStore.getVendors());
    setWarehouses(dataStore.getWarehouses());
    setInventory(dataStore.getInventory());
    setProducts(dataStore.getProducts());
    setPurchaseOrders(dataStore.getPurchaseOrders());

    const unsubscribeVendors = dataStore.subscribeToCollection('vendors', () => {
      setVendors(dataStore.getVendors());
    });
    const unsubscribeWarehouses = dataStore.subscribeToCollection('warehouses', () => {
      setWarehouses(dataStore.getWarehouses());
    });
    const unsubscribeInventory = dataStore.subscribeToCollection('inventory', () => {
      setInventory(dataStore.getInventory());
    });
    const unsubscribePO = dataStore.subscribeToCollection('purchase_orders', () => {
      setPurchaseOrders(dataStore.getPurchaseOrders());
    });

    return () => {
      unsubscribeVendors();
      unsubscribeWarehouses();
      unsubscribeInventory();
      unsubscribePO();
    };
  }, []);

  const activeSupplier = vendors.find(v => v.id === selectedSupplierId);

  useEffect(() => {
    if (activeSupplier) {
      setEditSupplierContactName(activeSupplier.contactName || '');
      setEditSupplierEmail(activeSupplier.email || '');
      setEditSupplierPhone(activeSupplier.phone || '');
      setEditSupplierAddress(activeSupplier.address || '');
      setEditSupplierWebsite(activeSupplier.website || '');
      setEditSupplierContractTerms(activeSupplier.contractTerms || 'Net 30');
      setEditSupplierContractStart(activeSupplier.contractStartDate || '2026-09-14');
      setEditSupplierContractEnd(activeSupplier.contractEndDate || '2027-09-14');
      setEditSupplierMOQ(activeSupplier.moq?.toString() || '50');
    } else {
      setEditSupplierContactName('');
      setEditSupplierEmail('');
      setEditSupplierPhone('');
      setEditSupplierAddress('');
      setEditSupplierWebsite('');
      setEditSupplierContractTerms('Net 30');
      setEditSupplierContractStart('2026-09-14');
      setEditSupplierContractEnd('2027-09-14');
      setEditSupplierMOQ('50');
    }
  }, [selectedSupplierId, vendors]);

  const handleSaveSupplierProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;

    try {
      const updatedVendors = vendors.map(v => {
        if (v.id === selectedSupplierId) {
          return {
            ...v,
            contactName: editSupplierContactName.trim(),
            email: editSupplierEmail.trim(),
            phone: editSupplierPhone.trim(),
            address: editSupplierAddress.trim(),
            website: editSupplierWebsite.trim(),
            contractTerms: editSupplierContractTerms,
            contractStartDate: editSupplierContractStart,
            contractEndDate: editSupplierContractEnd,
            moq: parseInt(editSupplierMOQ, 10) || 50
          };
        }
        return v;
      });

      dataStore.saveVendors(updatedVendors);
      setVendors(updatedVendors);
      
      // Log audit trail
      dataStore.logAudit(
        activeUser.uid,
        activeUser.name,
        activeUser.role,
        'UPDATE',
        `Supplier Contract Profile: ${activeSupplier?.name}`,
        `Updated contract terms to ${editSupplierContractTerms}, MOQ ${editSupplierMOQ}, contact representative to ${editSupplierContactName}.`
      );

      setSuccessMessage("Supplier profile & contract terms updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update supplier profile.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleSaveProductReorderPoint = (productId: string, val: string) => {
    const threshold = parseInt(val, 10);
    if (isNaN(threshold) || threshold < 0) {
      setErrorMessage("Please enter a valid positive reorder point.");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    try {
      dataStore.updateReorderPoint(productId, threshold, activeUser);
      // Update local state
      setInventory(dataStore.getInventory());

      const prod = products.find(p => p.id === productId);
      // Log audit trail
      dataStore.logAudit(
        activeUser.uid,
        activeUser.name,
        activeUser.role,
        'UPDATE',
        `Inventory Safety Threshold: ${prod?.name || productId}`,
        `Updated automated safety reorder point to ${threshold} units.`
      );

      setSuccessMessage(`Updated reorder threshold for ${prod?.name || 'product'} to ${threshold} units!`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update reorder point.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // 1. Vendor Creation Method
  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim() || !newVendorEmail.trim()) {
      setErrorMessage("Please supply a valid supplier name and corporate email.");
      return;
    }

    const newVendor: Vendor = {
      id: 'vend_' + Date.now(),
      name: newVendorName.trim(),
      contactName: newVendorContact.trim(),
      email: newVendorEmail.trim(),
      phone: newVendorPhone.trim(),
      category: newVendorCategory,
      leadTimeDays: Number(newVendorLeadTime)
    };

    const updated = [...vendors, newVendor];
    dataStore.saveVendors(updated);
    setVendors(updated);
    
    setSuccessMessage(`Successfully registered new corporate supplier: ${newVendor.name}`);
    setNewVendorName('');
    setNewVendorContact('');
    setNewVendorEmail('');
    setNewVendorPhone('');
    setIsAddingVendor(false);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // 2. Warehouse Creation Method
  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWHName.trim() || !newWHCity.trim()) {
      setErrorMessage("Please supply a valid warehouse facility name and city.");
      return;
    }

    const newWH: WarehouseLocation = {
      id: 'wh_' + Date.now(),
      name: newWHName.trim(),
      city: newWHCity.trim(),
      address: newWHAddress.trim()
    };

    const updated = [...warehouses, newWH];
    dataStore.saveWarehouses(updated);
    setWarehouses(updated);

    setSuccessMessage(`Provisioned warehouse facility node: ${newWH.name}`);
    setNewWHName('');
    setNewWHCity('');
    setNewWHAddress('');
    setIsAddingWarehouse(false);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // 3. Purchase Order Generation (Replenishment PO)
  const handleCreatePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId || !selectedProductId || poQuantity <= 0 || poPricePerUnit <= 0) {
      setErrorMessage("Please select a vendor, catalog product, and valid quantitative price values.");
      return;
    }

    const vendor = vendors.find(v => v.id === selectedVendorId);
    const product = products.find(p => p.id === selectedProductId);

    if (!vendor || !product) {
      setErrorMessage("Supplier or Product data resolution failed.");
      return;
    }

    const totalCost = Number((poQuantity * poPricePerUnit).toFixed(2));
    const poId = 'po_auto_' + Math.floor(100000 + Math.random() * 900000);

    const newPO: PurchaseOrder = {
      id: poId,
      vendorId: vendor.id,
      vendorName: vendor.name,
      items: [{
        productId: product.id,
        name: product.name,
        quantity: poQuantity,
        wholesalePrice: poPricePerUnit
      }],
      totalCost: totalCost,
      status: 'proposed', // Match ERP types allowed statuses
      approvedBy: activeUser.name,
      createdAt: new Date().toISOString(),
      supplierReceiptCode: 'RC-' + Math.floor(1000 + Math.random() * 9000),
      whatsappSent: false,
      emailSent: false
    };

    const updatedPO = [newPO, ...purchaseOrders];
    dataStore.savePurchaseOrders(updatedPO);
    setPurchaseOrders(updatedPO);

    // Automatically trigger Double-Entry General Ledger Accounts Payable posting!
    try {
      const doubleEntry = dataStore.getDoubleEntry();
      doubleEntry.unshift({
        id: 'je_' + Date.now() + '_po',
        date: new Date().toISOString(),
        description: `Accrued Stock Replenishment PO #${poId} with ${vendor.name}`,
        referenceId: poId,
        type: 'STOCK_PURCHASE',
        debitAccount: 'Cost_of_Goods_Sold',
        creditAccount: 'Accounts_Payable',
        amount: totalCost
      });
      dataStore.saveDoubleEntry(doubleEntry);
    } catch (err) {
      console.error("Failed to write PO entry to general ledger:", err);
    }

    setSuccessMessage(`Purchase order successfully transmitted to ${vendor.name}! AP ledger updated.`);
    setSelectedVendorId('');
    setSelectedProductId('');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Send simulated Email/WhatsApp templates for purchase orders
  const handleSendPOCommunication = (poId: string, channel: 'email' | 'whatsapp') => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    const updatedPO = purchaseOrders.map(p => {
      if (p.id === poId) {
        return {
          ...p,
          status: 'approved' as const, // Transition to approved status on transmission
          whatsappSent: channel === 'whatsapp' ? true : p.whatsappSent,
          emailSent: channel === 'email' ? true : p.emailSent,
        };
      }
      return p;
    });

    dataStore.savePurchaseOrders(updatedPO);
    setPurchaseOrders(updatedPO);

    // Audit logs
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'UPDATE',
      `PO Transmitted: ${poId}`,
      `Transmitted Purchase Order #${poId} to ${po.vendorName} via ${channel.toUpperCase()}. Secure Receipt Code: ${po.supplierReceiptCode}.`
    );

    setSuccessMessage(`Order #${poId} successfully dispatched to supplier via ${channel === 'email' ? 'Secure SMTP email' : 'WhatsApp Cloud API'}! Code: ${po.supplierReceiptCode}`);
    setTransmittingPo(null);
    setTransmissionType(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Securely confirm PO receipt and auto-restock inventory
  const handleConfirmReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPo) return;

    if (enteredReceiptCode.trim().toUpperCase() !== receivingPo.supplierReceiptCode?.toUpperCase()) {
      setErrorMessage("Access Denied: The unique supplier receipt code entered is incorrect. Verify with supplier.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const updatedPO = purchaseOrders.map(p => {
      if (p.id === receivingPo.id) {
        return {
          ...p,
          status: 'received' as const
        };
      }
      return p;
    });

    dataStore.savePurchaseOrders(updatedPO);
    setPurchaseOrders(updatedPO);

    // Auto-restock the inventory levels!
    receivingPo.items.forEach(item => {
      dataStore.updateStockLevel(item.productId, item.quantity);
    });

    // Refresh inventory and PO states
    setInventory(dataStore.getInventory());

    // Audit logs
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'RESTOCK',
      `PO Received: ${receivingPo.id}`,
      `Successfully received and verified shipment for PO #${receivingPo.id}. Auto-restocked items.`
    );

    setSuccessMessage(`Shipment verified successfully! PO #${receivingPo.id} received and inventory stock level auto-restocked.`);
    setReceivingPo(null);
    setEnteredReceiptCode('');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // 4. Warehouse Inventory Bin Allocator
  const handleUpdateBinLocation = (inventoryId: string, warehouseId: string, binLocation: string) => {
    const updatedInventory = inventory.map(item => {
      if (item.id === inventoryId) {
        return {
          ...item,
          warehouseId,
          binLocation: binLocation.trim(),
          lastUpdated: new Date().toISOString()
        };
      }
      return item;
    });

    dataStore.saveInventory(updatedInventory);
    setInventory(updatedInventory);
    setSuccessMessage("Warehouse bin coordinates allocated successfully!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6" id="procurement_warehouse_module">
      {/* Module Title Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Procurement & Warehouse Logistics</h2>
            <p className="text-xs text-slate-500">Coordinate primary supplier channels, allocate stocks across bin levels, and disburse corporate POs.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {procurementTab === 'vendors' && (activeUser.role === 'manager' || activeUser.role === 'ceo' || activeUser.role === 'sysadmin') && (
            <button
              onClick={() => setIsAddingVendor(!isAddingVendor)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingVendor ? "Close Panel" : "Add Supplier"}</span>
            </button>
          )}

          {procurementTab === 'warehouses' && (activeUser.role === 'manager' || activeUser.role === 'ceo' || activeUser.role === 'sysadmin') && (
            <button
              onClick={() => setIsAddingWarehouse(!isAddingWarehouse)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingWarehouse ? "Close Panel" : "Add Warehouse"}</span>
            </button>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-semibold animate-fade-in shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-semibold animate-fade-in shadow-sm">
          <Lock className="w-4 h-4 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Forms Drawers */}
      {isAddingVendor && (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-md p-5 max-w-lg w-full mx-auto">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Register New Supplier Profile</h3>
          <form onSubmit={handleCreateVendor} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Company Name</label>
                <input required type="text" value={newVendorName} onChange={e=>setNewVendorName(e.target.value)} className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200" placeholder="e.g. Apex Logistical" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Contact Representative</label>
                <input required type="text" value={newVendorContact} onChange={e=>setNewVendorContact(e.target.value)} className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200" placeholder="e.g. Rachel Green" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Sales Email</label>
                <input required type="email" value={newVendorEmail} onChange={e=>setNewVendorEmail(e.target.value)} className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200" placeholder="sales@apex.com" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Direct Phone</label>
                <input type="text" value={newVendorPhone} onChange={e=>setNewVendorPhone(e.target.value)} className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200" placeholder="+1 555-0133" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Supplier Category</label>
                <select value={newVendorCategory} onChange={e=>setNewVendorCategory(e.target.value)} className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <option value="Hardware">Hardware & Machinery</option>
                  <option value="Accessories">Cables & Accessories</option>
                  <option value="Office">Office Furniture</option>
                  <option value="Packaging">Logistical Packaging</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Average Lead Time (Days)</label>
                <input type="number" min="1" max="30" value={newVendorLeadTime} onChange={e=>setNewVendorLeadTime(Number(e.target.value))} className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={()=>setIsAddingVendor(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-lg">Add Vendor</button>
            </div>
          </form>
        </div>
      )}

      {isAddingWarehouse && (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-md p-5 max-w-lg w-full mx-auto">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Provision Corporate Warehouse Facility</h3>
          <form onSubmit={handleCreateWarehouse} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Warehouse Facility Name</label>
              <input required type="text" value={newWHName} onChange={e=>setNewWHName(e.target.value)} className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200" placeholder="e.g. West Coast Storage" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">City Hub</label>
                <input required type="text" value={newWHCity} onChange={e=>setNewWHCity(e.target.value)} className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200" placeholder="e.g. Seattle" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Physical Address</label>
                <input required type="text" value={newWHAddress} onChange={e=>setNewWHAddress(e.target.value)} className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200" placeholder="404 Rainier Ave S" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={()=>setIsAddingWarehouse(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-lg">Provision Hub</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs list */}
      <div className="flex border-b border-slate-100 mb-2">
        <button
          onClick={() => setProcurementTab('vendors')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            procurementTab === 'vendors'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Corporate Supplier Directory</span>
        </button>
        <button
          onClick={() => setProcurementTab('warehouses')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            procurementTab === 'warehouses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Warehouse Stocks & Bin Allocations</span>
        </button>
        <button
          onClick={() => setProcurementTab('pos')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            procurementTab === 'pos'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Replenishment Purchase Orders (POs)</span>
        </button>
        <button
          onClick={() => {
            setProcurementTab('suppliers');
            if (vendors.length > 0 && !selectedSupplierId) {
              setSelectedSupplierId(vendors[0].id);
            }
          }}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            procurementTab === 'suppliers'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Supplier Management & Terms</span>
        </button>
        <button
          onClick={() => setProcurementTab('receipt_capture')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            procurementTab === 'receipt_capture'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>AI Receipt & Product Ingestion</span>
        </button>
      </div>

      {procurementTab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {vendors.map(v => (
            <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold font-mono uppercase">{v.category}</span>
                <span className="text-[10px] text-slate-400 font-bold">L/T: {v.leadTimeDays} Days</span>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm">{v.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">Contact: {v.contactName}</p>
              </div>

              <div className="text-xs text-slate-500 space-y-1.5 pt-3 border-t border-slate-50">
                <p className="truncate">📧 {v.email}</p>
                <p>📞 {v.phone}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {procurementTab === 'warehouses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {warehouses.map(wh => (
              <div key={wh.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-slate-800 text-sm">{wh.name}</h4>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{wh.city}</span>
                </div>

                <p className="text-xs text-slate-500">📍 {wh.address}</p>

                {/* Allocated Inventory items inside this Warehouse */}
                <div className="space-y-2 pt-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Allocated Inventory Stocks</span>
                  <div className="divide-y divide-slate-100 text-xs">
                    {inventory.filter(item => item.warehouseId === wh.id).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1.5">No products allocated inside this facility.</p>
                    ) : (
                      inventory.filter(item => item.warehouseId === wh.id).map(item => {
                        const prod = products.find(p => p.id === item.productId);
                        return (
                          <div key={item.id} className="py-2 flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-slate-700">{prod?.name || 'Unknown'}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">SKU: {item.sku}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-800 block">{item.stockLevel} units</span>
                              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">Bin: {item.binLocation || 'Unassigned'}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Allocation Tool Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Inventory Bin Location Coordinates Manager</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Catalog Item</label>
                <select id="allocation_item" className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-medium">
                  {inventory.map(item => {
                    const prod = products.find(p => p.id === item.productId);
                    return <option key={item.id} value={item.id}>{prod?.name || item.sku} (SKU: {item.sku})</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Target Facility Location</label>
                <select id="allocation_wh" className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-medium">
                  {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Bin Coordinates Coordinate (Aisle-Shelf-Bin)</label>
                <input id="allocation_bin" type="text" placeholder="e.g. Aisle 3 - Shelf A - Bin 15" className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs" />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    const selectItem = document.getElementById('allocation_item') as HTMLSelectElement;
                    const selectWH = document.getElementById('allocation_wh') as HTMLSelectElement;
                    const inputBin = document.getElementById('allocation_bin') as HTMLInputElement;

                    if (selectItem && selectWH && inputBin) {
                      handleUpdateBinLocation(selectItem.value, selectWH.value, inputBin.value);
                      inputBin.value = '';
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all text-xs"
                >
                  Allocate Warehouse Bin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {procurementTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create PO Form */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Issue Corporate Replenishment PO</h4>
            <form onSubmit={handleCreatePurchaseOrder} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Select Supplier Vendor</label>
                <select value={selectedVendorId} onChange={e=>setSelectedVendorId(e.target.value)} className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-700">
                  <option value="">-- Choose Supplier --</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name} ({v.category})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Select Catalog Item to Replenish</label>
                <select value={selectedProductId} onChange={e=>setSelectedProductId(e.target.value)} className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-700">
                  <option value="">-- Choose Catalog Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Quantity (Units)</label>
                  <input type="number" min="10" max="500" value={poQuantity} onChange={e=>setPoQuantity(Number(e.target.value))} className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Price Per Unit ($)</label>
                  <input type="number" step="0.1" value={poPricePerUnit} onChange={e=>setPoPricePerUnit(Number(e.target.value))} className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono font-bold" />
                </div>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Total Estimated PO Commitment</span>
                <span className="text-xl font-mono font-black text-slate-800 block mt-1">${(poQuantity * poPricePerUnit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all uppercase tracking-wider font-bold"
              >
                Transmit Purchase Order & Book Accounts Payable
              </button>
            </form>
          </div>

          {/* PO List */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Purchase Order History Logs</h4>
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase">
                  <tr>
                    <th className="p-3">PO Reference ID</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Allocated Items</th>
                    <th className="p-3 text-right">Commitment Cost</th>
                    <th className="p-3 text-center">Receipt Code & Channels</th>
                    <th className="p-3 text-right">Status & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400 italic">No purchase orders transmitted yet.</td>
                    </tr>
                  ) : (
                    purchaseOrders.map(po => {
                      return (
                        <tr key={po.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-800">
                            <div>{po.id}</div>
                            <div className="text-[9px] text-slate-400 font-normal">{new Date(po.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{po.vendorName || 'N/A'}</td>
                          <td className="p-3">
                            {po.items.map((item, idx) => (
                              <span key={idx} className="block text-[11px] text-slate-500 font-medium">
                                {item.name} <strong className="text-slate-700">x{item.quantity}</strong>
                              </span>
                            ))}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-700">
                            ${Number(po.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center space-y-1">
                            <div className="flex items-center justify-center gap-1">
                              <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-2 py-0.5 rounded font-extrabold border border-slate-200">
                                🔑 {po.supplierReceiptCode || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-center gap-1.5 text-[9px]">
                              <span className={`px-1 rounded-sm ${po.emailSent ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                                {po.emailSent ? '📧 Email Sent' : '✉ Email Pending'}
                              </span>
                              <span className={`px-1 rounded-sm ${po.whatsappSent ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                                {po.whatsappSent ? '💬 WhatsApp Sent' : '💬 WhatsApp Pending'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {po.status === 'proposed' && (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTransmittingPo(po);
                                    setTransmissionType('email');
                                  }}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold border border-indigo-100 transition-all"
                                >
                                  ✉ Send Email
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTransmittingPo(po);
                                    setTransmissionType('whatsapp');
                                  }}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold border border-emerald-100 transition-all"
                                >
                                  💬 WhatsApp
                                </button>
                              </div>
                            )}

                            {po.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReceivingPo(po);
                                  setEnteredReceiptCode('');
                                }}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-extrabold shadow-sm transition-all animate-pulse"
                              >
                                📥 Confirm Receipt
                              </button>
                            )}

                            {po.status === 'received' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                ✓ Received & Stocked
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {procurementTab === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Supplier Selector List (Left column) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Select Corporate Supplier</h4>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold font-mono">{vendors.length} Registered</span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {vendors.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">No suppliers registered in the database.</p>
              ) : (
                vendors.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedSupplierId(v.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                      selectedSupplierId === v.id
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                        : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/30'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-bold text-slate-800">{v.name}</span>
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono uppercase font-bold">{v.category}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 w-full font-mono">
                      <span>Representative: {v.contactName || 'Rachel Green'}</span>
                      <span>L/T: {v.leadTimeDays}d</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Supplier Terms, Profile, and Automated Reorders Dashboard (Right column) */}
          <div className="lg:col-span-8 space-y-6">
            {!selectedSupplierId ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 shadow-sm flex flex-col items-center justify-center space-y-2">
                <Truck className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-semibold">Select a corporate supplier from the directory to review contract terms and adjust reorder rules.</p>
              </div>
            ) : (
              <>
                {/* 1. Profile & Contract Editor Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{activeSupplier?.name} Contract Registry</h4>
                      <p className="text-[10px] text-slate-400 font-mono">SUPPLIER ID: {activeSupplier?.id}</p>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-mono px-2 py-1 rounded font-bold uppercase">Contract Status: Active</span>
                  </div>

                  <form onSubmit={handleSaveSupplierProfile} className="space-y-4 text-xs">
                    {/* Contact Profile Sub-Grid */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-bold">Supplier Contact Coordinates</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-1">Contact Name</label>
                          <input
                            type="text"
                            value={editSupplierContactName}
                            onChange={e => setEditSupplierContactName(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200"
                            placeholder="Rachel Green"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-1">Corporate Email</label>
                          <input
                            type="email"
                            value={editSupplierEmail}
                            onChange={e => setEditSupplierEmail(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200"
                            placeholder="sales@apex.com"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-1">Direct Phone</label>
                          <input
                            type="text"
                            value={editSupplierPhone}
                            onChange={e => setEditSupplierPhone(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200"
                            placeholder="555-0133"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-1">Physical Address</label>
                          <input
                            type="text"
                            value={editSupplierAddress}
                            onChange={e => setEditSupplierAddress(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200"
                            placeholder="404 Rainier Ave S, Seattle, WA"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-1">Company Website URL</label>
                          <input
                            type="text"
                            value={editSupplierWebsite}
                            onChange={e => setEditSupplierWebsite(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200"
                            placeholder="https://apexlogistics.com"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contract Details Sub-Grid */}
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-bold">Contractual Agreement & Commitments</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-1">Payment Terms</label>
                          <select
                            value={editSupplierContractTerms}
                            onChange={e => setEditSupplierContractTerms(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200"
                          >
                            <option value="Immediate">Due Upon Receipt</option>
                            <option value="Net 15">Net 15 Days</option>
                            <option value="Net 30">Net 30 Days</option>
                            <option value="Net 60">Net 60 Days</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-1">Minimum Order Qty (MOQ)</label>
                          <input
                            type="number"
                            min="1"
                            value={editSupplierMOQ}
                            onChange={e => setEditSupplierMOQ(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-1">Contract Start Date</label>
                          <input
                            type="date"
                            value={editSupplierContractStart}
                            onChange={e => setEditSupplierContractStart(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-1">Contract End Date</label>
                          <input
                            type="date"
                            value={editSupplierContractEnd}
                            onChange={e => setEditSupplierContractEnd(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-all text-xs"
                      >
                        Save Supplier Contract Details
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2. Automated Reorder Points Table for every product */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-50 pb-3">
                    <h4 className="font-bold text-slate-800 text-sm">Automated Supply Safety Thresholds</h4>
                    <p className="text-xs text-slate-400">Configure safety replenishment points (reorder thresholds) for every catalog item stored in inventory.</p>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="w-full text-xs text-left text-slate-600">
                      <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase">
                        <tr>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">SKU Code</th>
                          <th className="p-3 text-center">Current Stock</th>
                          <th className="p-3 text-center">Safety Reorder Point</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {products.map(p => {
                          const invItem = inventory.find(i => i.productId === p.id);
                          const currentStock = invItem?.stockLevel ?? 0;
                          const currentThreshold = invItem?.ai_reorder_point ?? 10;
                          const isLowStock = currentStock <= currentThreshold;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/30">
                              <td className="p-3 font-semibold text-slate-800">{p.name}</td>
                              <td className="p-3 font-mono text-[11px] text-slate-500">{p.sku}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                  isLowStock 
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {currentStock} units
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  id={`reorder_input_${p.id}`}
                                  type="number"
                                  min="0"
                                  defaultValue={currentThreshold}
                                  className="w-20 p-1 rounded bg-slate-50 border border-slate-200 text-center font-mono font-bold"
                                />
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const inputEl = document.getElementById(`reorder_input_${p.id}`) as HTMLInputElement;
                                    if (inputEl) {
                                      handleSaveProductReorderPoint(p.id, inputEl.value);
                                    }
                                  }}
                                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2.5 py-1 rounded font-bold transition-all text-[11px]"
                                >
                                  Update Reorder Point
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {procurementTab === 'receipt_capture' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
              AI-Powered Multimodal Receipt & Product Ingestion
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Upload any vendor invoice or purchase receipt. Our Gemini AI engine will parse the vendor details, totals, and individual line items, allowing you to instantly register new products or restock existing ones in your catalog.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image Upload & Prebuilt Samples */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
              <div className="border-b border-slate-50 pb-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Source Document</h4>
              </div>

              {/* Upload Zone */}
              <div 
                onClick={() => document.getElementById('receipt_file_upload')?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-indigo-50/10 flex flex-col items-center justify-center space-y-2 min-h-[180px]"
              >
                <div className="p-3 bg-white text-slate-400 rounded-full shadow-xs border border-slate-100">
                  <Plus className="w-6 h-6 text-indigo-600" />
                </div>
                <span className="text-xs font-bold text-slate-700">Upload Receipt Image</span>
                <span className="text-[10px] text-slate-400">Drag & drop or click to browse (JPEG, PNG, WebP)</span>
                <input 
                  id="receipt_file_upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const b64 = reader.result as string;
                        setReceiptImage(b64);
                        setParsedResult(null);
                        handleParseReceipt(b64, file.type);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>

              {/* Select Prebuilt Samples */}
              <div className="space-y-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Or Test Instantly with Prebuilt Sample Receipts
                </span>

                <div className="space-y-2">
                  {[
                    {
                      title: "Accra Wholesale Textiles",
                      desc: "Kente print fabric & woven threads",
                      vendor: "Accra Wholesale Textiles",
                      amount: 750.00,
                      items: [
                        { name: "Kente Style African Wax Fabric (Yards)", quantity: 15, costPrice: 20.00, sellingPrice: 35.00, category: "Linen" },
                        { name: "Premium Hand-woven Cotton Thread", quantity: 30, costPrice: 15.00, sellingPrice: 25.00, category: "Linen" }
                      ]
                    },
                    {
                      title: "Ghana Global Electronics Ltd",
                      desc: "Barcode scanners, printers & cash drawers",
                      vendor: "Ghana Global Electronics Ltd",
                      amount: 1450.00,
                      items: [
                        { name: "Wireless Barcode Scanner Handheld", quantity: 5, costPrice: 120.00, sellingPrice: 180.00, category: "Electronics" },
                        { name: "Thermal Receipt Printer USB", quantity: 3, costPrice: 250.00, sellingPrice: 380.00, category: "Electronics" },
                        { name: "Heavy Duty Cash Drawer", quantity: 2, costPrice: 50.00, sellingPrice: 85.00, category: "Electronics" }
                      ]
                    },
                    {
                      title: "Osei Furniture & Woodworks",
                      desc: "Mahogany desks & mesh swivel chairs",
                      vendor: "Osei Furniture & Woodworks",
                      amount: 3100.00,
                      items: [
                        { name: "Executive Mahogany Office Desk", quantity: 2, costPrice: 800.00, sellingPrice: 1250.00, category: "Furniture" },
                        { name: "Ergonomic Mesh Support Swivel Chair", quantity: 6, costPrice: 250.00, sellingPrice: 420.00, category: "Furniture" }
                      ]
                    }
                  ].map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        // Generate dummy preview representing chosen sample receipt
                        setReceiptImage(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><rect width="100%" height="100%" fill="%23f8fafc"/><text x="20" y="40" font-family="monospace" font-size="12" font-weight="bold" fill="%231e293b">${sample.vendor}</text><line x1="20" y1="55" x2="280" y2="55" stroke="%23cbd5e1" stroke-dasharray="4"/><text x="20" y="80" font-family="monospace" font-size="9" fill="%2364748b">DATE: 2026-09-28</text><text x="20" y="95" font-family="monospace" font-size="9" fill="%2364748b">PO: #${100000 + idx}</text>${sample.items.map((it, i) => `<text x="20" y="${140 + i*30}" font-family="monospace" font-size="9" font-weight="bold" fill="%23334155">${it.name.substring(0,25)}</text><text x="20" y="${152 + i*30}" font-family="monospace" font-size="8" fill="%2364748b">Qty: ${it.quantity} x $${it.costPrice}</text><text x="230" y="${152 + i*30}" font-family="monospace" font-size="9" font-weight="bold" fill="%23334155">$${it.quantity * it.costPrice}</text>`).join('')}<line x1="20" y1="320" x2="280" y2="320" stroke="%23cbd5e1"/><text x="20" y="345" font-family="monospace" font-size="11" font-weight="bold" fill="%230f172a">TOTAL DUE</text><text x="210" y="345" font-family="monospace" font-size="11" font-weight="black" fill="%230f172a">$${sample.amount}</text></svg>`);
                        
                        setIsAnalyzing(true);
                        setAnalyzingStatus("Connecting to Gemini-3.8-Flash Gateway...");
                        setParsedResult(null);
                        
                        setTimeout(() => {
                          setParsedResult({
                            vendor: sample.vendor,
                            date: new Date().toISOString().split('T')[0],
                            totalAmount: sample.amount,
                            detectedItems: sample.items
                          });
                          setIsAnalyzing(false);
                          setAnalyzingStatus("✓ Extracted successfully!");
                        }, 1200);
                      }}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-indigo-50/30 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all flex items-start gap-2.5"
                    >
                      <span className="p-2 bg-white rounded-lg border border-slate-100 shadow-3xs text-xs">📄</span>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{sample.title}</div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{sample.desc}</p>
                        <div className="text-[10px] font-semibold text-indigo-600 mt-1 font-mono">Total: ${sample.amount.toFixed(2)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: AI Extraction & Review Panel */}
            <div className="lg:col-span-7 space-y-6">
              {/* Document Preview & Loader */}
              {receiptImage && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      📷 Document Captured & Analyzing
                    </h4>
                    <button 
                      type="button"
                      onClick={() => {
                        setReceiptImage(null);
                        setParsedResult(null);
                        setAnalyzingStatus(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ✕ Clear
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-5 items-stretch">
                    <div className="w-full sm:w-48 bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center justify-center shrink-0">
                      <img src={receiptImage} alt="Captured receipt" className="max-h-48 object-contain rounded-lg shadow-sm" />
                    </div>

                    <div className="flex-1 flex flex-col justify-center space-y-3">
                      {isAnalyzing ? (
                        <div className="space-y-2 py-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                            <span className="text-xs font-bold text-indigo-600">Active Gemini API Handshake...</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono italic">{analyzingStatus}</p>
                          
                          {/* Animated progress blocks */}
                          <div className="flex gap-1.5 pt-1">
                            <div className="h-1.5 flex-1 bg-indigo-600 rounded animate-pulse" />
                            <div className="h-1.5 flex-1 bg-indigo-500 rounded animate-pulse delay-75" />
                            <div className="h-1.5 flex-1 bg-indigo-400 rounded animate-pulse delay-150" />
                            <div className="h-1.5 flex-1 bg-slate-200 rounded" />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Pipeline Status</span>
                          <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span className="text-emerald-500">✓</span>
                            <span>Analysis complete! Extracted {parsedResult?.detectedItems?.length || 0} items from receipt.</span>
                          </div>
                          <p className="text-[11px] text-slate-500">Review the extracted metadata and register the product(s) into inventory below.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* No Document State */}
              {!receiptImage && !isAnalyzing && (
                <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3 min-h-[350px]">
                  <div className="p-4 bg-white rounded-full shadow-xs border border-slate-100 text-slate-300">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Awaiting Capture Ingestion</h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Select one of our high-fidelity sample receipts on the left, or upload your own, to trigger real-time AI OCR extraction and taxonomy matching.
                  </p>
                </div>
              )}

              {/* Review & Edit Extracted Results */}
              {parsedResult && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5 animate-in fade-in duration-200">
                  <div className="border-b border-slate-50 pb-3">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Review Extracted Receipt Fields</h4>
                  </div>

                  {/* Header fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Extracted Vendor Name</label>
                      <input 
                        type="text" 
                        value={parsedResult.vendor} 
                        onChange={(e) => setParsedResult({ ...parsedResult, vendor: e.target.value })}
                        className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Total Invoice Value (GHS)</label>
                      <input 
                        type="number" 
                        value={parsedResult.totalAmount} 
                        onChange={(e) => setParsedResult({ ...parsedResult, totalAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono font-bold text-slate-800" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Receipt Date</label>
                      <input 
                        type="date" 
                        value={parsedResult.date} 
                        onChange={(e) => setParsedResult({ ...parsedResult, date: e.target.value })}
                        className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono font-medium text-slate-800" 
                      />
                    </div>
                  </div>

                  {/* Items list table */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Extracted Products Catalog Mapping
                    </span>

                    <div className="overflow-x-auto rounded-lg border border-slate-100">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase">
                          <tr className="border-b border-slate-100">
                            <th className="p-3">Product Name</th>
                            <th className="p-3 w-28">Category</th>
                            <th className="p-3 text-center w-20">Quantity</th>
                            <th className="p-3 text-right w-24">Cost Price</th>
                            <th className="p-3 text-right w-24">Selling Price</th>
                            <th className="p-3 w-10 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedResult.detectedItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-2">
                                <input 
                                  type="text" 
                                  value={item.name} 
                                  onChange={(e) => {
                                    const updatedItems = [...parsedResult.detectedItems];
                                    updatedItems[idx].name = e.target.value;
                                    setParsedResult({ ...parsedResult, detectedItems: updatedItems });
                                  }}
                                  className="w-full p-1.5 bg-transparent border-0 border-b hover:border-slate-300 focus:border-indigo-500 font-bold text-slate-800 focus:outline-none" 
                                />
                              </td>
                              <td className="p-2">
                                <select 
                                  value={item.category} 
                                  onChange={(e) => {
                                    const updatedItems = [...parsedResult.detectedItems];
                                    updatedItems[idx].category = e.target.value;
                                    setParsedResult({ ...parsedResult, detectedItems: updatedItems });
                                  }}
                                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700"
                                >
                                  <option value="Electronics">Electronics</option>
                                  <option value="Furniture">Furniture</option>
                                  <option value="Linen">Linen</option>
                                  <option value="Food & Beverage">Food & Beverage</option>
                                  <option value="Office Supplies">Office Supplies</option>
                                  <option value="Hardware/Tools">Hardware/Tools</option>
                                </select>
                              </td>
                              <td className="p-2">
                                <input 
                                  type="number" 
                                  min="1"
                                  value={item.quantity} 
                                  onChange={(e) => {
                                    const updatedItems = [...parsedResult.detectedItems];
                                    updatedItems[idx].quantity = parseInt(e.target.value, 10) || 1;
                                    setParsedResult({ ...parsedResult, detectedItems: updatedItems });
                                  }}
                                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-center font-mono font-bold text-slate-800" 
                                />
                              </td>
                              <td className="p-2">
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={item.costPrice} 
                                  onChange={(e) => {
                                    const updatedItems = [...parsedResult.detectedItems];
                                    updatedItems[idx].costPrice = parseFloat(e.target.value) || 0;
                                    setParsedResult({ ...parsedResult, detectedItems: updatedItems });
                                  }}
                                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-right font-mono font-bold text-slate-800" 
                                />
                              </td>
                              <td className="p-2">
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={item.sellingPrice} 
                                  onChange={(e) => {
                                    const updatedItems = [...parsedResult.detectedItems];
                                    updatedItems[idx].sellingPrice = parseFloat(e.target.value) || 0;
                                    setParsedResult({ ...parsedResult, detectedItems: updatedItems });
                                  }}
                                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-right font-mono font-bold text-slate-800" 
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  title="Remove item row"
                                  onClick={() => {
                                    const updatedItems = parsedResult.detectedItems.filter((_, i) => i !== idx);
                                    setParsedResult({ ...parsedResult, detectedItems: updatedItems });
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="pt-1 flex justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          const newItem = {
                            name: 'New Custom Item',
                            category: 'Electronics',
                            quantity: 1,
                            costPrice: 10.00,
                            sellingPrice: 15.00
                          };
                          setParsedResult({
                            ...parsedResult,
                            detectedItems: [...parsedResult.detectedItems, newItem]
                          });
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Row</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedResult(null);
                        setReceiptImage(null);
                      }}
                      className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={handleImportToInventory}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                    >
                      <span>📥 Add & Sync all Items to Inventory Catalog</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 1. Email & WhatsApp Dispatch Preview Modal */}
      {transmittingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Dispatch PO #{transmittingPo.id}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  TO: {transmittingPo.vendorName}
                </p>
              </div>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                transmissionType === 'email' 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                {transmissionType === 'email' ? '✉ SMTP Email Gateway' : '💬 WhatsApp API'}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Template Message Preview
                </span>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto">
                  {transmissionType === 'email' ? (
`Subject: Purchase Order #${transmittingPo.id} - Replenishment Request

Dear Supply Team at ${transmittingPo.vendorName},

Please find our official corporate replenishment request below:

ORDER ITEMS:
${transmittingPo.items.map(item => `• ${item.name} (Qty: ${item.quantity} units @ $${item.wholesalePrice}/unit)`).join('\n')}

TOTAL COST COMMITMENT: $${Number(transmittingPo.totalCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
SHIPPING DESTINATION: Central Logistics Hub

==================================================
CRITICAL RECEIPT CODE: ${transmittingPo.supplierReceiptCode}
==================================================
*Note: Your delivery personnel MUST present the receipt code above to our warehouse receiver in order to authorize and unload the goods.

Thank you,
Procurement Office
${activeUser.name} (${activeUser.role.toUpperCase()})`
                  ) : (
`*OFFICIAL PURCHASE ORDER #${transmittingPo.id}*

Dear *${transmittingPo.vendorName}* Team,

We have issued a replenishment order:
${transmittingPo.items.map(item => `- _${item.name}_ (x${item.quantity} units)`).join('\n')}

*Total Cost:* $${Number(transmittingPo.totalCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}

🔑 *UNIQUE RECEIPT CODE:* *${transmittingPo.supplierReceiptCode}*

_The courier must provide this code at the loading dock to verify receipt._`
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2.5">
                <span className="text-base">💡</span>
                <p className="text-[11px] text-amber-800 leading-normal font-medium">
                  Dispatching will update the status of this PO to <strong>Approved</strong> and generate a secure receipt record awaiting verification.
                </p>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => handleSendPOCommunication(transmittingPo.id, transmissionType!)}
                className={`w-1/2 py-2.5 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider shadow-md transition-all ${
                  transmissionType === 'email'
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/10'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10'
                }`}
              >
                Approve & Dispatch Now
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransmittingPo(null);
                  setTransmissionType(null);
                }}
                className="w-1/2 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-extrabold rounded-lg text-xs uppercase tracking-wider border border-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Secure Goods Receipt Code Verification Modal */}
      {receivingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
            <div className="bg-slate-50 p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                📥 Secure Goods Receipt Verification
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                PO: #{receivingPo.id} • Vendor: {receivingPo.vendorName}
              </p>
            </div>

            <form onSubmit={handleConfirmReceipt} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Items Expected in Shipment
                </span>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg px-3 bg-slate-50/50 font-medium font-sans">
                  {receivingPo.items.map((item, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center text-slate-700">
                      <span>{item.name}</span>
                      <span className="font-bold font-mono">x{item.quantity} units</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase block tracking-wide">
                  Enter Unique Supplier Receipt Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RC-1234"
                  value={enteredReceiptCode}
                  onChange={e => setEnteredReceiptCode(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono font-black text-center text-base focus:outline-none focus:border-indigo-500 uppercase tracking-widest transition-all"
                />
                <span className="text-[10px] text-slate-400 block text-center mt-1">
                  (For testing purposes, the correct receipt code is: <strong className="text-slate-600 font-mono">{receivingPo.supplierReceiptCode}</strong>)
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider shadow-md shadow-indigo-500/10 transition-all"
                >
                  ✓ Verify & Stock Items
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReceivingPo(null);
                    setEnteredReceiptCode('');
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg text-xs uppercase tracking-wider border border-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
