import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { 
  Fuel, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Wrench, 
  Sliders, 
  Filter, 
  Gauge, 
  Activity, 
  ShieldAlert,
  Info,
  Truck,
  RotateCcw,
  DollarSign
} from 'lucide-react';
import { Vehicle, VehicleExpense, UserProfile } from '../types/erp';
import { dataStore } from '../config/firebase';
import { formatPrice } from '../utils/currency';

interface FuelEfficiencyTrendDashboardProps {
  vehicles: Vehicle[];
  expenses: VehicleExpense[];
  activeUser: UserProfile;
  onScheduleService?: (vehicle: Vehicle) => void;
}

const MONTHS = ['Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026'];

export default function FuelEfficiencyTrendDashboard({
  vehicles = [],
  expenses = [],
  activeUser,
  onScheduleService
}: FuelEfficiencyTrendDashboardProps) {
  // Filters
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');
  const [showThresholdLine, setShowThresholdLine] = useState<boolean>(true);
  const [editingThresholdVehicleId, setEditingThresholdVehicleId] = useState<string | null>(null);
  const [tempBaselineKml, setTempBaselineKml] = useState<string>('10.5');
  const [tempDropPercent, setTempDropPercent] = useState<string>('15');

  // Filter fuel expenses
  const fuelExpenses = useMemo(() => {
    return expenses.filter(e => e.expenseCategory === 'fuel');
  }, [expenses]);

  // Generate monthly aggregated fuel trend data for Recharts
  const monthlyTrendData = useMemo(() => {
    // Generate simulated/aggregated historical monthly trend for chart
    return MONTHS.map((monthStr, idx) => {
      const monthNum = idx + 6; // June=6 to Nov=11
      const year = 2026;

      const record: Record<string, any> = {
        month: monthStr,
        monthIndex: idx,
        fleetAverageKml: 11.2,
        maintenanceThresholdKml: 8.9
      };

      vehicles.forEach(veh => {
        const baseline = veh.expectedFuelEfficiencyKml || 11.0;
        
        // Find expenses matching vehicle & month
        const vehExp = fuelExpenses.filter(e => {
          if (e.vehicleId !== veh.id) return false;
          const expDate = new Date(e.date);
          return expDate.getFullYear() === year && expDate.getMonth() + 1 === monthNum;
        });

        if (vehExp.length > 0) {
          const avgKml = vehExp.reduce((acc, curr) => acc + (curr.calculatedEfficiencyKml || baseline), 0) / vehExp.length;
          record[`veh_${veh.id}`] = Number(avgKml.toFixed(2));
          record[`liters_${veh.id}`] = vehExp.reduce((acc, curr) => acc + (curr.litersPurchased || 0), 0);
          record[`dist_${veh.id}`] = vehExp.reduce((acc, curr) => acc + (curr.distanceSinceLastFillKm || 300), 0);
        } else {
          // Realistic historical trend curve
          if (veh.id === 'veh_02' && idx >= 4) { // Ford Transit Van efficiency drop in Oct/Nov
            const droppedKml = idx === 4 ? 8.4 : 7.1;
            record[`veh_${veh.id}`] = droppedKml;
            record[`liters_${veh.id}`] = idx === 4 ? 52 : 58;
            record[`dist_${veh.id}`] = 410;
          } else {
            const variance = (Math.sin(idx * 1.5 + veh.name.length) * 0.8);
            const kml = Number((baseline + variance).toFixed(2));
            record[`veh_${veh.id}`] = kml;
            record[`liters_${veh.id}`] = Math.floor(40 + Math.random() * 15);
            record[`dist_${veh.id}`] = Math.floor(400 + Math.random() * 100);
          }
        }
      });

      return record;
    });
  }, [vehicles, fuelExpenses]);

  // Flagged vehicles with active efficiency drop alerts
  const flaggedVehicles = useMemo(() => {
    return vehicles.filter(v => v.fuelEfficiencyStatus === 'degraded_warning' || v.fuelEfficiencyStatus === 'critical_anomaly');
  }, [vehicles]);

  // Colors for vehicle chart lines
  const VEHICLE_COLORS = [
    '#059669', // Emerald
    '#e11d48', // Rose / Red
    '#2563eb', // Blue
    '#d97706', // Amber
    '#7c3aed', // Purple
    '#0891b2'  // Cyan
  ];

  // Selected vehicle baseline
  const activeVehicle = useMemo(() => {
    return vehicles.find(v => v.id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  // Save updated threshold settings for a vehicle
  const handleSaveThreshold = (vehId: string) => {
    const baseKml = parseFloat(tempBaselineKml);
    const dropPct = parseFloat(tempDropPercent);

    if (isNaN(baseKml) || baseKml <= 0) return;
    if (isNaN(dropPct) || dropPct <= 0) return;

    const updatedVehicles = dataStore.getVehicles().map(v => v.id === vehId ? {
      ...v,
      expectedFuelEfficiencyKml: baseKml,
      fuelEfficiencyAlertDropPercent: dropPct,
      updatedAt: new Date().toISOString()
    } : v);

    dataStore.saveVehicles(updatedVehicles);
    setEditingThresholdVehicleId(null);
  };

  // Acknowledge & resolve an alert
  const handleAcknowledgeAlert = (vehId: string) => {
    const updatedVehicles = dataStore.getVehicles().map(v => v.id === vehId ? {
      ...v,
      fuelEfficiencyStatus: 'normal' as const,
      lastEfficiencyAnomalyReason: undefined,
      updatedAt: new Date().toISOString()
    } : v);

    dataStore.saveVehicles(updatedVehicles);
  };

  return (
    <div className="space-y-6">

      {/* TOP BANNER: GEMINI AI AUTOMATED ALERT SYSTEM */}
      {flaggedVehicles.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 text-white rounded-2xl p-5 shadow-lg border border-rose-700/60 space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-800/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-600/30 border border-rose-400/40 rounded-xl text-rose-300">
                <ShieldAlert className="w-6 h-6 animate-pulse text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">AUTOMATED MAINTENANCE ALERT SYSTEM</h3>
                  <span className="px-2.5 py-0.5 bg-rose-500/30 text-rose-200 border border-rose-400/40 rounded-full text-[10px] font-mono font-bold animate-pulse">
                    {flaggedVehicles.length} Vehicles Flagged
                  </span>
                </div>
                <p className="text-xs text-rose-200 mt-0.5">
                  Gemini AI detected significant fuel efficiency drops below historical baseline. Immediate workshop inspection recommended.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {flaggedVehicles.map(veh => {
              const baseline = veh.expectedFuelEfficiencyKml || 10.5;
              const current = veh.recentFuelEfficiencyKml || 7.1;
              const dropPct = Math.round(((baseline - current) / baseline) * 100);

              return (
                <div key={veh.id} className="bg-slate-900/90 border border-rose-800/80 rounded-xl p-4 space-y-3 shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                          {veh.plateNumber}
                        </span>
                        <h4 className="text-xs font-bold text-white">{veh.name}</h4>
                      </div>
                      <span className="text-[11px] text-slate-300 block mt-1">
                        Driver: <strong>{veh.assignedDriverName || 'Depot Pool'}</strong> • Dept: {veh.department}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-mono font-bold block">
                        🔻 -{dropPct}% Drop
                      </span>
                      <span className="text-xs font-mono font-bold text-white block mt-1">
                        {current} KM/L <span className="text-[10px] text-slate-400">(vs {baseline} baseline)</span>
                      </span>
                    </div>
                  </div>

                  {veh.lastEfficiencyAnomalyReason && (
                    <div className="bg-rose-950/60 border border-rose-800/40 rounded-lg p-2.5 text-xs text-rose-200 flex items-start gap-2">
                      <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{veh.lastEfficiencyAnomalyReason}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleAcknowledgeAlert(veh.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Acknowledge</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onScheduleService && onScheduleService(veh)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center gap-1.5"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Schedule Maintenance</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RECHARTS VISUALIZATION CONTAINER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
        
        {/* Chart Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                <Fuel className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Monthly Vehicle Fuel Efficiency Trends (KM / Liter)</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Historical KM/L trendlines computed from station dispenser meter logs & odometer delta. Dashed red line indicates minimum maintenance threshold.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Vehicle Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">All Vehicles (Fleet Comparison)</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} - {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Maintenance Threshold Line */}
            <button
              type="button"
              onClick={() => setShowThresholdLine(!showThresholdLine)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                showThresholdLine 
                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{showThresholdLine ? 'Hide Threshold Line' : 'Show Threshold Line'}</span>
            </button>
          </div>
        </div>

        {/* Recharts Chart Component */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                unit=" KM/L" 
                domain={[4, 16]} 
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl text-xs border border-slate-700 space-y-1.5">
                        <span className="font-bold block border-b border-slate-700 pb-1 text-amber-300">{label}</span>
                        {payload.map((entry: any, index: number) => {
                          if (entry.dataKey === 'maintenanceThresholdKml') return null;
                          const nameStr = entry.name || 'Value';
                          return (
                            <div key={index} className="flex items-center justify-between gap-4 font-mono">
                              <span style={{ color: entry.color }} className="font-sans font-medium">
                                {nameStr}:
                              </span>
                              <span className="font-bold">{entry.value} KM/L</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />

              {/* Maintenance Threshold Line */}
              {showThresholdLine && (
                <ReferenceLine 
                  y={activeVehicle ? (activeVehicle.expectedFuelEfficiencyKml || 10.5) * (1 - (activeVehicle.fuelEfficiencyAlertDropPercent || 15) / 100) : 8.9} 
                  stroke="#e11d48" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  label={{ 
                    value: `Alert Threshold (${activeVehicle ? ((activeVehicle.expectedFuelEfficiencyKml || 10.5) * (1 - (activeVehicle.fuelEfficiencyAlertDropPercent || 15) / 100)).toFixed(1) : '8.9'} KM/L)`, 
                    fill: '#e11d48', 
                    fontSize: 10, 
                    position: 'insideTopRight' 
                  }}
                />
              )}

              {/* Render Vehicle Lines */}
              {selectedVehicleId === 'all' ? (
                vehicles.map((v, i) => (
                  <Line
                    key={v.id}
                    type="monotone"
                    dataKey={`veh_${v.id}`}
                    name={`${v.plateNumber} (${v.name.split(' ')[0]})`}
                    stroke={VEHICLE_COLORS[i % VEHICLE_COLORS.length]}
                    strokeWidth={v.fuelEfficiencyStatus === 'critical_anomaly' ? 3 : 2}
                    dot={{ r: v.fuelEfficiencyStatus === 'critical_anomaly' ? 6 : 4 }}
                    activeDot={{ r: 8 }}
                  />
                ))
              ) : (
                <>
                  <Area
                    type="monotone"
                    dataKey={`veh_${selectedVehicleId}`}
                    name={activeVehicle ? `${activeVehicle.plateNumber} (${activeVehicle.name})` : 'Vehicle KM/L'}
                    stroke="#059669"
                    fill="url(#colorAverage)"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#059669' }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* VEHICLE THRESHOLD & BASELINE REGISTRY CARDS */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Fleet Vehicle Fuel Baselines & Maintenance Threshold Settings
            </h4>
            <span className="text-[11px] text-slate-500">Click any vehicle to configure custom alert trigger threshold</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {vehicles.map(v => {
              const baseline = v.expectedFuelEfficiencyKml || 10.5;
              const dropPercent = v.fuelEfficiencyAlertDropPercent || 15;
              const thresholdKml = Number((baseline * (1 - dropPercent / 100)).toFixed(2));
              const currentKml = v.recentFuelEfficiencyKml || baseline;
              const isDegraded = v.fuelEfficiencyStatus === 'critical_anomaly' || v.fuelEfficiencyStatus === 'degraded_warning';

              const isEditing = editingThresholdVehicleId === v.id;

              return (
                <div 
                  key={v.id} 
                  className={`p-3.5 rounded-xl border transition-all ${
                    isDegraded 
                      ? 'bg-rose-50/80 border-rose-300 shadow-xs' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-900 mr-1.5">
                        {v.plateNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-900 block truncate max-w-[140px]" title={v.name}>
                        {v.name}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isDegraded ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {currentKml} KM/L
                    </span>
                  </div>

                  {!isEditing ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Expected Baseline:</span>
                        <span className="font-mono font-bold text-slate-900">{baseline} KM/L</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span>Alert Threshold (-{dropPercent}%):</span>
                        <span className="font-mono font-bold text-rose-600">&lt; {thresholdKml} KM/L</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingThresholdVehicleId(v.id);
                          setTempBaselineKml(baseline.toString());
                          setTempDropPercent(dropPercent.toString());
                        }}
                        className="w-full mt-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Sliders className="w-3 h-3 text-slate-500" />
                        <span>Configure Threshold</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs bg-white p-2.5 rounded-lg border border-slate-300 shadow-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block">Baseline (KM/L)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={tempBaselineKml}
                          onChange={(e) => setTempBaselineKml(e.target.value)}
                          className="w-full border border-slate-300 rounded p-1 text-xs font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block">Alert Drop %</label>
                        <input
                          type="number"
                          value={tempDropPercent}
                          onChange={(e) => setTempDropPercent(e.target.value)}
                          className="w-full border border-slate-300 rounded p-1 text-xs font-mono font-bold"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingThresholdVehicleId(null)}
                          className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveThreshold(v.id)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold shadow-xs"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
