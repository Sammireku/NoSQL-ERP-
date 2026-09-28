import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  Loader2,
  CheckCircle2,
  HeartCrack,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  Send,
  Plus,
  ArrowLeft,
  Bot,
  User,
  Heart,
  Smile,
  Frown,
  Meh,
  X,
  Building2,
  FileText,
  Upload
} from 'lucide-react';
import { CustomerProfile, CustomerLog, UserProfile } from '../types/erp';
import { dataStore } from '../config/firebase';
import { exportToCSV } from '../utils/exportUtils';
import Markdown from 'react-markdown';

interface CRMProfilesProps {
  activeUser: UserProfile;
}

export default function CRMProfiles({ activeUser }: CRMProfilesProps) {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [logs, setLogs] = useState<CustomerLog[]>([]);

  const handleExportCSV = () => {
    const headers = ['Client ID', 'Client Name', 'Email', 'Phone', 'Lifetime Value ($)', 'Churn Risk Score', 'Registration Date'];
    const rows = customers.map(c => [
      c.id,
      c.name,
      c.email,
      c.phone,
      c.lifetime_value,
      c.ai_churn_risk,
      c.createdAt || ''
    ]);
    exportToCSV('crm_customers_export.csv', headers, rows);
  };
  
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});

  // Client Creation States
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientLTV, setNewClientLTV] = useState('');
  const [newClientTag, setNewClientTag] = useState('customer');
  const [newClientHabits, setNewClientHabits] = useState('');
  const [newClientDemands, setNewClientDemands] = useState('');

  // Security blocked state for client creation
  const [blockedClientEdit, setBlockedClientEdit] = useState<{
    path: string;
    authRole: string;
    actionAttempted: string;
  } | null>(null);
  
  // Interaction Logging Drawer States
  const [selectedCustId, setSelectedCustId] = useState<string | null>(null);
  const [logType, setLogType] = useState<'call' | 'email' | 'meeting'>('call');
  const [logNotes, setLogNotes] = useState('');
  
  // Response Generator States
  const [customInstruction, setCustomInstruction] = useState('');
  const [draftResponse, setDraftResponse] = useState<string | null>(null);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // AI Booking Confirmation Extraction & CRM Auto-Sync States
  const [isBookingSyncModalOpen, setIsBookingSyncModalOpen] = useState(false);
  const [bookingInputText, setBookingInputText] = useState('');
  const [isParsingBooking, setIsParsingBooking] = useState(false);
  const [parsedBookingResult, setParsedBookingResult] = useState<any | null>(null);
  const [syncSuccessNotice, setSyncSuccessNotice] = useState<string | null>(null);

  const sampleBookingTemplates = [
    {
      title: 'Booking.com Luxury Suite',
      text: 'Booking.com Confirmation #BC-90418\nGuest Name: Dr. Sophia Montgomery\nEmail: sophia.montgomery@alumni.harvard.edu\nPhone: +1 (415) 555-8392\nRoom: Deluxe Ocean Suite (Room 201)\nCheck-in: 2026-10-15\nCheck-out: 2026-10-20\nTotal Rate: $1,650.00\nSpecial Requests: VIP corporate speaker, requested high-floor room, late check-out at 14:00 and feather-free bedding.'
    },
    {
      title: 'Airbnb Penthouse Villa',
      text: 'Airbnb Reservation #HM-88219\nGuest Name: Marcus Vance\nEmail: mvance.tech@globalinvest.io\nPhone: +1 (206) 555-9014\nRoom: Executive Penthouse (Room 301)\nCheck-in: 2026-11-01\nCheck-out: 2026-11-06\nTotal Rate: $2,750.00\nNotes: Arriving from Seattle on flight UA442, early check-in requested if possible.'
    },
    {
      title: 'Expedia Corporate Deluxe',
      text: 'Expedia Partner Itinerary #EX-77102\nGuest Name: Elena Rostova\nEmail: elena.rostova@travelglobal.eu\nPhone: +44 20 7946 0991\nRoom: Standard Double (Room 102)\nCheck-in: 2026-12-05\nCheck-out: 2026-12-09\nTotal Rate: $920.00\nSpecial Requests: Traveling for fintech summit. Requires VAT tax invoice.'
    }
  ];

  const handleParseBookingConfirmation = async () => {
    if (!bookingInputText.trim()) {
      alert('Please paste a booking confirmation email or summary text to extract.');
      return;
    }

    setIsParsingBooking(true);
    setParsedBookingResult(null);

    try {
      const res = await fetch('/api/ai/parse-booking-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: bookingInputText
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const parsed = await res.json();
      setParsedBookingResult(parsed);

      // Auto-upsert into CRM Customer Profiles via dataStore
      const { customer: updatedCustomer } = dataStore.upsertCustomerFromGuest({
        name: parsed.guestName,
        email: parsed.guestEmail,
        phone: parsed.guestPhone,
        totalSpend: parsed.totalAmount,
        source: parsed.sourceChannel || 'AI Parsed Booking',
        stayDate: parsed.checkInDate,
        roomNumber: parsed.roomNumber,
        notes: `${parsed.specialRequests ? 'Special Requests: ' + parsed.specialRequests + '. ' : ''}${parsed.notes || ''}`
      });

      // Refresh customers list
      setCustomers(dataStore.getCustomers());
      setSelectedCustId(updatedCustomer.id);
      setSyncSuccessNotice(`Successfully synced CRM Profile for "${updatedCustomer.name}" with lifetime value $${updatedCustomer.lifetime_value.toLocaleString()}!`);

      setTimeout(() => {
        setSyncSuccessNotice(null);
      }, 7000);
    } catch (err: any) {
      console.error('Failed to parse booking confirmation:', err);
      alert('Failed to parse booking confirmation. Please ensure the backend AI service is active or try one of the provided templates.');
    } finally {
      setIsParsingBooking(false);
    }
  };

  const handleCreateClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim() || !newClientEmail.trim() || !newClientLTV.trim()) {
      alert("All fields are required to register a new CRM client.");
      return;
    }

    const ltvNum = parseFloat(newClientLTV);
    if (isNaN(ltvNum) || ltvNum < 0) {
      alert("Please provide a valid Lifetime Value.");
      return;
    }

    const habitsArr = newClientHabits.split(',').map(h => h.trim()).filter(Boolean);
    const demandsArr = newClientDemands.split(',').map(d => d.trim()).filter(Boolean);

    const newCustomer: CustomerProfile = {
      id: 'cust_' + Math.floor(1000 + Math.random() * 9000),
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
      email: newClientEmail.trim(),
      lifetime_value: ltvNum,
      ai_churn_risk: 0.1, // Default low churn
      tag: newClientTag,
      buyingHabits: habitsArr,
      demands: demandsArr,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      dataStore.createCustomer(newCustomer, activeUser);
      setIsCreateClientOpen(false);
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewClientLTV('');
      setNewClientTag('customer');
      setNewClientHabits('');
      setNewClientDemands('');
    } catch (err: any) {
      try {
        const errorDetails = JSON.parse(err.message);
        setBlockedClientEdit({
          path: errorDetails.path,
          authRole: errorDetails.authInfo.role,
          actionAttempted: `Register CRM Customer (Name: ${newCustomer.name}, Phone: ${newCustomer.phone}, Email: ${newCustomer.email})`
        });
      } catch (e) {
        console.error("Failed to parse create customer security error:", err);
      }
    }
  };

  useEffect(() => {
    setCustomers(dataStore.getCustomers());
    setLogs(dataStore.getCustomerLogs());

    const unsubscribeCustomers = dataStore.subscribeToCollection('customers', () => {
      setCustomers(dataStore.getCustomers());
    });
    
    const unsubscribeLogs = dataStore.subscribeToCollection('customer_logs', () => {
      setLogs(dataStore.getCustomerLogs());
    });

    return () => {
      unsubscribeCustomers();
      unsubscribeLogs();
    };
  }, []);

  const runPredictiveChurnRisk = async (cust: CustomerProfile) => {
    setLoadingMap(prev => ({ ...prev, [cust.id]: true }));
    try {
      // Mock parameters for realistic sandbox calculations
      const totalOrdersMock = Math.floor(3 + Math.random() * 9);
      const lastPurchaseMock = Math.floor(4 + Math.random() * 110);

      const response = await fetch('/api/ai/predict-churn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cust.name,
          lifetimeValue: cust.lifetime_value,
          orderCount: totalOrdersMock,
          lastPurchaseDaysAgo: lastPurchaseMock
        })
      });

      const analytics = await response.json();
      
      if (analytics && analytics.ai_churn_risk !== undefined) {
        // Update database level
        dataStore.updateCustomerChurnRisk(cust.id, analytics.ai_churn_risk);
        
        if (analytics.reason) {
          setReasonMap(prev => ({ ...prev, [cust.id]: analytics.reason }));
        }
      }
    } catch (err) {
      console.error("Predictive churn risk failed:", err);
    } finally {
      setLoadingMap(prev => ({ ...prev, [cust.id]: false }));
    }
  };

  // Log a new interaction note
  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustId || !logNotes.trim()) return;

    const currentUsers = dataStore.getUsers();
    // Default to the first logged user or system author
    const activeStaffName = currentUsers[0]?.name || "CRM Representative";

    const newLog: CustomerLog = {
      id: 'log-' + Date.now(),
      customerId: selectedCustId,
      type: logType,
      notes: logNotes.trim(),
      authorName: activeStaffName,
      createdAt: new Date().toISOString()
    };

    const updatedLogs = [newLog, ...logs];
    dataStore.saveCustomerLogs(updatedLogs);
    setLogs(updatedLogs);
    setLogNotes('');
  };

  // Generate an automated response draft using our brand new server-side endpoint
  const handleGenerateAIDraft = async () => {
    if (!selectedCustId) return;
    const activeCust = customers.find(c => c.id === selectedCustId);
    if (!activeCust) return;

    setGeneratingDraft(true);
    setDraftResponse(null);

    const activeCustLogs = logs.filter(l => l.customerId === selectedCustId);

    try {
      const response = await fetch('/api/ai/draft-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: activeCust.name,
          logs: activeCustLogs,
          customInstruction: customInstruction.trim() || undefined
        })
      });

      const data = await response.json();
      if (data && data.draft) {
        setDraftResponse(data.draft);
      }
    } catch (err) {
      console.error("Failed to generate AI response draft:", err);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const activeCust = customers.find(c => c.id === selectedCustId);
  const activeCustLogs = logs.filter(l => l.customerId === selectedCustId);

  // Sentiment Analysis Logic based on notes content
  const calculateSentiment = (notes: string) => {
    const positiveWords = ['happy', 'satisfied', 'excited', 'good', 'success', 'great', 'solved', 'thanks', 'perfect', 'yes'];
    const negativeWords = ['angry', 'frustrated', 'broken', 'issue', 'bad', 'disappointed', 'delay', 'cancel', 'refund', 'no', 'problem'];
    
    let score = 0;
    const lower = notes.toLowerCase();
    positiveWords.forEach(w => { if (lower.includes(w)) score++; });
    negativeWords.forEach(w => { if (lower.includes(w)) score--; });

    if (score > 0) return { label: 'Positive', icon: <Smile className="w-3.5 h-3.5 text-emerald-500" />, color: 'text-emerald-600 bg-emerald-50' };
    if (score < 0) return { label: 'Frustrated', icon: <Frown className="w-3.5 h-3.5 text-rose-500" />, color: 'text-rose-600 bg-rose-50' };
    return { label: 'Neutral', icon: <Meh className="w-3.5 h-3.5 text-slate-500" />, color: 'text-slate-600 bg-slate-100' };
  };

  return (
    <div className="space-y-6" id="crm_profiles_module">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">CRM Accounts & Sentiment Diagnostics</h2>
            <p className="text-xs text-slate-500">Log touchpoints, analyze client temperament, and generate tailored client replies with Gemini AI.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {(activeUser.role === 'manager' || activeUser.role === 'ceo' || activeUser.role === 'sysadmin') && (
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Export CSV</span>
            </button>
          )}
          <button
            id="btn_ai_booking_sync"
            onClick={() => setIsBookingSyncModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>AI Booking Sync</span>
          </button>
          <button
            onClick={() => setIsCreateClientOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-indigo-200" />
            <span>Add Client Profile</span>
          </button>
        </div>
      </div>

      {syncSuccessNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncSuccessNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customer Accounts Grid List */}
        <div className={`${selectedCustId ? 'lg:col-span-6' : 'lg:col-span-12'} transition-all duration-300 grid grid-cols-1 md:grid-cols-2 gap-4`}>
          {customers.map(cust => {
            const churnRiskPercent = Math.round(cust.ai_churn_risk * 100);
            const isHighRisk = cust.ai_churn_risk >= 0.5;
            const isSelected = selectedCustId === cust.id;

            return (
              <div 
                key={cust.id}
                onClick={() => {
                  setSelectedCustId(cust.id);
                  setDraftResponse(null);
                  setCustomInstruction('');
                }}
                className={`bg-white/85 backdrop-blur-md rounded-xl border p-5 flex flex-col justify-between space-y-4 transition-all duration-300 cursor-pointer hover-premium shadow-premium hover:shadow-md ${
                  isSelected 
                    ? 'border-indigo-600 ring-2 ring-indigo-50/50' 
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{cust.name}</h3>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                          cust.tag === 'guest' 
                            ? 'bg-amber-50 text-amber-800 border border-amber-100' 
                            : cust.tag === 'walk-in'
                            ? 'bg-sky-50 text-sky-800 border border-sky-100'
                            : cust.tag === 'corporate'
                            ? 'bg-purple-50 text-purple-800 border border-purple-100'
                            : 'bg-slate-50 text-slate-700 border border-slate-150'
                        }`}>
                          {cust.tag || 'customer'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{cust.id}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider ${
                      isHighRisk 
                        ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      <HeartCrack className="w-3 h-3" /> Churn: {churnRiskPercent}%
                    </span>
                  </div>

                  {((cust.buyingHabits && cust.buyingHabits.length > 0) || (cust.demands && cust.demands.length > 0)) && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {cust.buyingHabits?.slice(0, 2).map((h, i) => (
                        <span key={i} className="text-[9px] font-semibold bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-100 truncate max-w-[120px]">
                          🛍️ {h}
                        </span>
                      ))}
                      {cust.demands?.slice(0, 2).map((d, i) => (
                        <span key={i} className="text-[9px] font-semibold bg-rose-50/50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100/50 truncate max-w-[120px]">
                          🎯 {d}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-50 text-[10px]">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">LTV</span>
                      <span className="font-bold text-slate-800">${cust.lifetime_value.toLocaleString()}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Email</span>
                      <span className="text-slate-600 font-medium truncate block">{cust.email}</span>
                    </div>
                  </div>

                  {reasonMap[cust.id] && (
                    <div className="mt-4 p-3 bg-indigo-50/30 border border-indigo-100/50 rounded-lg text-[11px] text-slate-600 leading-relaxed">
                      <span className="font-bold text-slate-800 text-[9px] block uppercase tracking-wider mb-0.5">Gemini Diagnostics:</span>
                      {reasonMap[cust.id]}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100/60 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer" onClick={() => setSelectedCustId(cust.id)}>
                    View Interactions →
                  </span>
                  
                  <button
                    onClick={() => runPredictiveChurnRisk(cust)}
                    disabled={loadingMap[cust.id]}
                    className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all disabled:opacity-50"
                  >
                    {loadingMap[cust.id] ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>Predict Churn</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Customer Interactions & Reply Draft Drawer */}
        {selectedCustId && activeCust && (
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Account Matrix: {activeCust.name}</h3>
                <p className="text-[10px] text-slate-400">Interaction timeline, customer temperament index, and automated drafts.</p>
              </div>
              <button 
                onClick={() => setSelectedCustId(null)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg border border-slate-100 transition-all text-[10px] font-semibold flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>

            {/* Habits & Demands Pre-planning workspace */}
            <div className="bg-indigo-50/45 p-4 rounded-xl border border-indigo-100/55 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Returning Client Pre-planning</span>
                </h4>
                <span className="text-[9px] font-extrabold uppercase text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                  Tag: {activeCust.tag || 'Customer'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                {/* Buying habits */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">🎁 Buying Habits</span>
                  {activeCust.buyingHabits && activeCust.buyingHabits.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {activeCust.buyingHabits.map((habit, idx) => (
                        <span key={idx} className="bg-white border border-indigo-100 px-2 py-0.5 rounded text-[9px] font-semibold text-slate-700">
                          {habit}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No buying habits logged yet.</p>
                  )}
                </div>

                {/* Returning demands */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">🎯 Preferred Demands</span>
                  {activeCust.demands && activeCust.demands.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {activeCust.demands.map((demand, idx) => (
                        <span key={idx} className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded text-[9px] font-semibold">
                          {demand}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No custom preferences or demands logged.</p>
                  )}
                </div>
              </div>

              {/* Direct interactive adjustment option */}
              <div className="pt-2 border-t border-indigo-100/60 flex items-center gap-2">
                <input 
                  type="text"
                  placeholder="Record custom demand/habit..."
                  id="input_habit_demand"
                  className="flex-grow bg-white text-xs border border-indigo-200/80 rounded-lg px-2.5 py-1 text-slate-800 placeholder-slate-400 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (!val) return;
                      const updatedDemands = [...(activeCust.demands || []), val];
                      const updated = customers.map(c => c.id === activeCust.id ? { ...c, demands: updatedDemands } : c);
                      dataStore.saveCustomers(updated);
                      setCustomers(updated);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const inputEl = document.getElementById('input_habit_demand') as HTMLInputElement;
                    const val = inputEl?.value.trim();
                    if (!val) return;
                    const updatedDemands = [...(activeCust.demands || []), val];
                    const updated = customers.map(c => c.id === activeCust.id ? { ...c, demands: updatedDemands } : c);
                    dataStore.saveCustomers(updated);
                    setCustomers(updated);
                    if (inputEl) inputEl.value = '';
                  }}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shrink-0"
                >
                  Add Demand
                </button>
              </div>
            </div>

            {/* Interaction logging form */}
            <form onSubmit={handleAddLog} className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Log New Interaction Touchpoint</span>
              
              <div className="flex gap-2">
                {(['call', 'email', 'meeting'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLogType(type)}
                    className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                      logType === type 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {type === 'call' && <Phone className="w-3 h-3" />}
                    {type === 'email' && <Mail className="w-3 h-3" />}
                    {type === 'meeting' && <Calendar className="w-3 h-3" />}
                    <span>{type}</span>
                  </button>
                ))}
              </div>

              <textarea
                value={logNotes}
                onChange={e => setLogNotes(e.target.value)}
                placeholder="Log touchpoint notes... (Use words like happy/satisfied or angry/frustrated to see instant corporate temperament shifts)"
                className="w-full text-xs p-3 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                required
              />

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> Log Interaction Touchpoint
              </button>
            </form>

            {/* Interaction Logs Timeline */}
            <div className="space-y-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Logged Timeline History ({activeCustLogs.length})</span>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {activeCustLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No contact touchpoints logged for this customer account.</p>
                ) : (
                  activeCustLogs.map((log) => {
                    const sentiment = calculateSentiment(log.notes);
                    return (
                      <div key={log.id} className="p-3.5 bg-white border border-slate-200/60 rounded-xl space-y-2 relative hover:border-slate-300">
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase">
                            {log.type === 'call' && <Phone className="w-3 h-3 text-slate-400" />}
                            {log.type === 'email' && <Mail className="w-3 h-3 text-slate-400" />}
                            {log.type === 'meeting' && <Calendar className="w-3 h-3 text-slate-400" />}
                            <span>{log.type}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 uppercase ${sentiment.color}`}>
                            {sentiment.icon} {sentiment.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{log.notes}</p>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-50">
                          <span>Logged by: <strong>{log.authorName}</strong></span>
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Gemini Response draft workspace */}
            <div className="pt-5 border-t border-slate-100 space-y-4">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-indigo-50 text-indigo-600 rounded">
                  <Bot className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Gemini Automated Reply Assistant</h4>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={customInstruction}
                  onChange={e => setCustomInstruction(e.target.value)}
                  placeholder="Manager instructions (e.g. Apologize for delay, offer 10% loyalty credit)"
                  className="w-full text-xs p-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
                
                <button
                  type="button"
                  onClick={handleGenerateAIDraft}
                  disabled={generatingDraft}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {generatingDraft ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Formulating Corporate Draft...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>Formulate Tailored Reply Draft</span>
                    </>
                  )}
                </button>
              </div>

              {draftResponse && (
                <div className="bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100/60 text-xs leading-relaxed space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100/50">
                    <span className="font-bold text-indigo-900 font-mono text-[10px] uppercase">Generated Enterprise Draft</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(draftResponse);
                        alert('Copied reply draft to clipboard successfully!');
                      }}
                      className="text-[9px] font-bold text-indigo-600 hover:underline"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                  <div className="markdown-body text-slate-700 font-medium whitespace-pre-line prose max-w-none">
                    <Markdown>{draftResponse}</Markdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CREATE NEW CLIENT MODAL */}
      {isCreateClientOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form 
            onSubmit={handleCreateClientSubmit} 
            className="bg-white rounded-xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Register CRM Client Profile</span>
              </h3>
              <button type="button" onClick={() => setIsCreateClientOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Client Contact Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe"
                  value={newClientName} 
                  onChange={e => setNewClientName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Phone Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. +1 555 1234"
                  value={newClientPhone} 
                  onChange={e => setNewClientPhone(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Email Address</label>
                <input 
                  type="email" 
                  placeholder="e.g. john@acme.com"
                  value={newClientEmail} 
                  onChange={e => setNewClientEmail(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Estimated Lifetime Value ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  value={newClientLTV} 
                  onChange={e => setNewClientLTV(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Client Classification Tag</label>
                <select
                  value={newClientTag}
                  onChange={e => setNewClientTag(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  <option value="customer">🛍️ Customer (Standard)</option>
                  <option value="guest">🏨 Hotel / Lodging Guest</option>
                  <option value="walk-in">🚶 Walk-in POS Client</option>
                  <option value="corporate">💼 Corporate Account</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Tracked Buying Habits (comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Local beverages, Souvenirs"
                  value={newClientHabits} 
                  onChange={e => setNewClientHabits(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Recurring Demands / Prefs (comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Late checkout, High floor, Dairy-free"
                  value={newClientDemands} 
                  onChange={e => setNewClientDemands(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-3 flex space-x-2">
              <button 
                type="submit" 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-semibold"
              >
                Create Account
              </button>
              <button 
                type="button" 
                onClick={() => setIsCreateClientOpen(false)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI BOOKING CONFIRMATION EXTRACTION & CRM AUTO-SYNC MODAL */}
      {isBookingSyncModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {
                setIsBookingSyncModalOpen(false);
                setParsedBookingResult(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">AI Booking Confirmation Contact Extractor</h3>
                <p className="text-xs text-slate-500">
                  Parse guest contact details, stay dates, and preferences from booking confirmations to create or update CRM profiles.
                </p>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="mb-4">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Load Sample Confirmation</p>
              <div className="flex flex-wrap gap-2">
                {sampleBookingTemplates.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBookingInputText(tmpl.text)}
                    className="text-[11px] px-2.5 py-1 rounded-md border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium transition-colors"
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Input textarea */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Booking Confirmation Email / Text
                </label>
                <textarea
                  value={bookingInputText}
                  onChange={(e) => setBookingInputText(e.target.value)}
                  placeholder="Paste booking confirmation email, OTA summary, or guest reservation details..."
                  rows={6}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-slate-700"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Powered by Gemini Multimodal Extraction
                </span>
                <button
                  type="button"
                  id="btn_extract_and_sync_booking"
                  onClick={handleParseBookingConfirmation}
                  disabled={isParsingBooking || !bookingInputText.trim()}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 text-white transition-all shadow-md ${
                    isParsingBooking || !bookingInputText.trim()
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                  }`}
                >
                  {isParsingBooking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Parsing with Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-purple-200" />
                      <span>Extract & Sync to CRM</span>
                    </>
                  )}
                </button>
              </div>

              {/* Extraction Preview Card */}
              {parsedBookingResult && (
                <div className="mt-4 p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      Extracted & Synced to CRM Profile
                    </span>
                    <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded-full uppercase">
                      {parsedBookingResult.sourceChannel || 'Direct'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Guest Full Name</p>
                      <p className="font-semibold text-slate-800">{parsedBookingResult.guestName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Email Address</p>
                      <p className="font-mono text-slate-700">{parsedBookingResult.guestEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Phone Number</p>
                      <p className="font-mono text-slate-700">{parsedBookingResult.guestPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Room / Unit</p>
                      <p className="font-semibold text-slate-800">
                        {parsedBookingResult.roomNumber ? `Room #${parsedBookingResult.roomNumber}` : parsedBookingResult.roomType || 'Standard'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Stay Dates</p>
                      <p className="text-slate-700">
                        {parsedBookingResult.checkInDate || 'TBD'} &rarr; {parsedBookingResult.checkOutDate || 'TBD'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Booking Value (LTV Addition)</p>
                      <p className="font-bold text-emerald-600">
                        ${parsedBookingResult.totalAmount?.toLocaleString() || '0.00'}
                      </p>
                    </div>
                  </div>

                  {(parsedBookingResult.specialRequests || parsedBookingResult.notes) && (
                    <div className="pt-2 border-t border-purple-200/80 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-700">Preferences / Special Requests: </span>
                      <span>{parsedBookingResult.specialRequests || parsedBookingResult.notes}</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBookingSyncModalOpen(false);
                        setParsedBookingResult(null);
                      }}
                      className="px-4 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 transition-colors"
                    >
                      Done & View in CRM
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECURITY BLOCK ALERTS */}
      {blockedClientEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-rose-100 shadow-2xl p-6 relative">
            <button 
              onClick={() => setBlockedClientEdit(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Security Policy Denied Operation</h3>
                <p className="text-[10px] text-rose-600 font-bold uppercase font-mono">CODE: PERMISSION_DENIED</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                <p className="text-slate-600">
                  Write mutation on client accounts is secured strictly against unauthorized staff.
                </p>
                <div className="text-[11px] space-y-1 pt-2 border-t border-slate-100 font-mono">
                  <p><span className="text-slate-400 font-sans">Role used:</span> <span className="font-bold text-rose-600 capitalize">{blockedClientEdit.authRole}</span></p>
                  <p><span className="text-slate-400 font-sans">Path:</span> {blockedClientEdit.path}</p>
                  <p><span className="text-slate-400 font-sans">Action:</span> {blockedClientEdit.actionAttempted}</p>
                </div>
              </div>

              <div className="bg-slate-950 text-emerald-400 font-mono text-[10px] p-4 rounded-lg leading-relaxed">
                <p className="text-slate-500">// Rule matches on customer nodes</p>
                <p>match /customers/&#123;customerId&#125; &#123;</p>
                <p>&nbsp;&nbsp;allow read: if isAuthenticated();</p>
                <p className="text-rose-400 font-bold">&nbsp;&nbsp;allow write: if isManager() || isSales(); // Denied here</p>
                <p>&#125;</p>
              </div>

              <div className="text-xs text-rose-800 bg-rose-50/50 p-3 rounded border border-rose-100 leading-tight">
                To commit changes to the CRM accounts database, you must switch the active employee profile in the top header to <strong>Sarah Jenkins (Manager)</strong> or <strong>David Miller (Sales)</strong>. Cashiers are restricted to read-only access.
              </div>

              <button 
                onClick={() => setBlockedClientEdit(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                Dismiss Policy Notice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
