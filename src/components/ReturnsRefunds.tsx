import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  User, 
  RefreshCw,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { UserProfile, POSOrder, POSOrderItem, Product } from '../types/erp';
import { dataStore } from '../config/firebase';
import { formatPrice } from '../utils/currency';

interface ReturnsRefundsProps {
  activeUser: UserProfile;
}

interface ReturnRecord {
  id: string;
  orderId: string;
  returnedAt: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  totalRefundAmount: number;
  reason: string;
  refundMethod: 'cash' | 'original_payment_method';
  processedBy: string;
}

export default function ReturnsRefunds({ activeUser }: ReturnsRefundsProps) {
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [searchOrderId, setSearchOrderId] = useState('');
  const [matchedOrder, setMatchedOrder] = useState<POSOrder | null>(null);
  const [selectedItems, setSelectedItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [returnReason, setReturnReason] = useState('Damaged or Defective Item');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'original_payment_method'>('cash');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeCurrency, setActiveCurrency] = useState<string>(() => {
    return localStorage.getItem('erp_active_currency') || 'GHS';
  });

  const format = (amount: number, sourceCurrency: 'USD' | 'GHS' = 'USD') => {
    return formatPrice(amount, activeCurrency, sourceCurrency);
  };

  useEffect(() => {
    const handleRatesUpdate = () => {
      setActiveCurrency(localStorage.getItem('erp_active_currency') || 'GHS');
    };
    window.addEventListener('tumi_currency_rates_updated', handleRatesUpdate);
    return () => {
      window.removeEventListener('tumi_currency_rates_updated', handleRatesUpdate);
    };
  }, []);

  // Load orders and returns from storage
  useEffect(() => {
    setOrders(dataStore.getOrders());
    const storedReturns = localStorage.getItem('erp_sandbox_returns');
    if (storedReturns) {
      setReturns(JSON.parse(storedReturns));
    } else {
      // Seed default dummy return
      const defaultReturns: ReturnRecord[] = [
        {
          id: 'ret-72819',
          orderId: 'pos-10824',
          returnedAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
          items: [
            { productId: 'prod_1', name: 'Wireless Pro Mouse', quantity: 1, price: 49.99 }
          ],
          totalRefundAmount: 49.99,
          reason: 'Customer Exchange - Incorrect Size/Model',
          refundMethod: 'cash',
          processedBy: 'Sam Mireku'
        }
      ];
      localStorage.setItem('erp_sandbox_returns', JSON.stringify(defaultReturns));
      setReturns(defaultReturns);
    }
  }, []);

  const handleSearchOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setMatchedOrder(null);
    setSelectedItems([]);

    const found = orders.find(o => o.id.trim().toLowerCase() === searchOrderId.trim().toLowerCase());
    if (found) {
      setMatchedOrder(found);
      // Initialize with returning full quantities
      setSelectedItems(found.items.map(item => ({ productId: item.productId, quantity: item.quantity })));
    } else {
      setErrorMsg(`⚠ Search Failure: Order with ID "${searchOrderId}" was not found in the transaction log database.`);
    }
  };

  const handleQuantityChange = (productId: string, maxQty: number, value: number) => {
    if (value < 0) return;
    if (value > maxQty) {
      setErrorMsg(`Cannot return more than purchased quantity (${maxQty}).`);
      return;
    }
    setErrorMsg(null);
    setSelectedItems(selectedItems.map(item => 
      item.productId === productId ? { ...item, quantity: value } : item
    ));
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedOrder) return;

    // Filter only items actually being returned
    const itemsToReturn = matchedOrder.items.map(item => {
      const match = selectedItems.find(s => s.productId === item.productId);
      return {
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: match ? match.quantity : 0
      };
    }).filter(it => it.quantity > 0);

    if (itemsToReturn.length === 0) {
      setErrorMsg("Please select at least one item and quantity greater than 0 to return.");
      return;
    }

    const totalRefund = itemsToReturn.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const returnId = 'ret-' + Math.floor(10000 + Math.random() * 90000);

    const newReturn: ReturnRecord = {
      id: returnId,
      orderId: matchedOrder.id,
      returnedAt: new Date().toISOString(),
      items: itemsToReturn,
      totalRefundAmount: totalRefund,
      reason: returnReason,
      refundMethod: refundMethod,
      processedBy: activeUser.name
    };

    // 1. Stock Integration - put quantities back into Warehouse inventory
    itemsToReturn.forEach(item => {
      dataStore.updateStockLevel(item.productId, item.quantity);
    });

    // 2. Save Return
    const updatedReturns = [newReturn, ...returns];
    setReturns(updatedReturns);
    localStorage.setItem('erp_sandbox_returns', JSON.stringify(updatedReturns));

    // 3. Double-entry general ledger adjustments
    try {
      const doubleEntry = dataStore.getDoubleEntry();
      doubleEntry.unshift({
        id: 'je_' + Date.now() + '_ret',
        date: new Date().toISOString(),
        description: `Returned Merchandise Credit - Return #${returnId} (Order #${matchedOrder.id})`,
        debitAccount: '4010' as any, // Debit revenue (returns against sales)
        creditAccount: '1010' as any, // Credit Cash on Hand (refunding cash out)
        amount: totalRefund,
        createdBy: activeUser.name,
        verified: true,
        category: 'operating'
      } as any);
      localStorage.setItem('erp_sandbox_double_entry', JSON.stringify(doubleEntry));
    } catch (err) {
      console.error(err);
    }

    // 4. Log Audit Trail
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'UPDATE',
      `Return #${returnId}`,
      `Processed merchandise return for Order #${matchedOrder.id}. Refunded ${format(totalRefund)}.`
    );

    setMatchedOrder(null);
    setSearchOrderId('');
    setSelectedItems([]);
    setSuccessMsg(`✓ Refund Processed successfully! Return #${returnId} logged. Refund amount of ${format(totalRefund)} recorded and stock counts restored.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Module Title */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
          Sales & Customer Operations
        </span>
        <h1 className="text-xl font-bold text-slate-800 mt-1 font-sans">Returns & Refunds Manager</h1>
        <p className="text-xs text-slate-500 mt-0.5">Lookup original POS checkouts, manage item returns, execute stock re-integrations, and adjust account revenues instantly.</p>
      </div>

      {/* Messaging Panels */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold animate-fade-in flex items-center gap-2">
          <XCircle className="w-4.5 h-4.5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Lookup Order and Form (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <RotateCcw className="w-4.5 h-4.5 text-rose-600" /> Process Product Returns
            </h3>

            {/* Look up form */}
            <form onSubmit={handleSearchOrder} className="flex gap-2 text-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Enter original order id (e.g. pos-284918)..."
                  value={searchOrderId}
                  onChange={e => setSearchOrderId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Find Order
              </button>
            </form>

            {/* Matched order checkout info */}
            {matchedOrder && (
              <form onSubmit={handleSubmitReturn} className="border-t border-slate-100 pt-4 space-y-4 animate-fade-in">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800">Order: #{matchedOrder.id}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(matchedOrder.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span>Cashier: {matchedOrder.cashierName}</span>
                    <span className="font-bold text-slate-700">Total Purchase Value: {format(Number(matchedOrder.totalAmount || 0))}</span>
                  </div>
                </div>

                {/* Items select list */}
                <div className="space-y-3">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Choose Items to Return & Quantity
                  </label>

                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl px-4 bg-white">
                    {matchedOrder.items.map(item => {
                      const selectedItem = selectedItems.find(s => s.productId === item.productId);
                      const currentQty = selectedItem ? selectedItem.quantity : 0;

                      return (
                        <div key={item.productId} className="py-3 flex items-center justify-between text-xs gap-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-400">Purchased: {item.quantity} units @ {format(item.price)} each</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-400">Qty to Return:</span>
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={currentQty}
                              onChange={e => handleQuantityChange(item.productId, item.quantity, parseInt(e.target.value) || 0)}
                              className="w-16 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold font-mono focus:outline-none focus:border-rose-500"
                            />
                            <span className="w-16 text-right font-mono font-bold text-slate-700">
                              {format(item.price * currentQty)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Return reason and refund details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reason for Return</label>
                    <select
                      value={returnReason}
                      onChange={e => setReturnReason(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:border-rose-500"
                    >
                      <option value="Damaged or Defective Item">Damaged or Defective Item</option>
                      <option value="Incorrect Model or Variant Delivered">Incorrect Model or Variant Delivered</option>
                      <option value="Customer Dissatisfied / Refund Request">Customer Dissatisfied / Refund Request</option>
                      <option value="Customer Changed Mind">Customer Changed Mind</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Refund Method</label>
                    <select
                      value={refundMethod}
                      onChange={e => setRefundMethod(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:border-rose-500"
                    >
                      <option value="cash">Refill register cash Drawer (Cash Refund)</option>
                      <option value="original_payment_method">Reverse Digital Transaction Gateways</option>
                    </select>
                  </div>
                </div>

                {/* Return Actions */}
                <div className="pt-3 border-t flex gap-3">
                  <button
                    type="submit"
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-rose-500/10 transition-all"
                  >
                    ✓ Complete Return & Approve Refund of {format(matchedOrder.items.reduce((sum, item) => {
                      const match = selectedItems.find(s => s.productId === item.productId);
                      return sum + (item.price * (match ? match.quantity : 0));
                    }, 0))}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMatchedOrder(null);
                      setSearchOrderId('');
                    }}
                    className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider border border-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT: Returns History log (5 Columns) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span>Returns & Refunds History Log</span>
            <span className="text-[10px] font-mono text-slate-400">({returns.length} records)</span>
          </h3>

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {returns.map(ret => (
              <div key={ret.id} className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-rose-700">{ret.id}</span>
                    <span className="text-[9px] text-slate-400 block font-mono">{new Date(ret.returnedAt).toLocaleString()}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-rose-700">-{format(ret.totalRefundAmount)}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200 mt-0.5 inline-block">
                      {ret.refundMethod === 'cash' ? 'Cash Re-filled' : 'Reversal Sent'}
                    </span>
                  </div>
                </div>

                <div className="pt-1 text-[11px] text-slate-600 space-y-1">
                  <p><strong className="text-slate-400 uppercase text-[9px] tracking-wide">Original POS Sale:</strong> #{ret.orderId}</p>
                  <p><strong className="text-slate-400 uppercase text-[9px] tracking-wide">Reason:</strong> {ret.reason}</p>
                  <div className="space-y-0.5 border-t border-slate-200/50 pt-1 mt-1 font-sans">
                    {ret.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-slate-500 text-[10px]">
                        <span>{it.name} x{it.quantity}</span>
                        <span>{format(it.price * it.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
