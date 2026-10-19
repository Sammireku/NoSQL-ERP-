import React, { useState } from 'react';
import { Coins, Check, Edit3 } from 'lucide-react';
import { currencyStore, ExchangeRate } from '../../utils/currencyStore';
import { formatPrice } from '../../utils/currency';

interface CurrencyConversionWidgetProps {
  rates: ExchangeRate[];
  onRatesUpdated: (newRates: ExchangeRate[]) => void;
}

export default function CurrencyConversionWidget({ rates, onRatesUpdated }: CurrencyConversionWidgetProps) {
  const [calcAmount, setCalcAmount] = useState<string>('100');
  const [calcCurrency, setCalcCurrency] = useState<string>('USD');
  const [calcDirection, setCalcDirection] = useState<'buy' | 'sell'>('buy');
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [editedRates, setEditedRates] = useState<ExchangeRate[]>([]);

  const handleStartEditing = () => {
    setEditedRates(JSON.parse(JSON.stringify(rates)));
    setIsEditingRates(true);
  };

  const handleRateChange = (currency: string, field: 'buyingRate' | 'sellingRate', value: number) => {
    setEditedRates(prev => prev.map(r => r.currency === currency ? { ...r, [field]: value } : r));
  };

  const handleSaveRates = () => {
    currencyStore.saveRates(editedRates);
    onRatesUpdated(editedRates);
    setIsEditingRates(false);
  };

  const selectedRateObj = rates.find(r => r.currency === calcCurrency) || rates[0];
  const activeRate = calcDirection === 'buy' ? selectedRateObj?.buyingRate || 1 : selectedRateObj?.sellingRate || 1;
  const numAmount = parseFloat(calcAmount) || 0;
  const convertedGhs = numAmount * activeRate;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 font-sans text-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white uppercase tracking-tight">
              FX Currency Conversion Matrix
            </h3>
            <p className="text-[11px] text-slate-400">
              Live buying & selling exchange rates for USD, GBP, and EUR to GHS
            </p>
          </div>
        </div>

        {!isEditingRates ? (
          <button
            type="button"
            onClick={handleStartEditing}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Edit Currency Exchange Rates"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit Rates</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSaveRates}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save FX Rates</span>
          </button>
        )}
      </div>

      {/* Exchange Rates Grid or Edit Table */}
      {!isEditingRates ? (
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
          {rates.map(r => (
            <div key={r.currency} className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 space-y-1">
              <span className="font-extrabold text-indigo-400 block uppercase font-sans text-[11px]">{r.currency}</span>
              <div className="text-[10px] text-slate-400">
                Buy: <strong className="text-emerald-400">{r.buyingRate.toFixed(2)}</strong>
              </div>
              <div className="text-[10px] text-slate-400">
                Sell: <strong className="text-amber-400">{r.sellingRate.toFixed(2)}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 text-xs font-mono">
          {editedRates.map(r => (
            <div key={r.currency} className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
              <span className="font-bold text-indigo-400 font-sans">{r.currency}:</span>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-400">
                  Buy: 
                  <input
                    type="number"
                    step="0.01"
                    value={r.buyingRate}
                    onChange={(e) => handleRateChange(r.currency, 'buyingRate', parseFloat(e.target.value) || 0)}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 ml-1 text-white"
                  />
                </label>
                <label className="text-[10px] text-slate-400">
                  Sell: 
                  <input
                    type="number"
                    step="0.01"
                    value={r.sellingRate}
                    onChange={(e) => handleRateChange(r.currency, 'sellingRate', parseFloat(e.target.value) || 0)}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 ml-1 text-white"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Calculator Panel */}
      <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Quick Rate Calculator</span>
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setCalcDirection('buy')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${calcDirection === 'buy' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setCalcDirection('sell')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${calcDirection === 'sell' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
            >
              Sell
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={calcAmount}
            onChange={(e) => setCalcAmount(e.target.value)}
            className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 font-mono text-white text-xs focus:outline-none focus:border-indigo-500"
          />

          <select
            value={calcCurrency}
            onChange={(e) => setCalcCurrency(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
          >
            {rates.map(r => (
              <option key={r.currency} value={r.currency}>{r.currency}</option>
            ))}
          </select>

          <span className="text-slate-400 font-bold">=</span>

          <span className="font-mono font-black text-emerald-400 text-sm">
            {formatPrice(convertedGhs, 'GHS', 'USD')}
          </span>
        </div>
      </div>

    </div>
  );
}
