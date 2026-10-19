import React, { useState } from 'react';
import { Compass, CheckCircle2, ArrowRight, ArrowLeft, X, Sparkles, Eye, ShieldCheck, ShoppingCart, Building2, Package, Flame } from 'lucide-react';

interface GuidedSpotlightTourProps {
  tabId: string;
  onClose: () => void;
  onNavigateToTab: (tabId: string) => void;
}

interface SpotlightStep {
  targetSelector: string;
  title: string;
  description: string;
  plainTip: string;
  icon: any;
}

export default function GuidedSpotlightTour({ tabId, onClose, onNavigateToTab }: GuidedSpotlightTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const toursByTab: Record<string, SpotlightStep[]> = {
    pos: [
      {
        targetSelector: '#pos-product-catalog',
        title: "Product Catalog Grid",
        description: "Tap or click any product card on the left side of your screen to add items to your shopping cart.",
        plainTip: "You can also use a barcode scanner or tablet camera to scan product codes!",
        icon: ShoppingCart
      },
      {
        targetSelector: '#pos-cart-totals',
        title: "Cart Totals & Optional Tax Checkbox",
        description: "Review total cart subtotal, discount, and toggle the optional Tax/VAT checkbox.",
        plainTip: "Cashiers can turn tax on or off with a single tap based on the sale!",
        icon: Sparkles
      },
      {
        targetSelector: '#pos-checkout-button',
        title: "Complete Checkout & Print Receipt",
        description: "Click Complete Checkout to select Cash, Card, or Mobile Money and generate an instant PDF receipt.",
        plainTip: "Works offline! If internet drops, sales are saved on your tablet and synced automatically later.",
        icon: CheckCircle2
      }
    ],
    hospitality: [
      {
        targetSelector: '#hotel-tape-chart',
        title: "Hotel Room Tape Chart & Status Board",
        description: "View all room statuses: Green = Clean & Ready, Yellow = Occupied, Amber = Needs Housekeeping.",
        plainTip: "Click any room card to see weekend pricing or guest details!",
        icon: Building2
      },
      {
        targetSelector: '#hotel-quick-book',
        title: "Quick Book Room / Walk-In Check-In",
        description: "Click Quick Book Room on an available green room card to register a walk-in guest in 10 seconds.",
        plainTip: "Select payment mode: POS payment, Online receipt number, or Bill to Individual for checkout payment.",
        icon: Compass
      },
      {
        targetSelector: '#hotel-extend-stay',
        title: "Extend Guest Stay",
        description: "If a guest wants to extend their stay, open their active room folio and click 'Extend Stay'!",
        plainTip: "Recalculates additional night costs and updates room availability automatically.",
        icon: Eye
      }
    ],
    inventory: [
      {
        targetSelector: '#inventory-table',
        title: "Stockroom Catalog & Red Warning Badges",
        description: "See exact quantities of every item on your warehouse shelves.",
        plainTip: "Red warning badges alert you when items fall below safety reorder points!",
        icon: Package
      },
      {
        targetSelector: '#inventory-restock-btn',
        title: "Restock Shipment & AI Receipt OCR",
        description: "Click Restock Item or upload supplier delivery notes to auto-import inventory in seconds.",
        plainTip: "Keeps your shelf stock accurate across all store registers.",
        icon: Sparkles
      }
    ],
    sysadmin: [
      {
        targetSelector: '#header-pin-btn',
        title: "Fast Shift Switch via 4-Digit Secret PIN",
        description: "Click your name or 'PIN' at the top right of your screen to switch workers instantly.",
        plainTip: "Sarah = 1111, David = 2222, Michael = 3333. Every worker has their own secret PIN!",
        icon: ShieldCheck
      },
      {
        targetSelector: '#sysadmin-roles-tab',
        title: "Boss Permissions & Security Rules",
        description: "Managers can customize permissions so cashiers only see the register and can't delete sales.",
        plainTip: "Keeps your store finances completely safe and audited.",
        icon: Sparkles
      }
    ],
    heatmap: [
      {
        targetSelector: '#heatmap-grid',
        title: "Executive KPI Heatmap Matrix",
        description: "Dark Green = Exceeding Target, Amber = Watchlist, Red = Action Needed.",
        plainTip: "Click any cell to open raw transaction logs, Recharts trend lines, and staff contributions!",
        icon: Flame
      },
      {
        targetSelector: '#heatmap-anomaly-toggle',
        title: "Real-Time Gemini Anomaly Detection",
        description: "Toggle Anomaly Detection ON to let Gemini AI highlight statistical deviations.",
        plainTip: "Alerts managers to unexpected sales spikes or stockout hazards!",
        icon: Sparkles
      }
    ]
  };

  const steps = toursByTab[tabId] || toursByTab['pos'];
  const step = steps[currentStep] || steps[0];

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-4 sm:p-8 animate-fade-in">
      {/* Visual Semi-Transparent Spotlight Backdrop Overlay */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] pointer-events-auto" onClick={onClose} />

      {/* Floating Guided Tour Spotlight Card */}
      <div className="relative z-10 max-w-lg w-full mx-auto my-auto bg-slate-900 border-2 border-indigo-500 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100 pointer-events-auto ring-4 ring-indigo-500/30">
        
        {/* Spotlight Card Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
              <step.icon className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                Guided On-Screen Tour • Step {currentStep + 1} of {steps.length}
              </span>
              <h3 className="text-base font-black text-white mt-0.5">
                {step.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
            title="Exit Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Description */}
        <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
          {step.description}
        </p>

        {/* Plain Tip Box */}
        <div className="p-3 bg-indigo-950/80 border border-indigo-800/80 rounded-2xl text-indigo-200 text-xs flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <span className="font-sans"><strong>Pro Tip:</strong> {step.plainTip}</span>
        </div>

        {/* Tour Navigation Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
            {steps.map((_, idx) => (
              <span 
                key={idx} 
                className={`w-2 h-2 rounded-full ${currentStep === idx ? 'bg-indigo-400 scale-125' : 'bg-slate-700'}`} 
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (currentStep < steps.length - 1) {
                setCurrentStep(prev => prev + 1);
              } else {
                onClose();
              }
            }}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
          >
            <span>{currentStep === steps.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
