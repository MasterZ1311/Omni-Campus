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
      text: 'Hello! I am your AI Campus Concierge. I can find and book classrooms, labs, and equipment for you. Try asking me something like:\n"Find a classroom for 30 people at 2pm" or "Which labs are free this afternoon?"',
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
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all duration-200 relative group"
        >
          <span className="text-2xl">💬</span>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
          {/* Tooltip */}
          <span className="absolute right-16 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-sm pointer-events-none">
            Ask AI Concierge
          </span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-[380px] sm:w-[400px] h-[550px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-red-600 px-6 py-4 flex justify-between items-center text-white shadow-sm">
            <div className="flex items-center space-x-3">
              <span className="text-xl">🤖</span>
              <div>
                <h3 className="font-bold text-sm leading-none">AI Campus Concierge</h3>
                <span className="text-[10px] text-red-100 font-medium mt-1 inline-block">Online • Direct Booking Assistance</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-red-100 hover:text-white font-bold p-1 bg-red-700/50 hover:bg-red-700/80 rounded-lg text-xs transition-all"
            >
              ✕ Close
            </button>
          </div>

          {/* Conversation Area */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-red-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-medium'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Suggestions Grid */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-3 w-full grid grid-cols-1 gap-2 pl-2">
                    {msg.suggestions.map((s: any) => (
                      <div
                        key={s.id}
                        className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-red-300 hover:bg-red-50/10 transition-all flex justify-between items-center"
                      >
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs">{s.name}</h4>
                          <span className="text-[10px] text-slate-400">📍 {s.location}</span>
                        </div>
                        <a
                          href={`/discovery?resource=${s.id}`}
                          className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
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
              <div className="flex items-center space-x-2 text-slate-400 text-xs">
                <span>🤖</span>
                <span className="animate-pulse">Concierge is searching schedules...</span>
              </div>
            )}
          </div>

          {/* Preset Quick Queries */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
            {presetQueries.map((q) => (
              <button
                key={q}
                onClick={() => handleSendMessage(q)}
                className="px-3 py-1 bg-white border border-slate-200 hover:border-red-500 hover:text-red-600 text-slate-600 text-[10px] font-semibold rounded-full transition-all duration-200 shadow-sm"
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
            className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
          >
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask for classrooms, checkouts..."
              className="flex-1 px-4 py-2 rounded-xl bg-slate-100 border-none focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
