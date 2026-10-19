import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  Sparkles, 
  ShoppingCart, 
  Building2, 
  Package, 
  TrendingUp, 
  ShieldCheck, 
  Globe, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Lightbulb, 
  X, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw, 
  Search, 
  Send, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Zap, 
  Flame, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  Check, 
  Compass, 
  Tv, 
  FileText,
  Sliders,
  Smartphone,
  Eye
} from 'lucide-react';
import { UserProfile } from '../types/erp';

interface AppWalkthroughGuideProps {
  activeUser: UserProfile;
  onNavigateToTab?: (tabId: string) => void;
  onClose?: () => void;
  onStartSpotlightTour?: (tabId: string) => void;
}

export interface VideoSlide {
  id: number;
  title: string;
  badge: string;
  icon: any;
  color: string;
  tabId: string;
  analogy: string;
  screenSummary: string;
  steps: string[];
  mockupType: 'pos' | 'hotel' | 'warehouse' | 'crm' | 'finance' | 'sysadmin' | 'heatmap';
  spotlightHint: string;
}

export default function AppWalkthroughGuide({ 
  activeUser, 
  onNavigateToTab, 
  onClose,
  onStartSpotlightTour
}: AppWalkthroughGuideProps) {
  const [guideMode, setGuideMode] = useState<'video' | 'tutorial' | 'ask_ai' | 'faq'>('video');
  
  // Video Player States
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 1x, 1.5x, 2x
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);

  // Interactive AI Help Screen States
  const [aiQuery, setAiQuery] = useState('');
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [aiResponse, setAiResponse] = useState<{
    answer: string;
    steps: string[];
    recommendedTab: string;
    recommendedTabName: string;
    quickTips: string[];
  } | null>(null);

  // FAQ Search State
  const [faqSearch, setFaqSearch] = useState('');

  // Video Slide Data
  const videoSlides: VideoSlide[] = [
    {
      id: 1,
      title: "Welcome to Tumi ERP — Your Business Control Center",
      badge: "The Big Picture",
      icon: Sparkles,
      color: "bg-indigo-600 text-white",
      tabId: 'sysadmin',
      analogy: "Imagine having a store cashier, a hotel manager, a warehouse helper, and an accountant all sitting in one quiet room helping you run your business without mistakes.",
      screenSummary: "Tumi ERP connects your shop sales, hotel room bookings, stockroom inventory, and staff accounts into one simple screen.",
      steps: [
        "1. Look at the top navigation bar to switch between your shop, hotel, and warehouse.",
        "2. Click your name at the top right to switch workers using a 4-digit secret PIN.",
        "3. Everything updates automatically in real-time across all staff tablets and phones."
      ],
      mockupType: 'sysadmin',
      spotlightHint: "Top Header Bar: Click 'PIN' anytime to switch worker shifts in 2 seconds."
    },
    {
      id: 2,
      title: "Ringing Up Shop Sales (POS Cash Register)",
      badge: "Store Checkout",
      icon: ShoppingCart,
      color: "bg-emerald-600 text-white",
      tabId: 'pos',
      analogy: "Think of this like a smart digital supermarket checkout register on your tablet or computer screen.",
      screenSummary: "When a customer comes to buy items from your store, use this screen to ring up their items and issue a receipt.",
      steps: [
        "1. Tap or click product cards on the left to add items to your shopping cart.",
        "2. Toggle optional Tax / VAT or apply student/staff discounts with one click.",
        "3. Select Cash, Card, or Mobile Money and click 'Complete Checkout'!",
        "4. Works Offline! If internet drops, sales are saved on your device and synced automatically later."
      ],
      mockupType: 'pos',
      spotlightHint: "POS Register: Tap product cards -> Click Complete Checkout -> Print Invoice."
    },
    {
      id: 3,
      title: "Managing Hotel Rooms & Guests (Hospitality & OTAs)",
      badge: "Hotel & Guesthouse",
      icon: Building2,
      color: "bg-rose-600 text-white",
      tabId: 'hospitality',
      analogy: "Think of this like a big magnetic board on your hotel wall showing every room number and guest.",
      screenSummary: "Check which rooms are ready for guests, record walk-in check-ins, bill room charges, and extend guest stays.",
      steps: [
        "1. Green Rooms = Clean & Ready • Yellow Rooms = Occupied • Amber = Needs Housekeeping.",
        "2. Click 'Quick Book Room' on any green card to reserve a room in 10 seconds.",
        "3. Choose 'Send Payment to POS', 'Online Receipt', or 'Bill to Individual' for payment.",
        "4. Click 'Extend Stay' anytime if a guest wants to stay additional nights!"
      ],
      mockupType: 'hotel',
      spotlightHint: "Hotel Board: Click 'Quick Book' to check in guests or 'Extend Stay' on active folios."
    },
    {
      id: 4,
      title: "Warehouse Inventory & Low-Stock Alerts",
      badge: "Stockroom Shelves",
      icon: Package,
      color: "bg-amber-600 text-white",
      tabId: 'inventory',
      analogy: "Think of this like a digital count of every box on your stockroom shelf.",
      screenSummary: "Always know how many products you have left so you never tell a customer 'out of stock'.",
      steps: [
        "1. Green Stock Numbers = Plenty of stock available on your shelves.",
        "2. Red Warning Badges = Low stock alert! Time to reorder from suppliers.",
        "3. Click 'Restock Item' when a supplier delivers new boxes to update stock counts.",
        "4. Scan or upload supplier delivery receipts to auto-import inventory items using AI."
      ],
      mockupType: 'warehouse',
      spotlightHint: "Warehouse: Check red warning badges -> Click 'Restock Item' when goods arrive."
    },
    {
      id: 5,
      title: "Customer Leads & Deal Stages (CRM Sales Kanban)",
      badge: "Sales Tracker",
      icon: TrendingUp,
      color: "bg-sky-600 text-white",
      tabId: 'crm',
      analogy: "Think of this like a sticky-note board tracking people who want to buy from your company.",
      screenSummary: "Keep track of customer inquiries, phone quotes, and contract deals so no customer is forgotten.",
      steps: [
        "1. Drag customer cards from 'New Lead' -> 'Proposal Sent' -> 'Closed Won'.",
        "2. Click any customer card to type phone call notes or draft AI email responses."
      ],
      mockupType: 'crm',
      spotlightHint: "CRM Kanban: Drag deal cards across columns as sales progress."
    },
    {
      id: 6,
      title: "Financial Ledger & Petty Cash Disbursals",
      badge: "Money & Accounts",
      icon: DollarSign,
      color: "bg-teal-600 text-white",
      tabId: 'financials',
      analogy: "Think of this like your digital company checkbook and petty cash box.",
      screenSummary: "Record sales income, shop expenses, taxi vouchers, and GRA tax payments with zero math errors.",
      steps: [
        "1. View live cash flow totals and operating margins updated in real time.",
        "2. Request or approve petty cash vouchers with digital receipt photo attachments.",
        "3. Customize GRA E-VAT tax rates (Standard 21.9%, Flat 4%, or Exempt) per sale."
      ],
      mockupType: 'finance',
      spotlightHint: "Financial Ledger: Check cash flow -> Approve petty cash vouchers."
    },
    {
      id: 7,
      title: "Staff Roles, PIN Codes & Security Rules",
      badge: "Boss Control Room",
      icon: ShieldCheck,
      color: "bg-purple-600 text-white",
      tabId: 'sysadmin',
      analogy: "Think of this like giving different workers different keys to your store.",
      screenSummary: "Give Managers full access, while Cashiers only see the register so nobody accidentally deletes sales.",
      steps: [
        "1. Add new staff by entering their name, email, and 4-digit secret PIN.",
        "2. Send PINs directly via WhatsApp or Email.",
        "3. Review immutable audit logs showing every price change and system action."
      ],
      mockupType: 'sysadmin',
      spotlightHint: "System Admin: Manage staff PINs -> Customize multi-role permissions."
    },
    {
      id: 8,
      title: "Executive Real-Time KPI Heatmap & AI Anomalies",
      badge: "CEO Command Matrix",
      icon: Flame,
      color: "bg-rose-700 text-white",
      tabId: 'heatmap',
      analogy: "Think of this like a weather radar map showing which business departments are hot and performing well.",
      screenSummary: "At-a-glance performance matrix across Sales, Hotel, Warehouse, and Finance for CEOs and Managers.",
      steps: [
        "1. Color Scale: Dark Green = Exceeding Target • Amber = Watchlist • Red = Action Needed.",
        "2. Click any heatmap cell to inspect raw transactions, Recharts trend lines, and staff scores.",
        "3. Toggle 'Gemini Anomaly Detection' to automatically highlight statistical deviations."
      ],
      mockupType: 'heatmap',
      spotlightHint: "KPI Heatmap: Click cells to inspect raw transaction logs -> Toggle AI Anomaly Detection."
    }
  ];

  const currentSlide = videoSlides[currentSlideIdx];

  // Auto-play timer effect for Video Walkthrough
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isPlaying && guideMode === 'video') {
      timer = setInterval(() => {
        setVideoProgress(prev => {
          if (prev >= 100) {
            // Advance to next slide
            if (currentSlideIdx < videoSlides.length - 1) {
              setCurrentSlideIdx(idx => idx + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 100;
            }
          }
          return prev + (5 * playbackSpeed);
        });
      }, 300);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, guideMode, currentSlideIdx, playbackSpeed, videoSlides.length]);

  // Handle slide change resets
  const handleSelectSlide = (idx: number) => {
    setCurrentSlideIdx(idx);
    setVideoProgress(0);
  };

  // Handle AI Question Submission
  const handleAskAiHelp = async (queryText?: string) => {
    const textToSubmit = queryText || aiQuery;
    if (!textToSubmit.trim()) return;

    setIsAskingAi(true);
    setAiResponse(null);

    try {
      const res = await fetch('/api/ai/ask-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSubmit, activeUserRole: activeUser.role })
      });
      const data = await res.json();
      if (data && data.answer) {
        setAiResponse(data);
      }
    } catch (err) {
      console.warn("AI Help error, using fallback:", err);
      // Client-side fallback
      setAiResponse({
        answer: `Here is how to perform "${textToSubmit}" in Tumi ERP:`,
        steps: [
          "1. Use the navigation menu at the top of your screen to open the matching module.",
          "2. Click any item or action button to perform your task.",
          "3. All changes update instantly across your store and cloud database."
        ],
        recommendedTab: 'pos',
        recommendedTabName: 'POS Cash Register',
        quickTips: ["You can switch worker accounts anytime using your 4-digit secret PIN."]
      });
    } finally {
      setIsAskingAi(false);
    }
  };

  // Preset Questions
  const presetQuestions = [
    "How do I ring up a customer sale at the cash register?",
    "How do I check in a walk-in hotel guest?",
    "How do I extend a hotel guest's stay?",
    "How do I check which warehouse items are running low?",
    "How do I switch workers using my 4-digit PIN?",
    "What should I do if the internet connection drops?",
    "Where can I see my daily store sales revenue?",
    "How do I add a new employee or cashier?"
  ];

  // FAQ Items Bank
  const faqItems = [
    {
      q: "What happens if our internet connection drops in the store?",
      a: "Don't worry at all! Tumi ERP has built-in Offline Mode. Cashiers can continue ringing up customer sales on their tablet or computer. All orders are saved safely on your device and uploaded automatically to the cloud as soon as internet connection returns."
    },
    {
      q: "How do I switch shifts or log in with another staff member?",
      a: "Click your user name at the top right corner of the screen (or click the 'PIN' button in the top bar). Type your secret 4-digit PIN (for example: Sarah = 1111, David = 2222, Michael = 3333). The app instantly updates to your personal profile!"
    },
    {
      q: "Can a Cashier accidentally change product prices or delete sales history?",
      a: "No! Security rules protect your business. Cashiers can only sell items at approved prices. Only Managers and Bosses have permissions to edit product catalog prices, reorder stock, or manage financial settings."
    },
    {
      q: "How do hotel room walk-ins and extended stays work?",
      a: "Go to the 'Hotel & OTAs' tab. You will see colored room cards. Click 'Quick Book Room' on any available green room card to check in a walk-in guest. If a guest wants to stay extra nights, open their room folio and click 'Extend Stay'!"
    },
    {
      q: "What is an API Key in simple words?",
      a: "An API Key is like a digital hallway pass that allows another computer program (such as your WordPress online shop or QuickBooks accounting software) to talk to Tumi ERP safely without needing a human to type data twice."
    },
    {
      q: "How do I print an invoice or customer sales receipt?",
      a: "Whenever you complete a sale at the POS Register or check in a hotel guest, a digital receipt pops up on screen with an 'Option to Print' or 'Email / WhatsApp PDF' button."
    }
  ];

  const filteredFaqs = faqItems.filter(f => 
    f.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
    f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="bg-slate-950 text-slate-100 border border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full mx-auto overflow-hidden relative font-sans">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg shrink-0">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-white uppercase">
                Tumi ERP Interactive Guide & Help Center
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                Non-Technical Plain English
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Step-by-step visual tutorials, animated slide walkthroughs, and instant AI guidance for staff & managers.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all self-start sm:self-auto cursor-pointer"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. MODE NAVIGATION TABS */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setGuideMode('video')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              guideMode === 'video'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Tv className="w-4 h-4 text-amber-300" />
            <span>Watch Slide Walkthrough</span>
          </button>

          <button
            onClick={() => setGuideMode('tutorial')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              guideMode === 'tutorial'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-300" />
            <span>Step-by-Step Tutorials ({videoSlides.length})</span>
          </button>

          <button
            onClick={() => setGuideMode('ask_ai')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              guideMode === 'ask_ai'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Ask Tumi AI Assistant</span>
          </button>

          <button
            onClick={() => setGuideMode('faq')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              guideMode === 'faq'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Common Questions (FAQ)</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden lg:block">
          Logged in: <strong className="text-white font-mono">{activeUser.name}</strong> ({activeUser.role.toUpperCase()})
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: WATCH SLIDE WALKTHROUGH (SIMULATED ANIMATED VIDEO PLAYER) */}
      {/* ========================================================================= */}
      {guideMode === 'video' && (
        <div className="p-5 sm:p-7 space-y-6">
          
          {/* SIMULATED VIDEO PLAYER CONTAINER */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0 relative">
            
            {/* Player Top Screen Bar */}
            <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-white font-bold uppercase tracking-wider text-[11px]">
                  Interactive Slide Lesson {currentSlideIdx + 1} of {videoSlides.length}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  className="hover:text-white flex items-center gap-1 cursor-pointer text-[11px]"
                  title="Simulated Audio Voiceover Narration"
                >
                  {isVoiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                  <span className="hidden sm:inline">{isVoiceEnabled ? 'Voiceover On' : 'Muted'}</span>
                </button>

                <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 font-mono text-[10px]">
                  <span>Speed:</span>
                  {[1.0, 1.5, 2.0].map(s => (
                    <button
                      key={s}
                      onClick={() => setPlaybackSpeed(s)}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${playbackSpeed === s ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SCREEN CANVAS MOCKUP & LESSON DISPLAY */}
            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gradient-to-b from-slate-900 to-slate-950 min-h-[380px]">
              
              {/* Left Column: Lesson Explanation & Analogy */}
              <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2.5 rounded-2xl shadow-md ${currentSlide.color}`}>
                      <currentSlide.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-800">
                        {currentSlide.badge}
                      </span>
                      <h3 className="text-lg font-black text-white mt-0.5 leading-snug">
                        {currentSlide.title}
                      </h3>
                    </div>
                  </div>

                  {/* Plain Everyday Analogy */}
                  <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 text-amber-200 text-xs space-y-1">
                    <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                      Plain Everyday Analogy:
                    </span>
                    <p className="font-medium leading-relaxed italic">
                      "{currentSlide.analogy}"
                    </p>
                  </div>

                  {/* Screen Summary */}
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {currentSlide.screenSummary}
                  </p>

                  {/* Action Steps */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      What to do on screen:
                    </span>
                    <div className="space-y-1 text-xs text-slate-200 font-medium">
                      {currentSlide.steps.map((st, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{st}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Practice Screen Action Button */}
                {onNavigateToTab && (
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToTab(currentSlide.tabId);
                        if (onClose) onClose();
                      }}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-amber-300" />
                      <span>Open This Screen Live in App</span>
                    </button>

                    {onStartSpotlightTour && (
                      <button
                        type="button"
                        onClick={() => {
                          onStartSpotlightTour(currentSlide.tabId);
                          if (onClose) onClose();
                        }}
                        className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold rounded-xl border border-indigo-900/60 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Compass className="w-4 h-4 text-indigo-400" />
                        <span className="hidden sm:inline">Guided Overlay Tour</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Visual Mockup Screen Display */}
              <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden shadow-inner">
                {/* Visual Canvas Mockup Header */}
                <div className="flex items-center justify-between border-b border-slate-850 pb-2.5 text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-slate-300 font-bold ml-1">Tumi ERP Screen Preview</span>
                  </div>
                  <span className="text-indigo-400 uppercase font-bold">{currentSlide.tabId.toUpperCase()} MODULE</span>
                </div>

                {/* Animated Mockup Screen Content */}
                <div className="my-4 space-y-3 font-sans">
                  {currentSlide.mockupType === 'pos' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-center space-y-1">
                          <ShoppingCart className="w-4 h-4 text-emerald-400 mx-auto" />
                          <span className="text-[10px] font-bold text-white block">T-Shirt ($25)</span>
                          <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded inline-block">In Cart</span>
                        </div>
                        <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-1">
                          <Package className="w-4 h-4 text-indigo-400 mx-auto" />
                          <span className="text-[10px] font-bold text-slate-300 block">Cap ($15)</span>
                          <span className="text-[9px] text-slate-500 block">Click to Add</span>
                        </div>
                        <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-1">
                          <Package className="w-4 h-4 text-indigo-400 mx-auto" />
                          <span className="text-[10px] font-bold text-slate-300 block">Mug ($10)</span>
                          <span className="text-[9px] text-slate-500 block">Click to Add</span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Cart Total:</span>
                          <span className="text-base font-extrabold text-white">$25.00</span>
                        </div>
                        <div className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1">
                          <span>Checkout POS</span>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentSlide.mockupType === 'hotel' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-emerald-950/60 border border-emerald-700/80 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-white">Room #101</span>
                          <span className="bg-emerald-600 text-white px-1.5 py-0.2 rounded font-mono">Ready</span>
                        </div>
                        <p className="text-[10px] text-slate-300">Executive Deluxe ($120/nt)</p>
                        <span className="text-[9px] text-emerald-400 font-bold block underline">Click 'Quick Book Room'</span>
                      </div>
                      <div className="p-3 bg-amber-950/60 border border-amber-700/80 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-white">Room #102</span>
                          <span className="bg-amber-600 text-white px-1.5 py-0.2 rounded font-mono">Occupied</span>
                        </div>
                        <p className="text-[10px] text-slate-300">Guest: Mr. Kwesi Mensah</p>
                        <span className="text-[9px] text-amber-300 font-bold block underline">Click 'Extend Stay'</span>
                      </div>
                    </div>
                  )}

                  {currentSlide.mockupType === 'warehouse' && (
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Wireless Computer Mouse</span>
                          <span className="text-[10px] text-rose-300 font-bold">2 units left (LOW STOCK ALERT!)</span>
                        </div>
                        <span className="px-2 py-1 bg-rose-600 text-white font-bold text-[10px] rounded">Restock</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white block text-[11px]">HD Monitors</span>
                          <span className="text-[10px] text-emerald-400 font-bold">45 units in warehouse</span>
                        </div>
                        <span className="px-2 py-1 bg-slate-800 text-slate-300 font-bold text-[10px] rounded">Safe</span>
                      </div>
                    </div>
                  )}

                  {currentSlide.mockupType === 'sysadmin' && (
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-white">Staff Member: Sarah Jenkins</span>
                        <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono text-[10px] rounded">
                          PIN: 1111
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Assigned Role: POS Senior Cashier</p>
                      <div className="flex gap-2 text-[10px]">
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded border border-emerald-800">POS Sales Allowed</span>
                        <span className="px-2 py-0.5 bg-rose-950 text-rose-400 rounded border border-rose-800">Admin Delete Locked</span>
                      </div>
                    </div>
                  )}

                  {currentSlide.mockupType === 'heatmap' && (
                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                      <div className="p-3 bg-emerald-600 text-white font-bold rounded-xl space-y-1">
                        <div className="text-[10px] opacity-80">POS Sales (112%)</div>
                        <div className="text-sm font-black">$38,500</div>
                      </div>
                      <div className="p-3 bg-rose-600 text-white font-bold rounded-xl space-y-1 ring-2 ring-rose-400 animate-pulse">
                        <div className="text-[10px] opacity-80">Low Stock (Critical)</div>
                        <div className="text-sm font-black">AI Anomaly Flagged</div>
                      </div>
                    </div>
                  )}

                  {(currentSlide.mockupType === 'crm' || currentSlide.mockupType === 'finance') && (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between font-bold text-white">
                        <span>{currentSlide.title}</span>
                        <span className="text-emerald-400 font-mono">Real-Time Sync</span>
                      </div>
                      <p className="text-[11px] text-slate-300">{currentSlide.analogy}</p>
                    </div>
                  )}
                </div>

                {/* On-Screen Target Spotlight Hint */}
                <div className="p-2.5 bg-indigo-950/80 border border-indigo-800 rounded-xl text-indigo-200 text-[11px] flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-300 shrink-0" />
                  <span><strong>On-Screen Target:</strong> {currentSlide.spotlightHint}</span>
                </div>
              </div>
            </div>

            {/* PLAYER PLAYBACK CONTROLS BAR */}
            <div className="bg-slate-950 px-5 py-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Play / Pause / Replay Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-md transition-all ${
                    isPlaying ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlaying ? 'Pause Slides' : 'Auto-Play Slide Tour'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentSlideIdx(0);
                    setVideoProgress(0);
                    setIsPlaying(true);
                  }}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-all cursor-pointer"
                  title="Replay from Slide 1"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Slide Number Indicators */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {videoSlides.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSlide(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      currentSlideIdx === idx 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                    title={`Slide ${s.id}: ${s.badge}`}
                  >
                    #{s.id}
                  </button>
                ))}
              </div>

              {/* Prev / Next Slide Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectSlide(Math.max(0, currentSlideIdx - 1))}
                  disabled={currentSlideIdx === 0}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 text-slate-300 rounded-xl transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSlide(Math.min(videoSlides.length - 1, currentSlideIdx + 1))}
                  disabled={currentSlideIdx === videoSlides.length - 1}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Video Progress Bar */}
            <div className="h-1.5 bg-slate-900 w-full">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-amber-400 transition-all duration-300"
                style={{ width: `${((currentSlideIdx + 1) / videoSlides.length) * 100}%` }}
              />
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: STEP-BY-STEP DETAILED TUTORIALS GRID */}
      {/* ========================================================================= */}
      {guideMode === 'tutorial' && (
        <div className="p-5 sm:p-7 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h3 className="text-lg font-black text-white uppercase">Detailed Step-by-Step App Tutorials</h3>
            <p className="text-xs text-slate-400">Click any topic card below to view plain-English instructions or launch its active screen.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videoSlides.map((slide, idx) => (
              <div 
                key={slide.id}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-600/80 rounded-2xl p-5 space-y-3 transition-all hover:shadow-xl flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl ${slide.color}`}>
                      <slide.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                      Module #{slide.id}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-white leading-snug group-hover:text-indigo-300 transition-colors">
                    {slide.title}
                  </h4>

                  <p className="text-xs text-slate-400 line-clamp-3 italic">
                    "{slide.analogy}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSlideIdx(idx);
                      setGuideMode('video');
                    }}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Watch Slide</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToTab(slide.tabId);
                        if (onClose) onClose();
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] shadow-xs cursor-pointer"
                    >
                      Open Screen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: INTERACTIVE ASK TUMI AI ASSISTANT HELP SCREEN */}
      {/* ========================================================================= */}
      {guideMode === 'ask_ai' && (
        <div className="p-5 sm:p-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md">
                <Sparkles className="w-6 h-6 animate-pulse text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Ask Tumi Assistant — Interactive AI Guidance
                </h3>
                <p className="text-xs text-slate-400">
                  Type any question in plain everyday English or click a preset question below to get instant guidance!
                </p>
              </div>
            </div>

            {/* AI Search & Input Box */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAskAiHelp();
                  }}
                  placeholder="Ask anything (e.g. 'How do I ring up a POS sale?', 'How do I check in a hotel guest?', 'Where do I change PINs?')..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                />

                <button
                  type="button"
                  onClick={() => handleAskAiHelp()}
                  disabled={isAskingAi || !aiQuery.trim()}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{isAskingAi ? 'Thinking...' : 'Ask AI'}</span>
                </button>
              </div>

              {/* Preset Quick Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Popular Questions to Try:
                </span>
                <div className="flex flex-wrap gap-2">
                  {presetQuestions.map((pq, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAiQuery(pq);
                        handleAskAiHelp(pq);
                      }}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-medium rounded-xl transition-all cursor-pointer"
                    >
                      💡 {pq}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI RESPONSE DISPLAY PANEL */}
            {aiResponse && (
              <div className="p-5 bg-slate-950 border border-indigo-900/60 rounded-2xl space-y-4 animate-fade-in shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                  <span className="text-xs font-extrabold text-indigo-400 flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Tumi Assistant Guidance:
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Plain English Verified
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                  {aiResponse.answer}
                </p>

                {/* Steps List */}
                {aiResponse.steps && aiResponse.steps.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Step-by-step instructions:
                    </span>
                    <div className="space-y-1 text-xs text-slate-200 font-medium">
                      {aiResponse.steps.map((st, idx) => (
                        <div key={idx} className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{st}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Tips */}
                {aiResponse.quickTips && aiResponse.quickTips.length > 0 && (
                  <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs space-y-1">
                    <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5" /> Helpful Tip:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {aiResponse.quickTips.map((tp, idx) => (
                        <li key={idx}>{tp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Direct Jump Action Button */}
                {onNavigateToTab && aiResponse.recommendedTab && (
                  <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Recommended Module: <strong className="text-white">{aiResponse.recommendedTabName}</strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToTab(aiResponse.recommendedTab);
                        if (onClose) onClose();
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Take Me To {aiResponse.recommendedTabName} Screen</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: FREQUENTLY ASKED QUESTIONS (FAQ) */}
      {/* ========================================================================= */}
      {guideMode === 'faq' && (
        <div className="p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-white uppercase">Everyday Questions & Clear Answers</h3>
              <p className="text-xs text-slate-400">Common questions asked by shop cashiers, hotel receptionists, and managers.</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search questions (e.g. offline, PIN, receipt)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((faq, idx) => (
              <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed pl-6 font-sans">
                  {faq.a}
                </p>
              </div>
            ))}

            {filteredFaqs.length === 0 && (
              <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-500 text-xs italic">
                No questions found matching "{faqSearch}". Try searching for 'offline', 'PIN', or 'receipt'.
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER BAR */}
      <div className="bg-slate-950 p-4 border-t border-slate-800 text-center text-xs text-slate-500 flex items-center justify-between">
        <span>Tumi ERP Non-Technical Guide • Designed for Easy Everyday Use</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Close Guide
          </button>
        )}
      </div>

    </div>
  );
}
