import React, { useState } from 'react';
import { MessageSquare, Send, Hash, BedDouble, User, Sparkles, Tag, ShieldCheck, Check } from 'lucide-react';
import { dataStore } from '../config/firebase';
import { UserProfile, InternalMessage, Room } from '../types/erp';

interface InHouseMessagingModuleProps {
  activeUser: UserProfile;
}

export default function InHouseMessagingModule({ activeUser }: InHouseMessagingModuleProps) {
  const [messages, setMessages] = useState<InternalMessage[]>(() => dataStore.getInternalMessages());
  const [activeChannel, setActiveChannel] = useState<string>('housekeeping');
  const [inputText, setInputText] = useState('');
  const [taggedRoom, setTaggedRoom] = useState<string>('');

  const [rooms] = useState<Room[]>(() => dataStore.getRooms());

  const channels = [
    { id: 'general', name: 'general-team', icon: Hash },
    { id: 'housekeeping', name: 'housekeeping-alerts', icon: BedDouble },
    { id: 'frontdesk', name: 'front-desk-reception', icon: User },
    { id: 'maintenance', name: 'maintenance-repairs', icon: ShieldCheck },
  ];

  // Send Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = dataStore.addInternalMessage({
      channelId: activeChannel,
      senderUid: activeUser.uid,
      senderName: activeUser.name,
      senderRole: activeUser.role,
      text: inputText,
      roomTag: taggedRoom || undefined
    });

    setMessages(dataStore.getInternalMessages());
    setInputText('');
    setTaggedRoom('');
  };

  const filteredMessages = messages.filter(m => m.channelId === activeChannel);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
      {/* Channels Sidebar */}
      <div className="w-full md:w-64 bg-slate-900 text-slate-200 p-4 border-r border-slate-800 space-y-4 shrink-0">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">Tumi Staff Messenger</h3>
            <p className="text-[10px] text-slate-400 font-mono">In-House Department Chat</p>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Team Channels
          </span>
          <div className="space-y-1">
            {channels.map(ch => {
              const Icon = ch.icon;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeChannel === ch.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">#{ch.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Chat Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Hash className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-extrabold text-slate-900">
              #{channels.find(c => c.id === activeChannel)?.name}
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {filteredMessages.length} Messages Logged
          </span>
        </div>

        {/* Messages List */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[360px]">
          {filteredMessages.map(m => (
            <div key={m.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-900">{m.senderName}</span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    {m.senderRole.toUpperCase()}
                  </span>
                  {m.roomTag && (
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <BedDouble className="w-3 h-3 text-rose-600" /> Room #{m.roomTag}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{m.text}</p>
            </div>
          ))}
        </div>

        {/* Send Input Box */}
        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 space-y-2">
          <div className="flex items-center space-x-2">
            <select
              value={taggedRoom}
              onChange={(e) => setTaggedRoom(e.target.value)}
              className="text-xs font-mono p-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 shrink-0"
            >
              <option value="">Tag Room Unit (Optional)</option>
              {rooms.map(r => (
                <option key={r.id} value={r.number}>Room #{r.number}</option>
              ))}
            </select>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message #${channels.find(c => c.id === activeChannel)?.name}...`}
              className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs p-2.5 rounded-xl shadow transition-all shrink-0 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
