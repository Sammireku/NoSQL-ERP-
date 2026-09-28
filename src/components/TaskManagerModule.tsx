import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Plus, 
  ListTodo, 
  Sparkles, 
  User, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  Search, 
  Bot, 
  ChevronRight, 
  MessageSquare,
  ShieldAlert,
  Tag,
  ArrowUpRight,
  FileText,
  Building2,
  ShoppingCart,
  Package,
  DollarSign,
  ShieldCheck,
  Send
} from 'lucide-react';
import { dataStore } from '../config/firebase';
import { UserProfile, TaskItem, TaskPriority, TaskStatus, TaskCategory, UserRole } from '../types/erp';

interface TaskManagerModuleProps {
  activeUser: UserProfile;
  initialChatText?: string;
}

export default function TaskManagerModule({ activeUser, initialChatText }: TaskManagerModuleProps) {
  const [tasks, setTasks] = useState<TaskItem[]>(() => dataStore.getTasks());
  const [users] = useState<UserProfile[]>(() => dataStore.getUsers());

  // Filter & Search states
  const [filterView, setFilterView] = useState<'all' | 'assignedToMe' | 'supervisorTasks' | 'completed'>('all');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Task Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [assignedUid, setAssignedUid] = useState(activeUser.uid);
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [category, setCategory] = useState<TaskCategory>('General');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [supervisorNotes, setSupervisorNotes] = useState('');

  // AI Chat Parser Modal state
  const [showAiModal, setShowAiModal] = useState(false);
  const [chatTextInput, setChatTextInput] = useState(initialChatText || '');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setTasks(dataStore.getTasks());
    const unsubscribe = dataStore.subscribeToCollection('tasks' as any, () => {
      setTasks(dataStore.getTasks());
    });
    return () => unsubscribe();
  }, []);

  const isSupervisor = activeUser.role === 'sysadmin' || activeUser.role === 'manager' || activeUser.role === 'ceo';

  // Handle Supervisor / User Create Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const assignedUserObj = users.find(u => u.uid === assignedUid) || activeUser;

    dataStore.addTask({
      title: newTitle,
      description: newDesc,
      assignedToUid: assignedUserObj.uid,
      assignedToName: assignedUserObj.name,
      assignedToRole: assignedUserObj.role,
      createdByUid: activeUser.uid,
      createdByName: activeUser.name,
      createdByRole: activeUser.role,
      isSupervisorTask: isSupervisor,
      dueDate,
      priority,
      category,
      status: 'To Do',
      supervisorNotes: supervisorNotes || undefined
    });

    setTasks(dataStore.getTasks());
    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
    setSupervisorNotes('');
  };

  // Handle Task Status Change
  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    dataStore.updateTaskStatus(taskId, newStatus);
    setTasks(dataStore.getTasks());
  };

  // Handle AI Chat Extraction
  const handleRunAiParser = async () => {
    if (!chatTextInput.trim()) return;
    setIsAiLoading(true);
    setAiSuccessMsg('Analyzing chat input with Gemini AI task extraction pipeline...');

    try {
      const res = await fetch('/api/parse-messages-to-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: chatTextInput,
          activeUser
        })
      });

      const data = await res.json();
      if (data.success && data.tasks && data.tasks.length > 0) {
        data.tasks.forEach((t: any) => {
          dataStore.addTask({
            title: t.title,
            description: t.description || 'Extracted automatically from chat notes',
            assignedToUid: activeUser.uid,
            assignedToName: t.assignedToName || activeUser.name,
            assignedToRole: t.assignedToRole || activeUser.role,
            createdByUid: activeUser.uid,
            createdByName: activeUser.name + ' (AI Chat Parser)',
            createdByRole: activeUser.role,
            isSupervisorTask: isSupervisor,
            dueDate: t.dueDate || new Date().toISOString().split('T')[0],
            priority: t.priority || 'Medium',
            category: t.category || 'General',
            status: 'To Do',
            sourceMessageText: t.sourceMessageText
          });
        });

        setTasks(dataStore.getTasks());
        setAiSuccessMsg(`✓ Successfully extracted ${data.tasks.length} actionable task(s)!`);
        setTimeout(() => {
          setShowAiModal(false);
          setAiSuccessMsg(null);
        }, 1500);
      } else {
        setAiSuccessMsg('AI parsed text into standard review task.');
        setTimeout(() => setAiSuccessMsg(null), 2000);
      }
    } catch (e) {
      console.warn("AI Task extraction offline fallback:", e);
      dataStore.addTask({
        title: chatTextInput.substring(0, 40) + '...',
        description: `Extracted from chat notes: "${chatTextInput}"`,
        assignedToUid: activeUser.uid,
        assignedToName: activeUser.name,
        assignedToRole: activeUser.role,
        createdByUid: activeUser.uid,
        createdByName: activeUser.name,
        createdByRole: activeUser.role,
        isSupervisorTask: isSupervisor,
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'Medium',
        category: 'General',
        status: 'To Do'
      });
      setTasks(dataStore.getTasks());
      setShowAiModal(false);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(t => {
    if (filterView === 'assignedToMe' && t.assignedToUid !== activeUser.uid) return false;
    if (filterView === 'supervisorTasks' && !t.isSupervisorTask) return false;
    if (filterView === 'completed' && t.status !== 'Completed') return false;

    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
    if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchAssignee = t.assignedToName.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAssignee) return false;
    }

    return true;
  });

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'Urgent': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'High': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Medium': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Low': return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (s: TaskStatus) => {
    switch (s) {
      case 'To Do': return 'bg-slate-100 text-slate-700';
      case 'In Progress': return 'bg-blue-100 text-blue-800 animate-pulse';
      case 'Under Review': return 'bg-amber-100 text-amber-800';
      case 'Completed': return 'bg-emerald-100 text-emerald-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Enterprise Task & Todo Manager</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Collaborative task board for staff and supervisors with Gemini AI message-to-task parsing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setShowAiModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>AI Message-to-Task Parser</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{isSupervisor ? 'Assign Supervisor Task' : 'New Todo Item'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Total Active Tasks</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{tasks.filter(t => t.status !== 'Completed').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-rose-500 uppercase">Urgent & High Priority</p>
          <p className="text-xl font-extrabold text-rose-600 mt-1">{tasks.filter(t => (t.priority === 'Urgent' || t.priority === 'High') && t.status !== 'Completed').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-indigo-500 uppercase">Assigned To Me</p>
          <p className="text-xl font-extrabold text-indigo-600 mt-1">{tasks.filter(t => t.assignedToUid === activeUser.uid && t.status !== 'Completed').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-emerald-500 uppercase">Completed Tasks</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{tasks.filter(t => t.status === 'Completed').length}</p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setFilterView('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterView === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Tasks ({tasks.length})
            </button>
            <button
              onClick={() => setFilterView('assignedToMe')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterView === 'assignedToMe' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Assigned To Me ({tasks.filter(t => t.assignedToUid === activeUser.uid).length})
            </button>
            <button
              onClick={() => setFilterView('supervisorTasks')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterView === 'supervisorTasks' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Supervisor Directives
            </button>
            <button
              onClick={() => setFilterView('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterView === 'completed' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Completed
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks or assignees..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Priority & Category Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-500">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold"
            >
              <option value="ALL">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-500">Department Category:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold"
            >
              <option value="ALL">All Categories</option>
              <option value="POS & Sales">POS & Sales</option>
              <option value="Inventory">Inventory</option>
              <option value="Hospitality">Hospitality</option>
              <option value="Financials">Financials</option>
              <option value="System & Security">System & Security</option>
              <option value="General">General</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List Grid */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
            <CheckSquare className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No matching tasks found</h3>
            <p className="text-xs text-slate-500">Adjust filters or create a new task to get started.</p>
          </div>
        ) : (
          filteredTasks.map(t => (
            <div 
              key={t.id}
              className={`bg-white p-5 rounded-2xl border transition-all shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                t.status === 'Completed' ? 'border-slate-200 bg-slate-50/50 opacity-80' : 'border-slate-200'
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${getPriorityBadge(t.priority)}`}>
                    {t.priority}
                  </span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                    {t.category}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${getStatusBadge(t.status)}`}>
                    {t.status}
                  </span>
                  {t.isSupervisorTask && (
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-200">
                      <ShieldCheck className="w-3 h-3 text-purple-600" /> Supervisor Directive
                    </span>
                  )}
                </div>

                <h3 className={`text-sm font-bold text-slate-900 ${t.status === 'Completed' ? 'line-through text-slate-500' : ''}`}>
                  {t.title}
                </h3>

                {t.description && (
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    {t.description}
                  </p>
                )}

                {t.sourceMessageText && (
                  <div className="p-2 bg-indigo-50/60 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="italic">" {t.sourceMessageText} "</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1 font-mono">
                  <div className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Assigned: <strong className="text-slate-800 font-sans">{t.assignedToName} ({t.assignedToRole})</strong></span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due: <strong className="text-slate-800">{t.dueDate}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Created by: {t.createdByName}</span>
                  </div>
                </div>
              </div>

              {/* Status Actions Buttons */}
              <div className="flex items-center space-x-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                {t.status === 'To Do' && (
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'In Progress')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    Start Task
                  </button>
                )}

                {t.status === 'In Progress' && (
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'Completed')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete</span>
                  </button>
                )}

                {t.status === 'Completed' && (
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'In Progress')}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all"
                  >
                    Reopen Task
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add New Task */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-indigo-600" />
                {isSupervisor ? 'Assign Supervisor Task' : 'Create New Todo Item'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Audit POS cash drawer & restock Room 204"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / Instructions</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detailed instructions for the assignee..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assign To Employee</label>
                  <select
                    value={assignedUid}
                    onChange={(e) => setAssignedUid(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>{u.name} ({u.role.toUpperCase()})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Department Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="POS & Sales">POS & Sales</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Hospitality">Hospitality</option>
                    <option value="Financials">Financials</option>
                    <option value="System & Security">System & Security</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              {isSupervisor && (
                <div>
                  <label className="font-bold text-purple-800 block mb-1">Supervisor Notes / Directives</label>
                  <input
                    type="text"
                    value={supervisorNotes}
                    onChange={(e) => setSupervisorNotes(e.target.value)}
                    placeholder="e.g., Mandatory check-off before shift end"
                    className="w-full p-2.5 bg-purple-50/50 border border-purple-200 rounded-xl text-purple-900"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Create & Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: AI Message-to-Task Parser */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">AI Message-to-Task Parser</h3>
                  <p className="text-xs text-slate-500">Gemini AI analyzes staff messages or notes and auto-generates structured tasks.</p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {aiSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{aiSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Paste Staff Chat Log, WhatsApp, or Voice Notes Text:</label>
                <textarea
                  rows={6}
                  value={chatTextInput}
                  onChange={(e) => setChatTextInput(e.target.value)}
                  placeholder={`Example: "Marcus please restock room 201 with fresh towels before 2pm and reconcile cash drawer float by shift end."`}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const sample = `Alex (Manager): "Room #103 needs deep cleaning and new linens before 3 PM guest arrival."\nCarlos (Supervisor): "Please perform POS cash register reconciliation and print daily ledger statement."`;
                    setChatTextInput(sample);
                  }}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Load Sample Chat Log
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRunAiParser}
                    disabled={isAiLoading || !chatTextInput.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isAiLoading ? 'Extracting Tasks via Gemini...' : 'Extract Tasks Now'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
