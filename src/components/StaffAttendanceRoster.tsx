import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Upload, 
  Sparkles, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  ArrowLeftRight, 
  Plus, 
  Check, 
  X, 
  Download, 
  DollarSign, 
  ShieldCheck, 
  FileText,
  Copy,
  Move,
  Tag,
  Briefcase,
  Layers,
  Trash2
} from 'lucide-react';
import { 
  ShiftRosterRecord, 
  StudentStaffStore, 
  GHANA_HOLIDAYS_2026, 
  isGhanaHoliday,
  AttendanceCsvRow,
  HalfShiftConfig
} from '../utils/studentStaffStore';
import { UserProfile } from '../types/erp';
import { exportToCSV } from '../utils/exportUtils';

interface StaffAttendanceRosterProps {
  activeUser: UserProfile;
}

// Role Card Color Preset Palette
export const ROLE_CARD_COLORS = [
  { id: 'emerald', label: 'Housekeeping & Care', bg: 'bg-emerald-100 border-emerald-300 text-emerald-900', badge: 'bg-emerald-600 text-white' },
  { id: 'indigo', label: 'Front Desk & Reception', bg: 'bg-indigo-100 border-indigo-300 text-indigo-900', badge: 'bg-indigo-600 text-white' },
  { id: 'amber', label: 'Kitchen & Catering', bg: 'bg-amber-100 border-amber-300 text-amber-900', badge: 'bg-amber-600 text-white' },
  { id: 'rose', label: 'Maintenance & Security', bg: 'bg-rose-100 border-rose-300 text-rose-900', badge: 'bg-rose-600 text-white' },
  { id: 'teal', label: 'Administration & Finance', bg: 'bg-teal-100 border-teal-300 text-teal-900', badge: 'bg-teal-600 text-white' },
  { id: 'purple', label: 'Vocational Training Support', bg: 'bg-purple-100 border-purple-300 text-purple-900', badge: 'bg-purple-600 text-white' }
] as const;

