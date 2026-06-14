import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { useClientId } from '../lib/useClientId';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatbotMini() {
  const { clientId } = useClientId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 11));
  const [botConfig, setBotConfig] = useState<any>({
    title: 'AI Assistant',
    greeting: "Hello! How can I help you today?",
    avatar: '',
    primaryColor: '#6366f1',
    configTimestamp: Date.now()
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const greetingSetRef = useRef(false);

  // Force body/html height and styling standalone
  useEffect(() => {
    // Only apply standalone styles if rendered in /chatbot-mini standalone page or in an iframe
    const isStandalone = window.location.pathname === '/chatbot-mini' || window.self !== window.top;
    if (!isStandalone) return;

    document.documentElement.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.height = '100%';
    }

    return () => {
      document.documentElement.style.height = '';
      document.documentElement.style.overflow = '';
      document.body.style.height = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
      if (rootEl) {
        rootEl.style.height = '';
      }
    };
  }, []);

  // Load custom settings
  useEffect(() => {
    if (!clientId) {
      console.log('[CHATBOT] No clientId found, waiting...');
      return;
    }
    
    setLoading(true);
    console.log('[CHATBOT] Fetching settings for:', clientId);
    
    // Increased timeout for slow cold starts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn('[CHATBOT] Settings fetch timed out after 15s');
        controller.abort();
    }, 15000); 

    fetch(`/v1/public/settings?clientId=${clientId}&t=${Date.now()}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const settings = data?.success && data.data !== undefined ? data.data : data;
        console.log('[CHATBOT] Settings data resolved:', !!settings);
        if (settings) {
          setBotConfig({
            title: settings.chatbotTitle || settings.businessName || 'Assistant',
            subtitle: settings.chatbotSubtitle || 'Digital Representative',
            greeting: settings.chatbotGreeting || "Hello! How can I help you today?",
            avatar: settings.chatbotAvatar || '',
            primaryColor: settings.chatbotPrimaryColor || '#6366f1',
            configTimestamp: Date.now()
          });
        }
      })
      .catch(err => {
        console.error('[CHATBOT] Settings fetch error:', err);
        // Fallback to minimal working state so user can still chat
        setBotConfig(prev => ({ ...prev, title: 'Assistant', configTimestamp: Date.now() }));
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  }, [clientId]);

  // Set greeting as the first message exactly once per config load
  useEffect(() => {
    if (botConfig.greeting && !greetingSetRef.current) {
      setMessages([
        { role: 'assistant', content: botConfig.greeting }
      ]);
      greetingSetRef.current = true;
    }
  }, [botConfig.greeting, botConfig.configTimestamp]);

  // Register visit tracking once client session details map
  useEffect(() => {
    if (!clientId) return;
    
    // Check session storage to prevent double tracking in the same session
    const visitTracked = sessionStorage.getItem(`tracked_visit_${sessionId}`);
    if (visitTracked) return;

    fetch('/v1/public/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId
      },
      body: JSON.stringify({
        page: 'Chatbot Mini',
        route: window.location.pathname + window.location.search,
        referrer: document.referrer || 'direct',
        sessionId,
        interactedWithBot: sessionStorage.getItem('bot_interacted') === 'true'
      })
    })
    .then(res => res.json())
    .then(() => {
      sessionStorage.setItem(`tracked_visit_${sessionId}`, 'true');
    })
    .catch(err => console.error('[TRACKING_ERROR]', err));
  }, [clientId, sessionId]);

  // Scroll to bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Track interaction for analytics
    sessionStorage.setItem('bot_interacted', 'true');
    
    // Send event update to tracking
    fetch('/v1/public/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId || ''
      },
      body: JSON.stringify({
        page: 'Chatbot Mini',
        route: window.location.pathname + window.location.search,
        referrer: document.referrer || 'direct',
        sessionId,
        interactedWithBot: true
      })
    }).catch(() => {});

    const userMsg = input.trim();
    setInput('');
    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Standard timeout - if exceeded, it will trigger the catch block
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 35000); // 35s max wait before throwing explicit error

      const history = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/v1/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': clientId || '' 
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: userMsg,
          sessionId,
          history: history.slice(0, -1),
          pageContext: 'Mini Chatbot Interface'
        })
      });

      clearTimeout(timeoutId);
      
      if (!res.ok) {
        let errDetails = `HTTP_${res.status}`;
        try {
          const errData = await res.json();
          errDetails = errData.message || (errData.error?.message) || errData.error || errDetails;
        } catch (e) {
          // Fallback if not JSON
        }
        throw new Error(`[Server Error] ${errDetails}`);
      }

      const resData = await res.json();
      if (resData.success && resData.data?.text) {
        setMessages([...updatedMessages, { role: 'assistant', content: resData.data.text }]);
      } else if (resData.text) {
        setMessages([...updatedMessages, { role: 'assistant', content: resData.text }]);
      } else if (resData.message) {
        setMessages([...updatedMessages, { role: 'assistant', content: resData.message }]);
      } else {
        console.error('[CHATBOT] Unexpected API response structure:', resData);
        throw new Error(`Unexpected server response formatting.`);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const isAbort = err.name === 'AbortError';
      const devErrorMessage = isAbort 
        ? "🚨 [Timeout Error] The knowledge server took too long to respond (35s+). This usually means a cold start or an API rate limit."
        : `🚨 [Dev Mode Error] ${err.message || 'Unknown connection failure.'}`;
      
      setMessages([
        ...updatedMessages, 
        { role: 'assistant', content: devErrorMessage }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset this conversation?')) {
      setMessages([{ role: 'assistant', content: botConfig.greeting }]);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 font-sans shadow-inner overflow-hidden relative">
      {/* Header */}
      <header 
        style={{ backgroundColor: botConfig.primaryColor }}
        className="px-6 py-4 text-white flex items-center justify-between shadow-md relative z-10 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 border border-white/10 flex items-center justify-center shrink-0">
            {botConfig.avatar ? (
              <img src={`${botConfig.avatar}${botConfig.avatar.includes('?') ? '&' : '?'}t=${botConfig.configTimestamp}`} className="w-full h-full rounded-full object-cover" alt="Avatar" />
            ) : (
              <Bot className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-none mb-1">{botConfig.title}</h1>
            <p className="text-[10px] text-white/80 font-medium">{botConfig.subtitle || 'Digital Representative'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleReset}
            title="Reset chat"
            className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {window.self !== window.top && (
            <button 
              onClick={() => window.parent.postMessage('close-chat-widget', '*')}
              title="Close chat"
              className="p-2 bg-white/10 hover:bg-red-500/80 active:scale-95 text-white rounded-xl transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div 
              key={i} 
              className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border overflow-hidden ${
                  isUser 
                    ? 'bg-slate-200 border-slate-300 text-slate-700' 
                    : 'text-white border-transparent'
                }`}
                style={isUser ? {} : { backgroundColor: botConfig.primaryColor }}
              >
                {isUser ? <User className="w-4 h-4" /> : (
                  botConfig.avatar ? (
                    <img src={`${botConfig.avatar}${botConfig.avatar.includes('?') ? '&' : '?'}t=${botConfig.configTimestamp}`} className="w-full h-full object-cover" alt="Bot" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )
                )}
              </div>

              <div 
                style={isUser ? {} : { borderLeftColor: botConfig.primaryColor }}
                className={`p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                  isUser 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 rounded-tl-none border-l-4'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Loading Spinner Indicator */}
        {loading && (
          <div className="flex items-start gap-2.5 max-w-[85%]">
            <div 
              style={{ backgroundColor: botConfig.primaryColor }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white border-transparent shrink-0 overflow-hidden"
            >
              {botConfig.avatar ? (
                <img src={`${botConfig.avatar}${botConfig.avatar.includes('?') ? '&' : '?'}t=${botConfig.configTimestamp}`} className="w-full h-full object-cover" alt="Bot" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              <span className="text-xs font-semibold text-slate-400">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Footer input form */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex gap-2 items-center relative z-10 shrink-0">
        <input 
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask something..."
          disabled={loading}
          className="flex-1 bg-slate-50 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:opacity-50"
        />
        <button 
          type="submit"
          disabled={!input.trim() || loading}
          style={{ backgroundColor: input.trim() ? botConfig.primaryColor : '#D1D5DB' }}
          className="p-3 text-white rounded-xl shadow-md transition-all hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
