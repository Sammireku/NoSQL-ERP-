import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Search, 
  Download, 
  CheckCircle2, 
  Play, 
  Square, 
  Calendar, 
  User, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { TimeCard, UserProfile } from '../../types/erp';
import { exportToCSV } from '../../utils/exportUtils';

interface AttendanceTimecardsTabProps {
  timecards: TimeCard[];
  users: UserProfile[];
  activeUser: UserProfile;
  onClockIn: (userId: string, userName: string, role: string) => void;
  onClockOut: (timecardId: string) => void;
}

export default function AttendanceTimecardsTab({
  timecards,
  users,
  activeUser,
  onClockIn,
  onClockOut
}: AttendanceTimecardsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Keep live time ticking
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Find if activeUser is currently clocked in
  const activeUserCard = timecards.find(t => t.userId === activeUser.uid && (!t.clockOut || t.clockOut === ''));

  const filteredCards = timecards.filter(t => 
    t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.date.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentlyClockedInCount = timecards.filter(t => !t.clockOut || t.clockOut === '').length;

  const handleExport = () => {
    const data = filteredCards.map(t => ({
      'Timecard ID': t.id,
      'Employee': t.userName,
      'Role': t.role.toUpperCase(),
      'Date': t.date,
      'Clock In': t.clockIn,
      'Clock Out': t.clockOut || 'CURRENTLY ON SHIFT',
      'Hours Worked': t.hoursWorked || 'Active'
    }));
    exportToCSV(data, `Attendance_Timecards_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Attendance Timecards & Biometric Shift Clock
          </h2>
          <p className="text-xs text-slate-500">Real-time terminal shift logging, punch in/out verification and work duration audit</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Timecards</span>
          </button>
        </div>
      </div>

      {/* Clock In / Out Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl text-white shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
            <Clock className="w-7 h-7 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <div className="text-xs text-indigo-200 font-medium uppercase tracking-wider">
              Shift Clock Terminal • {activeUser.name} ({activeUser.role.toUpperCase()})
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-white mt-0.5">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="text-xs text-indigo-300">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeUserCard ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase rounded">
                  Active On Shift
                </span>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">Since {activeUserCard.clockIn}</p>
              </div>
              <button
                onClick={() => onClockOut(activeUserCard.id)}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Clock Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300">Currently off shift</span>
              <button
                onClick={() => onClockIn(activeUser.uid, activeUser.name, activeUser.role)}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Clock In Now</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Personnel Currently On Duty</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{currentlyClockedInCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Active timecards logged</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Shift Logs</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{timecards.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Historical attendance entries</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Punctuality Score</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">98.2%</p>
          <p className="text-[11px] text-slate-400 mt-1">Shift compliance average</p>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div className="text-xs font-semibold text-slate-700">Attendance Log History ({filteredCards.length})</div>
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee or role..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Clock Out</th>
                <th className="py-3 px-4 text-right">Hours Worked</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCards.map(t => {
                const isActive = !t.clockOut || t.clockOut === '';
                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {t.date}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {t.userName}
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-semibold text-slate-500">
                      {t.role}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                      {t.clockIn}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                      {t.clockOut || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {t.hoursWorked ? `${t.hoursWorked.toFixed(1)} hrs` : isActive ? 'Active' : '0.0 hrs'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {isActive ? 'On Shift' : 'Completed'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredCards.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No timecard records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
