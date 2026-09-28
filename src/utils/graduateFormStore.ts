import { GraduateAssessmentForm, GraduateFormResponse, ProgramAssessmentMilestoneAlerts } from '../types/erp';

const FORMS_STORAGE_KEY = 'erp_graduate_forms_container';
const RESPONSES_STORAGE_KEY = 'erp_graduate_form_responses';

// Seeded Reusable Form Templates
const DEFAULT_FORMS: GraduateAssessmentForm[] = [
  {
    id: 'form_tracer_6m',
    title: '6-Month Post-Graduation Employment & Impact Tracer Study',
    description: 'Comprehensive M&E tracer survey measuring job retention, wage trajectory, and curriculum relevance 6 months after graduation.',
    category: 'tracer_study',
    targetPeriod: '6_months',
    isTemplate: true,
    status: 'published',
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-02-01T09:00:00Z',
    createdBy: 'Director of Academics & M&E (CEO)',
    themeColor: '#4f46e5',
    responseCount: 3,
    tags: ['M&E', 'Employment', '6-Month', 'Donor Impact'],
    questions: [
      {
        id: 'q1',
        title: 'Current Employment & Career Status',
        type: 'multiple_choice',
        required: true,
        options: [
          'Employed Full-Time (Wage/Salaried)',
          'Employed Part-Time',
          'Self-Employed / Independent Contractor',
          'Business Founder / Co-Founder',
          'Apprenticeship / Graduate Internship',
          'Seeking Employment',
          'Enrolled in Further Academic Education'
        ],
        helpText: 'Select the category that best describes your primary activity over the last 30 days.'
      },
      {
        id: 'q2',
        title: 'Name of Current Employer, Organization, or Own Enterprise',
        type: 'short_answer',
        required: false,
        helpText: 'Enter company name or "Self-Employed" if freelancing.'
      },
      {
        id: 'q3',
        title: 'Current Job Title or Specialization',
        type: 'short_answer',
        required: true,
        helpText: 'e.g. Junior Solar Field Technician, Full-Stack Frontend Dev, Fashion Atelier Lead'
      },
      {
        id: 'q4',
        title: 'Average Monthly Net Earnings / Income (USD equivalent)',
        type: 'multiple_choice',
        required: true,
        options: [
          'Under $350 / month',
          '$350 - $650 / month',
          '$651 - $1,200 / month',
          '$1,201 - $2,000 / month',
          '$2,001 - $3,500 / month',
          'Over $3,500 / month'
        ]
      },
      {
        id: 'q5',
        title: 'How directly relevant is your daily work to the vocational curriculum you completed?',
        type: 'linear_scale',
        required: true,
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: '1 - Not relevant at all',
        scaleMaxLabel: '5 - Directly core & essential'
      },
      {
        id: 'q6',
        title: 'How long did it take to secure your current role after graduation?',
        type: 'dropdown',
        required: true,
        options: [
          'Hired prior to graduation (Internship conversion)',
          'Less than 1 month',
          '1 to 3 months',
          '4 to 6 months',
          'Still searching for preferred opening'
        ]
      },
      {
        id: 'q7',
        title: 'Which technical or soft skills learned during training have been most valuable?',
        type: 'paragraph',
        required: false,
        helpText: 'Mention specific tools, frameworks, practical lab workshops, or workplace ethics.'
      },
      {
        id: 'q8',
        title: 'What additions or updates do you recommend for future cohorts?',
        type: 'paragraph',
        required: false
      }
    ]
  },
  {
    id: 'form_review_1y',
    title: '1-Year Alumni Career Growth & Wage Progression Survey',
    description: 'Longitudinal workplace assessment evaluating wage increments, promotions, leadership responsibilities, and alumni mentorship interest.',
    category: 'career_growth',
    targetPeriod: '1_year',
    isTemplate: true,
    status: 'published',
    createdAt: '2026-03-15T11:30:00Z',
    updatedAt: '2026-03-15T11:30:00Z',
    createdBy: 'Program Manager',
    themeColor: '#059669',
    responseCount: 2,
    tags: ['1-Year', 'Career Progression', 'Salary Increment', 'Alumni'],
    questions: [
      {
        id: 'q101',
        title: 'Employment & Career Status at the 1-Year Milestone',
        type: 'multiple_choice',
        required: true,
        options: [
          'Employed with same initial employer',
          'Promoted / Advance to senior role at same employer',
          'Transitioned to higher-paying employer',
          'Operating profitable registered enterprise',
          'Self-employed Freelancer',
          'In Career Transition'
        ]
      },
      {
        id: 'q102',
        title: 'Have you received a salary increase, promotion, or significant revenue expansion since graduation?',
        type: 'multiple_choice',
        required: true,
        options: [
          'Yes - Substantial pay rise / promotion (>25% increase)',
          'Yes - Moderate increment (10-25% increase)',
          'Yes - Self-employed business revenue increased significantly',
          'No - Stable at initial hiring wage',
          'No - Seeking better placement'
        ]
      },
      {
        id: 'q103',
        title: 'Overall Career & Workplace Satisfaction Score',
        type: 'linear_scale',
        required: true,
        scaleMin: 1,
        scaleMax: 10,
        scaleMinLabel: '1 - Low Fulfillment',
        scaleMaxLabel: '10 - Exceptional Growth & Security'
      },
      {
        id: 'q104',
        title: 'Are you currently supervising, training, or managing other team members?',
        type: 'multiple_choice',
        required: true,
        options: [
          'Yes - Supervising team of 1-3 people',
          'Yes - Managing department/team of 4+ people',
          'No - Individual contributor'
        ]
      },
      {
        id: 'q105',
        title: 'Would you be open to hosting an apprentice or mentoring current academy trainees?',
        type: 'multiple_choice',
        required: true,
        options: [
          'Yes - Definitely interested in mentoring',
          'Yes - Our company has open intern/job placements',
          'Maybe in the future',
          'Not at this time'
        ]
      },
      {
        id: 'q106',
        title: 'Please share any major professional milestone or project you are proud of.',
        type: 'paragraph',
        required: false
      }
    ]
  },
  {
    id: 'form_impact_2y',
    title: '2-Year Long-Term Impact & Enterprise Establishment Study',
    description: 'Long-term donor impact audit measuring micro-enterprise formation, job creation for others, and community economic resilience.',
    category: 'impact_assessment',
    targetPeriod: '2_years',
    isTemplate: true,
    status: 'published',
    createdAt: '2026-04-10T14:00:00Z',
    updatedAt: '2026-04-10T14:00:00Z',
    createdBy: 'CEO & Founder',
    themeColor: '#7c3aed',
    responseCount: 1,
    tags: ['2-Year', 'Long-Term Impact', 'Entrepreneurship', 'SROI'],
    questions: [
      {
        id: 'q201',
        title: 'Have you founded or co-founded an active commercial business or agency?',
        type: 'multiple_choice',
        required: true,
        options: [
          'Yes - Registered formal business enterprise',
          'Yes - Informal / growing commercial service',
          'No - Thriving as professional employee / lead',
          'No - Other'
        ]
      },
      {
        id: 'q202',
        title: 'If running a business or agency, how many staff or subcontractors do you employ?',
        type: 'short_answer',
        required: false,
        helpText: 'Enter a number (e.g. 0, 2, 5) or "N/A"'
      },
      {
        id: 'q203',
        title: 'Has your household financial stability and standard of living improved sustainably?',
        type: 'linear_scale',
        required: true,
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: '1 - Minor change',
        scaleMaxLabel: '5 - Transformative financial resilience'
      },
      {
        id: 'q204',
        title: 'Are you financially supporting family members, siblings education, or community programs?',
        type: 'checkboxes',
        required: true,
        options: [
          'Supporting siblings / family school fees',
          'Contributing to household rent / mortgage',
          'Investing in family business or agriculture',
          'Personal emergency savings & health insurance established',
          'Mentoring / sponsoring local youth'
        ]
      },
      {
        id: 'q205',
        title: 'Long-Term Qualitative Reflection on Academy Scholarship Impact',
        type: 'paragraph',
        required: true,
        helpText: 'A short reflection on how this training altered your personal and professional trajectory.'
      }
    ]
  }
];

