import React, { useState, useEffect, useRef } from 'react';
import { useClientId } from '../lib/useClientId';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { 
  Send, Paperclip, RefreshCw, Cpu, User, X, Image as ImageIcon, 
  CheckCircle, AlertCircle, FileText, ArrowRight, Loader2, Maximize2 
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  mediaUrl?: string;
  timestamp: Date;
}

export default function ChatbotMini() {
  const { clientId } = useClientId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionUUID, setSessionUUID] = useState('');
  const [botConfig, setBotConfig] = useState<any>({
    title: 'AI Representative',
    subtitle: 'Digital Assistant',
    greeting: "Hello! I'm here to help you with any questions about our products or booking. How can I assist you today?",
    primaryColor: '#4F46E5',
    avatar: '',
    icon: 'Cpu'
  });

  // Media Attachment State
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; base64: string } | null>(null);
  const [previewOpenUrl, setPreviewOpenUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize session and load bot customizations
  useEffect(() => {
    // Generate static session UUID for the iframe session
    let sId = sessionStorage.getItem('ominirep_playground_session');
    if (!sId) {
      sId = 'play_' + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('ominirep_playground_session', sId);
    }
    setSessionUUID(sId);

    // Fetch bot configuration
    async function fetchConfig() {
      if (!clientId) return;
      try {
        const response = await fetch(`/v1/public/headless/config?clientId=${clientId}`);
        if (response.ok) {
          const payload = await response.json();
          const config = payload.data || payload;
          if (config && config.ai) {
            setBotConfig({
              title: config.ai.title || 'AI Representative',
              subtitle: config.ai.subtitle || 'Digital Assistant',
              greeting: config.ai.greeting || "Hello! I'm here to help you with any questions about our products or booking. How can I assist you today?",
              primaryColor: config.ai.color || '#4F46E5',
              avatar: config.ai.avatar || '',
              icon: config.ai.icon || 'Cpu'
            });
            
            // Set initial greeting
            setMessages([
              {
                id: 'welcome',
                role: 'assistant',
                text: config.ai.greeting || "Hello! I'm here to help you with any questions about our products or booking. How can I assist you today?",
                timestamp: new Date()
              }
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to load bot config:', err);
      }
    }
    
    fetchConfig();
  }, [clientId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // File Upload Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Only image attachments are supported for visual analysis.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setAttachedFile({
        name: file.name,
        type: file.type,
        base64: base64String
      });
    };
    reader.onerror = (error) => {
      console.error('File conversion error:', error);
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop Handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    const userMsgText = inputText.trim();
    const userMsgMedia = attachedFile ? attachedFile.base64 : undefined;
    const currentFile = attachedFile;

    // Reset inputs immediately
    setInputText('');
    setAttachedFile(null);

    const userMessageId = 'user_' + Date.now();
    const newMsg: Message = {
      id: userMessageId,
      role: 'user',
      text: userMsgText,
      mediaUrl: userMsgMedia,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      const response = await fetch(`/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId
        },
        body: JSON.stringify({
          message: userMsgText,
          sessionId: sessionUUID,
          userName: 'Playground User',
          userEmail: 'sandbox@ominirep.com',
          media: currentFile ? {
            mimeType: currentFile.type,
            data: currentFile.base64
          } : undefined
        })
      });

      if (response.ok) {
        const payload = await response.json();
        const responseData = payload.data || payload;
        
        setMessages(prev => [
          ...prev,
          {
            id: 'bot_' + Date.now(),
            role: 'assistant',
            text: responseData.text || 'I didn\'t catch that. Could you try rephrasing?',
            mediaUrl: responseData.imageUrl,
            timestamp: new Date()
          }
        ]);
      } else {
        throw new Error('Connection error');
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'error_' + Date.now(),
          role: 'system',
          text: 'Failed to send message. Please verify network connection and try again.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setMessages([
      {
        id: 'welcome_reset',
        role: 'assistant',
        text: botConfig.greeting,
        timestamp: new Date()
      }
    ]);
    const freshSessionId = 'play_' + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('ominirep_playground_session', freshSessionId);
    setSessionUUID(freshSessionId);
    setAttachedFile(null);
  };

  return (
    <div 
      className="flex flex-col h-full bg-white font-sans select-none overflow-hidden border-0"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Bot Header */}
      <div 
        className="px-4 py-4 sm:px-6 text-white flex items-center justify-between shadow-md relative z-10 shrink-0"
        style={{ backgroundColor: botConfig.primaryColor }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          {botConfig.avatar ? (
            <img 
              src={botConfig.avatar} 
              alt="Bot Avatar" 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white/30 shadow-sm"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/20">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          )}
          <div>
            <h4 className="font-bold text-base tracking-tight leading-tight">{botConfig.title}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] sm:text-xs text-white/90 font-bold uppercase tracking-wider">{botConfig.subtitle}</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={resetSession}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10"
          title="Clear session state"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-4 bg-slate-50 relative">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div 
              key={msg.id} 
              className={`flex gap-2 sm:gap-3 max-w-[92%] sm:max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar Icon */}
              <div className="shrink-0">
                {isUser ? (
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                ) : botConfig.avatar ? (
                  <img 
                    src={botConfig.avatar} 
                    alt="Bot Avatar" 
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Message Content Bubble */}
              <div className="space-y-1.5">
                <div 
                  className={`px-4 py-3.5 rounded-2xl text-sm font-medium shadow-sm break-words leading-relaxed relative group ${
                    isUser 
                      ? 'text-white rounded-tr-xs' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-slate-200/50'
                  }`}
                  style={isUser ? { backgroundColor: botConfig.primaryColor } : undefined}
                >
                  {/* User Upload Image Preview inside bubble */}
                  {msg.mediaUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-black/10 relative max-w-xs group-hover:shadow-lg transition-all duration-300">
                      <img 
                        src={msg.mediaUrl} 
                        alt="User Uploaded Visual" 
                        className="w-full max-h-60 object-cover cursor-zoom-in"
                        onClick={() => setPreviewOpenUrl(msg.mediaUrl || null)}
                      />
                      <button 
                        className="absolute right-2 bottom-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition"
                        onClick={() => setPreviewOpenUrl(msg.mediaUrl || null)}
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Message Markdown text */}
                  {msg.text ? (
                    <div className={cn(
                      "prose prose-sm max-w-none break-words leading-relaxed",
                      isUser ? "text-white" : "text-slate-800"
                    )}>
                      <ReactMarkdown 
                        components={{
                          img: ({ src, alt }) => {
                            return (
                              <span className="block my-3 rounded-xl overflow-hidden border border-slate-200 shadow-md max-w-xs group cursor-zoom-in relative transition-transform hover:scale-[1.02] duration-300">
                                <img 
                                  src={src} 
                                  alt={alt || "Product/Service"} 
                                  className="w-full max-h-56 object-cover" 
                                  onClick={() => setPreviewOpenUrl(src || null)}
                                />
                                <span className="absolute bottom-2 right-2 px-2 py-1 text-[8px] font-black bg-black/70 text-white rounded uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                  Expand Image
                                </span>
                              </span>
                            );
                          },
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="italic flex items-center gap-2 opacity-80 text-xs font-bold uppercase tracking-wider">
                      <ImageIcon className="w-4 h-4" />
                      Visual Attachment
                    </span>
                  )}
                </div>
                
                {/* Timestamp */}
                <div className={`text-[9px] text-slate-400 font-bold px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-start">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2 text-slate-500 text-xs shadow-xs font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Action Form Area */}
      <div className="p-4 sm:p-5 bg-white border-t border-slate-100 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)] shrink-0">
        {/* Attachment preview tab */}
        {attachedFile && (
          <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shadow-sm shrink-0">
                <img src={attachedFile.base64} alt="Attachment" className="w-full h-full object-cover" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[11px] font-bold text-slate-900 truncate">{attachedFile.name}</p>
                <p className="text-[9px] font-black uppercase text-indigo-500 tracking-widest mt-0.5">Ready to Analyze</p>
              </div>
            </div>
            <button 
              onClick={() => setAttachedFile(null)}
              className="p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3">
          {/* File Input */}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden" 
          />
          
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-2xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
            title="Attach image"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>

          <input 
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={attachedFile ? "Ask about this image..." : "How can I help you today?"}
            className="flex-1 px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
            disabled={loading}
          />

          <button 
            type="submit"
            disabled={loading || (!inputText.trim() && !attachedFile)}
            className="px-4 rounded-2xl text-white shadow-lg shadow-indigo-600/20 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 disabled:shadow-none"
            style={{ 
              backgroundColor: botConfig.primaryColor,
              opacity: (loading || (!inputText.trim() && !attachedFile)) ? 0.6 : 1
            }}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Fullscreen Lightbox Overlay */}
      {previewOpenUrl && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewOpenUrl(null)}
        >
          <button 
            onClick={() => setPreviewOpenUrl(null)}
            className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <img 
            src={previewOpenUrl} 
            alt="Fidelity Lightbox Visual" 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()} // Avoid closing when clicking image
          />
          
          <div className="text-white/60 text-xs font-bold mt-4 tracking-wide font-sans">
            Visual Inspection Workspace • ESC or Click anywhere to close
          </div>
        </div>
      )}
    </div>
  );
}
