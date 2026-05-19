import React, { useState, useEffect } from 'react';
import { useClientId } from '../../lib/useClientId';
import { Plus, Layout, Eye, Trash2, CheckCircle2, Code, Upload, Star, MousePointerClick, MessageSquare, ChevronDown, Zap, Copy, ArrowLeft, Paintbrush, Sparkles, Wand2, Loader2, Menu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type FieldDef = { id: string; name: string; label: string; type: string; required: boolean; options: string[]; placeholder: string; helpText: string };
type FormDef = { _id?: string; name: string; description: string; fields: FieldDef[]; status: string; createdAt: string; theme: any };

export default function FormsManager() {
  const { clientId: cidHook } = useClientId();
  const [forms, setForms] = useState<FormDef[]>([]);
  const [editingForm, setEditingForm] = useState<FormDef | null>(null);
  const [viewMode, setViewMode] = useState<'build' | 'settings'>('build');
  const [showEmbed, setShowEmbed] = useState(false);
  const [showAiMojo, setShowAiMojo] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mobileBuilderView, setMobileBuilderView] = useState<'sidebar' | 'main'>('sidebar');

  useEffect(() => {
    if (cidHook) fetchForms();
  }, [cidHook]);

  const fetchForms = async () => {
    try {
      const res = await fetch('/v1/forms', { headers: { 'x-client-id': cidHook } });
      const data = await res.json();
      if (data.success) setForms(data.data || []);
    } catch (e) {}
  };

  const createBlank = () => {
    setEditingForm({ 
      name: 'Interactive Data Funnel', 
      description: 'Capture critical conversions via smart logic paths', 
      fields: [], 
      status: 'active', 
      theme: { primaryColor: '#4f46e5', backgroundColor: '#ffffff', buttonStyle: 'rounded-xl', layout: 'modern' },
      createdAt: new Date().toISOString()
    });
  };

  const saveForm = async () => {
    if(!editingForm) return;
    const isNew = !editingForm._id;
    try {
      const url = isNew ? '/v1/forms' : `/v1/forms/${editingForm._id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-client-id': cidHook },
        body: JSON.stringify(editingForm)
      });
      if(res.ok) {
        setEditingForm(null);
        fetchForms();
      }
    } catch(e) {}
  };

  const deleteForm = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(!window.confirm("Permanently delete this funnel?")) return;
    try {
      await fetch(`/v1/forms/${id}`, { method: 'DELETE', headers: { 'x-client-id': cidHook }});
      fetchForms();
    } catch(e) {}
  };

  const addField = (type: string) => {
    if(!editingForm) return;
    const newField: FieldDef = {
      id: Math.random().toString(36).substr(2, 9),
      name: `field_${Math.random().toString(36).substr(2, 4)}`,
      label: 'New ' + type,
      type,
      required: false,
      options: ['Option alpha', 'Option beta'],
      placeholder: '',
      helpText: ''
    };
    setEditingForm({ ...editingForm, fields: [...editingForm.fields, newField] });
  };

  const updateField = (idx: number, updates: Partial<FieldDef>) => {
    if(!editingForm) return;
    const newFields = [...editingForm.fields];
    newFields[idx] = { ...newFields[idx], ...updates };
    setEditingForm({ ...editingForm, fields: newFields });
  };

  const removeField = (idx: number) => {
    if(!editingForm) return;
    const newFields = [...editingForm.fields];
    newFields.splice(idx, 1);
    setEditingForm({ ...editingForm, fields: newFields });
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    if(!editingForm) return;
    if(idx+dir < 0 || idx+dir >= editingForm.fields.length) return;
    const newFields = [...editingForm.fields];
    const temp = newFields[idx];
    newFields[idx] = newFields[idx+dir];
    newFields[idx+dir] = temp;
    setEditingForm({ ...editingForm, fields: newFields });
  };

  const generateViaAi = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/v1/dashboard/ai/generate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cidHook
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (data.success) {
        setEditingForm({
          ...data.data,
          status: 'active',
          createdAt: new Date().toISOString()
        });
        setShowAiMojo(false);
        setAiPrompt('');
        setMobileBuilderView('main');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  if(!editingForm) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Form Architecture</h1>
            <p className="text-gray-500 font-medium tracking-tight">Construct advanced data ingestion funnels.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => setShowAiMojo(true)} className="flex-1 md:flex-none px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 flex items-center justify-center gap-2 font-bold text-sm shadow-md transition-all active:scale-95 border border-white/10">
               <Sparkles className="w-4 h-4 text-amber-400"/> AI Magic
            </button>
            <button onClick={createBlank} className="flex-1 md:flex-none px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 font-bold text-sm shadow-md transition-all active:scale-95">
               <Plus className="w-5 h-5"/> Manual
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <AnimatePresence>
          {forms.map(form => (
            <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9, width:0}} key={form._id} onClick={() => setEditingForm(form)} className="bg-white border text-left border-slate-100 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full">
               <div className="absolute top-0 right-0 p-6 flex gap-2 opacity-0 transform translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all z-10">
                 <button onClick={(e) => deleteForm(form._id!, e)} className="w-10 h-10 rounded-full bg-white border border-rose-100 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white shadow-lg"><Trash2 className="w-4 h-4"/></button>
               </div>
               
               <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 transform group-hover:scale-110 transition-transform shadow-lg" style={{ backgroundColor: form.theme?.primaryColor || '#4f46e5' }}>
                  <Layout className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 line-clamp-1">{form.name}</h3>
               <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8 flex-1 line-clamp-2">{form.description}</p>
               
               <div className="mt-auto px-4 py-3 bg-slate-50 rounded-xl flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest border border-slate-100/50">
                  <span>{form.fields?.length || 0} Nodes</span>
                  <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                  <span className="text-emerald-600">{form.status}</span>
               </div>
            </motion.div>
          ))}
          </AnimatePresence>
          {forms.length === 0 && (
            <div className="md:col-span-3 text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
               <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
               <p className="text-slate-500 font-bold tracking-tight text-lg mb-2">No infrastructure deployed.</p>
               <button onClick={createBlank} className="text-indigo-600 font-bold uppercase tracking-widest text-xs hover:text-indigo-800 transition-colors">Initialize Blank Canvas &rarr;</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const copyEmbed = () => {
    const code = `<iframe src="https://your-domain.com/f/${editingForm._id}" width="100%" height="800" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(code);
    alert('Embedded payload copied to clipboard');
  };

  return (
    <div className="h-[calc(100vh-6rem)] -m-6 flex flex-col md:flex-row bg-slate-50 relative overflow-hidden animate-in fade-in duration-300">
      {/* Mobile Header Nav */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-100 z-20">
        <button onClick={() => setEditingForm(null)} className="p-2 text-slate-500">
          <ArrowLeft className="w-5 h-5"/>
        </button>
        <span className="font-black text-xs uppercase tracking-widest truncate max-w-[150px]">{editingForm.name}</span>
        <button onClick={() => setMobileBuilderView(mobileBuilderView === 'sidebar' ? 'main' : 'sidebar')} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          {mobileBuilderView === 'sidebar' ? <Layout className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
        </button>
      </div>

      <div className={cn(
        "w-full md:w-80 bg-white flex flex-col h-full shrink-0 shadow-2xl relative z-10 border-r border-slate-100 transition-all duration-300",
        mobileBuilderView === 'main' ? 'hidden md:flex' : 'flex'
      )}>
         <div className="p-6 border-b border-slate-100 hidden md:flex items-center gap-3">
             <button onClick={() => setEditingForm(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-slate-500">
                 <ArrowLeft className="w-4 h-4"/>
             </button>
            <h2 className="font-black tracking-tight text-lg truncate flex-1">{editingForm.name}</h2>
         </div>

         <div className="flex p-2 gap-2 border-b border-slate-100 bg-slate-50/50">
           <button onClick={() => setViewMode('build')} className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all", viewMode==='build' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-100')}><Layout className="w-3.5 h-3.5"/> Nodes</button>
           <button onClick={() => setViewMode('settings')} className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all", viewMode==='settings' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-100')}><Paintbrush className="w-3.5 h-3.5"/> Aesthetics</button>
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {viewMode === 'build' && (
              <div className="space-y-6">
                <button onClick={() => setShowAiMojo(true)} className="w-full p-4 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl shadow-lg border border-white/20 flex flex-col items-center justify-center gap-2 group transition-all hover:scale-[1.02] active:scale-95">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Inject AI Nodes</span>
                </button>

                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Data Nodes</h4>
                   <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => { addField('text'); if(window.innerWidth < 768) setMobileBuilderView('main'); }} className="flex flex-col items-center justify-center p-4 bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all shadow-sm text-slate-600 hover:text-indigo-600 group">
                       <Layout className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">Short Text</span>
                     </button>
                     <button onClick={() => { addField('textarea'); if(window.innerWidth < 768) setMobileBuilderView('main'); }} className="flex flex-col items-center justify-center p-4 bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all shadow-sm text-slate-600 hover:text-indigo-600 group">
                       <MessageSquare className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">Long Text</span>
                     </button>
                     <button onClick={() => { addField('email'); if(window.innerWidth < 768) setMobileBuilderView('main'); }} className="flex flex-col items-center justify-center p-4 bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all shadow-sm text-slate-600 hover:text-indigo-600 group">
                       <Eye className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">Email</span>
                     </button>
                     <button onClick={() => { addField('select'); if(window.innerWidth < 768) setMobileBuilderView('main'); }} className="flex flex-col items-center justify-center p-4 bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all shadow-sm text-slate-600 hover:text-indigo-600 group">
                       <ChevronDown className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">Dropdown</span>
                     </button>
                   </div>
                </div>

                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Specialized Nodes</h4>
                   <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => { addField('file'); if(window.innerWidth < 768) setMobileBuilderView('main'); }} className="flex flex-col items-center justify-center p-4 bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all shadow-sm text-slate-600 hover:text-indigo-600 group">
                       <Upload className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
                     </button>
                     <button onClick={() => { addField('rating'); if(window.innerWidth < 768) setMobileBuilderView('main'); }} className="flex flex-col items-center justify-center p-4 bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all shadow-sm text-slate-600 hover:text-indigo-600 group">
                       <Star className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">Rating</span>
                     </button>
                     <button onClick={() => { addField('checkbox'); if(window.innerWidth < 768) setMobileBuilderView('main'); }} className="flex flex-col items-center justify-center p-4 bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all shadow-sm text-slate-600 hover:text-indigo-600 group">
                       <CheckCircle2 className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">MultiChoice</span>
                     </button>
                     <button onClick={() => { addField('radio'); if(window.innerWidth < 768) setMobileBuilderView('main'); }} className="flex flex-col items-center justify-center p-4 bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all shadow-sm text-slate-600 hover:text-indigo-600 group">
                       <MousePointerClick className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">Radios</span>
                     </button>
                   </div>
                </div>
              </div>
            )}

            {viewMode === 'settings' && (
              <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Brand Color</label>
                   <input type="color" value={editingForm.theme?.primaryColor || '#4f46e5'} onChange={e => setEditingForm({...editingForm, theme: { ...editingForm.theme, primaryColor: e.target.value }})} className="w-full h-12 rounded-xl border-none cursor-pointer p-0 bg-transparent" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Pipeline Title</label>
                  <input type="text" value={editingForm.name} onChange={e => setEditingForm({...editingForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Pipeline Strategy</label>
                  <textarea rows={4} value={editingForm.description} onChange={e => setEditingForm({...editingForm, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                </div>
              </div>
            )}
         </div>

         <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
            <button onClick={saveForm} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
               <Zap className="w-4 h-4" /> Serialize
            </button>
            {editingForm._id && (
               <button onClick={() => setShowEmbed(true)} className="w-full py-4 border border-slate-300 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all">
                  <Code className="w-4 h-4" /> Embed
               </button>
            )}
         </div>
      </div>

      <div className={cn(
        "flex-1 overflow-y-auto px-4 md:px-6 py-6 md:py-12 flex justify-center custom-scrollbar w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]",
        mobileBuilderView === 'sidebar' ? 'hidden md:flex' : 'flex'
      )}>
         <div className="w-full max-w-2xl pb-40">
           {editingForm.fields.length === 0 ? (
              <div className="h-64 md:h-96 border-2 border-dashed border-slate-300 rounded-[2rem] md:rounded-[3rem] flex flex-col items-center justify-center text-slate-400 bg-white/80 backdrop-blur-sm shadow-sm relative overflow-hidden p-6">
                 <MousePointerClick className="w-12 h-12 md:w-16 md:h-16 mb-4 text-slate-300 animate-bounce" />
                 <h2 className="text-lg md:text-xl font-black tracking-tight text-slate-800 mb-2">Architect The Flow</h2>
                 <p className="text-xs md:text-sm font-medium max-w-sm text-center">Click nodes on the left sidebar to inject them into this pipeline structure.</p>
              </div>
           ) : (
             <AnimatePresence>
                {editingForm.fields.map((field, idx) => (
                   <motion.div 
                       key={field.id}
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, x: -100 }}
                       className="mb-4 md:mb-6 bg-white border border-slate-200 rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-xl shadow-slate-200/50 relative group"
                   >
                       <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveField(idx, -1)} disabled={idx===0} className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm text-slate-400 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-0"><ChevronDown className="w-4 h-4 rotate-180"/></button>
                          <button onClick={() => moveField(idx, 1)} disabled={idx===editingForm.fields.length-1} className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm text-slate-400 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-0"><ChevronDown className="w-4 h-4"/></button>
                          <button onClick={() => removeField(idx)} className="w-8 h-8 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center shadow-sm text-rose-500 hover:bg-rose-500 hover:text-white transition-colors ml-2"><Trash2 className="w-3.5 h-3.5"/></button>
                       </div>

                       <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-4">
                           <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">{idx + 1}</div>
                           <h3 className="text-slate-800 font-bold uppercase tracking-widest text-[10px]">Node: {field.type}</h3>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <div>
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">Display Label</label>
                                 <input type="text" value={field.label} onChange={e => updateField(idx, { label: e.target.value })} className="w-full border-b-2 border-slate-100 focus:border-indigo-500 py-2 text-lg font-black text-slate-900 outline-none bg-transparent" />
                              </div>
                              <div>
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">Payload Identifier</label>
                                 <input type="text" value={field.name} onChange={e => updateField(idx, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} className="w-full border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 p-3 text-sm font-mono text-indigo-600 outline-none bg-slate-50 transition-all font-bold" />
                              </div>
                          </div>
                          <div className="space-y-4">
                               <div>
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">Placeholder Input / Help string</label>
                                 <input type="text" value={field.placeholder || ''} onChange={e => updateField(idx, { placeholder: e.target.value })} className="w-full border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 p-3 text-sm outline-none bg-slate-50 mb-2 font-medium" placeholder="Placeholder..." />
                                 <input type="text" value={field.helpText || ''} onChange={e => updateField(idx, { helpText: e.target.value })} className="w-full border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 p-3 text-xs outline-none bg-slate-50 font-medium" placeholder="Helpful microcopy under field..." />
                              </div>
                          </div>
                          
                          {['select', 'radio', 'checkbox'].includes(field.type) && (
                               <div className="md:col-span-2">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">Selectable Fragments (Comma Separated)</label>
                                  <textarea rows={2} value={field.options?.join(', ') || ''} onChange={e => updateField(idx, { options: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} className="w-full border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 p-3 text-sm outline-none bg-slate-50 resize-none font-bold text-slate-700"></textarea>
                               </div>
                          )}

                          <div className="md:col-span-2 pt-4 border-t border-slate-50 flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-100 rounded-xl hover:bg-slate-50 w-full justify-between">
                                 <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Strict Enforcement (Required)</span>
                                 <input type="checkbox" checked={field.required} onChange={e => updateField(idx, { required: e.target.checked })} className="w-5 h-5 text-indigo-600 rounded bg-slate-100 border-none focus:ring-0 cursor-pointer" />
                              </label>
                          </div>
                       </div>
                   </motion.div>
                ))}
             </AnimatePresence>
           )}
         </div>
      </div>

      {showAiMojo && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur flex items-center justify-center p-4 z-[60]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] p-8 md:p-12 max-w-xl w-full shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse"></div>
               <button onClick={() => setShowAiMojo(false)} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                 &times;
               </button>
               
               <div className="flex items-center gap-3 mb-2">
                 <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5"/>
                 </div>
                 <h2 className="text-3xl font-black tracking-tight">AI Strategy</h2>
               </div>
               <p className="text-slate-500 font-medium mb-8">Describe the conversion pipeline you want to architect.</p>

               <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">The Prompt</label>
                    <textarea 
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="e.g. A multi-step lead magnet for a luxury real estate agency that captures property preferences and budget..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none"
                      rows={4}
                    />
                 </div>
                 
                 <button 
                  disabled={isGenerating || !aiPrompt.trim()}
                  onClick={generateViaAi}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                 >
                   {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                   {isGenerating ? 'Synthesizing...' : 'Manifest Architecture'}
                 </button>
               </div>
            </motion.div>
         </div>
      )}

      {showEmbed && editingForm._id && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl relative">
               <button onClick={() => setShowEmbed(false)} className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 font-bold transition-colors">
                 &times;
               </button>
               <h2 className="text-4xl font-black tracking-tight mb-2">Deploy Payload</h2>
               <p className="text-slate-500 font-medium mb-12">Copy snippet to execute this form within any DOM surface element.</p>
               
               <div className="bg-slate-900 rounded-[2rem] p-8 relative flex flex-col justify-center">
                  <pre className="text-emerald-400 font-mono text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                     {`<iframe src="https://your-domain.com/f/${editingForm._id}" width="100%" height="600" style="border:none; border-radius:16px;"></iframe>`}
                  </pre>
                  <button onClick={copyEmbed} className="mt-8 mx-auto w-16 h-16 flex items-center justify-center bg-white/10 hover:bg-white/20 hover:scale-110 active:scale-95 text-white rounded-full backdrop-blur-md transition-all shadow-lg border border-white/10">
                     <Copy className="w-6 h-6" />
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
