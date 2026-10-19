import React, { useState } from 'react';
import { Calendar, DollarSign, X, Check, ShoppingCart, FileText, CreditCard, ChevronRight } from 'lucide-react';
import { Booking, Room } from '../../types/erp';
import { formatPrice } from '../../utils/currency';

interface ExtendStayModalProps {
  booking: Booking;
  room: Room | null;
  activeCurrency?: string;
  onConfirmExtend: (params: {
    bookingId: string;
    newCheckOutDate: string;
    additionalNights: number;
    additionalCost: number;
    billingType: 'pay_now_pos' | 'online_receipt' | 'bill_to_individual';
    onlineReceiptNumber?: string;
  }) => void;
  onClose: () => void;
}

export default function ExtendStayModal({
  booking,
  room,
  activeCurrency = 'GHS',
  onConfirmExtend,
  onClose
}: ExtendStayModalProps) {
  const [newCheckOutDate, setNewCheckOutDate] = useState<string>(() => {
    const currOut = new Date(booking.checkOutDate);
    currOut.setDate(currOut.getDate() + 2);
    return currOut.toISOString().split('T')[0];
  });

  const [billingType, setBillingType] = useState<'pay_now_pos' | 'online_receipt' | 'bill_to_individual'>('pay_now_pos');
  const [onlineReceiptNumber, setOnlineReceiptNumber] = useState<string>(booking.onlineReceiptNumber || '');

  // Calculate additional nights and cost
  const origOut = new Date(booking.checkOutDate);
  const nextOut = new Date(newCheckOutDate);
  const diffTime = nextOut.getTime() - origOut.getTime();
  const additionalNights = Math.max(1, Math.ceil(diffTime / (1000 * 3600 * 24)));
  const roomPricePerNight = room?.nightlyRate || 120;
  const additionalCost = additionalNights * roomPricePerNight;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (additionalNights <= 0) return;

    onConfirmExtend({
      bookingId: booking.id,
      newCheckOutDate,
      additionalNights,
      additionalCost,
      billingType,
      onlineReceiptNumber: billingType === 'online_receipt' ? onlineReceiptNumber : undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100 relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md">
              <Calendar className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                Hospitality Guest Extension
              </span>
              <h3 className="text-lg font-black text-white mt-0.5">
                Extend Guest Stay (Room #{booking.roomNumber || '101'})
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guest Summary Info */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 text-xs">
          <div className="flex justify-between font-bold text-white">
            <span>Guest Name: {booking.guestName}</span>
            <span className="text-amber-400 font-mono">Current Check-Out: {booking.checkOutDate}</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Room Rate: <strong>{formatPrice(roomPricePerNight, activeCurrency, 'USD')}</strong> per night
          </p>
        </div>

        {/* Extension Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* New Check-Out Date Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Select New Check-Out Date:
            </label>
            <input
              type="date"
              value={newCheckOutDate}
              min={booking.checkOutDate}
              onChange={(e) => setNewCheckOutDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              required
            />
          </div>

          {/* Additional Cost Calculation Banner */}
          <div className="p-3.5 bg-indigo-950/60 border border-indigo-800 rounded-2xl flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">Extension Summary:</span>
              <span className="text-white font-bold">{additionalNights} Additional Night(s)</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">Extension Total Due:</span>
              <span className="text-base font-extrabold text-amber-400">{formatPrice(additionalCost, activeCurrency, 'USD')}</span>
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Payment & Billing Routing for Stay Extension:
            </label>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <label className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                billingType === 'pay_now_pos' ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="extBilling"
                    checked={billingType === 'pay_now_pos'}
                    onChange={() => setBillingType('pay_now_pos')}
                    className="text-indigo-600"
                  />
                  <div>
                    <strong className="text-white block">Send Payment to POS Register Now</strong>
                    <span className="text-[10px] text-slate-400">Launch POS register checkout for immediate guest payment settlement</span>
                  </div>
                </div>
                <ShoppingCart className="w-4 h-4 text-emerald-400 shrink-0" />
              </label>

              <label className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                billingType === 'online_receipt' ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="extBilling"
                    checked={billingType === 'online_receipt'}
                    onChange={() => setBillingType('online_receipt')}
                    className="text-indigo-600"
                  />
                  <div>
                    <strong className="text-white block">Online Payment Recorded</strong>
                    <span className="text-[10px] text-slate-400">Record external online payment transaction reference number</span>
                  </div>
                </div>
                <CreditCard className="w-4 h-4 text-indigo-400 shrink-0" />
              </label>

              {billingType === 'online_receipt' && (
                <div className="pl-6 pt-1">
                  <input
                    type="text"
                    placeholder="Enter Online Receipt / Transaction Ref (e.g. TXN-882910)..."
                    value={onlineReceiptNumber}
                    onChange={(e) => setOnlineReceiptNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
              )}

              <label className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                billingType === 'bill_to_individual' ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="extBilling"
                    checked={billingType === 'bill_to_individual'}
                    onChange={() => setBillingType('bill_to_individual')}
                    className="text-indigo-600"
                  />
                  <div>
                    <strong className="text-white block">Bill to Guest Folio (Pay on Checkout)</strong>
                    <span className="text-[10px] text-slate-400">Appends extension charge to room folio statement for later settlement</span>
                  </div>
                </div>
                <FileText className="w-4 h-4 text-amber-400 shrink-0" />
              </label>
            </div>
          </div>

          {/* Submit & Close Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Stay Extension</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
