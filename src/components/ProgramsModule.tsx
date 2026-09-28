import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  GraduationCap, 
  Briefcase, 
  Search, 
  Plus, 
  CheckCircle2, 
  Award, 
  Calendar, 
  Clock, 
  FileText, 
  TrendingUp,
  Download,
  QrCode,
  Sparkles,
  BookOpen,
  X,
  Bell,
  Edit3,
  CheckSquare,
  AlertTriangle,
  Sliders,
  Send,
  Upload
} from 'lucide-react';
import { UserProfile, CustomerProfile, TraineeAttendanceLog, GraduatePlacementRecord } from '../types/erp';
import { dataStore } from '../config/firebase';
import GraduatePlacementTracker from './GraduatePlacementTracker';
import GraduateFormsManager from './GraduateFormsManager';
import StudentOnboardingManager from './StudentOnboardingManager';
import { calculateProgramMilestones, addMonthsToDate, graduateFormStore } from '../utils/graduateFormStore';
import { StudentStaffStore } from '../utils/studentStaffStore';

interface ProgramsModuleProps {
  activeUser: UserProfile;
  initialSubTab?: 'students' | 'graduates' | 'placements' | 'programs' | 'forms' | 'onboarding' | 'microloans';
}

interface StudentRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  programName: string;
  cohort: string;
  status: 'student' | 'graduate' | 'withdrawn';
  enrollmentDate: string;
  attendanceScore: number; // calculated dynamically, or seeded
  notes?: string;
}

interface Program {
  id: string;
  title: string;
  code: string;
  duration: string;
  instructor: string;
  status: 'active' | 'scheduled' | 'completed';
  startDate: string;
  description: string;
  completionDate?: string;
  assessmentAlerts?: {
    sixMonths: boolean;
    oneYear: boolean;
    twoYears: boolean;
    linkedFormSixMonths?: string;
    linkedFormOneYear?: string;
    linkedFormTwoYears?: string;
  };
  calculatedDates?: {
    completionDate: string;
    sixMonthsDate: string;
    oneYearDate: string;
    twoYearsDate: string;
  };
}

