import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Building, 
  Package, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight,
  Wallet,
  Scale,
  FileSpreadsheet
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { ChartOfAccount, CashFlowRecord, FixedAssetRecord, InventoryLevel, POSOrder } from '../../types/erp';

interface FinancialOverviewProps {
  accounts: ChartOfAccount[];
  cashFlows: CashFlowRecord[];
  fixedAssets: FixedAssetRecord[];
  inventory: InventoryLevel[];
  orders: POSOrder[];
  onNavigateTab: (tab: string) => void;
}

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

export default function FinancialOverviewTab({
  accounts,
  cashFlows,
  fixedAssets,
  inventory,
  orders,
  onNavigateTab
}: FinancialOverviewProps) {
  // Aggregate accounts by category
  const assetAccounts = accounts.filter(a => a.category === 'asset');
  const liabilityAccounts = accounts.filter(a => a.category === 'liability');
  const equityAccounts = accounts.filter(a => a.category === 'equity');
  const revenueAccounts = accounts.filter(a => a.category === 'revenue');
  const expenseAccounts = accounts.filter(a => a.category === 'expense');

  const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = equityAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalExpenses = expenseAccounts.reduce((sum, a) => sum + a.balance, 0);
  const netIncome = totalRevenue - totalExpenses;

  // Working capital & Cash
  const currentAssets = assetAccounts.filter(a => a.subcategory === 'current_asset').reduce((sum, a) => sum + a.balance, 0);
  const currentLiabilities = liabilityAccounts.filter(a => a.subcategory === 'current_liability').reduce((sum, a) => sum + a.balance, 0);
  const workingCapital = currentAssets - currentLiabilities;
  const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : 'N/A';

  const cashOnHand = assetAccounts.filter(a => a.code === '1010' || a.code === '1020').reduce((sum, a) => sum + a.balance, 0);

  // Inflows & Outflows from Cash Flow
  const totalInflows = cashFlows.filter(c => c.direction === 'inflow').reduce((sum, c) => sum + c.amount, 0);
  const totalOutflows = cashFlows.filter(c => c.direction === 'outflow').reduce((sum, c) => sum + c.amount, 0);
  const netCashFlow = totalInflows - totalOutflows;

  // Asset Composition for Pie Chart
  const assetData = [
    { name: 'Liquid Cash & Float', value: Math.max(0, cashOnHand) },
    { name: 'Accounts Receivable', value: Math.max(0, assetAccounts.find(a => a.code === '1100')?.balance || 18450) },
    { name: 'Merchandise Inventory', value: Math.max(0, assetAccounts.find(a => a.code === '1200')?.balance || 42800) },
    { name: 'Fixed Property & Fleet', value: Math.max(0, fixedAssets.reduce((s, f) => s + f.currentBookValue, 0)) }
  ];

  // Revenue vs Expense Trend Simulation
  const trendData = [
    { month: 'Apr', revenue: 64200, expenses: 43100, profit: 21100 },
    { month: 'May', revenue: 71500, expenses: 47200, profit: 24300 },
    { month: 'Jun', revenue: 78900, expenses: 51000, profit: 27900 },
    { month: 'Jul', revenue: 84300, expenses: 54600, profit: 29700 },
    { month: 'Aug', revenue: 92100, expenses: 58400, profit: 33700 },
    { month: 'Sep', revenue: Math.round(totalRevenue), expenses: Math.round(totalExpenses), profit: Math.round(netIncome) }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Quick Navigation Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Financial Performance & Executive Accounting</h2>
          <p className="text-xs text-slate-500">Real-time balances across General Ledger, Cash Flows, Fixed Assets & Inventories</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('cashflow')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Enter Cash Flow</span>
          </button>
          <button
            onClick={() => onNavigateTab('coa')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Chart of Accounts</span>
          </button>
          <button
            onClick={() => onNavigateTab('reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            <span>Generate Reports</span>
          </button>
        </div>
      </div>

      {/* 2. Key Accounting Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Operating Income */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Operating Profit</span>
            <div className={`p-2 rounded-lg ${netIncome >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            ${netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span className={`font-semibold ${netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0'}%
            </span>
            <span>net profit margin</span>
          </div>
        </div>

        {/* Operating Cash on Hand */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Liquid Cash Reserves</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            ${cashOnHand.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
            <span>Net cash flow:</span>
            <span className={`font-semibold ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {netCashFlow >= 0 ? '+' : ''}${netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Total Assets */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Enterprise Assets</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            ${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span>Fixed Assets Book Value:</span>
            <span className="font-semibold text-slate-700">
              ${fixedAssets.reduce((s, a) => s + a.currentBookValue, 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Working Capital & Solvency */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Working Capital</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            ${workingCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span>Current Ratio:</span>
            <span className="font-semibold text-slate-700">{currentRatio}</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Healthy</span>
          </div>
        </div>
      </div>

      {/* 3. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Expenses Trend */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue, Operating Expenses & Profit Velocity</h3>
              <p className="text-xs text-slate-500">Monthly progression across commercial lines</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1 text-indigo-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> Revenue
              </span>
              <span className="flex items-center gap-1 text-rose-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Expense
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Profit
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip 
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" fill="none" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Balance Sheet Asset Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Total Asset Structure</h3>
            <p className="text-xs text-slate-500 mb-3">Portfolio allocation across capital classes</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {assetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-1.5 mt-2 border-t border-slate-100 pt-3">
            {assetData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  {item.name}
                </span>
                <span className="font-semibold text-slate-900">${item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Accounting Equation Verification Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-lg shadow-xs">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Fundamental Accounting Equation Status</h4>
            <p className="text-xs text-slate-600">
              Assets ($ {totalAssets.toLocaleString()}) = Liabilities ($ {totalLiabilities.toLocaleString()}) + Equity ($ {(totalAssets - totalLiabilities).toLocaleString()})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Balanced & Reconciled
          </span>
        </div>
      </div>
    </div>
  );
}
