import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'concierge';
  suggestions?: any[];
  bookingLinks?: { resourceId: string; name: string; link: string }[];
}

export default function ConciergeChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: 'Hello! I am your AI Campus Concierge. I can find classrooms, labs, and equipment for you. Try asking me something like:\n"Find a classroom for 30 people at 2pm" or "Which labs are free this afternoon?"',
      sender: 'concierge',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const presetQueries = [
    'Find a classroom for 30 people at 2pm',
    'Which labs are free this afternoon?',
    'Need a laptop for checkout',
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('/api/concierge/query', { message: textToSend });
      const responseData = res.data;

      const conciergeMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: responseData.message,
        sender: 'concierge',
        suggestions: responseData.suggestions,
        bookingLinks: responseData.bookingLinks,
      };

      setMessages((prev) => [...prev, conciergeMsg]);
    } catch (err: any) {
      toast.error('AI Concierge failed to respond');
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "I'm sorry, I encountered an issue processing that query. Please try again.",
          sender: 'concierge',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans text-xs">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-11 h-11 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-md shadow-red-500/20 hover:scale-105 active:scale-95 transition-all duration-200 relative group"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-[320px] sm:w-[350px] h-[450px] bg-white border border-slate-200 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-slate-900 px-4 py-2.5 flex justify-between items-center text-white shadow-sm">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              <div>
                <h3 className="font-bold text-xs leading-none">AI Campus Concierge</h3>
                <span className="text-[9px] text-slate-400 font-semibold mt-1 inline-block uppercase tracking-wider">Online Assistance</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white font-semibold text-xs"
            >
              Close
            </button>
          </div>

          {/* Conversation Area */}
          <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded px-3 py-2 text-xs shadow-sm whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-red-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-medium'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Suggestions Grid */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 w-full grid grid-cols-1 gap-1.5 pl-2">
                    {msg.suggestions.map((s: any) => (
                      <div
                        key={s.id}
                        className="bg-white border border-slate-200 rounded p-2 shadow-sm hover:border-red-300 hover:bg-red-50/10 transition-all flex justify-between items-center"
                      >
                        <div>
                          <h4 className="font-bold text-slate-800 text-[11px]">{s.name}</h4>
                          <span className="text-[9px] text-slate-400">Location: {s.location}</span>
                        </div>
                        <a
                          href={`/discovery?resource=${s.id}`}
                          className="text-[9px] font-bold text-red-650 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded"
                        >
                          Book ➔
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
                <svg className="w-3.5 h-3.5 text-slate-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4"/></svg>
                <span className="animate-pulse">Concierge is searching schedules...</span>
              </div>
            )}
          </div>

          {/* Preset Quick Queries */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
            {presetQueries.map((q) => (
              <button
                key={q}
                onClick={() => handleSendMessage(q)}
                className="px-2.5 py-1 bg-white border border-slate-200 hover:border-red-500 hover:text-red-600 text-slate-600 text-[9px] font-bold rounded-full transition-all shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Panel */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(message);
            }}
            className="p-2 bg-white border-t border-slate-200 flex items-center space-x-1.5"
          >
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask for classrooms, checkouts..."
              className="flex-1 px-3 py-1.5 rounded bg-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-900 text-xs font-semibold"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-xs transition-all"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
