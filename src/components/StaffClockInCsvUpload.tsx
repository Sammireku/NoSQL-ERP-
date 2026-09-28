import React, { useState, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Sparkles, 
  Users, 
  Clock, 
  Calendar, 
  DollarSign, 
  ArrowRight, 
  RotateCcw, 
  Check, 
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import { UserProfile, TimeCardLog } from '../types/erp';
import { dataStore } from '../config/firebase';
import { isGhanaHoliday, StudentStaffStore } from '../utils/studentStaffStore';
import { exportToCSV } from '../utils/exportUtils';

interface ParsedClockInRow {
  rawId: string;
  rawName: string;
  rawDate: string;
  rawClockIn: string;
  rawClockOut: string;
  rawDepartment: string;
  rawNotes: string;
  // Validation fields
  isValid: boolean;
  validationStatus: 'valid' | 'warning' | 'error';
  validationMessages: string[];
  hoursWorked: number;
  regularHours: number;
  overtimeHours: number;
  isHoliday: boolean;
  holidayName?: string;
  isWeekend: boolean;
  isLate: boolean;
  // Employee Mapping
  mappedUser: UserProfile | null;
  matchType: 'exact_id' | 'exact_name' | 'fuzzy_name' | 'manual' | 'unmatched';
  matchConfidence: number; // 0 to 100
  // Salary Recon calculation
  hourlyRate: number;
  regularPay: number;
  overtimePay: number;
  holidayPay: number;
  totalShiftPay: number;
}

interface StaffClockInCsvUploadProps {
  activeUser: UserProfile;
  onCommitSuccess?: (reconciledCount: number) => void;
  className?: string;
}

// Sample CSV template content
const SAMPLE_CSV_CONTENT = `employee_id,employee_name,date,clock_in,clock_out,department,notes
usr_reception_01,Adwoa Sarfo,2026-09-22,07:45,16:15,Front Desk,Morning shift completed
usr_hk_02,Kwesi Mensah,2026-09-22,08:00,17:30,Housekeeping,Extended room turnovers - 1.5h OT
usr_trainer_03,Sister Ama Darko,2026-09-21,08:15,16:45,Vocational Training,Nkrumah Memorial Day Practical Class
usr_kitchen_04,Kofi Addo,2026-09-22,06:30,15:00,Hostel Kitchen,Breakfast and lunch preparation
usr_reception_01,Adwoa Sarfo,2026-09-23,07:50,16:00,Front Desk,Guest check-in terminal
usr_hk_02,Kwesi Mensah,2026-09-23,08:45,17:15,Housekeeping,Late arrival - traffic delay on highway`;

export default function StaffClockInCsvUpload({
  activeUser,
  onCommitSuccess,
  className = ''
}: StaffClockInCsvUploadProps) {
  const [users] = useState<UserProfile[]>(() => dataStore.getUsers());
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedClockInRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [commitToast, setCommitToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'validation' | 'reconciliation'>('validation');

  // Trigger toast
  const showToast = (msg: string) => {
    setCommitToast(msg);
    setTimeout(() => setCommitToast(null), 5000);
  };

  // 1. MATCH EMPLOYEE ENGINE
  const matchEmployee = (rawId: string, rawName: string): {
    user: UserProfile | null;
    matchType: 'exact_id' | 'exact_name' | 'fuzzy_name' | 'manual' | 'unmatched';
    confidence: number;
  } => {
    const cleanId = rawId?.trim().toLowerCase();
    const cleanName = rawName?.trim().toLowerCase();

    // Priority 1: Match by UID
    if (cleanId) {
      const byId = users.find(u => u.uid.toLowerCase() === cleanId);
      if (byId) return { user: byId, matchType: 'exact_id', confidence: 100 };
    }

    // Priority 2: Exact Name Match
    if (cleanName) {
      const byName = users.find(u => u.name.toLowerCase() === cleanName);
      if (byName) return { user: byName, matchType: 'exact_name', confidence: 95 };

      // Priority 3: Fuzzy / Substring Name Match
      const byFuzzy = users.find(u => {
        const uName = u.name.toLowerCase();
        return uName.includes(cleanName) || cleanName.includes(uName);
      });
      if (byFuzzy) return { user: byFuzzy, matchType: 'fuzzy_name', confidence: 80 };
    }

    return { user: null, matchType: 'unmatched', confidence: 0 };
  };

  // 2. PARSE AND VALIDATE CSV
  const parseCSVText = (csvText: string) => {
    setIsProcessing(true);
    try {
      const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        alert("The uploaded CSV file is empty or missing data rows.");
        setIsProcessing(false);
        return;
      }

      // Parse Header
      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

      // Find Column Indices
      const idIdx = headers.findIndex(h => h.includes('id') || h.includes('staff_id') || h.includes('emp'));
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const dateIdx = headers.findIndex(h => h.includes('date'));
      const inIdx = headers.findIndex(h => h.includes('in') || h.includes('start'));
      const outIdx = headers.findIndex(h => h.includes('out') || h.includes('end'));
      const deptIdx = headers.findIndex(h => h.includes('dept') || h.includes('department'));
      const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('remark'));

      const results: ParsedClockInRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rowStr = lines[i].trim();
        if (!rowStr) continue;

        // Simple CSV splitter handling quoted values
        const cols = rowStr.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));

        const rawId = idIdx !== -1 && cols[idIdx] ? cols[idIdx] : '';
        const rawName = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : '';
        const rawDate = dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().slice(0, 10);
        const rawClockIn = inIdx !== -1 && cols[inIdx] ? cols[inIdx] : '';
        const rawClockOut = outIdx !== -1 && cols[outIdx] ? cols[outIdx] : '';
        const rawDepartment = deptIdx !== -1 && cols[deptIdx] ? cols[deptIdx] : '';
        const rawNotes = notesIdx !== -1 && cols[notesIdx] ? cols[notesIdx] : '';

        // Validation Logic
        const messages: string[] = [];
        let status: 'valid' | 'warning' | 'error' = 'valid';

        // Validate Date
        const dateObj = new Date(rawDate);
        const isDateValid = !isNaN(dateObj.getTime());
        if (!isDateValid) {
          messages.push('Invalid date format');
          status = 'error';
        }

        // Validate Clock In
        const timeInParts = rawClockIn.split(':');
        const hasValidIn = timeInParts.length >= 2 && !isNaN(Number(timeInParts[0])) && !isNaN(Number(timeInParts[1]));
        if (!hasValidIn) {
          messages.push('Missing or invalid Clock-In time');
          status = 'error';
        }

        // Validate Clock Out & Calculate Duration
        let hoursWorked = 0;
        let isLate = false;

        if (hasValidIn) {
          const inHours = Number(timeInParts[0]);
          const inMins = Number(timeInParts[1]);
          if (inHours > 8 || (inHours === 8 && inMins > 30)) {
            isLate = true;
            messages.push(`Late arrival logged (${rawClockIn})`);
          }

          if (rawClockOut) {
            const timeOutParts = rawClockOut.split(':');
            if (timeOutParts.length >= 2 && !isNaN(Number(timeOutParts[0])) && !isNaN(Number(timeOutParts[1]))) {
              const outHours = Number(timeOutParts[0]);
              const outMins = Number(timeOutParts[1]);
              const totalInMinutes = (inHours * 60) + inMins;
              const totalOutMinutes = (outHours * 60) + outMins;

              if (totalOutMinutes > totalInMinutes) {
                hoursWorked = Number(((totalOutMinutes - totalInMinutes) / 60).toFixed(2));
              } else {
                messages.push('Clock Out is earlier than Clock In');
                status = 'error';
              }
            } else {
              messages.push('Invalid Clock-Out format');
              status = 'error';
            }
          } else {
            messages.push('Shift missing Clock-Out (Active/Incomplete)');
            if (status !== 'error') status = 'warning';
          }
        }

        // Ghana Holiday Check
        const holCheck = isGhanaHoliday(rawDate);
        if (holCheck.isHoliday) {
          messages.push(`Ghana Public Holiday: ${holCheck.holidayName} (2.0x Double Pay)`);
          if (status === 'valid') status = 'warning';
        }

        // Weekend Check
        const dayOfWeek = isDateValid ? dateObj.getDay() : 1;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend) {
          messages.push('Weekend shift');
        }

        // Overtime Check (> 8 hours)
        const regularHours = Math.min(hoursWorked, 8);
        const overtimeHours = Math.max(0, Number((hoursWorked - 8).toFixed(2)));
        if (overtimeHours > 0) {
          messages.push(`${overtimeHours} hrs Overtime logged (1.5x)`);
          if (status === 'valid') status = 'warning';
        }

        // Employee Mapping
        const matchResult = matchEmployee(rawId, rawName);
        if (!matchResult.user) {
          messages.push('Unmapped Employee: No matching staff profile found in ERP');
          if (status !== 'error') status = 'warning';
        }

        // Salary Calculations
        const baseSalary = matchResult.user?.baseSalary || 3000;
        const dDays = matchResult.user?.workDaysPerMonth || 22;
        const dHours = matchResult.user?.workHoursPerDay || 8;
        const hourlyRate = matchResult.user?.hourlyRate || Number((baseSalary / (dDays * dHours)).toFixed(2));
        const regularPay = Number((regularHours * hourlyRate).toFixed(2));
        const overtimePay = Number((overtimeHours * hourlyRate * 1.5).toFixed(2));
        const holidayPay = holCheck.isHoliday ? Number((hoursWorked * hourlyRate).toFixed(2)) : 0; // Extra 1.0x on top of regular
        const totalShiftPay = Number((regularPay + overtimePay + holidayPay).toFixed(2));

        results.push({
          rawId,
          rawName,
          rawDate,
          rawClockIn,
          rawClockOut,
          rawDepartment,
          rawNotes,
          isValid: status !== 'error',
          validationStatus: status,
          validationMessages: messages,
          hoursWorked,
          regularHours,
          overtimeHours,
          isHoliday: holCheck.isHoliday,
          holidayName: holCheck.holidayName,
          isWeekend,
          isLate,
          mappedUser: matchResult.user,
          matchType: matchResult.matchType,
          matchConfidence: matchResult.confidence,
          hourlyRate,
          regularPay,
          overtimePay,
          holidayPay,
          totalShiftPay
        });
      }

      setParsedRows(results);
    } catch (err: any) {
      console.error(err);
      alert("Failed to parse CSV: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Local File Upload
  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      alert("Please upload a valid CSV file (.csv)");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSVText(text);
    };
    reader.readAsText(file);
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Download Sample Template
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'staff_clock_in_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load Demo Data Directly
  const handleLoadDemo = () => {
    setFileName('demo_staff_clock_ins.csv');
    parseCSVText(SAMPLE_CSV_CONTENT);
  };

  // Change Mapped User for a specific row
  const handleManualMapUser = (rowIndex: number, selectedUid: string) => {
    const targetUser = users.find(u => u.uid === selectedUid) || null;
    setParsedRows(prev => prev.map((row, idx) => {
      if (idx !== rowIndex) return row;
      const baseSalary = targetUser?.baseSalary || 3000;
      const dDays = targetUser?.workDaysPerMonth || 22;
      const dHours = targetUser?.workHoursPerDay || 8;
      const hourlyRate = targetUser?.hourlyRate || Number((baseSalary / (dDays * dHours)).toFixed(2));
      const regularPay = Number((row.regularHours * hourlyRate).toFixed(2));
      const overtimePay = Number((row.overtimeHours * hourlyRate * 1.5).toFixed(2));
      const holidayPay = row.isHoliday ? Number((row.hoursWorked * hourlyRate).toFixed(2)) : 0;
      const totalShiftPay = Number((regularPay + overtimePay + holidayPay).toFixed(2));

      return {
        ...row,
        mappedUser: targetUser,
        matchType: 'manual',
        matchConfidence: 100,
        hourlyRate,
        regularPay,
        overtimePay,
        holidayPay,
        totalShiftPay,
        validationStatus: row.validationStatus === 'error' ? 'error' : 'valid',
        validationMessages: row.validationMessages.filter(m => !m.includes('Unmapped Employee'))
      };
    }));
  };

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = parsedRows.length;
    const valid = parsedRows.filter(r => r.validationStatus === 'valid').length;
    const warning = parsedRows.filter(r => r.validationStatus === 'warning').length;
    const error = parsedRows.filter(r => r.validationStatus === 'error').length;
    const totalHours = parsedRows.reduce((acc, r) => acc + r.hoursWorked, 0);
    const totalOvertime = parsedRows.reduce((acc, r) => acc + r.overtimeHours, 0);
    const totalPayEstimate = parsedRows.reduce((acc, r) => acc + r.totalShiftPay, 0);
    const mappedCount = parsedRows.filter(r => r.mappedUser !== null).length;

    return {
      total,
      valid,
      warning,
      error,
      totalHours: Number(totalHours.toFixed(1)),
      totalOvertime: Number(totalOvertime.toFixed(1)),
      totalPayEstimate: Number(totalPayEstimate.toFixed(2)),
      mappedCount
    };
  }, [parsedRows]);

  // Grouped by Employee for Salary Reconciliation
  const employeeSalaryRecon = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      name: string;
      role: string;
      department: string;
      shiftsCount: number;
      regularHours: number;
      overtimeHours: number;
      holidayHours: number;
      hourlyRate: number;
      overtimeBonusPay: number;
      holidayBonusPay: number;
      totalProjectedAdjustment: number;
    }>();

    parsedRows.forEach(r => {
      if (!r.mappedUser) return;
      const uid = r.mappedUser.uid;
      const existing = map.get(uid) || {
        userId: uid,
        name: r.mappedUser.name,
        role: r.mappedUser.role,
        department: r.mappedUser.department || r.rawDepartment || 'General',
        shiftsCount: 0,
        regularHours: 0,
        overtimeHours: 0,
        holidayHours: 0,
        hourlyRate: r.hourlyRate,
        overtimeBonusPay: 0,
        holidayBonusPay: 0,
        totalProjectedAdjustment: 0
      };

      existing.shiftsCount += 1;
      existing.regularHours += r.regularHours;
      existing.overtimeHours += r.overtimeHours;
      if (r.isHoliday) existing.holidayHours += r.hoursWorked;
      existing.overtimeBonusPay += r.overtimePay;
      existing.holidayBonusPay += r.holidayPay;
      existing.totalProjectedAdjustment += (r.overtimePay + r.holidayPay);

      map.set(uid, existing);
    });

    return Array.from(map.values()).map(e => ({
      ...e,
      regularHours: Number(e.regularHours.toFixed(1)),
      overtimeHours: Number(e.overtimeHours.toFixed(1)),
      holidayHours: Number(e.holidayHours.toFixed(1)),
      overtimeBonusPay: Number(e.overtimeBonusPay.toFixed(2)),
      holidayBonusPay: Number(e.holidayBonusPay.toFixed(2)),
      totalProjectedAdjustment: Number(e.totalProjectedAdjustment.toFixed(2))
    }));
  }, [parsedRows]);

  // COMMIT PARSED RECORDS TO TIMECARDS & PERSISTENCE
  const handleCommitToTimecards = () => {
    const validRows = parsedRows.filter(r => r.isValid && r.mappedUser !== null);
    if (validRows.length === 0) {
      alert("No valid, mapped employee clock-in rows to commit.");
      return;
    }

    const existingCards = dataStore.getTimeCards();
    const newCards: TimeCardLog[] = [];

    validRows.forEach(row => {
      if (!row.mappedUser) return;

      // Avoid exact duplicates (same user on same date)
      const isDuplicate = existingCards.some(
        c => c.userId === row.mappedUser!.uid && c.date === row.rawDate && c.clockIn === row.rawClockIn
      );

      if (!isDuplicate) {
        newCards.push({
          id: `tc_csv_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          userId: row.mappedUser.uid,
          userName: row.mappedUser.name,
          role: row.mappedUser.role,
          date: row.rawDate,
          clockIn: row.rawClockIn,
          clockOut: row.rawClockOut || undefined,
          hoursWorked: row.hoursWorked,
          status: row.rawClockOut ? 'completed' : 'active'
        });
      }
    });

    const updatedTimecards = [...newCards, ...existingCards];
    dataStore.saveTimeCards(updatedTimecards);

    // Audit log
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'CREATE',
      'TIMECARDS_CSV_IMPORT',
      `Parsed and committed ${newCards.length} verified staff clock-in records for payroll salary reconciliation.`
    );

    showToast(`Successfully committed ${newCards.length} verified timecards into ERP for payroll reconciliation!`);
    if (onCommitSuccess) onCommitSuccess(newCards.length);
  };

  // Export Reconciliation Report as CSV
  const handleExportReconciliation = () => {
    const data = employeeSalaryRecon.map(e => ({
      'Employee ID': e.userId,
      'Employee Name': e.name,
      'Role': e.role.toUpperCase(),
      'Department': e.department,
      'Total Shifts Logged': e.shiftsCount,
      'Regular Hours': e.regularHours,
      'Overtime Hours (1.5x)': e.overtimeHours,
      'Holiday Hours (2.0x)': e.holidayHours,
      'Base Hourly Rate (GHS)': e.hourlyRate.toFixed(2),
      'Overtime Bonus Pay (GHS)': e.overtimeBonusPay.toFixed(2),
      'Holiday Bonus Pay (GHS)': e.holidayBonusPay.toFixed(2),
      'Total Payroll Addition (GHS)': e.totalProjectedAdjustment.toFixed(2)
    }));

    exportToCSV(data, `Staff_Salary_Reconciliation_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Toast Notification */}
      {commitToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{commitToast}</span>
        </div>
      )}

      {/* Upload Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                HR Biometric Timecard Reconciliation
              </span>
              <span className="text-xs text-slate-400">• Automated Profile Mapping</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Staff Clock-In CSV Ingestion & Salary Reconciliation
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
              Upload biometric device logs or exported digital registers. The engine verifies shift durations, checks official Ghana statutory holidays for double pay, and maps rows directly to employee payroll records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadSample}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all shadow-2xs"
              title="Download standardized CSV sample"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample Template</span>
            </button>

            <button
              onClick={handleLoadDemo}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-all shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Load Demo CSV</span>
            </button>
          </div>
        </div>

        {/* Drag-and-Drop File Upload Area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            dragActive 
              ? 'border-indigo-600 bg-indigo-50/50 scale-[1.005]' 
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
          }`}
        >
          <input
            type="file"
            id="csv-file-input"
            accept=".csv,text/csv"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
            }}
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center shadow-xs">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">
                {fileName ? `File selected: ${fileName}` : 'Drop biometric or timecard CSV here'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Supports columns: <code className="font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">employee_id, employee_name, date, clock_in, clock_out, department</code>
              </p>
            </div>

            <label
              htmlFor="csv-file-input"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Browse Local Files</span>
            </label>
          </div>
        </div>
      </div>

      {/* SUMMARY BANNER (VISIBLE WHEN ROWS ARE PARSED) */}
      {parsedRows.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Rows</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{summaryMetrics.total}</p>
              <span className="text-[10px] text-slate-500">{summaryMetrics.mappedCount} auto-mapped</span>
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Valid Rows</span>
              <p className="text-xl font-black text-emerald-900 mt-0.5">{summaryMetrics.valid}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">100% Passed</span>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-100 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-amber-700">Flagged / Warnings</span>
              <p className="text-xl font-black text-amber-900 mt-0.5">{summaryMetrics.warning}</p>
              <span className="text-[10px] text-amber-600 font-semibold">Overtime / Holidays</span>
            </div>

            <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-100 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-rose-700">Fatal Errors</span>
              <p className="text-xl font-black text-rose-900 mt-0.5">{summaryMetrics.error}</p>
              <span className="text-[10px] text-rose-600">Requires review</span>
            </div>

            <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-indigo-700">Hours Logged</span>
              <p className="text-xl font-black text-indigo-950 mt-0.5">{summaryMetrics.totalHours} hrs</p>
              <span className="text-[10px] text-indigo-600">OT: {summaryMetrics.totalOvertime} hrs</span>
            </div>

            <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-indigo-300">Recon Bonus Pool</span>
              <p className="text-xl font-black text-white mt-0.5 font-mono">
                GHS {summaryMetrics.totalPayEstimate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-indigo-200">Shift & OT gross</span>
            </div>
          </div>

          {/* Tab Navigation: Data Validation vs Salary Reconciliation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setActiveTab('validation')}
                className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'validation' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Parsed Data & Validation ({parsedRows.length})
              </button>
              <button
                onClick={() => setActiveTab('reconciliation')}
                className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'reconciliation' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Salary Reconciliation Matrix ({employeeSalaryRecon.length} Staff)
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'reconciliation' && (
                <button
                  onClick={handleExportReconciliation}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Recon Report</span>
                </button>
              )}

              <button
                onClick={handleCommitToTimecards}
                disabled={summaryMetrics.valid + summaryMetrics.warning === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Commit & Sync to Timecards</span>
              </button>
            </div>
          </div>

          {/* TAB 1: DATA VALIDATION & EMPLOYEE MAPPING TABLE */}
          {activeTab === 'validation' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Row</th>
                      <th className="py-3 px-4">CSV Raw Data</th>
                      <th className="py-3 px-4">Mapped ERP Employee</th>
                      <th className="py-3 px-4">Date & Times</th>
                      <th className="py-3 px-4 text-center">Hours</th>
                      <th className="py-3 px-4">Validation Status</th>
                      <th className="py-3 px-4 text-right">Shift Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 font-bold">#{idx + 1}</td>

                        {/* Raw Data */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{row.rawName || '—'}</div>
                          <div className="font-mono text-[10px] text-slate-400">ID: {row.rawId || 'None'}</div>
                          {row.rawDepartment && (
                            <span className="text-[10px] text-slate-500 block">{row.rawDepartment}</span>
                          )}
                        </td>

                        {/* Mapped Employee & Confidence */}
                        <td className="py-3 px-4">
                          {row.mappedUser ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                                  {row.mappedUser.name.charAt(0)}
                                </div>
                                <span className="font-bold text-slate-900">{row.mappedUser.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 capitalize">{row.mappedUser.role}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                  row.matchType === 'exact_id' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : row.matchType === 'exact_name' 
                                      ? 'bg-indigo-100 text-indigo-800' 
                                      : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {row.matchConfidence}% Match
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Unmapped Staff
                              </span>
                              <select
                                onChange={(e) => handleManualMapUser(idx, e.target.value)}
                                defaultValue=""
                                className="text-[11px] bg-slate-50 border border-rose-300 rounded px-2 py-1 text-slate-700 font-medium"
                              >
                                <option value="" disabled>Select Staff Member...</option>
                                {users.map(u => (
                                  <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </td>

                        {/* Date & Shift Times */}
                        <td className="py-3 px-4">
                          <div className="font-mono text-slate-800 font-semibold">{row.rawDate}</div>
                          <div className="text-[11px] text-slate-500">
                            {row.rawClockIn} &rarr; {row.rawClockOut || 'Ongoing'}
                          </div>
                          {row.isHoliday && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 mt-0.5 inline-block">
                              {row.holidayName || 'Holiday'}
                            </span>
                          )}
                        </td>

                        {/* Hours */}
                        <td className="py-3 px-4 text-center">
                          <div className="font-mono font-bold text-slate-900">{row.hoursWorked}h</div>
                          {row.overtimeHours > 0 && (
                            <span className="text-[10px] font-bold text-amber-600 block">+{row.overtimeHours}h OT</span>
                          )}
                        </td>

                        {/* Validation Status & Remarks */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.validationStatus === 'valid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.validationStatus === 'warning'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                            }`}>
                              {row.validationStatus === 'valid' && <CheckCircle2 className="w-3 h-3" />}
                              {row.validationStatus === 'warning' && <AlertTriangle className="w-3 h-3" />}
                              {row.validationStatus === 'error' && <XCircle className="w-3 h-3" />}
                              {row.validationStatus.toUpperCase()}
                            </span>

                            {row.validationMessages.length > 0 && (
                              <ul className="text-[10px] text-slate-500 space-y-0.5">
                                {row.validationMessages.map((msg, mIdx) => (
                                  <li key={mIdx} className="leading-tight">• {msg}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>

                        {/* Shift Value */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          GHS {row.totalShiftPay.toFixed(2)}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            @{row.hourlyRate}/h
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SALARY RECONCILIATION SUMMARY */}
          {activeTab === 'reconciliation' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  Staff Salary & Overtime Reconciliation Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Aggregated hours and calculated bonus payouts ready for direct addition to the next monthly payroll run.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Role & Dept</th>
                      <th className="py-3 px-4 text-center">Shifts</th>
                      <th className="py-3 px-4 text-right">Regular Hrs</th>
                      <th className="py-3 px-4 text-right">Overtime Hrs (1.5x)</th>
                      <th className="py-3 px-4 text-right">Holiday Hrs (2.0x)</th>
                      <th className="py-3 px-4 text-right">Base Hourly</th>
                      <th className="py-3 px-4 text-right">OT Pay Addition</th>
                      <th className="py-3 px-4 text-right">Holiday Pay</th>
                      <th className="py-3 px-4 text-right text-indigo-900">Total Payroll Adjustment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employeeSalaryRecon.map((emp) => (
                      <tr key={emp.userId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {emp.name}
                          <span className="block text-[10px] text-slate-400 font-mono font-normal">{emp.userId}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 capitalize">{emp.role}</span>
                          <span className="block text-[10px] text-slate-500">{emp.department}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{emp.shiftsCount}</td>
                        <td className="py-3 px-4 text-right font-mono">{emp.regularHours}h</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                          {emp.overtimeHours > 0 ? `${emp.overtimeHours}h` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-purple-600">
                          {emp.holidayHours > 0 ? `${emp.holidayHours}h` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          GHS {emp.hourlyRate.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                          +GHS {emp.overtimeBonusPay.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                          +GHS {emp.holidayBonusPay.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-indigo-700 text-sm">
                          +GHS {emp.totalProjectedAdjustment.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold block">Payroll Integration Notice:</span>
                  <p className="text-[11px] text-indigo-800">
                    Committing these records generates validated timecards which feed directly into the HR & Team Payroll module for the selected monthly cycle.
                  </p>
                </div>
                <button
                  onClick={handleCommitToTimecards}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-all whitespace-nowrap"
                >
                  Confirm & Sync to Payroll Timecards
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
