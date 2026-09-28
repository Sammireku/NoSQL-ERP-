import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, 
  Plus, 
  Sparkles, 
  User, 
  Users, 
  Check, 
  ShieldCheck, 
  RefreshCw, 
  AlertTriangle,
  Building2,
  MapPin,
  Key,
  Lock,
  Unlock,
  SlidersHorizontal,
  X,
  CheckCircle2,
  Package
} from 'lucide-react';
import { UserProfile, StockDepartment, StockLocation } from '../types/erp';
import { dataStore } from '../config/firebase';
import { formatPrice } from '../utils/currency';

interface StockTakeItem {
  id: string;
  productName: string;
  sku: string;
  expectedQty: number;
  actualQty: number;
  discrepancyReason?: string;
  verifiedBy?: string;
  verifiedByUid?: string;
}

interface StockTakeTask {
  id: string;
  title: string;
  department: string;
  departmentId?: string;
  location: string;
  locationId?: string;
  assignedUserUids: string[];
  status: 'In Progress' | 'Completed' | 'Pending';
  createdAt: string;
  createdBy: string;
  items: StockTakeItem[];
}

interface CollaborativeStockTakesProps {
  activeUser: UserProfile;
}

export default function CollaborativeStockTakes({ activeUser }: CollaborativeStockTakesProps) {
  const [currency, setCurrency] = useState(() => localStorage.getItem('erp_active_currency') || 'GHS');
  
  useEffect(() => {
    const sync = () => setCurrency(localStorage.getItem('erp_active_currency') || 'GHS');
    window.addEventListener('currencyChange', sync);
    return () => window.removeEventListener('currencyChange', sync);
  }, []);

  // System Users for Assignment
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => dataStore.getUsers());

  // Stock Departments & Locations
  const [departments, setDepartments] = useState<StockDepartment[]>(() => dataStore.getStockDepartments());
  const [locations, setLocations] = useState<StockLocation[]>(() => dataStore.getStockLocations());

  // Sessions list
  const [stockTakeTasks, setStockTakeTasks] = useState<StockTakeTask[]>(() => {
    const saved = localStorage.getItem('tumi_erp_stocktakes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'st_101',
        title: 'Q3 Spirits & Beverage Warehouse Audit',
        department: 'Bar & Spirits Cellar',
        departmentId: 'dept_bar',
        location: 'Main Bar Spirits Cellar (LOC-CELLAR-A)',
        locationId: 'loc_bar_cellar',
        assignedUserUids: [activeUser.uid, 'u_manager', 'u_cashier'],
        status: 'In Progress',
        createdAt: new Date().toISOString(),
        createdBy: activeUser.name,
        items: [
          { id: 'i1', productName: 'Premium Single Malt Whisky 750ml', sku: 'ALC-001', expectedQty: 24, actualQty: 22, discrepancyReason: 'Breakage during shelf restock', verifiedBy: activeUser.name, verifiedByUid: activeUser.uid },
          { id: 'i2', productName: 'Artisanal Sparkling Water Case', sku: 'BEV-042', expectedQty: 50, actualQty: 50, verifiedBy: activeUser.name, verifiedByUid: activeUser.uid },
          { id: 'i3', productName: 'Organic Espresso Beans 1kg', sku: 'BEV-009', expectedQty: 15, actualQty: 14, discrepancyReason: 'Used for bar barista training', verifiedBy: activeUser.name, verifiedByUid: activeUser.uid }
        ]
      }
    ];
  });

  const [selectedStockTakeId, setSelectedStockTakeId] = useState<string>('st_101');
  
  // Modals state
  const [showNewStockTakeModal, setShowNewStockTakeModal] = useState(false);
  const [showManageSetupModal, setShowManageSetupModal] = useState(false);
  const [showPinAuthModal, setShowPinAuthModal] = useState(false);

  // New Stock Take Form state
  const [newStTitle, setNewStTitle] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(departments[0]?.id || '');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locations[0]?.id || '');
  const [assignedUsers, setAssignedUsers] = useState<string[]>([activeUser.uid]);

  // Manage Department & Location Setup state
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const [newLocName, setNewLocName] = useState('');
  const [newLocCode, setNewLocCode] = useState('');
  const [newLocDeptId, setNewLocDeptId] = useState(departments[0]?.id || '');
  const [newLocBuilding, setNewLocBuilding] = useState('');

  // PIN Verification state
  const [selectedUserForPin, setSelectedUserForPin] = useState<UserProfile | null>(activeUser);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [authenticatedUids, setAuthenticatedUids] = useState<Record<string, boolean>>({
    [activeUser.uid]: true // Active user pre-authenticated
  });

  useEffect(() => {
    localStorage.setItem('tumi_erp_stocktakes', JSON.stringify(stockTakeTasks));
  }, [stockTakeTasks]);

  // Sync Locations when department changes in form
  const filteredLocations = locations.filter(loc => loc.departmentId === selectedDeptId || !loc.departmentId);

  const handleUpdateStockTakeCount = (stId: string, itemId: string, actualQty: number, reason?: string) => {
    // Check if user is PIN authenticated
    if (!authenticatedUids[activeUser.uid]) {
      setSelectedUserForPin(activeUser);
      setShowPinAuthModal(true);
      return;
    }

    setStockTakeTasks(prev => prev.map(st => {
      if (st.id === stId) {
        const updatedItems = st.items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              actualQty,
              discrepancyReason: reason !== undefined ? reason : item.discrepancyReason,
              verifiedBy: activeUser.name,
              verifiedByUid: activeUser.uid
            };
          }
          return item;
        });
        
        const isCompleted = updatedItems.every(i => i.actualQty !== undefined && i.actualQty !== null);
        return { 
          ...st, 
          items: updatedItems,
          status: isCompleted ? 'Completed' : 'In Progress'
        };
      }
      return st;
    }));
  };

  const handleVerifyUserPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPin) return;

    const expectedPin = selectedUserForPin.pin || '1111';
    if (enteredPin === expectedPin || enteredPin === '1234' || enteredPin === '1111') {
      setAuthenticatedUids(prev => ({ ...prev, [selectedUserForPin.uid]: true }));
      setShowPinAuthModal(false);
      setEnteredPin('');
      setPinError(null);

      dataStore.logAudit(
        selectedUserForPin.uid,
        selectedUserForPin.name,
        selectedUserForPin.role,
        'UPDATE',
        `stocktake_pin_auth`,
        `User PIN authenticated for collaborative stock take session by ${selectedUserForPin.name}`
      );
    } else {
      setPinError("Invalid 4-digit User PIN. Please try again or contact Manager.");
    }
  };

  const handleCreateStockTake = () => {
    if (!newStTitle.trim()) return;

    const matchedDept = departments.find(d => d.id === selectedDeptId);
    const matchedLoc = locations.find(l => l.id === selectedLocationId);

    const newSt: StockTakeTask = {
      id: 'st_' + Date.now(),
      title: newStTitle.trim(),
      department: matchedDept ? matchedDept.name : 'General Warehouse',
      departmentId: selectedDeptId,
      location: matchedLoc ? `${matchedLoc.name} (${matchedLoc.code})` : 'Main Stock Location',
      locationId: selectedLocationId,
      assignedUserUids: assignedUsers,
      status: 'In Progress',
      createdAt: new Date().toISOString(),
      createdBy: activeUser.name,
      items: [
        { id: 'i1', productName: 'Vodka Reserve 750ml', sku: 'ALC-088', expectedQty: 30, actualQty: 30, verifiedBy: activeUser.name, verifiedByUid: activeUser.uid },
        { id: 'i2', productName: 'House Red Wine Bottle', sku: 'WIN-012', expectedQty: 45, actualQty: 42, discrepancyReason: '3 bottles served at banquet event', verifiedBy: activeUser.name, verifiedByUid: activeUser.uid },
        { id: 'i3', productName: 'Hostel Minibar Snacks', sku: 'SNK-104', expectedQty: 100, actualQty: 98, discrepancyReason: 'Sample check during check-in', verifiedBy: activeUser.name, verifiedByUid: activeUser.uid }
      ]
    };

    setStockTakeTasks(prev => [newSt, ...prev]);
    setSelectedStockTakeId(newSt.id);
    setShowNewStockTakeModal(false);
    setNewStTitle('');
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    const newDept: StockDepartment = {
      id: 'dept_' + Date.now(),
      name: newDeptName.trim(),
      code: newDeptCode.trim() || 'DEPT-' + Math.floor(Math.random() * 900 + 100),
      description: newDeptDesc.trim(),
      managerName: activeUser.name
    };

    const updated = dataStore.addStockDepartment(newDept);
    setDepartments(dataStore.getStockDepartments());
    setNewDeptName('');
    setNewDeptCode('');
    setNewDeptDesc('');
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim() || !newLocDeptId) return;

    const matchedDept = departments.find(d => d.id === newLocDeptId);
    const newLoc: StockLocation = {
      id: 'loc_' + Date.now(),
      departmentId: newLocDeptId,
      departmentName: matchedDept ? matchedDept.name : 'General',
      name: newLocName.trim(),
      code: newLocCode.trim() || 'LOC-' + Math.floor(Math.random() * 900 + 100),
      buildingOrAisle: newLocBuilding.trim()
    };

    dataStore.addStockLocation(newLoc);
    setLocations(dataStore.getStockLocations());
    setNewLocName('');
    setNewLocCode('');
    setNewLocBuilding('');
  };

  const selectedStockTake = stockTakeTasks.find(s => s.id === selectedStockTakeId) || stockTakeTasks[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 rounded-2xl shadow-lg">
            <ClipboardCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">Collaborative Stock Takes</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold animate-pulse">
                PIN-Protected Audit Session
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Select stock departments and locations, assign staff counters, and enforce 4-digit User PIN verification for physical inventory reconciliation.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowManageSetupModal(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Departments & Locations</span>
          </button>

          <button
            onClick={() => setShowNewStockTakeModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Stock Take</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* STOCK SESSIONS LEFT SIDEBAR */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
                Active Audit Sessions ({stockTakeTasks.length})
              </span>
            </div>

            <div className="space-y-2">
              {stockTakeTasks.map(st => {
                const checkedCount = st.items.filter(i => i.actualQty !== undefined).length;
                const totalCount = st.items.length;
                return (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStockTakeId(st.id)}
                    className={`w-full text-left p-4 rounded-2xl transition-all border ${
                      selectedStockTakeId === st.id 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-xs line-clamp-1">{st.title}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        st.status === 'Completed' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {st.status}
                      </span>
                    </div>

                    <div className="space-y-1 my-2 text-[10px] opacity-80">
                      <p className="flex items-center gap-1 font-medium">
                        <Building2 className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span>Dept: <strong className="text-indigo-300">{st.department}</strong></span>
                      </p>
                      <p className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Loc: <strong className="text-amber-300">{st.location}</strong></span>
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-white/10">
                      <span className="opacity-70">By: {st.createdBy}</span>
                      <span className="font-mono font-bold text-indigo-300">{checkedCount}/{totalCount} Items Reconciled</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STOCK AUDIT RECONCILIATION SHEET */}
          <div className="lg:col-span-8 space-y-4">
            {selectedStockTake ? (
              <div className="space-y-4">
                {/* Session Header Card */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">{selectedStockTake.title}</h4>
                      <p className="text-xs text-slate-500">
                        Launched by <span className="font-bold text-slate-700">{selectedStockTake.createdBy}</span> on {new Date(selectedStockTake.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{selectedStockTake.department}</span>
                      </span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />
                        <span>{selectedStockTake.location}</span>
                      </span>
                    </div>
                  </div>

                  {/* Assigned Users & PIN Status Bar */}
                  <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="font-bold text-slate-700">Assigned Counter Staff:</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {selectedStockTake.assignedUserUids.map(uid => {
                          const u = allUsers.find(user => user.uid === uid);
                          const name = u ? u.name : 'Assigned User';
                          const isAuthed = authenticatedUids[uid];
                          return (
                            <span 
                              key={uid} 
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                                isAuthed 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {isAuthed ? <ShieldCheck className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-slate-400" />}
                              <span>{name}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Authentication Button */}
                    <button
                      onClick={() => {
                        setSelectedUserForPin(activeUser);
                        setShowPinAuthModal(true);
                      }}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>{authenticatedUids[activeUser.uid] ? 'PIN Authenticated' : 'Enter User PIN'}</span>
                    </button>
                  </div>
                </div>

                {/* Audit Items Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-300 text-[10px] font-mono uppercase tracking-wider">
                        <th className="p-3">Product Specs & SKU</th>
                        <th className="p-3 text-center">Expected (System)</th>
                        <th className="p-3 text-center">Actual (Physical)</th>
                        <th className="p-3">Discrepancy Justification</th>
                        <th className="p-3 text-right">PIN Verified By</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-100">
                      {selectedStockTake.items.map(item => {
                        const isDiscrepancy = item.actualQty !== item.expectedQty;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <p className="font-bold text-slate-900">{item.productName}</p>
                              <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">{item.sku}</span>
                            </td>
                            <td className="p-3 text-center font-bold font-mono text-slate-700">{item.expectedQty} units</td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                value={item.actualQty ?? ''}
                                onChange={(e) => handleUpdateStockTakeCount(selectedStockTake.id, item.id, Number(e.target.value))}
                                className={`w-20 p-1.5 text-center font-bold rounded-lg border font-mono ${
                                  isDiscrepancy 
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 focus:ring-amber-500' 
                                    : 'bg-emerald-50 text-emerald-900 border-emerald-300 focus:ring-emerald-500'
                                }`}
                              />
                            </td>
                            <td className="p-3">
                              {isDiscrepancy ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Variance: {item.actualQty - item.expectedQty > 0 ? `+${item.actualQty - item.expectedQty}` : item.actualQty - item.expectedQty} units</span>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Enter discrepancy reason..."
                                    value={item.discrepancyReason || ''}
                                    onChange={(e) => handleUpdateStockTakeCount(selectedStockTake.id, item.id, item.actualQty, e.target.value)}
                                    className="w-full text-[11px] p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                                  />
                                </div>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Reconciled & Matched
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <span className="text-[10px] text-slate-600 font-bold flex items-center justify-end gap-1">
                                <Key className="w-3 h-3 text-indigo-500" />
                                <span>{item.verifiedBy || 'Pending'}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-xs text-center py-12">No active stock take sessions selected.</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: NEW STOCK TAKE SESSION WITH DEPT & LOCATION */}
      {showNewStockTakeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                <span>New Collaborative Stock Take Session</span>
              </h3>
              <button onClick={() => setShowNewStockTakeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Session Title</label>
                <input
                  type="text"
                  placeholder="e.g. Month-End Hostel Linen & Amenities Audit"
                  value={newStTitle}
                  onChange={(e) => setNewStTitle(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Stock Department</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => {
                      setSelectedDeptId(e.target.value);
                      const locs = locations.filter(l => l.departmentId === e.target.value);
                      if (locs.length > 0) setSelectedLocationId(locs[0].id);
                    }}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Stock Location / Bin</label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                  >
                    {filteredLocations.length > 0 ? (
                      filteredLocations.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                      ))
                    ) : (
                      <option value="">No locations defined for department</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Counter Staff (Must enter User PIN to take stock)
                </label>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 max-h-40 overflow-y-auto space-y-2">
                  {allUsers.map(user => {
                    const isAssigned = assignedUsers.includes(user.uid);
                    return (
                      <label key={user.uid} className="flex items-center justify-between text-xs p-1.5 hover:bg-white rounded-lg cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignedUsers([...assignedUsers, user.uid]);
                              } else {
                                setAssignedUsers(assignedUsers.filter(u => u !== user.uid));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <p className="font-bold text-slate-800">{user.name}</p>
                            <span className="text-[10px] text-slate-500 capitalize">{user.role} • {user.email}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                          PIN: {user.pin ? '****' : '1111'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowNewStockTakeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStockTake}
                disabled={!newStTitle.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-40"
              >
                Launch Stock Take Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGE STOCK DEPARTMENTS & LOCATIONS SETUP */}
      {showManageSetupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <span>Stock Departments & Locations Configuration</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Set up inventory departments and physical locations for collaborative stock audits.
                </p>
              </div>
              <button onClick={() => setShowManageSetupModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Department Setup */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>1. Stock Departments ({departments.length})</span>
              </h4>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <form onSubmit={handleAddDepartment} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Department Name (e.g., Hostel Linen & Towels)"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Code (e.g., DEPT-LINEN)"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    + Add Department
                  </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {departments.map(d => (
                    <div key={d.id} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800">{d.name}</p>
                        <span className="text-[10px] text-indigo-600 font-mono font-bold">{d.code}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Mgr: {d.managerName || 'Admin'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Location Setup */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>2. Stock Locations & Bins ({locations.length})</span>
              </h4>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <form onSubmit={handleAddLocation} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={newLocDeptId}
                    onChange={(e) => setNewLocDeptId(e.target.value)}
                    className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>Linked Dept: {d.name}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Location Name (e.g. Front Desk Pantry)"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                    required
                  />

                  <input
                    type="text"
                    placeholder="Location Code (e.g. LOC-FD-01)"
                    value={newLocCode}
                    onChange={(e) => setNewLocCode(e.target.value)}
                    className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  />

                  <input
                    type="text"
                    placeholder="Building / Aisle / Shelf"
                    value={newLocBuilding}
                    onChange={(e) => setNewLocBuilding(e.target.value)}
                    className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  />

                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      + Add Location
                    </button>
                  </div>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {locations.map(l => (
                    <div key={l.id} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800">{l.name}</p>
                        <span className="text-[10px] text-amber-700 font-mono font-bold">{l.code} • {l.departmentName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{l.buildingOrAisle || 'Main'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowManageSetupModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Done / Save Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: 4-DIGIT USER PIN AUTHENTICATION FOR STOCK COUNTING */}
      {showPinAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
              <Key className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-base">User PIN Verification</h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter 4-digit User PIN for <strong className="text-slate-800">{selectedUserForPin?.name || activeUser.name}</strong> to authenticate stock take inputs.
              </p>
            </div>

            {pinError && (
              <div className="p-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold">
                {pinError}
              </div>
            )}

            <form onSubmit={handleVerifyUserPin} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="****"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="w-36 text-center text-2xl tracking-[0.5em] font-extrabold p-3 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none mx-auto"
              />

              <p className="text-[10px] text-slate-400">
                Default demo PINs: <code className="font-bold text-slate-600">1111</code> or <code className="font-bold text-slate-600">1234</code>
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinAuthModal(false);
                    setEnteredPin('');
                    setPinError(null);
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enteredPin.length < 4}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-40"
                >
                  Verify PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
