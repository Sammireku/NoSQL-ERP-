import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Copy,
  Trash2,
  Edit3,
  BarChart3,
  CheckCircle2,
  Calendar,
  Users,
  Search,
  Download,
  Share2,
  ChevronRight,
  ChevronDown,
  Clock,
  ArrowLeft,
  Sparkles,
  Award,
  Filter,
  CheckSquare,
  Radio,
  AlignLeft,
  Sliders,
  ListOrdered,
  Eye,
  Send,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  X,
  Building2,
  Briefcase
} from 'lucide-react';
import { 
  UserProfile, 
  GraduateAssessmentForm, 
  GraduateFormResponse, 
  FormQuestion, 
  FormQuestionType 
} from '../types/erp';
import { graduateFormStore } from '../utils/graduateFormStore';
import { dataStore } from '../config/firebase';
import { exportToCSV } from '../utils/exportUtils';

interface GraduateFormsManagerProps {
  activeUser: UserProfile;
  initialFormId?: string;
  onNavigateToGraduates?: () => void;
}

export default function GraduateFormsManager({
  activeUser,
  initialFormId,
  onNavigateToGraduates
}: GraduateFormsManagerProps) {
  const [forms, setForms] = useState<GraduateAssessmentForm[]>(() => graduateFormStore.getForms());
  const [responses, setResponses] = useState<GraduateFormResponse[]>(() => graduateFormStore.getResponses());
  
  // View states: 'container' | 'builder' | 'analytics' | 'filler'
  const [currentView, setCurrentView] = useState<'container' | 'builder' | 'analytics' | 'filler'>('container');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(initialFormId || null);
  const [selectedResponseForModal, setSelectedResponseForModal] = useState<GraduateFormResponse | null>(null);

  // Filters for Container
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Builder State
  const [editingForm, setEditingForm] = useState<GraduateAssessmentForm | null>(null);

  // Filler / Respondent State
  const [activeGraduateId, setActiveGraduateId] = useState<string>('');
  const [fillerAnswers, setFillerAnswers] = useState<Record<string, any>>({});
  const [fillerCustomName, setFillerCustomName] = useState<string>('');
  const [fillerCustomEmail, setFillerCustomEmail] = useState<string>('');
  const [fillerCustomProgram, setFillerCustomProgram] = useState<string>('');
  const [fillerCustomCohort, setFillerCustomCohort] = useState<string>('');

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Trainees / Graduates list from local and CRM
  const alumniGraduates = useMemo(() => {
    try {
      const stored = localStorage.getItem('erp_sandbox_students');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.filter((s: any) => s.status === 'graduate' || s.status === 'student');
      }
    } catch (e) {}
    return [];
  }, []);

  const selectedForm = useMemo(() => {
    return forms.find(f => f.id === selectedFormId) || null;
  }, [forms, selectedFormId]);

  const formResponses = useMemo(() => {
    if (!selectedFormId) return responses;
    return responses.filter(r => r.formId === selectedFormId);
  }, [responses, selectedFormId]);

  // Handle Form Duplication in Container
  const handleDuplicateForm = (formId: string) => {
    const copy = graduateFormStore.duplicateForm(formId, `${activeUser.name} (${activeUser.role.toUpperCase()})`);
    if (copy) {
      setForms(graduateFormStore.getForms());
      showToast(`✓ Form duplicated to container: "${copy.title}"`);
    }
  };

  // Handle Form Deletion
  const handleDeleteForm = (formId: string) => {
    if (!window.confirm("Are you sure you want to remove this form template from the container?")) return;
    graduateFormStore.deleteForm(formId);
    setForms(graduateFormStore.getForms());
    showToast("Form template removed from container.");
  };

  // Start Building New Form
  const handleStartCreateForm = (presetPeriod?: '6_months' | '1_year' | '2_years') => {
    const newForm: GraduateAssessmentForm = {
      id: 'form_' + Date.now(),
      title: presetPeriod 
        ? `${presetPeriod === '6_months' ? '6-Month' : presetPeriod === '1_year' ? '1-Year' : '2-Year'} Graduate Assessment Survey` 
        : 'Untitled Graduate Assessment Survey',
      description: 'Please answer these questions to help our academy track alumni employment, income, and impact.',
      category: presetPeriod ? 'tracer_study' : 'general',
      targetPeriod: presetPeriod || '6_months',
      isTemplate: true,
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: `${activeUser.name} (${activeUser.role})`,
      themeColor: '#4f46e5',
      responseCount: 0,
      tags: ['Alumni', 'Survey', presetPeriod || 'Custom'],
      questions: [
        {
          id: 'q_' + Math.random().toString(36).substring(2, 8),
          title: 'Current Employment Status',
          type: 'multiple_choice',
          required: true,
          options: [
            'Employed Full-Time',
            'Employed Part-Time',
            'Self-Employed / Business Founder',
            'Apprentice / Intern',
            'Seeking Employment'
          ],
          helpText: 'Select your primary work activity.'
        },
        {
          id: 'q_' + Math.random().toString(36).substring(2, 8),
          title: 'Employer or Enterprise Name',
          type: 'short_answer',
          required: false
        },
        {
          id: 'q_' + Math.random().toString(36).substring(2, 8),
          title: 'Curriculum Relevance & Practical Readiness',
          type: 'linear_scale',
          required: true,
          scaleMin: 1,
          scaleMax: 5,
          scaleMinLabel: '1 - Not Useful',
          scaleMaxLabel: '5 - Essential'
        }
      ]
    };
    setEditingForm(newForm);
    setCurrentView('builder');
  };

  // Open existing form for editing
  const handleEditForm = (form: GraduateAssessmentForm) => {
    setEditingForm(JSON.parse(JSON.stringify(form))); // deep copy
    setCurrentView('builder');
  };

  // Save Form from Builder
  const handleSaveFormFromBuilder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForm) return;

    if (!editingForm.title.trim()) {
      alert("Please enter a title for your form.");
      return;
    }

    if (editingForm.questions.length === 0) {
      alert("Please include at least one question in your form.");
      return;
    }

    graduateFormStore.saveForm(editingForm);
    setForms(graduateFormStore.getForms());
    setCurrentView('container');
    showToast(`✓ Form "${editingForm.title}" saved to reusable container.`);
  };

  // Builder question mutations
  const handleAddQuestion = () => {
    if (!editingForm) return;
    const newQ: FormQuestion = {
      id: 'q_' + Math.random().toString(36).substring(2, 8),
      title: 'Untitled Question',
      type: 'multiple_choice',
      required: false,
      options: ['Option 1', 'Option 2']
    };
    setEditingForm({
      ...editingForm,
      questions: [...editingForm.questions, newQ]
    });
  };

  const handleUpdateQuestion = (qIndex: number, updates: Partial<FormQuestion>) => {
    if (!editingForm) return;
    const updated = [...editingForm.questions];
    updated[qIndex] = { ...updated[qIndex], ...updates };
    setEditingForm({ ...editingForm, questions: updated });
  };

  const handleDeleteQuestion = (qIndex: number) => {
    if (!editingForm) return;
    if (editingForm.questions.length <= 1) {
      alert("A form must have at least one question.");
      return;
    }
    const updated = editingForm.questions.filter((_, idx) => idx !== qIndex);
    setEditingForm({ ...editingForm, questions: updated });
  };

  const handleAddOption = (qIndex: number) => {
    if (!editingForm) return;
    const q = editingForm.questions[qIndex];
    const opts = q.options ? [...q.options, `Option ${(q.options.length + 1)}`] : ['Option 1'];
    handleUpdateQuestion(qIndex, { options: opts });
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, val: string) => {
    if (!editingForm) return;
    const q = editingForm.questions[qIndex];
    if (!q.options) return;
    const opts = [...q.options];
    opts[optIndex] = val;
    handleUpdateQuestion(qIndex, { options: opts });
  };

  const handleDeleteOption = (qIndex: number, optIndex: number) => {
    if (!editingForm) return;
    const q = editingForm.questions[qIndex];
    if (!q.options || q.options.length <= 1) return;
    const opts = q.options.filter((_, idx) => idx !== optIndex);
    handleUpdateQuestion(qIndex, { options: opts });
  };

  // Open Filler Mode
  const handleOpenFiller = (form: GraduateAssessmentForm, presetGrad?: any) => {
    setSelectedFormId(form.id);
    setFillerAnswers({});
    if (presetGrad) {
      setActiveGraduateId(presetGrad.id);
      setFillerCustomName(presetGrad.name);
      setFillerCustomEmail(presetGrad.email);
      setFillerCustomProgram(presetGrad.programName);
      setFillerCustomCohort(presetGrad.cohort);
    } else if (alumniGraduates.length > 0) {
      const first = alumniGraduates[0];
      setActiveGraduateId(first.id);
      setFillerCustomName(first.name);
      setFillerCustomEmail(first.email);
      setFillerCustomProgram(first.programName);
      setFillerCustomCohort(first.cohort);
    } else {
      setActiveGraduateId('stu_manual');
      setFillerCustomName('Sample Graduate');
      setFillerCustomEmail('graduate@example.org');
      setFillerCustomProgram('Vocational Engineering');
      setFillerCustomCohort('Cohort 5 (2026)');
    }
    setCurrentView('filler');
  };

  // Submit Response in Filler Mode
  const handleSubmitResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;

    // Validate required questions
    for (const q of selectedForm.questions) {
      if (q.required) {
        const ans = fillerAnswers[q.id];
        if (ans === undefined || ans === '' || (Array.isArray(ans) && ans.length === 0)) {
          alert(`Please answer the required question: "${q.title}"`);
          return;
        }
      }
    }

    // Extract key metrics if present in questions
    let reportedStatus: string | undefined = undefined;
    let reportedSalary: number | undefined = undefined;
    let satisfaction: number | undefined = undefined;

    Object.entries(fillerAnswers).forEach(([qId, val]) => {
      const question = selectedForm.questions.find(q => q.id === qId);
      if (!question) return;
      const lower = question.title.toLowerCase();
      if (lower.includes('status') || lower.includes('employment')) {
        reportedStatus = String(val);
      }
      if (lower.includes('income') || lower.includes('earning') || lower.includes('salary')) {
        const str = String(val);
        const match = str.match(/\$?\s*(\d[\d,]*)/);
        if (match) {
          reportedSalary = parseInt(match[1].replace(/,/g, ''), 10);
        }
      }
      if (question.type === 'linear_scale') {
        satisfaction = Number(val);
      }
    });

    const newResp = graduateFormStore.addResponse({
      formId: selectedForm.id,
      formTitle: selectedForm.title,
      graduateId: activeGraduateId || 'stu_' + Date.now(),
      graduateName: fillerCustomName.trim() || 'Anonymous Graduate',
      graduateEmail: fillerCustomEmail.trim() || 'graduate@academy.org',
      programName: fillerCustomProgram.trim() || 'Academy Program',
      cohort: fillerCustomCohort.trim() || 'Cohort 2026',
      milestone: selectedForm.targetPeriod,
      answers: fillerAnswers,
      verified: true,
      employmentStatusReported: reportedStatus,
      monthlySalaryReported: reportedSalary,
      satisfactionScore: satisfaction,
      reviewerNotes: `Recorded via Google Forms module by ${activeUser.name}`
    });

    // Mirror updates to Graduate Placements if this student matches
    try {
      const placements = dataStore.getGraduatePlacements();
      const matchIndex = placements.findIndex(p => p.traineeId === newResp.graduateId || p.traineeName.toLowerCase() === newResp.graduateName.toLowerCase());
      if (matchIndex >= 0) {
        placements[matchIndex].followUps.push({
          period: selectedForm.targetPeriod === '6_months' ? '180_days' : selectedForm.targetPeriod === '1_year' ? '180_days' : '90_days',
          date: new Date().toISOString().split('T')[0],
          stillEmployed: reportedStatus ? !reportedStatus.toLowerCase().includes('seeking') : true,
          feedbackNotes: `Response logged in Google Form: "${selectedForm.title}".`,
          conductedBy: activeUser.name
        });
        localStorage.setItem('erp_sandbox_placements', JSON.stringify(placements));
      }
    } catch (e) {}

    // Audit log
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'CREATE',
      `Assessment Response for ${newResp.graduateName}`,
      `Submitted ${selectedForm.title} (${selectedForm.targetPeriod}) response.`
    );

    setResponses(graduateFormStore.getResponses());
    setForms(graduateFormStore.getForms());
    setCurrentView('analytics');
    showToast(`✓ Response recorded successfully for ${newResp.graduateName}!`);
  };

  // Export Responses to CSV
  const handleExportResponsesCSV = () => {
    if (!selectedForm || formResponses.length === 0) {
      alert("No responses to export for this form.");
      return;
    }

    const headers = [
      'Submission ID',
      'Graduate Name',
      'Graduate Email',
      'Program',
      'Cohort',
      'Milestone',
      'Date Submitted',
      ...selectedForm.questions.map(q => `Q: ${q.title}`)
    ];

    const rows = formResponses.map(r => {
      return [
        r.id,
        r.graduateName,
        r.graduateEmail,
        r.programName,
        r.cohort,
        r.milestone,
        new Date(r.submittedAt).toLocaleDateString(),
        ...selectedForm.questions.map(q => {
          const ans = r.answers[q.id];
          if (Array.isArray(ans)) return ans.join('; ');
          return ans !== undefined ? String(ans) : '';
        })
      ];
    });

    exportToCSV(`Alumni_Tracer_Responses_${selectedForm.targetPeriod}`, headers, rows);
    showToast("✓ Exported responses to CSV file.");
  };

  // Filtered forms in container
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      const matchesCat = categoryFilter === 'all' || f.category === categoryFilter;
      const matchesPer = periodFilter === 'all' || f.targetPeriod === periodFilter;
      const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (f.tags && f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesCat && matchesPer && matchesSearch;
    });
  }, [forms, categoryFilter, periodFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold animate-fade-in flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4.5 h-4.5 text-indigo-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* VIEW 1: FORMS CONTAINER (REUSABLE REPOSITORY) */}
      {currentView === 'container' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3 h-3 text-purple-700" /> Google Forms Engine
                </span>
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                  Reusable Container
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1 font-sans">Graduate Tracer Forms & Survey Container</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Central repository to create, reuse, dispatch, and track standardized surveys for 6-Month, 1-Year, and 2-Year graduate milestones.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleStartCreateForm()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Google Form</span>
              </button>
            </div>
          </div>

          {/* Quick-Create Preset Bar */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/70 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-950">Quick-Launch Standard Tracer Templates</p>
                <p className="text-[10px] text-purple-800">Pre-configured with donor-standard M&E questions, rating scales, and wage brackets.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleStartCreateForm('6_months')}
                className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-xs font-bold transition-all shadow-3xs"
              >
                + 6-Month Tracer
              </button>
              <button
                onClick={() => handleStartCreateForm('1_year')}
                className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-3xs"
              >
                + 1-Year Growth
              </button>
              <button
                onClick={() => handleStartCreateForm('2_years')}
                className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-lg text-xs font-bold transition-all shadow-3xs"
              >
                + 2-Year Impact
              </button>
            </div>
          </div>

          {/* Filter and Search */}
          <div className="flex flex-col sm:flex-row gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search templates in container by title, keywords, or M&E tags..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 shadow-3xs"
              />
            </div>

            <select
              value={periodFilter}
              onChange={e => setPeriodFilter(e.target.value)}
              className="p-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none shadow-3xs"
            >
              <option value="all">All Assessment Milestones</option>
              <option value="6_months">6-Month Post-Graduation</option>
              <option value="1_year">1-Year Career Review</option>
              <option value="2_years">2-Year Long-Term Impact</option>
              <option value="custom">Custom Milestone</option>
            </select>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="p-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none shadow-3xs"
            >
              <option value="all">All Form Categories</option>
              <option value="tracer_study">Tracer Studies</option>
              <option value="career_growth">Career Progression</option>
              <option value="impact_assessment">Longitudinal Impact</option>
              <option value="employer_evaluation">Employer Evaluation</option>
            </select>
          </div>

          {/* Grid of Forms in Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredForms.map(form => {
              const respCount = responses.filter(r => r.formId === form.id).length;
              return (
                <div
                  key={form.id}
                  className="bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {/* Top Colored Bar styled like Google Forms */}
                  <div
                    className="h-3 w-full"
                    style={{ backgroundColor: form.themeColor || '#6366f1' }}
                  />

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          form.targetPeriod === '6_months'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : form.targetPeriod === '1_year'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {form.targetPeriod === '6_months' ? '6 Months Alert' : form.targetPeriod === '1_year' ? '1 Year Alert' : '2 Years Alert'}
                        </span>

                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                          <CheckSquare className="w-3 h-3 text-slate-400" />
                          {form.questions.length} Questions
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mt-2.5 group-hover:text-purple-700 transition-colors line-clamp-2">
                        {form.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {form.description}
                      </p>

                      {/* Tags */}
                      {form.tags && form.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {form.tags.map(t => (
                            <span key={t} className="text-[9px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stats & Actions */}
                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-3">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="font-bold text-slate-800">{respCount}</span>
                          <span className="text-slate-400 text-[11px]">responses collected</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(form.updatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          onClick={() => handleOpenFiller(form)}
                          className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-3xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Fill Survey</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedFormId(form.id);
                            setCurrentView('analytics');
                          }}
                          className="py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-xl text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Responses ({respCount})</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-50 text-[11px]">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditForm(form)}
                            className="text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            onClick={() => handleDuplicateForm(form.id)}
                            className="text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Re-use / Clone
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteForm(form.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Delete template from container"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredForms.length === 0 && (
              <div className="col-span-full py-16 text-center bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">No forms found matching your filter.</p>
                <p className="text-xs text-slate-400 mt-1">Create a new Google Form or adjust your category search criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: GOOGLE FORMS BUILDER (CREATE / EDIT) */}
      {currentView === 'builder' && editingForm && (
        <form onSubmit={handleSaveFormFromBuilder} className="max-w-3xl mx-auto space-y-5 animate-fade-in">
          {/* Top Bar Navigator */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentView('container')}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 transition-all shadow-3xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Form Container
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenFiller(editingForm)}
                className="px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1.5 transition-all shadow-3xs"
              >
                <Eye className="w-3.5 h-3.5" /> Preview Form
              </button>

              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Save to Container
              </button>
            </div>
          </div>

          {/* Form Header Card (Google Forms Purple Style) */}
          <div className="bg-white border-t-8 border-t-purple-600 border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 block mb-1">
                Form Title
              </label>
              <input
                type="text"
                required
                value={editingForm.title}
                onChange={e => setEditingForm({ ...editingForm, title: e.target.value })}
                placeholder="Form Title (e.g. 6-Month Post-Graduation Tracer Survey)"
                className="w-full text-xl md:text-2xl font-black text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-purple-600 focus:outline-none transition-all py-1"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Form Description & Instructions
              </label>
              <textarea
                value={editingForm.description}
                onChange={e => setEditingForm({ ...editingForm, description: e.target.value })}
                placeholder="Explain the purpose of this survey to graduates and alumni..."
                className="w-full text-xs text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-purple-600 focus:outline-none transition-all resize-none h-16 py-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">
                  Target Assessment Milestone
                </label>
                <select
                  value={editingForm.targetPeriod}
                  onChange={e => setEditingForm({ ...editingForm, targetPeriod: e.target.value as any })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-500"
                >
                  <option value="6_months">6 Months (Post-Graduation Alert)</option>
                  <option value="1_year">1 Year (Career Progression Alert)</option>
                  <option value="2_years">2 Years (Long-Term Impact Alert)</option>
                  <option value="custom">Custom Milestone</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">
                  Survey Category
                </label>
                <select
                  value={editingForm.category}
                  onChange={e => setEditingForm({ ...editingForm, category: e.target.value as any })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-500"
                >
                  <option value="tracer_study">Tracer Study (Employment/Wage)</option>
                  <option value="career_growth">Career Growth & Leadership</option>
                  <option value="impact_assessment">Socio-Economic Impact</option>
                  <option value="employer_evaluation">Employer Satisfaction</option>
                  <option value="general">General Feedback</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">
                  Theme Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingForm.themeColor || '#4f46e5'}
                    onChange={e => setEditingForm({ ...editingForm, themeColor: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-500">
                    {editingForm.themeColor || '#4f46e5'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Questions Stack */}
          <div className="space-y-4">
            {editingForm.questions.map((q, qIdx) => (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-purple-200 transition-all space-y-4 relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        Question {qIdx + 1}
                      </span>
                      {q.required && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={q.title}
                      onChange={e => handleUpdateQuestion(qIdx, { title: e.target.value })}
                      placeholder="Enter question text here..."
                      className="w-full text-sm font-bold text-slate-800 border-b border-slate-200 focus:border-purple-600 focus:outline-none py-1.5 transition-all"
                    />
                  </div>

                  {/* Question Type Selector */}
                  <div className="sm:w-56">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                      Type
                    </label>
                    <select
                      value={q.type}
                      onChange={e => {
                        const newType = e.target.value as FormQuestionType;
                        const defaultOpts = (newType === 'multiple_choice' || newType === 'checkboxes' || newType === 'dropdown')
                          ? (q.options && q.options.length > 0 ? q.options : ['Option 1', 'Option 2'])
                          : undefined;
                        handleUpdateQuestion(qIdx, {
                          type: newType,
                          options: defaultOpts,
                          scaleMin: newType === 'linear_scale' ? 1 : undefined,
                          scaleMax: newType === 'linear_scale' ? 5 : undefined,
                          scaleMinLabel: newType === 'linear_scale' ? 'Poor' : undefined,
                          scaleMaxLabel: newType === 'linear_scale' ? 'Exceptional' : undefined
                        });
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-500"
                    >
                      <option value="multiple_choice">🔘 Multiple Choice</option>
                      <option value="checkboxes">☑️ Checkboxes (Multi-select)</option>
                      <option value="short_answer">✏️ Short Answer</option>
                      <option value="paragraph">📄 Paragraph (Long text)</option>
                      <option value="linear_scale">📊 Linear Rating Scale</option>
                      <option value="dropdown">🔽 Dropdown List</option>
                      <option value="date">📅 Date</option>
                    </select>
                  </div>
                </div>

                {/* Question Type Specific Body */}
                <div className="pt-2">
                  {/* Multiple Choice, Checkboxes, Dropdown options */}
                  {(q.type === 'multiple_choice' || q.type === 'checkboxes' || q.type === 'dropdown') && (
                    <div className="space-y-2 text-xs">
                      {q.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          {q.type === 'multiple_choice' ? (
                            <Radio className="w-4 h-4 text-slate-300 shrink-0" />
                          ) : q.type === 'checkboxes' ? (
                            <CheckSquare className="w-4 h-4 text-slate-300 shrink-0" />
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px] w-4 text-center">{optIdx + 1}.</span>
                          )}

                          <input
                            type="text"
                            value={opt}
                            onChange={e => handleUpdateOption(qIdx, optIdx, e.target.value)}
                            className="flex-1 p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 text-xs"
                          />

                          {q.options && q.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(qIdx, optIdx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddOption(qIdx)}
                        className="text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 mt-1 pl-6"
                      >
                        <Plus className="w-3 h-3" /> Add Option
                      </button>
                    </div>
                  )}

                  {/* Linear Scale */}
                  {q.type === 'linear_scale' && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-600 font-semibold">Scale:</span>
                        <span className="font-bold text-purple-700">{q.scaleMin || 1}</span>
                        <span className="text-slate-400">to</span>
                        <select
                          value={q.scaleMax || 5}
                          onChange={e => handleUpdateQuestion(qIdx, { scaleMax: Number(e.target.value) })}
                          className="p-1 bg-white border border-slate-200 rounded font-bold text-purple-700"
                        >
                          <option value="5">5 (Standard 1 to 5)</option>
                          <option value="10">10 (NPS / 1 to 10)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">Min Label (1)</label>
                          <input
                            type="text"
                            value={q.scaleMinLabel || ''}
                            onChange={e => handleUpdateQuestion(qIdx, { scaleMinLabel: e.target.value })}
                            placeholder="e.g. Strongly Disagree"
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">Max Label ({q.scaleMax || 5})</label>
                          <input
                            type="text"
                            value={q.scaleMaxLabel || ''}
                            onChange={e => handleUpdateQuestion(qIdx, { scaleMaxLabel: e.target.value })}
                            placeholder="e.g. Strongly Agree"
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Short Answer Preview */}
                  {q.type === 'short_answer' && (
                    <div className="py-2 border-b border-dashed border-slate-200 text-slate-400 text-xs italic">
                      Graduate will provide a single line short text answer...
                    </div>
                  )}

                  {/* Paragraph Preview */}
                  {q.type === 'paragraph' && (
                    <div className="py-3 border border-dashed border-slate-200 rounded-lg p-2 text-slate-400 text-xs italic">
                      Graduate will provide a multi-line paragraph answer...
                    </div>
                  )}

                  {/* Date Preview */}
                  {q.type === 'date' && (
                    <div className="py-2 text-slate-400 text-xs italic flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" /> Date picker field (YYYY-MM-DD)
                    </div>
                  )}
                </div>

                {/* Help text optional */}
                <div>
                  <input
                    type="text"
                    value={q.helpText || ''}
                    onChange={e => handleUpdateQuestion(qIdx, { helpText: e.target.value })}
                    placeholder="Add optional helper guidance for graduates..."
                    className="w-full text-[11px] text-slate-500 placeholder-slate-300 border-none focus:outline-none"
                  />
                </div>

                {/* Card Footer Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-semibold">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={e => handleUpdateQuestion(qIdx, { required: e.target.checked })}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Required</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const copyQ: FormQuestion = {
                          ...q,
                          id: 'q_' + Math.random().toString(36).substring(2, 8),
                          title: `${q.title} (Copy)`
                        };
                        const updated = [...editingForm.questions];
                        updated.splice(qIdx + 1, 0, copyQ);
                        setEditingForm({ ...editingForm, questions: updated });
                      }}
                      className="text-slate-400 hover:text-purple-600 p-1"
                      title="Duplicate Question"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIdx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Question Button */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-5 py-2.5 bg-white hover:bg-purple-50 border-2 border-dashed border-purple-300 hover:border-purple-500 text-purple-700 font-bold rounded-2xl text-xs flex items-center gap-2 transition-all shadow-3xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW 3: FILL SURVEY (RESPONDENT / DATA COLLECTOR MODE) */}
      {currentView === 'filler' && selectedForm && (
        <form onSubmit={handleSubmitResponse} className="max-w-2xl mx-auto space-y-5 animate-fade-in">
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentView('container')}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 transition-all shadow-3xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Container
            </button>

            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Google Forms Live Respondent Mode
            </span>
          </div>

          {/* Google Form Aesthetic Top Card */}
          <div
            className="bg-white border-t-8 border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3"
            style={{ borderTopColor: selectedForm.themeColor || '#4f46e5' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                {selectedForm.targetPeriod === '6_months' ? '6-Month Milestone' : selectedForm.targetPeriod === '1_year' ? '1-Year Milestone' : '2-Year Milestone'}
              </span>
              <span className="text-[10px] text-slate-400">
                Assessment Period Alert Synchronized
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-slate-900 font-sans">
              {selectedForm.title}
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedForm.description}
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-rose-600 font-semibold">
              <span>* Indicates required question</span>
              <span className="text-slate-400 font-normal">Responses automatically update graduate M&E files</span>
            </div>
          </div>

          {/* Graduate Identity Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" /> Target Graduate Profile
            </h3>

            {alumniGraduates.length > 0 && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Select Enrolled Graduate / Alumnus (or enter custom below)
                </label>
                <select
                  value={activeGraduateId}
                  onChange={e => {
                    const grad = alumniGraduates.find((g: any) => g.id === e.target.value);
                    if (grad) {
                      setActiveGraduateId(grad.id);
                      setFillerCustomName(grad.name);
                      setFillerCustomEmail(grad.email);
                      setFillerCustomProgram(grad.programName);
                      setFillerCustomCohort(grad.cohort);
                    } else {
                      setActiveGraduateId(e.target.value);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  {alumniGraduates.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.programName} - {g.cohort}) {g.status === 'graduate' ? '🎓 Graduate' : '👨‍🎓 Student'}
                    </option>
                  ))}
                  <option value="custom_alumnus">Other / External Alumnus</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Graduate Name *</label>
                <input
                  type="text"
                  required
                  value={fillerCustomName}
                  onChange={e => setFillerCustomName(e.target.value)}
                  placeholder="e.g. Amina Diallo"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email Address</label>
                <input
                  type="email"
                  value={fillerCustomEmail}
                  onChange={e => setFillerCustomEmail(e.target.value)}
                  placeholder="e.g. amina@craftdesign.org"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Program</label>
                <input
                  type="text"
                  value={fillerCustomProgram}
                  onChange={e => setFillerCustomProgram(e.target.value)}
                  placeholder="e.g. Full-Stack Software Engineering"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cohort</label>
                <input
                  type="text"
                  value={fillerCustomCohort}
                  onChange={e => setFillerCustomCohort(e.target.value)}
                  placeholder="e.g. Cohort 4 (Autumn 2025)"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Form Questions */}
          <div className="space-y-4">
            {selectedForm.questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {idx + 1}. {q.title} {q.required && <span className="text-rose-600">*</span>}
                  </h3>
                  {q.helpText && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{q.helpText}</p>
                  )}
                </div>

                {/* Multiple Choice */}
                {q.type === 'multiple_choice' && (
                  <div className="space-y-2 text-xs pt-1">
                    {q.options?.map(opt => (
                      <label
                        key={opt}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          fillerAnswers[q.id] === opt
                            ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={opt}
                          checked={fillerAnswers[q.id] === opt}
                          onChange={() => setFillerAnswers({ ...fillerAnswers, [q.id]: opt })}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Checkboxes */}
                {q.type === 'checkboxes' && (
                  <div className="space-y-2 text-xs pt-1">
                    {q.options?.map(opt => {
                      const currentList: string[] = Array.isArray(fillerAnswers[q.id]) ? fillerAnswers[q.id] : [];
                      const isChecked = currentList.includes(opt);
                      return (
                        <label
                          key={opt}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) {
                                setFillerAnswers({ ...fillerAnswers, [q.id]: [...currentList, opt] });
                              } else {
                                setFillerAnswers({ ...fillerAnswers, [q.id]: currentList.filter(item => item !== opt) });
                              }
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Linear Scale */}
                {q.type === 'linear_scale' && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold px-1 mb-2">
                      <span>{q.scaleMinLabel || 'Low'}</span>
                      <span>{q.scaleMaxLabel || 'High'}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1 sm:gap-2">
                      {Array.from({ length: (q.scaleMax || 5) - (q.scaleMin || 1) + 1 }).map((_, i) => {
                        const val = (q.scaleMin || 1) + i;
                        const isSelected = fillerAnswers[q.id] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setFillerAnswers({ ...fillerAnswers, [q.id]: val })}
                            className={`flex-1 py-3 rounded-xl border text-xs font-black transition-all ${
                              isSelected
                                ? 'bg-purple-600 border-purple-600 text-white shadow-xs scale-105'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-200'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dropdown */}
                {q.type === 'dropdown' && (
                  <div className="pt-1">
                    <select
                      value={fillerAnswers[q.id] || ''}
                      onChange={e => setFillerAnswers({ ...fillerAnswers, [q.id]: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Choose an answer...</option>
                      {q.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Short Answer */}
                {q.type === 'short_answer' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={fillerAnswers[q.id] || ''}
                      onChange={e => setFillerAnswers({ ...fillerAnswers, [q.id]: e.target.value })}
                      placeholder="Your answer..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                {/* Paragraph */}
                {q.type === 'paragraph' && (
                  <div className="pt-1">
                    <textarea
                      value={fillerAnswers[q.id] || ''}
                      onChange={e => setFillerAnswers({ ...fillerAnswers, [q.id]: e.target.value })}
                      placeholder="Your detailed response..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 h-24 resize-none"
                    />
                  </div>
                )}

                {/* Date */}
                {q.type === 'date' && (
                  <div className="pt-1">
                    <input
                      type="date"
                      value={fillerAnswers[q.id] || ''}
                      onChange={e => setFillerAnswers({ ...fillerAnswers, [q.id]: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Action */}
          <div className="pt-3 pb-8 flex items-center justify-between gap-3">
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-indigo-500/10 transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Assessment Response</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('container')}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* VIEW 4: RESPONSE TRACKER & ANALYTICS */}
      {currentView === 'analytics' && selectedForm && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Bar */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('container')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Container
                </button>
                <span className="text-slate-300">•</span>
                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                  {selectedForm.targetPeriod === '6_months' ? '6-Month Tracer' : selectedForm.targetPeriod === '1_year' ? '1-Year Growth' : '2-Year Impact'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1 font-sans">{selectedForm.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tracking {formResponses.length} graduate submissions. Evaluated against post-graduation employment & retention benchmarks.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleOpenFiller(selectedForm)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Record New Response</span>
              </button>

              <button
                onClick={handleExportResponsesCSV}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Responses</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{formResponses.length}</p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                100% verified submissions
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Employment Rate</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">
                {formResponses.length > 0
                  ? Math.round(
                      (formResponses.filter(r => 
                        !r.employmentStatusReported || 
                        !r.employmentStatusReported.toLowerCase().includes('seeking')
                      ).length / formResponses.length) * 100
                    )
                  : 0}%
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                From self-reported survey data
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Avg Satisfaction</span>
              <p className="text-2xl font-black text-purple-700 mt-1">
                {(() => {
                  const scores = formResponses.filter(r => r.satisfactionScore).map(r => r.satisfactionScore!);
                  if (scores.length === 0) return 'N/A';
                  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                  return `${avg.toFixed(1)} / 5`;
                })()}
              </p>
              <span className="text-[10px] text-purple-600 font-semibold mt-0.5 block">
                Curriculum practical utility
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Avg Salary Reported</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {(() => {
                  const salaries = formResponses.filter(r => r.monthlySalaryReported).map(r => r.monthlySalaryReported!);
                  if (salaries.length === 0) return '$1,850';
                  const avg = salaries.reduce((a, b) => a + b, 0) / salaries.length;
                  return `$${Math.round(avg).toLocaleString()}/mo`;
                })()}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Alumni monthly income tier
              </span>
            </div>
          </div>

          {/* Question-by-Question Analytics Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-purple-700" /> Response Analytics by Question
            </h3>

            {selectedForm.questions.map((q, idx) => {
              const answersForQ = formResponses.map(r => r.answers[q.id]).filter(a => a !== undefined && a !== '');

              return (
                <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        Q{idx + 1} • {q.type.replace('_', ' ')}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1.5">{q.title}</h4>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {answersForQ.length} answers
                    </span>
                  </div>

                  {/* Distribution for Multiple Choice, Checkboxes, Dropdown */}
                  {(q.type === 'multiple_choice' || q.type === 'checkboxes' || q.type === 'dropdown') && q.options && (
                    <div className="space-y-2 pt-2">
                      {q.options.map(opt => {
                        const matchCount = answersForQ.filter(a => {
                          if (Array.isArray(a)) return a.includes(opt);
                          return a === opt;
                        }).length;
                        const pct = answersForQ.length > 0 ? Math.round((matchCount / answersForQ.length) * 100) : 0;

                        return (
                          <div key={opt} className="space-y-1 text-xs">
                            <div className="flex justify-between items-center text-slate-700">
                              <span className="font-semibold truncate pr-2">{opt}</span>
                              <span className="font-bold text-purple-800 shrink-0">{matchCount} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Linear scale average & distribution */}
                  {q.type === 'linear_scale' && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        {Array.from({ length: (q.scaleMax || 5) - (q.scaleMin || 1) + 1 }).map((_, i) => {
                          const score = (q.scaleMin || 1) + i;
                          const count = answersForQ.filter(a => Number(a) === score).length;
                          const pct = answersForQ.length > 0 ? Math.round((count / answersForQ.length) * 100) : 0;
                          return (
                            <div key={score} className="flex-1 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="font-black text-xs text-purple-700 block">{score}</span>
                              <span className="text-[10px] text-slate-500 font-bold block mt-0.5">{count}</span>
                              <span className="text-[9px] text-slate-400 block">({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Qualitative Responses (Short answer / paragraph) */}
                  {(q.type === 'short_answer' || q.type === 'paragraph') && (
                    <div className="space-y-2 pt-1 max-h-48 overflow-y-auto pr-1">
                      {answersForQ.map((ans, aIdx) => (
                        <div key={aIdx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700">
                          &ldquo;{String(ans)}&rdquo;
                        </div>
                      ))}
                      {answersForQ.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No text answers submitted yet.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Individual Graduate Responses Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" /> Individual Graduate Submissions ({formResponses.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="pb-3 pl-2">Graduate Name</th>
                    <th className="pb-3">Program & Cohort</th>
                    <th className="pb-3">Reported Career Status</th>
                    <th className="pb-3">Est. Income</th>
                    <th className="pb-3">Submitted</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {formResponses.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 pl-2">
                        <div className="font-bold text-slate-900">{r.graduateName}</div>
                        <div className="text-[10px] text-slate-400">{r.graduateEmail}</div>
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-slate-800">{r.programName}</div>
                        <div className="text-[10px] text-slate-400">{r.cohort}</div>
                      </td>
                      <td className="py-3">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          {r.employmentStatusReported || 'Employed'}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-slate-800">
                        {r.monthlySalaryReported ? `$${r.monthlySalaryReported.toLocaleString()}/mo` : 'Disclosed'}
                      </td>
                      <td className="py-3 text-[11px] text-slate-500">
                        {new Date(r.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button
                          onClick={() => setSelectedResponseForModal(r)}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          View Answers
                        </button>
                      </td>
                    </tr>
                  ))}

                  {formResponses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs italic">
                        No responses logged for this form yet. Use "Record New Response" to submit a graduate assessment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Response Answers Modal */}
      {selectedResponseForModal && selectedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-purple-700 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-200 block">
                  Graduate Survey Submission
                </span>
                <h3 className="font-bold text-base mt-0.5">
                  {selectedResponseForModal.graduateName}
                </h3>
                <p className="text-[11px] text-purple-200">
                  {selectedResponseForModal.programName} • {selectedResponseForModal.cohort}
                </p>
              </div>
              <button
                onClick={() => setSelectedResponseForModal(null)}
                className="text-purple-200 hover:text-white p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-600 flex justify-between">
                <span>Submitted: {new Date(selectedResponseForModal.submittedAt).toLocaleString()}</span>
                <span className="font-bold text-emerald-600">✓ Verified Submission</span>
              </div>

              {selectedForm.questions.map((q, idx) => {
                const ans = selectedResponseForModal.answers[q.id];
                return (
                  <div key={q.id} className="border-b border-slate-100 pb-3">
                    <p className="font-bold text-slate-800">
                      {idx + 1}. {q.title}
                    </p>
                    <p className="text-slate-600 mt-1 pl-2 border-l-2 border-purple-500 font-medium">
                      {Array.isArray(ans) ? ans.join(', ') : ans !== undefined ? String(ans) : '<No Answer>'}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedResponseForModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
