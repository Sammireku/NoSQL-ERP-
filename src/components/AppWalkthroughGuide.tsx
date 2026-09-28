import React, { useState } from 'react';
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
  Key, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Lightbulb, 
  X, 
  ChevronRight, 
  Users, 
  Wifi, 
  WifiOff, 
  Lock, 
  UserCheck, 
  Play, 
  FileText
} from 'lucide-react';
import { UserProfile } from '../types/erp';

interface AppWalkthroughGuideProps {
  activeUser: UserProfile;
  onNavigateToTab?: (tabId: string) => void;
  onClose?: () => void;
}

export default function AppWalkthroughGuide({ activeUser, onNavigateToTab, onClose }: AppWalkthroughGuideProps) {
  const [guideMode, setGuideMode] = useState<'tour' | 'topics' | 'faq'>('tour');
  const [currentStep, setCurrentStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const tourSteps = [
    {
      stepNumber: 1,
      title: "Welcome to Tumi ERP - Your All-In-One Business App",
      badge: "The Big Picture",
      icon: Sparkles,
      color: "bg-indigo-600 text-white",
      plainAnalogy: "Imagine having a store cashier, a hotel manager, a warehouse helper, and an accountant all sitting in one quiet room helping you run your business without mistakes.",
      explanation: "Tumi ERP helps you manage your store sales, hotel room bookings, warehouse stock, customer leads, and employee roles in one simple screen.",
      keyTakeaways: [
        "Everything updates automatically in real time across all staff devices.",
        "Your data is backed up safely in Google Cloud Firestore.",
        "You can switch between workers using a quick 4-digit secret PIN."
      ],
      recommendedTab: 'sysadmin',
      actionLabel: "Explore System Admin"
    },
    {
      stepNumber: 2,
      title: "Selling at the Cash Register (POS Checkout)",
      badge: "Store Sales Made Easy",
      icon: ShoppingCart,
      color: "bg-emerald-600 text-white",
      plainAnalogy: "Think of this like a smart digital cash register on your tablet or computer.",
      explanation: "When a customer comes to buy items from your store or shop, use this screen to ring up their items.",
      keyTakeaways: [
        "Click or tap items on screen to put them in the shopping cart.",
        "Use your device camera to scan barcodes or document receipts.",
        "Works offline! If your internet drops, sales are saved on your device and sent to the cloud as soon as internet returns.",
        "Every sale automatically reduces stock in your warehouse so you never run out."
      ],
      recommendedTab: 'pos',
      actionLabel: "Try POS Cash Register"
    },
    {
      stepNumber: 3,
      title: "Managing Hotel Rooms & Guest Stays (Hospitality & OTAs)",
      badge: "Hotel & Guesthouse",
      icon: Building2,
      color: "bg-rose-600 text-white",
      plainAnalogy: "Think of this like a big magnetic board on your hotel wall showing every room and guest.",
      explanation: "Check which rooms are ready for guests, record check-ins, view prices, and sync with booking websites.",
      keyTakeaways: [
        "Room status colors: Green = Clean & Ready, Yellow = Occupied, Amber = Needs Cleaning, Red = Under Repair.",
        "Click any room card to see weekend pricing, holiday rates, or repair history.",
        "Click 'Quick Book Room' to reserve a room for a guest in 10 seconds.",
        "Syncs with Airbnb, Booking.com, and Hostelworld so no two guests book the same bed."
      ],
      recommendedTab: 'hospitality',
      actionLabel: "View Hotel & Room Manager"
    },
    {
      stepNumber: 4,
      title: "Warehouse Inventory & Stock Control",
      badge: "Warehouse Shelves",
      icon: Package,
      color: "bg-amber-600 text-white",
      plainAnalogy: "Think of this like a digital count of every box on your stockroom shelf.",
      explanation: "Always know how many products you have left so you never tell a customer 'out of stock'.",
      keyTakeaways: [
        "Green numbers = Plenty of stock available.",
        "Red numbers = Low stock warning! Time to reorder.",
        "Click 'Restock Item' when new shipments arrive from suppliers.",
        "Upload CSV or PDF supplier delivery notes to import bulk items in seconds."
      ],
      recommendedTab: 'inventory',
      actionLabel: "Check Stock Levels"
    },
    {
      stepNumber: 5,
      title: "Customer Leads & Deals (CRM Kanban)",
      badge: "Sales Tracker",
      icon: TrendingUp,
      color: "bg-sky-600 text-white",
      plainAnalogy: "Think of this like a sticky-note board tracking people who want to buy from you.",
      explanation: "Keep track of customer inquiries, quotes sent, and deals closed so no money is lost.",
      keyTakeaways: [
        "Drag customer cards from 'New Lead' to 'Proposal' to 'Closed Won'.",
        "Keep notes of phone calls and emails so your sales team stays organized."
      ],
      recommendedTab: 'crm',
      actionLabel: "View CRM Sales Board"
    },
    {
      stepNumber: 6,
      title: "Worker Roles, Invites & Terminal PINs",
      badge: "Boss Control Room",
      icon: ShieldCheck,
      color: "bg-purple-600 text-white",
      plainAnalogy: "Think of this like giving different workers different keys to your store.",
      explanation: "Managers get full access, while Cashiers only see the Cash Register so nobody accidentally edits prices or deletes financial records.",
      keyTakeaways: [
        "Invite new staff by entering their name and email.",
        "Click 'WhatsApp' or 'Email' to send them their 4-digit secret PIN.",
        "Switch shifts quickly using the 'Auth Portal' or 4-digit PIN in the top bar."
      ],
      recommendedTab: 'sysadmin',
      actionLabel: "Manage Staff & PINs"
    },
    {
      stepNumber: 7,
      title: "API Keys & 2-Way External Connections (Connecting Other Apps)",
      badge: "Connecting Systems",
      icon: Globe,
      color: "bg-indigo-900 text-white",
      plainAnalogy: "Think of an API Key like a digital hallway pass. When another program (like your WordPress online shop or QuickBooks accounting software) wants to talk to Tumi ERP, it asks the Boss for a pass.",
      explanation: "Manage 2-Way integration tokens that allow external programs to safely send orders or read inventory.",
      keyTakeaways: [
        "Third-party programs submit a request explaining why they need access.",
        "Bosses / Admins review requests in the System Admin Page -> 'API & 2-Way Tokens' tab.",
        "Click 'Approve & Issue Key' to create a safe access token.",
        "Click 'Revoke Key' anytime if you want to turn off access immediately!"
      ],
      recommendedTab: 'sysadmin',
      actionLabel: "Open API Management Portal"
    }
  ];

  const faqItems = [
    {
      question: "What should I do if the internet goes offline?",
      answer: "Don't worry! The app keeps working offline. You can continue ringing up sales at the cash register. All sales are saved safely on your tablet/computer and sent to the cloud as soon as internet connection returns."
    },
    {
      question: "How do I log in or switch shifts with another worker?",
      answer: "Click your name at the top right of the screen. Type your secret 4-digit PIN (for example: Sarah's PIN is 1111, David's is 2222, Michael's is 3333). The app instantly switches to your personal profile."
    },
    {
      question: "What is an API Key in plain words?",
      answer: "An API Key is like a special digital password that allows another computer program (such as your WordPress website store or QuickBooks accounting software) to talk to Tumi ERP safely without needing a human to type things twice."
    },
    {
      question: "How do I give an external developer or accounting app an API key?",
      answer: "Go to 'System Admin Page', click the 'API & 2-Way Tokens Portal' tab, and review their request or click 'Issue Direct 2-Way Integration Token'. Then copy the generated key and send it to them safely."
    },
    {
      question: "Can a Cashier change product prices or delete sales history?",
      answer: "No! Security rules protect your business. Cashiers can only sell items at approved prices. Only Managers and Admins can change prices, reorder stock, or delete records."
    },
    {
      question: "How do I add a new room or check in a guest?",
      answer: "Go to the 'Hospitality & OTAs' tab. You will see colored room cards. Click 'Quick Book Room' on any room, type the guest name and check-in date, and click Save!"
    }
  ];

  const filteredFaqs = faqItems.filter(f => 
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTour = tourSteps[currentStep];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-5xl w-full mx-auto overflow-hidden text-slate-800 animate-in fade-in duration-200">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-2xl shadow-inner shrink-0">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-white">Beginner's App Walkthrough & Guide</h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase">
                Easy Plain English
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Learn how to use every part of Tumi ERP step-by-step — no technical jargon required!
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all self-start sm:self-auto"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Sub Navigation Pills */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setGuideMode('tour')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              guideMode === 'tour' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Step-by-Step Tour ({currentStep + 1}/7)</span>
          </button>

          <button
            onClick={() => setGuideMode('topics')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              guideMode === 'topics' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Topic Modules</span>
          </button>

          <button
            onClick={() => setGuideMode('faq')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              guideMode === 'faq' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Common Questions (FAQ)</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium hidden md:block">
          Logged in as: <strong className="text-indigo-600">{activeUser.name}</strong> ({activeUser.role.toUpperCase()})
        </div>
      </div>

      {/* 3. STEP-BY-STEP TOUR MODE */}
      {guideMode === 'tour' && (
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Progress Tracker Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
              <span>Step {activeTour.stepNumber} of {tourSteps.length}: {activeTour.badge}</span>
              <span>{Math.round((activeTour.stepNumber / tourSteps.length) * 100)}% Complete</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${(activeTour.stepNumber / tourSteps.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Active Step Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            
            {/* Step Title Header */}
            <div className="flex items-start space-x-4">
              <div className={`p-3.5 rounded-2xl shadow-md shrink-0 ${activeTour.color}`}>
                <activeTour.icon className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  {activeTour.badge}
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                  {activeTour.title}
                </h3>
              </div>
            </div>

            {/* Plain English Analogy Box */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex items-start space-x-3 text-amber-900">
              <Lightbulb className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 block">
                  Plain Everyday Analogy
                </span>
                <p className="text-xs sm:text-sm font-medium leading-relaxed">
                  "{activeTour.plainAnalogy}"
                </p>
              </div>
            </div>

            {/* Detailed Explanation */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                How It Works:
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {activeTour.explanation}
              </p>
            </div>

            {/* Key Bullet Points */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Key Things To Remember:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeTour.keyTakeaways.map((point, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 flex items-start space-x-2.5 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="font-medium leading-snug">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Jump to Workspace Action */}
            {onNavigateToTab && (
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
                <div>
                  <span className="text-xs font-bold text-indigo-950 block">Ready to try this screen?</span>
                  <span className="text-[11px] text-indigo-700">Clicking below takes you straight to the active feature workspace.</span>
                </div>
                <button
                  onClick={() => {
                    onNavigateToTab(activeTour.recommendedTab);
                    if (onClose) onClose();
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span>{activeTour.actionLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Tour Controls (Previous / Next) */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                currentStep === 0 ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>

            {/* Step Indicator Pills */}
            <div className="hidden sm:flex items-center space-x-1.5">
              {tourSteps.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    currentStep === idx ? 'bg-indigo-600 scale-125' : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                  title={`Step ${idx + 1}: ${s.badge}`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                if (currentStep < tourSteps.length - 1) {
                  setCurrentStep(prev => prev + 1);
                } else {
                  setGuideMode('topics');
                }
              }}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all"
            >
              <span>{currentStep === tourSteps.length - 1 ? 'Explore All Topics' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. ALL TOPICS GRID MODE */}
      {guideMode === 'topics' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="text-lg font-black text-slate-900">Explore App Topics & Features</h3>
            <p className="text-xs text-slate-500">Click any card below to jump directly to its explanation or active workspace screen.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tourSteps.map((step, idx) => (
              <div 
                key={idx}
                className="bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 space-y-3 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl ${step.color}`}>
                      <step.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-2 py-0.5 rounded border">
                      Step #{step.stepNumber}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                    {step.title}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-3 italic">
                    "{step.plainAnalogy}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setCurrentStep(idx);
                      setGuideMode('tour');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <span>Read Guide</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {onNavigateToTab && (
                    <button
                      onClick={() => {
                        onNavigateToTab(step.recommendedTab);
                        if (onClose) onClose();
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-xs"
                    >
                      Open App
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. FAQ & COMMON QUESTIONS MODE */}
      {guideMode === 'faq' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Common Questions & Easy Answers</h3>
              <p className="text-xs text-slate-500">Simple answers to everyday questions for staff, cashiers, and managers.</p>
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g. offline, PIN, API key)..."
              className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
            />
          </div>

          <div className="space-y-4">
            {filteredFaqs.map((faq, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{faq.question}</span>
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed pl-6 font-medium">
                  {faq.answer}
                </p>
              </div>
            ))}

            {filteredFaqs.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No questions found matching "{searchQuery}". Try searching for 'offline', 'PIN', or 'API'.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-slate-100 border-t border-slate-200 p-4 text-center text-xs text-slate-500 flex items-center justify-between">
        <span>Tumi ERP Easy Walkthrough • Designed for Easy Everyday Use</span>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all"
          >
            Got It! Close Guide
          </button>
        )}
      </div>

    </div>
  );
}