// Seeded Sample Responses for Initial Analytics
const DEFAULT_RESPONSES: GraduateFormResponse[] = [
  {
    id: 'resp_1',
    formId: 'form_tracer_6m',
    formTitle: '6-Month Post-Graduation Employment & Impact Tracer Study',
    graduateId: 'stu_3',
    graduateName: 'Amina Diallo',
    graduateEmail: 'amina.diallo@craftdesign.org',
    graduatePhone: '+27 (73) 014-9912',
    programName: 'Textiles & Fashion Entrepreneurship',
    cohort: 'Cohort 4 (Autumn 2025)',
    milestone: '6_months',
    submittedAt: '2026-03-05T14:22:10Z',
    verified: true,
    employmentStatusReported: 'Business Founder / Co-Founder',
    monthlySalaryReported: 1450,
    satisfactionScore: 5,
    answers: {
      q1: 'Business Founder / Co-Founder',
      q2: 'Diallo Heritage Apparel Studio',
      q3: 'Creative Director & Lead Tailor',
      q4: '$1,201 - $2,000 / month',
      q5: 5,
      q6: 'Less than 1 month',
      q7: 'Pattern drafting, automated cutter safety, and direct-to-consumer digital shop pricing.',
      q8: 'Would love an advanced module on commercial export customs documentation.'
    },
    reviewerNotes: 'Verified against local shop registration cert. Outstanding success story.'
  },
  {
    id: 'resp_2',
    formId: 'form_tracer_6m',
    formTitle: '6-Month Post-Graduation Employment & Impact Tracer Study',
    graduateId: 'stu_2',
    graduateName: 'Tariq Al-Mansoor',
    graduateEmail: 'tariq.mansoor@solarskills.org',
    graduatePhone: '+27 (72) 018-8832',
    programName: 'Commercial Solar Engineering',
    cohort: 'Cohort 4 (Autumn 2025)',
    milestone: '6_months',
    submittedAt: '2026-03-08T10:15:30Z',
    verified: true,
    employmentStatusReported: 'Employed Full-Time (Wage/Salaried)',
    monthlySalaryReported: 1850,
    satisfactionScore: 5,
    answers: {
      q1: 'Employed Full-Time (Wage/Salaried)',
      q2: 'SunPower Grid Innovations Ltd',
      q3: 'Field PV Systems Lead Technician',
      q4: '$1,201 - $2,000 / month',
      q5: 5,
      q6: 'Hired prior to graduation (Internship conversion)',
      q7: 'Inverter synchronization, microgrid load balancing, and high-voltage DC safety protocols.',
      q8: 'Add battery storage lithium iron phosphate (LiFePO4) troubleshooting labs.'
    }
  },
  {
    id: 'resp_3',
    formId: 'form_tracer_6m',
    formTitle: '6-Month Post-Graduation Employment & Impact Tracer Study',
    graduateId: 'stu_1',
    graduateName: 'Amara Okafor',
    graduateEmail: 'amara.okafor@techfuture.org',
    graduatePhone: '+27 (71) 019-4421',
    programName: 'Full-Stack Software Engineering',
    cohort: 'Cohort 4 (Autumn 2025)',
    milestone: '6_months',
    submittedAt: '2026-03-12T16:45:00Z',
    verified: true,
    employmentStatusReported: 'Employed Full-Time (Wage/Salaried)',
    monthlySalaryReported: 2400,
    satisfactionScore: 4,
    answers: {
      q1: 'Employed Full-Time (Wage/Salaried)',
      q2: 'AfriPay Cloud Systems',
      q3: 'Junior Software Engineer',
      q4: '$2,001 - $3,500 / month',
      q5: 5,
      q6: '1 to 3 months',
      q7: 'TypeScript strict typing, relational database indices, and RESTful authentication.',
      q8: 'Include Docker containerization and cloud CI/CD pipelines.'
    }
  },
  {
    id: 'resp_4',
    formId: 'form_review_1y',
    formTitle: '1-Year Alumni Career Growth & Wage Progression Survey',
    graduateId: 'stu_3',
    graduateName: 'Amina Diallo',
    graduateEmail: 'amina.diallo@craftdesign.org',
    programName: 'Textiles & Fashion Entrepreneurship',
    cohort: 'Cohort 3 (Spring 2025)',
    milestone: '1_year',
    submittedAt: '2026-08-14T11:20:00Z',
    verified: true,
    employmentStatusReported: 'Operating profitable registered enterprise',
    monthlySalaryReported: 2200,
    satisfactionScore: 9,
    answers: {
      q101: 'Operating profitable registered enterprise',
      q102: 'Yes - Substantial pay rise / promotion (>25% increase)',
      q103: 9,
      q104: 'Yes - Managing department/team of 4+ people',
      q105: 'Yes - Our company has open intern/job placements',
      q106: 'Opened our second retail showroom and hired 3 graduates from Cohort 5.'
    }
  }
];

