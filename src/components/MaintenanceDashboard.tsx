import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, 
  Plus, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  UserCheck, 
  Building2, 
  Truck, 
  PlusCircle, 
  RefreshCw, 
  Trash2, 
  Info,
  Calendar,
  AlertCircle,
  FileText
} from 'lucide-react';
import { dataStore } from '../config/firebase';
import { UserProfile, Vendor } from '../types/erp';

interface MaintenanceDashboardProps {
  activeUser: UserProfile;
}

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  location: string;
  reportedBy: string;
  reportedByRole: string;
  dateReported: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'completed';
  ceoApprovalDate?: string;
  ceoRemarks?: string;
  assignedVendorId?: string;
  assignedVendorName?: string;
  estimatedCost?: number;
  dateCompleted?: string;
}

export interface BusinessLicense {
  id: string;
  name: string;
  issuingAuthority: string;
  dateOfIssue: string;
  dateOfExpiration: string;
  renewalCost: number;
  alertDaysBeforeExpiry: number;
  lastRenewedBy?: string;
  status: 'active' | 'expiring_soon' | 'expired';
}

const DEFAULT_MAINTENANCE_REQUESTS: MaintenanceRequest[] = [
  {
    id: 'maint_1',
    title: 'Broken AC Unit in Room 104',
    description: 'Compressor is shorting out. Room is currently unrentable due to heat.',
    priority: 'high',
    location: 'Lodging Guest Rooms (Room 104)',
    reportedBy: 'Kofi Mensah',
    reportedByRole: 'Housekeeping',
    dateReported: '2026-09-23',
    status: 'pending_approval'
  },
  {
    id: 'maint_2',
    title: 'Industrial Sewing Machine Alignment',
    description: 'Juki Machine #4 has needle skipped stitches and belt friction sounds.',
    priority: 'medium',
    location: 'Vocational Sewing Workshop',
    reportedBy: 'Sister Ama Darko',
    reportedByRole: 'Trainer',
    dateReported: '2026-09-24',
    status: 'approved',
    ceoApprovalDate: '2026-09-24',
    ceoRemarks: 'Approved for urgent repair. Using local machine tech.',
    assignedVendorId: 'vendor_1',
    assignedVendorName: 'Global Logistics Corp',
    estimatedCost: 150
  }
];

const DEFAULT_LICENSES: BusinessLicense[] = [
  {
    id: 'lic_1',
    name: 'Ghana Tourism Authority Operating Permit',
    issuingAuthority: 'Ghana Tourism Authority (GTA)',
    dateOfIssue: '2025-10-15',
    dateOfExpiration: '2026-10-15',
    renewalCost: 1500,
    alertDaysBeforeExpiry: 30,
    status: 'active'
  },
  {
    id: 'lic_2',
    name: 'National Fire Safety Compliance Certificate',
    issuingAuthority: 'Ghana National Fire Service (GNFS)',
    dateOfIssue: '2025-09-30',
    dateOfExpiration: '2026-09-30',
    renewalCost: 650,
    alertDaysBeforeExpiry: 15,
    status: 'active'
  },
  {
    id: 'lic_3',
    name: 'Environmental Protection Agency Operating License',
    issuingAuthority: 'Environmental Protection Agency (EPA)',
    dateOfIssue: '2025-05-10',
    dateOfExpiration: '2026-05-10',
    renewalCost: 2200,
    alertDaysBeforeExpiry: 60,
    status: 'expired'
  }
];

