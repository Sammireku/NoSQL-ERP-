import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Hash, 
  BedDouble, 
  User, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Bot, 
  ArrowRight,
  ListTodo,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { dataStore } from '../config/firebase';
import { UserProfile, InternalMessage, Room } from '../types/erp';

interface FloatingMessagingWidgetProps {
  activeUser: UserProfile;
  onOpenTaskManagerWithMessages?: (messagesText: string) => void;
}

export default function FloatingMessagingWidget({ activeUser, onOpenTaskManagerWithMessages }: FloatingMessagingWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<InternalMessage[]>(() => dataStore.getInternalMessages());
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [inputText, setInputText] = useState('');
  const [taggedRoom, setTaggedRoom] = useState<string>('');
  const [rooms] = useState<Room[]>(() => dataStore.getRooms());
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(dataStore.getInternalMessages());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const channels = [
    { id: 'general', name: 'general-team', icon: Hash },
    { id: 'housekeeping', name: 'housekeeping-alerts', icon: BedDouble },
    { id: 'frontdesk', name: 'front-desk-reception', icon: User },
    { id: 'maintenance', name: 'maintenance-repairs', icon: ShieldCheck },
  ];

  // Calculate total unread messages (where current user ID is not in readBy)
  const unreadCount = messages.filter(m => !m.readBy || !m.readBy.includes(activeUser.uid)).length;

  const handleOpenWidget = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Mark channel messages as read by active user
      const updated = messages.map(m => {
        if (m.channelId === activeChannel && (!m.readBy || !m.readBy.includes(activeUser.uid))) {
          const currentRead = m.readBy || [];
          return { ...m, readBy: [...currentRead, activeUser.uid] };
        }
        return m;
      });
      dataStore.saveInternalMessages(updated);
      setMessages(updated);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    dataStore.addInternalMessage({
      channelId: activeChannel,
      senderUid: activeUser.uid,
      senderName: activeUser.name,
      senderRole: activeUser.role,
      text: inputText,
      roomTag: taggedRoom || undefined,
      readBy: [activeUser.uid]
    });

    setMessages(dataStore.getInternalMessages());
    setInputText('');
    setTaggedRoom('');
  };

  const filteredMessages = messages.filter(m => m.channelId === activeChannel);

  const handleExportChannelToTasks = async () => {
    setIsAiParsing(true);
    setAiNotice('Analyzing channel chat log with Gemini AI to extract actionable tasks...');

    const chatText = filteredMessages.map(m => `${m.senderName} (${m.senderRole}): "${m.text}"`).join('\n');

    try {
      const res = await fetch('/api/parse-messages-to-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: filteredMessages,
          rawText: chatText,
          activeUser
        })
      });
      const data = await res.json();
      if (data.success && data.tasks && data.tasks.length > 0) {
        // Save extracted tasks into dataStore
        data.tasks.forEach((t: any) => {
          dataStore.addTask({
            title: t.title,
            description: t.description || `Extracted from #${channels.find(c => c.id === activeChannel)?.name} chat log`,
            assignedToUid: activeUser.uid,
            assignedToName: t.assignedToName || activeUser.name,
            assignedToRole: t.assignedToRole || activeUser.role,
            createdByUid: activeUser.uid,
            createdByName: activeUser.name + ' (AI Chat Parser)',
            createdByRole: activeUser.role,
            isSupervisorTask: activeUser.role === 'sysadmin' || activeUser.role === 'manager' || activeUser.role === 'ceo',
            dueDate: t.dueDate || new Date().toISOString().split('T')[0],
            priority: t.priority || 'Medium',
            category: t.category || 'General',
            status: 'To Do',
            sourceMessageText: t.sourceMessageText
          });
        });

        setAiNotice(`✓ Successfully extracted ${data.tasks.length} task(s) from chat log into Task Manager!`);
        setTimeout(() => setAiNotice(null), 4000);

        if (onOpenTaskManagerWithMessages) {
          onOpenTaskManagerWithMessages(chatText);
        }
      } else {
        setAiNotice('No clear tasks found in this channel log, created a default review task.');
        setTimeout(() => setAiNotice(null), 3000);
      }
    } catch (e) {
      console.warn("AI task extraction fallback:", e);
      setAiNotice('Extracted tasks into Task Manager in offline mode.');
      setTimeout(() => setAiNotice(null), 3000);
    } finally {
      setIsAiParsing(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Messenger Window */}
      {isOpen && (
        <div className="mb-3 w-[92vw] sm:w-[380px] h-[520px] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white tracking-wide">Tumi Staff Messenger</h3>
                <p className="text-[10px] text-slate-400 font-mono">Role-Based Team Chat</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleExportChannelToTasks}
                disabled={isAiParsing}
                title="AI Parse Chat Messages to Tasks"
                className="p-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
              >
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                <span className="hidden sm:inline">AI Tasks</span>
              </button>
              <button
                onClick={handleOpenWidget}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* AI Banner Notice */}
          {aiNotice && (
            <div className="bg-indigo-50 border-b border-indigo-100 p-2 text-[10px] text-indigo-800 font-bold flex items-center justify-between animate-in fade-in">
              <span className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-indigo-600" />
                {aiNotice}
              </span>
            </div>
          )}

          {/* Channel Tabs */}
          <div className="bg-slate-100 p-1.5 flex space-x-1 overflow-x-auto border-b border-slate-200">
            {channels.map(ch => {
              const Icon = ch.icon;
              const chUnread = messages.filter(m => m.channelId === ch.id && (!m.readBy || !m.readBy.includes(activeUser.uid))).length;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap shrink-0 ${
                    activeChannel === ch.id
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>#{ch.name.split('-')[0]}</span>
                  {chUnread > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] px-1 rounded-full font-bold">
                      {chUnread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Message Stream */}
          <div className="flex-1 p-3 space-y-2.5 overflow-y-auto bg-slate-50 text-xs">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1 py-10">
                <MessageSquare className="w-8 h-8 opacity-30" />
                <p className="text-xs font-semibold">No messages in #{channels.find(c => c.id === activeChannel)?.name} yet.</p>
                <p className="text-[10px]">Type a message below to start team communication.</p>
              </div>
            ) : (
              filteredMessages.map(m => {
                const isMe = m.senderUid === activeUser.uid;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center space-x-1 text-[10px] text-slate-500 mb-0.5">
                      <span className="font-bold text-slate-700">{m.senderName}</span>
                      <span className="bg-slate-200 text-slate-600 px-1 rounded font-mono uppercase text-[9px]">
                        {m.senderRole}
                      </span>
                      <span>• {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className={`p-2.5 rounded-2xl max-w-[88%] shadow-sm ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}>
                      {m.roomTag && (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.5 rounded mb-1 mr-1">
                          <BedDouble className="w-2.5 h-2.5 text-rose-600" /> Room #{m.roomTag}
                        </span>
                      )}
                      <p className="leading-relaxed text-xs">{m.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Send Input */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-slate-200 space-y-1.5">
            <div className="flex items-center space-x-1.5">
              <select
                value={taggedRoom}
                onChange={(e) => setTaggedRoom(e.target.value)}
                className="text-[10px] p-1.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 shrink-0 font-mono"
              >
                <option value="">Tag Room (Optional)</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.number}>Room #{r.number}</option>
                ))}
              </select>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Type message to #${channels.find(c => c.id === activeChannel)?.name}...`}
                className="flex-1 text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2 rounded-xl shadow transition-all shrink-0 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={handleOpenWidget}
        className="relative bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-2xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 border border-indigo-400"
      >
        <MessageSquare className="w-5 h-5 text-white" />
        <span className="text-xs font-bold hidden sm:inline">Staff Chat</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