export default function StaffAttendanceRoster({ activeUser }: StaffAttendanceRosterProps) {
  const [roster, setRoster] = useState<ShiftRosterRecord[]>(() => StudentStaffStore.getRoster());
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceCsvRow[]>([]);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

  // Drag & Drop State
  const [draggedShiftType, setDraggedShiftType] = useState<string | null>(null);
  const [draggedShiftColor, setDraggedShiftColor] = useState<HalfShiftConfig['colorCategory']>('indigo');
  const [dragOverCell, setDragOverCell] = useState<{ staffId: string; dateStr: string } | null>(null);
  const [draggedPlacedShift, setDraggedPlacedShift] = useState<ShiftRosterRecord | null>(null);

  // Modals & AI States
  const [isAiRosterModalOpen, setIsAiRosterModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Create a balanced split-shift roster for reception and housekeeping staff next week with rotation');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<ShiftRosterRecord | null>(null);
  const [targetSwapStaffId, setTargetSwapStaffId] = useState('');

  // Comprehensive Shift Editor Modal State
  const [isShiftEditorModalOpen, setIsShiftEditorModalOpen] = useState(false);
  const [shiftEditorMode, setShiftEditorMode] = useState<'create' | 'edit'>('create');
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  // Form Fields for Comprehensive Shift Editor
  const [formStaffId, setFormStaffId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formShiftType, setFormShiftType] = useState<'morning' | 'afternoon' | 'evening' | 'night' | 'off' | 'split_half_shifts'>('morning');
  const [formStartTime, setFormStartTime] = useState('07:00');
  const [formEndTime, setFormEndTime] = useState('15:00');
  const [formCardColor, setFormCardColor] = useState<HalfShiftConfig['colorCategory']>('indigo');
  const [formTasks, setFormTasks] = useState('');

  // Split Half Shift Sub-fields
  const [formMorningRole, setFormMorningRole] = useState('Housekeeping');
  const [formMorningColor, setFormMorningColor] = useState<HalfShiftConfig['colorCategory']>('emerald');
  const [formMorningTasks, setFormMorningTasks] = useState('Room cleaning, linen audit');
  const [formAfternoonRole, setFormAfternoonRole] = useState('Front Desk');
  const [formAfternoonColor, setFormAfternoonColor] = useState<HalfShiftConfig['colorCategory']>('indigo');
  const [formAfternoonTasks, setFormAfternoonTasks] = useState('Guest check-ins, phone calls');

  // Feedback Toasts
  const [linkCopiedToast, setLinkCopiedToast] = useState(false);
  const [csvUploadSuccess, setCsvUploadSuccess] = useState<string | null>(null);

  const isManagerOrCeo = activeUser.role === 'ceo' || activeUser.role === 'manager' || activeUser.role === 'sysadmin';
  const isHrOrCeo = activeUser.role === 'ceo' || activeUser.role === 'manager' || activeUser.role === 'sysadmin';

  // Compute 7 days of active week
  const weekDays = useMemo(() => {
    const days: Array<{ dateStr: string; dayName: string; dayNumber: number; isHoliday: boolean; holidayName?: string }> = [];
    const base = new Date();
    base.setDate(base.getDate() + (selectedWeekOffset * 7));
    const currentDay = base.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    base.setDate(base.getDate() - distanceToMonday);

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const hol = isGhanaHoliday(dateStr);
      days.push({
        dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        isHoliday: hol.isHoliday,
        holidayName: hol.holidayName
      });
    }
    return days;
  }, [selectedWeekOffset]);

  // Unified, persistent all staff records from ERP database / falling back to defaults if empty
  const allStaffOptions = useMemo(() => {
    const records = StudentStaffStore.getStaffList();
    if (records && records.length > 0) {
      return records.map(r => ({ id: r.uid, name: r.name, dept: r.role || r.department || 'Staff' }));
    }
    return [
      { id: 'usr_reception_01', name: 'Adwoa Sarfo', dept: 'Front Desk' },
      { id: 'usr_hk_02', name: 'Kwesi Mensah', dept: 'Housekeeping' },
      { id: 'usr_trainer_03', name: 'Sister Ama Darko', dept: 'Vocational Training' },
      { id: 'usr_kitchen_04', name: 'Kofi Addo', dept: 'Hostel Kitchen' }
    ];
  }, [roster]);

  // Save Roster
  const updateRosterState = (updated: ShiftRosterRecord[]) => {
    setRoster(updated);
    StudentStaffStore.saveRoster(updated);
  };

  // Drag Handlers
  const handleDragStartPalette = (type: string, color: HalfShiftConfig['colorCategory'] = 'indigo') => {
    setDraggedShiftType(type);
    setDraggedShiftColor(color);
    setDraggedPlacedShift(null);
  };

  const handleDragOverCell = (e: React.DragEvent, staffId: string, dateStr: string) => {
    e.preventDefault();
    setDragOverCell({ staffId, dateStr });
  };

  const handleDragLeaveCell = () => {
    setDragOverCell(null);
  };

  const handleDropOnCell = (staffId: string, dateStr: string, staffName: string, dept: string) => {
    setDragOverCell(null);
    if (!isManagerOrCeo) return;

    // A. Dropping a placed shift (Move shift natively)
    if (draggedPlacedShift) {
      const hol = isGhanaHoliday(dateStr);
      const updatedShift: ShiftRosterRecord = {
        ...draggedPlacedShift,
        staffId,
        staffName,
        department: dept,
        date: dateStr,
        isHoliday: hol.isHoliday,
        holidayName: hol.holidayName,
        doublePayApplicable: hol.isHoliday && draggedPlacedShift.shiftType !== 'off'
      };
      
      const updatedRoster = roster.map(r => r.id === draggedPlacedShift.id ? updatedShift : r);
      updateRosterState(updatedRoster);
      setDraggedPlacedShift(null);
      return;
    }

    // B. Dropping from the palette
    if (!draggedShiftType) return;

    const hol = isGhanaHoliday(dateStr);
    let updatedShift: ShiftRosterRecord;

    if (draggedShiftType === 'split_half_shifts') {
      updatedShift = {
        id: 'sft_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        staffId,
        staffName,
        department: dept,
        date: dateStr,
        shiftType: 'split_half_shifts',
        startTime: '08:00',
        endTime: '17:00',
        isHoliday: hol.isHoliday,
        holidayName: hol.holidayName,
        doublePayApplicable: hol.isHoliday,
        isExtraShift: false,
        swapRequested: false,
        morningHalfShift: {
          roleName: 'Housekeeping',
          colorCategory: 'emerald',
          startTime: '08:00',
          endTime: '12:00',
          tasks: ['Room cleaning', 'Linen audit']
        },
        afternoonHalfShift: {
          roleName: 'Front Desk',
          colorCategory: 'indigo',
          startTime: '13:00',
          endTime: '17:00',
          tasks: ['Guest check-ins', 'Key distribution']
        }
      };
    } else {
      updatedShift = {
        id: 'sft_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        staffId,
        staffName,
        department: dept,
        date: dateStr,
        shiftType: draggedShiftType as any,
        startTime: draggedShiftType === 'morning' ? '07:00' : draggedShiftType === 'afternoon' ? '14:00' : '00:00',
        endTime: draggedShiftType === 'morning' ? '15:00' : draggedShiftType === 'afternoon' ? '22:00' : '00:00',
        isHoliday: hol.isHoliday,
        holidayName: hol.holidayName,
        doublePayApplicable: hol.isHoliday && draggedShiftType !== 'off',
        isExtraShift: false,
        swapRequested: false,
        cardColor: draggedShiftColor
      };
    }

    // Allow multiple shifts per day - so we append instead of replace!
    const updatedRoster = [...roster, updatedShift];
    updateRosterState(updatedRoster);
    setDraggedShiftType(null);
  };

  // Open Create Shift
  const handleOpenCreateShift = () => {
    if (!isHrOrCeo) {
      alert("Only HR and CEO can create completely new shifts.");
      return;
    }
    setShiftEditorMode('create');
    setEditingShiftId(null);
    setFormStaffId(allStaffOptions[0]?.id || '');
    setFormDate(weekDays[0]?.dateStr || new Date().toISOString().slice(0, 10));
    setFormShiftType('morning');
    setFormStartTime('07:00');
    setFormEndTime('15:00');
    setFormCardColor('indigo');
    setFormTasks('');
    
    // Split defaults
    setFormMorningRole('Housekeeping');
    setFormMorningColor('emerald');
    setFormMorningTasks('Room cleaning, linen audit');
    setFormAfternoonRole('Front Desk');
    setFormAfternoonColor('indigo');
    setFormAfternoonTasks('Guest check-ins, phone calls');

    setIsShiftEditorModalOpen(true);
  };

  // Open Edit Shift
  const handleOpenEditShift = (shift: ShiftRosterRecord) => {
    if (!isManagerOrCeo) return;
    setShiftEditorMode('edit');
    setEditingShiftId(shift.id);
    setFormStaffId(shift.staffId);
    setFormDate(shift.date);
    setFormShiftType(shift.shiftType);
    setFormStartTime(shift.startTime);
    setFormEndTime(shift.endTime);
    setFormCardColor(shift.cardColor || 'indigo');
    setFormTasks((shift.tasks || []).join(', '));

    if (shift.morningHalfShift) {
      setFormMorningRole(shift.morningHalfShift.roleName);
      setFormMorningColor(shift.morningHalfShift.colorCategory);
      setFormMorningTasks((shift.morningHalfShift.tasks || []).join(', '));
    } else {
      setFormMorningRole('Housekeeping');
      setFormMorningColor('emerald');
      setFormMorningTasks('Room cleaning, linen audit');
    }

    if (shift.afternoonHalfShift) {
      setFormAfternoonRole(shift.afternoonHalfShift.roleName);
      setFormAfternoonColor(shift.afternoonHalfShift.colorCategory);
      setFormAfternoonTasks((shift.afternoonHalfShift.tasks || []).join(', '));
    } else {
      setFormAfternoonRole('Front Desk');
      setFormAfternoonColor('indigo');
      setFormAfternoonTasks('Guest check-ins, phone calls');
    }

    setIsShiftEditorModalOpen(true);
  };

  // Delete Shift
  const handleDeleteShift = (shiftId: string) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) return;
    const updated = roster.filter(r => r.id !== shiftId);
    updateRosterState(updated);
    setIsShiftEditorModalOpen(false);
  };

  // Save Shift Form (Create or Edit)
  const handleSaveShiftEditor = (e: React.FormEvent) => {
    e.preventDefault();
    const staffObj = allStaffOptions.find(s => s.id === formStaffId);
    if (!staffObj) return;

    const hol = isGhanaHoliday(formDate);
    let updatedShift: ShiftRosterRecord;

    if (formShiftType === 'split_half_shifts') {
      updatedShift = {
        id: shiftEditorMode === 'edit' && editingShiftId ? editingShiftId : 'sft_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        staffId: formStaffId,
        staffName: staffObj.name,
        department: staffObj.dept,
        date: formDate,
        shiftType: 'split_half_shifts',
        startTime: formStartTime,
        endTime: formEndTime,
        isHoliday: hol.isHoliday,
        holidayName: hol.holidayName,
        doublePayApplicable: hol.isHoliday,
        isExtraShift: false,
        swapRequested: false,
        cardColor: formCardColor,
        morningHalfShift: {
          roleName: formMorningRole,
          colorCategory: formMorningColor,
          startTime: '08:00',
          endTime: '12:00',
          tasks: formMorningTasks.split(',').map(t => t.trim()).filter(Boolean)
        },
        afternoonHalfShift: {
          roleName: formAfternoonRole,
          colorCategory: formAfternoonColor,
          startTime: '13:00',
          endTime: '17:00',
          tasks: formAfternoonTasks.split(',').map(t => t.trim()).filter(Boolean)
        }
      };
    } else {
      updatedShift = {
        id: shiftEditorMode === 'edit' && editingShiftId ? editingShiftId : 'sft_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        staffId: formStaffId,
        staffName: staffObj.name,
        department: staffObj.dept,
        date: formDate,
        shiftType: formShiftType,
        startTime: formStartTime,
        endTime: formEndTime,
        isHoliday: hol.isHoliday,
        holidayName: hol.holidayName,
        doublePayApplicable: hol.isHoliday && formShiftType !== 'off',
        isExtraShift: false,
        swapRequested: false,
        cardColor: formCardColor,
        tasks: formTasks.split(',').map(t => t.trim()).filter(Boolean)
      };
    }

    let updatedRoster: ShiftRosterRecord[];
    if (shiftEditorMode === 'edit' && editingShiftId) {
      updatedRoster = roster.map(r => r.id === editingShiftId ? updatedShift : r);
    } else {
      updatedRoster = [...roster, updatedShift];
    }

    updateRosterState(updatedRoster);
    setIsShiftEditorModalOpen(false);
  };

  // Shift color class mapper
  const getCardColorClasses = (color?: string, isOff?: boolean) => {
    if (isOff) return 'bg-slate-100 border-slate-200 text-slate-400';
    if (color === 'emerald') return 'bg-emerald-50 border-emerald-300 text-emerald-900';
    if (color === 'indigo') return 'bg-indigo-50 border-indigo-300 text-indigo-900';
    if (color === 'amber') return 'bg-amber-50 border-amber-300 text-amber-900';
    if (color === 'rose') return 'bg-rose-50 border-rose-300 text-rose-900';
    if (color === 'teal') return 'bg-teal-50 border-teal-300 text-teal-900';
    if (color === 'purple') return 'bg-purple-50 border-purple-300 text-purple-900';
    return 'bg-sky-50 border-sky-300 text-sky-900';
  };

  const getHalfShiftColorClasses = (color: string) => {
    if (color === 'emerald') return 'bg-emerald-50 border-emerald-300 text-emerald-950';
    if (color === 'indigo') return 'bg-indigo-50 border-indigo-300 text-indigo-950';
    if (color === 'amber') return 'bg-amber-50 border-amber-300 text-amber-950';
    if (color === 'rose') return 'bg-rose-50 border-rose-300 text-rose-950';
    if (color === 'teal') return 'bg-teal-50 border-teal-300 text-teal-950';
    if (color === 'purple') return 'bg-purple-50 border-purple-300 text-purple-950';
    return 'bg-slate-50 border-slate-300 text-slate-950';
  };

  // Handle CSV Attendance Upload
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const rows: AttendanceCsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 4) {
          const dateStr = parts[2];
          const hol = isGhanaHoliday(dateStr);
          rows.push({
            employeeId: parts[0],
            employeeName: parts[1],
            date: dateStr,
            clockInTime: parts[3] || '08:00',
            clockOutTime: parts[4] || '17:00',
            hoursWorked: parts[5] ? Number(parts[5]) : 8,
            isHoliday: hol.isHoliday,
            status: (parts[6] as any) || 'present'
          });
        }
      }

      setAttendanceLogs(rows);
      setCsvUploadSuccess(`Parsed ${rows.length} biometric records from ${file.name}.`);
      setTimeout(() => setCsvUploadSuccess(null), 5000);
    };
    reader.readAsText(file);
  };

  // AI Generator
  const handleGenerateAiRoster = async () => {
    setIsGeneratingAi(true);
    try {
      await fetch('/api/ai/draft-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Tumi Staff Scheduler',
          customInstruction: `Draft split-shift roster: "${aiPrompt}"`
        })
      });
    } catch {
      /* ignore */
    } finally {
      setIsGeneratingAi(false);
      setIsAiRosterModalOpen(false);
    }
  };

  const handleCopyRosterLink = () => {
    const url = `${window.location.origin}/?tab=hr&view=roster&week=${selectedWeekOffset}`;
    navigator.clipboard.writeText(url);
    setLinkCopiedToast(true);
    setTimeout(() => setLinkCopiedToast(false), 4000);
  };

  // Swap Request
  const handleRequestSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftForSwap || !targetSwapStaffId) return;

    const targetStaff = allStaffOptions.find(s => s.id === targetSwapStaffId);
    const updated = roster.map(r => {
      if (r.id !== selectedShiftForSwap.id) return r;
      return {
        ...r,
        swapRequested: true,
        swapWithStaffId: targetSwapStaffId,
        swapWithStaffName: targetStaff?.name,
        swapStatus: 'pending_approval' as const
      };
    });

    updateRosterState(updated);
    setIsSwapModalOpen(false);
  };

  const handleApproveSwap = (shiftId: string, approved: boolean) => {
    const updated = roster.map(r => {
      if (r.id !== shiftId) return r;
      return {
        ...r,
        swapStatus: approved ? ('approved' as const) : ('rejected' as const),
        swapApprovedBy: `${activeUser.name} (${activeUser.role.toUpperCase()})`
      };
    });

    updateRosterState(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Interactive Drag & Drop Shift Roster Calendar</h2>
              <p className="text-xs text-slate-500">
                Drag shifts onto the calendar or reschedule them, set split half-shift multi-roles with card color tasking, auto double-pay for Ghana holidays & swap approvals.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isHrOrCeo && (
            <button
              onClick={handleOpenCreateShift}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all border border-emerald-500 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Shift</span>
            </button>
          )}

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all border border-slate-200">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Biometric CSV</span>
            <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
          </label>

          <button
            onClick={() => setIsAiRosterModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Shift Scheduler</span>
          </button>

          <button
            onClick={handleCopyRosterLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Copy Roster Link</span>
          </button>
        </div>
      </div>

      {/* DRAG & DROP PALETTE BAR (for CEO, Manager, HR) */}
      {isManagerOrCeo && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Move className="w-4 h-4 text-indigo-600" />
              <span>Drag & Drop Shift Card Palette (Drag onto calendar cells below)</span>
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">Hold shift card and drop on any staff member day cell</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Morning Shift Card */}
            <div
              draggable
              onDragStart={() => handleDragStartPalette('morning', 'indigo')}
              className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-300 text-sky-900 font-bold cursor-grab active:cursor-grabbing hover:shadow-xs flex items-center gap-1.5"
            >
              <Tag className="w-3.5 h-3.5 text-sky-600" />
              <span>Morning Shift (07:00-15:00)</span>
            </div>

            {/* Afternoon Shift Card */}
            <div
              draggable
              onDragStart={() => handleDragStartPalette('afternoon', 'purple')}
              className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-300 text-purple-900 font-bold cursor-grab active:cursor-grabbing hover:shadow-xs flex items-center gap-1.5"
            >
              <Tag className="w-3.5 h-3.5 text-purple-600" />
              <span>Afternoon Shift (14:00-22:00)</span>
            </div>

            {/* Split Half-Shift Card */}
            <div
              draggable
              onDragStart={() => handleDragStartPalette('split_half_shifts')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-100 to-indigo-100 border border-indigo-300 text-indigo-950 font-bold cursor-grab active:cursor-grabbing hover:shadow-xs flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-700" />
              <span>Split Half Shifts (Housekeeping AM / Front Desk PM)</span>
            </div>

            {/* Off Card */}
            <div
              draggable
              onDragStart={() => handleDragStartPalette('off')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-600 font-bold cursor-grab active:cursor-grabbing hover:shadow-xs flex items-center gap-1.5"
            >
              <span>OFF Day</span>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {linkCopiedToast && (
        <div className="bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between">
          <span>Direct roster link copied to clipboard!</span>
          <button onClick={() => setLinkCopiedToast(false)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Week Navigator */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs text-xs font-bold text-slate-700">
        <button
          onClick={() => setSelectedWeekOffset(prev => prev - 1)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          &larr; Previous Week
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>Week of {weekDays[0]?.dateStr} to {weekDays[6]?.dateStr}</span>
          {selectedWeekOffset === 0 && (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              Current Week
            </span>
          )}
        </div>
        <button
          onClick={() => setSelectedWeekOffset(prev => prev + 1)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          Next Week &rarr;
        </button>
      </div>

      {/* SHIFT ROSTER MATRIX TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 w-48 font-bold border-r border-slate-200">Staff Member & Role</th>
                {weekDays.map(day => (
                  <th key={day.dateStr} className={`py-3 px-2 font-semibold text-center border-r border-slate-200 min-w-[150px] ${day.isHoliday ? 'bg-indigo-50/70 text-indigo-900' : ''}`}>
                    <span className="block text-[11px] uppercase tracking-wider">{day.dayName}</span>
                    <span className="block font-bold text-sm text-slate-900">{day.dayNumber}</span>
                    {day.isHoliday && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800" title={day.holidayName}>
                        Ghana Holiday (2x Pay)
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {allStaffOptions.map(staff => (
                <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 border-r border-slate-200 bg-slate-50/30">
                    <span className="font-bold text-slate-900 block">{staff.name}</span>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">{staff.dept}</span>
                  </td>

                  {weekDays.map(day => {
                    // Match multiple shifts per personnel per date!
                    const cellShifts = roster.filter(r => r.staffId === staff.id && r.date === day.dateStr);
                    const isDragTarget = dragOverCell?.staffId === staff.id && dragOverCell?.dateStr === day.dateStr;

                    return (
                      <td
                        key={day.dateStr}
                        onDragOver={e => handleDragOverCell(e, staff.id, day.dateStr)}
                        onDragLeave={handleDragLeaveCell}
                        onDrop={() => handleDropOnCell(staff.id, day.dateStr, staff.name, staff.dept)}
                        className={`py-2 px-1.5 border-r border-slate-200 text-center align-top transition-all ${
                          isDragTarget ? 'bg-indigo-100/85 border-2 border-dashed border-indigo-500 ring-2 ring-indigo-300' : day.isHoliday ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        <div className="space-y-2">
                          {cellShifts.length === 0 ? (
                            <div className="py-3 px-1 rounded-lg bg-slate-50/70 text-slate-300 italic text-[10px] border border-dashed border-slate-200">
                              Off / No Shift
                            </div>
                          ) : (
                            cellShifts.map(shift => {
                              const shiftType = shift.shiftType;
                              const isOff = shiftType === 'off';
                              const isSplitHalf = shiftType === 'split_half_shifts';
                              const hasSwap = shift.swapRequested;

                              return (
                                <div
                                  key={shift.id}
                                  draggable={isManagerOrCeo}
                                  onDragStart={(e) => {
                                    setDraggedPlacedShift(shift);
                                    setDraggedShiftType(null); // Clear palette drag context
                                  }}
                                  onClick={() => isManagerOrCeo && handleOpenEditShift(shift)}
                                  className={`p-2 rounded-lg border text-left text-[11px] font-bold transition-all shadow-2xs hover:shadow-sm cursor-grab active:cursor-grabbing space-y-1.5 ${getCardColorClasses(shift.cardColor, isOff)}`}
                                >
                                  {/* SPLIT HALF SHIFTS CARD DISPLAY */}
                                  {isSplitHalf ? (
                                    <div className="space-y-1 text-left">
                                      {/* Morning Half Shift */}
                                      <div className={`p-1.5 rounded-md border text-[10px] font-bold ${getHalfShiftColorClasses(shift.morningHalfShift?.colorCategory || 'emerald')}`}>
                                        <div className="flex items-center justify-between">
                                          <span className="font-extrabold uppercase">AM: {shift.morningHalfShift?.roleName || 'Housekeeping'}</span>
                                          <span className="text-[9px] opacity-85">{shift.morningHalfShift?.startTime}-{shift.morningHalfShift?.endTime}</span>
                                        </div>
                                        {shift.morningHalfShift?.tasks && (
                                          <p className="text-[9px] font-semibold text-slate-700 line-clamp-1 mt-0.5">
                                            &bull; {shift.morningHalfShift.tasks.join(', ')}
                                          </p>
                                        )}
                                      </div>

                                      {/* Afternoon Half Shift */}
                                      <div className={`p-1.5 rounded-md border text-[10px] font-bold ${getHalfShiftColorClasses(shift.afternoonHalfShift?.colorCategory || 'indigo')}`}>
                                        <div className="flex items-center justify-between">
                                          <span className="font-extrabold uppercase">PM: {shift.afternoonHalfShift?.roleName || 'Front Desk'}</span>
                                          <span className="text-[9px] opacity-85">{shift.afternoonHalfShift?.startTime}-{shift.afternoonHalfShift?.endTime}</span>
                                        </div>
                                        {shift.afternoonHalfShift?.tasks && (
                                          <p className="text-[9px] font-semibold text-slate-700 line-clamp-1 mt-0.5">
                                            &bull; {shift.afternoonHalfShift.tasks.join(', ')}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ) : isOff ? (
                                    <div className="text-center py-1 text-slate-400 font-bold uppercase tracking-wider">
                                      OFF DAY
                                    </div>
                                  ) : (
                                    /* STANDARD SHIFT CARD */
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <span className="capitalize font-black text-slate-900">{shiftType} Shift</span>
                                        <span className="text-[10px] opacity-90">{shift.startTime}-{shift.endTime}</span>
                                      </div>
                                      {shift.tasks && shift.tasks.length > 0 && (
                                        <p className="text-[10px] font-medium text-slate-700 line-clamp-1 mt-1">
                                          &bull; {shift.tasks.join(', ')}
                                        </p>
                                      )}
                                      {shift.doublePayApplicable && (
                                        <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-950">
                                          Double Pay
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Swap Indicators & Approval */}
                                  {hasSwap && (
                                    <div className="text-[10px] bg-amber-50 border border-amber-200 rounded p-1 text-amber-900 text-left mt-1.5">
                                      <span className="block font-bold">Swap with {shift.swapWithStaffName}</span>
                                      <span className="block text-[9px] capitalize text-amber-700">Status: {shift.swapStatus}</span>

                                      {shift.swapStatus === 'pending_approval' && isManagerOrCeo && (
                                        <div className="flex gap-1 mt-1" onClick={e => e.stopPropagation()}>
                                          <button
                                            onClick={() => handleApproveSwap(shift.id, true)}
                                            className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-bold"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            onClick={() => handleApproveSwap(shift.id, false)}
                                            className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-bold"
                                          >
                                            Decline
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Request Swap Action */}
                                  {!isOff && !hasSwap && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedShiftForSwap(shift);
                                        setIsSwapModalOpen(true);
                                      }}
                                      className="text-[9px] text-slate-400 hover:text-indigo-600 block underline mt-1.5 text-right w-full font-semibold"
                                    >
                                      Swap Shift
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPREHENSIVE CREATE & EDIT SHIFT MODAL */}
      {isShiftEditorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {shiftEditorMode === 'create' ? 'Create Completely New Shift' : 'Edit Roster Shift Entry'}
                </h3>
                <p className="text-xs text-slate-500">Configure duty staff, timing, tasking roles, and card color identifiers.</p>
              </div>
              <button onClick={() => setIsShiftEditorModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShiftEditor} className="p-5 space-y-4 text-xs">
              {/* Personnel Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Personnel On Duty *</label>
                  <select
                    value={formStaffId}
                    onChange={e => setFormStaffId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-900"
                    required
                  >
                    {allStaffOptions.map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name} ({staff.dept})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Shift Date *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Shift Type and Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Shift Configuration Type</label>
                  <select
                    value={formShiftType}
                    onChange={e => {
                      const type = e.target.value as any;
                      setFormShiftType(type);
                      if (type === 'morning') { setFormStartTime('07:00'); setFormEndTime('15:00'); }
                      else if (type === 'afternoon') { setFormStartTime('14:00'); setFormEndTime('22:00'); }
                      else if (type === 'evening') { setFormStartTime('16:00'); setFormEndTime('00:00'); }
                      else if (type === 'night') { setFormStartTime('22:00'); setFormEndTime('06:00'); }
                      else if (type === 'off') { setFormStartTime('00:00'); setFormEndTime('00:00'); }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-900"
                  >
                    <option value="morning">Morning Shift (07:00 - 15:00)</option>
                    <option value="afternoon">Afternoon Shift (14:00 - 22:00)</option>
                    <option value="evening">Evening Shift (16:00 - 00:00)</option>
                    <option value="night">Night Shift (22:00 - 06:00)</option>
                    <option value="split_half_shifts">Split Half Shifts (AM / PM roles)</option>
                    <option value="off">OFF Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Primary Color Code Category</label>
                  <select
                    value={formCardColor}
                    onChange={e => setFormCardColor(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-900"
                  >
                    <option value="indigo">Indigo Blue (Front Desk)</option>
                    <option value="emerald">Emerald Green (Housekeeping)</option>
                    <option value="amber">Amber Yellow (Kitchen & Catering)</option>
                    <option value="rose">Rose Red (Maintenance & Security)</option>
                    <option value="teal">Teal Cyan (Administration)</option>
                    <option value="purple">Purple Violet (Training Support)</option>
                  </select>
                </div>
              </div>

              {/* Shift Timings */}
              {formShiftType !== 'off' && formShiftType !== 'split_half_shifts' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={e => setFormStartTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">End Time</label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={e => setFormEndTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Non-split Shift Tasks */}
              {formShiftType !== 'off' && formShiftType !== 'split_half_shifts' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Tasks (Comma-separated)</label>
                  <input
                    type="text"
                    value={formTasks}
                    onChange={e => setFormTasks(e.target.value)}
                    placeholder="e.g. Front desk operations, key card handovers, checkouts"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs"
                  />
                </div>
              )}

              {/* SPLIT SHIFT DETAILED BUILDER */}
              {formShiftType === 'split_half_shifts' && (
                <div className="space-y-3.5">
                  {/* MORNING */}
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                    <span className="font-extrabold text-emerald-950 block text-[10px] uppercase tracking-wider">Morning Half (08:00 - 12:00)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">AM Role</label>
                        <input
                          type="text"
                          value={formMorningRole}
                          onChange={e => setFormMorningRole(e.target.value)}
                          placeholder="e.g. Housekeeping"
                          className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">AM Card Color</label>
                        <select
                          value={formMorningColor}
                          onChange={e => setFormMorningColor(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs"
                        >
                          <option value="emerald">Emerald Green (Housekeeping)</option>
                          <option value="amber">Amber Yellow (Kitchen)</option>
                          <option value="indigo">Indigo Blue (Front Desk)</option>
                          <option value="rose">Rose Red (Maintenance)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">AM Tasks</label>
                      <input
                        type="text"
                        value={formMorningTasks}
                        onChange={e => setFormMorningTasks(e.target.value)}
                        placeholder="Linen audit, room servicing"
                        className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* AFTERNOON */}
                  <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2">
                    <span className="font-extrabold text-indigo-950 block text-[10px] uppercase tracking-wider">Afternoon Half (13:00 - 17:00)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">PM Role</label>
                        <input
                          type="text"
                          value={formAfternoonRole}
                          onChange={e => setFormAfternoonRole(e.target.value)}
                          placeholder="e.g. Front Desk"
                          className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">PM Card Color</label>
                        <select
                          value={formAfternoonColor}
                          onChange={e => setFormAfternoonColor(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs"
                        >
                          <option value="indigo">Indigo Blue (Reception)</option>
                          <option value="purple">Purple Violet (Training Support)</option>
                          <option value="teal">Teal Cyan (Admin)</option>
                          <option value="amber">Amber Yellow (Catering)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">PM Tasks</label>
                      <input
                        type="text"
                        value={formAfternoonTasks}
                        onChange={e => setFormAfternoonTasks(e.target.value)}
                        placeholder="Check-ins, key management"
                        className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t border-slate-200 pt-3.5 flex items-center justify-between">
                {shiftEditorMode === 'edit' && editingShiftId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteShift(editingShiftId)}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold border border-rose-200 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Shift</span>
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShiftEditorModalOpen(false)}
                    className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                  >
                    {shiftEditorMode === 'create' ? 'Create Shift Entry' : 'Save Shift Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI ROSTER GENERATOR MODAL */}
      {isAiRosterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">AI Natural Language Shift Scheduler</h3>
                  <p className="text-xs text-slate-500">Describe your shift rules in plain English.</p>
                </div>
              </div>
              <button onClick={() => setIsAiRosterModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Natural Language Shift Prompt</label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="e.g. Schedule 2 morning and 2 afternoon shifts for reception and housekeeping next week"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="border border-indigo-100 bg-indigo-50/60 p-3 rounded-xl text-indigo-950 text-[11px] space-y-1">
                <span className="font-bold block">Automatic Roster Constraints Included:</span>
                <p>&bull; Integrated with official 2026 Ghana Public Holidays for automatic double-pay calculations.</p>
                <p>&bull; Fair rotational weekend coverage.</p>
                <p>&bull; Support for multi-role split half shifts.</p>
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAiRosterModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateAiRoster}
                  disabled={isGeneratingAi}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingAi ? 'Generating Schedule...' : 'Generate AI Roster'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHIFT SWAP MODAL */}
      {isSwapModalOpen && selectedShiftForSwap && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Request Shift Swap</h3>
                <p className="text-xs text-slate-500">Requires Manager or CEO approval before taking effect.</p>
              </div>
              <button onClick={() => setIsSwapModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestSwap} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Shift</span>
                <span className="font-bold text-slate-900 block">{selectedShiftForSwap.staffName}</span>
                <span className="text-slate-600 block">
                  {selectedShiftForSwap.date} &bull; {selectedShiftForSwap.shiftType.toUpperCase()} ({selectedShiftForSwap.startTime}-{selectedShiftForSwap.endTime})
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Swap With Colleague *</label>
                <select
                  required
                  value={targetSwapStaffId}
                  onChange={e => setTargetSwapStaffId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs font-semibold text-slate-900"
                >
                  <option value="">Select staff member to swap with...</option>
                  {allStaffOptions.filter(s => s.id !== selectedShiftForSwap.staffId).map(st => (
                    <option key={st.id} value={st.id}>{st.name} ({st.dept})</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSwapModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  Submit Swap for Manager Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
