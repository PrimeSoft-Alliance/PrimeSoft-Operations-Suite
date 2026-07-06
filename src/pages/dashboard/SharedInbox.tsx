import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Mail, MessageSquare, CheckCircle, Clock, Send, RefreshCw, 
  User, Shield, AlertCircle, Plus, Trash2, Edit, Check, 
  Settings, Key, Smartphone, Info, Star, Archive, CheckSquare, Inbox, ChevronLeft,
  Smartphone as SmsIcon, MessageCircle as WhatsAppIcon, Send as TelegramIcon,
  Maximize2, Minimize2, ChevronRight, Image as ImageIcon, Paperclip, X, Loader2,
  CheckCheck, XCircle, Sparkles
} from 'lucide-react';
import { useClientId } from '../../lib/useClientId';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { getSocket } from '../../lib/socket';

interface Conversation {
  _id: string;
  customerJid: string;
  platform: 'whatsapp' | 'telegram' | 'widget' | 'sms' | 'email';
  customerName?: string;
  customerEmail?: string;
  messages: Array<{
    sender: 'customer' | 'assistant' | 'human_override';
    text: string;
    media?: {
      mimeType?: string;
      fileName?: string;
      fileSize?: number;
      localPath?: string;
    };
    timestamp: string | Date;
  }>;
  aiEnabled: boolean;
  updatedAt: string;
  createdAt: string;
}

