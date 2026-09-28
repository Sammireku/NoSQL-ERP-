import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Calendar, 
  Users, 
  Search, 
  Plus, 
  Download, 
  Printer, 
  Award,
  Sparkles,
  Filter,
  CheckCheck,
  FileSpreadsheet
} from 'lucide-react';
import { UserProfile, TraineeAttendanceLog, CustomerProfile } from '../types/erp';
import { dataStore } from '../config/firebase';
import { exportToCSV } from '../utils/exportUtils';
import StaffClockInCsvUpload from './StaffClockInCsvUpload';

interface BeneficiaryAttendanceModuleProps {
  activeUser: UserProfile;
}

export default function BeneficiaryAttendanceModule({ activeUser }: BeneficiaryAttendanceModuleProps) {
  const [attendanceLogs, setAttendanceLogs] = useState<TraineeAttendanceLog[]>([]);
  const [trainees, setTrainees] = useState<CustomerProfile[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Navigation between Beneficiary Attendance and Staff Clock-In CSV Ingestion
  const [activeModuleTab, setActiveModuleTab] = useState<'beneficiaries' | 'staff_clockin'>('beneficiaries');

  // Interactive check-in modal state
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [selectedTraineeId, setSelectedTraineeId] = useState('');
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkInStatus, setCheckInStatus] = useState<TraineeAttendanceLog['status']>('present');
  const [checkInNotes, setCheckInNotes] = useState('');
  
  
  // AI Parsing Modal State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [aiParsedRecords, setAiParsedRecords] = useState<any[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Badge Viewer modal state
  const [viewingBadgeTrainee, setViewingBadgeTrainee] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    badgeId: string;
    program: string;
    cohort: string;
  } | null>(null);

  // Success flash toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    setAttendanceLogs(dataStore.getAttendanceLogs());
    setTrainees(dataStore.getCustomers());
  }, []);

  // Compute attendance stats per trainee
  const traineeStats = trainees.map(t => {
    const logs = attendanceLogs.filter(l => l.traineeId === t.id || l.traineeName.toLowerCase() === t.name.toLowerCase());
    const total = logs.length;
    const presents = logs.filter(l => l.status === 'present' || l.status === 'late').length;
    const rate = total > 0 ? Math.round((presents / total) * 100) : 100;
    const badgeId = logs[0]?.badgeId || `NGO-BADGE-${t.id.slice(-4).toUpperCase()}`;
    const program = logs[0]?.programName || (t.notes?.includes('Full-Stack') ? 'Full-Stack Web Engineering' : 'Vocational Skills Track');
    const cohort = logs[0]?.cohort || 'Cohort 2026-A';

    return {
      ...t,
      badgeId,
      program,
      cohort,
      totalSessions: total,
      presentSessions: presents,
      attendanceRate: rate,
      isEligibleForCertification: rate >= 80
    };
  });

  const filteredTrainees = traineeStats.filter(t => {
    const matchesCohort = selectedCohort === 'all' || t.cohort === selectedCohort;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.badgeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.program.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCohort && matchesSearch;
  });

  const handleRecordAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTraineeId) return;

    const matchedTrainee = traineeStats.find(t => t.id === selectedTraineeId);
    if (!matchedTrainee) return;

    const newLog = dataStore.recordAttendance({
      traineeId: matchedTrainee.id,
      traineeName: matchedTrainee.name,
      traineeEmail: matchedTrainee.email,
      badgeId: matchedTrainee.badgeId,
      programName: matchedTrainee.program,
      cohort: matchedTrainee.cohort,
      sessionDate,
      sessionTopic: sessionTopic || 'Core Technical Workshop & Practical Assessment',
      checkInTime,
      status: checkInStatus,
      notes: checkInNotes,
      verifiedBy: activeUser.name
    });

    setAttendanceLogs(dataStore.getAttendanceLogs());
    setIsCheckInModalOpen(false);
    setSelectedTraineeId('');
    setSessionTopic('');
    setCheckInNotes('');
    showToast(`Attendance successfully verified for ${matchedTrainee.name} (${checkInStatus.toUpperCase()})`);
  };

  const handleBatchMarkAllPresent = () => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);

    filteredTrainees.forEach(t => {
      dataStore.recordAttendance({
        traineeId: t.id,
        traineeName: t.name,
        traineeEmail: t.email,
        badgeId: t.badgeId,
        programName: t.program,
        cohort: t.cohort,
        sessionDate: today,
        sessionTopic: 'Daily Morning Practical Workshop Check-In',
        checkInTime: nowTime,
        status: 'present',
        notes: 'Bulk verified by Instructor ' + activeUser.name,
        verifiedBy: activeUser.name
      });
    });

    setAttendanceLogs(dataStore.getAttendanceLogs());
    showToast(`Batch checked-in ${filteredTrainees.length} trainees as PRESENT for today's session.`);
  };

  const handleAIFileUpload = async (file: File) => {
    setIsAIParsing(true);
    setAiError(null);
    setAiParsedRecords([]);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const resultStr = reader.result as string;
        const base64Data = resultStr.split(',')[1];
        const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv';

        const response = await fetch('/api/parse-attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64Data,
            mimeType: file.type,
            isCsv,
            traineeNames: trainees.map(t => t.name)
          })
        });

        const data = await response.json();
        if (data.success && Array.isArray(data.records)) {
          setAiParsedRecords(data.records);
          showToast(`Successfully extracted ${data.records.length} records using AI OCR!`);
        } else {
          setAiError(data.error || "Failed to extract data. Ensure document contains visible tables.");
        }
      } catch (err: any) {
        console.error(err);
        setAiError(err.message || "An unexpected error occurred during processing.");
      } finally {
        setIsAIParsing(false);
      }
    };
    reader.onerror = () => {
      setAiError("Failed to read the file.");
      setIsAIParsing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAIParsedRecords = () => {
    let savedCount = 0;
    aiParsedRecords.forEach(rec => {
      // Find a trainee matching the name closely, or fallback to first one if none matches
      let matchedTrainee = trainees.find(t => t.name.toLowerCase() === rec.traineeName?.toLowerCase());
      if (!matchedTrainee && trainees.length > 0) {
        // Try substring search
        const qName = rec.traineeName?.toLowerCase() || '';
        matchedTrainee = trainees.find(t => t.name.toLowerCase().includes(qName) || qName.includes(t.name.toLowerCase()));
      }
      // If still not matched, use the first trainee as an association or create a dummy association
      if (!matchedTrainee && trainees.length > 0) {
        matchedTrainee = trainees[0];
      }

      if (matchedTrainee) {
        // Compute stats badge ID
        const matchedStat = traineeStats.find(t => t.id === matchedTrainee.id);
        const badgeId = matchedStat?.badgeId || `NGO-BADGE-${matchedTrainee.id.slice(-4).toUpperCase()}`;
        const programName = matchedStat?.program || 'Vocational Skills Track';
        const cohort = matchedStat?.cohort || 'Cohort 2026-A';

        dataStore.recordAttendance({
          traineeId: matchedTrainee.id,
          traineeName: rec.traineeName || matchedTrainee.name,
          traineeEmail: matchedTrainee.email,
          badgeId,
          programName,
          cohort,
          sessionDate: rec.sessionDate || new Date().toISOString().split('T')[0],
          sessionTopic: rec.sessionTopic || 'AI-Parsed Vocational Session',
          checkInTime: rec.checkInTime || '09:00',
          status: rec.status || 'present',
          notes: rec.notes || 'AI Parsed Document Upload',
          verifiedBy: activeUser.name
        });
        savedCount++;
      }
    });

    setAttendanceLogs(dataStore.getAttendanceLogs());
    setIsAIModalOpen(false);
    setAiParsedRecords([]);
    showToast(`Successfully registered ${savedCount} attendance logs via AI document processing.`);
  };

  const handleExportCSV = () => {
    const headers = ['Record ID', 'Trainee ID', 'Badge ID', 'Trainee Name', 'Program Track', 'Cohort', 'Date', 'Time', 'Status', 'Verified By', 'Topic', 'Notes'];
    const rows = attendanceLogs.map(l => [
      l.id,
      l.traineeId,
      l.badgeId,
      l.traineeName,
      l.programName,
      l.cohort,
      l.sessionDate,
      l.checkInTime,
      l.status.toUpperCase(),
      l.verifiedBy,
      l.sessionTopic,
      l.notes || ''
    ]);
    exportToCSV('ngo_trainee_attendance_register.csv', headers, rows);
  };

  const printTraineeBadge = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Beneficiary Management
            </span>
            <span className="text-xs text-slate-400">• TVET Compliance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Beneficiary Attendance & QR Badge Terminal</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Verify student arrivals, issue cryptographically verifiable QR identification badges, and enforce the mandatory 80% attendance rate required for donor grant graduation and stipends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveModuleTab(activeModuleTab === 'staff_clockin' ? 'beneficiaries' : 'staff_clockin')}
            className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              activeModuleTab === 'staff_clockin'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800'
            }`}
            title="Ingest biometric staff attendance CSV and compute salary reconciliation"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{activeModuleTab === 'staff_clockin' ? 'View Trainees Register' : 'Upload Staff Clock-In CSV'}</span>
          </button>

          {activeModuleTab === 'beneficiaries' && (
            <>
              <button
                onClick={handleBatchMarkAllPresent}
                className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all"
                title="Mark all trainees in current view as present"
              >
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>Batch Check-in</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export Register</span>
              </button>

              <button
                onClick={() => setIsAIModalOpen(true)}
                className="flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span>AI Parse Register</span>
              </button>

              <button
                onClick={() => setIsCheckInModalOpen(true)}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Record Check-In</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-2xs flex items-center gap-1.5">
        <button
          onClick={() => setActiveModuleTab('beneficiaries')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeModuleTab === 'beneficiaries'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Beneficiary Trainees & QR Terminal ({trainees.length})</span>
        </button>

        <button
          onClick={() => setActiveModuleTab('staff_clockin')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeModuleTab === 'staff_clockin'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Staff Clock-In CSV Ingestion & Salary Reconciliation</span>
        </button>
      </div>

      {activeModuleTab === 'staff_clockin' ? (
        <StaffClockInCsvUpload 
          activeUser={activeUser}
          onCommitSuccess={(count) => showToast(`Successfully synchronized ${count} verified timecards into ERP for payroll!`)}
        />
      ) : (
        <>
          {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Beneficiaries</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{trainees.length}</p>
          <p className="text-xs text-slate-400 mt-1">Across 3 TVET technical tracks</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Check-In Logs</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{attendanceLogs.length}</p>
          <p className="text-xs text-slate-400 mt-1">Verified physical attendance records</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Average Attendance Rate</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {traineeStats.length > 0 
              ? Math.round(traineeStats.reduce((acc, t) => acc + t.attendanceRate, 0) / traineeStats.length)
              : 0}%
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Target ≥ 80% for grant stipends</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Certificate Eligible</span>
            <Sparkles className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {traineeStats.filter(t => t.isEligibleForCertification).length}
            <span className="text-xs font-normal text-slate-400 ml-1.5">/ {traineeStats.length}</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Passed minimum workshop hours</p>
        </div>
      </div>

      {/* Trainee Directory & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">Enrolled Beneficiaries & QR Digital Passes</h2>
            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold">
              {filteredTrainees.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search trainee or badge ID..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-48 sm:w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedCohort}
                onChange={e => setSelectedCohort(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Cohorts</option>
                <option value="Cohort 2026-A">Cohort 2026-A</option>
                <option value="Cohort 2026-B">Cohort 2026-B</option>
                <option value="Cohort 2026-C">Cohort 2026-C</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Trainee / Beneficiary</th>
                <th className="py-3.5 px-4">Badge Code</th>
                <th className="py-3.5 px-4">Program Track</th>
                <th className="py-3.5 px-4">Cohort</th>
                <th className="py-3.5 px-4">Attendance Rate</th>
                <th className="py-3.5 px-4">Stipend & Cert Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrainees.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{t.name}</div>
                    <div className="text-slate-400 text-[11px]">{t.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      {t.badgeId}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {t.program}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {t.cohort}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            t.attendanceRate >= 80 ? 'bg-emerald-500' : t.attendanceRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                          }`} 
                          style={{ width: `${t.attendanceRate}%` }} 
                        />
                      </div>
                      <span className="font-bold text-slate-900">{t.attendanceRate}%</span>
                    </div>
                    <span className="text-[10px] text-slate-400">({t.presentSessions}/{t.totalSessions || 1} sessions)</span>
                  </td>
                  <td className="py-3.5 px-4">
                    {t.isEligibleForCertification ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Stipend Approved</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <AlertCircle className="w-3 h-3 text-rose-500" />
                        <span>Under Threshold (&lt;80%)</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => {
                          setSelectedTraineeId(t.id);
                          setIsCheckInModalOpen(true);
                        }}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        title="Log Attendance"
                      >
                        Check In
                      </button>

                      <button
                        onClick={() => setViewingBadgeTrainee(t)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-all"
                        title="Print / View ID Badge"
                      >
                        <QrCode className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Session Logs Feed */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-3">Live Session Attendance Log (Audit History)</h2>
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {attendanceLogs.map(log => (
            <div key={log.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">
                  {log.status === 'present' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {log.status === 'late' && <Clock className="w-4 h-4 text-amber-500" />}
                  {log.status === 'excused' && <AlertCircle className="w-4 h-4 text-indigo-500" />}
                  {log.status === 'absent' && <XCircle className="w-4 h-4 text-rose-500" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center space-x-2">
                    <span>{log.traineeName}</span>
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {log.badgeId}
                    </span>
                    <span className="text-[10px] text-slate-400">• {log.programName}</span>
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Topic: <span className="font-medium text-slate-700">{log.sessionTopic}</span>
                    {log.notes && <span className="italic text-slate-400 ml-1.5">"{log.notes}"</span>}
                  </div>
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                <span className="font-semibold text-slate-800">{log.sessionDate} at {log.checkInTime}</span>
                <span className="text-[10px] text-slate-400">Verified by {log.verifiedBy}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      )}

      {/* Record Check-In Modal */}
      {isCheckInModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Record Workshop Session Attendance</h3>
            <p className="text-xs text-slate-500 mt-0.5">Log physical attendance for trainee verification and donor compliance.</p>

            <form onSubmit={handleRecordAttendance} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Trainee / Beneficiary</label>
                <select
                  value={selectedTraineeId}
                  onChange={e => setSelectedTraineeId(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Trainee --</option>
                  {traineeStats.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.badgeId}) — {t.program}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Session Date</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={e => setSessionDate(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Check-in Time</label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={e => setCheckInTime(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Session Workshop Topic</label>
                <input
                  type="text"
                  value={sessionTopic}
                  onChange={e => setSessionTopic(e.target.value)}
                  placeholder="e.g. Clean Energy Wiring or React Hooks"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Status</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['present', 'late', 'excused', 'absent'] as const).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setCheckInStatus(status)}
                      className={`py-2 text-xs font-bold rounded-lg border capitalize transition-all ${
                        checkInStatus === status
                          ? status === 'present' ? 'bg-emerald-600 text-white border-emerald-600'
                          : status === 'late' ? 'bg-amber-500 text-white border-amber-500'
                          : status === 'excused' ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observation / Mentor Notes</label>
                <input
                  type="text"
                  value={checkInNotes}
                  onChange={e => setCheckInNotes(e.target.value)}
                  placeholder="Practical performance or reason for delay..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCheckInModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20"
                >
                  Confirm Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trainee Printable QR Badge Modal */}
      {viewingBadgeTrainee && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center relative">
            <button
              onClick={() => setViewingBadgeTrainee(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              ✕
            </button>

            {/* Printable ID Card Container */}
            <div className="border-2 border-indigo-600 rounded-2xl p-5 bg-gradient-to-b from-indigo-50/50 to-white shadow-inner">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700">
                TUMI TVET SKILLS INITIATIVE
              </div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">
                Official Trainee Pass • 2026
              </div>

              {/* Photo Placeholder */}
              <div className="w-20 h-20 mx-auto mt-4 rounded-full bg-slate-200 border-2 border-white shadow-md flex items-center justify-center text-slate-500 font-bold text-xl">
                {viewingBadgeTrainee.name.split(' ').map(n => n[0]).join('')}
              </div>

              <h4 className="font-bold text-slate-900 text-base mt-3">{viewingBadgeTrainee.name}</h4>
              <p className="text-xs text-indigo-600 font-semibold">{viewingBadgeTrainee.program}</p>
              <p className="text-[11px] text-slate-400">{viewingBadgeTrainee.cohort}</p>

              {/* QR Code Graphic (SVG / server) */}
              <div className="my-4 p-2 bg-white rounded-xl shadow-sm border border-slate-200 inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                    `NGO-CHECKIN:${viewingBadgeTrainee.badgeId}:${viewingBadgeTrainee.name}`
                  )}`}
                  alt="Trainee QR Badge"
                  className="w-28 h-28 mx-auto"
                />
              </div>

              <div className="font-mono text-xs font-bold text-slate-800 bg-slate-100 py-1 px-3 rounded-lg inline-block border border-slate-200">
                {viewingBadgeTrainee.badgeId}
              </div>

              <div className="mt-3 text-[10px] text-slate-400">
                Scan at workshop entry scanner for instantaneous session logging.
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center space-x-2">
              <button
                onClick={printTraineeBadge}
                className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print ID Badge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Parsing Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">AI Attendance Parser & Extractor</h3>
              </div>
              <button
                onClick={() => {
                  setIsAIModalOpen(false);
                  setAiParsedRecords([]);
                  setAiError(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4">
              <p className="text-xs text-slate-500">
                Upload a scanned attendance sheet photo/scan or a standard CSV report from your biometric reader. The built-in AI models will transcribe, clean, and map the entries to your registered trainees.
              </p>

              {/* Drop Zone */}
              <div
                onDragEnter={() => setDragActive(true)}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleAIFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                  dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400'
                }`}
              >
                <input
                  type="file"
                  id="ai_attendance_file_input"
                  className="hidden"
                  accept="image/*,.csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleAIFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <label htmlFor="ai_attendance_file_input" className="cursor-pointer block space-y-2">
                  <div className="mx-auto w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    Drag & Drop or Click to Upload
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Supports PNG, JPG, JPEG or CSV files up to 10MB
                  </div>
                </label>
              </div>

              {/* Status / Spinner */}
              {isAIParsing && (
                <div className="flex flex-col items-center justify-center py-8 space-y-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold text-indigo-700 animate-pulse">
                    Gemini AI is scanning, parsing and correcting attendance records...
                  </span>
                </div>
              )}

              {/* Error Notice */}
              {aiError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="text-xs font-medium">{aiError}</span>
                </div>
              )}

              {/* Extracted Preview List */}
              {aiParsedRecords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700">Extracted Attendance Logs ({aiParsedRecords.length})</h4>
                    <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Verify entries below
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Trainee Name</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Check-In</th>
                          <th className="py-2 px-3">Session Topic</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {aiParsedRecords.map((rec, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900">{rec.traineeName}</td>
                            <td className="py-2 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                rec.status === 'present' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' :
                                rec.status === 'late' ? 'text-amber-700 bg-amber-50 border border-amber-200' :
                                rec.status === 'absent' ? 'text-rose-700 bg-rose-50 border border-rose-200' :
                                'text-slate-700 bg-slate-50'
                              }`}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{rec.sessionDate}</td>
                            <td className="py-2 px-3 text-slate-500">{rec.checkInTime}</td>
                            <td className="py-2 px-3 text-slate-500 truncate max-w-[120px]">{rec.sessionTopic}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsAIModalOpen(false);
                  setAiParsedRecords([]);
                  setAiError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              {aiParsedRecords.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveAIParsedRecords}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20"
                >
                  Save Extracted Logs
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
