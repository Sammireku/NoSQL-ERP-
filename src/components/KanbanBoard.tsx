import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  DragEndEvent,
  UniqueIdentifier
} from '@dnd-kit/core';
import { 
  TrendingUp, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Sparkles, 
  X, 
  AlertOctagon,
  Users,
  Briefcase
} from 'lucide-react';
import { Opportunity, KanbanStage, UserProfile } from '../types/erp';
import { dataStore } from '../config/firebase';

interface KanbanBoardProps {
  activeUser: UserProfile;
}

// 1. Column Droppable Wrapper
interface KanbanColumnProps {
  key?: any;
  stage: KanbanStage;
  opportunities: Opportunity[];
  activeUser: UserProfile;
}

function KanbanColumn({ stage, opportunities }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  const getStageColor = (s: KanbanStage) => {
    switch (s) {
      case 'New': return 'border-t-slate-400 bg-slate-50/50';
      case 'Qualified': return 'border-t-sky-400 bg-sky-50/20';
      case 'Proposal': return 'border-t-indigo-400 bg-indigo-50/20';
      case 'Negotiation': return 'border-t-amber-400 bg-amber-50/20';
      case 'Closed': return 'border-t-emerald-400 bg-emerald-50/20';
    }
  };

  return (
    <div 
      ref={setNodeRef}
      className={`flex-1 min-w-[220px] rounded-xl border border-slate-100 p-4 transition-all flex flex-col space-y-3 min-h-[450px] border-t-4 ${getStageColor(stage)} ${isOver ? 'ring-2 ring-indigo-500/20 bg-indigo-50/10' : ''}`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100/60 mb-2">
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
          {stage}
          <span className="text-[10px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">
            {opportunities.length}
          </span>
        </h3>
      </div>

      <div className="flex-1 flex flex-col space-y-3">
        {opportunities.map(opp => (
          <KanbanCard key={opp.id} opportunity={opp} />
        ))}
        {opportunities.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200/60 rounded-xl p-4 text-center text-slate-300 py-16">
            <span className="text-[10px] font-medium uppercase">Empty Stage</span>
          </div>
        )}
      </div>
    </div>
  );
}

// 2. Card Draggable Wrapper
interface KanbanCardProps {
  key?: any;
  opportunity: Opportunity;
}

