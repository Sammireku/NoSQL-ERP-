import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Car, 
  Wrench, 
  Fuel, 
  Compass, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Download, 
  MapPin, 
  UserCheck, 
  Activity, 
  DollarSign, 
  ExternalLink, 
  ChevronRight, 
  Sliders, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Eye, 
  TrendingUp, 
  Sparkles,
  Phone,
  BarChart3,
  PenTool,
  Check,
  FileCheck,
  Camera,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { dataStore } from '../config/firebase';
import { 
  UserProfile, 
  Vehicle, 
  VehicleTrip, 
  VehicleMaintenance, 
  VehicleExpense, 
  VehicleIssueReport,
  DriverLicense
} from '../types/erp';
import { formatPrice } from '../utils/currency';
import DocumentOcrModal from './DocumentOcrModal';
import JointServiceSignOffModal from './JointServiceSignOffModal';

interface FleetManagementProps {
  activeUser: UserProfile;
  onNavigateToDriverPortal?: () => void;
}

export default function FleetManagement({ activeUser, onNavigateToDriverPortal }: FleetManagementProps) {
  // Datasets from dataStore
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => dataStore.getVehicles());
  const [trips, setTrips] = useState<VehicleTrip[]>(() => dataStore.getVehicleTrips());
  const [maintenance, setMaintenance] = useState<VehicleMaintenance[]>(() => dataStore.getVehicleMaintenance());
  const [expenses, setExpenses] = useState<VehicleExpense[]>(() => dataStore.getVehicleExpenses());
  const [issues, setIssues] = useState<VehicleIssueReport[]>(() => dataStore.getVehicleIssues());
  const [driverLicenses, setDriverLicenses] = useState<DriverLicense[]>(() => dataStore.getDriverLicenses());
  const [staffList, setStaffList] = useState<UserProfile[]>(() => dataStore.getUsers());

  // Listeners
  useEffect(() => {
    const unsubVeh = dataStore.subscribeToCollection('vehicles', () => {
      setVehicles(dataStore.getVehicles());
    });
    const unsubTrips = dataStore.subscribeToCollection('vehicle_trips', () => {
      setTrips(dataStore.getVehicleTrips());
    });
    const unsubMaint = dataStore.subscribeToCollection('vehicle_maintenance', () => {
      setMaintenance(dataStore.getVehicleMaintenance());
    });
    const unsubExp = dataStore.subscribeToCollection('vehicle_expenses', () => {
      setExpenses(dataStore.getVehicleExpenses());
    });
    const unsubIssues = dataStore.subscribeToCollection('vehicle_issues', () => {
      setIssues(dataStore.getVehicleIssues());
    });
    const unsubLicenses = dataStore.subscribeToCollection('driver_licenses', () => {
      setDriverLicenses(dataStore.getDriverLicenses());
    });
    const unsubUsers = dataStore.subscribeToCollection('users', () => {
      setStaffList(dataStore.getUsers());
    });

    return () => {
      unsubVeh();
      unsubTrips();
      unsubMaint();
      unsubExp();
      unsubIssues();
      unsubLicenses();
      unsubUsers();
    };
  }, []);

  // Tabs
  type FleetTab = 'overview' | 'vehicles' | 'trips' | 'maintenance' | 'expenses' | 'compliance' | 'issues' | 'licenses';
  const [activeTab, setActiveTab] = useState<FleetTab>('overview');

  // OCR Modal state
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrDocType, setOcrDocType] = useState<'roadworthiness' | 'insurance' | 'license' | 'auto'>('auto');
  const [ocrTargetVehicle, setOcrTargetVehicle] = useState<Vehicle | null>(null);
  const [ocrTargetLicense, setOcrTargetLicense] = useState<DriverLicense | null>(null);

  // Joint Service Sign-Off Modal state
  const [isJointServiceModalOpen, setIsJointServiceModalOpen] = useState(false);
  const [jointServiceVehicle, setJointServiceVehicle] = useState<Vehicle | null>(null);

  // Driver License Registration Modal state
  const [isNewLicenseModalOpen, setIsNewLicenseModalOpen] = useState(false);
  const [newLicDriverId, setNewLicDriverId] = useState('');
  const [newLicNumber, setNewLicNumber] = useState('');
  const [newLicClass, setNewLicClass] = useState<DriverLicense['licenseClass']>('Class C (Commercial)');
  const [newLicIssueDate, setNewLicIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newLicExpiryDate, setNewLicExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split('T')[0];
  });
  const [newLicAuthority, setNewLicAuthority] = useState('DVLA - Accra Regional Station');
  const [newLicEmergency, setNewLicEmergency] = useState('');
  const [newLicEmergencyPhone, setNewLicEmergencyPhone] = useState('');
  const [newLicNotes, setNewLicNotes] = useState('');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Vehicle['status']>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Drivers list (roles containing driver, or job titles containing driver)
  const availableDrivers = useMemo(() => {
    return staffList.filter(s => 
      s.role === 'driver' || 
      s.department?.toLowerCase().includes('logistics') || 
      s.department?.toLowerCase().includes('fleet') || 
      s.jobTitle?.toLowerCase().includes('driver')
    );
  }, [staffList]);

  // Overall KPIs
  const kpiStats = useMemo(() => {
    const totalVehicles = vehicles.length;
    const available = vehicles.filter(v => v.status === 'available').length;
    const onTrip = vehicles.filter(v => v.status === 'on_trip').length;
    const inService = vehicles.filter(v => v.status === 'in_service' || v.status === 'grounded').length;
    const totalKm = vehicles.reduce((acc, v) => acc + v.currentOdometer, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const fuelExpenses = expenses.filter(e => e.expenseCategory === 'fuel').reduce((acc, e) => acc + e.amount, 0);
    const openIssues = issues.filter(i => i.status === 'open' || i.status === 'under_review').length;

    // Days until expiry checks
    const now = new Date();
    const urgentRenewals = vehicles.filter(v => {
      if (v.insuranceExpiryDate) {
        const diff = (new Date(v.insuranceExpiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (diff <= 30) return true;
      }
      if (v.roadworthinessExpiryDate) {
        const diff = (new Date(v.roadworthinessExpiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (diff <= 30) return true;
      }
      return false;
    }).length;

    return {
      totalVehicles,
      available,
      onTrip,
      inService,
      totalKm,
      totalExpenses,
      fuelExpenses,
      openIssues,
      urgentRenewals
    };
  }, [vehicles, expenses, issues]);

  // Helper function to calculate days remaining
  const getDaysRemaining = (expiryDateStr?: string) => {
    if (!expiryDateStr) return null;
    const diff = (new Date(expiryDateStr).getTime() - Date.now()) / (1000 * 3600 * 24);
    return Math.ceil(diff);
  };

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const q = searchTerm.toLowerCase();
      const matchSearch = 
        v.name.toLowerCase().includes(q) ||
        v.plateNumber.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.assignedDriverName || '').toLowerCase().includes(q);

      const matchStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchDept = departmentFilter === 'all' || v.department === departmentFilter;

      return matchSearch && matchStatus && matchDept;
    });
  }, [vehicles, searchTerm, statusFilter, departmentFilter]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set(vehicles.map(v => v.department).filter(Boolean));
    return Array.from(set);
  }, [vehicles]);

  // -------------------------------------------------------------
  // MODAL STATES: REGISTER VEHICLE, SCHEDULE SERVICE, ADD EXPENSE
  // -------------------------------------------------------------
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedVehicleForAction, setSelectedVehicleForAction] = useState<Vehicle | null>(null);

  // New Vehicle Form State
  const [newVehName, setNewVehName] = useState('');
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehMake, setNewVehMake] = useState('Toyota');
  const [newVehModel, setNewVehModel] = useState('');
  const [newVehYear, setNewVehYear] = useState<number>(2023);
  const [newVehType, setNewVehType] = useState<Vehicle['vehicleType']>('pickup');
  const [newVehFuel, setNewVehFuel] = useState<Vehicle['fuelType']>('diesel');
  const [newVehTrans, setNewVehTrans] = useState<Vehicle['transmission']>('manual');
  const [newVehTank, setNewVehTank] = useState<number>(80);
  const [newVehOdo, setNewVehOdo] = useState<number>(0);
  const [newVehDriverId, setNewVehDriverId] = useState('');
  const [newVehDept, setNewVehDept] = useState('Logistics & Delivery');
  const [newVehLocation, setNewVehLocation] = useState('Central Logistics Yard');
  const [newVehInsuranceNo, setNewVehInsuranceNo] = useState('');
  const [newVehInsuranceExpiry, setNewVehInsuranceExpiry] = useState('');
  const [newVehRoadworthyExpiry, setNewVehRoadworthyExpiry] = useState('');
  const [newVehRoadFundExpiry, setNewVehRoadFundExpiry] = useState('');
  const [newVehCost, setNewVehCost] = useState<number>(35000);
  const [newVehNotes, setNewVehNotes] = useState('');

  const handleRegisterVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehName.trim() || !newVehPlate.trim()) {
      showToast('⚠️ Please provide a vehicle name and license plate number.');
      return;
    }

    const matchedDriver = staffList.find(s => s.uid === newVehDriverId);

    dataStore.addVehicle({
      name: newVehName.trim(),
      plateNumber: newVehPlate.trim().toUpperCase(),
      make: newVehMake.trim(),
      model: newVehModel.trim() || newVehMake,
      year: Number(newVehYear),
      vehicleType: newVehType,
      fuelType: newVehFuel,
      transmission: newVehTrans,
      tankCapacityLiters: Number(newVehTank),
      currentOdometer: Number(newVehOdo),
      status: 'available',
      assignedDriverId: matchedDriver?.uid,
      assignedDriverName: matchedDriver?.name,
      department: newVehDept.trim(),
      currentLocation: newVehLocation.trim(),
      fuelLevelPercent: 75,
      insurancePolicyNo: newVehInsuranceNo.trim() || undefined,
      insuranceExpiryDate: newVehInsuranceExpiry || undefined,
      roadworthinessExpiryDate: newVehRoadworthyExpiry || undefined,
      roadFundExpiryDate: newVehRoadFundExpiry || undefined,
      purchaseCost: Number(newVehCost),
      notes: newVehNotes.trim() || undefined
    });

    setIsRegisterModalOpen(false);
    // Reset form
    setNewVehName('');
    setNewVehPlate('');
    setNewVehModel('');
    showToast(`✓ Registered vehicle ${newVehPlate.toUpperCase()} successfully.`);
  };

  // Schedule Service Form State
  const [servVehicleId, setServVehicleId] = useState('');
  const [servTitle, setServTitle] = useState('');
  const [servType, setServType] = useState<VehicleMaintenance['serviceType']>('routine_scheduled');
  const [servWorkshop, setServWorkshop] = useState('Toyota Ghana Authorized Center');
  const [servPhone, setServPhone] = useState('+233 30 222 1316');
  const [servDate, setServDate] = useState(new Date().toISOString().split('T')[0]);
  const [servOdometer, setServOdometer] = useState<number>(0);
  const [servCost, setServCost] = useState<number>(1500);
  const [servNextDueOdo, setServNextDueOdo] = useState<number>(0);
  const [servNextDueDate, setServNextDueDate] = useState('');
  const [servParts, setServParts] = useState('Engine Oil, Oil Filter, Fuel Filter');
  const [servNotes, setServNotes] = useState('');

  const handleOpenServiceModal = (v?: Vehicle) => {
    if (v) {
      setServVehicleId(v.id);
      setServOdometer(v.currentOdometer);
      setServNextDueOdo(v.currentOdometer + 10000);
    } else if (vehicles[0]) {
      setServVehicleId(vehicles[0].id);
      setServOdometer(vehicles[0].currentOdometer);
      setServNextDueOdo(vehicles[0].currentOdometer + 10000);
    }
    setIsServiceModalOpen(true);
  };

  const handleScheduleService = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVeh = vehicles.find(v => v.id === servVehicleId);
    if (!targetVeh) {
      showToast('⚠️ Please select a vehicle for servicing.');
      return;
    }

    dataStore.addVehicleMaintenance({
      vehicleId: targetVeh.id,
      vehiclePlate: targetVeh.plateNumber,
      vehicleName: targetVeh.name,
      serviceType: servType,
      title: servTitle.trim() || `${targetVeh.plateNumber} Scheduled Servicing`,
      serviceProvider: servWorkshop.trim(),
      contactPhone: servPhone.trim() || undefined,
      scheduledDate: servDate,
      odometerAtService: Number(servOdometer) || targetVeh.currentOdometer,
      nextServiceDueOdometer: Number(servNextDueOdo) || targetVeh.currentOdometer + 10000,
      nextServiceDueDate: servNextDueDate || undefined,
      cost: Number(servCost) || 0,
      currency: 'GHS',
      partsReplaced: servParts ? servParts.split(',').map(p => p.trim()) : undefined,
      notes: servNotes.trim() || undefined,
      status: 'scheduled'
    });

    setIsServiceModalOpen(false);
    showToast(`✓ Scheduled maintenance for ${targetVeh.plateNumber} at ${servWorkshop}.`);
  };

  // Log Expense Form State
  const [expVehicleId, setExpVehicleId] = useState('');
  const [expCategory, setExpCategory] = useState<VehicleExpense['expenseCategory']>('fuel');
  const [expAmount, setExpAmount] = useState<number>(450);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expVendor, setExpVendor] = useState('Shell Ghana Airport City');
  const [expReceipt, setExpReceipt] = useState('');
  const [expLiters, setExpLiters] = useState<string>('32');
  const [expMethod, setExpMethod] = useState<VehicleExpense['paymentMethod']>('fleet_card');
  const [expDriverId, setExpDriverId] = useState('');
  const [expNotes, setExpNotes] = useState('');

  const handleOpenExpenseModal = (v?: Vehicle) => {
    if (v) {
      setExpVehicleId(v.id);
    } else if (vehicles[0]) {
      setExpVehicleId(vehicles[0].id);
    }
    setIsExpenseModalOpen(true);
  };

  const handleLogExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVeh = vehicles.find(v => v.id === expVehicleId);
    if (!targetVeh) {
      showToast('⚠️ Please select a vehicle.');
      return;
    }

    const matchedDriver = staffList.find(s => s.uid === expDriverId);

    dataStore.addVehicleExpense({
      vehicleId: targetVeh.id,
      vehiclePlate: targetVeh.plateNumber,
      vehicleName: targetVeh.name,
      driverId: matchedDriver?.uid,
      driverName: matchedDriver?.name,
      expenseCategory: expCategory,
      amount: Number(expAmount),
      currency: 'GHS',
      date: expDate,
      odometer: targetVeh.currentOdometer,
      litersPurchased: expLiters ? parseFloat(expLiters) : undefined,
      vendorOrStation: expVendor.trim() || 'Vendor',
      receiptNumber: expReceipt.trim() || 'VCH-' + Math.floor(100000 + Math.random() * 900000),
      paymentMethod: expMethod,
      approvalStatus: 'approved',
      notes: expNotes.trim() || undefined
    });

    setIsExpenseModalOpen(false);
    showToast(`✓ Recorded ${expCategory.toUpperCase()} expense of GHS ${Number(expAmount).toFixed(2)}.`);
  };

  // Change Vehicle Status Handler
  const handleUpdateVehicleStatus = (vehicleId: string, newStatus: Vehicle['status']) => {
    dataStore.updateVehicle(vehicleId, { status: newStatus });
    showToast(`✓ Vehicle status updated to ${newStatus.replace('_', ' ')}.`);
  };

  // Complete Maintenance Record
  const handleMarkMaintenanceCompleted = (maintId: string) => {
    dataStore.updateVehicleMaintenance(maintId, { 
      status: 'completed',
      completedDate: new Date().toISOString().split('T')[0]
    });
    showToast('✓ Maintenance record marked as completed and vehicle cleared.');
  };

  // -------------------------------------------------------------
  // MASTER FLEET REPORT PDF EXPORT
  // -------------------------------------------------------------
  const handleExportFleetReportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Header banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 32, 'F');

    doc.setFillColor(79, 70, 229); // indigo accent
    doc.rect(0, 32, pageWidth, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ENTERPRISE FLEET & VEHICLE LOGISTICS AUDIT REPORT', margin, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Generated By: ${activeUser.name} (${activeUser.role.toUpperCase()})  •  Date: ${new Date().toLocaleDateString('en-GB')}`, margin, 23);
    doc.text(`Total Fleet: ${vehicles.length} Units  •  Total Logged Distance: ${kpiStats.totalKm.toLocaleString()} KM  •  Total Operating Spend: GHS ${kpiStats.totalExpenses.toFixed(2)}`, margin, 28);

    let y = 42;

    // Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('PLATE', margin + 2, y + 5);
    doc.text('VEHICLE NAME / MODEL', margin + 26, y + 5);
    doc.text('TYPE / FUEL', margin + 85, y + 5);
    doc.text('ASSIGNED DRIVER', margin + 120, y + 5);
    doc.text('STATUS', margin + 165, y + 5);
    doc.text('ODOMETER', margin + 195, y + 5, { align: 'right' });
    doc.text('ROADWORTHINESS', margin + 225, y + 5);
    doc.text('INSURANCE', margin + 255, y + 5);

    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    vehicles.forEach((veh, idx) => {
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(veh.plateNumber, margin + 2, y + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.text(veh.name.substring(0, 32), margin + 26, y + 4.8);
      doc.text(`${veh.vehicleType.toUpperCase()} • ${veh.fuelType.toUpperCase()}`, margin + 85, y + 4.8);
      doc.text(veh.assignedDriverName || 'Unassigned', margin + 120, y + 4.8);

      // Status colored
      doc.setFont('helvetica', 'bold');
      if (veh.status === 'available') doc.setTextColor(16, 185, 129);
      else if (veh.status === 'on_trip') doc.setTextColor(99, 102, 241);
      else if (veh.status === 'in_service') doc.setTextColor(245, 158, 11);
      else doc.setTextColor(239, 68, 68);

      doc.text(veh.status.toUpperCase().replace('_', ' '), margin + 165, y + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`${veh.currentOdometer.toLocaleString()} KM`, margin + 195, y + 4.8, { align: 'right' });

      doc.setTextColor(71, 85, 105);
      doc.text(veh.roadworthinessExpiryDate || 'N/A', margin + 225, y + 4.8);
      doc.text(veh.insuranceExpiryDate || 'N/A', margin + 255, y + 4.8);

      y += 7;
    });

    doc.save(`Tumi_Fleet_Audit_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('✓ Master Fleet Report PDF downloaded!');
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

      {/* TOP HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-700 to-slate-900 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Fleet & Vehicle Logistics Management</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {vehicles.length} Assets
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive vehicle fleet registry, preventive servicing schedules, fuel expenses, and driver trip logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateToDriverPortal && (
            <button
              type="button"
              onClick={onNavigateToDriverPortal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors border border-indigo-200"
            >
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Driver Portal View</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setOcrDocType('auto');
              setOcrTargetVehicle(null);
              setIsOcrModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-indigo-800 rounded-xl text-xs font-bold transition-all border border-indigo-200 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Scan Document</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setJointServiceVehicle(null);
              setIsJointServiceModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-colors border border-amber-200"
          >
            <PenTool className="w-3.5 h-3.5 text-amber-600" />
            <span>Joint Service Sign-Off</span>
          </button>

          <button
            type="button"
            onClick={handleExportFleetReportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Fleet PDF</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenServiceModal()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors border border-slate-200"
          >
            <Wrench className="w-3.5 h-3.5 text-slate-600" />
            <span>Schedule Service</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenExpenseModal()}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors border border-emerald-200"
          >
            <Fuel className="w-3.5 h-3.5 text-emerald-600" />
            <span>Log Expense</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Vehicle</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Total Fleet</span>
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{kpiStats.totalVehicles}</div>
          <span className="text-[10px] text-slate-400">Registered assets</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{kpiStats.available}</div>
          <span className="text-[10px] text-slate-400">Ready for dispatch</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>On Journey</span>
            <Compass className="w-4 h-4 text-indigo-500 animate-spin" />
          </div>
          <div className="text-xl font-bold text-indigo-600 mt-1">{kpiStats.onTrip}</div>
          <span className="text-[10px] text-slate-400">Active road trips</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>In Workshop</span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 mt-1">{kpiStats.inService}</div>
          <span className="text-[10px] text-slate-400">Under maintenance</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Total Mileage</span>
            <Activity className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">{kpiStats.totalKm.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400">Cumulative KM</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Fleet Expenses</span>
            <DollarSign className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">{formatPrice(kpiStats.totalExpenses)}</div>
          <span className="text-[10px] text-slate-400">Fuel & maintenance</span>
        </div>
      </div>

      {/* MAIN NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Fleet Overview', icon: BarChart3 },
          { id: 'vehicles', label: `Vehicles Registry (${vehicles.length})`, icon: Truck },
          { id: 'trips', label: `Trip Dispatch & Mileage Logs (${trips.length})`, icon: Compass },
          { id: 'maintenance', label: `Servicing & Workshop (${maintenance.length})`, icon: Wrench },
          { id: 'expenses', label: `Fuel & Fleet Expenses (${expenses.length})`, icon: Fuel },
          { id: 'compliance', label: `Statutory Renewals & Insurance`, icon: ShieldCheck },
          { id: 'licenses', label: `Driver Licenses (${driverLicenses.length})`, icon: UserCheck },
          { id: 'issues', label: `Driver Fault Tickets (${kpiStats.openIssues})`, icon: AlertTriangle }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as FleetTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: FLEET OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Urgent Expiry Warnings if any */}
          {kpiStats.urgentRenewals > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    Statutory Compliance Alert: {kpiStats.urgentRenewals} Vehicle(s) have insurance or roadworthiness expiring within 30 days!
                  </h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Review renewal certificates to avoid commercial highway penalties or invalid coverage.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('compliance')}
                className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
              >
                Inspect Compliance
              </button>
            </div>
          )}

          {/* Quick Vehicle Status Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Live Vehicle Fleet Status</h3>
              <button
                type="button"
                onClick={() => setActiveTab('vehicles')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View Full Registry</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {vehicles.map(v => (
                <div key={v.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-mono text-xs font-extrabold px-2 py-0.5 bg-slate-900 text-amber-400 rounded">
                        {v.plateNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                        v.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                        v.status === 'on_trip' ? 'bg-indigo-50 text-indigo-700 animate-pulse' :
                        v.status === 'in_service' ? 'bg-amber-50 text-amber-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {v.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 mt-2 line-clamp-1">{v.name}</h4>
                    <p className="text-[11px] text-slate-400 capitalize">{v.year} {v.make} {v.model} • {v.vehicleType}</p>

                    <div className="space-y-1.5 mt-3 text-[11px] text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Odometer:</span>
                        <span className="font-mono font-bold">{v.currentOdometer.toLocaleString()} KM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Driver:</span>
                        <span className="font-medium text-slate-800 truncate max-w-[120px]">{v.assignedDriverName || 'Unassigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Location:</span>
                        <span className="text-slate-700 truncate max-w-[120px]">{v.currentLocation || 'Depot'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{v.department}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenServiceModal(v)}
                        title="Service"
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenExpenseModal(v)}
                        title="Add Expense"
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Fuel className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Trips & Maintenance Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recent Trips */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  <span>Recent Vehicle Journeys</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('trips')}
                  className="text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="divide-y divide-slate-100 mt-2">
                {trips.slice(0, 4).map(t => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{t.vehiclePlate}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 font-medium">{t.driverName}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {t.startLocation} → <strong className="text-indigo-600">{t.destinationLocation}</strong>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-600">{t.distanceKm || 0} KM</span>
                      <span className="block text-[10px] text-slate-400">
                        {new Date(t.departureTime).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Maintenance & Upcoming */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>Workshop & Preventive Maintenance</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('maintenance')}
                  className="text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="divide-y divide-slate-100 mt-2">
                {maintenance.slice(0, 4).map(m => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{m.vehiclePlate}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-700 font-semibold">{m.title}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Garage: {m.serviceProvider}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900">{formatPrice(m.cost)}</span>
                      <span className={`block text-[10px] font-bold capitalize ${
                        m.status === 'completed' ? 'text-emerald-600' :
                        m.status === 'in_progress' ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VEHICLES REGISTRY */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by plate, model, make, or driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs text-slate-900 focus:outline-none w-full"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-slate-500 font-bold">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="on_trip">On Trip</option>
                  <option value="in_service">In Service</option>
                  <option value="grounded">Grounded</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-slate-500 font-bold">Department:</span>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Vehicles Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">Vehicle Details</th>
                    <th className="py-3 px-3.5">Category & Fuel</th>
                    <th className="py-3 px-3.5">Assigned Driver</th>
                    <th className="py-3 px-3.5">Odometer</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Compliance Countdown</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVehicles.map(v => {
                    const roadDays = getDaysRemaining(v.roadworthinessExpiryDate);
                    const insDays = getDaysRemaining(v.insuranceExpiryDate);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                  {v.plateNumber}
                                </span>
                                <span className="font-bold text-slate-800">{v.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {v.year} {v.make} {v.model} • Dept: {v.department}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3.5 capitalize text-slate-600">
                          <span className="font-semibold text-slate-800">{v.vehicleType}</span>
                          <span className="block text-[10px] text-slate-400">{v.fuelType} • {v.transmission}</span>
                        </td>

                        <td className="py-3.5 px-3.5">
                          <span className="font-medium text-slate-800">{v.assignedDriverName || 'Unassigned'}</span>
                          <span className="block text-[10px] text-slate-400">Loc: {v.currentLocation || 'Depot'}</span>
                        </td>

                        <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900">
                          {v.currentOdometer.toLocaleString()} KM
                        </td>

                        <td className="py-3.5 px-3.5">
                          <select
                            value={v.status}
                            onChange={(e) => handleUpdateVehicleStatus(v.id, e.target.value as any)}
                            className={`px-2 py-1 rounded-full text-[10px] font-extrabold capitalize border cursor-pointer focus:outline-none ${
                              v.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              v.status === 'on_trip' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              v.status === 'in_service' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            <option value="available">Available</option>
                            <option value="on_trip">On Trip</option>
                            <option value="in_service">In Service</option>
                            <option value="grounded">Grounded</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-3.5 text-[11px]">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              roadDays !== null && roadDays <= 30
                                ? 'bg-rose-50 text-rose-700 font-extrabold'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              Roadworthy: {roadDays !== null ? `${roadDays}d left` : 'N/A'}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold block ${
                              insDays !== null && insDays <= 30
                                ? 'bg-rose-50 text-rose-700 font-extrabold'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              Insurance: {insDays !== null ? `${insDays}d left` : 'N/A'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenServiceModal(v)}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-colors"
                            >
                              Service
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenExpenseModal(v)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-colors"
                            >
                              Expense
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRIPS & MILEAGE LOGS */}
      {activeTab === 'trips' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Vehicle Trip Dispatch & Mileage Audit Log</h3>
              <p className="text-xs text-slate-500">Every journey logged by company drivers with departure and arrival kilometers</p>
            </div>
            <button
              type="button"
              onClick={handleExportFleetReportPDF}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Trips PDF</span>
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Date / Departure</th>
                  <th className="py-3 px-3">Vehicle Plate</th>
                  <th className="py-3 px-3">Driver Name</th>
                  <th className="py-3 px-3">Route (Origin → Destination)</th>
                  <th className="py-3 px-3">Purpose & Details</th>
                  <th className="py-3 px-3 text-right">Odometer (Start → End)</th>
                  <th className="py-3 px-3 text-right">Distance (KM)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No trip logs recorded in the system yet.
                    </td>
                  </tr>
                ) : (
                  trips.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800">{new Date(t.departureTime).toLocaleDateString('en-GB')}</span>
                        <span className="block text-[10px] text-slate-400">
                          {new Date(t.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {t.vehiclePlate}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-medium text-slate-800">{t.driverName}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-medium text-slate-800">{t.startLocation}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="text-indigo-600 font-bold">{t.destinationLocation}</span>
                        {t.passengerOrCargo && (
                          <span className="block text-[10px] text-slate-400 truncate max-w-[200px]">
                            {t.passengerOrCargo}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700 capitalize">
                          {t.purpose.replace(/_/g, ' ')}
                        </span>
                        <span className="block text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">
                          {t.purposeNotes}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                        {t.startOdometer.toLocaleString()} → {t.endOdometer ? t.endOdometer.toLocaleString() : '...'}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {t.distanceKm ? `${t.distanceKm} KM` : '-'}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                          t.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          t.status === 'active' ? 'bg-indigo-50 text-indigo-700 animate-pulse' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {t.status}
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

      {/* TAB 4: SERVICING & MAINTENANCE */}
      {activeTab === 'maintenance' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fleet Maintenance & Servicing Records</h3>
              <p className="text-xs text-slate-500">Preventive servicing, oil changes, dual-signed workshop certificates, and warranty records</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setJointServiceVehicle(null);
                  setIsJointServiceModalOpen(true);
                }}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Joint Driver & Mechanic Sign-Off</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenServiceModal()}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Routine Service</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Vehicle</th>
                  <th className="py-3 px-3">Service Title & Category</th>
                  <th className="py-3 px-3">Workshop & Technician</th>
                  <th className="py-3 px-3">Scheduled Date</th>
                  <th className="py-3 px-3">Odometer Milestone</th>
                  <th className="py-3 px-3 text-right">Cost</th>
                  <th className="py-3 px-3 text-center">Certification</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {maintenance.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {m.vehiclePlate}
                      </span>
                      <span className="block text-[10px] text-slate-500 truncate max-w-[120px]">{m.vehicleName}</span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-bold text-slate-900">{m.title}</span>
                      <span className="block text-[10px] text-slate-400 capitalize">{m.serviceType.replace(/_/g, ' ')}</span>
                      {m.issueFixed && (
                        <span className="block text-[10px] text-slate-600 italic truncate max-w-[220px]">
                          Fixed: {m.issueFixed}
                        </span>
                      )}
                      {m.partsReplaced && m.partsReplaced.length > 0 && (
                        <span className="block text-[10px] text-indigo-600 truncate max-w-[200px]">
                          Parts: {m.partsReplaced.join(', ')}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-medium text-slate-800">{m.serviceProvider}</span>
                      {m.mechanicName && (
                        <span className="block text-[10px] text-slate-500">Tech: {m.mechanicName}</span>
                      )}
                      {m.contactPhone && (
                        <span className="block text-[10px] text-slate-400">{m.contactPhone}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-slate-700">
                      {m.scheduledDate}
                      {m.completedDate && (
                        <span className="block text-[10px] text-emerald-600">Done: {m.completedDate}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-800">
                      {m.odometerAtService.toLocaleString()} KM
                      {m.nextServiceDueOdometer && (
                        <span className="block text-[10px] text-slate-400">Next: {m.nextServiceDueOdometer.toLocaleString()} KM</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatPrice(m.cost)}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                        m.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        m.status === 'in_progress' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {m.status.replace(/_/g, ' ')}
                      </span>
                      {(m.driverSignature || m.mechanicSignature) && (
                        <span className="block text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 mt-1">
                          ✓ Dual-Signed
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {m.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => handleMarkMaintenanceCompleted(m.id)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                          >
                            Mark Complete
                          </button>
                        )}
                        {(m.driverSignature || m.mechanicSignature || m.status === 'completed') && (
                          <button
                            type="button"
                            onClick={() => {
                              // Generate official certificate
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
                              doc.text(`OFFICIAL VEHICLE MAINTENANCE & WORKSHOP RECORD | WO #${m.invoiceNumber || 'WO-2026'}`, 14, 23);
                              doc.setTextColor(30, 41, 59);
                              doc.setFontSize(11);
                              doc.setFont('helvetica', 'bold');
                              doc.text(`Vehicle: ${m.vehiclePlate} — ${m.vehicleName}`, 14, 45);
                              doc.setFontSize(9);
                              doc.setFont('helvetica', 'normal');
                              doc.text(`Service Station: ${m.serviceProvider} | Lead Tech: ${m.mechanicName || 'Master Mechanic'}`, 14, 53);
                              doc.text(`Driver Signee: ${m.driverName || 'Fleet Driver'} | Odometer: ${m.odometerAtService.toLocaleString()} KM`, 14, 60);
                              doc.text(`Next Due Milestone: ${(m.nextServiceDueOdometer || m.odometerAtService + 5000).toLocaleString()} KM (Due: ${m.nextServiceDueDate || 'Within 90 Days'})`, 14, 67);
                              doc.text(`Total Cost: ${m.currency} ${m.cost.toLocaleString()}`, 14, 74);
                              if (m.issueFixed) {
                                doc.setFont('helvetica', 'bold');
                                doc.text('Resolved Issues & Servicing Notes:', 14, 84);
                                doc.setFont('helvetica', 'normal');
                                doc.text(doc.splitTextToSize(m.issueFixed, pw - 28), 14, 91);
                              }
                              doc.save(`Service_Record_${m.vehiclePlate}_${m.id}.pdf`);
                              showToast('✓ Service Certificate PDF downloaded.');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                            title="Download Service Certificate PDF"
                          >
                            <Download className="w-3 h-3 text-indigo-600" />
                            <span>PDF</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FUEL & FLEET EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fleet Fuel, Tolls & Operational Expenses</h3>
              <p className="text-xs text-slate-500">Complete vehicle expenditure audit synchronized with financial ledger</p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenExpenseModal()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Expense</span>
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Vehicle</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Vendor / Station</th>
                  <th className="py-3 px-3">Receipt / Voucher</th>
                  <th className="py-3 px-3">Driver</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-slate-600">{e.date}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{e.vehiclePlate}</td>
                    <td className="py-3 px-3 capitalize">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                        {e.expenseCategory.replace(/_/g, ' ')}
                      </span>
                      {e.litersPurchased && (
                        <span className="block text-[10px] text-slate-400">{e.litersPurchased} Liters</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-800">{e.vendorOrStation}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{e.receiptNumber || '-'}</td>
                    <td className="py-3 px-3 text-slate-700">{e.driverName || 'Depot'}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatPrice(e.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 capitalize">
                        {e.approvalStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: STATUTORY COMPLIANCE & RENEWALS */}
      {activeTab === 'compliance' && (
        <div className="space-y-5">
          {/* AI OCR SCANNER CALLOUT BANNER */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-indigo-600/40 border border-indigo-400/30 rounded-xl text-amber-300">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white">AI Document OCR & Statutory Date Parser</h3>
                  <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded text-[10px] font-mono">
                    Gemini 3.8 Flash Vision
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Upload a photo of your DVLA Roadworthiness Sticker or Vehicle Insurance Certificate. Gemini Vision automatically reads registration numbers, issues and expiry dates, and activates reminders exactly 1 month (30 days) prior to expiration.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setOcrDocType('auto');
                setOcrTargetVehicle(null);
                setIsOcrModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap self-start md:self-auto"
            >
              <Camera className="w-4 h-4 text-amber-300" />
              <span>Scan Paper / Sticker with AI</span>
            </button>
          </div>

          {/* ACTIVE 30-DAY STATUTORY RENEWAL REMINDERS PANEL */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Statutory Expiry & 30-Day Reminder Notifications</h3>
                  <p className="text-xs text-slate-500">
                    Vehicles requiring statutory inspection renewals or insurance endorsements within 30 days
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold">
                {kpiStats.urgentRenewals} Active Reminders
              </span>
            </div>

            {kpiStats.urgentRenewals === 0 ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All vehicles have valid roadworthiness certificates and insurance policies exceeding the 30-day reminder threshold.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {vehicles.map(v => {
                  const roadDays = getDaysRemaining(v.roadworthinessExpiryDate);
                  const insDays = getDaysRemaining(v.insuranceExpiryDate);
                  const isRoadUrgent = roadDays !== null && roadDays <= 30;
                  const isInsUrgent = insDays !== null && insDays <= 30;
                  if (!isRoadUrgent && !isInsUrgent) return null;

                  return (
                    <div key={'rem_' + v.id} className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-extrabold bg-slate-900 text-amber-400 px-2 py-0.5 rounded">
                          {v.plateNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{v.name}</span>
                      </div>

                      <div className="space-y-1.5 text-xs pt-1">
                        {isRoadUrgent && (
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200">
                            <div>
                              <span className="font-bold text-slate-800 block">DVLA Roadworthiness Sticker</span>
                              <span className="text-[10px] text-slate-500">Expires: {v.roadworthinessExpiryDate}</span>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold block ${
                                roadDays <= 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                              }`}>
                                {roadDays <= 0 ? '🚨 EXPIRED' : `⚠️ Reminder: ${roadDays} days left`}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setOcrDocType('roadworthiness');
                                  setOcrTargetVehicle(v);
                                  setIsOcrModalOpen(true);
                                }}
                                className="text-[10px] text-indigo-600 font-bold hover:underline mt-0.5 block"
                              >
                                Scan New Sticker
                              </button>
                            </div>
                          </div>
                        )}

                        {isInsUrgent && (
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200">
                            <div>
                              <span className="font-bold text-slate-800 block">Motor Insurance Policy</span>
                              <span className="text-[10px] text-slate-500">{v.insuranceProvider || 'Insurer'} — {v.insuranceExpiryDate}</span>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold block ${
                                insDays <= 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                              }`}>
                                {insDays <= 0 ? '🚨 EXPIRED' : `⚠️ Reminder: ${insDays} days left`}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setOcrDocType('insurance');
                                  setOcrTargetVehicle(v);
                                  setIsOcrModalOpen(true);
                                }}
                                className="text-[10px] text-indigo-600 font-bold hover:underline mt-0.5 block"
                              >
                                Scan Renewal Slip
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* MASTER FLEET COMPLIANCE MATRIX */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Commercial Vehicle Statutory & Insurance Registry</h3>
                <p className="text-xs text-slate-500">Track DVLA roadworthiness certificates, commercial insurance policies, and highway permits</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOcrDocType('auto');
                  setOcrTargetVehicle(null);
                  setIsOcrModalOpen(true);
                }}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upload & AI Parse</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicles.map(v => {
                const roadDays = getDaysRemaining(v.roadworthinessExpiryDate);
                const insDays = getDaysRemaining(v.insuranceExpiryDate);
                return (
                  <div key={v.id} className="border border-slate-200 rounded-2xl p-4.5 space-y-3 bg-slate-50/50 hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 bg-slate-900 text-amber-400 rounded">
                          {v.plateNumber}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{v.name}</h4>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{v.department}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                      {/* ROADWORTHINESS CARD */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Roadworthiness</span>
                          <button
                            type="button"
                            onClick={() => {
                              setOcrDocType('roadworthiness');
                              setOcrTargetVehicle(v);
                              setIsOcrModalOpen(true);
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                            title="Scan new roadworthiness document with AI"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Scan</span>
                          </button>
                        </div>
                        <span className="text-slate-800 font-bold block mt-1">{v.roadworthinessExpiryDate || 'Not Recorded'}</span>
                        {v.roadworthinessIssueDate && (
                          <span className="text-[10px] text-slate-400 block">Issued: {v.roadworthinessIssueDate}</span>
                        )}
                        <span className={`text-[10px] font-extrabold mt-1 block ${
                          roadDays !== null && roadDays <= 14 ? 'text-rose-600' :
                          roadDays !== null && roadDays <= 30 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {roadDays !== null ? (roadDays <= 0 ? '🚨 EXPIRED' : (roadDays <= 30 ? `⚠️ Reminder Active (${roadDays}d)` : `✓ ${roadDays} days remaining`)) : 'Pending Inspection'}
                        </span>
                        {v.roadworthinessDocUrl && (
                          <div className="pt-1">
                            <span className="text-[9px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">
                              Photo Attached
                            </span>
                          </div>
                        )}
                      </div>

                      {/* INSURANCE CARD */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Insurance Policy</span>
                          <button
                            type="button"
                            onClick={() => {
                              setOcrDocType('insurance');
                              setOcrTargetVehicle(v);
                              setIsOcrModalOpen(true);
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                            title="Scan new insurance policy with AI"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Scan</span>
                          </button>
                        </div>
                        <span className="text-slate-800 font-bold block mt-1">{v.insuranceExpiryDate || 'Not Recorded'}</span>
                        {v.insuranceProvider && (
                          <span className="text-[10px] text-slate-500 truncate block">{v.insuranceProvider}</span>
                        )}
                        <span className={`text-[10px] font-extrabold mt-1 block ${
                          insDays !== null && insDays <= 14 ? 'text-rose-600' :
                          insDays !== null && insDays <= 30 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {insDays !== null ? (insDays <= 0 ? '🚨 EXPIRED' : (insDays <= 30 ? `⚠️ Reminder Active (${insDays}d)` : `✓ ${insDays} days remaining`)) : 'Pending Policy'}
                        </span>
                        {v.insuranceDocUrl && (
                          <div className="pt-1">
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold">
                              Policy Slip Attached
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {v.insurancePolicyNo && (
                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span>Policy No: <strong className="text-slate-700 font-mono">{v.insurancePolicyNo}</strong></span>
                        <span className="text-[10px] text-slate-400">30-day reminder enabled</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: DRIVER LICENSES & CREDENTIALS REGISTRY */}
      {activeTab === 'licenses' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Driver's License & Statutory Credentials Registry</h3>
              <p className="text-xs text-slate-500">
                Official DVLA driver licenses, authorization classes, scanned photos, and automatic 30-day renewal countdowns
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setOcrDocType('license');
                  setOcrTargetLicense(null);
                  setIsOcrModalOpen(true);
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Scan Driver Card</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNewLicenseModalOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Driver's License</span>
              </button>
            </div>
          </div>

          {/* LICENSES GRID / TABLE */}
          {driverLicenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No driver licenses uploaded or registered yet. Click "Register Driver's License" or "AI Scan Driver Card" to record the first credential.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {driverLicenses.map(lic => {
                const days = getDaysRemaining(lic.expiryDate);
                const isExpiring = days !== null && days <= 30;
                const isExpired = days !== null && days <= 0;

                return (
                  <div key={lic.id} className="border border-slate-200 rounded-2xl p-4.5 space-y-3 bg-slate-50/50 hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shadow-xs">
                          {lic.driverName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{lic.driverName}</h4>
                          <span className="text-[11px] font-mono text-slate-500 font-semibold">{lic.licenseNumber}</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold capitalize ${
                        isExpired ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        isExpiring ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                        'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isExpired ? '🚨 Expired' : isExpiring ? `⚠️ Reminder Active (${days}d)` : `✓ Valid (${days}d)`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">License Class</span>
                        <span className="text-slate-800 font-bold block mt-0.5">{lic.licenseClass}</span>
                        <span className="text-[10px] text-slate-500 block">{lic.issuingAuthority}</span>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Validity Window</span>
                        <span className="text-slate-800 font-bold block mt-0.5">Expires: {lic.expiryDate}</span>
                        <span className="text-[10px] text-slate-500 block">Issued: {lic.issueDate}</span>
                      </div>
                    </div>

                    {/* CARD PHOTOS PREVIEW */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-slate-500" />
                          <span>License Physical Card Images</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setOcrDocType('license');
                            setOcrTargetLicense(lic);
                            setIsOcrModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          Upload / Re-Scan
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        {lic.frontImageUrl ? (
                          <img
                            src={lic.frontImageUrl}
                            alt="License front"
                            className="h-16 w-24 object-cover rounded-lg border border-slate-200 shadow-xs"
                          />
                        ) : (
                          <div className="h-16 w-24 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400 bg-slate-50 text-center px-1">
                            Front Photo Pending
                          </div>
                        )}

                        {lic.backImageUrl ? (
                          <img
                            src={lic.backImageUrl}
                            alt="License back"
                            className="h-16 w-24 object-cover rounded-lg border border-slate-200 shadow-xs"
                          />
                        ) : (
                          <div className="h-16 w-24 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400 bg-slate-50 text-center px-1">
                            Back Photo Pending
                          </div>
                        )}

                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          {lic.emergencyContact && (
                            <div>Next of Kin: <strong className="text-slate-700">{lic.emergencyContact}</strong></div>
                          )}
                          {lic.emergencyPhone && (
                            <div>Contact: <strong className="text-slate-700">{lic.emergencyPhone}</strong></div>
                          )}
                          {lic.bloodGroup && (
                            <div>Blood Group: <strong className="text-slate-700">{lic.bloodGroup}</strong></div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400">
                        {lic.verifiedBy ? `Verified by ${lic.verifiedBy}` : 'Self-declared by driver'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove driver license record for ${lic.driverName}?`)) {
                            dataStore.deleteDriverLicense(lic.id);
                            showToast('✓ License record removed.');
                          }
                        }}
                        className="text-rose-500 hover:text-rose-700 font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: DRIVER FAULT TICKETS */}
      {activeTab === 'issues' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="pb-4 border-b border-slate-200 mb-4">
            <h3 className="text-sm font-bold text-slate-900">Driver-Reported Vehicle Issues & Faults</h3>
            <p className="text-xs text-slate-500">Mechanical issues and road fault tickets submitted directly by drivers</p>
          </div>

          <div className="space-y-3">
            {issues.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No active vehicle issues reported by drivers. All fleet vehicles reported operational!
              </div>
            ) : (
              issues.map(iss => (
                <div key={iss.id} className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                        {iss.vehiclePlate}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        iss.severity === 'critical' ? 'bg-rose-100 text-rose-800' :
                        iss.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        iss.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {iss.severity} Priority
                      </span>
                      <span className="text-xs text-slate-500">Reported by <strong>{iss.driverName}</strong></span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{iss.issueTitle}</h4>
                    <p className="text-xs text-slate-600">{iss.description}</p>
                    {iss.resolutionNotes && (
                      <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg mt-2">
                        Resolution: {iss.resolutionNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {iss.status !== 'resolved' ? (
                      <button
                        type="button"
                        onClick={() => {
                          const resNotes = prompt('Enter resolution notes:', 'Inspected and repaired by mechanics.');
                          if (resNotes) {
                            dataStore.updateVehicleIssueStatus(iss.id, 'resolved', resNotes);
                            showToast('✓ Issue marked as resolved.');
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        Resolve Fault
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* REGISTER VEHICLE MODAL */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-lg">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Register New Fleet Asset</h3>
                  <p className="text-[10px] text-slate-400">Add commercial vehicle to enterprise registry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRegisterVehicle} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Vehicle Name / Label *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toyota Hilux 4x4 Double Cabin"
                    value={newVehName}
                    onChange={(e) => setNewVehName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">License Plate No. *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GW-4920-24"
                    value={newVehPlate}
                    onChange={(e) => setNewVehPlate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 font-mono font-bold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Make</label>
                  <input
                    type="text"
                    required
                    value={newVehMake}
                    onChange={(e) => setNewVehMake(e.target.value)}
                    placeholder="Toyota"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Model</label>
                  <input
                    type="text"
                    required
                    value={newVehModel}
                    onChange={(e) => setNewVehModel(e.target.value)}
                    placeholder="Hilux 2.8 D-4D"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Year</label>
                  <input
                    type="number"
                    value={newVehYear}
                    onChange={(e) => setNewVehYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Body Type</label>
                  <select
                    value={newVehType}
                    onChange={(e) => setNewVehType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                  >
                    <option value="pickup">Pickup Truck</option>
                    <option value="van">Cargo Van</option>
                    <option value="truck">Heavy Flatbed / Truck</option>
                    <option value="suv">SUV</option>
                    <option value="sedan">Sedan</option>
                    <option value="bus">Staff / Passenger Bus</option>
                    <option value="motorcycle">Motorcycle</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Fuel Type</label>
                  <select
                    value={newVehFuel}
                    onChange={(e) => setNewVehFuel(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                  >
                    <option value="diesel">Diesel</option>
                    <option value="petrol">Petrol (Gasoline)</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="electric">Electric (EV)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Current Odometer (KM)</label>
                  <input
                    type="number"
                    value={newVehOdo}
                    onChange={(e) => setNewVehOdo(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Assign Primary Driver</label>
                  <select
                    value={newVehDriverId}
                    onChange={(e) => setNewVehDriverId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  >
                    <option value="">-- No Driver Assigned --</option>
                    {staffList.map(s => (
                      <option key={s.uid} value={s.uid}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Department</label>
                  <input
                    type="text"
                    value={newVehDept}
                    onChange={(e) => setNewVehDept(e.target.value)}
                    placeholder="Logistics & Delivery"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Roadworthiness Expiry Date</label>
                  <input
                    type="date"
                    value={newVehRoadworthyExpiry}
                    onChange={(e) => setNewVehRoadworthyExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Insurance Expiry Date</label>
                  <input
                    type="date"
                    value={newVehInsuranceExpiry}
                    onChange={(e) => setNewVehInsuranceExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Save Vehicle to Fleet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE SERVICE MODAL */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-600 rounded-lg">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Schedule Maintenance & Servicing</h3>
                  <p className="text-[10px] text-slate-400">Create workshop booking and service milestones</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleScheduleService} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Target Vehicle *</label>
                <select
                  value={servVehicleId}
                  onChange={(e) => {
                    setServVehicleId(e.target.value);
                    const match = vehicles.find(v => v.id === e.target.value);
                    if (match) {
                      setServOdometer(match.currentOdometer);
                      setServNextDueOdo(match.currentOdometer + 10000);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} - {v.name} ({v.currentOdometer.toLocaleString()} KM)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Service Type *</label>
                  <select
                    value={servType}
                    onChange={(e) => setServType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                  >
                    <option value="routine_scheduled">Routine Scheduled Service</option>
                    <option value="oil_and_filters">Oil & Filter Replacement</option>
                    <option value="brake_service">Brake Pad & Disc Overhaul</option>
                    <option value="tire_replacement">Tire Replacement & Balancing</option>
                    <option value="engine_transmission">Engine & Transmission Work</option>
                    <option value="electrical_battery">Electrical & Battery System</option>
                    <option value="body_suspension">Suspension & Body Alignment</option>
                    <option value="emergency_breakdown">Emergency Breakdown Repair</option>
                    <option value="statutory_inspection">DVLA Statutory Inspection</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Service Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50,000 KM Major Preventive Service"
                    value={servTitle}
                    onChange={(e) => setServTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Workshop / Service Provider *</label>
                  <input
                    type="text"
                    required
                    value={servWorkshop}
                    onChange={(e) => setServWorkshop(e.target.value)}
                    placeholder="Toyota Ghana Authorized Center"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Workshop Phone</label>
                  <input
                    type="text"
                    value={servPhone}
                    onChange={(e) => setServPhone(e.target.value)}
                    placeholder="+233 30 222 1316"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={servDate}
                    onChange={(e) => setServDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Service Odometer (KM)</label>
                  <input
                    type="number"
                    value={servOdometer}
                    onChange={(e) => setServOdometer(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Estimated Cost (GHS)</label>
                  <input
                    type="number"
                    value={servCost}
                    onChange={(e) => setServCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Parts to Replace (comma-separated)</label>
                <input
                  type="text"
                  value={servParts}
                  onChange={(e) => setServParts(e.target.value)}
                  placeholder="Engine Oil, Filter, Brake Pads"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md"
                >
                  Confirm Workshop Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 rounded-lg">
                  <Fuel className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Log Vehicle Operational Expense</h3>
                  <p className="text-[10px] text-slate-400">Record fuel purchases, tolls, and maintenance vouchers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleLogExpense} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Target Vehicle *</label>
                <select
                  value={expVehicleId}
                  onChange={(e) => setExpVehicleId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} - {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Expense Category *</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                  >
                    <option value="fuel">Fuel Purchase (Diesel / Petrol)</option>
                    <option value="toll">Expressway / Highway Toll Fee</option>
                    <option value="maintenance_minor">Minor Road Repair</option>
                    <option value="insurance_renewal">Insurance Policy Renewal</option>
                    <option value="roadworthiness_fees">DVLA Inspection Fee</option>
                    <option value="parking">Commercial Parking</option>
                    <option value="car_wash">Car Wash / Detailing</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Amount (GHS) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Vendor / Fuel Station</label>
                  <input
                    type="text"
                    value={expVendor}
                    onChange={(e) => setExpVendor(e.target.value)}
                    placeholder="Shell Ghana Airport City"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Receipt / Voucher No.</label>
                  <input
                    type="text"
                    value={expReceipt}
                    onChange={(e) => setExpReceipt(e.target.value)}
                    placeholder="SHL-992140"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono"
                  />
                </div>
              </div>

              {expCategory === 'fuel' && (
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Liters (Optional)</label>
                  <input
                    type="text"
                    value={expLiters}
                    onChange={(e) => setExpLiters(e.target.value)}
                    placeholder="35.5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI DOCUMENT OCR & STATUTORY DATE PARSER MODAL */}
      <DocumentOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        documentType={ocrDocType}
        targetVehicle={ocrTargetVehicle}
        targetDriverLicense={ocrTargetLicense}
        allVehicles={vehicles}
        onScanComplete={(result) => {
          showToast(`✓ AI extracted ${result.detectedType} details: Expiry ${result.expiryDate}. 30-day reminder configured.`);
        }}
      />

      {/* JOINT DRIVER & MECHANIC SERVICING SIGN-OFF MODAL */}
      <JointServiceSignOffModal
        isOpen={isJointServiceModalOpen}
        onClose={() => setIsJointServiceModalOpen(false)}
        activeUser={activeUser}
        initialVehicle={jointServiceVehicle}
        allVehicles={vehicles}
        onServiceSaved={(maint) => {
          showToast(`✓ Dual-signed servicing certificate created for ${maint.vehiclePlate}. Next change: ${maint.nextServiceDueOdometer} KM.`);
        }}
      />

      {/* NEW DRIVER'S LICENSE REGISTRATION MODAL */}
      {isNewLicenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-lg">
                  <UserCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Register Driver's License & Credentials</h3>
                  <p className="text-[11px] text-slate-300">Set statutory class, validity dates & activate 30-day renewal alerts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewLicenseModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newLicNumber.trim()) {
                  showToast('⚠️ Please enter a license number.');
                  return;
                }
                const matchedDriver = staffList.find(s => s.uid === newLicDriverId);
                const days = getDaysRemaining(newLicExpiryDate);
                dataStore.addDriverLicense({
                  driverId: newLicDriverId || activeUser.uid,
                  driverName: matchedDriver?.name || activeUser.name,
                  driverEmail: matchedDriver?.email,
                  licenseNumber: newLicNumber.trim().toUpperCase(),
                  licenseClass: newLicClass,
                  issueDate: newLicIssueDate,
                  expiryDate: newLicExpiryDate,
                  issuingAuthority: newLicAuthority.trim(),
                  emergencyContact: newLicEmergency.trim() || undefined,
                  emergencyPhone: newLicEmergencyPhone.trim() || undefined,
                  notes: newLicNotes.trim() || undefined,
                  status: days !== null && days <= 30 ? (days <= 0 ? 'expired' : 'expiring_soon') : 'valid',
                  reminderActive: days !== null && days <= 30,
                  verifiedBy: activeUser.name,
                  verifiedAt: new Date().toISOString()
                });
                setIsNewLicenseModalOpen(false);
                setNewLicNumber('');
                showToast('✓ Driver license registered with 30-day expiry reminder.');
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Assigned Fleet Driver <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newLicDriverId}
                  onChange={(e) => setNewLicDriverId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold"
                  required
                >
                  <option value="">-- Choose employee / driver --</option>
                  {staffList.map(s => (
                    <option key={s.uid} value={s.uid}>
                      {s.name} ({s.role}) - {s.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    License Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newLicNumber}
                    onChange={(e) => setNewLicNumber(e.target.value.toUpperCase())}
                    placeholder="DL-GHA-109284"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">License Class</label>
                  <select
                    value={newLicClass}
                    onChange={(e) => setNewLicClass(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold"
                  >
                    <option value="Class B (Private/Light)">Class B (Private / Light Vehicles)</option>
                    <option value="Class C (Commercial)">Class C (Commercial Pickups & Vans)</option>
                    <option value="Class D (Heavy Goods)">Class D (Heavy Goods & Flatbeds)</option>
                    <option value="Class F (Articulated)">Class F (Articulated Freight Trucks)</option>
                    <option value="Motorcycle">Class A (Motorcycle / Delivery Dispatch)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={newLicIssueDate}
                    onChange={(e) => setNewLicIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Expiry Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newLicExpiryDate}
                    onChange={(e) => setNewLicExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 bg-amber-50/50"
                    required
                  />
                  <span className="block text-[10px] text-amber-700 mt-0.5">
                    Reminders activate 1 month before expiry
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Issuing Authority / Station</label>
                <input
                  type="text"
                  value={newLicAuthority}
                  onChange={(e) => setNewLicAuthority(e.target.value)}
                  placeholder="e.g. DVLA - 37 Station, Accra"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Emergency Contact (Next of Kin)</label>
                  <input
                    type="text"
                    value={newLicEmergency}
                    onChange={(e) => setNewLicEmergency(e.target.value)}
                    placeholder="Spouse / Parent name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={newLicEmergencyPhone}
                    onChange={(e) => setNewLicEmergencyPhone(e.target.value)}
                    placeholder="+233 24 000 0000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewLicenseModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Register License & Set Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
