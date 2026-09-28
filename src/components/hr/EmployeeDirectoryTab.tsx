import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  ShieldCheck, 
  Edit3, 
  Mail, 
  Building, 
  DollarSign, 
  Key, 
  CheckCircle2, 
  X,
  UserCheck,
  AlertCircle,
  RotateCcw,
  Heart,
  Phone
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types/erp';
import { exportToCSV } from '../../utils/exportUtils';
import { StudentStaffStore } from '../../utils/studentStaffStore';

interface EmployeeDirectoryTabProps {
  users: UserProfile[];
  activeUser: UserProfile;
  onAddUser: (user: UserProfile) => void;
  onUpdateUser: (uid: string, updates: Partial<UserProfile>) => void;
  onDeleteUser?: (uid: string) => void;
}

const ALL_ROLES: { role: UserRole; label: string; desc: string }[] = [
  { role: 'ceo', label: 'CEO (Chief Executive)', desc: 'Unrestricted enterprise authority over all operations & admin' },
  { role: 'sysadmin', label: 'System Administrator', desc: 'Platform infra, user claims, logs & technical config' },
  { role: 'manager', label: 'Operations Manager', desc: 'Commercial ops, inventory, logistics & departmental approvals' },
  { role: 'accountant', label: 'Head Accountant', desc: 'General ledger, financial statements, cash flows & audits' },
  { role: 'sales', label: 'Sales Executive', desc: 'CRM pipeline, deals, opportunities & client relationships' },
  { role: 'cashier', label: 'Frontline Cashier', desc: 'POS register, checkout, terminal payments & daily till' },
  { role: 'warehouse', label: 'Warehouse Clerk', desc: 'Inventory logistics, receiving, stock counts & dispatches' },
  { role: 'receptionist', label: 'Front Desk Receptionist', desc: 'Hospitality reservations, check-ins & guest CRM' },
  { role: 'housekeeping', label: 'Housekeeping Supervisor', desc: 'Room cleaning readiness, turnover inspections & tasks' },
  { role: 'maintenance', label: 'Maintenance Specialist', desc: 'Work orders, physical asset repairs & facilities' },
  { role: 'auditor', label: 'Compliance Auditor', desc: 'Read-only financial ledgers, audit logs & compliance reviews' }
];

