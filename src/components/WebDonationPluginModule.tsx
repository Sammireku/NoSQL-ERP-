import React, { useState, useEffect, useMemo } from 'react';
import { 
  HeartHandshake, 
  Code, 
  Sparkles, 
  Copy, 
  Check, 
  DollarSign, 
  TrendingUp, 
  Users, 
  CreditCard, 
  ExternalLink, 
  Plus, 
  Settings, 
  Globe, 
  FileText, 
  Download, 
  ShieldCheck, 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  Layout,
  Sliders,
  Layers,
  Smartphone,
  Info,
  Database,
  Search,
  UserCheck,
  RefreshCw,
  Tag,
  Mail,
  Phone,
  MapPin,
  X,
  Bell,
  BellRing,
  Filter,
  SlidersHorizontal,
  AlertTriangle,
  BarChart2,
  MessageSquare,
  Target,
  Send,
  Printer,
  Heart,
  Share2,
  Award,
  CheckCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { UserProfile, WebDonationFormConfig, WebDonationTransaction, DonorGrant, DonorProfile, CapturedDonorRecord, ProjectBudget } from '../types/erp';
import { dataStore } from '../config/firebase';
import { exportToCSV } from '../utils/exportUtils';

interface WebDonationPluginModuleProps {
  activeUser: UserProfile;
}

export default function WebDonationPluginModule({ activeUser }: WebDonationPluginModuleProps) {
  const [forms, setForms] = useState<WebDonationFormConfig[]>([]);
  const [transactions, setTransactions] = useState<WebDonationTransaction[]>([]);
  const [grants, setGrants] = useState<DonorGrant[]>([]);
  const [projectBudgets, setProjectBudgets] = useState<ProjectBudget[]>([]);
  const [donorProfiles, setDonorProfiles] = useState<DonorProfile[]>([]);
  const [capturedDb, setCapturedDb] = useState<CapturedDonorRecord[]>([]);

  const [selectedForm, setSelectedForm] = useState<WebDonationFormConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'embed' | 'preview' | 'transactions' | 'donor_db' | 'captured_db'>('preview');

  // Search & Filters
  const [donorSearchTerm, setDonorSearchTerm] = useState('');
  const [capturedSearchTerm, setCapturedSearchTerm] = useState('');
  const [selectedDonorDetail, setSelectedDonorDetail] = useState<DonorProfile | null>(null);

  // Frequency Categorization Filter for Donor Database
  const [donorFreqFilter, setDonorFreqFilter] = useState<'all' | 'one_time' | 'monthly' | 'quarterly' | 'annually'>('all');

  // Automated System Alert Settings for High-Value Donations
  const [enableLargeDonationAlert, setEnableLargeDonationAlert] = useState<boolean>(true);
  const [largeDonationThreshold, setLargeDonationThreshold] = useState<number>(250);
  const [alertRecipients, setAlertRecipients] = useState<string>('admin@organization.org, ceo@organization.org');

  // Transactions Search & Status Filters
  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'recent' | 'large' | 'recurring'>('all');
  const [showTrendsView, setShowTrendsView] = useState(true);

  // New Form Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('Clean Water Infrastructure Donation Drive 2026');
  const [newSubtitle, setNewSubtitle] = useState('Help provide solar-powered clean water pumps and wells.');
  const [newTarget, setNewTarget] = useState('Clean Water Infrastructure');
  const [newCampaignGoal, setNewCampaignGoal] = useState<number>(25000);
  const [newCurrency, setNewCurrency] = useState('USD');
  const [newAmounts, setNewAmounts] = useState('25, 50, 100, 250, 500');
  const [newAllowCustom, setNewAllowCustom] = useState(true);
  const [newAllowRecurring, setNewAllowRecurring] = useState(true);
  const [newDefaultInterval, setNewDefaultInterval] = useState<'one_time' | 'monthly' | 'annually'>('monthly');
  const [newCollectPhone, setNewCollectPhone] = useState(true);
  const [newCollectAddress, setNewCollectAddress] = useState(false);
  const [newCollectMessage, setNewCollectMessage] = useState(true);
  const [newEnableGiftAid, setNewEnableGiftAid] = useState(true);
  const [newButtonText, setNewButtonText] = useState('Donate to Water Project');
  const [newTheme, setNewTheme] = useState<'indigo' | 'emerald' | 'dark' | 'amber' | 'rose'>('emerald');
  const [newLinkedGrantCode, setNewLinkedGrantCode] = useState('');
  const [newLinkedProjectId, setNewLinkedProjectId] = useState('');

  // Live Test Donation State
  const [testAmount, setTestAmount] = useState<number>(50);
  const [customAmountVal, setCustomAmountVal] = useState<string>('50');
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [isRecurringTest, setIsRecurringTest] = useState(false);
  const [recurringIntervalTest, setRecurringIntervalTest] = useState<'monthly' | 'annually' | 'quarterly'>('monthly');
  const [chosenFrequency, setChosenFrequency] = useState<'one_time' | 'monthly' | 'quarterly' | 'annually'>('one_time');
  const [donorNameVal, setDonorNameVal] = useState('Sarah Jenkins');
  const [donorEmailVal, setDonorEmailVal] = useState('sarah.jenkins@example.org');
  const [donorPhoneVal, setDonorPhoneVal] = useState('+1 (555) 349-1029');
  const [donorMessageVal, setDonorMessageVal] = useState('In honor of the youth tech cohort. Keep inspiring!');
  const [claimGiftAid, setClaimGiftAid] = useState(true);
  const [paymentMethodVal, setPaymentMethodVal] = useState<'credit_card' | 'apple_pay' | 'mollie' | 'ideal' | 'paypal' | 'mobile_money'>('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTx, setCompletedTx] = useState<WebDonationTransaction | null>(null);

  // Dynamic Goal Configuration State
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editingGoalVal, setEditingGoalVal] = useState('');

  // Multi-Currency State
  const [selectedWidgetCurrency, setSelectedWidgetCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'GHS'>('USD');
  const exchangeRates: Record<string, number> = { USD: 1, EUR: 0.92, GBP: 0.78, GHS: 15.5 };
  const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', GHS: 'GH₵' };

  // Thank You Email & Official 501(c)(3) Receipt Modal
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<WebDonationTransaction | null>(null);
  const [showThankYouReceiptModal, setShowThankYouReceiptModal] = useState<boolean>(false);

  // Copy Snippet Feedback & Toast
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const fList = dataStore.getDonationForms();
    const tList = dataStore.getDonationTransactions();
    const gList = dataStore.getGrants();
    const pbList = dataStore.getProjectBudgets();
    const dpList = dataStore.getDonorProfiles();
    const cdList = dataStore.getCapturedDonorDatabase();
    setForms(fList);
    setTransactions(tList);
    setGrants(gList);
    setProjectBudgets(pbList);
    setDonorProfiles(dpList);
    setCapturedDb(cdList);

    if (fList.length > 0 && !selectedForm) {
      setSelectedForm(fList[0]);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
    showToast('Copied embed snippet to clipboard!');
  };

  const handleCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    const amountsArr = newAmounts.split(',').map(a => Number(a.trim())).filter(a => !isNaN(a) && a > 0);
    
    const matchedPb = projectBudgets.find(p => p.id === newLinkedProjectId);

    const created = dataStore.addDonationForm({
      title: newTitle,
      subtitle: newSubtitle,
      campaignTarget: newTarget,
      campaignGoalAmount: newCampaignGoal,
      currency: newCurrency,
      suggestedAmounts: amountsArr.length > 0 ? amountsArr : [10, 25, 50, 100],
      allowCustomAmount: newAllowCustom,
      allowRecurring: newAllowRecurring,
      defaultRecurringInterval: newDefaultInterval,
      collectPhone: newCollectPhone,
      collectAddress: newCollectAddress,
      collectMessage: newCollectMessage,
      enableGiftAid: newEnableGiftAid,
      buttonText: newButtonText,
      primaryColor: newTheme === 'emerald' ? '#059669' : newTheme === 'amber' ? '#d97706' : newTheme === 'rose' ? '#e11d48' : newTheme === 'dark' ? '#0f172a' : '#4f46e5',
      theme: newTheme,
      linkedGrantCode: newLinkedGrantCode || undefined,
      linkedProjectId: newLinkedProjectId || undefined,
      linkedProjectTitle: matchedPb ? matchedPb.projectTitle : undefined
    });

    loadData();
    setSelectedForm(created);
    setIsCreateModalOpen(false);
    showToast(`Tumi Project Web Donation Form "${created.title}" published!`);
  };

  // Automated thank-you tax receipt dispatch function
  const triggerAutomatedThankYouReceiptEmail = (tx: WebDonationTransaction) => {
    console.log(`[SMTP Daemon] Dispatched thank you & tax exemption receipt email to: ${tx.donorEmail}`);
    
    // Record in system audit logs and broadcast as systemic notification
    dataStore.logAudit(
      'system',
      'Automated Mailer Daemon',
      'sysadmin',
      'CREATE',
      `mail_receipt_${tx.id}`,
      `📧 AUTOMATED DISPATCH: Official 501(c)(3) Thank You and Tax Exemption receipt generated and emailed to ${tx.donorName} (${tx.donorEmail}) for their ${tx.isRecurring ? `${tx.recurringInterval} recurring` : 'one-time'} donation of ${currencySymbols[tx.currency] || '$'}${tx.amount.toFixed(2)} ${tx.currency}. Receipt Reference: ${tx.receiptNumber}.`
    );
  };

  const handleExecuteTestDonation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;

    const baseAmount = isCustomAmount ? Number(customAmountVal) : testAmount;
    if (isNaN(baseAmount) || baseAmount <= 0) {
      alert('Please enter a valid donation amount.');
      return;
    }

    // Convert base amount if selected widget currency is different
    const rate = exchangeRates[selectedWidgetCurrency] || 1;
    const finalAmount = Number((baseAmount * rate).toFixed(2));

    setIsProcessing(true);

    setTimeout(() => {
      const tx = dataStore.recordWebDonation({
        formId: selectedForm.id,
        formTitle: selectedForm.title,
        donorName: donorNameVal || 'Anonymous Web Donor',
        donorEmail: donorEmailVal || 'donor@web.org',
        donorPhone: donorPhoneVal,
        donorMessage: donorMessageVal,
        amount: finalAmount,
        currency: selectedWidgetCurrency,
        isRecurring: isRecurringTest,
        recurringInterval: isRecurringTest ? recurringIntervalTest : undefined,
        paymentMethod: paymentMethodVal,
        giftAidClaimed: claimGiftAid,
        linkedGrantCode: selectedForm.linkedGrantCode,
        linkedProjectId: selectedForm.linkedProjectId,
        linkedProjectTitle: selectedForm.linkedProjectTitle
      });

      setIsProcessing(false);
      setCompletedTx(tx);
      loadData();

      // Trigger automated receipt dispatch immediately after database save
      triggerAutomatedThankYouReceiptEmail(tx);

      // Automatically trigger & pop up Thank You Email Receipt
      setSelectedReceiptTx(tx);
      setShowThankYouReceiptModal(true);

      // Check Automated System Notification Alert for Large Donations
      if (enableLargeDonationAlert && finalAmount >= largeDonationThreshold) {
        dataStore.logAudit(
          'system',
          'Automated System Watcher',
          'sysadmin',
          'CREATE',
          tx ? `donation_${tx.id}` : 'donation_web',
          `🚨 AUTOMATED ALERT: High-value web donation of ${currencySymbols[selectedWidgetCurrency]}${finalAmount.toFixed(2)} received from ${donorNameVal} (${donorEmailVal}). Message: "${donorMessageVal}". Threshold: $${largeDonationThreshold}. Alert dispatched to: ${alertRecipients}`
        );
        showToast(`🚨 HIGH-VALUE DONATION ALERT + 📧 Thank You Receipt Sent to ${donorEmailVal}!`);
      } else {
        showToast(`📧 Automated Thank You Email Receipt & Tax Voucher sent to ${donorEmailVal}!`);
      }
    }, 1200);
  };

  // Recharts Monthly Donation Inflows Calculation
  const monthlyTrendsData = useMemo(() => {
    const map: Record<string, { month: string; totalInflow: number; oneTime: number; recurring: number; count: number }> = {};
    
    // Fill last 6 months chronologically
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      map[mKey] = { month: mKey, totalInflow: 0, oneTime: 0, recurring: 0, count: 0 };
    }

    transactions.forEach(tx => {
      const d = new Date(tx.createdAt || Date.now());
      const mKey = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!map[mKey]) {
        map[mKey] = { month: mKey, totalInflow: 0, oneTime: 0, recurring: 0, count: 0 };
      }
      map[mKey].totalInflow += tx.amount;
      if (tx.isRecurring) {
        map[mKey].recurring += tx.amount;
      } else {
        map[mKey].oneTime += tx.amount;
      }
      map[mKey].count += 1;
    });

    return Object.values(map);
  }, [transactions]);

  // Filtered Transactions for Donations Log View
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Search matching
      const matchesSearch = 
        tx.donorName.toLowerCase().includes(txSearchTerm.toLowerCase()) ||
        tx.donorEmail.toLowerCase().includes(txSearchTerm.toLowerCase()) ||
        tx.receiptNumber.toLowerCase().includes(txSearchTerm.toLowerCase()) ||
        tx.formTitle.toLowerCase().includes(txSearchTerm.toLowerCase()) ||
        (tx.donorMessage && tx.donorMessage.toLowerCase().includes(txSearchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (txFilter === 'large') {
        return tx.amount >= largeDonationThreshold;
      }
      if (txFilter === 'recurring') {
        return tx.isRecurring;
      }
      if (txFilter === 'recent') {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        return new Date(tx.createdAt).getTime() >= thirtyDaysAgo;
      }

      return true;
    });
  }, [transactions, txSearchTerm, txFilter, largeDonationThreshold]);

  // Filtered Donor Profiles by Frequency
  const filteredDonorProfiles = useMemo(() => {
    return donorProfiles.filter(dp => {
      const matchesSearch = 
        dp.name.toLowerCase().includes(donorSearchTerm.toLowerCase()) ||
        dp.email.toLowerCase().includes(donorSearchTerm.toLowerCase()) ||
        (dp.phone && dp.phone.includes(donorSearchTerm));

      if (!matchesSearch) return false;

      if (donorFreqFilter === 'monthly') {
        return dp.frequencyCategory === 'monthly' || dp.status === 'recurring';
      }
      if (donorFreqFilter === 'quarterly') {
        return dp.frequencyCategory === 'quarterly';
      }
      if (donorFreqFilter === 'annually') {
        return dp.frequencyCategory === 'annually';
      }
      if (donorFreqFilter === 'one_time') {
        return dp.frequencyCategory === 'one_time' || dp.status !== 'recurring';
      }

      return true;
    });
  }, [donorProfiles, donorSearchTerm, donorFreqFilter]);

  // High-Level Dashboard Calculations
  const totalRaisedOverall = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalDonorsOverall = transactions.length;
  const avgDonation = totalDonorsOverall > 0 ? totalRaisedOverall / totalDonorsOverall : 0;
  const recurringCount = transactions.filter(t => t.isRecurring).length;

  // Active Campaign Goal Progress - dynamically tracks actual total donations from the real transactions database
  const activeGoalAmount = selectedForm?.campaignGoalAmount || 25000;
  const activeRaised = useMemo(() => {
    if (!selectedForm) return 0;
    return transactions
      .filter(t => t.formId === selectedForm.id)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, selectedForm]);
  const campaignProgressPct = activeGoalAmount > 0 ? Math.min(100, Math.round((activeRaised / activeGoalAmount) * 100)) : 0;
  const remainingGoal = Math.max(0, activeGoalAmount - activeRaised);

  // Frequency Stats
  const monthlyRecurringDonors = donorProfiles.filter(d => d.frequencyCategory === 'monthly' || d.status === 'recurring');
  const mrrAmount = monthlyRecurringDonors.reduce((sum, d) => sum + (d.totalDonated / Math.max(1, d.donationCount)), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <HeartHandshake className="w-80 h-80 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-400/30 mb-2">
              <Code className="w-3.5 h-3.5" />
              <span>Tumi Project Web Donation Form Suite & Campaign Progress Engine</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Tumi Project Direct Web Donation Suite</h1>
            <p className="text-xs text-indigo-200/90 mt-1 max-w-2xl">
              Embed direct Tumi Project Web Donation Forms & buttons on your website. Features real-time campaign goal tracking linked directly to project budgets, automated tax receipts, donor lead capture, and multi-currency support.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Form</span>
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Goal Progress Bar Card */}
      {selectedForm && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/90 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Active Campaign Goal Progress</span>
                <h3 className="text-base font-bold text-slate-900">{selectedForm.title}</h3>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs font-bold">
              <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                ${activeRaised.toLocaleString()} Raised
              </span>
              <span className="text-slate-400">/</span>
              
              {isEditingGoal ? (
                <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200 animate-in fade-in zoom-in-95">
                  <span className="text-slate-400 text-xs px-1">$</span>
                  <input
                    type="number"
                    value={editingGoalVal}
                    onChange={(e) => setEditingGoalVal(e.target.value)}
                    className="w-20 px-1 py-0.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800"
                    placeholder="Goal"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const newGoal = Number(editingGoalVal);
                      if (isNaN(newGoal) || newGoal <= 0) {
                        alert("Please enter a valid goal amount.");
                        return;
                      }
                      const updatedForms = forms.map(f => f.id === selectedForm.id ? { ...f, campaignGoalAmount: newGoal } : f);
                      dataStore.saveDonationForms(updatedForms);
                      loadData();
                      setSelectedForm(updatedForms.find(f => f.id === selectedForm.id) || null);
                      setIsEditingGoal(false);
                      showToast("Campaign goal updated successfully!");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[10px] uppercase font-bold transition-all"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingGoal(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-[10px] uppercase font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingGoalVal(activeGoalAmount.toString());
                    setIsEditingGoal(true);
                  }}
                  title="Configure Campaign Goal"
                  className="text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>${activeGoalAmount.toLocaleString()} Goal</span>
                  <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Configure</span>
                </button>
              )}

              <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg">
                {campaignProgressPct}% Complete
              </span>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="space-y-1.5">
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
              <div 
                className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-1000 shadow-sm"
                style={{ width: `${campaignProgressPct}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>Remaining to Goal: <strong className="text-slate-800">${remainingGoal.toLocaleString()}</strong></span>
              <span>Total Supporters: <strong className="text-indigo-600">{selectedForm.donorCount || 142} Donors</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Raised via Plugin</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">${totalRaisedOverall.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              Auto-posted to Ledger
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Monthly Recurring (MRR)</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">${mrrAmount.toFixed(2)}/mo</h3>
            <span className="inline-block mt-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              {monthlyRecurringDonors.length} Active Monthly Supporters
            </span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <RefreshCw className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Avg. Web Donation</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">${avgDonation.toFixed(2)}</h3>
            <span className="inline-block mt-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              Across all campaigns
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Active Plugin Forms</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">{forms.length} Widgets</h3>
            <span className="inline-block mt-1 text-[11px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
              WordPress & Web ready
            </span>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Globe className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Form Selector & View Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Active Form Dropdown */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Campaign Form:</span>
            <select
              value={selectedForm?.id || ''}
              onChange={(e) => {
                const found = forms.find(f => f.id === e.target.value);
                if (found) {
                  setSelectedForm(found);
                  setCompletedTx(null);
                }
              }}
              className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[240px]"
            >
              {forms.map(f => (
                <option key={f.id} value={f.id}>
                  {f.title} (${(f.totalRaised || 0).toLocaleString()} raised)
                </option>
              ))}
            </select>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'preview' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Live Test Widget</span>
            </button>

            <button
              onClick={() => setActiveTab('embed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'embed' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Embed & Plugin Snippets</span>
            </button>

            <button
              onClick={() => setActiveTab('builder')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'builder' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Form Style & Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'transactions' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Web Donations Log ({transactions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('donor_db')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'donor_db' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Donor Database ({donorProfiles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('captured_db')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'captured_db' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Captured Lead DB ({capturedDb.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: LIVE TEST WIDGET SIMULATOR */}
        {activeTab === 'preview' && selectedForm && (
          <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Context Explanation */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-indigo-50/60 rounded-2xl p-5 border border-indigo-100 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Real-Time Website Donation Simulator</span>
                </div>
                <p className="text-xs text-indigo-800/90 leading-relaxed">
                  This live preview renders the exact responsive widget that website visitors see when using your Tumi Project WordPress shortcode or embedded JavaScript snippet.
                </p>
                
                <div className="pt-3 border-t border-indigo-200/50 space-y-2 text-xs">
                  {selectedForm.linkedProjectTitle && (
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-slate-500">Linked Project Budget:</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {selectedForm.linkedProjectTitle}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold text-slate-500">Linked Grant / Fund:</span>
                    <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      {selectedForm.linkedGrantCode || 'General Fund'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold text-slate-500">Campaign Total Raised:</span>
                    <span className="font-bold text-slate-900">${(selectedForm.totalRaised || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold text-slate-500">Target Goal:</span>
                    <span className="font-bold text-emerald-700">${activeGoalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold text-slate-500">Automated Receipt Email:</span>
                    <span className="font-bold text-emerald-600 flex items-center space-x-1">
                      <Mail className="w-3 h-3" />
                      <span>Instant Dispatch</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-Currency Support Selector */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Widget Display Currency & Rate Conversion</span>
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {(['USD', 'EUR', 'GBP', 'GHS'] as const).map(curr => (
                    <button
                      key={curr}
                      onClick={() => setSelectedWidgetCurrency(curr)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        selectedWidgetCurrency === curr
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {curr} ({currencySymbols[curr]})
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  Rate: 1 USD = {exchangeRates[selectedWidgetCurrency]} {selectedWidgetCurrency}
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-600" />
                  <span>How Tumi Direct Web Captures Work</span>
                </h4>
                <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc pl-4">
                  <li>Donations captured here automatically update linked <strong>Project Budgets</strong>, <strong>Master Donor Profiles</strong>, and <strong>External Lead Database</strong>.</li>
                  <li>Generates an official double-entry General Ledger entry posted to <strong>Cash & Operating Revenue</strong>.</li>
                  <li>Dispatches an automated instant 501(c)(3) Thank You Tax Voucher to the donor.</li>
                </ul>
              </div>
            </div>

            {/* Right Widget Interactive Card */}
            <div className="lg:col-span-7 flex justify-center">
              <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200/90 space-y-5 relative">
                {/* Simulated Web Badge */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    Embedded Tumi Donation Widget
                  </span>
                  <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-600">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>256-Bit SSL Encrypted</span>
                  </span>
                </div>

                {/* Campaign Progress Bar inside Widget */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-700">Campaign Goal: ${activeGoalAmount.toLocaleString()}</span>
                    <span className="text-indigo-600">{campaignProgressPct}% Raised</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${campaignProgressPct}%` }}
                    />
                  </div>
                </div>

                {completedTx ? (
                  /* Success Confirmation Screen */
                  <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Thank You for Your Support!</h3>
                      <p className="text-xs text-slate-500 mt-1">Your donation has been received and verified.</p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2 border border-slate-200 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Receipt Ref:</span>
                        <span className="font-mono font-bold text-slate-900">{completedTx.receiptNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount Paid:</span>
                        <span className="font-bold text-emerald-600">{currencySymbols[completedTx.currency] || '$'}{completedTx.amount.toFixed(2)} {completedTx.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Donor Name:</span>
                        <span className="font-semibold text-slate-800">{completedTx.donorName}</span>
                      </div>
                      {completedTx.donorMessage && (
                        <div className="pt-1 border-t border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Dedication / Note:</span>
                          <p className="text-xs italic text-indigo-700 font-medium">"{completedTx.donorMessage}"</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        onClick={() => {
                          setSelectedReceiptTx(completedTx);
                          setShowThankYouReceiptModal(true);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md flex items-center justify-center space-x-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>View / Print Thank You Email Receipt</span>
                      </button>

                      <button
                        onClick={() => setCompletedTx(null)}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl transition-all"
                      >
                        Make Another Donation
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Live Donation Form Inputs */
                  <form onSubmit={handleExecuteTestDonation} className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{selectedForm.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedForm.subtitle}</p>
                    </div>

                    {/* Recurring vs One-time toggle with 4 frequency options */}
                    {selectedForm.allowRecurring && (
                      <div className="space-y-1.5 animate-in fade-in duration-300">
                        <label className="block text-xs font-semibold text-slate-700">Donation Frequency</label>
                        <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                          {[
                            { id: 'one_time', label: 'One-Time' },
                            { id: 'monthly', label: 'Monthly' },
                            { id: 'quarterly', label: 'Quarterly' },
                            { id: 'annually', label: 'Annually' }
                          ].map((freq) => (
                            <button
                              key={freq.id}
                              type="button"
                              onClick={() => {
                                setChosenFrequency(freq.id as any);
                                setIsRecurringTest(freq.id !== 'one_time');
                                if (freq.id !== 'one_time') {
                                  setRecurringIntervalTest(freq.id as any);
                                }
                              }}
                              className={`py-2 rounded-lg text-[10px] font-bold transition-all text-center leading-tight cursor-pointer ${
                                chosenFrequency === freq.id
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                              }`}
                            >
                              {freq.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preset Donation Amounts */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Donation Amount ({selectedWidgetCurrency})</label>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedForm.suggestedAmounts.map((amt) => {
                          const convertedAmt = Math.round(amt * (exchangeRates[selectedWidgetCurrency] || 1));
                          return (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => {
                                setTestAmount(amt);
                                setIsCustomAmount(false);
                              }}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                !isCustomAmount && testAmount === amt
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {currencySymbols[selectedWidgetCurrency]}{convertedAmt}
                            </button>
                          );
                        })}
                      </div>

                      {selectedForm.allowCustomAmount && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setIsCustomAmount(!isCustomAmount)}
                            className="text-xs font-semibold text-indigo-600 hover:underline flex items-center space-x-1"
                          >
                            <span>{isCustomAmount ? 'Use Preset Amount' : '+ Enter Custom Amount'}</span>
                          </button>

                          {isCustomAmount && (
                            <div className="mt-2 relative">
                              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">{currencySymbols[selectedWidgetCurrency]}</span>
                              <input
                                type="number"
                                step="1"
                                value={customAmountVal}
                                onChange={(e) => setCustomAmountVal(e.target.value)}
                                placeholder="Custom Amount"
                                className="w-full text-xs font-bold text-slate-800 pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Donor Info Inputs */}
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Your Full Name</label>
                        <input
                          type="text"
                          value={donorNameVal}
                          onChange={(e) => setDonorNameVal(e.target.value)}
                          placeholder="e.g. Dr. Arthur Pendelton"
                          required
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Email Address (for tax receipt & thank you)</label>
                        <input
                          type="email"
                          value={donorEmailVal}
                          onChange={(e) => setDonorEmailVal(e.target.value)}
                          placeholder="arthur@foundation.org"
                          required
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Donor Message / Note Field */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5 flex items-center justify-between">
                          <span className="flex items-center space-x-1">
                            <MessageSquare className="w-3 h-3 text-indigo-600" />
                            <span>Donor Dedication / Comment Note</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">Appears in CRM Logs</span>
                        </label>
                        <textarea
                          rows={2}
                          value={donorMessageVal}
                          onChange={(e) => setDonorMessageVal(e.target.value)}
                          placeholder="Include a dedication or note (e.g. In honor of youth empowerment...)"
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      {selectedForm.collectPhone && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Phone Number</label>
                          <input
                            type="text"
                            value={donorPhoneVal}
                            onChange={(e) => setDonorPhoneVal(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      )}

                      {selectedForm.enableGiftAid && (
                        <div className="flex items-center space-x-2 pt-1">
                          <input
                            type="checkbox"
                            id="giftAid"
                            checked={claimGiftAid}
                            onChange={(e) => setClaimGiftAid(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                          <label htmlFor="giftAid" className="text-[11px] font-medium text-slate-600 leading-tight">
                            Claim Gift Aid / Tax Deduction Voucher (+25% value added)
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Payment Gateways */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Select Payment Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'credit_card', label: 'Credit Card', icon: '💳' },
                          { id: 'apple_pay', label: 'Apple Pay', icon: '🍎' },
                          { id: 'mollie', label: 'Mollie / iDEAL', icon: '🇳🇱' },
                          { id: 'paypal', label: 'PayPal', icon: '🅿️' },
                          { id: 'mobile_money', label: 'Mobile Money', icon: '📱' },
                        ].map((pm) => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethodVal(pm.id as any)}
                            className={`p-2 rounded-xl text-[11px] font-semibold border flex flex-col items-center justify-center space-y-0.5 transition-all ${
                              paymentMethodVal === pm.id
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-sm">{pm.icon}</span>
                            <span className="truncate w-full text-center">{pm.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Processing Secure Donation...</span>
                        </>
                      ) : (
                        <>
                          <HeartHandshake className="w-4 h-4" />
                          <span>
                            {selectedForm.buttonText} - {currencySymbols[selectedWidgetCurrency]}{(Math.round((isCustomAmount ? Number(customAmountVal || 0) : testAmount) * (exchangeRates[selectedWidgetCurrency] || 1))).toFixed(2)} {isRecurringTest ? '/ Month' : ''}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EMBED CODE & PLUGIN SNIPPET GENERATOR */}
        {activeTab === 'embed' && selectedForm && (
          <div className="pt-6 space-y-6">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 font-bold mb-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Tumi Project Website Integration Code</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{selectedForm.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Form ID: <code className="text-emerald-400 font-mono">{selectedForm.id}</code></p>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {/* 1. WordPress Shortcode */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
                      <Code className="w-4 h-4" />
                      <span>1. WordPress / Tumi Project Shortcode</span>
                    </label>
                    <button
                      onClick={() => copyToClipboard(`[tumi_project_donation_form id="${selectedForm.id}" theme="${selectedForm.theme}"]`, 'wp')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-semibold"
                    >
                      {copiedKey === 'wp' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'wp' ? 'Copied Shortcode!' : 'Copy Shortcode'}</span>
                    </button>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between">
                    <code>[tumi_project_donation_form id="{selectedForm.id}" theme="{selectedForm.theme}"]</code>
                  </div>
                  <p className="text-[11px] text-slate-400">Paste directly into any WordPress page, post, or Gutenberg block editor.</p>
                </div>

                {/* 2. Standard HTML / JavaScript Snippet */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
                      <FileText className="w-4 h-4" />
                      <span>2. Universal JavaScript Snippet (Webflow, Squarespace, Shopify, Custom HTML)</span>
                    </label>
                    <button
                      onClick={() => copyToClipboard(`<div id="tumi-donation-widget" data-form-id="${selectedForm.id}"></div>\n<script src="https://tumierp.app/tumi-widget.js" async></script>`, 'js')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-semibold"
                    >
                      {copiedKey === 'js' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'js' ? 'Copied JS Code!' : 'Copy JS Snippet'}</span>
                    </button>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto">
                    <pre>{`<div id="tumi-donation-widget" data-form-id="${selectedForm.id}"></div>\n<script src="https://tumierp.app/tumi-widget.js" async></script>`}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FORM CONFIGURATOR & STYLE SETTINGS */}
        {activeTab === 'builder' && selectedForm && (
          <div className="pt-6 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Form Customization & System Alert Settings</h3>
                  <p className="text-xs text-slate-500">Configure campaign goals, high-value donation threshold alerts, and fields.</p>
                </div>
              </div>

              {/* High Value Donation Automated Notification Alert Configurator */}
              <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl mt-0.5">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-950">Automated High-Value Donation Alert Watcher</h4>
                      <p className="text-xs text-amber-800/90 mt-0.5">
                        Trigger real-time audit logs and email dispatches whenever a donor contributes above a specified amount.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={enableLargeDonationAlert}
                      onChange={(e) => setEnableLargeDonationAlert(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {enableLargeDonationAlert && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-amber-200/80">
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1">
                        High-Value Alert Threshold Amount ($)
                      </label>
                      <input
                        type="number"
                        value={largeDonationThreshold}
                        onChange={(e) => setLargeDonationThreshold(Number(e.target.value))}
                        className="w-full text-xs font-bold bg-white border border-amber-300 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1">
                        Alert Recipient Email Addresses
                      </label>
                      <input
                        type="text"
                        value={alertRecipients}
                        onChange={(e) => setAlertRecipients(e.target.value)}
                        className="w-full text-xs font-medium bg-white border border-amber-300 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WEB DONATIONS STREAM LOG & RECHARTS TRENDS VISUALIZATION */}
        {activeTab === 'transactions' && (
          <div className="pt-6 space-y-6">
            {/* Donation Trends Visualization Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="inline-flex items-center space-x-1.5 text-xs text-indigo-600 font-bold mb-0.5">
                    <BarChart2 className="w-4 h-4" />
                    <span>Recharts Analytics Engine</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Donation Trends & Monthly Inflows</h3>
                  <p className="text-xs text-slate-500">Visualization of monthly donation volumes split by one-time gifts and recurring contributions.</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowTrendsView(!showTrendsView)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-xl transition-all"
                  >
                    {showTrendsView ? 'Hide Trends Chart' : 'Show Trends Chart'}
                  </button>
                </div>
              </div>

              {showTrendsView && (
                <div className="pt-2">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrendsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.05}/>
                          </linearGradient>
                          <linearGradient id="colorRecurring" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#9333ea" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                        <Tooltip
                          formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, 'Inflow']}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Area type="monotone" dataKey="totalInflow" name="Total Inflow ($)" stroke="#4f46e5" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                        <Area type="monotone" dataKey="recurring" name="Recurring Inflow ($)" stroke="#9333ea" fillOpacity={1} fill="url(#colorRecurring)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Donation Records View Header, Search Bar & Status Filters */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Web Donation Transactions Stream</h3>
                  <p className="text-xs text-slate-500">Real-time log of web donations received across all active plugin widgets.</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => exportToCSV(filteredTransactions, 'Web_Donations_Filtered_Log')}
                    className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3.5 py-2 rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV ({filteredTransactions.length})</span>
                  </button>
                </div>
              </div>

              {/* Search & Status Filters Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
                {/* Search Bar */}
                <div className="relative w-full lg:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search donor name, email, receipt #, campaign, note..."
                    value={txSearchTerm}
                    onChange={(e) => setTxSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full shadow-2xs"
                  />
                  {txSearchTerm && (
                    <button
                      onClick={() => setTxSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center space-x-1">
                    <Filter className="w-3 h-3 text-slate-400" />
                    <span>Filter:</span>
                  </span>

                  <button
                    onClick={() => setTxFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      txFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All ({transactions.length})
                  </button>

                  <button
                    onClick={() => setTxFilter('recent')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      txFilter === 'recent'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Recent (30 Days)
                  </button>

                  <button
                    onClick={() => setTxFilter('large')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                      txFilter === 'large'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Large Donations (≥${largeDonationThreshold})</span>
                  </button>

                  <button
                    onClick={() => setTxFilter('recurring')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      txFilter === 'recurring'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    Recurring Gifts
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Receipt Ref</th>
                      <th className="py-3 px-4">Donor Name & Email</th>
                      <th className="py-3 px-4">Form / Campaign</th>
                      <th className="py-3 px-4">Donor Message / Dedication</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Gateway</th>
                      <th className="py-3 px-4">Frequency</th>
                      <th className="py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                          No donation records found matching search or filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{tx.receiptNumber}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{tx.donorName}</div>
                            <div className="text-[11px] text-slate-500">{tx.donorEmail}</div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-indigo-600">{tx.formTitle}</td>
                          <td className="py-3 px-4">
                            {tx.donorMessage ? (
                              <div className="bg-indigo-50/70 p-2 rounded-xl border border-indigo-100 max-w-xs text-[11px] text-indigo-900 italic">
                                <span className="font-semibold non-italic text-indigo-600 block text-[9px] uppercase tracking-wider mb-0.5">Dedication Note:</span>
                                "{tx.donorMessage}"
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No message</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-600">
                            {currencySymbols[tx.currency] || '$'}{tx.amount.toFixed(2)} {tx.currency}
                            {tx.amount >= largeDonationThreshold && (
                              <span className="ml-1.5 text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200 block w-fit mt-0.5">
                                Large Gift
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 uppercase text-[11px] font-semibold text-slate-700">{tx.paymentMethod.replace('_', ' ')}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.isRecurring ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {tx.isRecurring ? 'Monthly' : 'One-Time'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => {
                                setSelectedReceiptTx(tx);
                                setShowThankYouReceiptModal(true);
                              }}
                              className="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 transition-all flex items-center space-x-1"
                            >
                              <Mail className="w-3 h-3" />
                              <span>View Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MASTER DONOR PROFILES DATABASE WITH FREQUENCY CATEGORIZATION */}
        {activeTab === 'donor_db' && (
          <div className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center space-x-1 text-xs text-indigo-600 font-bold mb-0.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Master ERP CRM Database</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Donor Database ({donorProfiles.length} Profiles)</h3>
                <p className="text-xs text-slate-500">Categorize donors by frequency (One-time, Monthly, Quarterly, Annual) to cultivate recurring supporters.</p>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search donor name, email, phone..."
                    value={donorSearchTerm}
                    onChange={(e) => setDonorSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none w-52"
                  />
                </div>

                <button
                  onClick={() => exportToCSV(filteredDonorProfiles, 'Master_Donor_Profiles_Database')}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 border border-indigo-200/80 transition-all shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export DB (CSV)</span>
                </button>
              </div>
            </div>

            {/* Frequency Categorization Filter Bar */}
            <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center space-x-1">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Frequency Filter:</span>
                </span>

                {[
                  { id: 'all', label: 'All Donors' },
                  { id: 'monthly', label: 'Monthly Donors 💖' },
                  { id: 'quarterly', label: 'Quarterly Patrons' },
                  { id: 'annually', label: 'Annual Sponsors' },
                  { id: 'one_time', label: 'One-Time Supporters' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setDonorFreqFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      donorFreqFilter === f.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500 font-semibold">
                Showing <strong className="text-slate-900">{filteredDonorProfiles.length}</strong> donors matching frequency
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Donor ID & Name</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Giving Frequency</th>
                    <th className="py-3 px-4">Lifetime Total</th>
                    <th className="py-3 px-4">Donation Count</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDonorProfiles.map((dp) => (
                    <tr key={dp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{dp.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{dp.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium flex items-center space-x-1">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{dp.email}</span>
                        </div>
                        {dp.phone && (
                          <div className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span>{dp.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          dp.frequencyCategory === 'monthly' || dp.status === 'recurring' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          dp.frequencyCategory === 'quarterly' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          dp.frequencyCategory === 'annually' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {dp.frequencyCategory ? dp.frequencyCategory.replace('_', ' ') : (dp.status === 'recurring' ? 'Monthly' : 'One-Time')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        ${dp.totalDonated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{dp.donationCount}</span>
                        <span className="text-[10px] text-slate-400 ml-1">gifts</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          dp.status === 'vip' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          dp.status === 'recurring' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {dp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedDonorDetail(dp)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-2.5 py-1 rounded-lg transition-all"
                        >
                          View History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: SEPARATE CAPTURED DONOR DATABASE */}
        {activeTab === 'captured_db' && (
          <div className="pt-6 space-y-4">
            <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 font-bold">
                  <Database className="w-4 h-4" />
                  <span>Isolated External Storage Engine</span>
                </div>
                <h3 className="text-lg font-bold text-white">Captured Donor Lead Database ({capturedDb.length} Records)</h3>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Captured donor details (Name, Email, Amount, Phone, Message) logged in <code className="text-emerald-300 font-mono">CAPTURED_DONOR_DATABASE</code> alongside the main CRM.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => exportToCSV(capturedDb, 'External_Captured_Donor_Leads_Database')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Lead DB (CSV)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="relative w-full max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by donor name, email, form title, message..."
                  value={capturedSearchTerm}
                  onChange={(e) => setCapturedSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none w-full"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{capturedDb.length}</strong> captured web donation entries
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Capture ID & Receipt</th>
                    <th className="py-3 px-4">Donor Name & Email</th>
                    <th className="py-3 px-4">Dedication Message</th>
                    <th className="py-3 px-4">Captured Amount</th>
                    <th className="py-3 px-4">Campaign Plugin Form</th>
                    <th className="py-3 px-4">Source Database</th>
                    <th className="py-3 px-4">Captured At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {capturedDb
                    .filter(c => 
                      c.donorName.toLowerCase().includes(capturedSearchTerm.toLowerCase()) ||
                      c.donorEmail.toLowerCase().includes(capturedSearchTerm.toLowerCase()) ||
                      c.formTitle.toLowerCase().includes(capturedSearchTerm.toLowerCase()) ||
                      c.receiptNumber.toLowerCase().includes(capturedSearchTerm.toLowerCase()) ||
                      (c.donorMessage && c.donorMessage.toLowerCase().includes(capturedSearchTerm.toLowerCase()))
                    )
                    .map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <div>{rec.id}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{rec.receiptNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{rec.donorName}</div>
                          <div className="text-[11px] text-slate-500">{rec.donorEmail}</div>
                        </td>
                        <td className="py-3 px-4">
                          {rec.donorMessage ? (
                            <span className="text-[11px] italic text-indigo-900 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 block max-w-xs">
                              "{rec.donorMessage}"
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No message</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-600">
                          ${rec.donationAmount.toFixed(2)} {rec.currency}
                        </td>
                        <td className="py-3 px-4 font-semibold text-indigo-600">
                          {rec.formTitle}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md flex items-center space-x-1 w-fit">
                            <Database className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{rec.databaseSource}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(rec.capturedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Viewing Donor Profile & History */}
      {selectedDonorDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {selectedDonorDetail.id}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedDonorDetail.name}</h3>
                <p className="text-xs text-slate-500">{selectedDonorDetail.email}</p>
              </div>
              <button
                onClick={() => setSelectedDonorDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Donated</p>
                <p className="text-base font-bold text-emerald-600">${selectedDonorDetail.totalDonated.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Gift Count</p>
                <p className="text-base font-bold text-slate-900">{selectedDonorDetail.donationCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Frequency</p>
                <span className="text-xs font-bold text-purple-700 capitalize">{selectedDonorDetail.frequencyCategory || selectedDonorDetail.status}</span>
              </div>
            </div>

            {selectedDonorDetail.notes && (
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-900">
                <span className="font-bold text-indigo-700 block text-[10px] uppercase mb-0.5">Donor Dedications & Notes:</span>
                {selectedDonorDetail.notes}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2">Past Donations History</h4>
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {selectedDonorDetail.donationsHistory?.map((item, idx) => (
                  <div key={idx} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-800">{item.formTitle}</div>
                      <div className="text-[10px] font-mono text-slate-400">Receipt: {item.receiptNumber} • {new Date(item.date).toLocaleDateString()}</div>
                      {item.donorMessage && (
                        <div className="text-[10px] text-indigo-700 italic mt-0.5">"{item.donorMessage}"</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">${item.amount.toFixed(2)} {item.currency}</div>
                      <div className="text-[10px] uppercase text-slate-400">{item.paymentMethod.replace('_', ' ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDonorDetail(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AUTOMATED THANK YOU EMAIL RECEIPT & 501(C)(3) TAX VOUCHER */}
      {showThankYouReceiptModal && selectedReceiptTx && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Automated Dispatch Triggered</span>
                  <h3 className="text-base font-bold text-slate-900">Official Thank You Email & Tax Receipt</h3>
                </div>
              </div>
              <button
                onClick={() => setShowThankYouReceiptModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Email Preview Container */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 text-xs">
              <div className="border-b border-slate-200 pb-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">To:</span>
                  <span className="font-bold text-slate-900">{selectedReceiptTx.donorName} &lt;{selectedReceiptTx.donorEmail}&gt;</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Subject:</span>
                  <span className="font-bold text-indigo-700">Official Donation Receipt & Thank You for {selectedReceiptTx.formTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">501(c)(3) Tax Exempt ID:</span>
                  <span className="font-mono font-bold text-slate-700">#84-9028149</span>
                </div>
              </div>

              {/* Formatted Receipt Body */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="font-bold text-indigo-900">Tumi Enterprise Global Foundation</div>
                  <div className="text-[10px] font-mono font-bold text-emerald-600">{selectedReceiptTx.receiptNumber}</div>
                </div>

                <p className="text-slate-700 leading-relaxed">
                  Dear <strong>{selectedReceiptTx.donorName}</strong>,
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Thank you for your generous contribution of <strong>{currencySymbols[selectedReceiptTx.currency] || '$'}{selectedReceiptTx.amount.toFixed(2)} {selectedReceiptTx.currency}</strong> to the <strong>{selectedReceiptTx.formTitle}</strong> campaign. Your support directly sponsors underprivileged youth with vocational kits and technical education.
                </p>

                {selectedReceiptTx.donorMessage && (
                  <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-bold text-indigo-800 uppercase block mb-0.5">Your Dedication / Message Note:</span>
                    <p className="italic text-indigo-900">"{selectedReceiptTx.donorMessage}"</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 block">Payment Method:</span>
                    <span className="font-bold uppercase text-slate-800">{selectedReceiptTx.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Date & Time:</span>
                    <span className="font-bold text-slate-800">{new Date(selectedReceiptTx.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Frequency:</span>
                    <span className="font-bold text-purple-700 capitalize">
                      {selectedReceiptTx.isRecurring 
                        ? `${selectedReceiptTx.recurringInterval || 'recurring'} Subscription` 
                        : 'One-Time Gift'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tax Deduction Eligibility:</span>
                    <span className="font-bold text-emerald-600">100% Tax Deductible</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 pt-1">
                  No goods or services were provided in exchange for this contribution other than intangible religious or charitable benefits.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  showToast(`Re-sent automated Thank You receipt to ${selectedReceiptTx.donorEmail}!`);
                }}
                className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Resend Email Receipt</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>

                <button
                  onClick={() => setShowThankYouReceiptModal(false)}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Creating New Donation Form */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Create New Tumi Project Web Donation Form</h3>
            <p className="text-xs text-slate-500 mt-0.5">Configure campaign details, project budget links, and preset donation choices.</p>

            <form onSubmit={handleCreateForm} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Link to Project / Project Budget</label>
                <select
                  value={newLinkedProjectId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setNewLinkedProjectId(pid);
                    const matched = projectBudgets.find(p => p.id === pid);
                    if (matched) {
                      setNewCampaignGoal(matched.totalBudgetAmount);
                      setNewTitle(`${matched.projectTitle} Donation Drive`);
                      setNewTarget(matched.projectTitle);
                    }
                  }}
                  className="w-full text-xs bg-indigo-50/70 border border-indigo-200 rounded-xl p-2.5 font-bold text-indigo-900"
                >
                  <option value="">Unlinked / Standalone Campaign</option>
                  {projectBudgets.map((pb) => (
                    <option key={pb.id} value={pb.id}>
                      🎯 {pb.projectCode}: {pb.projectTitle} (${pb.totalBudgetAmount.toLocaleString()} Budget)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Form Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle / Purpose</label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Campaign</label>
                  <input
                    type="text"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Campaign Target Goal ($)</label>
                  <input
                    type="number"
                    value={newCampaignGoal}
                    onChange={(e) => setNewCampaignGoal(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Suggested Amounts (Comma Separated)</label>
                <input
                  type="text"
                  value={newAmounts}
                  onChange={(e) => setNewAmounts(e.target.value)}
                  placeholder="10, 25, 50, 100, 250"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Link to ERP Donor Grant Budget</label>
                <select
                  value={newLinkedGrantCode}
                  onChange={(e) => setNewLinkedGrantCode(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                >
                  <option value="">Unlinked (General Operating Cash Ledger)</option>
                  {grants.map((g) => (
                    <option key={g.id} value={g.grantCode}>
                      {g.grantCode} - {g.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                >
                  Publish Plugin Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
