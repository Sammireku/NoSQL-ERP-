import React, { useState, useEffect, useMemo } from 'react';
import { 
  Compass, 
  MapPin, 
  Navigation, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  Fuel, 
  Coins, 
  FileText, 
  Plus, 
  Play, 
  Square, 
  CheckSquare, 
  ArrowRight, 
  ShieldCheck, 
  Calendar, 
  Wrench, 
  Download, 
  UserCheck, 
  Sparkles,
  Phone,
  AlertCircle,
  HelpCircle,
  Activity,
  ChevronRight,
  Info,
  PenTool,
  Camera,
  Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { dataStore } from '../config/firebase';
import { 
  UserProfile, 
  Vehicle, 
  VehicleTrip, 
  VehicleExpense, 
  VehicleIssueReport,
  TripPurpose,
  VehicleMaintenance,
  DriverLicense
} from '../types/erp';
import { formatPrice } from '../utils/currency';
import DocumentOcrModal from './DocumentOcrModal';
import JointServiceSignOffModal from './JointServiceSignOffModal';
import FuelPumpLogModal from './FuelPumpLogModal';

interface DriverTripLoggerProps {
  activeUser: UserProfile;
  onNavigateToFleet?: () => void;
}

export default function DriverTripLogger({ activeUser, onNavigateToFleet }: DriverTripLoggerProps) {
  // Datasets from dataStore
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => dataStore.getVehicles());
  const [trips, setTrips] = useState<VehicleTrip[]>(() => dataStore.getVehicleTrips());
  const [expenses, setExpenses] = useState<VehicleExpense[]>(() => dataStore.getVehicleExpenses());
  const [issues, setIssues] = useState<VehicleIssueReport[]>(() => dataStore.getVehicleIssues());
  const [maintenance, setMaintenance] = useState<VehicleMaintenance[]>(() => dataStore.getVehicleMaintenance());
  const [driverLicenses, setDriverLicenses] = useState<DriverLicense[]>(() => dataStore.getDriverLicenses());

  // Modals
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrDocType, setOcrDocType] = useState<'roadworthiness' | 'insurance' | 'license' | 'auto'>('license');
  const [isJointServiceModalOpen, setIsJointServiceModalOpen] = useState(false);
  const [isFuelPumpModalOpen, setIsFuelPumpModalOpen] = useState(false);

  // Subscribe to changes
  useEffect(() => {
    const unsubVeh = dataStore.subscribeToCollection('vehicles', () => {
      setVehicles(dataStore.getVehicles());
    });
    const unsubTrips = dataStore.subscribeToCollection('vehicle_trips', () => {
      setTrips(dataStore.getVehicleTrips());
    });
    const unsubExp = dataStore.subscribeToCollection('vehicle_expenses', () => {
      setExpenses(dataStore.getVehicleExpenses());
    });
    const unsubIssues = dataStore.subscribeToCollection('vehicle_issues', () => {
      setIssues(dataStore.getVehicleIssues());
    });
    const unsubMaint = dataStore.subscribeToCollection('vehicle_maintenance', () => {
      setMaintenance(dataStore.getVehicleMaintenance());
    });
    const unsubLic = dataStore.subscribeToCollection('driver_licenses', () => {
      setDriverLicenses(dataStore.getDriverLicenses());
    });

    return () => {
      unsubVeh();
      unsubTrips();
      unsubExp();
      unsubIssues();
      unsubMaint();
      unsubLic();
    };
  }, []);

  // Active driver's license
  const myLicense = useMemo(() => {
    return driverLicenses.find(lic => lic.driverId === activeUser.uid || lic.driverEmail === activeUser.email) || driverLicenses[0] || null;
  }, [driverLicenses, activeUser]);

  // Determine active driver assigned vehicle
  const assignedVehicle = useMemo(() => {
    const directMatch = vehicles.find(v => v.assignedDriverId === activeUser.uid);
    if (directMatch) return directMatch;
    // Fallback: match by name or first available vehicle
    const nameMatch = vehicles.find(v => v.assignedDriverName?.toLowerCase().includes(activeUser.name.toLowerCase()));
    if (nameMatch) return nameMatch;
    return vehicles[0] || null;
  }, [vehicles, activeUser]);

  // Selected vehicle for operations (defaults to assigned vehicle)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  useEffect(() => {
    if (assignedVehicle && !selectedVehicleId) {
      setSelectedVehicleId(assignedVehicle.id);
    }
  }, [assignedVehicle, selectedVehicleId]);

  const activeVehicle = useMemo(() => {
    return vehicles.find(v => v.id === selectedVehicleId) || assignedVehicle || vehicles[0];
  }, [vehicles, selectedVehicleId, assignedVehicle]);

  // Current Active Trip (status === 'active' for this driver or this vehicle)
  const activeTrip = useMemo(() => {
    return trips.find(t => t.status === 'active' && (t.driverId === activeUser.uid || t.vehicleId === activeVehicle?.id));
  }, [trips, activeUser, activeVehicle]);

  // Tabs for Driver Interface
  const [activeDriverTab, setActiveDriverTab] = useState<'logger' | 'fuel_expense' | 'report_issue' | 'service' | 'license' | 'history'>('logger');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // -------------------------------------------------------------
  // START TRIP STATE & HANDLERS
  // -------------------------------------------------------------
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [startOdometerInput, setStartOdometerInput] = useState<number>(0);
  const [startLocationInput, setStartLocationInput] = useState<string>('Accra Central Depot - Gate B');
  const [destinationLocationInput, setDestinationLocationInput] = useState<string>('');
  const [purposeInput, setPurposeInput] = useState<TripPurpose>('client_delivery');
  const [purposeNotesInput, setPurposeNotesInput] = useState<string>('');
  const [passengerCargoInput, setPassengerCargoInput] = useState<string>('');
  const [waybillRefInput, setWaybillRefInput] = useState<string>('');
  const [preTripTires, setPreTripTires] = useState(true);
  const [preTripOil, setPreTripOil] = useState(true);
  const [preTripBrakes, setPreTripBrakes] = useState(true);
  const [preTripLights, setPreTripLights] = useState(true);

  // Initialize start odometer when modal opens or vehicle changes
  useEffect(() => {
    if (activeVehicle) {
      setStartOdometerInput(activeVehicle.currentOdometer);
    }
  }, [activeVehicle, isStartModalOpen]);

  const handleStartTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle) return;

    if (!startLocationInput.trim()) {
      showToast('⚠️ Please enter a starting location.');
      return;
    }
    if (!destinationLocationInput.trim()) {
      showToast('⚠️ Please enter an expected destination.');
      return;
    }
    if (startOdometerInput < 0) {
      showToast('⚠️ Starting odometer must be a positive number.');
      return;
    }

    const newTrip = dataStore.addVehicleTrip({
      vehicleId: activeVehicle.id,
      vehiclePlate: activeVehicle.plateNumber,
      vehicleName: activeVehicle.name,
      driverId: activeUser.uid,
      driverName: activeUser.name,
      driverEmail: activeUser.email,
      startOdometer: Number(startOdometerInput),
      startLocation: startLocationInput.trim(),
      destinationLocation: destinationLocationInput.trim(),
      purpose: purposeInput,
      purposeNotes: purposeNotesInput.trim() || `Journey to ${destinationLocationInput}`,
      passengerOrCargo: passengerCargoInput.trim() || undefined,
      clientOrOrderRef: waybillRefInput.trim() || undefined,
      departureTime: new Date().toISOString(),
      status: 'active',
      preTripInspectionPassed: preTripTires && preTripOil && preTripBrakes && preTripLights
    });

    setIsStartModalOpen(false);
    showToast(`✓ Trip started successfully for ${activeVehicle.plateNumber}! Drive safely.`);
  };

  // -------------------------------------------------------------
  // COMPLETE TRIP STATE & HANDLERS
  // -------------------------------------------------------------
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [endOdometerInput, setEndOdometerInput] = useState<number>(0);
  const [actualDestinationInput, setActualDestinationInput] = useState<string>('');
  const [postTripNotesInput, setPostTripNotesInput] = useState<string>('');
  const [fuelAddedLitersInput, setFuelAddedLitersInput] = useState<string>('');
  const [fuelCostInput, setFuelCostInput] = useState<string>('');
  const [tollFeesInput, setTollFeesInput] = useState<string>('');

  useEffect(() => {
    if (activeTrip) {
      setEndOdometerInput(activeTrip.startOdometer + 15);
      setActualDestinationInput(activeTrip.destinationLocation);
    }
  }, [activeTrip, isCompleteModalOpen]);

  const handleCompleteTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;

    if (endOdometerInput < activeTrip.startOdometer) {
      showToast(`⚠️ Ending odometer (${endOdometerInput} km) cannot be less than starting odometer (${activeTrip.startOdometer} km).`);
      return;
    }
    if (!actualDestinationInput.trim()) {
      showToast('⚠️ Please confirm arrival destination.');
      return;
    }

    const fuelLiters = fuelAddedLitersInput ? Number(fuelAddedLitersInput) : undefined;
    const fuelCost = fuelCostInput ? Number(fuelCostInput) : undefined;
    const tolls = tollFeesInput ? Number(tollFeesInput) : undefined;

    dataStore.completeVehicleTrip(
      activeTrip.id,
      Number(endOdometerInput),
      actualDestinationInput.trim(),
      new Date().toISOString(),
      postTripNotesInput.trim() || 'Vehicle returned in normal operating condition.',
      fuelLiters,
      fuelCost,
      tolls
    );

    // If fuel was purchased, also record into vehicle expenses automatically
    if (fuelCost && fuelCost > 0) {
      dataStore.addVehicleExpense({
        vehicleId: activeTrip.vehicleId,
        vehiclePlate: activeTrip.vehiclePlate,
        vehicleName: activeTrip.vehicleName,
        driverId: activeUser.uid,
        driverName: activeUser.name,
        expenseCategory: 'fuel',
        amount: fuelCost,
        currency: 'GHS',
        date: new Date().toISOString().split('T')[0],
        odometer: Number(endOdometerInput),
        litersPurchased: fuelLiters,
        vendorOrStation: 'On-route fueling station',
        paymentMethod: 'fleet_card',
        approvalStatus: 'approved',
        notes: `Logged automatically with completed trip ${activeTrip.id}`,
        linkedTripId: activeTrip.id
      });
    }

    // If tolls were paid, record into vehicle expenses
    if (tolls && tolls > 0) {
      dataStore.addVehicleExpense({
        vehicleId: activeTrip.vehicleId,
        vehiclePlate: activeTrip.vehiclePlate,
        vehicleName: activeTrip.vehicleName,
        driverId: activeUser.uid,
        driverName: activeUser.name,
        expenseCategory: 'toll',
        amount: tolls,
        currency: 'GHS',
        date: new Date().toISOString().split('T')[0],
        vendorOrStation: 'Highway Express Toll Plaza',
        paymentMethod: 'mobile_money',
        approvalStatus: 'approved',
        notes: `Tolls logged with completed trip ${activeTrip.id}`,
        linkedTripId: activeTrip.id
      });
    }

    setIsCompleteModalOpen(false);
    showToast(`✓ Trip completed! Logged ${Math.max(0, endOdometerInput - activeTrip.startOdometer)} km traveled.`);
  };

  // -------------------------------------------------------------
  // QUICK FUEL & EXPENSE LOGGER
  // -------------------------------------------------------------
  const [expenseCategory, setExpenseCategory] = useState<VehicleExpense['expenseCategory']>('fuel');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseStation, setExpenseStation] = useState<string>('');
  const [expenseReceiptNo, setExpenseReceiptNo] = useState<string>('');
  const [expenseLiters, setExpenseLiters] = useState<string>('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<VehicleExpense['paymentMethod']>('fleet_card');
  const [expenseNotes, setExpenseNotes] = useState<string>('');

  const handleLogExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle) return;
    const amountVal = parseFloat(expenseAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('⚠️ Please enter a valid expense amount.');
      return;
    }

    dataStore.addVehicleExpense({
      vehicleId: activeVehicle.id,
      vehiclePlate: activeVehicle.plateNumber,
      vehicleName: activeVehicle.name,
      driverId: activeUser.uid,
      driverName: activeUser.name,
      expenseCategory,
      amount: amountVal,
      currency: 'GHS',
      date: new Date().toISOString().split('T')[0],
      odometer: activeVehicle.currentOdometer,
      litersPurchased: expenseLiters ? parseFloat(expenseLiters) : undefined,
      vendorOrStation: expenseStation.trim() || 'Service Station',
      receiptNumber: expenseReceiptNo.trim() || 'VCH-' + Math.floor(100000 + Math.random() * 900000),
      paymentMethod: expensePaymentMethod,
      approvalStatus: 'approved',
      notes: expenseNotes.trim() || undefined
    });

    setExpenseAmount('');
    setExpenseStation('');
    setExpenseReceiptNo('');
    setExpenseLiters('');
    setExpenseNotes('');
    showToast(`✓ Logged ${expenseCategory.toUpperCase()} expense of GHS ${amountVal.toFixed(2)}.`);
  };

  // -------------------------------------------------------------
  // REPORT VEHICLE FAULT / ISSUE
  // -------------------------------------------------------------
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<VehicleIssueReport['severity']>('medium');

  const handleReportIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle) return;
    if (!issueTitle.trim() || !issueDescription.trim()) {
      showToast('⚠️ Please enter both a title and details of the vehicle issue.');
      return;
    }

    dataStore.addVehicleIssue({
      vehicleId: activeVehicle.id,
      vehiclePlate: activeVehicle.plateNumber,
      vehicleName: activeVehicle.name,
      driverId: activeUser.uid,
      driverName: activeUser.name,
      issueTitle: issueTitle.trim(),
      description: issueDescription.trim(),
      severity: issueSeverity,
      odometerAtReport: activeVehicle.currentOdometer,
      dateReported: new Date().toISOString(),
      status: 'open'
    });

    setIssueTitle('');
    setIssueDescription('');
    showToast(`✓ Fault ticket submitted to Fleet Management for ${activeVehicle.plateNumber}.`);
  };

  // -------------------------------------------------------------
  // DRIVER STATS & HISTORY
  // -------------------------------------------------------------
  const myTrips = useMemo(() => {
    return trips.filter(t => t.driverId === activeUser.uid || t.driverName.toLowerCase() === activeUser.name.toLowerCase());
  }, [trips, activeUser]);

  const driverStats = useMemo(() => {
    const totalKm = myTrips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
    const completedCount = myTrips.filter(t => t.status === 'completed').length;
    const totalFuelSpent = expenses
      .filter(e => e.driverId === activeUser.uid)
      .reduce((acc, e) => acc + e.amount, 0);
    return { totalKm, completedCount, totalFuelSpent };
  }, [myTrips, expenses, activeUser]);

  // -------------------------------------------------------------
  // PDF TRIP SHEET EXPORT
  // -------------------------------------------------------------
  const handleExportTripSheetPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Header banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 36, 'F');

    doc.setFillColor(232, 90, 28); // coral accent
    doc.rect(0, 36, pageWidth, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('OFFICIAL DRIVER TRIP & MILEAGE LOGBOOK', margin, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Driver: ${activeUser.name} (${activeUser.email})  •  Department: Logistics & Transport`, margin, 24);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-GB')}  •  Tumi Enterprise ERP Fleet Systems`, margin, 30);

    let y = 48;

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 22, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DRIVER PERFORMANCE & LOGISTICS SUMMARY', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Trips Completed: ${driverStats.completedCount}`, margin + 4, y + 13);
    doc.text(`Total Distance Driven: ${driverStats.totalKm.toLocaleString()} KM`, margin + 65, y + 13);
    doc.text(`Assigned Vehicle: ${activeVehicle?.plateNumber || 'Fleet Vehicle'} (${activeVehicle?.name || ''})`, margin + 4, y + 18);
    doc.text(`Recorded Road Expenses: GHS ${driverStats.totalFuelSpent.toFixed(2)}`, margin + 125, y + 13);

    y += 30;

    // Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DATE / REF', margin + 2, y + 5);
    doc.text('VEHICLE', margin + 30, y + 5);
    doc.text('ORIGIN & DESTINATION', margin + 58, y + 5);
    doc.text('PURPOSE', margin + 115, y + 5);
    doc.text('START', margin + 145, y + 5, { align: 'right' });
    doc.text('END', margin + 160, y + 5, { align: 'right' });
    doc.text('KM', margin + (pageWidth - (margin * 2)) - 2, y + 5, { align: 'right' });

    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    myTrips.slice(0, 20).forEach((t, idx) => {
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');

      doc.setTextColor(100, 116, 139);
      const dateStr = new Date(t.departureTime).toLocaleDateString('en-GB');
      doc.text(dateStr, margin + 2, y + 4.8);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(t.vehiclePlate, margin + 30, y + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const routeText = `${t.startLocation} → ${t.destinationLocation}`;
      doc.text(routeText.substring(0, 36), margin + 58, y + 4.8);

      doc.text((t.purpose || 'Delivery').replace(/_/g, ' '), margin + 115, y + 4.8);
      doc.text(String(t.startOdometer), margin + 145, y + 4.8, { align: 'right' });
      doc.text(String(t.endOdometer || '-'), margin + 160, y + 4.8, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(String(t.distanceKm || 0), margin + (pageWidth - (margin * 2)) - 2, y + 4.8, { align: 'right' });

      y += 7;
    });

    // Signature Area
    const sigY = 250;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, sigY, margin + 55, sigY);
    doc.line(pageWidth - margin - 55, sigY, pageWidth - margin, sigY);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Driver Signature & Date', margin + 4, sigY + 5);
    doc.text('Fleet Manager / Transport Supervisor', pageWidth - margin - 52, sigY + 5);

    doc.save(`Driver_TripSheet_${activeUser.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('✓ Official Driver Trip Sheet PDF downloaded!');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER: DRIVER CONSOLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Driver Trip & Mileage Logger</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Driver Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Welcome back, <strong>{activeUser.name}</strong> ({activeUser.jobTitle || 'Logistics Driver'}) • Track journeys, odometer, fuel, and road expenses in real time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsFuelPumpModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md"
          >
            <Fuel className="w-4 h-4 text-slate-950" />
            <span>Log Station Fuel Pump Reading</span>
          </button>
          <button
            type="button"
            onClick={handleExportTripSheetPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Download Trip Sheet (PDF)</span>
          </button>
          {onNavigateToFleet && (
            <button
              type="button"
              onClick={onNavigateToFleet}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors border border-indigo-200"
            >
              <Truck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Full Fleet Overview</span>
            </button>
          )}
        </div>
      </div>

      {/* ACTIVE VEHICLE SELECTOR & LIVE STATUS CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Active Vehicle Details */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg border border-slate-700 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-800 text-indigo-400 rounded-xl border border-slate-700">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Assigned Company Vehicle</span>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{activeVehicle?.name || 'No Vehicle Assigned'}</h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-400 text-slate-900 font-extrabold">
                    {activeVehicle?.plateNumber || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicle Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2.5 py-1.5 rounded-xl">
              <span className="text-[11px] text-slate-400">Switch:</span>
              <select
                value={activeVehicle?.id || ''}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id} className="text-slate-900 bg-white">
                    {v.plateNumber} - {v.name} ({v.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Current Odometer</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-mono font-extrabold text-white">
                  {(activeVehicle?.currentOdometer || 0).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">KM</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Fuel Gauge</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      (activeVehicle?.fuelLevelPercent || 0) < 25 ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${activeVehicle?.fuelLevelPercent || 50}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {activeVehicle?.fuelLevelPercent || 50}%
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Vehicle Status</span>
              <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                activeVehicle?.status === 'available' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                activeVehicle?.status === 'on_trip' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse' :
                activeVehicle?.status === 'in_service' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {activeVehicle?.status?.replace('_', ' ') || 'Unknown'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Current Location</span>
              <span className="text-xs text-slate-200 font-medium truncate block mt-0.5" title={activeVehicle?.currentLocation}>
                {activeVehicle?.currentLocation || 'Depot'}
              </span>
            </div>
          </div>

          {/* Statutory Expiry Reminder Banner if within 30 days */}
          {activeVehicle && (() => {
            const roadDays = activeVehicle.roadworthinessExpiryDate 
              ? Math.ceil((new Date(activeVehicle.roadworthinessExpiryDate).getTime() - Date.now()) / 86400000)
              : null;
            const insDays = activeVehicle.insuranceExpiryDate 
              ? Math.ceil((new Date(activeVehicle.insuranceExpiryDate).getTime() - Date.now()) / 86400000)
              : null;
            const isRoadUrgent = roadDays !== null && roadDays <= 30;
            const isInsUrgent = insDays !== null && insDays <= 30;

            if (!isRoadUrgent && !isInsUrgent) return null;

            return (
              <div className="mt-4 pt-3 border-t border-slate-700/80 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-300">Statutory 30-Day Expiry Notice:</span>{' '}
                    <span className="text-slate-200">
                      {isRoadUrgent && `Roadworthiness (${roadDays <= 0 ? 'Expired' : `${roadDays}d left`})`}
                      {isRoadUrgent && isInsUrgent && ' & '}
                      {isInsUrgent && `Insurance (${insDays <= 0 ? 'Expired' : `${insDays}d left`})`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOcrDocType(isRoadUrgent ? 'roadworthiness' : 'insurance');
                    setIsOcrModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-colors self-start sm:self-auto shrink-0"
                >
                  <Camera className="w-3 h-3" />
                  <span>Scan New Paper / Sticker</span>
                </button>
              </div>
            );
          })()}
        </div>

        {/* Right: Driver Personal Stats */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver Duty Summary</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                On Duty
              </span>
            </div>

            <div className="space-y-3 mt-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Total Distance Logged:</span>
                <span className="font-mono font-bold text-slate-900">{driverStats.totalKm.toLocaleString()} KM</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Completed Trips:</span>
                <span className="font-mono font-bold text-slate-900">{driverStats.completedCount} Journeys</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Fuel & Road Expenses:</span>
                <span className="font-mono font-bold text-slate-900">{formatPrice(driverStats.totalFuelSpent)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              License:{' '}
              {myLicense ? (
                <strong className={new Date(myLicense.expiryDate).getTime() - Date.now() <= 30 * 86400000 ? 'text-amber-600' : 'text-emerald-700'}>
                  {myLicense.licenseClass}
                </strong>
              ) : 'Verified on File'}
            </span>
            <button
              type="button"
              onClick={() => setActiveDriverTab('license')}
              className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
            >
              <span>View License</span>
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            </button>
          </div>
        </div>
      </div>

      {/* DRIVER OPERATIONS NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveDriverTab('logger')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeDriverTab === 'logger'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Trip & Mileage Logger</span>
          {activeTrip && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-1" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveDriverTab('fuel_expense')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeDriverTab === 'fuel_expense'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Fuel className="w-4 h-4" />
          <span>Log Fuel & Tolls</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDriverTab('service')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeDriverTab === 'service'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Workshop Servicing & Sign-Off</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDriverTab('license')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeDriverTab === 'license'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>My Driver's License</span>
          {myLicense && (new Date(myLicense.expiryDate).getTime() - Date.now() <= 30 * 86400000) && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-1" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveDriverTab('report_issue')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeDriverTab === 'report_issue'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Report Vehicle Issue</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDriverTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeDriverTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Trip Logbook ({myTrips.length})</span>
        </button>
      </div>

      {/* TAB 1: TRIP LOGGER (LIVE ACTIVE TRIP OR START NEW TRIP) */}
      {activeDriverTab === 'logger' && (
        <div className="space-y-6">
          {/* Active Trip Banner or Start Trigger */}
          {activeTrip ? (
            <div className="bg-white border-2 border-indigo-500 rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Active Journey In Progress</span>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-900 text-amber-400 font-mono text-xs font-extrabold rounded">
                      {activeTrip.vehiclePlate}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">•</span>
                    <span className="text-xs font-bold text-slate-700 capitalize">
                      Purpose: {activeTrip.purpose.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>{activeTrip.startLocation}</span>
                    <ArrowRight className="w-4 h-4 text-indigo-600" />
                    <span className="text-indigo-600">{activeTrip.destinationLocation}</span>
                  </h3>

                  <p className="text-xs text-slate-500">
                    Departed at: <strong>{new Date(activeTrip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> ({new Date(activeTrip.departureTime).toLocaleDateString()})
                  </p>

                  {activeTrip.passengerOrCargo && (
                    <div className="inline-block bg-slate-50 border border-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-lg">
                      Cargo / Manifest: <strong>{activeTrip.passengerOrCargo}</strong>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col items-center justify-center min-w-[200px]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Starting Odometer</span>
                  <span className="text-2xl font-mono font-extrabold text-slate-900">
                    {activeTrip.startOdometer.toLocaleString()} <span className="text-xs font-normal text-slate-500">KM</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCompleteModalOpen(true)}
                    className="mt-3 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Journey & Log Mileage</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
                  Ready for Dispatch
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold">Ready to begin a journey?</h3>
                <p className="text-xs text-indigo-100 leading-relaxed">
                  Log vehicle departure mileage, starting location, and travel purpose. The system updates the central fleet dashboard and synchronizes maintenance and fuel accounting automatically.
                </p>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIsStartModalOpen(true)}
                  className="px-6 py-3.5 bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold text-sm rounded-xl shadow-xl flex items-center gap-2 transition-all transform hover:scale-105 cursor-pointer"
                >
                  <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  <span>Start New Journey</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Guidance Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">1. Pre-Trip Inspection</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Inspect tire pressure, coolant, and engine oil before starting each trip to guarantee safety and compliance.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                <Navigation className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">2. Record Precise Odometer</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Always log exact start and arrival kilometer readings to calculate accurate logistics operational costs.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                <Fuel className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">3. Save Fuel & Toll Receipts</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Record receipts on the fly for instantaneous reimbursement via Petty Cash or Fleet Card reconciliation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FUEL & ROAD EXPENSE LOGGER */}
      {activeDriverTab === 'fuel_expense' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-2xl mx-auto">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200 mb-5">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Record Fuel Fill-Up or Road Toll</h3>
              <p className="text-xs text-slate-500">
                Log road expenditures for vehicle <strong>{activeVehicle?.plateNumber}</strong>
              </p>
            </div>
          </div>

          <form onSubmit={handleLogExpense} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Expense Type</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-600"
                >
                  <option value="fuel">Fuel Fill-up (Petrol / Diesel)</option>
                  <option value="toll">Highway Toll Gate Fee</option>
                  <option value="parking">Commercial Parking Fee</option>
                  <option value="car_wash">Vehicle Wash & Detailing</option>
                  <option value="maintenance_minor">Minor Emergency Road Repair</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Total Amount (GHS) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 450.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {expenseCategory === 'fuel' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Liters Purchased (Optional)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 35.5"
                    value={expenseLiters}
                    onChange={(e) => setExpenseLiters(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Station / Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Shell Airport City"
                    value={expenseStation}
                    onChange={(e) => setExpenseStation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Receipt / Invoice Number</label>
                <input
                  type="text"
                  placeholder="e.g. SHL-891244"
                  value={expenseReceiptNo}
                  onChange={(e) => setExpenseReceiptNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Payment Method</label>
                <select
                  value={expensePaymentMethod}
                  onChange={(e) => setExpensePaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-600"
                >
                  <option value="fleet_card">Company Fleet Card</option>
                  <option value="mobile_money">Mobile Money (MTN / Telecel)</option>
                  <option value="petty_cash">Petty Cash Advance</option>
                  <option value="cash">Out-of-Pocket Cash (Claim)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Notes / Destination Reference</label>
              <textarea
                rows={2}
                placeholder="e.g. Fuel purchased on way back from Tema harbor delivery."
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Submit Expense Receipt
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: REPORT VEHICLE ISSUE */}
      {activeDriverTab === 'report_issue' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-2xl mx-auto">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200 mb-5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Report Vehicle Issue or Mechanical Fault</h3>
              <p className="text-xs text-slate-500">
                Instantly notify Fleet Managers to schedule servicing or inspection for <strong>{activeVehicle?.plateNumber}</strong>
              </p>
            </div>
          </div>

          <form onSubmit={handleReportIssue} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Issue Title / Short Summary *</label>
              <input
                type="text"
                required
                placeholder="e.g. Brake noise when decelerating, or front left tire slow puncture"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Severity / Urgency</label>
              <div className="grid grid-cols-4 gap-2">
                {(['low', 'medium', 'high', 'critical'] as const).map(sev => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setIssueSeverity(sev)}
                    className={`py-2 text-xs font-bold rounded-xl capitalize transition-all border ${
                      issueSeverity === sev
                        ? sev === 'critical' ? 'bg-rose-600 text-white border-rose-600'
                        : sev === 'high' ? 'bg-orange-500 text-white border-orange-500'
                        : sev === 'medium' ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Detailed Description *</label>
              <textarea
                rows={4}
                required
                placeholder="Describe what you observed: noises, dashboard warning lights, handling behavior, or fluid leaks..."
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Submit Fault Report to Fleet Team
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: MY TRIP LOGBOOK */}
      {activeDriverTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Personal Trip History</h3>
              <p className="text-xs text-slate-500">All vehicle journeys recorded under your driver account</p>
            </div>
            <button
              type="button"
              onClick={handleExportTripSheetPDF}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF Logbook</span>
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Route (Origin → Destination)</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3 text-right">Odometer (Start → End)</th>
                  <th className="py-2.5 px-3 text-right">Distance</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myTrips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No trip records found for this driver profile yet.
                    </td>
                  </tr>
                ) : (
                  myTrips.map(trip => (
                    <tr key={trip.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {new Date(trip.departureTime).toLocaleDateString('en-GB')}
                        <span className="block text-[10px] text-slate-400">
                          {new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-900">{trip.vehiclePlate}</span>
                        <span className="block text-[10px] text-slate-500 truncate max-w-[140px]">{trip.vehicleName}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800">{trip.startLocation}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="text-indigo-600 font-semibold">{trip.destinationLocation}</span>
                        {trip.passengerOrCargo && (
                          <span className="block text-[10px] text-slate-400 truncate max-w-[220px]">
                            {trip.passengerOrCargo}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 capitalize text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700">
                          {trip.purpose.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {trip.startOdometer.toLocaleString()} → {trip.endOdometer ? trip.endOdometer.toLocaleString() : '...'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                        {trip.distanceKm ? `${trip.distanceKm} KM` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                          trip.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          trip.status === 'active' ? 'bg-indigo-50 text-indigo-700 animate-pulse' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {trip.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: WORKSHOP SERVICING & JOINT SIGN-OFF */}
      {activeDriverTab === 'service' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white rounded-2xl p-6 shadow-md border border-amber-800/40 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-600/40 border border-amber-400/30 rounded-2xl text-amber-300">
                <PenTool className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Workshop Servicing & Joint Mechanic Sign-Off</h3>
                  <span className="px-2 py-0.5 bg-amber-500/30 text-amber-200 border border-amber-400/30 rounded text-[10px] font-mono">
                    Dual Signature Certified
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  At the garage or workshop? Fill out this electronic work order form with your mechanic. Itemize what was repaired, specify engine oil change details (viscosity/volume), record next service due mileage, and both draw your signatures on screen for an official PDF certificate.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsJointServiceModalOpen(true)}
              className="px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap self-start md:self-auto"
            >
              <PenTool className="w-4 h-4" />
              <span>Open Joint Service Sign-Off Form</span>
            </button>
          </div>

          {/* Active Vehicle Servicing Status Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Servicing Status: {activeVehicle?.plateNumber} — {activeVehicle?.name}
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Odometer</span>
                <span className="text-sm font-mono font-bold text-slate-900 block mt-1">
                  {(activeVehicle?.currentOdometer || 0).toLocaleString()} KM
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Last Serviced Date</span>
                <span className="text-sm font-bold text-slate-800 block mt-1">
                  {activeVehicle?.lastServicedDate || 'Scheduled in Depot'}
                </span>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-800 uppercase font-bold block">Next Due Odometer</span>
                <span className="text-sm font-mono font-bold text-amber-900 block mt-1">
                  {activeVehicle?.nextServiceDueOdometer ? `${activeVehicle.nextServiceDueOdometer.toLocaleString()} KM` : 'At +5,000 KM'}
                </span>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-800 uppercase font-bold block">Next Due Date</span>
                <span className="text-sm font-bold text-amber-900 block mt-1">
                  {activeVehicle?.nextServiceDueDate || 'Within 90 Days'}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Service History Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="pb-3 border-b border-slate-200 mb-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Recent Completed Workshop Records</h4>
                <p className="text-xs text-slate-500">Service certificates signed off by you and certified mechanics</p>
              </div>
              <button
                type="button"
                onClick={() => setIsJointServiceModalOpen(true)}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Service Form</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3">Workshop & Mechanic</th>
                    <th className="py-2.5 px-3">Issue Fixed / Servicing Details</th>
                    <th className="py-2.5 px-3 text-right">Cost</th>
                    <th className="py-2.5 px-3 text-center">Dual Sign-Off</th>
                    <th className="py-2.5 px-3 text-right">PDF Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maintenance.filter(m => m.vehicleId === activeVehicle?.id || m.driverId === activeUser.uid).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        No workshop servicing records signed off yet for this vehicle.
                      </td>
                    </tr>
                  ) : (
                    maintenance.filter(m => m.vehicleId === activeVehicle?.id || m.driverId === activeUser.uid).map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-medium text-slate-800">{m.completedDate || m.scheduledDate}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{m.vehiclePlate}</td>
                        <td className="py-3 px-3 text-slate-700">
                          <span className="font-semibold">{m.serviceProvider}</span>
                          {m.mechanicName && <span className="block text-[10px] text-slate-400">Tech: {m.mechanicName}</span>}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="font-bold text-slate-800">{m.title}</span>
                          {m.issueFixed && <span className="block text-[10px] italic text-slate-500">Fixed: {m.issueFixed}</span>}
                          {m.oilBrandAndGrade && (
                            <span className="block text-[10px] text-amber-700">Oil: {m.oilBrandAndGrade} ({m.oilVolumeLiters}L)</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatPrice(m.cost)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                            Dual-Signed
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const doc = new jsPDF();
                              const pw = doc.internal.pageSize.getWidth();
                              doc.setFillColor(15, 23, 42);
                              doc.rect(0, 0, pw, 32, 'F');
                              doc.setTextColor(255, 255, 255);
                              doc.setFontSize(15);
                              doc.setFont('helvetica', 'bold');
                              doc.text('TUMI ENTERPRISE FLEET LOGISTICS', 14, 15);
                              doc.setFontSize(9);
                              doc.setFont('helvetica', 'normal');
                              doc.text(`OFFICIAL SERVICE CERTIFICATE | WO #${m.invoiceNumber || 'WO-2026'}`, 14, 23);
                              doc.setTextColor(30, 41, 59);
                              doc.setFontSize(11);
                              doc.setFont('helvetica', 'bold');
                              doc.text(`Vehicle: ${m.vehiclePlate} — ${m.vehicleName}`, 14, 45);
                              doc.setFontSize(9);
                              doc.setFont('helvetica', 'normal');
                              doc.text(`Workshop: ${m.serviceProvider} | Mechanic: ${m.mechanicName || 'Master Tech'}`, 14, 53);
                              doc.text(`Driver: ${m.driverName || activeUser.name} | Odometer: ${m.odometerAtService.toLocaleString()} KM`, 14, 60);
                              doc.text(`Next Due: ${(m.nextServiceDueOdometer || m.odometerAtService + 5000).toLocaleString()} KM (Target: ${m.nextServiceDueDate || '90 Days'})`, 14, 67);
                              if (m.issueFixed) {
                                doc.setFont('helvetica', 'bold');
                                doc.text('Repairs Executed & Issues Resolved:', 14, 77);
                                doc.setFont('helvetica', 'normal');
                                doc.text(doc.splitTextToSize(m.issueFixed, pw - 28), 14, 84);
                              }
                              doc.save(`Service_Certificate_${m.vehiclePlate}.pdf`);
                              showToast('✓ Service Certificate PDF downloaded.');
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5 text-indigo-600" />
                            <span>PDF</span>
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

      {/* TAB: MY DRIVER'S LICENSE & VERIFICATION */}
      {activeDriverTab === 'license' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">My Driver's License & Statutory Credentials</h3>
                  <p className="text-xs text-slate-500">Official DVLA authorization, renewal countdown, and physical card photos</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOcrDocType('license');
                  setIsOcrModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI Scan License Card</span>
              </button>
            </div>

            {myLicense ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Physical Card Representation */}
                <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-slate-700 relative overflow-hidden space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-amber-400 text-slate-900 rounded">
                        REPUBLIC OF GHANA
                      </span>
                      <span className="text-[11px] text-slate-300 font-bold">DVLA DRIVER LICENCE</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold capitalize ${
                      new Date(myLicense.expiryDate).getTime() - Date.now() <= 0 ? 'bg-rose-500 text-white' :
                      new Date(myLicense.expiryDate).getTime() - Date.now() <= 30 * 86400000 ? 'bg-amber-400 text-slate-900' :
                      'bg-emerald-500 text-white'
                    }`}>
                      {new Date(myLicense.expiryDate).getTime() - Date.now() <= 0 ? 'EXPIRED' :
                       new Date(myLicense.expiryDate).getTime() - Date.now() <= 30 * 86400000 ? 'RENEWAL DUE (30d)' : 'VALID'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Driver Full Name</span>
                      <span className="text-base font-bold text-white block mt-0.5">{myLicense.driverName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Licence Number</span>
                      <span className="text-sm font-mono font-bold text-amber-300 block mt-0.5">{myLicense.licenseNumber}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Authorisation Class</span>
                      <span className="text-sm font-bold text-slate-200 block mt-0.5">{myLicense.licenseClass}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Issuing Station</span>
                      <span className="text-xs text-slate-300 block mt-0.5">{myLicense.issuingAuthority}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Date of Issue</span>
                      <span className="text-xs font-mono text-slate-300 block mt-0.5">{myLicense.issueDate}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Valid Until (Expiry)</span>
                      <span className="text-xs font-mono font-bold text-amber-300 block mt-0.5">{myLicense.expiryDate}</span>
                    </div>
                  </div>

                  {/* 30-Day Reminder Warning on Card */}
                  {new Date(myLicense.expiryDate).getTime() - Date.now() <= 30 * 86400000 && (
                    <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                        <span className="text-amber-200 text-[11px]">
                          <strong>30-Day Reminder Active:</strong> Your driver's license expires in {Math.ceil((new Date(myLicense.expiryDate).getTime() - Date.now()) / 86400000)} days ({myLicense.expiryDate}). Please visit DVLA for renewal.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Uploaded Card Photos Front & Back */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                      <Camera className="w-4 h-4 text-indigo-600" />
                      <span>Physical Card Photos</span>
                    </h4>

                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">Front Card Photo</span>
                      {myLicense.frontImageUrl ? (
                        <img
                          src={myLicense.frontImageUrl}
                          alt="License Front"
                          className="h-24 w-full object-cover rounded-xl border border-slate-200 shadow-xs"
                        />
                      ) : (
                        <div className="h-24 w-full rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 bg-white">
                          No front photo uploaded
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">Back Card Photo</span>
                      {myLicense.backImageUrl ? (
                        <img
                          src={myLicense.backImageUrl}
                          alt="License Back"
                          className="h-24 w-full object-cover rounded-xl border border-slate-200 shadow-xs"
                        />
                      ) : (
                        <div className="h-24 w-full rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 bg-white">
                          No back photo uploaded
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOcrDocType('license');
                      setIsOcrModalOpen(true);
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload / Re-Scan License Photos</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <UserCheck className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No Driver's License Registered on File</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Upload a photo of your physical DVLA driver's license card to record your license number, class, and set up 30-day renewal reminders.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOcrDocType('license');
                    setIsOcrModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Scan License with AI</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isStartModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-lg">
                  <Play className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Start New Vehicle Journey</h3>
                  <p className="text-[10px] text-slate-400">{activeVehicle?.name} ({activeVehicle?.plateNumber})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStartModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleStartTrip} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Starting Odometer (KM) *</label>
                  <input
                    type="number"
                    required
                    value={startOdometerInput}
                    onChange={(e) => setStartOdometerInput(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Last logged: {activeVehicle?.currentOdometer} KM</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Journey Purpose *</label>
                  <select
                    value={purposeInput}
                    onChange={(e) => setPurposeInput(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-600"
                  >
                    <option value="client_delivery">Client Delivery / Retail Orders</option>
                    <option value="inventory_transfer">Warehouse Stock Transfer</option>
                    <option value="procurement_run">Procurement & Supply Pickup</option>
                    <option value="executive_transport">Executive / Director Transport</option>
                    <option value="hospitality_guest_shuttle">Hospitality Guest Shuttle</option>
                    <option value="field_maintenance">Field Engineering & Repairs</option>
                    <option value="training_outreach">Vocational Outreach & Training</option>
                    <option value="other">Other Official Assignment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Departure Location *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={startLocationInput}
                    onChange={(e) => setStartLocationInput(e.target.value)}
                    placeholder="e.g. Accra Central Logistics Yard Gate B"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 pr-24"
                  />
                  <button
                    type="button"
                    onClick={() => setStartLocationInput('Accra Main Logistics Hub, Gate 2')}
                    className="absolute right-2 top-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100"
                  >
                    Use Depot
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Destination / Target Location *</label>
                <input
                  type="text"
                  required
                  value={destinationLocationInput}
                  onChange={(e) => setDestinationLocationInput(e.target.value)}
                  placeholder="e.g. Tema Heavy Industrial Zone / Client Office"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Cargo / Passengers</label>
                  <input
                    type="text"
                    value={passengerCargoInput}
                    onChange={(e) => setPassengerCargoInput(e.target.value)}
                    placeholder="e.g. 15 cartons of inventory"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Waybill / Order Ref</label>
                  <input
                    type="text"
                    value={waybillRefInput}
                    onChange={(e) => setWaybillRefInput(e.target.value)}
                    placeholder="e.g. WB-2026-991"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Pre-Trip Checklist */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pre-Trip Walkaround Safety Checklist</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preTripTires}
                      onChange={(e) => setPreTripTires(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Tire Pressure OK</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preTripOil}
                      onChange={(e) => setPreTripOil(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Engine Oil & Coolant OK</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preTripBrakes}
                      onChange={(e) => setPreTripBrakes(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Foot & Handbrake OK</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preTripLights}
                      onChange={(e) => setPreTripLights(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Headlights & Horn OK</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStartModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Confirm Departure</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE TRIP MODAL */}
      {isCompleteModalOpen && activeTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-800 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Complete Journey & Reconcile Mileage</h3>
                  <p className="text-[10px] text-emerald-100">{activeTrip.vehiclePlate} • Started at {activeTrip.startOdometer} KM</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="text-emerald-200 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCompleteTrip} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Ending Odometer (KM) *</label>
                  <input
                    type="number"
                    required
                    value={endOdometerInput}
                    onChange={(e) => setEndOdometerInput(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600"
                  />
                  <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                    Calculated Distance: {Math.max(0, endOdometerInput - activeTrip.startOdometer)} KM
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Final Arrival Location *</label>
                  <input
                    type="text"
                    required
                    value={actualDestinationInput}
                    onChange={(e) => setActualDestinationInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-[11px] font-bold text-slate-700 block">Optional Road Purchases to Reimburse</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Fuel Added (Liters)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 25"
                      value={fuelAddedLitersInput}
                      onChange={(e) => setFuelAddedLitersInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Fuel Cost (GHS)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 350"
                      value={fuelCostInput}
                      onChange={(e) => setFuelCostInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Toll Fees (GHS)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 20"
                      value={tollFeesInput}
                      onChange={(e) => setTollFeesInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Post-Trip Condition Notes</label>
                <textarea
                  rows={2}
                  value={postTripNotesInput}
                  onChange={(e) => setPostTripNotesInput(e.target.value)}
                  placeholder="e.g. Delivery signed by warehouse manager. Vehicle washed and parked at Bay 3."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Final Trip Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Document OCR Modal */}
      <DocumentOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        documentType={ocrDocType}
        targetVehicle={activeVehicle}
        targetDriverLicense={myLicense}
        allVehicles={vehicles}
      />

      {/* Joint Driver & Mechanic Sign-Off Modal */}
      <JointServiceSignOffModal
        isOpen={isJointServiceModalOpen}
        onClose={() => setIsJointServiceModalOpen(false)}
        activeUser={activeUser}
        initialVehicle={activeVehicle}
        allVehicles={vehicles}
      />

      {/* Station Fuel Pump Reading & AI Efficiency Log Modal */}
      <FuelPumpLogModal
        isOpen={isFuelPumpModalOpen}
        onClose={() => setIsFuelPumpModalOpen(false)}
        activeUser={activeUser}
        initialVehicle={activeVehicle}
        allVehicles={vehicles}
      />
    </div>
  );
}
