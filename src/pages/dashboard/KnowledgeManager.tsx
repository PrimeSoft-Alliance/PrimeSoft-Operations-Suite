import React, { useEffect, useState, useRef } from 'react';
import { 
  Save, Plus, Trash2, Sparkles, RefreshCw, Sliders, HelpCircle, 
  AlertCircle, Play, Info, Eye, Check, Upload, Calendar, Clock, Layout, Lock,
  MapPin, Phone, Mail, Building, Globe, ChevronRight, ChevronLeft, X, Bot, Image as ImageIcon, ExternalLink,
  Database, Shield, Brain, FileText, Loader2, CheckCircle, CheckSquare, ArrowRight
} from 'lucide-react';
import { useClientId } from '../../lib/useClientId';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { LongPressWrapper } from '../../components/LongPressWrapper';

export default function KnowledgeManager() {
  const { clientId } = useClientId();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('persona');
  const [dbConnectionTab, setDbConnectionTab] = useState<'url'|'manual'>('url');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [dbSubTab, setDbSubTab] = useState<'tables' | 'settings' | 'security'>('settings');
  const [mobileView, setMobileView] = useState<'config' | 'sandbox'>('config');
  const [polishing, setPolishing] = useState(false);
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [fetchingTables, setFetchingTables] = useState(false);
  const [viewingTable, setViewingTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [configuringTable, setConfiguringTable] = useState<string | null>(null);
  const [activeDbIndex, setActiveDbIndex] = useState<number | null>(null); // null = list, -1 = primary, 0+ = extra
  const [tablePage, setTablePage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [knowledgeArticles, setKnowledgeArticles] = useState<any[]>([]);
  const [fetchingArticles, setFetchingArticles] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);

  // Sub-tab scrolling
  const dbSubTabsRef = useRef<HTMLDivElement>(null);
  const [showDbLeftArrow, setShowDbLeftArrow] = useState(false);
  const [showDbRightArrow, setShowDbRightArrow] = useState(false);

  const checkDbSubTabScroll = () => {
    if (dbSubTabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = dbSubTabsRef.current;
      setShowDbLeftArrow(scrollLeft > 5);
      setShowDbRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkDbSubTabScroll();
    window.addEventListener('resize', checkDbSubTabScroll);
    return () => window.removeEventListener('resize', checkDbSubTabScroll);
  }, [activeDbIndex]);

  const scrollDbSubTabs = (direction: 'left' | 'right') => {
    if (dbSubTabsRef.current) {
      const scrollAmount = direction === 'left' ? -150 : 150;
      dbSubTabsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [knowledgeArticles]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 150;
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  };
  const [uploadingKnowledge, setUploadingKnowledge] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const knowledgeInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const avatarPresets = [
    { name: 'Future Bot', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80' },
    { name: 'Neon Code', url: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=150&auto=format&fit=crop&q=80' },
    { name: 'Support Rep', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
    { name: 'Aura Orb', url: 'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?w=150&auto=format&fit=crop&q=80' }
  ];

  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    if (selectedArticles.length === 0) {
      setIsSelectionMode(false);
    }
  }, [selectedArticles]);

  const toggleArticleSelection = (id: string) => {
    setSelectedArticles(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      return [...prev, id];
    });
  };

  const handleLongPress = (id: string) => {
    setIsSelectionMode(true);
    setSelectedArticles([id]);
  };

  const handleCardClick = (article: any) => {
    if (isSelectionMode) {
      toggleArticleSelection(article._id);
    }
  };

  const fetchArticles = async () => {
    if (!settings?.clientId) return;
    setFetchingArticles(true);
    try {
      const res = await fetch('/v1/knowledge', {
        headers: { 'x-client-id': settings.clientId }
      });
      const data = await res.json();
      if (data.success) {
        setKnowledgeArticles(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge:', err);
    } finally {
      setFetchingArticles(false);
    }
  };

  const handleKnowledgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingKnowledge(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/v1/upload-knowledge', {
        method: 'POST',
        headers: { 'x-client-id': settings.clientId },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        fetchArticles();
        alert(data.message || 'Knowledge indexed successfully.');
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploadingKnowledge(false);
      if (knowledgeInputRef.current) knowledgeInputRef.current.value = '';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size too large. Please upload an image smaller than 2MB.');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch('/v1/upload-image', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-client-id': clientId || localStorage.getItem('ps_client_id') || ''
          },
          body: JSON.stringify({ imageBase64: base64, fileName: file.name })
        });
        
        const data = await res.json();
        if (data.success && data.data?.url) {
          updateField('chatbotAvatar', data.data.url);
        } else {
          alert(data.error?.message || data.error || 'Upload failed');
        }
      } catch (err) {
        console.error(err);
        alert('Upload failed');
      } finally {
        setUploadingImage(false);
      }
    };
  };

  const handleManualKnowledgeSubmit = async () => {
    if (!manualContent.trim()) return;
    setUploadingKnowledge(true);
    try {
      const res = await fetch('/v1/submit-text-knowledge', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': settings.clientId
        },
        body: JSON.stringify({ title: manualTitle, content: manualContent })
      });
      const data = await res.json();
      if (data.success) {
        setManualContent('');
        setManualTitle('');
        fetchArticles();
        alert(data.message || 'Knowledge indexed successfully.');
      } else {
        alert(data.error || 'Submission failed');
      }
    } catch (err) {
      console.error(err);
      alert('Submission failed');
    } finally {
      setUploadingKnowledge(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge segment?')) return;
    try {
      const res = await fetch(`/v1/knowledge/${id}`, { 
        method: 'DELETE',
        headers: { 'x-client-id': settings.clientId }
      });
      const data = await res.json();
      if (data.success) {
        setKnowledgeArticles(prev => prev.filter(a => a._id !== id));
        setSelectedArticles(prev => prev.filter(item => item !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDeleteArticles = async () => {
    if (selectedArticles.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedArticles.length} selected knowledge segments?`)) return;
    try {
      const res = await fetch(`/v1/knowledge`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': settings.clientId
        },
        body: JSON.stringify({ ids: selectedArticles })
      });
      const data = await res.json();
      if (data.success) {
        setKnowledgeArticles(prev => prev.filter(a => !selectedArticles.includes(a._id)));
        setSelectedArticles([]);
      } else {
        alert(data.error || 'Failed to delete selected segments.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete selected segments.');
    }
  };

  const fetchTables = async (dbIndexOverride?: number) => {
    if (!settings?.clientId) return;
    const dbIndex = dbIndexOverride !== undefined ? dbIndexOverride : activeDbIndex;
    const dbConfig = dbIndex === -1 ? settings.externalDbConfig : settings.externalDatabases?.[dbIndex || 0];
    if (!dbConfig || !dbConfig.enabled) return;

    setFetchingTables(true);
    try {
      const res = await fetch('/v1/dashboard/database/tables', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': settings.clientId
        },
        body: JSON.stringify({
          ...dbConfig
        })
      });
      const data = await res.json();
      if (data.success) {
        setDbTables(data.data || []);
      } else {
        alert('Database Connection Failed: ' + (data.message || 'Could not connect to the specified database. Please verify your credentials and host accessibility.'));
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err);
      alert('Network error while connecting to database. Please ensure the database is reachable from the internet.');
    } finally {
      setFetchingTables(false);
    }
  };

  const exploreData = async (tableName: string, page = 1) => {
    const cid = settings?.clientId || clientId;
    if (!cid) {
      console.error('No client ID available for exploreData');
      return;
    }
    
    const dbIndex = activeDbIndex;
    const dbConfig = dbIndex === -1 ? settings.externalDbConfig : (dbIndex !== null ? settings.externalDatabases[dbIndex] : null);
    if (!dbConfig) {
      console.error('No database configuration found for exploreData');
      return;
    }

    if (page === 1) {
      setViewingTable(tableName);
      setTableData([]);
      setTablePage(1);
      setHasMoreData(true);
    }
    
    setFetchingData(true);
    try {
      const res = await fetch('/v1/dashboard/database/query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': cid
        },
        body: JSON.stringify({
          ...dbConfig,
          collection: tableName,
          limit: 50,
          offset: (page - 1) * 50
        })
      });
      const data = await res.json();
      if (data.success) {
        if (page === 1) {
          setTableData(data.data || []);
        } else {
          setTableData(prev => [...prev, ...(data.data || [])]);
        }
        if (!data.data || data.data.length < 50) {
          setHasMoreData(false);
        }
      } else {
        alert('Data Fetch Failed: ' + (data.message || 'Unknown error'));
        console.error('[DB_EXPLORE_ERR]', data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      alert('Network error while fetching table data.');
    } finally {
      setFetchingData(false);
    }
  };

  const giveAllAccess = async () => {
    const dbIndex = activeDbIndex;
    const dbConfig = dbIndex === -1 ? settings.externalDbConfig : settings.externalDatabases?.[dbIndex || 0];
    if (!dbConfig) return;

    const newTableConfigs = { ...(dbConfig.tableConfigs || {}) };
    dbTables.forEach(table => {
      newTableConfigs[table] = { enabled: true, permission: 'read' };
    });

    let updatedSettings: any;
    if (dbIndex === -1) {
      updatedSettings = {
        ...settings,
        externalDbConfig: { ...dbConfig, tableConfigs: newTableConfigs }
      };
    } else if (dbIndex !== null) {
      const newDbs = [...(settings.externalDatabases || [])];
      if (newDbs[dbIndex]) {
        newDbs[dbIndex] = { ...newDbs[dbIndex], tableConfigs: newTableConfigs };
        updatedSettings = { ...settings, externalDatabases: newDbs };
      } else {
        return;
      }
    } else {
      return;
    }

    setSettings(updatedSettings);
    await handleSave(updatedSettings);
    alert(`AI access granted to all ${dbTables.length} tables with 'read' permission.`);
  };

  useEffect(() => {
    if (activeTab === 'database') {
      if (activeDbIndex === -1 && settings?.externalDbConfig?.enabled) {
        fetchTables();
      } else if (activeDbIndex !== null && activeDbIndex >= 0 && settings?.externalDatabases?.[activeDbIndex]?.enabled) {
        fetchTables(activeDbIndex);
      }
    }
  }, [activeTab, activeDbIndex]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreData && !fetchingData && viewingTable) {
          setTablePage(prev => {
            const nextPage = prev + 1;
            exploreData(viewingTable, nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMoreData, fetchingData, viewingTable]);

  const [playgroundKey, setPlaygroundKey] = useState(0);

  // Load current settings
  useEffect(() => {
    fetchSettings();
    fetchArticles();
  }, []);

  const fetchSettings = () => {
    fetch(`/v1/settings?t=${Date.now()}`, {
      headers: { 'x-client-id': localStorage.getItem('ps_client_id') || 'platform-prime' }
    })
      .then(res => res.json())
      .then(data => {
        const settingsData = data?.success ? data.data : data;
        // Make sure workingHours has at least default elements if missing
        if (settingsData && (!settingsData.workingHours || settingsData.workingHours.length === 0)) {
          settingsData.workingHours = Array.from({ length: 7 }, (_, i) => ({
            day: i,
            isOpen: i !== 0 && i !== 6, // Open Mon-Fri by default
            openTime: '08:00',
            closeTime: '17:00'
          }));
        }

        // Initialize multi-database array if missing
        if (settingsData && !settingsData.externalDatabases) {
          settingsData.externalDatabases = [];
          if (settingsData.externalDbConfig?.enabled) {
            settingsData.externalDatabases.push(settingsData.externalDbConfig);
          }
        }

        setSettings(settingsData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Settings load error:', err);
        setLoading(false);
      });
  };

  const handleSave = async (explicitSettings?: any) => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Detect if explicitSettings is actually a click event or other event object to prevent circular structure serialization
      const isEvent = explicitSettings && (explicitSettings.nativeEvent || explicitSettings.target || typeof explicitSettings.preventDefault === 'function');
      const targetSettings = isEvent ? undefined : explicitSettings;

      // Clean internal fields
      const cleanSettings = { ...(targetSettings || settings) };
      
      const payload = {
        externalDbConfig: cleanSettings.externalDbConfig,
        externalDatabases: cleanSettings.externalDatabases
      };

      const res = await fetch('/v1/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': settings.clientId || ''
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data?.success) {
        setSettings(data.data);
      }
      setSaveSuccess(true);
      // Reload sandbox immediately
      setPlaygroundKey(prev => prev + 1);
      setTimeout(() => setSaveSuccess(false), 3050);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  // AI-powered guidelines polisher
  const handlePolishPrompt = async () => {
    setPolishing(true);
    try {
      const response = await fetch('/v1/ai/generate-branding', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': settings.clientId || ''
        },
        body: JSON.stringify({
          prompt: `Generate an elite, professional System Role instruction prompt (acting as an AI Assistant) for the business "${settings.businessName || 'the user\'s business'}". Enforce lead-retention, booking inquiries, clear service rates coordination, and helpful customer support routing. Do not output JSON, return only the prompt text ruleset itself.`
        })
      });
      const data = await response.json();
      if (data?.success && data?.result?.aiBehaviorInstructions) {
        updateField('aiBehaviorInstructions', data.result.aiBehaviorInstructions);
      } else if (data?.success && data?.result?.heroSubtitle) {
        updateField('aiBehaviorInstructions', data.result.heroSubtitle);
      } else if (data?.result) {
        // Fallback checks
        const resultText = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
        updateField('aiBehaviorInstructions', resultText);
      } else {
        const fallbackPrompt = `You are the chief AI Assistant for ${settings.businessName || 'this business'}.\n\nDirectives:\n1. Promptly answer any user questions based on the Services Catalog.\n2. Help schedule appointments by calling check_availability and book_appointment.\n3. Transfer to human tickets for highly specific, custom, or complex inquiries.\n4. Maintain a highly clear, professional, and friendly tone.`;
        updateField('aiBehaviorInstructions', fallbackPrompt);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPolishing(false);
    }
  };

  const getDayName = (dayNum: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="font-semibold text-sm">Synchronizing prompt and knowledge base models...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 border border-red-100 rounded-2xl max-w-lg mx-auto mt-12 flex items-center gap-3">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-bold">Error Loading Context</h3>
          <p className="text-xs opacity-90">Please reload the index page or verify your tenant access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Agent Knowledge Base</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Train your AI agent, configure the FAQ knowledge corpus, and simulate live performance in the workspace sandbox.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            id="apply-changes-btn"
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer active:scale-95",
              saveSuccess 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20" 
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
            )}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" /> Changes Applied Live!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Apply Changes Live
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile-only view toggle between Configuration and Playground */}
      <div className="flex md:hidden bg-slate-200/50 p-1 rounded-2xl gap-1 mb-6 border border-slate-200">
        <button
          onClick={() => setMobileView('config')}
          className={cn(
            "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
            mobileView === 'config' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
          )}
        >
          Config
        </button>
        <button
          onClick={() => setMobileView('sandbox')}
          className={cn(
            "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
            mobileView === 'sandbox' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
          )}
        >
          Sandbox
        </button>
      </div>

      {/* Database Connection Modal */}
      <AnimatePresence>
        {isConnectModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConnectModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{activeDbIndex !== null ? 'Edit Database Connection' : 'New Database Connection'}</h3>
                    <p className="text-xs text-slate-500">Connect your live data source to OminiRep.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsConnectModalOpen(false);
                    setActiveDbIndex(null);
                  }}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Connection Method Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-2xl w-fit gap-1">
                  <button
                    onClick={() => setDbConnectionTab('url')}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      dbConnectionTab === 'url' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Quick URL
                  </button>
                  <button
                    onClick={() => setDbConnectionTab('manual')}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      dbConnectionTab === 'manual' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Manual Setup
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest font-sans flex items-center justify-between">
                      Database Name
                      <span className="text-[8px] text-indigo-500">Required</span>
                    </label>
                    <input
                      type="text"
                      value={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.name : settings.externalDbConfig?.name) || ''}
                      onChange={e => {
                        if (activeDbIndex !== null && activeDbIndex >= 0) {
                          const newDbs = [...settings.externalDatabases];
                          newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], name: e.target.value };
                          updateField('externalDatabases', newDbs);
                        } else {
                          updateField('externalDbConfig', { ...settings.externalDbConfig, name: e.target.value });
                        }
                      }}
                      placeholder="e.g. Production SQL Server"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest font-sans flex items-center justify-between">
                      Database Description
                      <span className="text-[8px] text-indigo-500">Required</span>
                    </label>
                    <textarea
                      value={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.description : settings.externalDbConfig?.description) || ''}
                      onChange={e => {
                        if (activeDbIndex !== null && activeDbIndex >= 0) {
                          const newDbs = [...settings.externalDatabases];
                          newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], description: e.target.value };
                          updateField('externalDatabases', newDbs);
                        } else {
                          updateField('externalDbConfig', { ...settings.externalDbConfig, description: e.target.value });
                        }
                      }}
                      placeholder="Describe what this database contains and its purpose..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[80px]"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest font-sans flex items-center justify-between">
                      AI System Instructions
                      <span className="text-[8px] text-indigo-500">Required</span>
                    </label>
                    <textarea
                      value={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.aiInstructions : settings.externalDbConfig?.aiInstructions) || ''}
                      onChange={e => {
                        if (activeDbIndex !== null && activeDbIndex >= 0) {
                          const newDbs = [...settings.externalDatabases];
                          newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], aiInstructions: e.target.value };
                          updateField('externalDatabases', newDbs);
                        } else {
                          updateField('externalDbConfig', { ...settings.externalDbConfig, aiInstructions: e.target.value });
                        }
                      }}
                      placeholder="Instructions for the AI on how to interpret and interact with this specific data source..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[100px]"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest font-sans flex items-center justify-between">
                      AI Usage Notes
                      <span className="text-[8px] text-indigo-500">Required</span>
                    </label>
                    <textarea
                      value={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.aiUsageNotes : settings.externalDbConfig?.aiUsageNotes) || ''}
                      onChange={e => {
                        if (activeDbIndex !== null && activeDbIndex >= 0) {
                          const newDbs = [...settings.externalDatabases];
                          newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], aiUsageNotes: e.target.value };
                          updateField('externalDatabases', newDbs);
                        } else {
                          updateField('externalDbConfig', { ...settings.externalDbConfig, aiUsageNotes: e.target.value });
                        }
                      }}
                      placeholder="Notes on when the AI should use this database vs others..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest font-sans">Database Type</label>
                    <select
                      value={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.type : settings.externalDbConfig?.type) || 'postgres'}
                      onChange={e => {
                        if (activeDbIndex !== null && activeDbIndex >= 0) {
                          const newDbs = [...settings.externalDatabases];
                          newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], type: e.target.value };
                          updateField('externalDatabases', newDbs);
                        } else {
                          updateField('externalDbConfig', { ...settings.externalDbConfig, type: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none font-sans"
                    >
                      <option value="postgres">PostgreSQL</option>
                      <option value="mysql">MySQL</option>
                      <option value="mongodb">MongoDB</option>
                      <option value="sqlserver">MS SQL Server</option>
                    </select>
                  </div>

                  {dbConnectionTab === 'url' ? (
                    <div className="md:col-span-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest font-sans">Connection URL</label>
                      <input
                        type="text"
                        value={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.connectionString : settings.externalDbConfig?.connectionString) || ''}
                        onChange={e => {
                          if (activeDbIndex !== null && activeDbIndex >= 0) {
                            const newDbs = [...settings.externalDatabases];
                            newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], connectionString: e.target.value };
                            updateField('externalDatabases', newDbs);
                          } else {
                            updateField('externalDbConfig', { ...settings.externalDbConfig, connectionString: e.target.value });
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white"
                        placeholder="postgres://user:pass@host:port/database"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest font-sans">Connection Host</label>
                        <input
                          type="text"
                          value={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.host : settings.externalDbConfig?.host) || ''}
                          onChange={e => {
                            if (activeDbIndex !== null && activeDbIndex >= 0) {
                              const newDbs = [...settings.externalDatabases];
                              newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], host: e.target.value };
                              updateField('externalDatabases', newDbs);
                            } else {
                              updateField('externalDbConfig', { ...settings.externalDbConfig, host: e.target.value });
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white"
                          placeholder="e.g. database.example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest font-sans">Port</label>
                        <input
                          type="number"
                          value={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.port : settings.externalDbConfig?.port) || ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (activeDbIndex !== null && activeDbIndex >= 0) {
                              const newDbs = [...settings.externalDatabases];
                              newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], port: val };
                              updateField('externalDatabases', newDbs);
                            } else {
                              updateField('externalDbConfig', { ...settings.externalDbConfig, port: val });
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white"
                          placeholder="Default: 5432"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest font-sans">Database Name</label>
                        <input
                          type="text"
                          value={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.database : settings.externalDbConfig?.database) || ''}
                          onChange={e => {
                            if (activeDbIndex !== null && activeDbIndex >= 0) {
                              const newDbs = [...settings.externalDatabases];
                              newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], database: e.target.value };
                              updateField('externalDatabases', newDbs);
                            } else {
                              updateField('externalDbConfig', { ...settings.externalDbConfig, database: e.target.value });
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white font-sans"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">Username</label>
                        <input
                          type="text"
                          value={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.user : settings.externalDbConfig?.user) || ''}
                          onChange={e => {
                            if (activeDbIndex !== null && activeDbIndex >= 0) {
                              const newDbs = [...settings.externalDatabases];
                              newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], user: e.target.value };
                              updateField('externalDatabases', newDbs);
                            } else {
                              updateField('externalDbConfig', { ...settings.externalDbConfig, user: e.target.value });
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">Password</label>
                        <input
                          type="password"
                          value={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.password : settings.externalDbConfig?.password) || ''}
                          onChange={e => {
                            if (activeDbIndex !== null && activeDbIndex >= 0) {
                              const newDbs = [...settings.externalDatabases];
                              newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], password: e.target.value };
                              updateField('externalDatabases', newDbs);
                            } else {
                              updateField('externalDbConfig', { ...settings.externalDbConfig, password: e.target.value });
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Security Settings</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-white transition-all">
                      <input
                        type="checkbox"
                        checked={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.ssl : settings.externalDbConfig?.ssl) || false}
                        onChange={e => {
                          const val = e.target.checked;
                          if (activeDbIndex !== null && activeDbIndex >= 0) {
                            const newDbs = [...settings.externalDatabases];
                            newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], ssl: val };
                            updateField('externalDatabases', newDbs);
                          } else {
                            updateField('externalDbConfig', { ...settings.externalDbConfig, ssl: val });
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900">Enable SSL</div>
                        <div className="text-[10px] text-slate-500">Encrypt connection</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-white transition-all">
                      <input
                        type="checkbox"
                        checked={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.rejectUnauthorized : settings.externalDbConfig?.rejectUnauthorized) || false}
                        onChange={e => {
                          const val = e.target.checked;
                          if (activeDbIndex !== null && activeDbIndex >= 0) {
                            const newDbs = [...settings.externalDatabases];
                            newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], rejectUnauthorized: val };
                            updateField('externalDatabases', newDbs);
                          } else {
                            updateField('externalDbConfig', { ...settings.externalDbConfig, rejectUnauthorized: val });
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900">Strict Verification</div>
                        <div className="text-[10px] text-slate-500">Validate certificate</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setIsConnectModalOpen(false);
                    setActiveDbIndex(null);
                  }}
                  className="px-6 py-2.5 text-xs font-black uppercase text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    let updatedSettings: any;
                    let finalIndex = activeDbIndex;
                    if (activeDbIndex !== null && activeDbIndex >= 0) {
                      const newDbs = [...settings.externalDatabases];
                      newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], enabled: true };
                      updatedSettings = { ...settings, externalDatabases: newDbs };
                    } else if (activeDbIndex === -1) {
                      const updatedDb = { ...settings.externalDbConfig, enabled: true };
                      updatedSettings = { ...settings, externalDbConfig: updatedDb };
                    } else {
                      // If it's a new database, we push to externalDatabases
                      const newDb = { ...settings.externalDbConfig, enabled: true };
                      const currentDbs = Array.isArray(settings.externalDatabases) ? settings.externalDatabases : [];
                      finalIndex = currentDbs.length;
                      updatedSettings = { 
                        ...settings, 
                        externalDatabases: [...currentDbs, newDb],
                        externalDbConfig: {
                          enabled: false,
                          name: '',
                          description: '',
                          type: 'postgres',
                          host: '',
                          port: '5432',
                          database: '',
                          user: '',
                          password: '',
                          ssl: true,
                          rejectUnauthorized: false
                        }
                      };
                    }
                    
                    setSettings(updatedSettings);
                    await handleSave(updatedSettings);
                    if (finalIndex !== null) {
                      setActiveDbIndex(finalIndex);
                      await fetchTables(finalIndex);
                    }
                    setIsConnectModalOpen(false);
                  }}
                  disabled={fetchingTables}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {fetchingTables ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save & Test Connection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Table Security Modal */}
      <AnimatePresence>
        {configuringTable && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfiguringTable(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Table Security</h3>
                    <p className="text-xs text-slate-500 font-medium">{configuringTable}</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfiguringTable(null)}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-900">AI Data Sync</div>
                    <p className="text-[10px] text-slate-500 font-medium">Allow the assistant to query records from this table.</p>
                  </div>
                  <button
                    onClick={() => {
                      const dbConfig = (activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex] : settings.externalDbConfig;
                      const currentConfigs = dbConfig?.tableConfigs || {};
                      const tableConfig = currentConfigs[configuringTable] || { enabled: false, permission: 'none' };
                      
                      const updatedDb = {
                        ...dbConfig,
                        tableConfigs: {
                          ...currentConfigs,
                          [configuringTable]: { ...tableConfig, enabled: !tableConfig.enabled }
                        }
                      };

                      if (activeDbIndex !== null && activeDbIndex >= 0) {
                        const newDbs = [...settings.externalDatabases];
                        newDbs[activeDbIndex] = updatedDb;
                        updateField('externalDatabases', newDbs);
                      } else {
                        updateField('externalDbConfig', updatedDb);
                      }
                    }}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none",
                      ((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.tableConfigs?.[configuringTable]?.enabled : settings.externalDbConfig?.tableConfigs?.[configuringTable]?.enabled) ? "bg-indigo-600" : "bg-slate-200"
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      ((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.tableConfigs?.[configuringTable]?.enabled : settings.externalDbConfig?.tableConfigs?.[configuringTable]?.enabled) ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">Access Permission Level</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'none', label: 'No Permission', icon: Lock, desc: 'AI cannot access any data.' },
                      { id: 'read', label: 'Read Only', icon: Eye, desc: 'AI can only view records.' },
                      { id: 'write', label: 'Read & Write', icon: Plus, desc: 'AI can create or update records.' }
                    ].map(perm => (
                      <button
                        key={perm.id}
                        onClick={() => {
                          const dbConfig = (activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex] : settings.externalDbConfig;
                          const currentConfigs = dbConfig?.tableConfigs || {};
                          const tableConfig = currentConfigs[configuringTable] || { enabled: false, permission: 'none' };
                          
                          const updatedDb = {
                            ...dbConfig,
                            tableConfigs: {
                              ...currentConfigs,
                              [configuringTable]: { ...tableConfig, permission: perm.id }
                            }
                          };

                          if (activeDbIndex !== null && activeDbIndex >= 0) {
                            const newDbs = [...settings.externalDatabases];
                            newDbs[activeDbIndex] = updatedDb;
                            updateField('externalDatabases', newDbs);
                          } else {
                            updateField('externalDbConfig', updatedDb);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border text-left transition-all cursor-pointer",
                          (((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.tableConfigs?.[configuringTable]?.permission : settings.externalDbConfig?.tableConfigs?.[configuringTable]?.permission) || 'none') === perm.id
                            ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/10"
                            : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-xl",
                          (((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.tableConfigs?.[configuringTable]?.permission : settings.externalDbConfig?.tableConfigs?.[configuringTable]?.permission) || 'none') === perm.id
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-400"
                        )}>
                          <perm.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className={cn(
                            "text-xs font-bold",
                            (((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.tableConfigs?.[configuringTable]?.permission : settings.externalDbConfig?.tableConfigs?.[configuringTable]?.permission) || 'none') === perm.id ? "text-indigo-900" : "text-slate-700"
                          )}>{perm.label}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{perm.desc}</div>
                        </div>
                        {(((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.tableConfigs?.[configuringTable]?.permission : settings.externalDbConfig?.tableConfigs?.[configuringTable]?.permission) || 'none') === perm.id && (
                          <div className="ml-auto">
                            <CheckCircle className="w-5 h-5 text-indigo-600" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setConfiguringTable(null)}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Table Data Modal - Continuous Scrolling */}
      <AnimatePresence>
        {viewingTable && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 lg:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingTable(null)}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-6xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-full max-h-[90vh] border border-white/20"
            >
              <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 rounded-2xl text-slate-900 shadow-sm">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{viewingTable}</h3>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
                        Live Data Explorer
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Showing records from your connected external database.</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingTable(null)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer group"
                >
                  <X className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-0 sm:p-4 bg-slate-50/30 custom-scrollbar">
                {fetchingData ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    <p className="text-sm font-bold text-slate-500 animate-pulse uppercase tracking-widest">Querying Table...</p>
                  </div>
                ) : tableData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="p-6 bg-slate-100 rounded-full text-slate-400">
                      <Eye className="w-12 h-12" />
                    </div>
                    <p className="text-slate-500 font-bold">No records found in this table.</p>
                  </div>
                ) : (
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden shadow-sm ring-1 ring-slate-200 sm:rounded-3xl bg-white">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            {Object.keys(tableData[0]).map(key => (
                              <th key={key} className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {tableData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              {Object.values(row).map((val: any, j) => (
                                <td key={j} className="px-6 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap overflow-hidden max-w-[200px] truncate">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Infinite Scroll Sentinel */}
                    <div ref={observerTarget} className="h-20 flex items-center justify-center">
                      {fetchingData && tableData.length > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading more records...
                        </div>
                      )}
                      {!hasMoreData && tableData.length > 0 && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <CheckCircle className="w-3 h-3" />
                          End of Dataset
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column: Context Editors */}
        <div className={cn("md:col-span-6 lg:col-span-7 space-y-8", mobileView === 'sandbox' && "hidden md:block")}>
          {/* Tab Selector */}
          <div className="relative flex items-center pb-2 mb-4">
            {showLeftArrow && (
              <button 
                onClick={() => scrollTabs('left')}
                className="absolute left-0 z-10 p-2 bg-gradient-to-r from-slate-50 via-slate-50 to-transparent"
              >
                <div className="w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </div>
              </button>
            )}
            <div 
              ref={tabsContainerRef}
              onScroll={checkScroll}
              className="flex overflow-x-auto gap-2 scrollbar-none scroll-smooth px-1 flex-1"
            >
              {[
                { id: 'persona', label: 'CSR Persona', icon: Sliders },
                { id: 'knowledge', label: 'Knowledge Base', icon: Brain },
                { id: 'database', label: 'External Database', icon: Database },
                { id: 'faqs', label: 'FAQ Knowledge', icon: HelpCircle }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-5 py-3 text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-2 border cursor-pointer shrink-0 uppercase tracking-wider",
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10"
                        : "bg-white border-slate-200 text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            {showRightArrow && (
              <button 
                onClick={() => scrollTabs('right')}
                className="absolute right-0 z-10 p-2 bg-gradient-to-l from-slate-50 via-slate-50 to-transparent"
              >
                <div className="w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </button>
            )}
          </div>

          {/* TAB 1: Chatbot UI & Persona */}
          {activeTab === 'persona' && (
            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-sans">CSR Persona</h2>
                  <p className="text-xs text-slate-500 mt-1 font-sans">Configure your chatbot identity, human persona, and brand personality.</p>
                </div>
              </div>

              {/* Chatbot Name and Color Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left font-sans">Chatbot Identity Name</label>
                    <input
                      type="text"
                      value={settings.chatbotTitle || ''}
                      onChange={e => updateField('chatbotTitle', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold font-sans"
                      placeholder="e.g. AI Receptionist"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left font-sans">Rep Human Name</label>
                    <input
                      type="text"
                      value={settings.chatbotName || ''}
                      onChange={e => updateField('chatbotName', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold font-sans"
                      placeholder="e.g. Mark, Sarah, Alex"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">Rep Gender Identity</label>
                    <select
                      value={settings.chatbotGender || 'Male'}
                      onChange={e => updateField('chatbotGender', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Gender fluid / Non-binary">Non-binary / Neutral</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">Brand Accent Color</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="color"
                        value={settings.chatbotPrimaryColor || '#6366f1'}
                        onChange={e => updateField('chatbotPrimaryColor', e.target.value)}
                        className="w-full sm:w-12 h-11 bg-transparent border-0 rounded-xl cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={settings.chatbotPrimaryColor || '#6366f1'}
                        onChange={e => updateField('chatbotPrimaryColor', e.target.value)}
                        className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 sm:py-0 text-sm font-mono focus:bg-white transition-all text-left"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">Rep Personality, Motivation & Emotional Tone</label>
                <textarea
                  value={settings.chatbotPersonality || ''}
                  onChange={e => updateField('chatbotPersonality', e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                  placeholder="e.g. Highly empathetic, polite, motivated to convert warm leads, active listener, values-driven..."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">Chatbot Description / Subtitle</label>
                <input
                  type="text"
                  value={settings.chatbotSubtitle || ''}
                  onChange={e => updateField('chatbotSubtitle', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                  placeholder="e.g. Digital Assistant or Support Team"
                />
              </div>

              {/* Chatbot Image Avatar Photo Editor */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">Professional Representative Photo / Avatar</label>
                <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 md:gap-6">
                  {/* Current Avatar Frame */}
                  <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center shadow-inner relative group shrink-0 overflow-hidden">
                    {uploadingImage ? (
                      <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                    ) : settings.chatbotAvatar ? (
                      <img src={settings.chatbotAvatar} className="w-full h-full object-cover rounded-full" alt="Bot Avatar" />
                    ) : (
                      <Bot className="w-8 h-8 text-indigo-500" />
                    )}
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    {/* URL Input */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center sm:text-left">Avatar Image URL</div>
                      <input
                        type="text"
                        value={settings.chatbotAvatar || ''}
                        onChange={e => updateField('chatbotAvatar', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono"
                        placeholder="https://example.com/photo.jpg"
                      />
                    </div>

                    {/* Image Uploader Control */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 w-full sm:w-auto bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 text-indigo-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingImage ? 'Uploading...' : 'Upload Custom Photo'}
                      </button>

                      {settings.chatbotAvatar && (
                        <button
                          type="button"
                          onClick={() => updateField('chatbotAvatar', '')}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold py-2 sm:py-0 w-full sm:w-auto text-center"
                        >
                          Clear Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preset Avatar Fast Selector */}
                <div className="pt-3 border-t border-slate-200/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Or Select Professional Preset Representation</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {avatarPresets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => updateField('chatbotAvatar', preset.url)}
                        className={cn(
                          "flex items-center gap-2 p-1.5 rounded-xl border bg-white transition-all text-left group hover:border-indigo-300 cursor-pointer",
                          settings.chatbotAvatar === preset.url ? "border-indigo-500 shadow-sm ring-1 ring-indigo-500/20" : "border-slate-200"
                        )}
                      >
                        <img src={preset.url} className="w-7 h-7 rounded-full object-cover shrink-0" alt="Preset" />
                        <span className="text-[10px] font-semibold text-slate-700 truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chatbot Icon dropdown */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left font-sans">Representative Display Icon (Fallback)</label>
                <select
                  value={settings.chatbotIcon || 'User'}
                  onChange={e => updateField('chatbotIcon', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                >
                  <option value="User">Professional CSR (User)</option>
                  <option value="Building">Corporate Service Agent</option>
                  <option value="MessageCircle">Conversation Expert</option>
                  <option value="Sparkles">Magic Astral Rep</option>
                  <option value="Cpu">Default Tech Orb</option>
                </select>
              </div>

              {/* Chatbot Greeting Area */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">Introduction Greeting / Welcome Message</label>
                <textarea
                  rows={2}
                  value={settings.chatbotGreeting || ''}
                  onChange={e => updateField('chatbotGreeting', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left leading-relaxed font-sans"
                  placeholder="e.g. Hello! I'm here to assist you with any questions about our services or available slots. How can I help you today?"
                />
              </div>

              {/* AI Rulesets */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">AI System Guidelines & Prompt Directives</label>
                  <button
                    type="button"
                    onClick={handlePolishPrompt}
                    disabled={polishing}
                    className="flex items-center gap-1 text-[10px] uppercase font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 sm:px-2.5 py-2 sm:py-1.5 border border-indigo-200/50 cursor-pointer w-full sm:w-auto justify-center"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600/80 animate-pulse" /> 
                    {polishing ? 'Generating...' : 'AI Prompt Polisher'}
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={settings.aiBehaviorInstructions || ''}
                  onChange={e => updateField('aiBehaviorInstructions', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left"
                  placeholder="Explain chatbot's personality, goals, security, policies..."
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-150 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving...' : 'Save Chatbot Persona & Appearance'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Knowledge Base */}
          {activeTab === 'knowledge' && (
            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Knowledge Base tab</h2>
                  <p className="text-xs text-slate-500 mt-1">Add knowledge segments manually to feed your AI with specific business knowledge.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <input
                    type="file"
                    ref={knowledgeInputRef}
                    onChange={handleKnowledgeUpload}
                    accept=".pdf,.txt,.docx,.xlsx"
                    className="hidden"
                  />
                  <button
                    onClick={() => knowledgeInputRef.current?.click()}
                    disabled={uploadingKnowledge}
                    className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingKnowledge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload Training File
                  </button>
                  <button
                    onClick={fetchArticles}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shrink-0"
                    title="Refresh List"
                  >
                    <RefreshCw className={cn("w-4 h-4", fetchingArticles && "animate-spin")} />
                  </button>
                </div>
              </div>

              {/* Bulk Actions Bar */}
              <AnimatePresence mode="wait">
                {isSelectionMode ? (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-indigo-600 p-3 sm:p-4 rounded-2xl shadow-lg text-white mb-2"
                  >
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setSelectedArticles([])}
                        className="p-2 hover:bg-indigo-500 rounded-xl transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <span className="font-black text-sm uppercase tracking-wider">
                        {selectedArticles.length} Selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const allIds = knowledgeArticles.map(a => a._id);
                          setSelectedArticles(allIds);
                        }}
                        className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 px-3 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">Select All</span>
                      </button>
                      <button
                        onClick={handleBulkDeleteArticles}
                        className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 px-3 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="space-y-4">
                {fetchingArticles ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Loading articles...</span>
                  </div>
                ) : knowledgeArticles.length === 0 ? (
                  <div className="py-16 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                    <div className="bg-slate-50 p-4 rounded-full text-slate-300">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">No Knowledge Articles</h4>
                      <p className="text-[10px] text-slate-500 max-w-[240px] mx-auto mt-1 leading-relaxed">
                        Add your first knowledge article manually to start building your AI's semantic brain.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {knowledgeArticles.map((article) => {
                      const isSelected = selectedArticles.includes(article._id);

                      return (
                        <LongPressWrapper 
                          key={article._id}
                          disabled={isSelectionMode}
                          onLongPress={() => handleLongPress(article._id)}
                          onClick={() => handleCardClick(article)}
                          layoutId={article._id}
                          className={cn(
                            "group bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 p-4 rounded-2xl transition-all flex items-center justify-between shadow-xs cursor-pointer relative",
                            isSelected && "border-indigo-500 ring-2 ring-indigo-500 ring-inset bg-indigo-50/10"
                          )}
                        >
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <AnimatePresence>
                              {isSelectionMode && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  className="shrink-0"
                                >
                                  <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all",
                                    isSelected 
                                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                                      : "bg-white border-slate-200 text-transparent"
                                  )}>
                                    <Check className="w-4 h-4" />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <div className="bg-white p-2.5 rounded-xl shadow-sm text-indigo-600 shrink-0">
                              <Brain className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate pr-4">{article.title}</h4>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                  {article.content.length} characters
                                </span>
                                <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Vectorized
                                </span>
                              </div>
                            </div>
                          </div>
                          {!isSelectionMode && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteArticle(article._id); }}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Delete Segment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </LongPressWrapper>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: External Database */}
          {activeTab === 'database' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {activeDbIndex === null ? (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">External Database Ecosystem</h2>
                      <p className="text-xs text-slate-500 mt-1 font-medium">Manage all your connected live data sources and their AI interactions.</p>
                    </div>
                    <button
                      onClick={() => setIsConnectModalOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      Add Database
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Primary Database (Legacy/Primary) */}
                    {settings.externalDbConfig?.enabled && (
                      <div 
                        onClick={() => setActiveDbIndex(-1)}
                        className="group bg-slate-50 hover:bg-white border border-slate-100 hover:border-indigo-300 p-6 rounded-[2rem] transition-all cursor-pointer shadow-sm relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-indigo-600">
                            <Database className="w-6 h-6" />
                          </div>
                          <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Connected
                          </div>
                        </div>
                        <h3 className="font-bold text-slate-900 truncate mb-1">{settings.externalDbConfig.name || 'Primary Database'}</h3>
                        <p className="text-[11px] text-slate-500 line-clamp-2 min-h-[32px]">{settings.externalDbConfig.description || 'Main operational data source.'}</p>
                        <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                          <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{settings.externalDbConfig.type || 'SQL'}</div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </div>
                    )}

                    {/* Additional Databases */}
                    {(settings.externalDatabases || []).map((db: any, index: number) => (
                      <div 
                        key={index}
                        onClick={() => setActiveDbIndex(index)}
                        className="group bg-slate-50 hover:bg-white border border-slate-100 hover:border-indigo-300 p-6 rounded-[2rem] transition-all cursor-pointer shadow-sm relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-indigo-600">
                            <Database className="w-6 h-6" />
                          </div>
                          <div className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                            db.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                          )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", db.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                            {db.enabled ? 'Connected' : 'Offline'}
                          </div>
                        </div>
                        <h3 className="font-bold text-slate-900 truncate mb-1">{db.name || `Database #${index + 1}`}</h3>
                        <p className="text-[11px] text-slate-500 line-clamp-2 min-h-[32px]">{db.description || 'No description provided.'}</p>
                        <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                          <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{db.type || 'SQL'}</div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </div>
                    ))}

                    {/* Add New Button */}
                    <div 
                      onClick={() => setIsConnectModalOpen(true)}
                      className="group border-2 border-dashed border-slate-200 hover:border-indigo-300 p-6 rounded-[2rem] flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:bg-indigo-50/30"
                    >
                      <div className="p-4 bg-slate-50 group-hover:bg-indigo-100 rounded-full text-slate-300 group-hover:text-indigo-600 transition-all mb-4">
                        <Plus className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-slate-400 group-hover:text-indigo-600 transition-all text-sm">Add New Connection</h3>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Detail Header */}
                  <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/30">
                    <button 
                      onClick={() => setActiveDbIndex(null)}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 mb-6 transition-colors group"
                    >
                      <X className="w-3.5 h-3.5" />
                      Back to Database List
                    </button>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="p-4 bg-indigo-600 rounded-[1.5rem] text-white shadow-xl shadow-indigo-600/20 shrink-0">
                          <Database className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                              {activeDbIndex === null ? settings.externalDbConfig.name : settings.externalDatabases[activeDbIndex]?.name}
                            </h2>
                            <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">
                              Live
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 font-medium max-w-2xl">
                            {activeDbIndex === null ? settings.externalDbConfig.description : settings.externalDatabases[activeDbIndex]?.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={async () => {
                            const dbIndex = activeDbIndex;
                            let updatedSettings: any;
                            if (dbIndex === -1) {
                              updatedSettings = {
                                ...settings,
                                externalDbConfig: { ...settings.externalDbConfig, enabled: false }
                              };
                            } else if (dbIndex !== null) {
                              const newDbs = [...settings.externalDatabases];
                              newDbs[dbIndex] = { ...newDbs[dbIndex], enabled: false };
                              updatedSettings = { ...settings, externalDatabases: newDbs };
                            } else {
                              return;
                            }
                            setSettings(updatedSettings);
                            await handleSave(updatedSettings);
                            setActiveDbIndex(null);
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border border-rose-100 flex items-center gap-2 cursor-pointer shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Disconnect
                        </button>
                        <button
                          onClick={() => setIsConnectModalOpen(true)}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                        >
                          <Sliders className="w-4 h-4" />
                          Edit Settings
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-8">
                    {/* Database Sub-tabs */}
                    <div className="relative flex items-center mb-6">
                      {showDbLeftArrow && (
                        <button 
                          onClick={() => scrollDbSubTabs('left')}
                          className="absolute left-0 z-10 p-1.5 bg-gradient-to-r from-white via-white to-transparent"
                        >
                          <div className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                            <ChevronLeft className="w-3 h-3 text-slate-600" />
                          </div>
                        </button>
                      )}
                      <div 
                        ref={dbSubTabsRef}
                        onScroll={checkDbSubTabScroll}
                        className="overflow-x-auto scrollbar-none flex-1 px-1"
                      >
                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit whitespace-nowrap">
                          {[
                            { id: 'settings', label: 'Connection', icon: Database },
                            { id: 'tables', label: 'Tables & Permissions', icon: Layout },
                            { id: 'security', label: 'AI Security', icon: Shield }
                          ].map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setDbSubTab(tab.id as any)}
                              className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                                dbSubTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                              )}
                            >
                              <tab.icon className="w-3.5 h-3.5" />
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {showDbRightArrow && (
                        <button 
                          onClick={() => scrollDbSubTabs('right')}
                          className="absolute right-0 z-10 p-1.5 bg-gradient-to-l from-white via-white to-transparent"
                        >
                          <div className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                            <ChevronRight className="w-3 h-3 text-slate-600" />
                          </div>
                        </button>
                      )}
                    </div>

                    {dbSubTab === 'settings' && (
                      <div className="space-y-8 animate-in fade-in duration-300">
                        {/* AI Context Card */}
                        <div className="bg-indigo-50/50 rounded-3xl border border-indigo-100 p-6 space-y-6">
                          <div className="flex items-center gap-3 border-b border-indigo-100 pb-4">
                            <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900">AI Context & Training Instructions</h3>
                              <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Active Instructions for Agent</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">System Prompt Directives</label>
                              <div className="p-4 bg-white rounded-2xl border border-indigo-100 text-xs text-slate-700 leading-relaxed min-h-[100px] font-medium shadow-sm">
                                {activeDbIndex === null ? settings.externalDbConfig.aiInstructions : settings.externalDatabases[activeDbIndex]?.aiInstructions}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">AI Usage & Trigger Notes</label>
                              <div className="p-4 bg-white rounded-2xl border border-indigo-100 text-xs text-slate-700 leading-relaxed min-h-[100px] font-medium shadow-sm">
                                {activeDbIndex === null ? settings.externalDbConfig.aiUsageNotes : settings.externalDatabases[activeDbIndex]?.aiUsageNotes}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm group">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Connection Status</div>
                            <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                              <CheckCircle className="w-5 h-5" /> Live & Verified
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">Latency: ~24ms</p>
                          </div>
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Host Address</div>
                            <div className="text-slate-900 font-bold text-lg truncate">
                              {activeDbIndex === null ? settings.externalDbConfig.host : settings.externalDatabases[activeDbIndex]?.host || 'Direct URL'}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">Type: {activeDbIndex === null ? settings.externalDbConfig.type : settings.externalDatabases[activeDbIndex]?.type}</p>
                          </div>
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Schema Analysis</div>
                            <div className="text-slate-900 font-bold text-lg">
                              {dbTables.length} Tables Found
                            </div>
                            <button onClick={() => fetchTables()} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 tracking-widest mt-2 flex items-center gap-1 transition-all">
                              <RefreshCw className={cn("w-3 h-3", fetchingTables && "animate-spin")} /> Re-scan Now
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {dbSubTab === 'tables' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Automatic AI Access</h4>
                            <p className="text-[10px] text-slate-500">Quickly enable AI read access for all detected tables.</p>
                          </div>
                          <button 
                            onClick={giveAllAccess}
                            disabled={dbTables.length === 0}
                            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            Give AI Access to All Tables
                          </button>
                        </div>

                        {fetchingTables ? (
                          <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Scanning Database Tables...</p>
                          </div>
                        ) : dbTables.length === 0 ? (
                          <div className="py-20 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4">
                            <div className="bg-slate-50 p-5 rounded-full text-slate-300">
                              <Database className="w-10 h-10" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-slate-900">No Tables Detected</h4>
                              <p className="text-xs text-slate-500 max-w-[280px] mx-auto mt-2 leading-relaxed">
                                The connection was successful, but we couldn't find any tables. Ensure your database user has "SELECT" permissions on the schema.
                              </p>
                            </div>
                            <button onClick={() => fetchTables()} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Retry Full Scan</button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {dbTables.map(table => {
                              const dbConfig = (activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex] : settings.externalDbConfig;
                              const config = dbConfig?.tableConfigs?.[table] || { enabled: false, permission: 'none' };
                              return (
                                <div
                                  key={table}
                                  onClick={() => exploreData(table)}
                                  className={cn(
                                    "group p-6 rounded-[2rem] border transition-all relative overflow-hidden cursor-pointer",
                                    config.enabled ? "bg-white border-slate-200 shadow-sm hover:border-indigo-300" : "bg-slate-50/50 border-slate-100 opacity-80 hover:opacity-100 hover:bg-white"
                                  )}
                                >
                                  <div className="flex items-center justify-between mb-4">
                                    <div className={cn(
                                      "p-3 rounded-2xl transition-colors shadow-sm",
                                      config.enabled ? "bg-indigo-50 text-indigo-600" : "bg-white text-slate-400"
                                    )}>
                                      <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setConfiguringTable(table); }}
                                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer shadow-sm bg-white"
                                        title="Table Security"
                                      >
                                        <Shield className="w-4 h-4" />
                                      </button>
                                      <div className="p-2.5 text-slate-400 group-hover:text-indigo-600 rounded-xl transition-all shadow-sm bg-white">
                                        <Eye className="w-4 h-4" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="font-bold text-slate-900 truncate pr-2">{table}</div>
                                  <div className="flex items-center gap-3 mt-3">
                                    <div className={cn(
                                      "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                                      config.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                                    )}>
                                      {config.enabled ? 'AI Sync Active' : 'Access Restricted'}
                                    </div>
                                    {config.enabled && (
                                      <div className="text-[9px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                        {config.permission}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {dbSubTab === 'security' && (
                      <div className="space-y-10 animate-in fade-in duration-300">
                        {/* Connection Security */}
                        <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-8">
                          <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
                              <Shield className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-900">Security & Encryption Shield</h3>
                              <p className="text-xs text-slate-500 font-medium">Configure advanced encryption and identity verification for this source.</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-200 shadow-sm transition-all hover:border-indigo-200">
                                <div className="space-y-1 pr-4">
                                  <div className="text-sm font-bold text-slate-900">Mandatory SSL Encryption</div>
                                  <p className="text-[10px] text-slate-500 leading-relaxed">Require TLS/SSL for all data in transit. Prevents man-in-the-middle attacks.</p>
                                </div>
                                <button
                                  onClick={() => {
                                    if (activeDbIndex !== null && activeDbIndex >= 0) {
                                      const newDbs = [...settings.externalDatabases];
                                      newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], ssl: !newDbs[activeDbIndex].ssl };
                                      updateField('externalDatabases', newDbs);
                                    } else {
                                      updateField('externalDbConfig', { ...settings.externalDbConfig, ssl: !settings.externalDbConfig.ssl });
                                    }
                                  }}
                                  className={cn(
                                    "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none",
                                    ((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.ssl : settings.externalDbConfig.ssl) ? "bg-indigo-600" : "bg-slate-200"
                                  )}
                                >
                                  <span className={cn(
                                    "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                    ((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.ssl : settings.externalDbConfig.ssl) ? "translate-x-5" : "translate-x-0"
                                  )} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-200 shadow-sm transition-all hover:border-indigo-200">
                                <div className="space-y-1 pr-4">
                                  <div className="text-sm font-bold text-slate-900">Strict Server Verification</div>
                                  <p className="text-[10px] text-slate-500 leading-relaxed">Reject connection if the remote server certificate is self-signed or invalid.</p>
                                </div>
                                <button
                                  onClick={() => {
                                    if (activeDbIndex !== null && activeDbIndex >= 0) {
                                      const newDbs = [...settings.externalDatabases];
                                      newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], rejectUnauthorized: !newDbs[activeDbIndex].rejectUnauthorized };
                                      updateField('externalDatabases', newDbs);
                                    } else {
                                      updateField('externalDbConfig', { ...settings.externalDbConfig, rejectUnauthorized: !settings.externalDbConfig.rejectUnauthorized });
                                    }
                                  }}
                                  className={cn(
                                    "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none",
                                    ((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.rejectUnauthorized : settings.externalDbConfig.rejectUnauthorized) ? "bg-indigo-600" : "bg-slate-200"
                                  )}
                                >
                                  <span className={cn(
                                    "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                    ((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.rejectUnauthorized : settings.externalDbConfig.rejectUnauthorized) ? "translate-x-5" : "translate-x-0"
                                  )} />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">Root CA Certificate (PEM Format)</label>
                              <textarea
                                rows={6}
                                value={((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.ca : settings.externalDbConfig.ca) || ''}
                                onChange={e => {
                                  if (activeDbIndex !== null && activeDbIndex >= 0) {
                                    const newDbs = [...settings.externalDatabases];
                                    newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], ca: e.target.value };
                                    updateField('externalDatabases', newDbs);
                                  } else {
                                    updateField('externalDbConfig', { ...settings.externalDbConfig, ca: e.target.value });
                                  }
                                }}
                                className="w-full bg-white border border-slate-200 rounded-[1.5rem] p-5 text-[10px] font-mono outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm leading-relaxed"
                                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Verification & Compliance Security */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Shield className="w-32 h-32 text-white" />
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 border-b border-slate-800 pb-8 relative z-10">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                                <CheckCircle className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Identity Compliance Firewall</h3>
                                <p className="text-xs text-slate-400 mt-1">Enforce user verification before granting access to records from this specific DB.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={async e => {
                                const dbConfig = (activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex] : settings.externalDbConfig;
                                const val = !dbConfig.verificationEnabled;
                                
                                let updatedSettings: any;
                                if (activeDbIndex !== null && activeDbIndex >= 0) {
                                  const newDbs = [...settings.externalDatabases];
                                  newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], verificationEnabled: val };
                                  updatedSettings = { ...settings, externalDatabases: newDbs };
                                } else {
                                  updatedSettings = {
                                    ...settings,
                                    externalDbConfig: { ...settings.externalDbConfig, verificationEnabled: val }
                                  };
                                }
                                setSettings(updatedSettings);
                                await handleSave(updatedSettings);
                              }}
                              className={cn(
                                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none shadow-inner",
                                ((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.verificationEnabled : settings.externalDbConfig.verificationEnabled) ? "bg-emerald-500" : "bg-slate-700"
                              )}
                            >
                              <span className={cn(
                                "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                                ((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.verificationEnabled : settings.externalDbConfig.verificationEnabled) ? "translate-x-5" : "translate-x-0"
                              )} />
                            </button>
                          </div>

                          {((activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex]?.verificationEnabled : settings.externalDbConfig.verificationEnabled) && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 relative z-10">
                              <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Enforcement Sensitivity Level</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                                  {[
                                    { lv: 0, label: 'L0: Standard', desc: 'FAQs & Public Logs' },
                                    { lv: 1, label: 'L1: Strict', desc: 'Orders & Bookings' },
                                    { lv: 2, label: 'L2: Critical', desc: 'Invoices & Tickets' },
                                    { lv: 3, label: 'L3: Vault', desc: 'Financial Records' },
                                    { lv: 4, label: 'L4: Zero-Trust', desc: 'Corporate / Medical' }
                                  ].map((level) => {
                                    const dbConfig = (activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex] : settings.externalDbConfig;
                                    const currentLevel = dbConfig.verificationLevel || 1;
                                    const isActive = currentLevel === level.lv;
                                    
                                    return (
                                      <button
                                        key={level.lv}
                                        type="button"
                                        onClick={async () => {
                                          let updatedSettings: any;
                                          if (activeDbIndex !== null && activeDbIndex >= 0) {
                                            const newDbs = [...settings.externalDatabases];
                                            newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], verificationLevel: level.lv };
                                            updatedSettings = { ...settings, externalDatabases: newDbs };
                                          } else {
                                            updatedSettings = {
                                              ...settings,
                                              externalDbConfig: { ...settings.externalDbConfig, verificationLevel: level.lv }
                                            };
                                          }
                                          setSettings(updatedSettings);
                                          await handleSave(updatedSettings);
                                        }}
                                        className={cn(
                                          "flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all text-center h-full justify-between cursor-pointer",
                                          isActive ? "bg-emerald-500/10 border-emerald-500 text-white" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
                                        )}
                                      >
                                        <div className="text-xs font-black uppercase tracking-wider">{level.label}</div>
                                        <div className="text-[9px] opacity-70 leading-tight mt-1">{level.desc}</div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">Required Proof of Identity Fields</label>
                                
                                <div className="space-y-6">
                                  {[
                                    {
                                      category: 'Basic Verification Details',
                                      fields: [
                                        { id: 'name', label: 'Full Name' },
                                        { id: 'email', label: 'Email Address' },
                                        { id: 'phone', label: 'Phone Number' },
                                        { id: 'dob', label: 'Date of Birth' }
                                      ]
                                    },
                                    {
                                      category: 'Transactional References',
                                      fields: [
                                        { id: 'booking_reference', label: 'Booking Reference' },
                                        { id: 'order_reference', label: 'Order/Invoice ID' },
                                        { id: 'support_pin', label: 'Support PIN' },
                                        { id: 'billing_address', label: 'Billing Address / ZIP' }
                                      ]
                                    },
                                    {
                                      category: 'Advanced Security Credentials',
                                      fields: [
                                        { id: 'otp_code', label: 'SMS/Email OTP Code' },
                                        { id: 'tax_id', label: 'Last 4 digits of Tax ID/SSN' },
                                        { id: 'government_id', label: 'Government ID Number' }
                                      ]
                                    },
                                    {
                                      category: 'Enterprise & Access Policy',
                                      fields: [
                                        { id: 'company_name', label: 'Company Name' },
                                        { id: 'custom_security_answer', label: 'Security Question Answer' },
                                        { id: 'supervisor_token', label: 'Supervisor Override Token' }
                                      ]
                                    }
                                  ].map((cat, groupIdx) => (
                                    <div key={groupIdx} className="space-y-2">
                                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1">{cat.category}</h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                        {cat.fields.map(field => {
                                          const dbConfig = (activeDbIndex !== null && activeDbIndex >= 0) ? settings.externalDatabases[activeDbIndex] : settings.externalDbConfig;
                                          const activeFields = dbConfig.requiredFields || ['name', 'email'];
                                          const isChecked = activeFields.includes(field.id);
                                          
                                          return (
                                            <label key={field.id} className={cn(
                                              "flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer select-none transition-all group",
                                              isChecked ? "bg-emerald-500 border-emerald-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                            )}>
                                              <input 
                                                type="checkbox"
                                                className="hidden"
                                                checked={isChecked}
                                                onChange={async e => {
                                                  const checked = e.target.checked;
                                                  const newFields = checked 
                                                    ? [...activeFields, field.id]
                                                    : activeFields.filter((f: string) => f !== field.id);
                                                  
                                                  let updatedSettings: any;
                                                  if (activeDbIndex !== null && activeDbIndex >= 0) {
                                                    const newDbs = [...settings.externalDatabases];
                                                    newDbs[activeDbIndex] = { ...newDbs[activeDbIndex], requiredFields: newFields };
                                                    updatedSettings = { ...settings, externalDatabases: newDbs };
                                                  } else {
                                                    updatedSettings = {
                                                      ...settings,
                                                      externalDbConfig: { ...settings.externalDbConfig, requiredFields: newFields }
                                                    };
                                                  }
                                                  setSettings(updatedSettings);
                                                  await handleSave(updatedSettings);
                                                }}
                                              />
                                              <div className={cn(
                                                "w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all shadow-sm shrink-0",
                                                isChecked ? "bg-white border-white text-emerald-600" : "bg-transparent border-slate-600 text-transparent"
                                              )}>
                                                <Check className="w-3 h-3" />
                                              </div>
                                              <span className="text-xs font-bold leading-tight">{field.label}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Manual Save Actions Row for Reassurance */}
                              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-slate-400 text-xs">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Compliance parameters autosave is active</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleSave();
                                  }}
                                  disabled={saving}
                                  className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                                  {saving ? 'Saving Rules...' : 'Save Compliance Policies'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FAQs */}
          {activeTab === 'faqs' && (
            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 md:p-8 space-y-5 md:space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">FAQ Knowledge Corpus</h2>
                  <p className="text-xs text-slate-500 mt-1">Teach your AI agent precise, exact answers to highly specific customer inquiries.</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('faqs', [...(settings.faqs || []), { question: '', answer: '' }])}
                  className="w-full sm:w-auto justify-center flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Q&A Item
                </button>
              </div>

              {(!settings.faqs || settings.faqs.length === 0) ? (
                <div className="p-12 text-center border-2 border-dashed rounded-2xl border-slate-200 text-slate-400 space-y-2">
                  <HelpCircle className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-semibold text-sm">No specific FAQ items defined yet</p>
                  <p className="text-xs opacity-90">Add Q&A pairs here to feed standard knowledge directly to the LLM agent.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1 sm:pr-2">
                  {(settings.faqs || []).map((faq: any, index: number) => (
                    <div key={index} className="p-4 sm:p-5 bg-slate-50 rounded-2.5xl border border-slate-200 space-y-4 transition-all hover:bg-white hover:border-slate-300 hover:shadow-sm">
                      <div className="flex items-start gap-2">
                        <div className="space-y-2 flex-1">
                          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider text-left">Question</label>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={e => {
                              const newFaqs = [...settings.faqs];
                              newFaqs[index].question = e.target.value;
                              updateField('faqs', newFaqs);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500/25 text-left text-gray-900"
                            placeholder="e.g. Do you offer emergency 24/7 services?"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newFaqs = settings.faqs.filter((_: any, i: number) => i !== index);
                            updateField('faqs', newFaqs);
                          }}
                          className="mt-6 p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                          title="Delete FAQ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider text-left">Verified Answer</label>
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={e => {
                            const newFaqs = [...settings.faqs];
                            newFaqs[index].answer = e.target.value;
                            updateField('faqs', newFaqs);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/25 text-left leading-relaxed"
                          placeholder="Provide the precise response standard the AI agent should deliver..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-150 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving...' : 'Save FAQ Knowledge Corpus'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Chat Playground */}
        <div className={cn("md:col-span-6 lg:col-span-5 space-y-6 lg:sticky lg:top-8", mobileView === 'config' && "hidden md:block")}>
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 p-2 sm:p-6 shadow-sm flex flex-col min-h-[500px] md:min-h-[660px] h-[calc(100vh-120px)] lg:h-[calc(100vh-100px)] lg:min-h-[760px] relative">
            
            {/* Playground Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border-2 border-white shadow-sm shrink-0"></div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 truncate">
                    Agent Playground <Play className="w-3 h-3 text-indigo-500" />
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Interactive live simulation workspace</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => window.open(`${window.location.origin}/chatbot-mini?clientId=${settings.clientId}`, '_blank')}
                  className="flex-1 sm:flex-none justify-center px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-all border border-indigo-200 cursor-pointer flex items-center gap-1.5 font-bold text-[10px] sm:text-xs"
                  title="Open in New Page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open <span className="hidden sm:inline">in New Page</span></span>
                </button>
                <button
                  onClick={() => setPlaygroundKey(prev => prev + 1)}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-all border border-slate-200 cursor-pointer shrink-0"
                  title="Restart Session"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Simulated Live Frame */}
            <div className="flex-1 bg-slate-50 rounded-2xl overflow-hidden relative border border-slate-200 min-h-[300px]">
              <iframe
                key={playgroundKey}
                src={`${window.location.origin}/chatbot-mini?clientId=${settings.clientId}`}
                className="w-full h-full border-none bg-slate-50"
                title="AI Agent Live Sandbox"
              />
            </div>

            {/* Note Panel */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                <Eye className="w-3.5 h-3.5 text-indigo-500" /> Grounding Context Streamed Live
              </span>
              Click <strong className="text-slate-700">Apply Changes Live</strong> in the top panel to sync any customizations before testing.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
