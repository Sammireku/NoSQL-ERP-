import React, { useState } from 'react';
import { 
  Award, 
  Plus, 
  Search, 
  Download, 
  Star, 
  TrendingUp, 
  User, 
  CheckCircle2, 
  Calendar, 
  Sparkles,
  X,
  Target
} from 'lucide-react';
import { PerformanceReviewRecord, UserProfile } from '../../types/erp';
import { exportToCSV } from '../../utils/exportUtils';

interface PerformanceReviewsTabProps {
  reviews: PerformanceReviewRecord[];
  users: UserProfile[];
  activeUser: UserProfile;
  onAddReview: (review: Omit<PerformanceReviewRecord, 'id'>) => void;
}

export default function PerformanceReviewsTab({
  reviews,
  users,
  activeUser,
  onAddReview
}: PerformanceReviewsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.uid || '');
  const [period, setPeriod] = useState('Q2 2026 Annual Evaluation');
  const [rating, setRating] = useState<number>(5);
  const [achievements, setAchievements] = useState('');
  const [improvements, setImprovements] = useState('');
  const [goals, setGoals] = useState('');

  const filteredReviews = reviews.filter(r => 
    r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reviewerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.period.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = users.find(u => u.uid === selectedUserId) || users[0];
    if (!achievements.trim()) return;

    onAddReview({
      userId: emp.uid,
      userName: emp.name,
      employeeName: emp.name,
      role: emp.role,
      reviewerId: activeUser.uid,
      reviewerName: activeUser.name,
      reviewDate: new Date().toISOString().slice(0, 10),
      period,
      overallRating: rating,
      rating,
      keyAchievements: achievements.trim(),
      achievements: achievements.trim(),
      developmentAreas: improvements.trim() || 'Continue current trajectory',
      areasForImprovement: improvements.trim() || 'Continue current trajectory',
      goalsNextPeriod: goals.trim() || 'Expand cross-departmental impact',
      status: 'completed'
    });

    setIsAddModalOpen(false);
    setAchievements('');
    setImprovements('');
    setGoals('');
  };

  const handleExport = () => {
    const data = filteredReviews.map(r => ({
      'Employee': r.employeeName,
      'Review Period': r.period,
      'Date': r.reviewDate,
      'Reviewer': r.reviewerName,
      'Score (1-5)': r.rating,
      'Key Achievements': r.achievements,
      'Improvement Areas': r.areasForImprovement,
      'Goals for Next Period': r.goalsNextPeriod
    }));
    exportToCSV(data, `Performance_Reviews_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Performance Appraisals & Talent Growth
          </h2>
          <p className="text-xs text-slate-500">Periodic staff evaluations, KPI scorecards, milestones and promotional tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Conduct Review</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Evaluations</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{reviews.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Formal appraisal records completed</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Composite Score</span>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-indigo-600">{avgRating} / 5.0</p>
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Enterprise organizational benchmark</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Retention Rate</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">96.4%</p>
          <p className="text-[11px] text-slate-400 mt-1">High-performer satisfaction index</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div className="text-xs font-semibold text-slate-700">Appraisal Records ({filteredReviews.length})</div>
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee or period..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-indigo-500"
          />
        </div>
      </div>

      {/* Reviews Cards List */}
      <div className="space-y-3">
        {filteredReviews.map(r => (
          <div key={r.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{r.employeeName}</h3>
                <p className="text-xs text-slate-500">{r.period} • Conducted by {r.reviewerName} on {r.reviewDate}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                <span className="text-xs font-bold text-amber-900">{r.rating}.0 / 5.0</span>
                <div className="flex text-amber-500">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] block mb-1">
                  Key Achievements
                </span>
                <p className="text-slate-700">{r.achievements}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="font-bold text-amber-700 uppercase tracking-wider text-[10px] block mb-1">
                  Areas for Development
                </span>
                <p className="text-slate-700">{r.areasForImprovement}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] block mb-1">
                  Next Period Milestones
                </span>
                <p className="text-slate-700">{r.goalsNextPeriod}</p>
              </div>
            </div>
          </div>
        ))}

        {filteredReviews.length === 0 && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            No appraisal records found.
          </div>
        )}
      </div>

      {/* Conduct Appraisal Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                Conduct Performance Appraisal
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Staff Member *</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Evaluation Cycle / Period</label>
                  <input
                    type="text"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Composite Rating Score (1 to 5 Stars)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRating(num)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${
                        rating >= num ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${rating >= num ? 'fill-amber-400 text-amber-400' : ''}`} />
                      <span>{num}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Key Deliverables & Major Achievements *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Led Q2 customer expansion with 130% quota attainment..."
                  value={achievements}
                  onChange={(e) => setAchievements(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Growth Opportunities & Areas for Improvement</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Opportunity to mentor junior associates..."
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Goals for Next Cycle</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Complete advanced leadership certification..."
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-all"
                >
                  Save Appraisal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
