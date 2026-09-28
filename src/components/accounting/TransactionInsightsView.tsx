import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coins, 
  CreditCard, 
  Smartphone, 
  RotateCcw, 
  Percent, 
  Sliders, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Search, 
  Calendar,
  FileSpreadsheet,
  Package,
  Receipt
} from 'lucide-react';
import { POSOrder, UserProfile } from '../../types/erp';
import { dataStore } from '../../config/firebase';
import { formatPrice } from '../../utils/currency';

interface TransactionInsightsViewProps {
  orders: POSOrder[];
  activeUser: UserProfile;
}

export default function TransactionInsightsView({ orders, activeUser }: TransactionInsightsViewProps) {
  // Load returns from store
  const [returnsList, setReturnsList] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('erp_sandbox_returns');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      {
        id: 'ret_101',
        orderId: 'pos-100234',
        customerName: 'Kwame Mensah',
        returnedAt: new Date(Date.now() - 86400000).toISOString(),
        totalRefundAmount: 45.00,
        reason: 'Sizing Issue / Unused',
        items: [{ productId: 'prod_1', name: 'Wireless Pro Mouse', quantity: 1, price: 45.00 }],
        processedBy: 'Store Manager'
      }
    ];
  });

  // Load audit trail stock adjustments
  const auditLogs = useMemo(() => {
    const logs = dataStore.getAuditTrail();
    return logs.filter(l => l.action === 'RESTOCK' || l.action === 'UPDATE' || l.details.toLowerCase().includes('stock') || l.details.toLowerCase().includes('refund'));
  }, []);

  // Payment Breakdown
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
        cashSum += o.totalAmount;
        cashCount += 1;
      }
    });

    const totalRev = cashSum + momoSum + cardSum + billedSum || 1;

    return {
      cash: { total: cashSum, count: cashCount, pct: ((cashSum / totalRev) * 100).toFixed(1) },
      momo: { total: momoSum, count: momoCount, pct: ((momoSum / totalRev) * 100).toFixed(1) },
      card: { total: cardSum, count: cardCount, pct: ((cardSum / totalRev) * 100).toFixed(1) },
      billed: { total: billedSum, count: billedCount, pct: ((billedSum / totalRev) * 100).toFixed(1) }
    };
  }, [orders]);

  // Discounts Overview
  const discountsOverview = useMemo(() => {
    let totalDiscountGranted = 0;
    let discountedOrdersCount = 0;
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
      discountedOrdersList
    };
  }, [orders]);

  // Returns Summary
  const returnsTotalValue = useMemo(() => {
    return returnsList.reduce((sum, r) => sum + (r.totalRefundAmount || 0), 0);
  }, [returnsList]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-1">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Coins className="w-5 h-5 text-indigo-600" /> Transaction Insights & Sales Audit Dashboard
        </h2>
        <p className="text-xs text-slate-500">
          Analyze sales grouped by payment tender (Cash, MoMo, Card, Billed To Account) alongside discounts, customer refunds, and stock adjustments.
        </p>
      </div>

      {/* SECTION 1: PAYMENT METHOD BREAKDOWN CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Cash */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              💵 Cash Tender
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              {paymentBreakdown.cash.pct}%
            </span>
          </div>

          <div>
            <span className="text-xl font-mono font-black text-slate-900 block">
              {formatPrice(paymentBreakdown.cash.total)}
            </span>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
              {paymentBreakdown.cash.count} in-store transactions
            </span>
          </div>

          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${paymentBreakdown.cash.pct}%` }} />
          </div>
        </div>

        {/* Mobile Money */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              📱 Mobile Money (MoMo)
            </span>
            <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
              {paymentBreakdown.momo.pct}%
            </span>
          </div>

          <div>
            <span className="text-xl font-mono font-black text-slate-900 block">
              {formatPrice(paymentBreakdown.momo.total)}
            </span>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
              {paymentBreakdown.momo.count} MTN / Telecel / AT transfers
            </span>
          </div>

          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${paymentBreakdown.momo.pct}%` }} />
          </div>
        </div>

        {/* Credit Card / Stripe */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              💳 Credit / Card / Stripe
            </span>
            <span className="text-[10px] bg-sky-50 text-sky-700 font-bold px-2 py-0.5 rounded-full border border-sky-200">
              {paymentBreakdown.card.pct}%
            </span>
          </div>

          <div>
            <span className="text-xl font-mono font-black text-slate-900 block">
              {formatPrice(paymentBreakdown.card.total)}
            </span>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
              {paymentBreakdown.card.count} terminal & online sales
            </span>
          </div>

          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full" style={{ width: `${paymentBreakdown.card.pct}%` }} />
          </div>
        </div>

        {/* Billed To Account */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              📌 Billed To Account
            </span>
            <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
              {paymentBreakdown.billed.pct}%
            </span>
          </div>

          <div>
            <span className="text-xl font-mono font-black text-slate-900 block">
              {formatPrice(paymentBreakdown.billed.total)}
            </span>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
              {paymentBreakdown.billed.count} Room / Payroll / Student Folios
            </span>
          </div>

          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full" style={{ width: `${paymentBreakdown.billed.pct}%` }} />
          </div>
        </div>

      </div>

      {/* SECTION 2: DISCOUNTS & REFUNDS DUAL PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DISCOUNTS OVERVIEW */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-rose-600" /> Discounts Granted Overview
            </h3>
            <span className="text-xs font-mono font-extrabold text-rose-600">
              -{formatPrice(discountsOverview.totalDiscountGranted)} Total Concessions
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
            <span>Discounted Orders:</span>
            <span className="font-mono font-bold text-slate-800">{discountsOverview.discountedOrdersCount} sales</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {discountsOverview.discountedOrdersList.length === 0 ? (
              <p className="text-center text-slate-400 italic text-xs py-6">No order discounts recorded.</p>
            ) : (
              discountsOverview.discountedOrdersList.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-800">#{item.order.id}</span>
                    <span className="text-[10px] text-slate-400 block">{item.order.customerName || 'Walk-in Customer'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-extrabold text-rose-600 block">-${formatPrice(item.discountAmount)}</span>
                    <span className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded font-mono font-bold">
                      {item.discountType === 'percent' ? `${item.discountValue}% OFF` : 'Cash Discount'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* REFUNDS & RETURNS OVERVIEW */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-amber-600" /> Customer Returns & Refunds
            </h3>
            <span className="text-xs font-mono font-extrabold text-amber-600">
              {formatPrice(returnsTotalValue)} Refunded
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
            <span>Total Returns Logged:</span>
            <span className="font-mono font-bold text-slate-800">{returnsList.length} items returned</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {returnsList.length === 0 ? (
              <p className="text-center text-slate-400 italic text-xs py-6">No customer refunds on file.</p>
            ) : (
              returnsList.map((ret, idx) => (
                <div key={idx} className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-slate-800">Return #{ret.id}</span>
                    <span className="font-mono font-extrabold text-amber-600">{formatPrice(ret.totalRefundAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Customer: {ret.customerName || 'N/A'}</span>
                    <span>Reason: {ret.reason || 'Customer Return'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* SECTION 3: STOCK ADJUSTMENTS & AUDIT TRAIL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-purple-600" /> Recent Inventory Adjustments & Restocks Audit
        </h3>

        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <p className="text-center text-slate-400 italic text-xs py-6">No manual stock adjustments recorded.</p>
          ) : (
            auditLogs.slice(0, 10).map((log, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800">{log.details}</p>
                  <p className="text-[10px] text-slate-400 font-mono">By: {log.userName} | Record: {log.affectedRecord}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
