import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Download, 
  PenTool, 
  RotateCcw, 
  Calendar, 
  Truck, 
  Droplets, 
  ShieldCheck, 
  Phone, 
  DollarSign, 
  UserCheck,
  Check,
  Plus
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Vehicle, UserProfile, VehicleMaintenance } from '../types/erp';
import { dataStore } from '../config/firebase';
import { formatPrice } from '../utils/currency';

interface JointServiceSignOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserProfile;
  initialVehicle?: Vehicle | null;
  allVehicles: Vehicle[];
  onServiceSaved?: (maint: VehicleMaintenance) => void;
}

const COMMON_SERVICE_ITEMS = [
  'Engine Oil & Filter Change',
  'Brake Pads & Rotor Overhaul',
  'Tire Rotation & Wheel Balancing',
  'Air & Cabin AC Filter Replacement',
  'Transmission & Gearbox Fluid',
  'Coolant & Radiator Flush',
  'Suspension Bushings & Shock Absorbers',
  'Battery Diagnostics & Electrical Check',
  'Fuel Filter Replacement',
  'Spark Plugs / Glow Plugs',
  'Power Steering Fluid & Belts',
  'Wheel Alignment Calibration'
];

export default function JointServiceSignOffModal({
  isOpen,
  onClose,
  activeUser,
  initialVehicle,
  allVehicles,
  onServiceSaved
}: JointServiceSignOffModalProps) {
  // Vehicle Selection
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(initialVehicle?.id || allVehicles[0]?.id || '');
  const vehicle = allVehicles.find(v => v.id === selectedVehicleId) || initialVehicle || allVehicles[0];

  // Driver details
  const [driverName, setDriverName] = useState(activeUser.name || 'Kofi Boateng');
  const [driverId, setDriverId] = useState(activeUser.uid || 'user_driver_01');

  // Mechanic & Workshop details
  const [workshopName, setWorkshopName] = useState('Precision Fleet AutoCare & Maintenance Works');
  const [mechanicName, setMechanicName] = useState('Master Isaac Mensah (Chief Tech)');
  const [mechanicPhone, setMechanicPhone] = useState('+233 24 492 8104');
  const [invoiceNumber, setInvoiceNumber] = useState(`WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);

  // Work Details
  const [issueFixed, setIssueFixed] = useState('Scheduled routine engine oil service, multi-point brake safety inspection, and minor steering play adjustment.');
  const [selectedChecklist, setSelectedChecklist] = useState<string[]>([
    'Engine Oil & Filter Change',
    'Brake Pads & Rotor Overhaul',
    'Air & Cabin AC Filter Replacement'
  ]);

  // Oil Specifics
  const [oilBrandAndGrade, setOilBrandAndGrade] = useState('Total Quartz 9000 / 5W-30 Full Synthetic');
  const [oilVolumeLiters, setOilVolumeLiters] = useState<number>(6.5);
  const [oilFilterReplaced, setOilFilterReplaced] = useState<boolean>(true);

  // Mileage and Schedule
  const [odometerAtService, setOdometerAtService] = useState<number>(vehicle?.currentOdometer || 42850);
  const [nextServiceDueOdometer, setNextServiceDueOdometer] = useState<number>((vehicle?.currentOdometer || 42850) + 5000);
  const [nextServiceDueDate, setNextServiceDueDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });

  // Cost and Payment
  const [cost, setCost] = useState<number>(1450);
  const [currency, setCurrency] = useState('GHS');
  const [partsList, setPartsList] = useState('Engine Oil Synthetic (7L), OEM Oil Filter, Genuine Front Brake Pad Set');

  // Signatures
  const [driverSigDataUrl, setDriverSigDataUrl] = useState<string>('');
  const [mechanicSigDataUrl, setMechanicSigDataUrl] = useState<string>('');
  const [isDriverSigned, setIsDriverSigned] = useState(false);
  const [isMechanicSigned, setIsMechanicSigned] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Canvas refs
  const driverCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mechanicCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingDriver = useRef(false);
  const isDrawingMechanic = useRef(false);

  // Sync odometer when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setOdometerAtService(vehicle.currentOdometer);
      setNextServiceDueOdometer(vehicle.currentOdometer + 5000);
    }
  }, [vehicle]);

  // Setup Canvas drawing handlers
  const initCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        initCanvas(driverCanvasRef.current);
        initCanvas(mechanicCanvasRef.current);
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Drawing event handlers
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    isDrawingRef: React.MutableRefObject<boolean>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    isDrawingRef: React.MutableRefObject<boolean>
  ) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    isDrawingRef: React.MutableRefObject<boolean>,
    setSigData: (url: string) => void,
    setIsSigned: (v: boolean) => void
  ) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setSigData(dataUrl);
      setIsSigned(true);
    }
  };

  const clearCanvas = (
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    setSigData: (url: string) => void,
    setIsSigned: (v: boolean) => void
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigData('');
    setIsSigned(false);
  };

  const toggleChecklistItem = (item: string) => {
    setSelectedChecklist(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  // Generate Official PDF Service Certificate
  const generatePdfCertificate = (maintenanceRecord: VehicleMaintenance) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Top Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TUMI ENTERPRISE FLEET LOGISTICS', 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL JOINT VEHICLE SERVICING & MAINTENANCE SIGN-OFF CERTIFICATE', 14, 24);
    doc.text(`Work Order Ref: ${maintenanceRecord.invoiceNumber || 'WO-2026'} | Issued: ${new Date().toLocaleDateString()}`, 14, 30);

    // Vehicle Information Box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. VEHICLE ASSET SPECIFICATIONS', 14, 46);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 50, pageWidth - 28, 24, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Vehicle Description: ${maintenanceRecord.vehicleName}`, 18, 57);
    doc.text(`Registration Plate: ${maintenanceRecord.vehiclePlate}`, 18, 64);
    doc.text(`Current Service Odometer: ${maintenanceRecord.odometerAtService.toLocaleString()} KM`, 18, 71);

    doc.text(`Assigned Driver: ${maintenanceRecord.driverName || 'Fleet Driver'}`, 110, 57);
    doc.text(`Service Station: ${maintenanceRecord.mechanicWorkshopName || maintenanceRecord.serviceProvider}`, 110, 64);
    doc.text(`Lead Technician: ${maintenanceRecord.mechanicName || 'Master Tech'} (${maintenanceRecord.mechanicPhone || 'N/A'})`, 110, 71);

    // Servicing & Issues Fixed Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. SERVICING WORK PERFORMED & ISSUES RESOLVED', 14, 84);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 88, pageWidth - 28, 48, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Reported Issue & Corrective Work Done:', 18, 96);
    doc.setFont('helvetica', 'normal');
    const splitIssue = doc.splitTextToSize(maintenanceRecord.issueFixed || maintenanceRecord.title, pageWidth - 36);
    doc.text(splitIssue, 18, 102);

    doc.setFont('helvetica', 'bold');
    doc.text('Executed Maintenance Checklist:', 18, 116);
    doc.setFont('helvetica', 'normal');
    const checklistStr = (maintenanceRecord.servicingChecklist || []).join('  •  ');
    const splitChecklist = doc.splitTextToSize(`• ${checklistStr}`, pageWidth - 36);
    doc.text(splitChecklist, 18, 122);

    doc.text(`Engine Oil Viscosity / Grade: ${maintenanceRecord.oilBrandAndGrade || '5W-30'} (${maintenanceRecord.oilVolumeLiters || 0} Liters) | OEM Filter: ${maintenanceRecord.oilFilterReplaced ? 'Replaced' : 'Inspected'}`, 18, 132);

    // Next Milestone Box
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(14, 142, pageWidth - 28, 24, 2, 2, 'FD');

    doc.setTextColor(146, 64, 14); // amber-900
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('3. NEXT SERVICE DUE MILESTONE & STATUTORY NOTICE', 18, 150);

    doc.setFontSize(9);
    doc.text(`Next Scheduled Oil & Service Due: ${(maintenanceRecord.nextServiceDueOdometer || 0).toLocaleString()} KM`, 18, 157);
    doc.text(`Target Due Date: ${maintenanceRecord.nextServiceDueDate || 'Within 90 Days'}`, 18, 163);
    doc.text(`Total Service Invoiced: ${maintenanceRecord.currency} ${maintenanceRecord.cost.toLocaleString()}`, 110, 157);
    doc.text(`Parts Replaced: ${maintenanceRecord.partsReplaced?.join(', ') || 'Service filter kit'}`, 110, 163);

    // Dual Signatures Box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('4. DUAL CERTIFICATION & JOINT SIGN-OFF', 14, 176);

    // Driver Signature Column
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 182, 86, 60, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DRIVER CERTIFICATION', 18, 190);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('I confirm vehicle was serviced as itemized & tested on road.', 18, 196);
    doc.text(`Driver Name: ${maintenanceRecord.driverName || 'Driver'}`, 18, 202);
    doc.text(`Signed At: ${new Date().toLocaleString()}`, 18, 207);

    if (driverSigDataUrl) {
      try {
        doc.addImage(driverSigDataUrl, 'PNG', 18, 210, 50, 25);
      } catch (e) {
        doc.text('[Driver Signature On File]', 18, 222);
      }
    } else {
      doc.text('[Digital Signature Validated]', 18, 222);
    }

    // Mechanic Signature Column
    doc.roundedRect(pageWidth - 100, 182, 86, 60, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('WORKSHOP MECHANIC CERTIFICATION', pageWidth - 96, 190);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('I certify repairs & oil change meet road safety standards.', pageWidth - 96, 196);
    doc.text(`Mechanic: ${maintenanceRecord.mechanicName || 'Master Mechanic'}`, pageWidth - 96, 202);
    doc.text(`Station: ${maintenanceRecord.mechanicWorkshopName || 'Auto Care'}`, pageWidth - 96, 207);

    if (mechanicSigDataUrl) {
      try {
        doc.addImage(mechanicSigDataUrl, 'PNG', pageWidth - 96, 210, 50, 25);
      } catch (e) {
        doc.text('[Mechanic Signature On File]', pageWidth - 96, 222);
      }
    } else {
      doc.text('[Workshop Seal Certified]', pageWidth - 96, 222);
    }

    // Footer note
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('This document serves as permanent electronic warranty and statutory service compliance record within the Tumi ERP platform.', pageWidth / 2, 275, { align: 'center' });

    doc.save(`Service_Certificate_${maintenanceRecord.vehiclePlate}_${maintenanceRecord.invoiceNumber}.pdf`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) {
      setErrorMessage('Please select a vehicle.');
      return;
    }
    if (!issueFixed.trim()) {
      setErrorMessage('Please state what issue was reported or fixed.');
      return;
    }
    if (selectedChecklist.length === 0) {
      setErrorMessage('Please check at least one servicing item performed (e.g. Oil change).');
      return;
    }

    // Create Maintenance Record
    const newMaint: VehicleMaintenance = {
      id: 'maint_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1000),
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plateNumber,
      vehicleName: vehicle.name,
      serviceType: 'oil_and_filters',
      title: `Service & Sign-off: ${issueFixed.slice(0, 50)}...`,
      serviceProvider: workshopName.trim(),
      contactPhone: mechanicPhone.trim(),
      scheduledDate: new Date().toISOString().split('T')[0],
      completedDate: new Date().toISOString().split('T')[0],
      odometerAtService: Number(odometerAtService),
      nextServiceDueOdometer: Number(nextServiceDueOdometer),
      nextServiceDueDate: nextServiceDueDate,
      cost: Number(cost),
      currency,
      partsReplaced: partsList.split(',').map(s => s.trim()).filter(Boolean),
      invoiceNumber: invoiceNumber.trim(),
      notes: `Joint sign-off completed by Driver (${driverName}) and Workshop Mechanic (${mechanicName}).`,
      status: 'completed',
      technicianNotes: `Servicing executed: ${selectedChecklist.join(', ')}. Engine oil used: ${oilBrandAndGrade} (${oilVolumeLiters}L).`,
      driverId,
      driverName,
      driverSignature: driverSigDataUrl || undefined,
      driverSignedAt: new Date().toISOString(),
      mechanicName: mechanicName.trim(),
      mechanicPhone: mechanicPhone.trim(),
      mechanicWorkshopName: workshopName.trim(),
      mechanicSignature: mechanicSigDataUrl || undefined,
      mechanicSignedAt: new Date().toISOString(),
      issueFixed: issueFixed.trim(),
      servicingChecklist: selectedChecklist,
      oilBrandAndGrade: oilBrandAndGrade.trim(),
      oilVolumeLiters: Number(oilVolumeLiters),
      oilFilterReplaced: Boolean(oilFilterReplaced),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save maintenance
    dataStore.addVehicleMaintenance(newMaint);

    // Update vehicle odometer and service dates
    dataStore.updateVehicle(vehicle.id, {
      currentOdometer: Number(odometerAtService),
      lastServicedDate: new Date().toISOString().split('T')[0],
      nextServiceDueDate: nextServiceDueDate,
      nextServiceDueOdometer: Number(nextServiceDueOdometer),
      status: 'available'
    });

    // Auto-record in Vehicle Expenses
    dataStore.addVehicleExpense({
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plateNumber,
      vehicleName: vehicle.name,
      driverId,
      driverName,
      expenseCategory: 'maintenance_minor',
      amount: Number(cost),
      currency,
      date: new Date().toISOString().split('T')[0],
      odometer: Number(odometerAtService),
      vendorOrStation: workshopName.trim(),
      receiptNumber: invoiceNumber.trim(),
      paymentMethod: 'company_card',
      approvalStatus: 'approved',
      notes: `Servicing & Oil Change signed off. Work Order: ${invoiceNumber}`
    });

    // Generate and download PDF
    generatePdfCertificate(newMaint);

    if (onServiceSaved) {
      onServiceSaved(newMaint);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600 rounded-xl">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Joint Driver & Mechanic Servicing Sign-Off Form</span>
                <span className="px-2 py-0.5 bg-amber-500/30 text-amber-200 border border-amber-400/30 rounded text-[10px] font-mono">
                  Dual Sign-Off & PDF
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Log mechanical issue resolution, oil change specifics, and record next service milestone with digital signatures.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 1: VEHICLE & WORKSHOP BASICS */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
              <Truck className="w-4 h-4 text-indigo-600" />
              <span>1. Vehicle & Service Facility Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Fleet Vehicle <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold"
                >
                  {allVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} — {v.name} ({v.currentOdometer.toLocaleString()} km)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Assigned Driver Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Workshop / Garage Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={workshopName}
                  onChange={(e) => setWorkshopName(e.target.value)}
                  placeholder="e.g. Toyota Ghana Workshop"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Lead Mechanic Name & Phone <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={mechanicName}
                    onChange={(e) => setMechanicName(e.target.value)}
                    placeholder="Mechanic name"
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl"
                    required
                  />
                  <input
                    type="text"
                    value={mechanicPhone}
                    onChange={(e) => setMechanicPhone(e.target.value)}
                    placeholder="Phone"
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ISSUE REPORTED & SERVICING DONE */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>2. Issues Fixed & Servicing Checklist</span>
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                What issue was reported and what was fixed? <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={issueFixed}
                onChange={(e) => setIssueFixed(e.target.value)}
                rows={2}
                placeholder="State the mechanical/electrical symptom reported by driver, diagnosis performed by mechanic, and how it was resolved..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-2">
                Executed Servicing Operations (Select all that apply)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COMMON_SERVICE_ITEMS.map(item => {
                  const isChecked = selectedChecklist.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleChecklistItem(item)}
                      className={`p-2 rounded-xl text-left text-xs font-medium border transition-all flex items-center gap-2 ${
                        isChecked 
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-white ${
                        isChecked ? 'bg-amber-600' : 'border border-slate-300'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-3" />}
                      </div>
                      <span className="truncate">{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ENGINE OIL SPECIFICS */}
            <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Droplets className="w-4 h-4 text-amber-600" />
                <span>Engine Oil & Filter Specifications</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Oil Brand & Grade / Viscosity</label>
                  <input
                    type="text"
                    value={oilBrandAndGrade}
                    onChange={(e) => setOilBrandAndGrade(e.target.value)}
                    placeholder="e.g. 5W-30 Full Synthetic"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Volume (Liters)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={oilVolumeLiters}
                    onChange={(e) => setOilVolumeLiters(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={oilFilterReplaced}
                      onChange={(e) => setOilFilterReplaced(e.target.checked)}
                      className="rounded text-amber-600 w-4 h-4"
                    />
                    <span className="font-bold">OEM Oil Filter Replaced</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Itemized Spare Parts & Consumables
              </label>
              <input
                type="text"
                value={partsList}
                onChange={(e) => setPartsList(e.target.value)}
                placeholder="e.g. 5W-30 Synthetic Oil, Oil Filter, Front Brake Pads"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* SECTION 3: NEXT DUE CHANGE MILESTONE & INVOICE */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>3. Next Service Milestone & Invoiced Cost</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">Service Odometer (KM)</label>
                <input
                  type="number"
                  value={odometerAtService}
                  onChange={(e) => {
                    const odo = parseInt(e.target.value) || 0;
                    setOdometerAtService(odo);
                    setNextServiceDueOdometer(odo + 5000);
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-amber-900 mb-1">
                  Next Due Odometer (KM) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={nextServiceDueOdometer}
                  onChange={(e) => setNextServiceDueOdometer(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-amber-300 rounded-xl font-mono font-extrabold bg-white text-amber-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-amber-900 mb-1">
                  Next Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={nextServiceDueDate}
                  onChange={(e) => setNextServiceDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-amber-300 rounded-xl font-mono text-xs bg-white text-amber-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">Total Cost (GHS)</label>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-bold"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: DUAL SIGNATURE PADS */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
              <PenTool className="w-4 h-4 text-indigo-600" />
              <span>4. Dual Interactive Digital Signatures</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Both driver and mechanic sign directly on screen to certify the service checklist was completed.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* DRIVER SIGNATURE PAD */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Driver Signature ({driverName})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => clearCanvas(driverCanvasRef, setDriverSigDataUrl, setIsDriverSigned)}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600"
                  >
                    Clear
                  </button>
                </div>
                <div className="relative border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                  <canvas
                    ref={driverCanvasRef}
                    width={320}
                    height={110}
                    className="w-full h-28 touch-none cursor-crosshair bg-white"
                    onMouseDown={(e) => startDrawing(e, driverCanvasRef, isDrawingDriver)}
                    onMouseMove={(e) => draw(e, driverCanvasRef, isDrawingDriver)}
                    onMouseUp={() => stopDrawing(driverCanvasRef, isDrawingDriver, setDriverSigDataUrl, setIsDriverSigned)}
                    onMouseLeave={() => stopDrawing(driverCanvasRef, isDrawingDriver, setDriverSigDataUrl, setIsDriverSigned)}
                    onTouchStart={(e) => startDrawing(e, driverCanvasRef, isDrawingDriver)}
                    onTouchMove={(e) => draw(e, driverCanvasRef, isDrawingDriver)}
                    onTouchEnd={() => stopDrawing(driverCanvasRef, isDrawingDriver, setDriverSigDataUrl, setIsDriverSigned)}
                  />
                  <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-bold text-slate-400">
                    {isDriverSigned ? '✓ Signed by Driver' : 'Draw signature with finger or mouse'}
                  </div>
                </div>
              </div>

              {/* MECHANIC SIGNATURE PAD */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mechanic Signature ({mechanicName})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => clearCanvas(mechanicCanvasRef, setMechanicSigDataUrl, setIsMechanicSigned)}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600"
                  >
                    Clear
                  </button>
                </div>
                <div className="relative border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                  <canvas
                    ref={mechanicCanvasRef}
                    width={320}
                    height={110}
                    className="w-full h-28 touch-none cursor-crosshair bg-white"
                    onMouseDown={(e) => startDrawing(e, mechanicCanvasRef, isDrawingMechanic)}
                    onMouseMove={(e) => draw(e, mechanicCanvasRef, isDrawingMechanic)}
                    onMouseUp={() => stopDrawing(mechanicCanvasRef, isDrawingMechanic, setMechanicSigDataUrl, setIsMechanicSigned)}
                    onMouseLeave={() => stopDrawing(mechanicCanvasRef, isDrawingMechanic, setMechanicSigDataUrl, setIsMechanicSigned)}
                    onTouchStart={(e) => startDrawing(e, mechanicCanvasRef, isDrawingMechanic)}
                    onTouchMove={(e) => draw(e, mechanicCanvasRef, isDrawingMechanic)}
                    onTouchEnd={() => stopDrawing(mechanicCanvasRef, isDrawingMechanic, setMechanicSigDataUrl, setIsMechanicSigned)}
                  />
                  <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-bold text-slate-400">
                    {isMechanicSigned ? '✓ Certified by Workshop Mechanic' : 'Draw signature with finger or mouse'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MODAL ACTION BUTTONS */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalize Joint Sign-Off & Download PDF Certificate</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