function KanbanCard({ opportunity }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-40 border-indigo-400' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-slate-800 text-xs leading-tight line-clamp-2 flex-1 pr-1">
          {opportunity.title}
        </h4>
        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
          ${opportunity.value.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-slate-50">
        <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
          {opportunity.customerName}
        </span>
        
        {/* Real-time AI Lead Scoring indicator */}
        {opportunity.ai_lead_score !== undefined && (
          <div className="flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-violet-500" />
            <span className={`text-[10px] font-bold ${
              opportunity.ai_lead_score >= 80 
                ? 'text-emerald-600' 
                : opportunity.ai_lead_score >= 50 
                  ? 'text-amber-600' 
                  : 'text-rose-500'
            }`}>
              AI: {opportunity.ai_lead_score}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// 3. Main Board Component
export default function KanbanBoard({ activeUser }: KanbanBoardProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [newDealTitle, setNewDealTitle] = useState('');
  const [newDealValue, setNewDealValue] = useState('');
  const [newDealCustomer, setNewDealCustomer] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Security audit feedback modal state
  const [blockedTransition, setBlockedTransition] = useState<{
    oppTitle: string;
    stageFrom: string;
    stageTo: string;
    errorPayload: any;
  } | null>(null);

  // Sync state with local subscription engine
  useEffect(() => {
    setOpportunities(dataStore.getOpportunities());

    const unsubscribe = dataStore.subscribeToCollection('opportunities', () => {
      setOpportunities(dataStore.getOpportunities());
    });

    return () => unsubscribe();
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const oppId = active.id as string;
    const targetStage = over.id as KanbanStage;

    const oppToUpdate = opportunities.find(o => o.id === oppId);
    if (!oppToUpdate || oppToUpdate.kanban_stage === targetStage) return;

    const originalStage = oppToUpdate.kanban_stage;

    // OPTIMISTIC UI UPDATE
    const updatedOpps = opportunities.map(o => 
      o.id === oppId ? { ...o, kanban_stage: targetStage } : o
    );
    setOpportunities(updatedOpps);

    try {
      // Background CRM write stream that updates target fields like ai_lead_score
      let finalOpp = { ...oppToUpdate, kanban_stage: targetStage };

      // Make CRM predict API request on update to refresh AI Lead score in background
      try {
        const aiPredict = await fetch('/api/ai/predict-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: oppToUpdate.title,
            value: oppToUpdate.value,
            customerName: oppToUpdate.customerName,
            stage: targetStage
          })
        });
        const aiResult = await aiPredict.json();
        if (aiResult && aiResult.ai_lead_score !== undefined) {
          finalOpp.ai_lead_score = aiResult.ai_lead_score;
        }
      } catch (err) {
        console.warn("Real-time AI lead score update failed:", err);
      }

      // Commit to store (validates against role security rules)
      dataStore.updateOpportunity(finalOpp, activeUser);
    } catch (err: any) {
      // REVERT OPTIMISTIC UPDATE ON SECURITY BLOCK
      setOpportunities(dataStore.getOpportunities());
      
      // Parse detailed Firestore RBAC error
      try {
        const errorDetails = JSON.parse(err.message);
        setBlockedTransition({
          oppTitle: oppToUpdate.title,
          stageFrom: originalStage,
          stageTo: targetStage,
          errorPayload: errorDetails
        });
      } catch (e) {
        console.error("Failed to parse security error details:", err);
      }
    }
  };

  const createDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealTitle || !newDealValue || !newDealCustomer) return;

    const oppId = 'opp_user_' + Math.floor(Math.random() * 10000);
    const valNumeric = parseFloat(newDealValue) || 1000;

    // Predict score initial
    let initialLeadScore = 25;
    try {
      const response = await fetch('/api/ai/predict-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDealTitle,
          value: valNumeric,
          customerName: newDealCustomer,
          stage: 'New'
        })
      });
      const data = await response.json();
      if (data && data.ai_lead_score !== undefined) {
        initialLeadScore = data.ai_lead_score;
      }
    } catch (err) {
      console.warn("Initial lead scoring failed:", err);
    }

    const newOpp: Opportunity = {
      id: oppId,
      title: newDealTitle,
      customerName: newDealCustomer,
      customerId: 'cust_0' + Math.floor(1 + Math.random() * 3),
      value: valNumeric,
      kanban_stage: 'New',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ai_lead_score: initialLeadScore
    };

    dataStore.createOpportunity(newOpp);
    
    setNewDealTitle('');
    setNewDealValue('');
    setNewDealCustomer('');
    setShowAddForm(false);
  };

  const STAGES: KanbanStage[] = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Closed'];

  return (
    <div className="space-y-6" id="crm_kanban_module">
      
      {/* Board Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">CRM Opportunity Pipelines</h2>
            <p className="text-xs text-slate-500">Real-time dragging sales deals. RBAC is active based on selected profile.</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Sales Deal</span>
        </button>
      </div>

      {/* Add Deal Interactive Form */}
      {showAddForm && (
        <form onSubmit={createDeal} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm max-w-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Add Sales Deal</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Deal Title</label>
              <input 
                type="text" 
                value={newDealTitle} 
                onChange={e => setNewDealTitle(e.target.value)}
                placeholder="Enterprise Software License"
                className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Customer Account</label>
              <input 
                type="text" 
                value={newDealCustomer} 
                onChange={e => setNewDealCustomer(e.target.value)}
                placeholder="Apex Industries"
                className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Deal Value ($)</label>
              <input 
                type="number" 
                value={newDealValue} 
                onChange={e => setNewDealValue(e.target.value)}
                placeholder="5500"
                className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <button 
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold"
            >
              Add Opportunity
            </button>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* DndContext & Board Columns */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <KanbanColumn 
              key={stage} 
              stage={stage} 
              opportunities={opportunities.filter(o => o.kanban_stage === stage)}
              activeUser={activeUser}
            />
          ))}
        </div>
      </DndContext>

      {/* RBAC BLOCK SECURITY VIOLATION MODAL */}
      {blockedTransition && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-rose-100 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setBlockedTransition(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-50 rounded-xl">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Firestore Security Rules Violation</h3>
                <p className="text-xs text-rose-600 font-semibold">Error: PERMISSION_DENIED</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                <p className="text-slate-700 font-medium">
                  An operation was rejected by the database security rules. Your role could not commit this state mutation:
                </p>
                <div className="grid grid-cols-2 gap-2 text-slate-500 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="font-semibold block text-[10px] text-slate-400 uppercase">Target Resource</span>
                    <span className="font-mono text-slate-700">{blockedTransition.errorPayload.path}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-[10px] text-slate-400 uppercase">Operation Type</span>
                    <span className="font-mono text-slate-700">{blockedTransition.errorPayload.operationType}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-[10px] text-slate-400 uppercase">Active Profile</span>
                    <span className="text-slate-700 font-semibold capitalize">{activeUser.name} ({activeUser.role})</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-[10px] text-slate-400 uppercase">Action attempted</span>
                    <span className="text-slate-700 font-semibold">Change stage from <span className="font-bold text-slate-800">{blockedTransition.stageFrom}</span> to <span className="text-rose-600 font-bold">{blockedTransition.stageTo}</span></span>
                  </div>
                </div>
              </div>

              {/* Exact Rules Extract Triggering Block */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Active Security Rule Asserted
                </span>
                <div className="bg-slate-950 text-emerald-400 font-mono text-[11px] p-4 rounded-xl border border-slate-800 overflow-x-auto leading-relaxed">
                  <p className="text-slate-500">// RBAC Constraint: Only managers can move opportunities to Closed</p>
                  <p>allow update: if isManager() || (</p>
                  <p>&nbsp;&nbsp;isSales() && </p>
                  <p className="text-rose-400 font-bold">&nbsp;&nbsp;// Prevent sales from changing stage to 'Closed'</p>
                  <p className="text-rose-400 font-bold">&nbsp;&nbsp;request.resource.data.kanban_stage != 'Closed' &&</p>
                  <p>&nbsp;&nbsp;// Prevent sales from editing an already 'Closed' deal</p>
                  <p>&nbsp;&nbsp;resource.data.kanban_stage != 'Closed'</p>
                  <p>);</p>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg text-xs text-rose-800 leading-tight">
                <strong>Why this happened:</strong> To prevent sales representatives from artificially closing and locking deals without senior authorization, only employees matching the <code>manager</code> identity role can transition cards to <code>Closed</code>. Toggle active profiles at the top header to managers to test permission clearance!
              </div>

              <button 
                onClick={() => setBlockedTransition(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Dismiss Audit Notice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
