import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  CreditCard, 
  Award, 
  ShieldCheck, 
  UserCheck,
  Sparkles,
  AlertCircle,
  FileText
} from 'lucide-react';
import { dataStore } from '../config/firebase';
import { 
  UserProfile, 
  LeaveRequestRecord, 
  PerformanceReviewRecord, 
  PayrollRunRecord, 
  TimeCard 
} from '../types/erp';
import EmployeeDirectoryTab from './hr/EmployeeDirectoryTab';
import LeaveManagementTab from './hr/LeaveManagementTab';
import AttendanceTimecardsTab from './hr/AttendanceTimecardsTab';
import PayrollProcessingTab from './hr/PayrollProcessingTab';
import PerformanceReviewsTab from './hr/PerformanceReviewsTab';
import CompanyPolicyGeneratorTab from './hr/CompanyPolicyGeneratorTab';
import AIDocumentDraftingTab from './hr/AIDocumentDraftingTab';
import ComplaintsQueryDeskTab from './hr/ComplaintsQueryDeskTab';
import StaffOnboardingAndHR from './StaffOnboardingAndHR';
import StaffAttendanceRoster from './StaffAttendanceRoster';

export default function HRProfiles({ activeUser }: { activeUser: UserProfile }) {
  const [subTab, setSubTab] = useState<'directory' | 'onboarding' | 'roster' | 'ai_contracts' | 'complaints' | 'leave' | 'attendance' | 'payroll' | 'performance' | 'policy'>('directory');

  // Datasets
  const [users, setUsers] = useState<UserProfile[]>(() => dataStore.getUsers());
  const [timecards, setTimecards] = useState<TimeCard[]>(() => dataStore.getTimeCards());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>(() => dataStore.getLeaveRequests());
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReviewRecord[]>(() => dataStore.getPerformanceReviews());
  const [payrollRuns, setPayrollRuns] = useState<PayrollRunRecord[]>(() => dataStore.getPayrollRuns());

  useEffect(() => {
    setUsers(dataStore.getUsers());
    setTimecards(dataStore.getTimeCards());
    setLeaveRequests(dataStore.getLeaveRequests());
    setPerformanceReviews(dataStore.getPerformanceReviews());
    setPayrollRuns(dataStore.getPayrollRuns());

    const unsubUsers = dataStore.subscribeToCollection('users', () => {
      setUsers(dataStore.getUsers());
    });
    const unsubTimes = dataStore.subscribeToCollection('time_cards', () => {
      setTimecards(dataStore.getTimeCards());
    });

    return () => {
      unsubUsers();
      unsubTimes();
    };
  }, []);

  // Employee Handlers
  const handleAddUser = (newUser: UserProfile) => {
    const updated = [...users, newUser];
    dataStore.saveUsers(updated);
    setUsers(updated);
  };

  const handleUpdateUser = (uid: string, updates: Partial<UserProfile>) => {
    const updated = users.map(u => u.uid === uid ? { ...u, ...updates } : u);
    dataStore.saveUsers(updated);
    setUsers(updated);
  };

  const handleDeleteUser = (uid: string) => {
    const updated = users.filter(u => u.uid !== uid);
    dataStore.saveUsers(updated);
    setUsers(updated);
  };

  // Leave Handlers
  const handleAddLeaveRequest = (req: Omit<LeaveRequestRecord, 'id' | 'status' | 'requestedAt'>) => {
    dataStore.addLeaveRequest(req);
    setLeaveRequests(dataStore.getLeaveRequests());
  };

  const handleUpdateLeaveStatus = (id: string, status: 'approved' | 'rejected', notes?: string) => {
    dataStore.updateLeaveRequestStatus(id, status, activeUser.name, notes);
    setLeaveRequests(dataStore.getLeaveRequests());
  };

  // Timecard Handlers
  const handleClockIn = (userId: string, userName: string, role: string) => {
    const newCard: TimeCard = {
      id: 'tc_' + Date.now(),
      userId,
      userName,
      role,
      date: new Date().toISOString().slice(0, 10),
      clockIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'active'
    };
    const updated = [newCard, ...timecards];
    dataStore.saveTimeCards(updated);
    setTimecards(updated);
  };

  const handleClockOut = (timecardId: string) => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = timecards.map(t => {
      if (t.id === timecardId) {
        return {
          ...t,
          clockOut: nowStr,
          status: 'completed' as const,
          hoursWorked: 8.0 // standard shift computation
        };
      }
      return t;
    });
    dataStore.saveTimeCards(updated);
    setTimecards(updated);
  };

  // Payroll Handlers
  const handleAddPayrollRun = (run: Omit<PayrollRunRecord, 'id' | 'processedAt'>) => {
    dataStore.addPayrollRun(run);
    setPayrollRuns(dataStore.getPayrollRuns());
  };

  const handleUpdatePayrollStatus = (id: string, status: 'disbursed') => {
    // If updating existing run
    const current = dataStore.getPayrollRuns();
    const updated = current.map(r => r.id === id ? { ...r, status } : r);
    dataStore.savePayrollRuns(updated);
    setPayrollRuns(updated);
  };

  // Performance Review Handlers
  const handleAddPerformanceReview = (review: Omit<PerformanceReviewRecord, 'id'>) => {
    dataStore.addPerformanceReview(review);
    setPerformanceReviews(dataStore.getPerformanceReviews());
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              HR and Roles Enterprise Management
              <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase">
                Staff & Operations
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Staff Directory, RBAC Permissions, Leave & Absences, Shift Clock, Automated Payroll & Performance Appraisals
            </p>
          </div>
        </div>

        {/* HR Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200">
          {[
            { id: 'directory', label: 'Staff & Roles', icon: Users },
            { id: 'onboarding', label: 'Onboarding & Loans', icon: UserCheck },
            { id: 'roster', label: 'Shift Roster & Clockin', icon: Calendar },
            { id: 'ai_contracts', label: 'AI Contracts & Letters', icon: Sparkles },
            { id: 'complaints', label: 'Complaints Desk', icon: AlertCircle },
            { id: 'leave', label: 'Leave & PTO', icon: Calendar },
            { id: 'attendance', label: 'Attendance & Clock', icon: Clock },
            { id: 'payroll', label: 'Payroll & Slips', icon: CreditCard },
            { id: 'performance', label: 'Appraisals', icon: Award },
            { id: 'policy', label: 'Policy & AI Compliance', icon: ShieldCheck }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER ACTIVE HR SUB-TAB */}
      {subTab === 'directory' && (
        <EmployeeDirectoryTab
          users={users}
          activeUser={activeUser}
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {subTab === 'onboarding' && (
        <StaffOnboardingAndHR
          activeUser={activeUser}
          users={users}
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
        />
      )}

      {subTab === 'roster' && (
        <StaffAttendanceRoster activeUser={activeUser} />
      )}

      {subTab === 'ai_contracts' && (
        <AIDocumentDraftingTab activeUser={activeUser} />
      )}

      {subTab === 'complaints' && (
        <ComplaintsQueryDeskTab activeUser={activeUser} />
      )}

      {subTab === 'leave' && (
        <LeaveManagementTab
          leaveRequests={leaveRequests}
          users={users}
          activeUser={activeUser}
          onAddLeaveRequest={handleAddLeaveRequest}
          onUpdateStatus={handleUpdateLeaveStatus}
        />
      )}

      {subTab === 'attendance' && (
        <AttendanceTimecardsTab
          timecards={timecards}
          users={users}
          activeUser={activeUser}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
        />
      )}

      {subTab === 'payroll' && (
        <PayrollProcessingTab
          payrollRuns={payrollRuns}
          users={users}
          activeUser={activeUser}
          onAddPayrollRun={handleAddPayrollRun}
          onUpdatePayrollStatus={handleUpdatePayrollStatus}
        />
      )}

      {subTab === 'performance' && (
        <PerformanceReviewsTab
          reviews={performanceReviews}
          users={users}
          activeUser={activeUser}
          onAddReview={handleAddPerformanceReview}
        />
      )}

      {subTab === 'policy' && (
        <CompanyPolicyGeneratorTab activeUser={activeUser} />
      )}
    </div>
  );
}