export default function EmployeeDirectoryTab({
  users,
  activeUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser
}: EmployeeDirectoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [resettingUser, setResettingUser] = useState<UserProfile | null>(null);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);

  // Form states for new employee
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('sales');
  const [department, setDepartment] = useState('Sales & Commercial');
  const [jobTitle, setJobTitle] = useState('');
  const [salary, setSalary] = useState('4500');
  const [pin, setPin] = useState('1234');
  const [phone, setPhone] = useState('+233 24 555 8891');
  // Employment Type, Marital Status & Emergency Contact
  const [employmentType, setEmploymentType] = useState<'full_time' | 'part_time' | 'probation' | 'other'>('full_time');
  const [employmentTypeOther, setEmploymentTypeOther] = useState('');
  const [isMarried, setIsMarried] = useState(false);
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('Spouse');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('+233 20 000 0000');
  const [formError, setFormError] = useState<string | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.jobTitle && u.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (u.emergencyContactName && u.emergencyContactName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSubmitNewEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFormError('Employee name and email address are required.');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setFormError('An employee with this email already exists.');
      return;
    }

    const newUser: UserProfile = {
      uid: 'emp_' + Date.now().toString().slice(-6),
      name: name.trim(),
      email: email.trim(),
      role,
      roles: Array.from(new Set([role, ...roles])),
      department: department.trim() || 'General Operations',
      jobTitle: jobTitle.trim() || role.toUpperCase(),
      baseSalary: parseFloat(salary) || 4000,
      pin: pin.trim() || '1111',
      whatsappNumber: phone.trim() || undefined,
      hireDate: new Date().toISOString().slice(0, 10),
      status: 'active',
      employmentType: employmentType === 'other' && employmentTypeOther.trim() ? employmentTypeOther.trim() : employmentType,
      isMarried,
      maritalStatus: isMarried ? 'married' : 'single',
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactRelation: emergencyContactRelation.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      contactPersonName: emergencyContactName.trim() || undefined,
      contactPersonRelation: emergencyContactRelation.trim() || undefined,
      contactPersonPhone: emergencyContactPhone.trim() || undefined,
      permissions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onAddUser(newUser);
    StudentStaffStore.addStaff(newUser);
    setIsAddModalOpen(false);
    setName('');
    setEmail('');
    setJobTitle('');
    setRoles([]);
    setEmergencyContactName('');
    setEmergencyContactRelation('Spouse');
    setEmergencyContactPhone('+233 20 000 0000');
    setIsMarried(false);
    setEmploymentType('full_time');
    setEmploymentTypeOther('');
    setFormError(null);
  };

  const handleUpdateRoleAndSalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updatedUser = {
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role,
      roles: Array.from(new Set([editingUser.role, ...(editingUser.roles || [editingUser.role])])),
      department: editingUser.department,
      jobTitle: editingUser.jobTitle,
      baseSalary: editingUser.baseSalary,
      pin: editingUser.pin,
      workDaysPerMonth: editingUser.workDaysPerMonth,
      workHoursPerDay: editingUser.workHoursPerDay,
      dailyRate: editingUser.dailyRate,
      hourlyRate: editingUser.hourlyRate,
      employmentType: editingUser.employmentType || 'full_time',
      isMarried: editingUser.isMarried ?? (editingUser.maritalStatus === 'married'),
      maritalStatus: (editingUser.isMarried ?? (editingUser.maritalStatus === 'married')) ? 'married' : 'single',
      emergencyContactName: editingUser.emergencyContactName || editingUser.contactPersonName,
      emergencyContactRelation: editingUser.emergencyContactRelation || editingUser.contactPersonRelation,
      emergencyContactPhone: editingUser.emergencyContactPhone || editingUser.contactPersonPhone,
      contactPersonName: editingUser.emergencyContactName || editingUser.contactPersonName,
      contactPersonRelation: editingUser.emergencyContactRelation || editingUser.contactPersonRelation,
      contactPersonPhone: editingUser.emergencyContactPhone || editingUser.contactPersonPhone
    };

    onUpdateUser(editingUser.uid, updatedUser);
    StudentStaffStore.updateStaff(editingUser.uid, updatedUser);
    setEditingUser(null);
  };

  const handleExport = () => {
    const data = filteredUsers.map(u => ({
      'Employee ID': u.uid,
      'Full Name': u.name,
      'Email': u.email,
      'Role': u.role.toUpperCase(),
      'Department': u.department || '',
      'Job Title': u.jobTitle || '',
      'Employment Type': (u.employmentType || (u.employmentStatus === 'probation' ? 'probation' : 'full_time')).toUpperCase(),
      'Marital Status': (u.isMarried || u.maritalStatus === 'married') ? 'MARRIED' : 'SINGLE',
      'Emergency Contact Name': u.emergencyContactName || u.contactPersonName || '',
      'Emergency Contact Relation': u.emergencyContactRelation || u.contactPersonRelation || '',
      'Emergency Contact Phone': u.emergencyContactPhone || u.contactPersonPhone || '',
      'Base Monthly Salary ($)': (u.baseSalary || 4000).toFixed(2),
      'Terminal PIN': u.pin || '1111',
      'Status': (u.status || 'active').toUpperCase(),
      'Hire Date': u.hireDate || ''
    }));
    exportToCSV(data, `Employee_Staff_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Staff Directory & Role-Based Access Control (RBAC)
          </h2>
          <p className="text-xs text-slate-500">Manage personnel credentials, departmental roles (including CEO & Sysadmin), salaries and security PINs</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Directory</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto items-center">
          <span className="text-xs font-medium text-slate-400 mr-1">Role:</span>
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              roleFilter === 'all' ? 'bg-slate-900 text-white font-bold' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            All Staff ({users.length})
          </button>
          {['ceo', 'sysadmin', 'manager', 'accountant', 'sales', 'cashier', 'warehouse'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium uppercase transition-all ${
                roleFilter === r ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, email, department..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-indigo-500"
          />
        </div>
      </div>

      {/* Employee Directory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map(emp => {
          const getRoleBadge = (r: string) => {
            switch (r) {
              case 'ceo': return 'bg-purple-100 text-purple-800 border-purple-200 font-black';
              case 'sysadmin': return 'bg-rose-100 text-rose-800 border-rose-200 font-black';
              case 'manager': return 'bg-indigo-100 text-indigo-800 border-indigo-200 font-bold';
              case 'accountant': return 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold';
              case 'sales': return 'bg-blue-100 text-blue-800 border-blue-200 font-bold';
              case 'cashier': return 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
              case 'warehouse': return 'bg-orange-100 text-orange-800 border-orange-200 font-bold';
              default: return 'bg-slate-100 text-slate-800 border-slate-200 font-bold';
            }
          };

          return (
            <div key={emp.uid} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-200 transition-all">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{emp.name}</h3>
                    <p className="text-xs text-slate-500">{emp.jobTitle || emp.role.toUpperCase()}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[50%]">
                    {Array.from(new Set([emp.role, ...(emp.roles || [emp.role])])).map((r) => (
                      <span key={r} className={`px-2 py-0.5 rounded text-[10px] uppercase border ${getRoleBadge(r)}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      emp.employmentType === 'probation' || emp.employmentStatus === 'probation'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : emp.employmentType === 'part_time'
                        ? 'bg-sky-100 text-sky-800 border border-sky-200'
                        : emp.employmentType === 'other'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {emp.employmentType === 'part_time' 
                        ? '⏱ Part Time' 
                        : (emp.employmentType === 'probation' || emp.employmentStatus === 'probation') 
                        ? '⏳ Probation' 
                        : emp.employmentType === 'other' 
                        ? '🏷 Other' 
                        : '✓ Full Time'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      emp.isMarried || emp.maritalStatus === 'married'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      <Heart className="w-2.5 h-2.5" />
                      <span>{emp.isMarried || emp.maritalStatus === 'married' ? 'Married' : 'Single'}</span>
                    </span>
                  </div>

                  {/* Emergency Contact */}
                  <div className="p-2 bg-rose-50/70 rounded-lg border border-rose-100 text-[11px] text-slate-700 flex items-start gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="truncate w-full">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-800 truncate">
                          {emp.emergencyContactName || emp.contactPersonName || 'No emergency contact'}
                        </span>
                        {(emp.emergencyContactRelation || emp.contactPersonRelation) && (
                          <span className="text-[10px] font-semibold text-rose-700 uppercase shrink-0">
                            {emp.emergencyContactRelation || emp.contactPersonRelation}
                          </span>
                        )}
                      </div>
                      {(emp.emergencyContactPhone || emp.contactPersonPhone) && (
                        <span className="text-slate-500 block text-[10px] font-mono">
                          {emp.emergencyContactPhone || emp.contactPersonPhone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{emp.department || 'Operations'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">GHS {(emp.baseSalary || 4000).toLocaleString()}/month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-500">PIN: {emp.pin || '1111'}</span>
                  </div>

                  {/* Dynamic Visual Loan Tracker */}
                  {(() => {
                    const employeeLoans = StudentStaffStore.getStaffLoans().filter(
                      l => l.staffId === emp.uid || l.staffName.toLowerCase() === emp.name.toLowerCase()
                    );
                    if (employeeLoans.length === 0) return null;
                    return (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                            <span>💳</span> active loan tracker
                          </span>
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[8px] font-black uppercase rounded-sm">
                            {employeeLoans.length} Record
                          </span>
                        </div>
                        {employeeLoans.map(loan => {
                          const originalAmount = loan.amount;
                          const remainingBalance = loan.remainingBalance;
                          const paidAmount = Math.max(0, originalAmount - remainingBalance);
                          const paidPercent = originalAmount > 0 ? Math.round((paidAmount / originalAmount) * 100) : 0;
                          
                          const deductionText = loan.deductionType === 'percentage' 
                            ? `${loan.deductionValue}% salary deduction/mo` 
                            : `GHS ${loan.monthlyDeduction}/mo fixed`;

                          return (
                            <div key={loan.id} className="space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                              <div className="flex items-center justify-between text-[9px] font-bold text-slate-700">
                                <span className="capitalize">{loan.type === 'advance' ? 'Salary Advance' : 'Staff Loan'}</span>
                                <span className="font-mono text-[9px] text-indigo-700">{paidPercent}% Cleared</span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  style={{ width: `${paidPercent}%` }} 
                                  className={`h-full transition-all ${paidPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                />
                              </div>
                              
                              <div className="grid grid-cols-3 gap-0.5 text-center font-mono text-[8px] pt-1">
                                <div>
                                  <span className="text-slate-400 block text-[7px] uppercase font-bold">Principal</span>
                                  <span className="font-bold text-slate-700">GHS {originalAmount}</span>
                                </div>
                                <div className="border-l border-slate-100">
                                  <span className="text-slate-400 block text-[7px] uppercase font-bold">Repaid</span>
                                  <span className="font-bold text-emerald-600">GHS {paidAmount.toFixed(0)}</span>
                                </div>
                                <div className="border-l border-slate-100">
                                  <span className="text-slate-400 block text-[7px] uppercase font-bold">Balance</span>
                                  <span className={`font-bold ${remainingBalance === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>GHS {remainingBalance.toFixed(0)}</span>
                                </div>
                              </div>

                              <div className="text-[7.5px] text-slate-400 font-bold flex justify-between pt-1 border-t border-slate-50">
                                <span>Terms:</span>
                                <span className="text-indigo-600 uppercase tracking-tight">{deductionText}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">ID: {emp.uid}</span>
                <div className="flex items-center gap-1.5">
                  {emp.employmentStatus === 'probation' && (activeUser.role === 'manager' || activeUser.role === 'ceo') && (
                    <button
                      onClick={() => {
                        onUpdateUser(emp.uid, {
                          employmentStatus: 'confirmed',
                          appraisalNotes: `Appraised & fully confirmed by ${activeUser.name} on ${new Date().toLocaleDateString()}`
                        });
                      }}
                      className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 font-bold px-2 py-1 rounded-md transition-colors"
                      title="Confirm Appraisal & Enlist Fully"
                    >
                      <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Enlist Fully</span>
                    </button>
                  )}
                  {(activeUser.role === 'manager' || activeUser.role === 'ceo') && (
                    <button
                      onClick={() => {
                        setResettingUser(emp);
                        setGeneratedPin(null);
                      }}
                      className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-bold px-1.5 py-1 rounded-md transition-colors"
                      title="Reset Terminal PIN"
                    >
                      <RotateCcw className="w-3 h-3 shrink-0" />
                      <span>Reset PIN</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('tumi_navigate_tab', { detail: 'certificates' }));
                    }}
                    className="flex items-center gap-1 text-[11px] text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold px-2 py-1 rounded-md transition-colors"
                    title="Generate and print Staff ID Badge"
                  >
                    📇 ID Badge
                  </button>
                  <button
                    onClick={() => setEditingUser(emp)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold p-1 rounded hover:bg-indigo-50 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Configure</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset PIN Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-rose-600" />
                Reset Security PIN
              </h3>
              <button onClick={() => setResettingUser(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!generatedPin ? (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Are you sure you want to trigger a PIN reset for <span className="font-bold text-slate-900">{resettingUser.name}</span>?
                </p>
                <p className="text-slate-400 text-[11px]">
                  This will generate a temporary new security PIN that they must use to access terminal-specific roles and shift logs.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setResettingUser(null)}
                    className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                      onUpdateUser(resettingUser.uid, { pin: newPin });
                      setGeneratedPin(newPin);
                    }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs transition-all flex items-center gap-1"
                  >
                    <span>Generate Temporary PIN</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg font-semibold text-center">
                  ✓ Security PIN Reset Successful!
                </div>
                <p className="text-slate-500">
                  Provide this temporary security PIN to <span className="font-bold text-slate-800">{resettingUser.name}</span>:
                </p>
                <div className="py-4 px-6 bg-slate-100 border border-slate-200 rounded-xl inline-block font-mono text-2xl font-black text-slate-800 tracking-widest mx-auto animate-pulse">
                  {generatedPin}
                </div>
                <p className="text-[10px] text-slate-400">
                  They can use this PIN immediately to log in and update their security profile.
                </p>
                <div className="pt-2 border-t border-slate-100 flex justify-center">
                  <button
                    onClick={() => {
                      setResettingUser(null);
                      setGeneratedPin(null);
                    }}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Register New Employee Profile
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNewEmployee} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Hayes"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Company Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="jordan@tumi.corp"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Primary Security Role *</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const newPrimary = e.target.value as UserRole;
                      setRole(newPrimary);
                      setRoles(prev => prev.includes(newPrimary) ? prev : [newPrimary, ...prev.filter(r => r !== role)]);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {ALL_ROLES.map(r => (
                      <option key={r.role} value={r.role}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Finance & Accounting"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5">Additional Assigned Roles (Multiple Roles)</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-36 overflow-y-auto">
                  {ALL_ROLES.map(r => {
                    const isPrimary = r.role === role;
                    const isChecked = isPrimary || roles.includes(r.role);
                    return (
                      <label key={r.role} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all ${isPrimary ? 'opacity-60 cursor-not-allowed bg-slate-100/50' : 'hover:bg-slate-100'}`}>
                        <input
                          type="checkbox"
                          disabled={isPrimary}
                          checked={isChecked}
                          onChange={(e) => {
                            const updatedRoles = e.target.checked
                              ? [...roles, r.role]
                              : roles.filter(x => x !== r.role);
                            setRoles(updatedRoles);
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[11px] font-medium text-slate-700">{r.label.split(' (')[0]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    placeholder="Senior Accountant"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Base Monthly Salary ($)</label>
                  <input
                    type="number"
                    step="50"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Terminal PIN (4-digit)</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Employment Type Selection */}
              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-indigo-950 text-xs">Employment Type *</label>
                  <span className="text-[10px] text-indigo-600 font-semibold">Select 1 of 4 options</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'full_time', label: 'Full Time' },
                    { id: 'part_time', label: 'Part Time' },
                    { id: 'probation', label: 'Probation' },
                    { id: 'other', label: 'Other' }
                  ].map(item => (
                    <label 
                      key={item.id}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer text-[11px] font-bold transition-all ${
                        employmentType === item.id 
                          ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs ring-1 ring-indigo-500' 
                          : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="addModalEmpType"
                        value={item.id}
                        checked={employmentType === item.id}
                        onChange={() => setEmploymentType(item.id as any)}
                        className="text-indigo-600"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>

                {employmentType === 'other' && (
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-indigo-900 mb-0.5">
                      Specify Other Employment Terms
                    </label>
                    <input
                      type="text"
                      value={employmentTypeOther}
                      onChange={(e) => setEmploymentTypeOther(e.target.value)}
                      placeholder="e.g. Fixed-term Contractor, Volunteer, Intern"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Marital Status Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="addEmployeeMaritalStatus"
                    checked={isMarried}
                    onChange={(e) => setIsMarried(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="addEmployeeMaritalStatus" className="flex flex-col cursor-pointer select-none">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <span>Marital Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isMarried ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {isMarried ? 'Married' : 'Single / Unmarried'}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isMarried ? 'Staff is registered as legally married.' : 'Check this box if the employee is married.'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Emergency Contact Person */}
              <div className="bg-rose-50/40 p-3.5 rounded-xl border border-rose-100/80 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                  <Phone className="w-3.5 h-3.5 text-rose-600" />
                  <span>Emergency Contact Person *</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sister Mercy"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Relationship *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Spouse, Sibling"
                      value={emergencyContactRelation}
                      onChange={(e) => setEmergencyContactRelation(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Emergency Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+233 24 000 0000"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
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
                  Save & Provision Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee / Configure Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Configure Profile: {editingUser.name}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoleAndSalary} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Company Email *</label>
                  <input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Primary Role *</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => {
                    const newPrimary = e.target.value as UserRole;
                    const prevRoles = editingUser.roles || [editingUser.role];
                    const newRoles = prevRoles.includes(newPrimary) ? prevRoles : [newPrimary, ...prevRoles.filter(r => r !== editingUser.role)];
                    setEditingUser({ ...editingUser, role: newPrimary, roles: newRoles });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {ALL_ROLES.map(r => (
                    <option key={r.role} value={r.role}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5">Additional Assigned Roles (Multiple Roles)</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-36 overflow-y-auto">
                  {ALL_ROLES.map(r => {
                    const isPrimary = r.role === editingUser.role;
                    const isChecked = isPrimary || (editingUser.roles || [editingUser.role]).includes(r.role);
                    return (
                      <label key={r.role} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all ${isPrimary ? 'opacity-60 cursor-not-allowed bg-slate-100/50' : 'hover:bg-slate-100'}`}>
                        <input
                          type="checkbox"
                          disabled={isPrimary}
                          checked={isChecked}
                          onChange={(e) => {
                            const prevRoles = editingUser.roles || [editingUser.role];
                            const updatedRoles = e.target.checked
                              ? [...prevRoles, r.role]
                              : prevRoles.filter(x => x !== r.role);
                            setEditingUser({ ...editingUser, roles: updatedRoles });
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[11px] font-medium text-slate-700">{r.label.split(' (')[0]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editingUser.department || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={editingUser.jobTitle || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100/80 space-y-3.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-800 block">
                  Monthly Compensation & Dynamic Rates Calculator
                </span>
                
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Monthly Pay (GHS)</label>
                    <input
                      type="number"
                      step="50"
                      value={editingUser.baseSalary || 4000}
                      onChange={(e) => {
                        const baseVal = parseFloat(e.target.value) || 0;
                        const dDays = editingUser.workDaysPerMonth || 22;
                        const dHours = editingUser.workHoursPerDay || 8;
                        const daily = Number((baseVal / dDays).toFixed(2));
                        const hourly = Number((daily / dHours).toFixed(2));
                        setEditingUser({
                          ...editingUser,
                          baseSalary: baseVal,
                          dailyRate: daily,
                          hourlyRate: hourly
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Days / Month</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={editingUser.workDaysPerMonth || 22}
                      onChange={(e) => {
                        const daysVal = parseInt(e.target.value) || 22;
                        const baseVal = editingUser.baseSalary || 4000;
                        const dHours = editingUser.workHoursPerDay || 8;
                        const daily = Number((baseVal / daysVal).toFixed(2));
                        const hourly = Number((daily / dHours).toFixed(2));
                        setEditingUser({
                          ...editingUser,
                          workDaysPerMonth: daysVal,
                          dailyRate: daily,
                          hourlyRate: hourly
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Hours / Day</label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={editingUser.workHoursPerDay || 8}
                      onChange={(e) => {
                        const hoursVal = parseInt(e.target.value) || 8;
                        const daily = editingUser.dailyRate || Number(((editingUser.baseSalary || 4000) / (editingUser.workDaysPerMonth || 22)).toFixed(2));
                        const hourly = Number((daily / hoursVal).toFixed(2));
                        setEditingUser({
                          ...editingUser,
                          workHoursPerDay: hoursVal,
                          hourlyRate: hourly
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-white p-2.5 rounded-lg border border-indigo-100">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Daily Rate</span>
                    <span className="text-sm font-black text-indigo-700 font-mono">
                      GHS {(editingUser.dailyRate || Number(((editingUser.baseSalary || 4000) / (editingUser.workDaysPerMonth || 22)).toFixed(2))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-center border-l border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Hourly Rate</span>
                    <span className="text-sm font-black text-indigo-700 font-mono">
                      GHS {(editingUser.hourlyRate || Number((Number(((editingUser.baseSalary || 4000) / (editingUser.workDaysPerMonth || 22)).toFixed(2)) / (editingUser.workHoursPerDay || 8)).toFixed(2))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Terminal Security PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editingUser.pin || '1111'}
                    onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Employment Type Selection */}
              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-2">
                <label className="block font-bold text-indigo-950 text-xs">Employment Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'full_time', label: 'Full Time' },
                    { id: 'part_time', label: 'Part Time' },
                    { id: 'probation', label: 'Probation' },
                    { id: 'other', label: 'Other' }
                  ].map(item => (
                    <label 
                      key={item.id}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer text-[11px] font-bold transition-all ${
                        (editingUser.employmentType === item.id || (item.id === 'full_time' && (editingUser.employmentType === 'fulltime' || !editingUser.employmentType)))
                          ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs ring-1 ring-indigo-500' 
                          : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="editEmpType"
                        value={item.id}
                        checked={editingUser.employmentType === item.id || (item.id === 'full_time' && (editingUser.employmentType === 'fulltime' || !editingUser.employmentType))}
                        onChange={() => setEditingUser({ ...editingUser, employmentType: item.id as any })}
                        className="text-indigo-600"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Marital Status Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="editEmployeeMaritalStatus"
                    checked={editingUser.isMarried ?? (editingUser.maritalStatus === 'married')}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEditingUser({
                        ...editingUser,
                        isMarried: checked,
                        maritalStatus: checked ? 'married' : 'single'
                      });
                    }}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="editEmployeeMaritalStatus" className="flex flex-col cursor-pointer select-none">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <span>Marital Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        (editingUser.isMarried ?? (editingUser.maritalStatus === 'married'))
                          ? 'bg-indigo-100 text-indigo-700' 
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {(editingUser.isMarried ?? (editingUser.maritalStatus === 'married')) ? 'Married' : 'Single / Unmarried'}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {(editingUser.isMarried ?? (editingUser.maritalStatus === 'married'))
                        ? 'Staff is marked as married.'
                        : 'Check this box if the employee is married.'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-rose-50/40 p-3.5 rounded-xl border border-rose-100/80 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                  <Phone className="w-3.5 h-3.5 text-rose-600" />
                  <span>Emergency Contact Person</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sister Mercy"
                      value={editingUser.emergencyContactName || editingUser.contactPersonName || ''}
                      onChange={(e) => setEditingUser({
                        ...editingUser,
                        emergencyContactName: e.target.value,
                        contactPersonName: e.target.value
                      })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Relationship</label>
                    <input
                      type="text"
                      placeholder="e.g. Spouse, Sibling"
                      value={editingUser.emergencyContactRelation || editingUser.contactPersonRelation || ''}
                      onChange={(e) => setEditingUser({
                        ...editingUser,
                        emergencyContactRelation: e.target.value,
                        contactPersonRelation: e.target.value
                      })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Emergency Phone</label>
                    <input
                      type="tel"
                      placeholder="+233 24 000 0000"
                      value={editingUser.emergencyContactPhone || editingUser.contactPersonPhone || ''}
                      onChange={(e) => setEditingUser({
                        ...editingUser,
                        emergencyContactPhone: e.target.value,
                        contactPersonPhone: e.target.value
                      })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {onDeleteUser && editingUser.role !== 'ceo' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to permanently delete employee "${editingUser.name}"? This action cannot be undone.`)) {
                        onDeleteUser(editingUser.uid);
                        setEditingUser(null);
                      }
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold transition-all"
                  >
                    Delete Employee
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-all"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
