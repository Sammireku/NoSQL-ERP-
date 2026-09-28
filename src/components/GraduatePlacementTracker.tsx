import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Users, 
  Plus, 
  Download, 
  Filter, 
  Search, 
  Phone, 
  Mail, 
  MessageSquare,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { UserProfile, GraduatePlacementRecord, CustomerProfile } from '../types/erp';
import { dataStore } from '../config/firebase';
import { exportToCSV } from '../utils/exportUtils';

interface GraduatePlacementTrackerProps {
  activeUser: UserProfile;
}

export default function GraduatePlacementTracker({ activeUser }: GraduatePlacementTrackerProps) {
  const [placements, setPlacements] = useState<GraduatePlacementRecord[]>([]);
  const [trainees, setTrainees] = useState<CustomerProfile[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Placement Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTraineeId, setSelectedTraineeId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<GraduatePlacementRecord['employmentStatus']>('employed_full_time');
  const [employerName, setEmployerName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [placementDate, setPlacementDate] = useState(new Date().toISOString().split('T')[0]);
  const [verificationStatus, setVerificationStatus] = useState<GraduatePlacementRecord['verificationStatus']>('verified');
  const [notes, setNotes] = useState('');

  // Add Follow-Up Modal State
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [activePlacementForFollowUp, setActivePlacementForFollowUp] = useState<GraduatePlacementRecord | null>(null);
  const [followUpPeriod, setFollowUpPeriod] = useState<'30_days' | '90_days' | '180_days'>('30_days');
  const [stillEmployed, setStillEmployed] = useState(true);
  const [feedbackNotes, setFeedbackNotes] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    setPlacements(dataStore.getGraduatePlacements());
    setTrainees(dataStore.getCustomers());
  }, []);

  const totalGraduates = placements.length;
  const employedGraduates = placements.filter(p => 
    p.employmentStatus === 'employed_full_time' || 
    p.employmentStatus === 'employed_part_time' || 
    p.employmentStatus === 'self_employed_freelance' || 
    p.employmentStatus === 'business_founder' || 
    p.employmentStatus === 'apprenticeship_internship'
  );
  
  const placementRate = totalGraduates > 0 
    ? Math.round((employedGraduates.length / totalGraduates) * 100) 
    : 0;

  const validSalaries = placements
    .filter(p => p.monthlySalary && p.monthlySalary > 0)
    .map(p => p.monthlySalary!);
  
  const averageSalary = validSalaries.length > 0 
    ? Math.round(validSalaries.reduce((a, b) => a + b, 0) / validSalaries.length) 
    : 0;

  const filteredPlacements = placements.filter(p => {
    const matchesStatus = statusFilter === 'all' || p.employmentStatus === statusFilter;
    const matchesSearch = p.traineeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.employerName && p.employerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.jobTitle && p.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          p.programName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreatePlacement = (e: React.FormEvent) => {
    e.preventDefault();
    const trainee = trainees.find(t => t.id === selectedTraineeId);
    if (!trainee) return;

    const newPlacement = dataStore.addGraduatePlacement({
      traineeId: trainee.id,
      traineeName: trainee.name,
      traineeEmail: trainee.email,
      traineePhone: trainee.phone,
      programName: 'Full-Stack Web Engineering',
      cohort: 'Cohort 2026-A',
      graduationDate: new Date().toISOString().split('T')[0],
      employmentStatus,
      employerName,
      jobTitle,
      monthlySalary: Number(monthlySalary) || 0,
      currency,
      placementDate,
      verificationStatus,
      notes,
      followUps: []
    });

    setPlacements(dataStore.getGraduatePlacements());
    setIsAddModalOpen(false);
    setSelectedTraineeId('');
    setEmployerName('');
    setJobTitle('');
    setMonthlySalary('');
    setNotes('');
    showToast(`Career placement verified for ${trainee.name}`);
  };

  const handleAddFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlacementForFollowUp) return;

    const currentPlacements = dataStore.getGraduatePlacements();
    const updated = currentPlacements.map(p => {
      if (p.id === activePlacementForFollowUp.id) {
        return {
          ...p,
          followUps: [
            ...p.followUps,
            {
              period: followUpPeriod,
              date: new Date().toISOString().split('T')[0],
              stillEmployed,
              feedbackNotes,
              conductedBy: activeUser.name
            }
          ]
        };
      }
      return p;
    });

    dataStore.saveGraduatePlacements(updated);
    setPlacements(updated);
    setIsFollowUpModalOpen(false);
    setFeedbackNotes('');
    showToast(`Follow-up record logged for ${activePlacementForFollowUp.traineeName}.`);
  };

  const handleExportCSV = () => {
    const headers = [
      'Record ID', 
      'Graduate Name', 
      'Email', 
      'Phone', 
      'Program', 
      'Employment Status', 
      'Employer', 
      'Job Title', 
      'Monthly Salary ($)', 
      'Placement Date', 
      'Verification Status'
    ];
    const rows = placements.map(p => [
      p.id,
      p.traineeName,
      p.traineeEmail,
      p.traineePhone,
      p.programName,
      p.employmentStatus.toUpperCase(),
      p.employerName || 'N/A',
      p.jobTitle || 'N/A',
      p.monthlySalary || 0,
      p.placementDate || '',
      p.verificationStatus.toUpperCase()
    ]);
    exportToCSV('ngo_alumni_employment_placements.csv', headers, rows);
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
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Monitoring & Evaluation (M&E)
            </span>
            <span className="text-xs text-slate-400">• Post-Graduation Impact</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Graduate Employment & Placement Tracker</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Track alumni career outcomes, employer contracts, verified salaries, and long-term 30/90/180-day employment retention benchmarks required by donor audit frameworks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Placement Report</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Job Placement</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Graduation Placement Rate</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{placementRate}%</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Donor benchmark target: ≥ 70%</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Verified Placements</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{employedGraduates.length}</p>
          <p className="text-xs text-slate-400 mt-1">Of {totalGraduates} alumni tracked</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Average Starting Wage</span>
          <p className="text-2xl font-black text-slate-900 mt-2">${averageSalary}</p>
          <p className="text-xs text-slate-400 mt-1">Monthly wage baseline across tracks</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Entrepreneurship / Startups</span>
          <p className="text-2xl font-black text-indigo-600 mt-2">
            {placements.filter(p => p.employmentStatus === 'self_employed_freelance').length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Independent micro-business ventures</p>
        </div>
      </div>

      {/* Filter and Placement Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">Alumni Career Records</h2>
            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold">
              {filteredPlacements.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search alumni, employer, or role..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-48 sm:w-64 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Employment Statuses</option>
                <option value="employed_full_time">Employed Full-Time</option>
                <option value="self_employed_freelance">Self-Employed / Entrepreneur</option>
                <option value="apprenticeship_internship">Apprenticeship / Internship</option>
                <option value="seeking_employment">Job Seeking</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Graduate / Contact</th>
                <th className="py-3.5 px-4">Program Track</th>
                <th className="py-3.5 px-4">Employment Status</th>
                <th className="py-3.5 px-4">Employer & Job Title</th>
                <th className="py-3.5 px-4">Starting Salary</th>
                <th className="py-3.5 px-4">Retention Follow-Ups</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlacements.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{p.traineeName}</div>
                    <div className="text-slate-400 text-[11px] flex items-center space-x-2 mt-0.5">
                      <span>{p.traineeEmail}</span>
                      <span>•</span>
                      <span>{p.traineePhone}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{p.programName}</div>
                    <div className="text-slate-400 text-[10px]">{p.cohort}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    {p.employmentStatus === 'employed_full_time' && (
                      <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Employed (Full-Time)</span>
                      </span>
                    )}
                    {p.employmentStatus === 'self_employed_freelance' && (
                      <span className="inline-flex items-center space-x-1 text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <Building2 className="w-3 h-3 text-indigo-500" />
                        <span>Self-Employed / Freelance</span>
                      </span>
                    )}
                    {p.employmentStatus === 'business_founder' && (
                      <span className="inline-flex items-center space-x-1 text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <Building2 className="w-3 h-3 text-purple-500 animate-pulse" />
                        <span>Business Founder / Job Creator</span>
                      </span>
                    )}
                    {p.employmentStatus === 'apprenticeship_internship' && (
                      <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>Paid Apprenticeship</span>
                      </span>
                    )}
                    {p.employmentStatus === 'seeking_employment' && (
                      <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <AlertCircle className="w-3 h-3 text-rose-500" />
                        <span>Seeking Placement</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{p.employerName || 'Independent Practice'}</div>
                    <div className="text-slate-500 text-[11px]">{p.jobTitle || 'N/A'}</div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {p.monthlySalary ? `$${p.monthlySalary.toLocaleString()}/mo` : '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      {p.followUps.length > 0 ? (
                        p.followUps.map((f, idx) => (
                          <div key={idx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium inline-block mr-1">
                            {f.period.replace('_', ' ').toUpperCase()}: {f.stillEmployed ? 'Retained' : 'Left'}
                          </div>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Pending 30-day survey</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setActivePlacementForFollowUp(p);
                        setIsFollowUpModalOpen(true);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    >
                      Log Survey
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Placement Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Record Graduate Job Placement</h3>
            <p className="text-xs text-slate-500 mt-0.5">Enter verified employment contract details for M&E donor audit.</p>

            <form onSubmit={handleCreatePlacement} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Graduate</label>
                <select
                  value={selectedTraineeId}
                  onChange={e => setSelectedTraineeId(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                >
                  <option value="">-- Choose Alumni Trainee --</option>
                  {trainees.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={employmentStatus}
                    onChange={e => setEmploymentStatus(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  >
                    <option value="employed_full_time">Employed Full-Time</option>
                    <option value="employed_part_time">Employed Part-Time</option>
                    <option value="self_employed_freelance">Self-Employed / Freelance Practice</option>
                    <option value="business_founder">Business Founder / Created Own Job</option>
                    <option value="apprenticeship_internship">Apprenticeship / Internship</option>
                    <option value="seeking_employment">Seeking Employment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Placement Date</label>
                  <input
                    type="date"
                    value={placementDate}
                    onChange={e => setPlacementDate(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employer / Company Name</label>
                  <input
                    type="text"
                    value={employerName}
                    onChange={e => setEmployerName(e.target.value)}
                    placeholder="e.g. Apex Solar Energy Ltd"
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="e.g. Junior Solar Engineer"
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Starting Salary</label>
                  <input
                    type="number"
                    value={monthlySalary}
                    onChange={e => setMonthlySalary(e.target.value)}
                    placeholder="e.g. 1200"
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Verification Status</label>
                  <select
                    value={verificationStatus}
                    onChange={e => setVerificationStatus(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  >
                    <option value="verified">Verified (Offer Letter / Contract on File)</option>
                    <option value="pending_proof">Pending Documentation</option>
                    <option value="unconfirmed">Self-Reported Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Verification Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Offer letter signed, mentor verified supervisor contact..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20"
                >
                  Confirm Placement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Retention Survey Modal */}
      {isFollowUpModalOpen && activePlacementForFollowUp && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Conduct Retention Follow-up Survey</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Surveying {activePlacementForFollowUp.traineeName} at {activePlacementForFollowUp.employerName}
            </p>

            <form onSubmit={handleAddFollowUp} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-up Milestone</label>
                <select
                  value={followUpPeriod}
                  onChange={e => setFollowUpPeriod(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                >
                  <option value="30_days">30-Day Check-in (1 Month Post-Hire)</option>
                  <option value="90_days">90-Day Check-in (3 Months Post-Hire)</option>
                  <option value="180_days">180-Day Check-in (6 Months Retention)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Retention Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStillEmployed(true)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      stillEmployed ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Still Employed
                  </button>
                  <button
                    type="button"
                    onClick={() => setStillEmployed(false)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      !stillEmployed ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Separated / Left
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employer & Trainee Feedback Notes</label>
                <textarea
                  rows={3}
                  value={feedbackNotes}
                  onChange={e => setFeedbackNotes(e.target.value)}
                  placeholder="Supervisor reported high technical competency; trainee commended team culture..."
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsFollowUpModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md"
                >
                  Record Survey
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
