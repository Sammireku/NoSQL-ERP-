import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Sparkles, 
  Loader2, 
  HelpCircle,
  ChevronDown,
  BookOpen,
  FileText,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ShieldCheck,
  Save
} from 'lucide-react';
import { UserProfile } from '../types/erp';

interface AIChatSupportProps {
  activeUser: UserProfile;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: string[];
  timestamp: Date;
}

interface PolicyDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt?: string;
  updatedBy?: string;
}

export default function AIChatSupport({ activeUser }: AIChatSupportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'admin_policies'>('chat');
  
  // RAG Policy manuals state
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyDocument | null>(null);
  const [policyNotice, setPolicyNotice] = useState<string | null>(null);

  const isAdmin = activeUser.role === 'sysadmin' || activeUser.role === 'manager' || activeUser.role === 'ceo';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello **${activeUser.name}**! I am your AI Staff Assistant. 

I have full access to the **${activeUser.orgId || 'Corporate'}** company policy manual, inventory guides, and checkout protocols. 

Ask me anything like:
* *"What is our return policy?"*
* *"How do I process a vendor invoice?"*
* *"What happens if I void multiple POS items?"*`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load corporate policies when opening admin policies tab
  const fetchPolicies = async () => {
    setLoadingPolicies(true);
    try {
      const res = await fetch(`/api/admin/manuals?orgId=${activeUser.orgId || 'org_corp_test'}`);
      const data = await res.json();
      if (data.manuals) {
        setPolicies(data.manuals);
      }
    } catch (e) {
      console.error("Fetch policies error:", e);
    } finally {
      setLoadingPolicies(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin_policies') {
      fetchPolicies();
    }
  }, [activeTab]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSavePolicy = async (policy: Partial<PolicyDocument>) => {
    if (!policy.title || !policy.content) return;
    try {
      const res = await fetch('/api/admin/manuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...policy,
          orgId: activeUser.orgId || 'org_corp_test',
          activeUser
        })
      });
      const data = await res.json();
      if (data.success) {
        setPolicyNotice(`✓ Policy "${policy.title}" updated and indexed into AI Knowledge Base!`);
        setEditingPolicy(null);
        fetchPolicies();
        setTimeout(() => setPolicyNotice(null), 5000);
      }
    } catch (err) {
      console.error("Save policy error:", err);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm("Are you sure you want to delete this policy from the AI knowledge base?")) return;
    try {
      await fetch(`/api/admin/manuals/${id}?orgId=${activeUser.orgId || 'org_corp_test'}`, {
        method: 'DELETE'
      });
      fetchPolicies();
      setPolicyNotice("Policy removed from AI Assistant index.");
      setTimeout(() => setPolicyNotice(null), 4000);
    } catch (e) {
      console.error("Delete policy error:", e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMsgId = 'msg_' + Math.random().toString(36).substring(7);
    const userMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userQuery = inputValue;
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userQuery,
          orgId: activeUser.orgId || 'org_corp_test'
        })
      });

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: 'msg_' + Math.random().toString(36).substring(7),
        sender: 'assistant',
        text: data.answer || "I apologize, but I couldn't reach the RAG knowledge index.",
        sources: data.sourcesUsed || ["Standard ERP Fallback Protocol"],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("RAG fetch failed:", error);
      // Fallback message
      setMessages(prev => [...prev, {
        id: 'msg_err_' + Math.random().toString(36).substring(7),
        sender: 'assistant',
        text: `I apologize for the service disruption, but here is standard corporate policy:

*   **Return Policy:** Products are returnable within 30 days of purchase with original receipt. Cleared or clearance items are non-refundable.
*   **POS Voids:** Multiple voids (more than 3 in 15 minutes) trigger an automated security notification to your supervisor.`,
        sources: ["Standard Manual Fallback Cache"],
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button with notifications count */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 bg-slate-900 hover:bg-slate-800 text-slate-100 p-4 rounded-full shadow-2xl z-50 flex items-center justify-center border border-slate-800 transition-all transform hover:scale-105"
        title="AI Assistant Manual RAG Search"
      >
        <div className="relative">
          <MessageSquare className="w-6 h-6 text-indigo-400" />
          <span className="absolute -top-2 -right-2 bg-indigo-500 text-white font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
            AI
          </span>
        </div>
      </button>

      {/* RAG Conversation Window */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 w-96 max-w-[calc(100vw-32px)] h-[500px] bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden">
          
          {/* Header */}
          <div className="bg-slate-900 text-slate-100 p-3.5 border-b border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-slate-800 rounded-lg">
                  <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-200">Staff AI Knowledge Copilot</h3>
                  <p className="text-[10px] text-indigo-300 font-mono flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    RAG Engine v1.0
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Policy Manager Sub-Tabs */}
            {isAdmin && (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-1 rounded-lg transition-all ${
                    activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  AI Chat
                </button>
                <button
                  onClick={() => setActiveTab('admin_policies')}
                  className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    activeTab === 'admin_policies' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Update Policies</span>
                </button>
              </div>
            )}
          </div>

          {activeTab === 'chat' ? (
            <>
              {/* Messages Log area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium shadow-sm border ${
                        msg.sender === 'user' 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'bg-white border-slate-100 text-slate-800'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                      
                      {/* Sources Citaton Chip list */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-1 items-center">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
                            <BookOpen className="w-3 h-3" /> Sources cited:
                          </span>
                          {msg.sources.map((source, idx) => (
                            <span 
                              key={idx} 
                              className="bg-slate-100 text-slate-600 text-[9px] px-1.5 py-0.5 rounded font-bold"
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 font-mono">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono italic">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Searching knowledge base & drafting reply...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Form Action footer */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={loading}
                  placeholder="Ask return policy, RAG, voids..."
                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition-all text-slate-800"
                />
                <button
                  type="submit"
                  disabled={loading || !inputValue.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 p-2 rounded-xl transition-all shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* ADMIN POLICY MANAGEMENT TAB */
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Admin Policy & Compliance Index</h4>
                  <p className="text-[10px] text-slate-500">Documents updated here are immediately indexed by Gemini RAG</p>
                </div>
                <button
                  onClick={() => setEditingPolicy({ id: '', title: '', category: 'Compliance', content: '' })}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Policy</span>
                </button>
              </div>

              {policyNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{policyNotice}</span>
                </div>
              )}

              {/* POLICY FORM / EDITOR */}
              {editingPolicy && (
                <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-sm space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-indigo-600 font-mono">
                      {editingPolicy.id ? 'Edit Document' : 'Create New Document'}
                    </span>
                    <button onClick={() => setEditingPolicy(null)} className="text-slate-400 text-xs font-bold">✕</button>
                  </div>

                  <input
                    type="text"
                    placeholder="Document Title (e.g. Health & Safety Guidelines)"
                    value={editingPolicy.title}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, title: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />

                  <input
                    type="text"
                    placeholder="Category (e.g. Sales, Compliance, Operations)"
                    value={editingPolicy.category}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, category: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />

                  <textarea
                    rows={4}
                    placeholder="Full policy, rules, or compliance text for AI to learn..."
                    value={editingPolicy.content}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, content: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
                  />

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingPolicy(null)}
                      className="px-2.5 py-1 text-xs text-slate-500 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSavePolicy(editingPolicy)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save & Index</span>
                    </button>
                  </div>
                </div>
              )}

              {/* POLICIES LIST */}
              {loadingPolicies ? (
                <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Loading knowledge base...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {policies.map(p => (
                    <div key={p.id} className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{p.title}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingPolicy(p)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeletePolicy(p.id)}
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-mono font-bold rounded">
                        {p.category}
                      </span>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {p.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