// Helper to parse duration string like "6 Months", "4 Months", "1 Year" into number of months
export function parseDurationToMonths(durationStr: string): number {
  if (!durationStr) return 6;
  const lower = durationStr.toLowerCase();
  const match = lower.match(/(\d+)/);
  const num = match ? parseInt(match[1], 10) : 6;
  if (lower.includes('year')) {
    return num * 12;
  }
  return num; // default assumed months
}

// Helper to add months to an ISO date string (YYYY-MM-DD)
export function addMonthsToDate(dateStr: string, monthsToAdd: number): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const now = new Date();
      now.setMonth(now.getMonth() + monthsToAdd);
      return now.toISOString().split('T')[0];
    }
    const targetMonth = d.getMonth() + monthsToAdd;
    d.setMonth(targetMonth);
    return d.toISOString().split('T')[0];
  } catch {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + monthsToAdd);
    return fallback.toISOString().split('T')[0];
  }
}

// Automatically calculate milestone dates from a start date and program duration
export function calculateProgramMilestones(startDate: string, durationStr: string) {
  const durationMonths = parseDurationToMonths(durationStr);
  const completionDate = addMonthsToDate(startDate, durationMonths);
  const sixMonthsDate = addMonthsToDate(completionDate, 6);
  const oneYearDate = addMonthsToDate(completionDate, 12);
  const twoYearsDate = addMonthsToDate(completionDate, 24);

  return {
    durationMonths,
    completionDate,
    sixMonthsDate,
    oneYearDate,
    twoYearsDate
  };
}

