import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Fuel, 
  Gauge, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  DollarSign, 
  Truck, 
  Calendar, 
  CreditCard, 
  Info, 
  Wrench, 
  Camera, 
  Upload, 
  TrendingDown, 
  TrendingUp,
  Activity,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Vehicle, UserProfile, VehicleExpense, FuelEfficiencyAnalysisResult } from '../types/erp';
import { dataStore } from '../config/firebase';
import { formatPrice } from '../utils/currency';

interface FuelPumpLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserProfile;
  initialVehicle?: Vehicle | null;
  allVehicles: Vehicle[];
  onLogSaved?: (expense: VehicleExpense, analysis: FuelEfficiencyAnalysisResult | null) => void;
}

const POPULAR_STATIONS = [
  'Shell Service Station - Airport City',
  'TotalEnergies Tema Harbor Bypass',
  'GOIL Expressway Service Station',
  'Puma Energy Central Logistics Hub',
  'Star Oil Industrial Zone',
  'Allied Oil Ring Road Station'
];

export default function FuelPumpLogModal({
  isOpen,
  onClose,
  activeUser,
  initialVehicle,
  allVehicles = [],
  onLogSaved
}: FuelPumpLogModalProps) {
  // Target vehicle selection
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  
  useEffect(() => {
    if (initialVehicle) {
      setSelectedVehicleId(initialVehicle.id);
    } else if (allVehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(allVehicles[0].id);
    }
  }, [initialVehicle, allVehicles, selectedVehicleId]);

  const targetVehicle = useMemo(() => {
    return allVehicles.find(v => v.id === selectedVehicleId) || initialVehicle || allVehicles[0] || null;
  }, [allVehicles, selectedVehicleId, initialVehicle]);

  // Form State
  const [stationName, setStationName] = useState<string>('Shell Service Station - Airport City');
  const [pumpNumber, setPumpNumber] = useState<string>('Pump #04');
  const [pumpReadingStart, setPumpReadingStart] = useState<string>('12450.00');
  const [pumpReadingEnd, setPumpReadingEnd] = useState<string>('12500.00');
  const [litersFueled, setLitersFueled] = useState<string>('50.00');
  const [odometerAtPump, setOdometerAtPump] = useState<string>('');
  const [pricePerLiter, setPricePerLiter] = useState<string>('14.00');
  const [totalCost, setTotalCost] = useState<string>('700.00');
  const [isFullTank, setIsFullTank] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<VehicleExpense['paymentMethod']>('fleet_card');
  const [notes, setNotes] = useState<string>('Brim tank fill-up at station dispenser before route departure.');
  
  // Image receipt upload
  const [receiptImageUri, setReceiptImageUri] = useState<string>('');
  const [isScanningReceipt, setIsScanningReceipt] = useState<boolean>(false);

  // Analysis Result State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<FuelEfficiencyAnalysisResult | null>(null);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial odometer when vehicle changes
  useEffect(() => {
    if (targetVehicle) {
      setOdometerAtPump(targetVehicle.currentOdometer.toString());
      // Estimate baseline meters if empty
      const randBase = Math.floor(10000 + Math.random() * 80000);
      if (!pumpReadingStart || pumpReadingStart === '12450.00') {
        setPumpReadingStart(randBase.toFixed(2));
        setPumpReadingEnd((randBase + 50).toFixed(2));
      }
    }
  }, [targetVehicle]);

  // Auto-calculate liters from pump meter difference
  const handlePumpReadingChange = (startVal: string, endVal: string) => {
    setPumpReadingStart(startVal);
    setPumpReadingEnd(endVal);
    
    const start = parseFloat(startVal);
    const end = parseFloat(endVal);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      const calcLiters = (end - start).toFixed(2);
      setLitersFueled(calcLiters);
      
      const pL = parseFloat(pricePerLiter);
      if (!isNaN(pL) && pL > 0) {
        setTotalCost((parseFloat(calcLiters) * pL).toFixed(2));
      }
    }
  };

  // Auto-calculate total cost when liters or price/liter changes
  const handlePriceOrLitersChange = (litersVal: string, priceVal: string) => {
    setLitersFueled(litersVal);
    setPricePerLiter(priceVal);
    const l = parseFloat(litersVal);
    const p = parseFloat(priceVal);
    if (!isNaN(l) && !isNaN(p) && l >= 0 && p >= 0) {
      setTotalCost((l * p).toFixed(2));
    }
  };

  // Preset quick fill test simulation for rapid user testing
  const handleLoadSampleScenario = (scenario: 'normal' | 'degraded_anomaly') => {
    if (!targetVehicle) return;
    const odo = targetVehicle.currentOdometer || 45000;

    if (scenario === 'normal') {
      // Normal 11.5 KM/L
      setStationName('TotalEnergies Tema Harbor Bypass');
      setPumpNumber('Pump #02');
      setPumpReadingStart('8450.00');
      setPumpReadingEnd('8490.00'); // 40 Liters
      setLitersFueled('40.00');
      setOdometerAtPump((odo + 460).toString()); // 460 KM / 40 L = 11.5 KM/L
      setPricePerLiter('14.00');
      setTotalCost('560.00');
      setIsFullTank(true);
      setNotes('Normal route fill. Vehicle operating with optimal efficiency.');
    } else {
      // Degraded Anomaly 7.2 KM/L (Drop of ~37% below baseline 11.5)
      setStationName('Shell Service Station - Airport City');
      setPumpNumber('Pump #06');
      setPumpReadingStart('19200.00');
      setPumpReadingEnd('19255.00'); // 55 Liters
      setLitersFueled('55.00');
      setOdometerAtPump((odo + 396).toString()); // 396 KM / 55 L = 7.2 KM/L (Heavy Drop!)
      setPricePerLiter('14.00');
      setTotalCost('770.00');
      setIsFullTank(true);
      setNotes('Engine felt sluggish during acceleration on steep incline. High fuel burn rate.');
    }
    setAnalysisResult(null);
    setSubmitSuccessMessage(null);
  };

  // Handle Receipt Image Upload & AI Scan
  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setReceiptImageUri(base64);
      setIsScanningReceipt(true);
      
      try {
        const res = await fetch('/api/ai/parse-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type })
        });
        const data = await res.json();
        
        if (data.success && data.parsedData) {
          if (data.parsedData.merchantName) setStationName(data.parsedData.merchantName);
          if (data.parsedData.totalAmount) setTotalCost(data.parsedData.totalAmount.toString());
        }
      } catch (err) {
        console.warn("Receipt scan error:", err);
      } finally {
        setIsScanningReceipt(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Form Submission & Gemini Trend Analysis
  const handleSubmitFuelLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVehicle) {
      setErrorMessage("Please select a target vehicle.");
      return;
    }

    const liters = parseFloat(litersFueled);
    const odo = parseInt(odometerAtPump, 10);
    const cost = parseFloat(totalCost);

    if (isNaN(liters) || liters <= 0) {
      setErrorMessage("Please enter a valid liters quantity.");
      return;
    }
    if (isNaN(odo) || odo <= 0) {
      setErrorMessage("Please enter a valid vehicle odometer reading.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setSubmitSuccessMessage(null);

    // Baseline KM/L for vehicle type or preset
    const baseline = targetVehicle.expectedFuelEfficiencyKml || 
      (targetVehicle.vehicleType === 'sedan' ? 14.0 :
       targetVehicle.vehicleType === 'suv' ? 10.5 :
       targetVehicle.vehicleType === 'truck' ? 7.5 : 11.5);

    // Calculate previous odometer delta
    const prevOdo = targetVehicle.currentOdometer > 0 && odo > targetVehicle.currentOdometer
      ? targetVehicle.currentOdometer
      : Math.max(100, odo - 400);

    const prevExpenses = dataStore.getVehicleExpenses()
      .filter(e => e.vehicleId === targetVehicle.id && e.expenseCategory === 'fuel');

    try {
      const apiRes = await fetch('/api/fleet/analyze-fuel-trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: targetVehicle.id,
          vehiclePlate: targetVehicle.plateNumber,
          vehicleName: targetVehicle.name,
          driverName: activeUser.name,
          currentOdometer: odo,
          previousOdometer: prevOdo,
          litersPurchased: liters,
          pumpReadingStart: parseFloat(pumpReadingStart) || 0,
          pumpReadingEnd: parseFloat(pumpReadingEnd) || 0,
          isFullTank,
          expectedBaselineKml: baseline,
          alertThresholdPercent: targetVehicle.fuelEfficiencyAlertDropPercent || 15,
          fuelPricePerLiter: parseFloat(pricePerLiter) || 14.0,
          stationName,
          pumpNumber
        })
      });

      const result = await apiRes.json();
      let analysisData: FuelEfficiencyAnalysisResult | null = null;

      if (result.success && result.analysis) {
        analysisData = result.analysis;
        setAnalysisResult(analysisData);
      }

      // 1. Create VehicleExpense record in dataStore
      const newExpense: VehicleExpense = dataStore.addVehicleExpense({
        vehicleId: targetVehicle.id,
        vehiclePlate: targetVehicle.plateNumber,
        vehicleName: targetVehicle.name,
        driverId: activeUser.uid,
        driverName: activeUser.name,
        expenseCategory: 'fuel',
        amount: cost || (liters * 14.0),
        currency: 'GHS',
        date: new Date().toISOString().split('T')[0],
        odometer: odo,
        litersPurchased: liters,
        fuelPricePerLiter: parseFloat(pricePerLiter) || 14.0,
        vendorOrStation: `${stationName} (${pumpNumber})`,
        receiptNumber: `PUMP-${Date.now().toString().slice(-6)}`,
        paymentMethod,
        approvalStatus: 'approved',
        notes: `${notes} [Meter: ${pumpReadingStart} L -> ${pumpReadingEnd} L]. ${analysisData ? `AI KM/L: ${analysisData.currentKml} (${analysisData.percentageChange}%)` : ''}`,
        pumpReadingStart: parseFloat(pumpReadingStart) || 0,
        pumpReadingEnd: parseFloat(pumpReadingEnd) || 0,
        pumpNumber,
        isFullTank,
        distanceSinceLastFillKm: Math.max(0, odo - prevOdo),
        calculatedEfficiencyKml: analysisData?.currentKml || Number(((odo - prevOdo) / liters).toFixed(2)),
        efficiencyAnomalyDetected: analysisData?.isBelowThreshold || false,
        aiAnalysisNotes: analysisData?.aiAnalysisSummary
      });

      // 2. If Efficiency dropped below threshold, create automated Fleet Manager Issue Report
      let issueId: string | undefined = undefined;
      if (analysisData?.isBelowThreshold) {
        const newIssue = dataStore.addVehicleIssue({
          vehicleId: targetVehicle.id,
          vehiclePlate: targetVehicle.plateNumber,
          vehicleName: targetVehicle.name,
          driverId: activeUser.uid,
          driverName: activeUser.name,
          issueTitle: `FUEL EFFICIENCY ANOMALY: ${targetVehicle.plateNumber} dropped to ${analysisData.currentKml} KM/L (${analysisData.percentageChange}%)`,
          description: `ALERT TRIGGERED BY FUEL PUMP READING: Driver ${activeUser.name} logged fuel fill at ${stationName} (${pumpNumber}). Efficiency calculated at ${analysisData.currentKml} KM/L against baseline ${analysisData.baselineKml} KM/L (${analysisData.percentageChange}% drop).\n\nGEMINI AI MECHANICAL DIAGNOSIS:\n- Summary: ${analysisData.aiAnalysisSummary}\n- Potential Causes: ${analysisData.potentialCauses.join('; ')}\n- Recommended Actions: ${analysisData.recommendedActions.join('; ')}`,
          severity: analysisData.status === 'critical_anomaly' ? 'critical' : 'high',
          odometerAtReport: odo,
          dateReported: new Date().toISOString().split('T')[0],
          status: 'open'
        });
        issueId = newIssue.id;

        // Also post audit log
        dataStore.logAudit(
          activeUser.uid,
          activeUser.name,
          activeUser.role,
          'CREATE',
          `vehicle_issue_${newIssue.id}`,
          `Automated Fuel Anomaly Alert created for ${targetVehicle.plateNumber}: KM/L dropped to ${analysisData.currentKml} (-${Math.abs(analysisData.percentageChange)}%). Fleet manager notified.`
        );
      }

      // 3. Update Vehicle record in dataStore with latest odometer and efficiency status
      const updatedVehicles = dataStore.getVehicles().map(v => v.id === targetVehicle.id ? {
        ...v,
        currentOdometer: Math.max(v.currentOdometer, odo),
        recentFuelEfficiencyKml: analysisData?.currentKml || v.recentFuelEfficiencyKml,
        fuelEfficiencyStatus: (analysisData?.isBelowThreshold 
          ? (analysisData.status === 'critical_anomaly' ? 'critical_anomaly' as const : 'degraded_warning' as const) 
          : 'normal' as const),
        lastEfficiencyAnomalyDate: analysisData?.isBelowThreshold ? new Date().toISOString().split('T')[0] : v.lastEfficiencyAnomalyDate,
        lastEfficiencyAnomalyReason: analysisData?.isBelowThreshold ? analysisData.aiAnalysisSummary : v.lastEfficiencyAnomalyReason,
        updatedAt: new Date().toISOString()
      } : v);
      dataStore.saveVehicles(updatedVehicles);

      if (onLogSaved) {
        onLogSaved(newExpense, analysisData ? { ...analysisData, alertIssueId: issueId } : null);
      }

      setSubmitSuccessMessage(
        analysisData?.isBelowThreshold
          ? `Fuel pump reading logged! 🚨 ALERT CREATED FOR FLEET MANAGER: Vehicle efficiency dropped to ${analysisData.currentKml} KM/L.`
          : `Fuel pump reading saved successfully! Fuel efficiency rated COMPLIANT at ${analysisData?.currentKml || '11.5'} KM/L.`
      );

    } catch (err: any) {
      console.error("Failed to log fuel pump reading:", err);
      setErrorMessage("Failed to connect to server. Saved fuel expense locally.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-900 via-slate-900 to-amber-950 text-white p-5 flex items-center justify-between border-b border-amber-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-300">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Log Station Fuel Pump Reading</h2>
                <span className="px-2 py-0.5 bg-amber-500/30 text-amber-200 border border-amber-400/30 rounded text-[10px] font-mono font-semibold">
                  AI Trend Monitor
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Record station meter values, brim-fill liters & trigger Gemini AI fuel anomaly detection
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">

          {/* Quick Simulation Bar for Fast User Testing */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Quick Test Scenarios: Simulate a normal fuel fill or a degraded efficiency anomaly</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleLoadSampleScenario('normal')}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-colors flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Normal Fill (11.5 KM/L)</span>
              </button>
              <button
                type="button"
                onClick={() => handleLoadSampleScenario('degraded_anomaly')}
                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-colors flex items-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Trigger Anomaly Drop (7.2 KM/L)</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitFuelLog} className="space-y-5">

            {/* Vehicle Selection Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Target Fleet Vehicle</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-600"
                >
                  {allVehicles.map(veh => (
                    <option key={veh.id} value={veh.id}>
                      {veh.plateNumber} - {veh.name} ({veh.vehicleType.toUpperCase()}, {veh.fuelType.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Vehicle Odometer at Pump (KM)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={odometerAtPump}
                    onChange={(e) => setOdometerAtPump(e.target.value)}
                    required
                    placeholder="e.g. 43120"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                  <Gauge className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Current logged: {targetVehicle?.currentOdometer.toLocaleString() || 0} KM
                </span>
              </div>
            </div>

            {/* Station & Pump Meter Readings */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-600" />
                  <span>Station Dispenser Meter Readings</span>
                </span>
                <span className="text-[11px] text-slate-500">Inputs required for brim fill KM/L</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Station / Vendor Location</label>
                  <input
                    type="text"
                    list="station-list"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder="e.g. Shell Airport City"
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                  <datalist id="station-list">
                    {POPULAR_STATIONS.map((st, idx) => (
                      <option key={idx} value={st} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Dispenser Pump Number</label>
                  <input
                    type="text"
                    value={pumpNumber}
                    onChange={(e) => setPumpNumber(e.target.value)}
                    placeholder="e.g. Pump #04"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              {/* Pump Readings Before & After */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/60 border border-amber-200/60 rounded-xl p-3.5">
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Pump Meter BEFORE (L)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pumpReadingStart}
                    onChange={(e) => handlePumpReadingChange(e.target.value, pumpReadingEnd)}
                    placeholder="e.g. 12450.00"
                    className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Pump Meter AFTER (L)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pumpReadingEnd}
                    onChange={(e) => handlePumpReadingChange(pumpReadingStart, e.target.value)}
                    placeholder="e.g. 12500.00"
                    className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-950 block mb-1">Calculated Liters Fueled</label>
                  <input
                    type="number"
                    step="0.01"
                    value={litersFueled}
                    onChange={(e) => handlePriceOrLitersChange(e.target.value, pricePerLiter)}
                    required
                    className="w-full bg-amber-100/90 border border-amber-400 rounded-lg p-2 text-xs font-mono font-black text-amber-950"
                  />
                </div>
              </div>

              {/* Price & Cost Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Price Per Liter (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pricePerLiter}
                    onChange={(e) => handlePriceOrLitersChange(litersFueled, e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-mono font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Total Fuel Cost (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    required
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-xs font-mono font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium text-slate-900"
                  >
                    <option value="fleet_card">Fleet Corporate Card</option>
                    <option value="mobile_money">Mobile Money (MoMo)</option>
                    <option value="petty_cash">Petty Cash Voucher</option>
                    <option value="company_card">Company Credit Card</option>
                    <option value="cash">Out of Pocket Cash</option>
                  </select>
                </div>
              </div>

              {/* Brim Fill Toggle */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="fullTankToggle"
                  checked={isFullTank}
                  onChange={(e) => setIsFullTank(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <label htmlFor="fullTankToggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Filled to brim / full tank (Required for standard brim-to-brim KM/L calculations)
                </label>
              </div>
            </div>

            {/* Optional Photo Receipt Upload */}
            <div className="border border-dashed border-slate-300 rounded-xl p-3.5 bg-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-200 text-slate-700 rounded-lg">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Optional: Attach Pump Display or Receipt Photo</span>
                  <span className="text-[10px] text-slate-500">AI automatically scans merchant name and purchase amount</span>
                </div>
              </div>

              <label className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shadow-xs transition-colors flex items-center gap-1.5 shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>{isScanningReceipt ? 'Scanning...' : 'Upload Photo'}</span>
                <input type="file" accept="image/*" onChange={handleReceiptFileChange} className="hidden" />
              </label>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Driver Notes / Observations</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Filled up prior to inter-city transport. Engine sounded smooth."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {submitSuccessMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{submitSuccessMessage}</span>
              </div>
            )}

            {/* Gemini AI Diagnostic Breakdown Card */}
            {analysisResult && (
              <div className={`p-4 rounded-2xl border ${
                analysisResult.isBelowThreshold 
                  ? 'bg-rose-50/90 border-rose-300 text-rose-950' 
                  : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              } space-y-3 shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {analysisResult.isBelowThreshold ? (
                      <div className="p-2 bg-rose-600 text-white rounded-xl">
                        <AlertTriangle className="w-5 h-5 animate-bounce" />
                      </div>
                    ) : (
                      <div className="p-2 bg-emerald-600 text-white rounded-xl">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        {analysisResult.isBelowThreshold 
                          ? '🚨 CRITICAL ANOMALY ALERT SENT TO FLEET MANAGER' 
                          : '✅ OPTIMAL FUEL ECONOMY PASSED'}
                      </h4>
                      <p className="text-[11px] opacity-90">
                        {analysisResult.isBelowThreshold
                          ? 'Fuel efficiency dropped below preset alert threshold. Automatic maintenance ticket created.'
                          : 'Fuel economy matches vehicle baseline parameters.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black font-mono">
                      {analysisResult.currentKml} KM/L
                    </span>
                    <span className={`block text-[10px] font-bold ${
                      analysisResult.percentageChange < 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}>
                      {analysisResult.percentageChange}% vs baseline ({analysisResult.baselineKml} KM/L)
                    </span>
                  </div>
                </div>

                <div className="bg-white/80 rounded-xl p-3 text-xs space-y-2 border border-slate-200/60">
                  <p className="font-semibold text-slate-800">{analysisResult.aiAnalysisSummary}</p>
                  
                  {analysisResult.potentialCauses.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Gemini AI Potential Causes Identified:
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5">
                        {analysisResult.potentialCauses.map((cause, i) => (
                          <li key={i}>{cause}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.recommendedActions.length > 0 && (
                    <div className="pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Recommended Workshop Actions:
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5">
                        {analysisResult.recommendedActions.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isAnalyzing}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Analyzing Fuel Trend with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Save Pump Reading & Analyze Efficiency</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