export default function MaintenanceDashboard({ activeUser }: MaintenanceDashboardProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>(() => {
    const saved = localStorage.getItem('tumi_maint_requests');
    return saved ? JSON.parse(saved) : DEFAULT_MAINTENANCE_REQUESTS;
  });

  const [licenses, setLicenses] = useState<BusinessLicense[]>(() => {
    const saved = localStorage.getItem('tumi_business_licenses');
    return saved ? JSON.parse(saved) : DEFAULT_LICENSES;
  });

  const [vendors, setVendors] = useState<Vendor[]>(() => dataStore.getVendors());

  // Navigation tab
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'licenses'>('requests');

  // Request category filter
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending_approval' | 'approved' | 'completed' | 'rejected'>('all');

  // Modals
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isNewLicenseModalOpen, setIsNewLicenseModalOpen] = useState(false);

  // New Maintenance Request Form State
  const [reqTitle, setReqTitle] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [reqPriority, setReqPriority] = useState<'low' | 'medium' | 'high' | 'emergency'>('medium');
  const [reqLocation, setReqLocation] = useState('Lodging Guest Rooms');

  // CEO Approval Form State
  const [approvingRequest, setApprovingRequest] = useState<MaintenanceRequest | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [ceoRemarks, setCeoRemarks] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(100);
  
  // Vendor assignment states
  const [vendorAssignmentType, setVendorAssignmentType] = useState<'existing' | 'new'>('existing');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  
  // New Vendor Form State
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorContact, setNewVendorContact] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorCategory, setNewVendorCategory] = useState('Maintenance / Repair Services');

  // New License Form State
  const [licName, setLicName] = useState('');
  const [licAuthority, setLicAuthority] = useState('');
  const [licIssueDate, setLicIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [licExpiryDate, setLicExpiryDate] = useState(new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [licRenewalCost, setLicRenewalCost] = useState<number>(1000);
  const [licAlertDays, setLicAlertDays] = useState<number>(30);

  // Role authentication helper
  const isCeo = activeUser.role === 'ceo' || activeUser.role === 'sysadmin';
  const isManagerOrCeo = isCeo || activeUser.role === 'manager';

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem('tumi_maint_requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('tumi_business_licenses', JSON.stringify(licenses));
  }, [licenses]);

  // Synchronize dynamic updates on local storage vendors
  useEffect(() => {
    const handleVendorsUpdate = () => {
      setVendors(dataStore.getVendors());
    };
    window.addEventListener('tumi_vendors_updated', handleVendorsUpdate);
    return () => {
      window.removeEventListener('tumi_vendors_updated', handleVendorsUpdate);
    };
  }, []);

  // Compute live compliance status of business licenses/certifications
  const processedLicenses = useMemo(() => {
    const today = new Date();
    return licenses.map(lic => {
      const expiry = new Date(lic.dateOfExpiration);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let status: 'active' | 'expiring_soon' | 'expired' = 'active';
      if (diffDays <= 0) {
        status = 'expired';
      } else if (diffDays <= lic.alertDaysBeforeExpiry) {
        status = 'expiring_soon';
      }
      
      return {
        ...lic,
        daysRemaining: diffDays,
        status
      };
    });
  }, [licenses]);

  // Filters
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (requestFilter === 'all') return true;
      return r.status === requestFilter;
    });
  }, [requests, requestFilter]);

  // Number of active expiration alerts for notifications dashboard banner
  const activeExpiryAlerts = useMemo(() => {
    return processedLicenses.filter(l => l.status === 'expired' || l.status === 'expiring_soon');
  }, [processedLicenses]);

  // Submit new request
  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !reqDescription.trim()) return;

    const newReq: MaintenanceRequest = {
      id: 'maint_' + Date.now(),
      title: reqTitle,
      description: reqDescription,
      priority: reqPriority,
      location: reqLocation,
      reportedBy: activeUser.name,
      reportedByRole: activeUser.role,
      dateReported: new Date().toISOString().slice(0, 10),
      status: 'pending_approval'
    };

    setRequests([newReq, ...requests]);
    setIsNewRequestModalOpen(false);
    setReqTitle('');
    setReqDescription('');
    setReqPriority('medium');
  };

  // Trigger Approval Modal
  const handleOpenApproval = (req: MaintenanceRequest) => {
    setApprovingRequest(req);
    setCeoRemarks('');
    setEstimatedCost(100);
    setVendorAssignmentType('existing');
    setSelectedVendorId(vendors[0]?.id || '');
    setNewVendorName('');
    setNewVendorContact('');
    setNewVendorEmail('');
    setNewVendorPhone('');
    setIsApprovalModalOpen(true);
  };

  // Submit CEO Approval Action
  const handleSaveApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingRequest) return;

    let vendorId = selectedVendorId;
    let vendorName = '';

    if (approvalAction === 'approve') {
      // Create and append a brand new vendor if requested!
      if (vendorAssignmentType === 'new') {
        if (!newVendorName.trim()) {
          alert('Please enter a service provider name.');
          return;
        }
        const freshVendorId = 'vendor_' + Date.now();
        const freshVendor: Vendor = {
          id: freshVendorId,
          name: newVendorName.trim(),
          contactName: newVendorContact.trim() || 'Tech Contact',
          email: newVendorEmail.trim() || 'info@provider.com',
          phone: newVendorPhone.trim() || '+233 24 000 0000',
          category: newVendorCategory,
          leadTimeDays: 3
        };

        const updatedVendors = [...vendors, freshVendor];
        dataStore.saveVendors(updatedVendors);
        setVendors(updatedVendors);
        window.dispatchEvent(new Event('tumi_vendors_updated'));
        
        vendorId = freshVendorId;
        vendorName = newVendorName.trim();
      } else {
        const found = vendors.find(v => v.id === selectedVendorId);
        vendorName = found ? found.name : 'Preferred Service Tech';
      }
    }

    const updated = requests.map(r => {
      if (r.id !== approvingRequest.id) return r;
      return {
        ...r,
        status: approvalAction === 'approve' ? ('approved' as const) : ('rejected' as const),
        ceoRemarks,
        ceoApprovalDate: new Date().toISOString().slice(0, 10),
        assignedVendorId: approvalAction === 'approve' ? vendorId : undefined,
        assignedVendorName: approvalAction === 'approve' ? vendorName : undefined,
        estimatedCost: approvalAction === 'approve' ? estimatedCost : undefined
      };
    });

    setRequests(updated);
    setIsApprovalModalOpen(false);
    setApprovingRequest(null);
  };

  // Mark request as Completed / Fixed
  const handleMarkCompleted = (reqId: string) => {
    const updated = requests.map(r => {
      if (r.id !== reqId) return r;
      return {
        ...r,
        status: 'completed' as const,
        dateCompleted: new Date().toISOString().slice(0, 10)
      };
    });
    setRequests(updated);
  };

  // Submit New Certification / Business License
  const handleAddLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licName.trim() || !licAuthority.trim()) return;

    const newLic: BusinessLicense = {
      id: 'lic_' + Date.now(),
      name: licName.trim(),
      issuingAuthority: licAuthority.trim(),
      dateOfIssue: licIssueDate,
      dateOfExpiration: licExpiryDate,
      renewalCost: licRenewalCost,
      alertDaysBeforeExpiry: licAlertDays,
      status: 'active'
    };

    setLicenses([newLic, ...licenses]);
    setIsNewLicenseModalOpen(false);
    setLicName('');
    setLicAuthority('');
    setLicRenewalCost(1000);
  };

  // Fast Yearly Renewal Handler (Increments expiration by 1 year)
  const handleRenewLicense = (id: string) => {
    const updated = licenses.map(l => {
      if (l.id !== id) return l;
      
      const prevExpiry = new Date(l.dateOfExpiration);
      prevExpiry.setFullYear(prevExpiry.getFullYear() + 1);
      const newExpiryStr = prevExpiry.toISOString().slice(0, 10);
      
      return {
        ...l,
        dateOfIssue: new Date().toISOString().slice(0, 10),
        dateOfExpiration: newExpiryStr,
        lastRenewedBy: `${activeUser.name} (${activeUser.role.toUpperCase()})`
      };
    });
    setLicenses(updated);
    alert(`Successfully renewed permit! Expiration period rolled forward 1 year.`);
  };

  // Delete License
  const handleDeleteLicense = (id: string) => {
    if (!window.confirm('Are you sure you want to remove this licensing record?')) return;
    setLicenses(licenses.filter(l => l.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold flex items-center justify-center">
            <Wrench className="w-5.5 h-5.5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Maintenance, Vendors & Compliance Renewals</h1>
            <p className="text-xs text-slate-500">
              CEO audit queues, real-time maintenance requests, provider integrations & annual licensing calendars.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveSubTab('requests')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'requests' 
                  ? 'bg-white text-indigo-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🛠 Maintenance Jobs Queue ({requests.length})
            </button>
            <button
              onClick={() => setActiveSubTab('licenses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'licenses' 
                  ? 'bg-white text-indigo-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📜 Regulatory Compliance & Licences ({licenses.length})
            </button>
          </div>
        </div>
      </div>

      {/* Expiry Alarm Warning banner if any permits are expired or expiring soon */}
      {activeExpiryAlerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center gap-3.5 shadow-sm animate-pulse">
          <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
          <div className="flex-1">
            <h3 className="text-xs font-black text-red-950 uppercase tracking-wide">Impending Regulatory Expiration Alert!</h3>
            <p className="text-[11px] text-red-800">
              There are {activeExpiryAlerts.length} certification(s) / business operating permits that are expired or expiring within their lead alert threshold. Please renew immediately to avoid statutory sanctions.
            </p>
          </div>
          <button 
            onClick={() => setActiveSubTab('licenses')} 
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] uppercase font-bold transition-all"
          >
            Review Calendar
          </button>
        </div>
      )}

      {/* SUB-TAB 1: MAINTENANCE REQUESTS GRID */}
      {activeSubTab === 'requests' && (
        <div className="space-y-5">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Requests Filed</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{requests.length}</p>
              <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">Asset health logging</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Awaiting CEO Sign-Off</span>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {requests.filter(r => r.status === 'pending_approval').length}
              </p>
              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">Unapproved tasks</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">In-Progress Repairs</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">
                {requests.filter(r => r.status === 'approved').length}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Assigned to active providers</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Completed Repairs</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {requests.filter(r => r.status === 'completed').length}
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Assets resolved successfully</span>
            </div>
          </div>

          {/* Filtering and Launch Request Trigger */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-3xs">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-bold">Filter By Status:</span>
              <div className="flex flex-wrap gap-1">
                {['all', 'pending_approval', 'approved', 'completed', 'rejected'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setRequestFilter(cat as any)}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase border transition-all ${
                      requestFilter === cat 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-3xs' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsNewRequestModalOpen(true)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Report Maintenance Issue</span>
            </button>
          </div>

          {/* Requests Queue Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.length === 0 ? (
              <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 italic">
                No maintenance requests matching the chosen status category.
              </div>
            ) : (
              filteredRequests.map(req => {
                const isPending = req.status === 'pending_approval';
                const isActive = req.status === 'approved';
                const isDone = req.status === 'completed';

                return (
                  <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-3.5 relative flex flex-col justify-between">
                    <div>
                      {/* Priority and Status Badges */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          req.priority === 'emergency' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                          req.priority === 'high' ? 'bg-rose-50 text-rose-700' :
                          req.priority === 'medium' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {req.priority} Priority
                        </span>

                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
                          isPending ? 'bg-amber-50 border-amber-300 text-amber-800' :
                          isActive ? 'bg-indigo-50 border-indigo-300 text-indigo-800' :
                          isDone ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                          'bg-slate-50 border-slate-200 text-slate-500'
                        }`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Header and Desc */}
                      <div className="mt-2.5">
                        <h3 className="font-extrabold text-slate-900 text-sm">{req.title}</h3>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{req.description}</p>
                      </div>

                      {/* Diagnostic details */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100/80 text-[10px] font-semibold text-slate-600 mt-3.5">
                        <p>📍 Location: <strong className="text-slate-800">{req.location}</strong></p>
                        <p>👤 Reported: <strong className="text-slate-800">{req.reportedBy} ({req.reportedByRole})</strong></p>
                        <p>📅 Reported On: <strong className="text-slate-800">{req.dateReported}</strong></p>
                        {req.estimatedCost && <p>💰 Estimate: <strong className="text-slate-800">GHS {req.estimatedCost}</strong></p>}
                      </div>

                      {/* CEO/Vendor specific details */}
                      {(req.ceoRemarks || req.assignedVendorName) && (
                        <div className="mt-3.5 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-1.5 text-[10px]">
                          {req.ceoRemarks && (
                            <p className="text-slate-700 font-medium">
                              ✍️ <strong className="text-slate-900">CEO Remarks:</strong> "{req.ceoRemarks}"
                            </p>
                          )}
                          {req.assignedVendorName && (
                            <p className="text-indigo-950 font-bold flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-indigo-700" />
                              <span>Service Tech: {req.assignedVendorName}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Operational triggers */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                      {isPending && isManagerOrCeo && (
                        <button
                          onClick={() => handleOpenApproval(req)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] uppercase font-bold transition-all shadow-xs"
                        >
                          Review & Sign-Off (CEO / Manager)
                        </button>
                      )}

                      {isActive && (
                        <button
                          onClick={() => handleMarkCompleted(req.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] uppercase font-bold transition-all shadow-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Fixed & Closed</span>
                        </button>
                      )}

                      {isDone && (
                        <p className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Fully Resolved on {req.dateCompleted}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REGULATORY OPERATING PERMITS renewal */}
      {activeSubTab === 'licenses' && (
        <div className="space-y-5">
          {/* Launch Trigger Row */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-3xs">
            <div>
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Ghana Annual Certifications Calendar</h3>
              <p className="text-[10px] text-slate-400">Add operating permits, fire certs, tourism boards and trigger notifications.</p>
            </div>
            {isManagerOrCeo && (
              <button
                onClick={() => setIsNewLicenseModalOpen(true)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Input Operating Permit / License</span>
              </button>
            )}
          </div>

          {/* Licenses Listing Matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Certification / Operating Licence</th>
                    <th className="py-3 px-4">Authority Agency</th>
                    <th className="py-3 px-4">Issue & Expiry Dates</th>
                    <th className="py-3 px-4 text-center">Days to Expiration</th>
                    <th className="py-3 px-4">Renewal Cost</th>
                    <th className="py-3 px-4">Status Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {processedLicenses.map(lic => {
                    const isOverdue = lic.status === 'expired';
                    const isWarning = lic.status === 'expiring_soon';

                    return (
                      <tr key={lic.id} className={`hover:bg-slate-50/50 transition-colors ${isOverdue ? 'bg-red-50/30' : isWarning ? 'bg-amber-50/30' : ''}`}>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className={`p-1 rounded ${isOverdue ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              <FileText className="w-4 h-4" />
                            </span>
                            <div>
                              <span>{lic.name}</span>
                              {lic.lastRenewedBy && (
                                <span className="block text-[9px] text-emerald-600 mt-0.5">Last renewed: {lic.lastRenewedBy}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-600">{lic.issuingAuthority}</td>

                        <td className="py-3.5 px-4 font-mono font-medium text-[11px]">
                          <span className="text-slate-500">Issued: {lic.dateOfIssue}</span>
                          <span className="block text-slate-800 font-bold">Expires: {lic.dateOfExpiration}</span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isOverdue ? (
                            <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-black animate-pulse">OVERDUE</span>
                          ) : (
                            <span className={`font-black font-mono text-sm ${isWarning ? 'text-amber-600 animate-pulse' : 'text-slate-800'}`}>
                              {lic.daysRemaining} days left
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-black text-slate-800">
                          GHS {lic.renewalCost.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border inline-flex items-center gap-1 ${
                            isOverdue ? 'bg-red-100 border-red-300 text-red-800' :
                            isWarning ? 'bg-amber-100 border-amber-300 text-amber-800' :
                            'bg-emerald-100 border-emerald-300 text-emerald-800'
                          }`}>
                            {isOverdue && <AlertCircle className="w-3 h-3 text-red-700 animate-spin" />}
                            <span>{lic.status.replace('_', ' ')}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isManagerOrCeo && (
                              <button
                                onClick={() => handleRenewLicense(lic.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition-all uppercase flex items-center gap-1 shadow-xs"
                                title="Rollover expiration by +1 year and record payment"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Renew</span>
                              </button>
                            )}

                            {isCeo && (
                              <button
                                onClick={() => handleDeleteLicense(lic.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Remove License Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: REPORT NEW MAINTENANCE REQUEST */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Report Asset Maintenance Issue</h3>
                <p className="text-xs text-slate-500">Details are routed directly to CEO approval queue.</p>
              </div>
              <button onClick={() => setIsNewRequestModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Issue / Maintenance Title *</label>
                <input
                  type="text"
                  required
                  value={reqTitle}
                  onChange={e => setReqTitle(e.target.value)}
                  placeholder="e.g. Broken AC Compressor Room 104"
                  className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Problem Description / Details *</label>
                <textarea
                  required
                  rows={3}
                  value={reqDescription}
                  onChange={e => setReqDescription(e.target.value)}
                  placeholder="Provide precise details of the breakdown, skipped stitches, leakages, or damage..."
                  className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Priority Classification</label>
                  <select
                    value={reqPriority}
                    onChange={e => setReqPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-900"
                  >
                    <option value="low">Low Priority (Minor Wear)</option>
                    <option value="medium">Medium Priority (Standard Repair)</option>
                    <option value="high">High Priority (Affects Renting / Operations)</option>
                    <option value="emergency">Emergency (Immediate Intervention)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Asset Location *</label>
                  <select
                    value={reqLocation}
                    onChange={e => setReqLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-900"
                  >
                    <option value="Lodging Guest Rooms">Lodging Guest Rooms</option>
                    <option value="Vocational Sewing Workshop">Vocational Sewing Workshop</option>
                    <option value="Hostel Kitchen & Catering">Hostel Kitchen & Catering</option>
                    <option value="Front Reception Lobby">Front Desk Lobby</option>
                    <option value="General Admin Offices">General Admin Offices</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CEO / MANAGER APPROVAL SIGN-OFF MODAL & PROVIDER REGISTER */}
      {isApprovalModalOpen && approvingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">CEO & Management Maintenance Sign-Off</h3>
                <p className="text-xs text-slate-500">Approve repairs, authorize budget & register service provider info.</p>
              </div>
              <button onClick={() => setIsApprovalModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveApproval} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-800 text-xs">Job Request: {approvingRequest.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{approvingRequest.description}</p>
              </div>

              {/* Action Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Approval Decision</label>
                  <select
                    value={approvalAction}
                    onChange={e => setApprovalAction(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-900"
                  >
                    <option value="approve">✓ Authorize and Assign Job</option>
                    <option value="reject">✕ Decline Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Approved Estimated Budget *</label>
                  <input
                    type="number"
                    required
                    value={estimatedCost}
                    onChange={e => setEstimatedCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-900"
                    disabled={approvalAction === 'reject'}
                  />
                </div>
              </div>

              {/* SERVICE PROVIDER DETAILS INTEGRATION FOR THE VENDOR LIST */}
              {approvalAction === 'approve' && (
                <div className="border-t border-slate-200 pt-3 space-y-3">
                  <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <span>Assign Service Provider & Sync to Vendors</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="vendorOption"
                        checked={vendorAssignmentType === 'existing'}
                        onChange={() => setVendorAssignmentType('existing')}
                      />
                      <span className="font-bold">Choose Registered Vendor</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="vendorOption"
                        checked={vendorAssignmentType === 'new'}
                        onChange={() => setVendorAssignmentType('new')}
                      />
                      <span className="font-bold">Register Brand New Tech</span>
                    </label>
                  </div>

                  {vendorAssignmentType === 'existing' ? (
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Choose Service Provider</label>
                      <select
                        value={selectedVendorId}
                        onChange={e => setSelectedVendorId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold"
                      >
                        {vendors.length === 0 && <option value="">No vendors found. Please add new.</option>}
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    /* ADD BRAND NEW VENDOR FIELDS WHICH SAVE DIRECTLY TO ERP SANDBOX VENDORS */
                    <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2.5">
                      <span className="text-[10px] uppercase font-black text-indigo-900 block tracking-wide">
                        📝 Provider CRM details (Will append to procurement vendor list)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-600 font-bold mb-0.5">Company Name *</label>
                          <input
                            type="text"
                            required
                            value={newVendorName}
                            onChange={e => setNewVendorName(e.target.value)}
                            placeholder="e.g. Accra AC Experts"
                            className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-0.5">Contact Person Name</label>
                          <input
                            type="text"
                            value={newVendorContact}
                            onChange={e => setNewVendorContact(e.target.value)}
                            placeholder="e.g. Patrick Yeboah"
                            className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-600 font-bold mb-0.5">Email Address</label>
                          <input
                            type="email"
                            value={newVendorEmail}
                            onChange={e => setNewVendorEmail(e.target.value)}
                            placeholder="pat@acexperts.com"
                            className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-0.5">Phone Number *</label>
                          <input
                            type="tel"
                            required
                            value={newVendorPhone}
                            onChange={e => setNewVendorPhone(e.target.value)}
                            placeholder="+233 24 555 9012"
                            className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-0.5">Service Category</label>
                        <select
                          value={newVendorCategory}
                          onChange={e => setNewVendorCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-semibold text-slate-700"
                        >
                          <option value="Facilities Maintenance & AC">AC & Refrigeration Services</option>
                          <option value="Mechanical & Workshop Repairs">Mechanical / Machine Repairs</option>
                          <option value="Electrical Supplies & Services">Electrical Work</option>
                          <option value="Catering Equipment Maintenance">Kitchen Services</option>
                          <option value="Safety & Fire Compliance">GNFS Fire Safety Services</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Approval Sign-off Remarks</label>
                <input
                  type="text"
                  value={ceoRemarks}
                  onChange={e => setCeoRemarks(e.target.value)}
                  placeholder="e.g. Approved. Funds released via petty cash."
                  className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs"
                />
              </div>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INPUT REGULATORY CERTIFICATE OR COMPLIANCE OPERATING LICENSE */}
      {isNewLicenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Register Annual Certification / License</h3>
                <p className="text-xs text-slate-500">Track expirations, lead times & renewal notifications.</p>
              </div>
              <button onClick={() => setIsNewLicenseModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLicense} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Permit / Certification Name *</label>
                <input
                  type="text"
                  required
                  value={licName}
                  onChange={e => setLicName(e.target.value)}
                  placeholder="e.g. GTA Tourism Operating Licence"
                  className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Issuing Regulatory Authority *</label>
                <input
                  type="text"
                  required
                  value={licAuthority}
                  onChange={e => setLicAuthority(e.target.value)}
                  placeholder="e.g. Ghana Tourism Authority"
                  className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={licIssueDate}
                    onChange={e => setLicIssueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Expiration Date (Annual) *</label>
                  <input
                    type="date"
                    required
                    value={licExpiryDate}
                    onChange={e => setLicExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Yearly Renewal Cost (GHS) *</label>
                  <input
                    type="number"
                    required
                    value={licRenewalCost}
                    onChange={e => setLicRenewalCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Expiry Alert Days Prior *</label>
                  <input
                    type="number"
                    required
                    value={licAlertDays}
                    onChange={e => setLicAlertDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewLicenseModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Add Certification Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