export const graduateFormStore = {
  getForms(): GraduateAssessmentForm[] {
    try {
      const stored = localStorage.getItem(FORMS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load forms from storage", e);
    }
    localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(DEFAULT_FORMS));
    return DEFAULT_FORMS;
  },

  saveForm(form: GraduateAssessmentForm): GraduateAssessmentForm {
    const current = this.getForms();
    const existingIndex = current.findIndex(f => f.id === form.id);
    let updated: GraduateAssessmentForm[];

    const enrichedForm: GraduateAssessmentForm = {
      ...form,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = enrichedForm;
    } else {
      updated = [enrichedForm, ...current];
    }

    localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(updated));
    return enrichedForm;
  },

  deleteForm(formId: string): void {
    const current = this.getForms();
    const filtered = current.filter(f => f.id !== formId);
    localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(filtered));
  },

  duplicateForm(formId: string, authorName: string = 'Staff'): GraduateAssessmentForm | null {
    const current = this.getForms();
    const target = current.find(f => f.id === formId);
    if (!target) return null;

    const copy: GraduateAssessmentForm = {
      ...target,
      id: 'form_copy_' + Date.now(),
      title: `${target.title} (Copy)`,
      isTemplate: true,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: authorName,
      responseCount: 0,
      questions: target.questions.map(q => ({
        ...q,
        id: 'q_' + Math.random().toString(36).substring(2, 9)
      }))
    };

    const updated = [copy, ...current];
    localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(updated));
    return copy;
  },

  getResponses(formId?: string): GraduateFormResponse[] {
    try {
      const stored = localStorage.getItem(RESPONSES_STORAGE_KEY);
      let responses: GraduateFormResponse[] = stored ? JSON.parse(stored) : DEFAULT_RESPONSES;
      if (!stored) {
        localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(DEFAULT_RESPONSES));
      }
      if (formId) {
        return responses.filter(r => r.formId === formId);
      }
      return responses;
    } catch (e) {
      console.error("Failed to load responses", e);
      return DEFAULT_RESPONSES;
    }
  },

  addResponse(respData: Omit<GraduateFormResponse, 'id' | 'submittedAt'>): GraduateFormResponse {
    const current = this.getResponses();
    const newResponse: GraduateFormResponse = {
      ...respData,
      id: 'resp_' + Date.now(),
      submittedAt: new Date().toISOString()
    };

    const updated = [newResponse, ...current];
    localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(updated));

    // Update responseCount on the target form
    const forms = this.getForms();
    const formIndex = forms.findIndex(f => f.id === respData.formId);
    if (formIndex >= 0) {
      forms[formIndex].responseCount = (forms[formIndex].responseCount || 0) + 1;
      localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(forms));
    }

    return newResponse;
  },

  deleteResponse(responseId: string): void {
    const current = this.getResponses();
    const filtered = current.filter(r => r.id !== responseId);
    localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(filtered));
  }
};