export default function ProgramsModule({ activeUser, initialSubTab = 'students' }: ProgramsModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'graduates' | 'placements' | 'programs' | 'forms' | 'onboarding' | 'microloans'>(initialSubTab || 'students');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const isCeoOrManager = activeUser.role === 'ceo' || activeUser.role === 'manager' || activeUser.role === 'sysadmin';

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<TraineeAttendanceLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  
  // Programs State
  const [runningPrograms, setRunningPrograms] = useState<Program[]>(() => {
    const stored = localStorage.getItem('erp_sandbox_programs');
    if (stored) {
      try {
        const parsed: Program[] = JSON.parse(stored);
        // Ensure every program has calculated milestones
        return parsed.map(p => {
          if (!p.calculatedDates) {
            const milestones = calculateProgramMilestones(p.startDate || '2026-02-01', p.duration || '6 Months');
            return {
              ...p,
              assessmentAlerts: p.assessmentAlerts || {
                sixMonths: true,
                oneYear: true,
                twoYears: true,
                linkedFormSixMonths: 'form_tracer_6m',
                linkedFormOneYear: 'form_review_1y',
                linkedFormTwoYears: 'form_impact_2y'
              },
              calculatedDates: milestones
            };
          }
          return p;
        });
      } catch (e) {}
    }
    return [
      {
        id: 'prog_1',
        title: 'Full-Stack Software Engineering',
        code: 'FSSE-101',
        duration: '6 Months',
        instructor: 'Prof. Alan Turing',
        status: 'active',
        startDate: '2026-02-01',
        description: 'Advanced web application development with React, Node, and SQL database systems.',
        assessmentAlerts: {
          sixMonths: true,
          oneYear: true,
          twoYears: true,
          linkedFormSixMonths: 'form_tracer_6m',
          linkedFormOneYear: 'form_review_1y',
          linkedFormTwoYears: 'form_impact_2y'
        },
        calculatedDates: calculateProgramMilestones('2026-02-01', '6 Months')
      },
      {
        id: 'prog_2',
        title: 'Commercial Solar Engineering',
        code: 'CSE-202',
        duration: '4 Months',
        instructor: 'Dr. Maria Telkes',
        status: 'active',
        startDate: '2026-03-10',
        description: 'Design, construction, and compliance of photovoltaic energy arrays for microgrids.',
        assessmentAlerts: {
          sixMonths: true,
          oneYear: true,
          twoYears: true,
          linkedFormSixMonths: 'form_tracer_6m',
          linkedFormOneYear: 'form_review_1y',
          linkedFormTwoYears: 'form_impact_2y'
        },
        calculatedDates: calculateProgramMilestones('2026-03-10', '4 Months')
      },
      {
        id: 'prog_3',
        title: 'Textiles & Fashion Entrepreneurship',
        code: 'TFE-303',
        duration: '3 Months',
        instructor: 'Madame Coco',
        status: 'active',
        startDate: '2026-01-20',
        description: 'Garment manufacturing, print block designs, and direct-to-consumer shop management.',
        assessmentAlerts: {
          sixMonths: true,
          oneYear: true,
          twoYears: true,
          linkedFormSixMonths: 'form_tracer_6m',
          linkedFormOneYear: 'form_review_1y',
          linkedFormTwoYears: 'form_impact_2y'
        },
        calculatedDates: calculateProgramMilestones('2026-01-20', '3 Months')
      },
      {
        id: 'prog_4',
        title: 'Culinary Arts & Hospitality',
        code: 'CAH-404',
        duration: '6 Months',
        instructor: 'Chef Auguste Escoffier',
        status: 'active',
        startDate: '2026-04-05',
        description: 'Professional cooking techniques, safety guidelines, and frontend hotel reservation logistics.',
        assessmentAlerts: {
          sixMonths: true,
          oneYear: true,
          twoYears: true,
          linkedFormSixMonths: 'form_tracer_6m',
          linkedFormOneYear: 'form_review_1y',
          linkedFormTwoYears: 'form_impact_2y'
        },
        calculatedDates: calculateProgramMilestones('2026-04-05', '6 Months')
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('erp_sandbox_programs', JSON.stringify(runningPrograms));
  }, [runningPrograms]);

  // New Program Modal state
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);
  const [progTitle, setProgTitle] = useState('');
  const [progCode, setProgCode] = useState('');
  const [progDuration, setProgDuration] = useState('6 Months');
  const [progInstructor, setProgInstructor] = useState('');
  const [progStatus, setProgStatus] = useState<'active' | 'scheduled' | 'completed'>('active');
  const [progStartDate, setProgStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [progDescription, setProgDescription] = useState('');
  
  // Assessment Alert toggles for Program Creation
  const [progAlertSixMonths, setProgAlertSixMonths] = useState(true);
  const [progAlertOneYear, setProgAlertOneYear] = useState(true);
  const [progAlertTwoYears, setProgAlertTwoYears] = useState(true);
  const [progLinkedForm6m, setProgLinkedForm6m] = useState('form_tracer_6m');
  const [progLinkedForm1y, setProgLinkedForm1y] = useState('form_review_1y');
  const [progLinkedForm2y, setProgLinkedForm2y] = useState('form_impact_2y');

  // Live calculated milestone dates for Program Creation
  const liveCreationMilestones = useMemo(() => {
    return calculateProgramMilestones(progStartDate, progDuration);
  }, [progStartDate, progDuration]);

  // Edit Program Modal state
  const [isEditProgramOpen, setIsEditProgramOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDuration, setEditDuration] = useState('6 Months');
  const [editInstructor, setEditInstructor] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'scheduled' | 'completed'>('active');
  const [editStartDate, setEditStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [editDescription, setEditDescription] = useState('');
  const [editAlertSixMonths, setEditAlertSixMonths] = useState(true);
  const [editAlertOneYear, setEditAlertOneYear] = useState(true);
  const [editAlertTwoYears, setEditAlertTwoYears] = useState(true);
  const [editLinkedForm6m, setEditLinkedForm6m] = useState('form_tracer_6m');
  const [editLinkedForm1y, setEditLinkedForm1y] = useState('form_review_1y');
  const [editLinkedForm2y, setEditLinkedForm2y] = useState('form_impact_2y');

  // Live calculated milestone dates for Program Editing
  const liveEditMilestones = useMemo(() => {
    return calculateProgramMilestones(editStartDate, editDuration);
  }, [editStartDate, editDuration]);

  // Preloaded forms for dropdown linking
  const availableForms = useMemo(() => {
    return graduateFormStore.getForms();
  }, [activeSubTab, isAddProgramOpen, isEditProgramOpen]);

  // New Student Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentProgram, setNewStudentProgram] = useState('Vocational Sewing & Fashion Tech');
  const [newStudentCohort, setNewStudentCohort] = useState('Cohort 2026-B');
  const [newStudentNotes, setNewStudentNotes] = useState('');

  // Extra detailed onboarding states to match StudentOnboardingManager
  const [newStudentDOB, setNewStudentDOB] = useState('2004-01-01');
  const [newStudentLocation, setNewStudentLocation] = useState('');
  const [newStudentEdu, setNewStudentEdu] = useState<string[]>(['shs']);
  const [newStudentSewingExp, setNewStudentSewingExp] = useState(false);
  const [newStudentSewingDetails, setNewStudentSewingDetails] = useState('');
  const [newStudentHasKids, setNewStudentHasKids] = useState(false);
  const [newStudentKinName, setNewStudentKinName] = useState('');
  const [newStudentKinRelation, setNewStudentKinRelation] = useState('Parent / Guardian');
  const [newStudentKinPhone, setNewStudentKinPhone] = useState('+233 ');
  const [newStudentIdType, setNewStudentIdType] = useState<'national_id' | 'voters_id' | 'nhia_id' | 'drivers_license'>('national_id');
  const [newStudentIdNum, setNewStudentIdNum] = useState('');
  const [newStudentIdPhoto, setNewStudentIdPhoto] = useState('');

  // Certificate Modal state
  const [selectedGraduate, setSelectedGraduate] = useState<StudentRecord | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certNumber, setCertNumber] = useState('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Load students, alumni & attendance logs
  useEffect(() => {
    const logs = dataStore.getAttendanceLogs();
    setAttendanceLogs(logs);

    // Synchronize customers with student/trainee roles
    const customers = dataStore.getCustomers();
    
    // Check if we have students in local storage
    const storedStudents = localStorage.getItem('erp_sandbox_students');
    if (storedStudents) {
      setStudents(JSON.parse(storedStudents));
    } else {
      // Seed default dynamic student list matching customers
      const defaultCohorts = [
        'Cohort 4 (Autumn 2025)',
        'Cohort 5 (Winter 2026)',
        'Cohort 6 (Spring 2026)'
      ];

      const seedStudents: StudentRecord[] = customers.map((c, idx) => {
        const prog = runningPrograms[idx % runningPrograms.length].title;
        const coh = defaultCohorts[idx % defaultCohorts.length];
        const isGraduate = idx === 0 || idx === 2; // Make some graduated
        
        // Calculate attendance score based on attendance logs
        const studentLogs = logs.filter(l => l.traineeId === c.id || l.traineeName.toLowerCase() === c.name.toLowerCase());
        let attendanceRate = 85; // default fallback seed
        if (studentLogs.length > 0) {
          const presentCount = studentLogs.filter(l => l.status === 'present' || l.status === 'late').length;
          attendanceRate = Math.round((presentCount / studentLogs.length) * 100);
        } else {
          attendanceRate = Math.round(75 + (idx * 7.5) % 25); // high seed
        }

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone || '+27 (72) 102-4421',
          programName: prog,
          cohort: coh,
          status: isGraduate ? 'graduate' : 'student',
          enrollmentDate: c.createdAt ? c.createdAt.split('T')[0] : '2025-09-01',
          attendanceScore: attendanceRate,
          notes: c.notes || 'Enrolled via donor scholarship.'
        };
      });

      // If seedStudents is empty, let's add at least a couple of students
      if (seedStudents.length === 0) {
        seedStudents.push(
          {
            id: 'stu_1',
            name: 'Amara Okafor',
            email: 'amara.okafor@techfuture.org',
            phone: '+27 (71) 019-4421',
            programName: 'Full-Stack Software Engineering',
            cohort: 'Cohort 5 (Winter 2026)',
            status: 'student',
            enrollmentDate: '2026-01-15',
            attendanceScore: 92,
            notes: 'High performer. Outstanding analytical progress.'
          },
          {
            id: 'stu_2',
            name: 'Tariq Al-Mansoor',
            email: 'tariq.mansoor@solarskills.org',
            phone: '+27 (72) 018-8832',
            programName: 'Commercial Solar Engineering',
            cohort: 'Cohort 5 (Winter 2026)',
            status: 'student',
            enrollmentDate: '2026-01-15',
            attendanceScore: 88,
            notes: 'Strong practical skills in PV system layout.'
          },
          {
            id: 'stu_3',
            name: 'Amina Diallo',
            email: 'amina.diallo@craftdesign.org',
            phone: '+27 (73) 014-9912',
            programName: 'Textiles & Fashion Entrepreneurship',
            cohort: 'Cohort 4 (Autumn 2025)',
            status: 'graduate',
            enrollmentDate: '2025-09-01',
            attendanceScore: 95,
            notes: 'Graduated top of class. Launched private shop.'
          }
        );
      }

      localStorage.setItem('erp_sandbox_students', JSON.stringify(seedStudents));
      setStudents(seedStudents);
    }
  }, [attendanceLogs.length]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = 'stu_' + Math.floor(1000 + Math.random() * 9000);
    const studentEmail = newStudentEmail.trim();
    const resolvedEmail = studentEmail || `student.${newId.toLowerCase()}@organization.edu`;
    const newStudent: StudentRecord = {
      id: newId,
      name: newStudentName,
      email: studentEmail || 'Not Provided',
      phone: newStudentPhone || '+233 24 000 0000',
      programName: newStudentProgram,
      cohort: newStudentCohort,
      status: 'student',
      enrollmentDate: new Date().toISOString().split('T')[0],
      attendanceScore: 100, // starts fully clean
      notes: newStudentNotes || 'Registered scholarship student.'
    };

    // Save student
    const updated = [...students, newStudent];
    setStudents(updated);
    localStorage.setItem('erp_sandbox_students', JSON.stringify(updated));

    // Mirror to StudentStaffStore
    const trenchFee = StudentStaffStore.getDefaultTrenchMaintenanceFee();
    const trenchTarget = Math.round(trenchFee / 3);

    StudentStaffStore.addStudent({
      name: newStudentName,
      dateOfBirth: newStudentDOB,
      phoneNumber: newStudentPhone || '+233 24 000 0000',
      location: newStudentLocation,
      educationalBackground: newStudentEdu as any,
      previousSewingExperience: newStudentSewingExp,
      sewingExperienceDetails: newStudentSewingDetails,
      hasKids: newStudentHasKids,
      contactPersonName: newStudentKinName,
      contactPersonRelation: newStudentKinRelation,
      contactPersonPhone: newStudentKinPhone,
      idType: newStudentIdType,
      idNumber: newStudentIdNum || `GH-${Date.now().toString().slice(-6)}`,
      idPhotoUrl: newStudentIdPhoto,
      enrollmentDate: new Date().toISOString().slice(0, 10),
      programName: newStudentProgram,
      cohort: newStudentCohort,
      status: 'active',
      maintenanceFeeTotal: trenchFee,
      trenches: {
        trench1: {
          trenchNumber: 1,
          monthsRange: 'Months 1 - 6 (Foundations)',
          targetAmount: trenchTarget,
          paidAmount: 0,
          dueDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          status: 'partially_paid',
          payments: []
        },
        trench2: {
          trenchNumber: 2,
          monthsRange: 'Months 7 - 12 (Advanced)',
          targetAmount: trenchTarget,
          paidAmount: 0,
          dueDate: new Date(Date.now() + 360 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          status: 'partially_paid',
          payments: []
        },
        trench3: {
          trenchNumber: 3,
          monthsRange: 'Months 13 - 18 (Practicum)',
          targetAmount: trenchTarget,
          paidAmount: 0,
          dueDate: new Date(Date.now() + 540 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          status: 'partially_paid',
          payments: []
        }
      }
    });

    // Mirror to CRM Customers / dataStore customers so attendance and placements can load them too!
    const customers = dataStore.getCustomers();
    const customerExists = studentEmail 
      ? customers.some(c => c.email.toLowerCase() === studentEmail.toLowerCase())
      : customers.some(c => c.id === newId);

    if (!customerExists) {
      customers.push({
        id: newId,
        name: newStudentName,
        email: resolvedEmail,
        phone: newStudentPhone || '+233 24 000 0000',
        lifetime_value: 0,
        ai_churn_risk: 0.05,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: newStudentNotes
      });
      localStorage.setItem('erp_sandbox_customers', JSON.stringify(customers));
    }

    // Log Audit Trail
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'CREATE',
      `Student ${newStudentName}`,
      `Enrolled student into ${newStudentProgram} - ${newStudentCohort}.`
    );

    setIsAddModalOpen(false);
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentPhone('');
    setNewStudentNotes('');
    
    // Clear extra detailed fields
    setNewStudentLocation('');
    setNewStudentIdNum('');
    setNewStudentIdPhoto('');
    setNewStudentKinName('');

    showToast(`✓ Student ${newStudentName} registered successfully inside ERP Student and Alumni database.`);
  };

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progTitle.trim() || !progCode.trim()) return;

    // Automatically calculate milestones based on start date and duration
    const calculatedMilestones = calculateProgramMilestones(progStartDate, progDuration);

    const newProg: Program = {
      id: 'prog_' + Date.now(),
      title: progTitle.trim(),
      code: progCode.trim().toUpperCase(),
      duration: progDuration,
      instructor: progInstructor.trim() || 'TBD',
      status: progStatus,
      startDate: progStartDate,
      description: progDescription.trim() || 'No description provided.',
      completionDate: calculatedMilestones.completionDate,
      assessmentAlerts: {
        sixMonths: progAlertSixMonths,
        oneYear: progAlertOneYear,
        twoYears: progAlertTwoYears,
        linkedFormSixMonths: progLinkedForm6m,
        linkedFormOneYear: progLinkedForm1y,
        linkedFormTwoYears: progLinkedForm2y
      },
      calculatedDates: calculatedMilestones
    };

    const updated = [...runningPrograms, newProg];
    setRunningPrograms(updated);
    localStorage.setItem('erp_sandbox_programs', JSON.stringify(updated));

    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'CREATE',
      `Program ${progTitle}`,
      `Added program ${progTitle} (${newProg.code}) with automatic assessment alerts (6M: ${calculatedMilestones.sixMonthsDate}, 1Y: ${calculatedMilestones.oneYearDate}, 2Y: ${calculatedMilestones.twoYearsDate}).`
    );

    setIsAddProgramOpen(false);
    setProgTitle('');
    setProgCode('');
    setProgInstructor('');
    setProgDescription('');
    showToast(`✓ Program "${progTitle}" established with automated 6-Month, 1-Year, and 2-Year assessment alerts.`);
  };

  const handleOpenEditProgram = (p: Program) => {
    setEditingProgramId(p.id);
    setEditTitle(p.title);
    setEditCode(p.code);
    setEditDuration(p.duration);
    setEditInstructor(p.instructor);
    setEditStatus(p.status);
    setEditStartDate(p.startDate);
    setEditDescription(p.description);
    setEditAlertSixMonths(p.assessmentAlerts?.sixMonths !== false);
    setEditAlertOneYear(p.assessmentAlerts?.oneYear !== false);
    setEditAlertTwoYears(p.assessmentAlerts?.twoYears !== false);
    setEditLinkedForm6m(p.assessmentAlerts?.linkedFormSixMonths || 'form_tracer_6m');
    setEditLinkedForm1y(p.assessmentAlerts?.linkedFormOneYear || 'form_review_1y');
    setEditLinkedForm2y(p.assessmentAlerts?.linkedFormTwoYears || 'form_impact_2y');
    setIsEditProgramOpen(true);
  };

  const handleUpdateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgramId || !editTitle.trim() || !editCode.trim()) return;

    // Automatically recalculate assessment milestone dates
    const calculatedMilestones = calculateProgramMilestones(editStartDate, editDuration);

    const updated = runningPrograms.map(p => {
      if (p.id !== editingProgramId) return p;
      return {
        ...p,
        title: editTitle.trim(),
        code: editCode.trim().toUpperCase(),
        duration: editDuration,
        instructor: editInstructor.trim() || 'TBD',
        status: editStatus,
        startDate: editStartDate,
        description: editDescription.trim() || 'No description provided.',
        completionDate: calculatedMilestones.completionDate,
        assessmentAlerts: {
          sixMonths: editAlertSixMonths,
          oneYear: editAlertOneYear,
          twoYears: editAlertTwoYears,
          linkedFormSixMonths: editLinkedForm6m,
          linkedFormOneYear: editLinkedForm1y,
          linkedFormTwoYears: editLinkedForm2y
        },
        calculatedDates: calculatedMilestones
      };
    });

    setRunningPrograms(updated);
    localStorage.setItem('erp_sandbox_programs', JSON.stringify(updated));

    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'UPDATE',
      `Program ${editTitle}`,
      `Updated program ${editTitle} with recalculated assessment alerts (6M: ${calculatedMilestones.sixMonthsDate}, 1Y: ${calculatedMilestones.oneYearDate}, 2Y: ${calculatedMilestones.twoYearsDate}).`
    );

    setIsEditProgramOpen(false);
    showToast(`✓ Program "${editTitle}" updated with recalculated assessment period milestones.`);
  };

  // Move Student to Graduate Status
  const handleGraduateStudent = (id: string) => {
    const updated = students.map(s => {
      if (s.id !== id) return s;
      
      // Auto-trigger Digital Certificate issuance record
      const certId = 'CERT-' + Math.floor(100000 + Math.random() * 900000);
      try {
        let certs: any[] = [];
        try {
          const saved = localStorage.getItem('erp_sandbox_certificates');
          if (saved) certs = JSON.parse(saved);
        } catch (e) {}
        const newCert = {
          id: 'cert_' + Date.now(),
          certificateNumber: certId,
          recipientId: s.id,
          recipientName: s.name,
          recipientEmail: s.email,
          programName: s.programName,
          cohort: s.cohort,
          issueDate: new Date().toISOString().split('T')[0],
          verifiedStatus: 'issued' as const,
          digitalSignature: 'SIG-' + Math.floor(Math.random() * 100000000).toString(16).toUpperCase()
        };
        localStorage.setItem('erp_sandbox_certificates', JSON.stringify([newCert, ...certs]));
      } catch (err) {
        console.error(err);
      }

      // Register into graduate placement list also if not already present
      try {
        const placements = dataStore.getGraduatePlacements();
        if (!placements.some(p => p.traineeId === s.id)) {
          placements.unshift({
            id: 'place_' + Date.now(),
            traineeId: s.id,
            traineeName: s.name,
            traineeEmail: s.email,
            traineePhone: s.phone,
            programName: s.programName,
            cohort: s.cohort,
            graduationDate: new Date().toISOString().split('T')[0],
            employmentStatus: 'seeking_employment',
            verificationStatus: 'unconfirmed',
            followUps: []
          });
          localStorage.setItem('erp_sandbox_placements', JSON.stringify(placements));
        }
      } catch (err) {
        console.error(err);
      }

      return { ...s, status: 'graduate' as const };
    });

    setStudents(updated);
    localStorage.setItem('erp_sandbox_students', JSON.stringify(updated));
    showToast(`🎓 Congratulations! Student marked as GRADUATED. Verification certificates issued & placement file generated.`);
  };

  // Filter lists
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.programName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.cohort.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProgram = selectedProgram === 'all' || s.programName === selectedProgram;
    return matchesSearch && matchesProgram;
  });

  const currentStudentsList = filteredStudents.filter(s => s.status === 'student');
  const graduatesList = filteredStudents.filter(s => s.status === 'graduate');

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Title block */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            Academic & Skills Administration
          </span>
          <h1 className="text-xl font-bold text-slate-800 mt-1 font-sans">Programs & Student Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Database profiles for scholarship trainees, live attendance monitoring, digital certificates, and M&E career placement logs.</p>
        </div>

        {activeSubTab === 'students' && (
          <div className="flex items-center gap-2">
            <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer">
              <Download className="w-4 h-4" />
              <span>Batch CSV Enrollment</span>
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const text = evt.target?.result as string;
                    if (!text) return;
                    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                    let count = 0;
                    const newEnrolled: StudentRecord[] = [];
                    lines.forEach((line, index) => {
                      if (index === 0 && line.toLowerCase().includes('name')) return; // skip header line
                      const parts = line.split(',');
                      if (parts.length >= 2) {
                        count++;
                        newEnrolled.push({
                          id: 'stu_csv_' + Date.now() + '_' + count,
                          name: parts[0].trim(),
                          email: parts[1].trim(),
                          phone: parts[2]?.trim() || '+27 (00) 000-0000',
                          programName: parts[3]?.trim() || (runningPrograms[0]?.title || 'Full-Stack Software Engineering'),
                          cohort: parts[4]?.trim() || 'Cohort 6 (Spring 2026)',
                          status: 'student',
                          enrollmentDate: new Date().toISOString().split('T')[0],
                          attendanceScore: 100,
                          notes: 'Batch enrolled from CSV upload.'
                        });
                      }
                    });
                    if (newEnrolled.length > 0) {
                      const updated = [...newEnrolled, ...students];
                      setStudents(updated);
                      localStorage.setItem('erp_sandbox_students', JSON.stringify(updated));
                      showToast(`✓ Batch Enrolled ${newEnrolled.length} new students from CSV!`);
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>

            <button
              onClick={() => {
                if (runningPrograms.length > 0) {
                  setNewStudentProgram(runningPrograms[0].title);
                }
                setIsAddModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>Register Student</span>
            </button>
          </div>
        )}

        {activeSubTab === 'programs' && (
          <button
            onClick={() => setIsAddProgramOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Add Program</span>
          </button>
        )}
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4.5 h-4.5 text-indigo-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Primary Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('students')}
          className={`pb-3 px-5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'students'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Current Students ({students.filter(s => s.status === 'student').length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('onboarding')}
          className={`pb-3 px-5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'onboarding'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Onboarding & 3-Trench Fees</span>
        </button>

        <button
          onClick={() => setActiveSubTab('microloans')}
          className={`pb-3 px-5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'microloans'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Award className="w-4 h-4 text-emerald-600" />
          <span>Graduate Microloans</span>
        </button>

        <button
          onClick={() => setActiveSubTab('graduates')}
          className={`pb-3 px-5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'graduates'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Graduates ({students.filter(s => s.status === 'graduate').length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('placements')}
          className={`pb-3 px-5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'placements'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>M&E Placement List</span>
        </button>

        <button
          onClick={() => setActiveSubTab('programs')}
          className={`pb-3 px-5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'programs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Running Programs ({runningPrograms.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('forms')}
          className={`pb-3 px-5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'forms'
              ? 'border-purple-600 text-purple-700 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-600" />
          <span>Graduate Forms & Tracer Studies ({availableForms.length})</span>
        </button>
      </div>

      {/* Assessment Milestone Notification Banner (CEO & Manager Schedule) */}
      <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/20 mt-0.5">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-slate-900 tracking-tight">
                M&E Graduate Assessment Milestones Active (6-Month, 1-Year & 2-Year Periods)
              </h4>
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-md uppercase">
                CEO & Manager Schedule
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Automated tracer milestones are live: 6-Month Tracer Assessments for Cohort 4 (Textiles & Software), 1-Year Career Review for Cohort 3, and 2-Year Long-Term Impact evaluations.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveSubTab('forms')}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Open Assessment Container</span>
          </button>
        </div>
      </div>

      {/* Filters block for student/graduate lists */}
      {activeSubTab !== 'placements' && activeSubTab !== 'programs' && activeSubTab !== 'forms' && activeSubTab !== 'onboarding' && activeSubTab !== 'microloans' && (
        <div className="flex flex-col sm:flex-row gap-3 text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search students, program titles, cohorts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all shadow-3xs"
            />
          </div>

          <select
            value={selectedProgram}
            onChange={e => setSelectedProgram(e.target.value)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-600 focus:outline-none shadow-3xs"
          >
            <option value="all">All Academic Programs</option>
            {runningPrograms.map(p => (
              <option key={p.id} value={p.title}>{p.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* STUDENT ONBOARDING & 3-TRENCH MAINTENANCE FEES */}
      {activeSubTab === 'onboarding' && (
        <StudentOnboardingManager activeUser={activeUser} initialTab="students" />
      )}

      {/* GRADUATE MICROFINANCING LOANS */}
      {activeSubTab === 'microloans' && (
        <StudentOnboardingManager activeUser={activeUser} initialTab="microloans" />
      )}

      {/* MAIN SWITCHER VIEW CONTENT */}
      {activeSubTab === 'students' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentStudentsList.map(s => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">{s.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">ID: {s.id}</p>
                  </div>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                    Active Student
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <p><span className="text-slate-400 font-medium">Program:</span> <span className="font-semibold text-slate-700">{s.programName}</span></p>
                  <p><span className="text-slate-400 font-medium">Cohort:</span> <span className="font-semibold text-slate-700">{s.cohort}</span></p>
                  <p><span className="text-slate-400 font-medium">Contact:</span> <span className="text-slate-700">{s.phone} | {s.email}</span></p>
                  
                  {/* Attendance Progress bar */}
                  <div className="pt-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                      <span>ATTENDANCE SCORE</span>
                      <span className={s.attendanceScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}>
                        {s.attendanceScore}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${s.attendanceScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${s.attendanceScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <span className="text-[10px] text-slate-400 truncate">Enroll: {s.enrollmentDate}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('tumi_navigate_tab', { detail: 'certificates' }));
                    }}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                    title="Generate and print Trainee ID Card"
                  >
                    📇 ID Card
                  </button>
                  <button
                    onClick={() => handleGraduateStudent(s.id)}
                    className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                  >
                    🎓 Graduate
                  </button>
                </div>
              </div>
            </div>
          ))}

          {currentStudentsList.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">No active students matched this search criteria.</p>
              <p className="text-[10px] text-slate-400 mt-1">Register a new student inside the curriculum tracker to populate.</p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'graduates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {graduatesList.map(s => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">{s.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">ID: {s.id}</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border border-emerald-100">
                    <Award className="w-3 h-3" /> Certified Graduate
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <p><span className="text-slate-400 font-medium">Completed:</span> <span className="font-semibold text-slate-700">{s.programName}</span></p>
                  <p><span className="text-slate-400 font-medium">Cohort:</span> <span className="font-semibold text-slate-700">{s.cohort}</span></p>
                  <p><span className="text-slate-400 font-medium">Contact:</span> <span className="text-slate-700">{s.phone} | {s.email}</span></p>
                  {s.notes && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100/50 text-[10px] text-slate-500 italic">
                      &ldquo;{s.notes}&rdquo;
                    </div>
                  )}

                  {/* Calculated Graduate Assessment Milestones */}
                  {(() => {
                    const m6Date = addMonthsToDate(s.enrollmentDate, 6);
                    const m12Date = addMonthsToDate(s.enrollmentDate, 12);
                    const m24Date = addMonthsToDate(s.enrollmentDate, 24);
                    const allResponses = graduateFormStore.getResponses();
                    const has6mResponse = allResponses.some(r => (r.graduateId === s.id || r.graduateName.toLowerCase() === s.name.toLowerCase()) && r.milestone === '6_months');
                    const has1yResponse = allResponses.some(r => (r.graduateId === s.id || r.graduateName.toLowerCase() === s.name.toLowerCase()) && r.milestone === '1_year');
                    const has2yResponse = allResponses.some(r => (r.graduateId === s.id || r.graduateName.toLowerCase() === s.name.toLowerCase()) && r.milestone === '2_years');

                    return (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                          <span className="flex items-center gap-1 uppercase tracking-wider text-purple-700">
                            <Bell className="w-3 h-3 text-purple-600" /> Assessment Tracker
                          </span>
                          <span className="text-[9px] text-slate-400 font-normal">Auto-calculated</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-[9px]">
                          <div className={`p-1.5 rounded-md border text-center ${has6mResponse ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <span className="block text-[8px] font-bold uppercase text-slate-400">6-Month</span>
                            <span className="font-mono text-[9px] block truncate">{has6mResponse ? '✓ Submitted' : m6Date}</span>
                          </div>

                          <div className={`p-1.5 rounded-md border text-center ${has1yResponse ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <span className="block text-[8px] font-bold uppercase text-slate-400">1-Year</span>
                            <span className="font-mono text-[9px] block truncate">{has1yResponse ? '✓ Submitted' : m12Date}</span>
                          </div>

                          <div className={`p-1.5 rounded-md border text-center ${has2yResponse ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <span className="block text-[8px] font-bold uppercase text-slate-400">2-Year</span>
                            <span className="font-mono text-[9px] block truncate">{has2yResponse ? '✓ Submitted' : m24Date}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 truncate">Grad: {s.enrollmentDate}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveSubTab('forms')}
                    className="bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                    title="Open tracer survey form for this graduate"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Form</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGraduate(s);
                      setCertNumber('CRT-' + Math.floor(100000 + Math.random() * 900000));
                      setIsCertModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                  >
                    📜 Certificate
                  </button>
                </div>
              </div>
            </div>
          ))}

          {graduatesList.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
              <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">No graduated trainees in current view.</p>
              <p className="text-[10px] text-slate-400 mt-1">Graduate an active trainee from the Students panel to generate an alumni record.</p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'placements' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="mb-4">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1">
              <Briefcase className="w-4 h-4 text-indigo-600" /> Career Placements Follow-up Tracker
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Automated workflows monitoring graduated alumni employments, salaries, and 30/90/180-day retention logs for NGO reports.</p>
          </div>
          <GraduatePlacementTracker activeUser={activeUser} />
        </div>
      )}

      {activeSubTab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {runningPrograms.map(p => {
            const count = students.filter(s => s.programName === p.title && s.status === 'student').length;
            const gradCount = students.filter(s => s.programName === p.title && s.status === 'graduate').length;
            const milestones = p.calculatedDates || calculateProgramMilestones(p.startDate, p.duration);
            const alerts = p.assessmentAlerts || { sixMonths: true, oneYear: true, twoYears: true };

            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">{p.title}</h3>
                      <p className="text-[10px] font-mono text-slate-400 font-semibold">{p.code}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      p.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : p.status === 'scheduled'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-50 text-slate-700 border border-slate-200'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-3">{p.description}</p>

                  <div className="grid grid-cols-3 gap-2.5 mt-4 border-t border-b border-slate-100 py-3 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Duration</span>
                      <span className="font-bold text-slate-700">{p.duration}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Start Date</span>
                      <span className="font-bold text-slate-700">{p.startDate}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Lead Instructor</span>
                      <span className="font-bold text-slate-700 truncate block">{p.instructor}</span>
                    </div>
                  </div>

                  {/* Automatically Calculated Assessment Period Alerts Box */}
                  <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1">
                        <Bell className="w-3 h-3 text-purple-600" />
                        Graduate Assessment Alerts
                      </span>
                      <span className="text-[9px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        CEO / Manager Scheduled
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div className={`p-2 rounded-lg border ${alerts.sixMonths ? 'bg-purple-50/70 border-purple-200 text-purple-900' : 'bg-slate-100/50 border-slate-200 text-slate-400'}`}>
                        <div className="flex items-center justify-between font-bold">
                          <span>6-MONTH</span>
                          {alerts.sixMonths ? <span className="text-purple-600 text-[9px]">🔔 ON</span> : <span className="text-slate-400 text-[9px]">OFF</span>}
                        </div>
                        <span className="font-mono text-[9.5px] mt-0.5 block font-semibold">{milestones.sixMonthsDate}</span>
                      </div>

                      <div className={`p-2 rounded-lg border ${alerts.oneYear ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-100/50 border-slate-200 text-slate-400'}`}>
                        <div className="flex items-center justify-between font-bold">
                          <span>1-YEAR</span>
                          {alerts.oneYear ? <span className="text-indigo-600 text-[9px]">🔔 ON</span> : <span className="text-slate-400 text-[9px]">OFF</span>}
                        </div>
                        <span className="font-mono text-[9.5px] mt-0.5 block font-semibold">{milestones.oneYearDate}</span>
                      </div>

                      <div className={`p-2 rounded-lg border ${alerts.twoYears ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-100/50 border-slate-200 text-slate-400'}`}>
                        <div className="flex items-center justify-between font-bold">
                          <span>2-YEAR</span>
                          {alerts.twoYears ? <span className="text-emerald-600 text-[9px]">🔔 ON</span> : <span className="text-slate-400 text-[9px]">OFF</span>}
                        </div>
                        <span className="font-mono text-[9.5px] mt-0.5 block font-semibold">{milestones.twoYearsDate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-600">
                      👨‍🎓 <span className="font-bold text-indigo-600">{count}</span> Enrolled
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      🎓 <span className="font-bold text-emerald-600">{gradCount}</span> Alumni
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isCeoOrManager && (
                      <button
                        onClick={() => handleOpenEditProgram(p)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Edit program details and assessment period alerts"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Alerts</span>
                      </button>
                    )}
                    <button
                      onClick={() => setActiveSubTab('forms')}
                      className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Forms</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Graduate Forms & Assessment Surveys View */}
      {activeSubTab === 'forms' && (
        <div className="animate-fade-in">
          <GraduateFormsManager 
            activeUser={activeUser} 
            onNavigateToGraduates={() => setActiveSubTab('graduates')} 
          />
        </div>
      )}

      {/* Add Program Modal */}
      {isAddProgramOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Create Academic Program / Curriculum</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Establish new running program with automatic graduate assessment alerts.
                </p>
              </div>
              <button onClick={() => setIsAddProgramOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase block">Program Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cybersecurity Engineering"
                  value={progTitle}
                  onChange={e => setProgTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase block">Program Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE-505"
                    value={progCode}
                    onChange={e => setProgCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase block">Duration</label>
                  <select
                    value={progDuration}
                    onChange={e => setProgDuration(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs"
                  >
                    <option value="1 Month">1 Month</option>
                    <option value="2 Months">2 Months</option>
                    <option value="3 Months">3 Months</option>
                    <option value="4 Months">4 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="9 Months">9 Months</option>
                    <option value="12 Months">12 Months (1 Year)</option>
                    <option value="24 Months">24 Months (2 Years)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase block">Lead Instructor</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Grace Hopper"
                    value={progInstructor}
                    onChange={e => setProgInstructor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase block">Start Date</label>
                  <input
                    type="date"
                    value={progStartDate}
                    onChange={e => setProgStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase block">Program Status</label>
                <select
                  value={progStatus}
                  onChange={e => setProgStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs text-slate-700"
                >
                  <option value="active">Active</option>
                  <option value="scheduled">Scheduled / Upcoming</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Assessment Period Alerts Configuration Section */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-purple-700" />
                    <span className="font-black text-purple-900 text-xs uppercase tracking-wider">
                      Graduate Assessment Period Alerts
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                    CEO / Manager Configured
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Assessment milestones are <strong className="text-slate-800">automatically calculated</strong> from the program start date and duration. When graduates reach these intervals, the system triggers alerts and links the assessment forms:
                </p>

                {/* Automatically Calculated Milestones Display */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <div className="bg-white p-2 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Graduation Est.</span>
                    <span className="font-bold text-slate-800 font-mono text-[10px]">{liveCreationMilestones.completionDate}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-[9px] text-purple-600 uppercase font-bold block">6-Mo. Milestone</span>
                    <span className="font-bold text-purple-900 font-mono text-[10px]">{liveCreationMilestones.sixMonthsDate}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-[9px] text-indigo-600 uppercase font-bold block">1-Yr. Milestone</span>
                    <span className="font-bold text-indigo-900 font-mono text-[10px]">{liveCreationMilestones.oneYearDate}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-[9px] text-emerald-600 uppercase font-bold block">2-Yr. Milestone</span>
                    <span className="font-bold text-emerald-900 font-mono text-[10px]">{liveCreationMilestones.twoYearsDate}</span>
                  </div>
                </div>

                {/* Alert Checkboxes and Linked Google Forms */}
                <div className="space-y-2 pt-1 border-t border-purple-200/60">
                  {/* 6 Months Alert */}
                  <div className="bg-white p-2.5 rounded-lg border border-purple-100 flex flex-col gap-1.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={progAlertSixMonths}
                          onChange={e => setProgAlertSixMonths(e.target.checked)}
                          disabled={!isCeoOrManager}
                          className="w-3.5 h-3.5 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                        />
                        <span>Enable 6-Month Tracer Alert</span>
                      </span>
                      <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold">
                        Target: {liveCreationMilestones.sixMonthsDate}
                      </span>
                    </label>
                    {progAlertSixMonths && (
                      <div className="pl-5 pt-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Linked Assessment Form:</label>
                        <select
                          value={progLinkedForm6m}
                          onChange={e => setProgLinkedForm6m(e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700"
                        >
                          {availableForms.map(f => (
                            <option key={f.id} value={f.id}>{f.title} ({f.category})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 1 Year Alert */}
                  <div className="bg-white p-2.5 rounded-lg border border-purple-100 flex flex-col gap-1.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={progAlertOneYear}
                          onChange={e => setProgAlertOneYear(e.target.checked)}
                          disabled={!isCeoOrManager}
                          className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span>Enable 1-Year Career Progression Alert</span>
                      </span>
                      <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">
                        Target: {liveCreationMilestones.oneYearDate}
                      </span>
                    </label>
                    {progAlertOneYear && (
                      <div className="pl-5 pt-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Linked Assessment Form:</label>
                        <select
                          value={progLinkedForm1y}
                          onChange={e => setProgLinkedForm1y(e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700"
                        >
                          {availableForms.map(f => (
                            <option key={f.id} value={f.id}>{f.title} ({f.category})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 2 Years Alert */}
                  <div className="bg-white p-2.5 rounded-lg border border-purple-100 flex flex-col gap-1.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={progAlertTwoYears}
                          onChange={e => setProgAlertTwoYears(e.target.checked)}
                          disabled={!isCeoOrManager}
                          className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span>Enable 2-Year Long-Term Impact Alert</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                        Target: {liveCreationMilestones.twoYearsDate}
                      </span>
                    </label>
                    {progAlertTwoYears && (
                      <div className="pl-5 pt-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Linked Assessment Form:</label>
                        <select
                          value={progLinkedForm2y}
                          onChange={e => setProgLinkedForm2y(e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700"
                        >
                          {availableForms.map(f => (
                            <option key={f.id} value={f.id}>{f.title} ({f.category})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {!isCeoOrManager && (
                  <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                    ℹ Assessment alert schedule configuration is restricted to CEO and Academic Management roles.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase block">Description</label>
                <textarea
                  placeholder="Program syllabus objectives..."
                  value={progDescription}
                  onChange={e => setProgDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs h-16 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3 sticky bottom-0 bg-white py-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                >
                  ✓ Establish Program & Alerts
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddProgramOpen(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase tracking-wider border border-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Program Dialogue */}
      {isEditProgramOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-purple-600" />
                  <span>Edit Academic Program & Assessment Alerts</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Update curriculum details and re-calculate graduate assessment milestones.
                </p>
              </div>
              <button onClick={() => setIsEditProgramOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProgram} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase block">Program Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase block">Program Code *</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={e => setEditCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase block">Duration</label>
                  <select
                    value={editDuration}
                    onChange={e => setEditDuration(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs"
                  >
                    <option value="1 Month">1 Month</option>
                    <option value="2 Months">2 Months</option>
                    <option value="3 Months">3 Months</option>
                    <option value="4 Months">4 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="9 Months">9 Months</option>
                    <option value="12 Months">12 Months (1 Year)</option>
                    <option value="24 Months">24 Months (2 Years)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase block">Lead Instructor</label>
                  <input
                    type="text"
                    value={editInstructor}
                    onChange={e => setEditInstructor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase block">Start Date</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={e => setEditStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase block">Program Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs text-slate-700"
                >
                  <option value="active">Active</option>
                  <option value="scheduled">Scheduled / Upcoming</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Assessment Period Alerts Configuration Section */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-purple-700" />
                    <span className="font-black text-purple-900 text-xs uppercase tracking-wider">
                      Assessment Alerts Schedule (CEO & Manager)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                    Auto-Recalculating
                  </span>
                </div>

                {/* Automatically Calculated Milestones Display */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <div className="bg-white p-2 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Graduation Est.</span>
                    <span className="font-bold text-slate-800 font-mono text-[10px]">{liveEditMilestones.completionDate}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-[9px] text-purple-600 uppercase font-bold block">6-Mo. Milestone</span>
                    <span className="font-bold text-purple-900 font-mono text-[10px]">{liveEditMilestones.sixMonthsDate}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-[9px] text-indigo-600 uppercase font-bold block">1-Yr. Milestone</span>
                    <span className="font-bold text-indigo-900 font-mono text-[10px]">{liveEditMilestones.oneYearDate}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-[9px] text-emerald-600 uppercase font-bold block">2-Yr. Milestone</span>
                    <span className="font-bold text-emerald-900 font-mono text-[10px]">{liveEditMilestones.twoYearsDate}</span>
                  </div>
                </div>

                {/* Alert Checkboxes and Linked Google Forms */}
                <div className="space-y-2 pt-1 border-t border-purple-200/60">
                  {/* 6 Months Alert */}
                  <div className="bg-white p-2.5 rounded-lg border border-purple-100 flex flex-col gap-1.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={editAlertSixMonths}
                          onChange={e => setEditAlertSixMonths(e.target.checked)}
                          disabled={!isCeoOrManager}
                          className="w-3.5 h-3.5 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                        />
                        <span>Enable 6-Month Tracer Alert</span>
                      </span>
                      <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold">
                        Target: {liveEditMilestones.sixMonthsDate}
                      </span>
                    </label>
                    {editAlertSixMonths && (
                      <div className="pl-5 pt-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Linked Assessment Form:</label>
                        <select
                          value={editLinkedForm6m}
                          onChange={e => setEditLinkedForm6m(e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700"
                        >
                          {availableForms.map(f => (
                            <option key={f.id} value={f.id}>{f.title} ({f.category})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 1 Year Alert */}
                  <div className="bg-white p-2.5 rounded-lg border border-purple-100 flex flex-col gap-1.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={editAlertOneYear}
                          onChange={e => setEditAlertOneYear(e.target.checked)}
                          disabled={!isCeoOrManager}
                          className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span>Enable 1-Year Career Progression Alert</span>
                      </span>
                      <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">
                        Target: {liveEditMilestones.oneYearDate}
                      </span>
                    </label>
                    {editAlertOneYear && (
                      <div className="pl-5 pt-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Linked Assessment Form:</label>
                        <select
                          value={editLinkedForm1y}
                          onChange={e => setEditLinkedForm1y(e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700"
                        >
                          {availableForms.map(f => (
                            <option key={f.id} value={f.id}>{f.title} ({f.category})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 2 Years Alert */}
                  <div className="bg-white p-2.5 rounded-lg border border-purple-100 flex flex-col gap-1.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={editAlertTwoYears}
                          onChange={e => setEditAlertTwoYears(e.target.checked)}
                          disabled={!isCeoOrManager}
                          className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span>Enable 2-Year Long-Term Impact Alert</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                        Target: {liveEditMilestones.twoYearsDate}
                      </span>
                    </label>
                    {editAlertTwoYears && (
                      <div className="pl-5 pt-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Linked Assessment Form:</label>
                        <select
                          value={editLinkedForm2y}
                          onChange={e => setEditLinkedForm2y(e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700"
                        >
                          {availableForms.map(f => (
                            <option key={f.id} value={f.id}>{f.title} ({f.category})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase block">Description</label>
                <textarea
                  placeholder="Program syllabus objectives..."
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs h-16 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3 sticky bottom-0 bg-white py-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-md shadow-purple-500/10 transition-all cursor-pointer"
                >
                  ✓ Save Changes & Update Alerts
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditProgramOpen(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase tracking-wider border border-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full my-8 overflow-hidden">
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  📥 Register Student / Trainee
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Capture full bio-data, education, sewing experience, kin contacts & ID.
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Basic Bio-Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Student Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    placeholder="e.g. Ama Serwaa Appiah"
                    className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={newStudentDOB}
                    onChange={e => setNewStudentDOB(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newStudentPhone}
                    onChange={e => setNewStudentPhone(e.target.value)}
                    placeholder="+233 24 000 0000"
                    className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / Residence *</label>
                  <input
                    type="text"
                    required
                    value={newStudentLocation}
                    onChange={e => setNewStudentLocation(e.target.value)}
                    placeholder="e.g. Asokwa, Kumasi"
                    className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Programs and Cohorts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Academic Program Assignment</label>
                  <select
                    value={newStudentProgram}
                    onChange={e => setNewStudentProgram(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900 focus:outline-none"
                  >
                    {runningPrograms.map(p => (
                      <option key={p.id} value={p.title}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cohort Assignment</label>
                  <select
                    value={newStudentCohort}
                    onChange={e => setNewStudentCohort(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="Cohort 2026-A">Cohort 2026-A</option>
                    <option value="Cohort 2026-B">Cohort 2026-B</option>
                    <option value="Cohort 2026-C">Cohort 2026-C</option>
                  </select>
                </div>
              </div>

              {/* Educational Background Multi-Checkbox */}
              <div className="border-t border-slate-200 pt-4">
                <label className="block font-bold text-slate-700 mb-2">
                  Educational Background Selection *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'primary', label: 'Primary School' },
                    { id: 'jhs', label: 'Junior High School (JHS)' },
                    { id: 'shs', label: 'Senior High School (SHS)' },
                    { id: 'degree', label: "Bachelor's Degree" },
                    { id: 'masters', label: "Master's Degree" },
                    { id: 'no_education', label: 'No Formal Education' }
                  ].map(opt => {
                    const isChecked = newStudentEdu.includes(opt.id);
                    return (
                      <label 
                        key={opt.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewStudentEdu([...newStudentEdu, opt.id]);
                            } else {
                              setNewStudentEdu(newStudentEdu.filter(x => x !== opt.id));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Sewing Experience & Kids */}
              <div className="border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStudentSewingExp}
                      onChange={e => setNewStudentSewingExp(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Previous Sewing Experience</span>
                  </label>
                  {newStudentSewingExp && (
                    <input
                      type="text"
                      value={newStudentSewingDetails}
                      onChange={e => setNewStudentSewingDetails(e.target.value)}
                      placeholder="Describe experience (e.g. Apprentice seamstress)"
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-xs text-slate-900"
                    />
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStudentHasKids}
                      onChange={e => setNewStudentHasKids(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Has Children / Kids</span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">For daycare & scheduling family coordination.</p>
                </div>
              </div>

              {/* Emergency Contact Person */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-800 mb-2">Emergency Contact Kin</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kin Name *</label>
                    <input
                      type="text"
                      required
                      value={newStudentKinName}
                      onChange={e => setNewStudentKinName(e.target.value)}
                      placeholder="e.g. Kwabena Mensah"
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Relation *</label>
                    <input
                      type="text"
                      required
                      value={newStudentKinRelation}
                      onChange={e => setNewStudentKinRelation(e.target.value)}
                      placeholder="e.g. Mother, Spouse"
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kin Phone *</label>
                    <input
                      type="tel"
                      required
                      value={newStudentKinPhone}
                      onChange={e => setNewStudentKinPhone(e.target.value)}
                      placeholder="+233 20 000 0000"
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Identification Verification */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-800 mb-2">Identification Verification</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ID Document Type</label>
                    <div className="space-y-1.5">
                      {[
                        { id: 'national_id', label: 'Ghana Card (National ID)' },
                        { id: 'voters_id', label: "Voter's ID Card" },
                        { id: 'nhia_id', label: 'NHIA Health Card' },
                        { id: 'drivers_license', label: "Driver's License" }
                      ].map(idOpt => (
                        <label key={idOpt.id} className="flex items-center gap-2 cursor-pointer text-[11px]">
                          <input
                            type="radio"
                            name="newIdTypeRadio"
                            value={idOpt.id}
                            checked={newStudentIdType === idOpt.id}
                            onChange={() => setNewStudentIdType(idOpt.id as any)}
                            className="text-indigo-600"
                          />
                          <span>{idOpt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">ID Code *</label>
                      <input
                        type="text"
                        required
                        value={newStudentIdNum}
                        onChange={e => setNewStudentIdNum(e.target.value)}
                        placeholder="e.g. GHA-789012345-1"
                        className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs text-slate-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Identification Scan Photo</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-2.5 text-center bg-slate-50">
                        <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-500 block">Click to upload ID photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => setNewStudentIdPhoto(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                          id="id_photo_file_programs"
                        />
                        <label htmlFor="id_photo_file_programs" className="text-[10px] text-indigo-600 font-bold block mt-1 hover:underline cursor-pointer">
                          {newStudentIdPhoto ? '✓ Image Loaded (Click to change)' : 'Select File'}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="border-t border-slate-200 pt-4">
                <label className="block font-bold text-slate-700 mb-1">Admin Notes / Background</label>
                <textarea
                  placeholder="Additional enrollment background details..."
                  value={newStudentNotes}
                  onChange={e => setNewStudentNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-xs h-16 resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex gap-3 sticky bottom-0 bg-white py-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                >
                  ✓ Enroll Student
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase tracking-wider border border-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Digital Verification Certificate Modal */}
      {isCertModalOpen && selectedGraduate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 max-w-2xl w-full p-8 md:p-12 relative overflow-hidden font-serif">
            {/* Corner security Guilloche watermark aesthetics */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="absolute top-6 right-6">
              <button 
                onClick={() => setIsCertModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center border-4 border-double border-slate-700 p-8 rounded-2xl relative">
              <span className="text-slate-500 font-sans uppercase tracking-widest text-[9px] font-bold block mb-2">
                VERIFIABLE ACADEMIC RECORD
              </span>
              <Award className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              
              <h2 className="text-xl md:text-2xl font-bold tracking-wide text-slate-100">
                TUMI ENTERPRISE SCHOOL
              </h2>
              <p className="text-[10px] text-slate-400 font-sans uppercase tracking-wider mt-1">
                Government Approved & NGO Supported Vocational Academy
              </p>

              <div className="my-6 border-t border-slate-800 w-16 mx-auto" />

              <p className="text-xs text-slate-300 italic">
                This document serves to certify that
              </p>
              <h3 className="text-lg md:text-xl font-extrabold tracking-wide text-white mt-2 mb-1">
                {selectedGraduate.name}
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                has successfully fulfilled all requirements of the study program, practical assessments, and professional internship under active donor sponsorship and is hereby awarded the digital certificate of completeness for:
              </p>

              <h4 className="text-sm md:text-base font-bold text-emerald-400 tracking-wide uppercase mt-4 mb-5">
                {selectedGraduate.programName}
              </h4>

              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8 border-t border-slate-800 pt-6 font-sans text-[10px]">
                <div className="text-center md:text-left">
                  <span className="text-slate-500 block uppercase font-bold">CERTIFICATE ID</span>
                  <span className="font-mono font-bold text-slate-300">{certNumber}</span>
                </div>
                <div className="text-center md:text-right">
                  <span className="text-slate-500 block uppercase font-bold">DIGITAL SIGNATURE SECURED</span>
                  <span className="font-mono text-emerald-500">✓ SIG-{Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
