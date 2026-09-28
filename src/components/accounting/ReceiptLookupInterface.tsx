import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  User, 
  Package, 
  Calendar, 
  Eye, 
  Printer, 
  X, 
  CheckCircle2, 
  Globe, 
  Store 
} from 'lucide-react';
import { POSOrder } from '../../types/erp';
import { dataStore } from '../../config/firebase';
import { formatPrice } from '../../utils/currency';

interface ReceiptLookupInterfaceProps {
  orders?: POSOrder[];
}

export default function ReceiptLookupInterface({ orders: propOrders }: ReceiptLookupInterfaceProps) {
  const orders = propOrders || dataStore.getOrders();

  const [receiptNoFilter, setReceiptNoFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [receiptDateFilter, setReceiptDateFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<POSOrder | null>(null);

  const searchedReceipts = useMemo(() => {
    return orders.filter(order => {
      if (receiptNoFilter.trim()) {
        if (!order.id.toLowerCase().includes(receiptNoFilter.toLowerCase().trim())) return false;
      }

      if (customerNameFilter.trim()) {
        const queryCust = customerNameFilter.toLowerCase().trim();
        const custName = (order.customerName || '').toLowerCase();
        const cashierName = (order.cashierName || '').toLowerCase();
        if (!custName.includes(queryCust) && !cashierName.includes(queryCust)) return false;
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

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6 animate-fade-in">
      
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-indigo-600" /> Dedicated Receipt & Sales Invoice Lookup
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Filter and retrieve completed transaction receipts by Receipt Number, Customer Name, Specific Date, or Item Name.
        </p>
      </div>

      {/* 4 Dedicated Search Inputs Grid */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Field 1: Receipt Number */}
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

          {/* Field 2: Customer Name */}
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

          {/* Field 3: Specific Date */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              3. Transaction Date
            </label>
            <input
              type="date"
              value={receiptDateFilter}
              onChange={e => setReceiptDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Field 4: Item Name */}
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

        {/* Clear Filters Action */}
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

      {/* Results Table & Detail Drawer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Results List (8 columns) */}
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

        {/* Right Receipt Preview Box (4 columns) */}
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

              {/* Purchased items list */}
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

              {/* Payment Total */}
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
  );
}
