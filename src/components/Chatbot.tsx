import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Cpu, Sparkles, Phone, User, Bot } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMini, setIsMini] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch('/api/public/settings')
      .then(res => res.json())
      .then(setSettings)
      .catch(console.error);
  }, []);

  const businessName = settings?.businessName || 'Assistant';
  const chatbotTitle = settings?.chatbotTitle || `${businessName} Assistant`;
  const chatbotPrimaryColor = settings?.chatbotPrimaryColor || settings?.primaryColor || '#6366f1';
  
  const getIcon = (name: string) => {
    switch(name) {
      case 'MessageCircle': return MessageCircle;
      case 'Sparkles': return Sparkles;
      case 'User': return User;
      case 'Bot': return Bot;
      default: return Cpu;
    }
  };
  
  const ChatIcon = getIcon(settings?.chatbotIcon);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    // Initial popup after a few seconds
    const initialTimeout = setTimeout(() => {
      if (!isOpen) setShowPopup(true);
      setTimeout(() => setShowPopup(false), 8000);
    }, 5000);

    // Periodic popup every 60 seconds
    const interval = setInterval(() => {
      if (!isOpen) {
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 8000); // Hide after 8s
      }
    }, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isOpen]);

  useEffect(() => {
    // Check if we are inside the ChatbotMini iframe
    if (window.location.pathname === '/chatbot-mini') {
      setIsMini(true);
      setIsOpen(true);
    }
  }, []);

  const primaryColor = chatbotPrimaryColor;

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          history: messages
        })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
        <motion.button
        drag
        dragConstraints={{ left: -window.innerWidth + 100, right: 0, top: -window.innerHeight + 100, bottom: 0 }}
        dragElastic={0.1}
        onClick={() => setIsOpen(true)}
        style={{ backgroundColor: primaryColor }}
        className={cn(
          "fixed bottom-6 right-6 p-4 text-white rounded-full shadow-lg hover:opacity-90 transition-all flex items-center justify-center z-40 group cursor-grab active:cursor-grabbing hover:scale-110",
          (isOpen || isMini) ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
        aria-label="Open chat"
      >
        <div className="relative">
          <ChatIcon className="w-7 h-7" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"
          />
        </div>
        <AnimatePresence>
          {showPopup && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-full right-0 mb-4 bg-white text-gray-900 border border-gray-100 px-4 py-3 rounded-2xl rounded-br-sm text-sm shadow-xl pointer-events-none min-w-[200px] max-w-[calc(100vw-120px)] sm:max-w-[280px]"
            >
              <div className="font-bold text-indigo-600 mb-0.5 whitespace-nowrap">Need help?</div>
              <div className="text-gray-600 leading-snug">I'm {businessName}'s AI assistant. How can I help you today?</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <div
        className={cn(
          isMini 
            ? "fixed inset-0 w-full h-full bg-white z-50 flex flex-col"
            : cn(
                "fixed bottom-6 right-6 w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 transition-all duration-300 origin-bottom-right focus-within:ring-4 focus-within:ring-primary/20",
                isOpen ? "scale-100 opacity-100" : "scale-50 opacity-0 pointer-events-none"
              )
        )}
      >
        <div style={{ backgroundColor: primaryColor }} className="p-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {settings?.chatbotAvatar ? (
               <img src={settings.chatbotAvatar} className="w-10 h-10 rounded-full object-cover border-2 border-white/20" alt="Avatar" />
            ) : (
               <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <ChatIcon className="w-5 h-5" />
               </div>
            )}
            <div>
              <h3 className="font-semibold">{chatbotTitle}</h3>
              <p className="opacity-80 text-[10px] mt-0.5 flex items-center"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></span>Online</p>
            </div>
          </div>
          {!isMini && (
            <div className="flex items-center gap-2">
              {settings?.whatsappNumber && (
                <a 
                  href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-emerald-500/20 hover:bg-emerald-500/40 p-1.5 rounded-lg transition-colors flex items-center gap-1 group/wa"
                  title="Chat on WhatsApp"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400 group-hover/wa:rotate-12 transition-transform" />
                  <span className="text-[10px] font-bold text-white pr-0.5">WA</span>
                </a>
              )}
              <button onClick={() => setIsOpen(false)} className="text-white hover:bg-black/10 p-1.5 rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-4">
              Hi there! How can I help you regarding {businessName} services today?
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
              <div 
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed", 
                  msg.role === 'user' 
                    ? "text-white rounded-br-sm shadow-sm" 
                    : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"
                )}
                style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 text-gray-500 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            style={{ backgroundColor: primaryColor }}
            className="p-2.5 text-white rounded-full hover:opacity-90 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </>
  );
}