export default function SharedInbox() {
  const { clientId } = useClientId();
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('id');
  const targetEmail = searchParams.get('email');
  const targetPhone = searchParams.get('phone');
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'chat'>('all');
  
  // Mobile navigation state
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedMedium, setSelectedMedium] = useState<'email' | 'whatsapp' | 'telegram' | 'sms'>('whatsapp');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [polishing, setPolishing] = useState(false);

  const handlePolish = async () => {
    if (!newMessage.trim() || polishing) return;
    setPolishing(true);
    try {
      const res = await fetch('/v1/ai/format-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId! },
        body: JSON.stringify({
          message: newMessage,
          instruction: 'Make it highly professional, friendly, and natural while preserving intent.'
        })
      });
      const data = await res.json();
      if (data.success && data.data.formattedText) {
        setNewMessage(data.data.formattedText);
      }
    } catch (err) {
      console.error('Polish failed:', err);
    } finally {
      setPolishing(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/v1/media/upload', {
        method: 'POST',
        headers: {
          'x-client-id': clientId!
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setImageUrl(data.data.url);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (selectedConv) {
      scrollToBottom();
    }
  }, [selectedConv?._id, selectedConv?.messages?.length]);
  
  useEffect(() => {
    if (clientId) {
      fetchConversations();
      
      const socket = getSocket(clientId);
      if (socket) {
        const handleNewEvent = () => {
          fetchConversations(); // Just refetch on any message event
        };
        
        socket.on('email.received', handleNewEvent);
        socket.on('email.sent', handleNewEvent);
        socket.on('whatsapp.message', handleNewEvent);
        socket.on('telegram.message', handleNewEvent);
        socket.on('widget.message', handleNewEvent);
        
        return () => {
          socket.off('email.received', handleNewEvent);
          socket.off('email.sent', handleNewEvent);
          socket.off('whatsapp.message', handleNewEvent);
          socket.off('telegram.message', handleNewEvent);
          socket.off('widget.message', handleNewEvent);
        };
      }
    }
  }, [clientId]);

  useEffect(() => {
    if (conversations.length > 0) {
      if (targetId) {
        const found = conversations.find(c => c._id === targetId);
        if (found) {
          setSelectedConv(found);
          setIsMobileDetailView(true);
        }
      } else if (targetEmail || targetPhone) {
        const found = conversations.find(c => 
          (targetEmail && c.customerEmail === targetEmail) || 
          (targetPhone && c.customerJid.includes(targetPhone))
        );
        if (found) {
          setSelectedConv(found);
          setIsMobileDetailView(true);
        }
      }
    }
  }, [conversations, targetId, targetEmail, targetPhone]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/conversations', { headers: { 'x-client-id': clientId! } });
      const data = await res.json();
      if (data.success) {
        setConversations(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !imageUrl) || !selectedConv) return;
    try {
      const res = await fetch(`/v1/conversations/${selectedConv._id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId! },
        body: JSON.stringify({
          text: newMessage,
          channel: selectedMedium,
          imageUrl: imageUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        const updatedMsg = { ...data.data, timestamp: new Date().toISOString() };
        setSelectedConv({
          ...selectedConv,
          messages: [...selectedConv.messages, updatedMsg]
        });
        setConversations(conversations.map(c => 
          c._id === selectedConv._id 
            ? { ...c, messages: [...c.messages, updatedMsg], updatedAt: new Date().toISOString() } 
            : c
        ));
        setNewMessage('');
        setImageUrl('');
        scrollToBottom();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAI = async () => {
    if (!selectedConv) return;
    const targetState = selectedConv.aiEnabled === false ? true : false;
    try {
      const res = await fetch(`/v1/conversations/${selectedConv._id}/ai`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId! },
        body: JSON.stringify({ aiEnabled: targetState })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedConv({
          ...selectedConv,
          aiEnabled: targetState
        });
        setConversations(conversations.map(c => 
          c._id === selectedConv._id 
            ? { ...c, aiEnabled: targetState } 
            : c
        ));
      }
    } catch (err) {
      console.error('Failed to toggle AI state:', err);
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (activeTab === 'chat') return c.platform !== 'email';
    // By default only show non-email in shared inbox as per instructions
    return c.platform !== 'email';
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return <WhatsAppIcon className="w-3 h-3 text-emerald-500" />;
      case 'telegram': return <TelegramIcon className="w-3 h-3 text-sky-500" />;
      case 'sms': return <SmsIcon className="w-3 h-3 text-slate-500" />;
      case 'email': return <Mail className="w-3 h-3 text-amber-500" />;
      default: return <MessageSquare className="w-3 h-3 text-indigo-500" />;
    }
  };

  useEffect(() => {
    if (isMobileDetailView) {
      window.history.pushState({ detailView: true }, '');
    }
    
    const handlePopState = (e: PopStateEvent) => {
      if (isMobileDetailView) {
        setIsMobileDetailView(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobileDetailView]);

  return (
    <div className={cn(
      "flex flex-col bg-white overflow-hidden",
      "h-[calc(100vh-96px)] lg:h-[750px] lg:rounded-3xl lg:border lg:border-slate-200 lg:shadow-sm"
    )}>
      <div className="flex h-full relative overflow-hidden">
        
        {/* Conversations List (First Page / Sidebar) */}
        <div className={cn(
          "flex flex-col w-full lg:w-[380px] border-r border-slate-100 bg-white transition-all duration-300",
          isMobileDetailView ? "hidden lg:flex" : "flex",
          isSidebarHidden && "lg:hidden"
        )}>
          <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10 lg:flex hidden">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
              Inbox
            </h2>
            <button 
              onClick={fetchConversations}
              className="p-2 hover:bg-slate-50 rounded-xl transition-all"
            >
              <RefreshCw className={cn("w-5 h-5 text-slate-400", loading && "animate-spin")} />
            </button>
          </div>

          <div className="p-2 flex gap-1 border-b border-slate-50 shrink-0 bg-white">
            {['all', 'chat'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                  activeTab === tab ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                {tab === 'all' ? 'All Channels' : 'Live Chat'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/10 scrollbar-thin scrollbar-thumb-slate-200">
            {loading && conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Chats...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center h-60 opacity-40">
                <Archive className="w-10 h-10 mb-4 text-slate-300" />
                <p className="text-xs font-bold text-slate-400">No active conversations</p>
              </div>
            ) : (
              filteredConversations.map((c) => (
                <div
                  key={c._id}
                  onClick={() => {
                    setSelectedConv(c);
                    setIsMobileDetailView(true);
                  }}
                  className={cn(
                    "p-4 border-b border-slate-100/50 cursor-pointer transition-all hover:bg-white group relative",
                    selectedConv?._id === c._id ? "bg-white" : "bg-transparent"
                  )}
                >
                  {selectedConv?._id === c._id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600" />
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm shrink-0 border border-indigo-100 shadow-sm">
                      {(c.customerName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {c.customerName || c.customerJid}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                          {format(new Date(c.updatedAt), 'HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-slate-500 truncate pr-4 font-medium italic">
                          {c.messages[c.messages.length - 1]?.text || 'No messages yet'}
                        </p>
                        <div className="shrink-0">{getPlatformIcon(c.platform)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Detail (Detail Page) */}
        <div className={cn(
          "flex-1 flex flex-col bg-white transition-all h-full min-h-0",
          !isMobileDetailView ? "hidden lg:flex" : "fixed inset-0 z-[60] lg:relative lg:inset-auto lg:flex"
        )}>
          {selectedConv ? (
            <>
              {/* Header - Fixed at Top */}
              <div className="h-[72px] px-4 md:px-6 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 z-20 sticky top-0 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back Button (Mobile Only) */}
                  <button 
                    onClick={() => {
                      setIsMobileDetailView(false);
                      window.history.back();
                    }}
                    className="lg:hidden p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <ChevronLeft className="w-6 h-6 text-slate-600" />
                  </button>

                  {/* Toggle Sidebar (Desktop Only) */}
                  <button 
                    onClick={() => setIsSidebarHidden(!isSidebarHidden)}
                    className="hidden lg:flex p-2 hover:bg-slate-100 rounded-xl transition-all mr-1"
                    title={isSidebarHidden ? "Show Sidebar" : "Hide Sidebar (Focus View)"}
                  >
                    {isSidebarHidden ? (
                      <ChevronRight className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <ChevronLeft className="w-5 h-5 text-slate-500" />
                    )}
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs shadow-sm ring-2 ring-indigo-500/10 shrink-0">
                    {(selectedConv.customerName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 truncate max-w-[120px] md:max-w-xs leading-tight">
                      {selectedConv.customerName || 'User'}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{selectedConv.platform}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleAI}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm",
                      selectedConv.aiEnabled !== false
                        ? "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100"
                        : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100"
                    )}
                  >
                    {selectedConv.aiEnabled !== false ? 'Mute AI' : 'Enable AI'}
                  </button>
                </div>
              </div>

              {/* Messages Container - Flexible Scrolling Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50/50 scroll-smooth min-h-0">
                {selectedConv.messages.map((m, i) => {
                  const isAssistant = m.sender === 'assistant' || m.sender === 'human_override';
                  return (
                    <div key={i} className={cn(
                      "flex flex-col max-w-[90%] md:max-w-[70%]",
                      isAssistant ? "ml-auto items-end" : "mr-auto items-start"
                    )}>
                      <div className={cn(
                        "p-4 rounded-3xl text-xs md:text-[13px] leading-relaxed shadow-sm transition-all border",
                        isAssistant 
                          ? "bg-indigo-600 text-white rounded-tr-none border-indigo-500" 
                          : "bg-white border-slate-200/60 text-slate-800 rounded-tl-none"
                      )}>
                        <div className="flex flex-col gap-3">
                          {/* Pattern-based Image detection (Manual/AI Sent) */}
                          {m.text?.includes('[Sent Image:') ? (
                            <>
                              {(() => {
                                const match = m.text.match(/\[Sent Image: (.*?)\]/);
                                const cleanText = m.text.replace(/\[Sent Image: (.*?)\]/, '').trim();
                                return (
                                  <>
                                    {match && (
                                      <img 
                                        src={match[1]} 
                                        alt="Attachment" 
                                        className="max-w-full rounded-xl shadow-md border border-white/20"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                    {cleanText && <div>{cleanText}</div>}
                                  </>
                                );
                              })()}
                            </>
                          ) : (
                            /* Direct Media field detection (Customer Sent) */
                            <>
                              {m.media?.localPath && (
                                <img 
                                  src={m.media.localPath} 
                                  alt="Customer Attachment" 
                                  className="max-w-full rounded-xl shadow-md border border-white/20"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              {(m as any).imageUrl && (
                                <img 
                                  src={(m as any).imageUrl} 
                                  alt="Attachment" 
                                  className="max-w-full rounded-xl shadow-md border border-white/20"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              {m.text && <div>{m.text}</div>}
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold mt-2 px-2 uppercase tracking-widest flex items-center gap-1.5">
                        <span className={cn(isAssistant ? "text-indigo-500" : "text-slate-500")}>
                          {isAssistant ? (m.sender === 'human_override' ? "You" : "AI Agent") : (selectedConv.customerName || "Customer")}
                        </span>
                        <span>•</span>
                        <span>{format(new Date(m.timestamp), 'HH:mm')}</span>
                        {isAssistant && (m as any).status && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              {(m as any).status === 'read' ? (
                                <CheckCheck className="w-3 h-3 text-indigo-500" />
                              ) : (m as any).status === 'delivered' ? (
                                <CheckCheck className="w-3 h-3 text-slate-300" />
                              ) : (m as any).status === 'sent' ? (
                                <Check className="w-3 h-3 text-slate-300" />
                              ) : (m as any).status === 'failed' ? (
                                <XCircle className="w-3 h-3 text-rose-500" />
                              ) : null}
                              <span className="capitalize">{(m as any).status}</span>
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Input Area - Fixed at Bottom */}
              <div className="p-4 bg-white border-t border-slate-100 shrink-0 z-20 sticky bottom-0">
                <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                  {['whatsapp', 'telegram', 'sms', 'email'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMedium(m as any)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 whitespace-nowrap",
                        selectedMedium === m 
                          ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                          : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                
                <div className="relative group">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Reply via ${selectedMedium.toUpperCase()}...`}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-[24px] p-4 pr-24 text-xs md:text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className={cn(
                        "p-3 rounded-2xl transition-all shadow-md active:scale-95",
                        imageUrl 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : "bg-white text-slate-400 border border-slate-200 hover:bg-slate-50"
                      )}
                      title="Attach Image"
                    >
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={handlePolish}
                      disabled={!newMessage.trim() || polishing}
                      className={cn(
                        "p-3 rounded-2xl transition-all shadow-md active:scale-95",
                        polishing 
                          ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                          : "bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50"
                      )}
                      title="AI Polish Message"
                    >
                      {polishing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() && !imageUrl}
                      className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-lg active:scale-95"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {imageUrl && (
                  <div className="mt-3 relative inline-block group">
                    <img 
                      src={imageUrl} 
                      alt="Attachment Preview" 
                      className="h-20 w-auto rounded-xl border border-slate-200 shadow-sm object-cover"
                    />
                    <button 
                      onClick={() => setImageUrl('')}
                      className="absolute -top-2 -right-2 p-1 bg-white border border-slate-200 rounded-full shadow-lg text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-slate-50/10">
              <div className="w-24 h-24 bg-white rounded-[40px] shadow-2xl shadow-indigo-500/10 flex items-center justify-center mb-8 border border-slate-100">
                <Mail className="w-10 h-10 text-indigo-600 opacity-40" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Select a Conversation</h3>
              <p className="text-slate-400 text-sm font-medium max-w-[280px]">Choose a chat from the inbox to start communicating across all platforms.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
