import React, { useEffect, useRef, useState } from 'react';
import { 
  Mail, Save, Plus, Sparkles, Upload, Download, Copy, Trash2, Eye, Send, 
  Search, Filter, ChevronRight, X, Laptop, Tablet, Smartphone, Moon, Sun, 
  ArrowLeft, Palette, Grid, Layers, Sliders, Type, Image as ImageIcon, Check,
  AlertCircle, RefreshCw, FileCode, CheckSquare, Zap, BadgeAlert, ShoppingCart, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LongPressWrapper } from '../../components/LongPressWrapper';
import { cn } from '../../lib/utils';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';

// Supported variable definition list
const AVAILABLE_VARIABLES = [
  { name: 'full_name', description: "Customer's full name", category: 'Customer' },
  { name: 'first_name', description: "Customer's first name", category: 'Customer' },
  { name: 'last_name', description: "Customer's last name", category: 'Customer' },
  { name: 'email', description: "Customer's email address", category: 'Customer' },
  { name: 'phone', description: "Customer's phone number", category: 'Customer' },
  { name: 'whatsapp_number', description: "Customer's WhatsApp contact", category: 'Customer' },
  { name: 'telegram_username', description: "Customer's Telegram username", category: 'Customer' },
  { name: 'company_name', description: 'Your business brand name', category: 'Business' },
  { name: 'business_name', description: 'Official business name', category: 'Business' },
  { name: 'booking_date', description: 'Scheduled appointment date', category: 'Booking' },
  { name: 'booking_time', description: 'Scheduled appointment time', category: 'Booking' },
  { name: 'service_name', description: 'Name of booked service', category: 'Booking' },
  { name: 'agent_name', description: 'Name of assigned OminiRep Agent', category: 'Booking' },
  { name: 'lead_score', description: 'Lead score rating (0-100)', category: 'Lead' },
  { name: 'lead_source', description: 'Traffic/Attribution source', category: 'Lead' },
  { name: 'inquiry_subject', description: 'Support ticket subject', category: 'Support' },
  { name: 'inquiry_message', description: 'Message body of inquiry', category: 'Support' },
  { name: 'unsubscribe_link', description: 'Secure unsubscribe footer link', category: 'System' },
  { name: 'website_url', description: 'Your company homepage URL', category: 'Business' },
  { name: 'support_email', description: 'Your support inbox address', category: 'Support' },
  { name: 'support_phone', description: 'Your support phone hotline', category: 'Support' }
];

const PRESET_CATEGORIES = ['All', 'Transactional', 'Marketing', 'Support', 'AI Generated', 'Marketplace'];

export default function EmailTemplatesManager() {
  // Navigation & View State
  const [viewMode, setViewMode] = useState<'grid' | 'visual_editor' | 'mjml_editor'>('grid');
  const [activeTab, setActiveTab] = useState<'blocks' | 'styles' | 'layers' | 'variables' | 'assets'>('blocks');
  
  // Data State
  const [templates, setTemplates] = useState<any[]>([]);
  const [marketplaceTemplates, setMarketplaceTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);

  // Search, Filters & Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');

  // UI Modals State
  const [showAiModal, setShowAiModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTestSendModal, setShowTestSendModal] = useState(false);

  // Editor Inputs State
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateCategory, setTemplateCategory] = useState('General');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateTags, setTemplateTags] = useState('');
  
  // MJML Specific Editor State
  const [mjmlSource, setMjmlSource] = useState('');
  const [mjmlErrors, setMjmlErrors] = useState<any[]>([]);
  const [mjmlPreviewHtml, setMjmlPreviewHtml] = useState('');
  const [isCompilingMjml, setIsCompilingMjml] = useState(false);

  // AI Generator Inputs State
  const [aiForm, setAiForm] = useState({
    businessType: 'E-commerce',
    campaignType: 'Product Launch Announcement',
    campaignGoal: 'Drive early birds pre-orders with a 20% discount',
    brandName: 'OminiRep Shop',
    brandColors: '#4f46e5',
    cta: 'Reserve Pre-Order Now',
    templateType: 'html'
  });
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Previewer State
  const [previewSize, setPreviewSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewDarkMode, setPreviewDarkMode] = useState(false);
  const [renderedPreviewContent, setRenderedPreviewContent] = useState('');
  const [renderedPreviewSubject, setRenderedPreviewSubject] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Test Sender State
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<any>(null);

  // Asset Uploading State
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);

  // Notifications State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // References
  const gjsContainerRef = useRef<HTMLDivElement | null>(null);
  const gjsEditorRef = useRef<any>(null);

  // Truncated notifications toaster
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // On Mount: Load Templates & Assets
  useEffect(() => {
    fetchTemplatesAndAssets();
  }, []);

  const fetchTemplatesAndAssets = async () => {
    setLoading(true);
    try {
      // Fetch user templates
      const res = await fetch('/api/email-templates');
      const data = await res.json();
      if (data?.success) {
        setTemplates(data.data);
      } else {
        // Populate beautifully structured offline presets if DB is empty
        setTemplates(getFallbackPresets());
      }

      // Fetch Marketplace / System Templates
      const marketRes = await fetch('/api/email-templates/marketplace');
      const marketData = await marketRes.json();
      if (marketData?.success) {
        setMarketplaceTemplates(marketData.data);
      } else {
        setMarketplaceTemplates(getMarketplacePresets());
      }

      // Fetch Asset Images
      const assetsRes = await fetch('/api/email-templates/images/list');
      const assetsData = await assetsRes.json();
      if (assetsData?.success) {
        setAssets(assetsData.data);
      } else {
        setAssets([
          { src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&auto=format&fit=crop&q=60', name: 'Dashboard' },
          { src: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=400&auto=format&fit=crop&q=60', name: 'Corporate Email Header' },
          { src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=60', name: 'Marketing Banner' }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setTemplates(getFallbackPresets());
      setMarketplaceTemplates(getMarketplacePresets());
    } finally {
      setLoading(false);
    }
  };

  // Fallback / Preloaded Templates for dynamic production feel
  const getFallbackPresets = () => [
    {
      _id: 'preset_1',
      name: 'Booking Confirmation Email',
      description: 'Sent automatically when a customer books a scheduled advisory session.',
      category: 'Transactional',
      tags: ['Booking', 'Auto-Reply'],
      type: 'user',
      subject: 'Your Booking Confirmation - {{service_name}}',
      htmlSource: getAdvisoryBookingHtml(),
      status: 'published',
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      createdBy: 'System Engine'
    },
    {
      _id: 'preset_2',
      name: 'Nurturing Welcome Flow',
      description: 'Elegant newsletter to onboard new leads generated via the website widget.',
      category: 'Marketing',
      tags: ['Welcome', 'Onboarding'],
      type: 'mjml',
      subject: 'Welcome to OminiRep! Lets activate your workspace.',
      mjmlSource: getOnboardingMjml(),
      htmlSource: '', // Compile later on preview
      status: 'draft',
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      createdBy: 'Marcus representative'
    },
    {
      _id: 'preset_3',
      name: 'Support Case Resolution Acknowledgment',
      description: 'Closes support loop politely and collects feedback on agent performance.',
      category: 'Support',
      tags: ['Tickets', 'Feedback'],
      type: 'user',
      subject: 'Ticket Resolved: {{inquiry_subject}}',
      htmlSource: getSupportTicketHtml(),
      status: 'published',
      updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      createdBy: 'Support Supervisor'
    }
  ];

  const getMarketplacePresets = () => [
    {
      _id: 'market_1',
      name: 'Cyber Monday SaaS Promo',
      description: 'Stunning premium template for software product discounts.',
      category: 'Marketplace',
      type: 'marketplace',
      subject: 'Unbeatable SaaS Upgrade: 50% Off Inside!',
      isMarketplace: true,
      isPremium: true,
      price: 29,
      htmlSource: '<div>Cyber Monday Promo</div>',
      status: 'published'
    },
    {
      _id: 'market_2',
      name: 'Weekly Digest Newsletter Layout',
      description: 'Clean multi-column grid layouts for educational content updates.',
      category: 'Marketplace',
      type: 'system',
      subject: 'This Weeks Industry Pulse & Updates',
      isMarketplace: true,
      isPremium: false,
      htmlSource: '<div>Weekly News Digest</div>',
      status: 'published'
    }
  ];

  // Compile MJML helper
  const handleCompileMjml = async (codeToCompile: string, silencely = false) => {
    setIsCompilingMjml(true);
    try {
      const res = await fetch('/api/email-templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: activeTemplate._id,
          variables: {} // Default fallback variables
        })
      });
      // But since we may have unstored local changes in the editor, compile code directly
      // Let's call compile MJML endpoint if we want, or save first then preview.
      // Better: we can temporarily save the edited model source, then request compilation.
      const saveRes = await fetch(`/api/email-templates/${activeTemplate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activeTemplate,
          name: templateName,
          subject: templateSubject,
          category: templateCategory,
          description: templateDescription,
          tags: templateTags.split(',').map(t => t.trim()).filter(Boolean),
          mjmlSource: codeToCompile,
          type: 'mjml'
        })
      });

      const saveResult = await saveRes.json();
      if (saveResult?.success) {
        setMjmlPreviewHtml(saveResult.data.htmlSource);
        if (!silencely) showToast('MJML compiled and saved successfully!', 'success');
      } else {
        throw new Error(saveResult?.error || 'Failed to compile MJML');
      }
    } catch (err: any) {
      console.error(err);
      if (!silencely) showToast('Failed to compile MJML: ' + err.message, 'error');
    } finally {
      setIsCompilingMjml(false);
    }
  };

  // Variable clipboard copy helper
  const copyVariable = (varName: string) => {
    navigator.clipboard.writeText(`{{${varName}}}`);
    showToast(`Copied {{${varName}}} to clipboard. Paste into editor!`, 'success');
  };

  // GrapesJS Initialization
  const initGJS = (initialHtml: string, projectData: any) => {
    if (gjsEditorRef.current) {
      gjsEditorRef.current.destroy();
      gjsEditorRef.current = null;
    }

    if (!gjsContainerRef.current) return;

    // GrapesJS configuration matching precise enterprise design rules
    const editor = grapesjs.init({
      container: gjsContainerRef.current,
      height: '650px',
      width: '100%',
      storageManager: false,
      blockManager: {
        appendTo: '#blocks-container',
      },
      styleManager: {
        appendTo: '#styles-container',
      },
      layerManager: {
        appendTo: '#layers-container',
      },
      traitManager: {
        appendTo: '#traits-container',
      },
      assetManager: {
        assets: assets.map(a => a.src),
        upload: false,
      },
      panels: {
        defaults: [
          {
            id: 'commands',
            buttons: [
              {
                id: 'undo',
                className: 'px-3 py-1 bg-white border rounded text-xs hover:bg-slate-50 mr-1 cursor-pointer font-medium text-slate-700',
                label: 'Undo',
                command: 'core:undo',
              },
              {
                id: 'redo',
                className: 'px-3 py-1 bg-white border rounded text-xs hover:bg-slate-50 cursor-pointer font-medium text-slate-700',
                label: 'Redo',
                command: 'core:redo',
              },
            ],
          }
        ],
      },
    });

    // Populate assets dynamically
    editor.AssetManager.add(assets.map(a => ({ src: a.url || a.src, name: a.name })));

    // Load initial HTML / Project state
    if (projectData) {
      try {
        editor.loadProjectData(projectData);
      } catch (e) {
        editor.setComponents(initialHtml);
      }
    } else {
      editor.setComponents(initialHtml);
    }

    // Add comprehensive blocks
    const bm = editor.BlockManager;
    
    bm.add('hero-banner', {
      label: 'Hero Banner',
      category: 'Sections',
      content: `
        <div style="background-color: #4f46e5; padding: 40px 20px; text-align: center; color: white; font-family: sans-serif; border-radius: 8px;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">Welcome to {{company_name}}</h1>
          <p style="margin: 0 0 20px 0; font-size: 16px; opacity: 0.9;">Crafting enterprise customer relationships beautifully.</p>
          <a href="{{website_url}}" style="background-color: white; color: #4f46e5; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-decoration: none; display: inline-block;">Get Started</a>
        </div>
      `
    });

    bm.add('card-section', {
      label: 'Feature Card',
      category: 'Sections',
      content: `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 16px; font-family: sans-serif;">
          <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #0f172a; font-weight: 600;">Key Advisory Notice</h3>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.5;">This email notice confirms update for {{full_name}} scheduled on {{booking_date}} at {{booking_time}}.</p>
          <span style="font-size: 12px; color: #64748b; font-weight: 500;">OminiRep Automations</span>
        </div>
      `
    });

    bm.add('text-block', {
      label: 'Paragraph Text',
      category: 'Typography',
      content: '<p style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 12px;">Insert your customized email paragraph body here. Double click to type or paste OminiRep merge fields directly.</p>'
    });

    bm.add('heading-block', {
      label: 'Heading Title',
      category: 'Typography',
      content: '<h2 style="font-family: sans-serif; font-size: 22px; font-weight: 600; color: #0f172a; margin-top: 10px; margin-bottom: 10px;">New Announcement Title</h2>'
    });

    bm.add('primary-button', {
      label: 'Action Button',
      category: 'Interactive',
      content: `
        <div style="text-align: center; margin: 15px 0;">
          <a href="{{website_url}}" style="background-color: #4f46e5; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-family: sans-serif; display: inline-block;">Confirm Appointment Now</a>
        </div>
      `
    });

    bm.add('image-block', {
      label: 'Media Image',
      category: 'Interactive',
      content: '<img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format" style="width: 100%; max-width: 600px; border-radius: 8px; display: block; margin: 10px auto;" />'
    });

    bm.add('divider', {
      label: 'Section Divider',
      category: 'Layout',
      content: '<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />'
    });

    bm.add('footer', {
      label: 'Standard Footer',
      category: 'Layout',
      content: `
        <div style="padding: 24px 10px; text-align: center; font-family: sans-serif; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px 0;">You received this because you are an active contact of {{company_name}}.</p>
          <p style="margin: 0 0 12px 0;">{{support_phone}} | {{support_email}}</p>
          <a href="{{unsubscribe_link}}" style="color: #4f46e5; text-decoration: underline;">Unsubscribe safely</a>
        </div>
      `
    });

    gjsEditorRef.current = editor;
  };

  // Launch HTML/GrapesJS editor
  const openVisualEditor = (template: any) => {
    setActiveTemplate(template);
    setTemplateName(template.name);
    setTemplateSubject(template.subject || '');
    setTemplateCategory(template.category || 'General');
    setTemplateDescription(template.description || '');
    setTemplateTags(template.tags?.join(', ') || '');
    setViewMode('visual_editor');
    
    // Lazy timeout to ensure container exists in DOM
    setTimeout(() => {
      initGJS(template.htmlSource || '<div>Email Template Layout</div>', template.projectData);
    }, 100);
  };

  // Launch MJML code editor
  const openMjmlEditor = async (template: any) => {
    setActiveTemplate(template);
    setTemplateName(template.name);
    setTemplateSubject(template.subject || '');
    setTemplateCategory(template.category || 'General');
    setTemplateDescription(template.description || '');
    setTemplateTags(template.tags?.join(', ') || '');
    setMjmlSource(template.mjmlSource || getOnboardingMjml());
    setViewMode('mjml_editor');
    
    // Pre-compile MJML preview right away
    await handleCompileMjml(template.mjmlSource || getOnboardingMjml(), true);
  };

  // Save changes from GrapesJS or MJML Code editor back to Mongo
  const handleSaveTemplate = async () => {
    if (!activeTemplate) return;
    
    try {
      let htmlSource = '';
      let projectData = null;
      let finalMjml = mjmlSource;

      if (viewMode === 'visual_editor' && gjsEditorRef.current) {
        // Retrieve values from GrapesJS editor
        htmlSource = gjsEditorRef.current.getHtml();
        projectData = gjsEditorRef.current.getProjectData();
      } else {
        htmlSource = mjmlPreviewHtml;
      }

      const updatedPayload = {
        name: templateName,
        subject: templateSubject,
        category: templateCategory,
        description: templateDescription,
        tags: templateTags.split(',').map(t => t.trim()).filter(Boolean),
        type: viewMode === 'visual_editor' ? 'user' : 'mjml',
        htmlSource,
        mjmlSource: viewMode === 'mjml_editor' ? finalMjml : undefined,
        projectData,
        status: activeTemplate.status || 'draft'
      };

      // Check if it's a preloaded mock preset that hasn't been saved to DB yet
      const isPreset = String(activeTemplate._id).startsWith('preset_') || String(activeTemplate._id).startsWith('market_');

      let url = `/api/email-templates/${activeTemplate._id}`;
      let method = 'PUT';

      if (isPreset) {
        url = '/api/email-templates';
        method = 'POST';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });

      const data = await res.json();
      if (data?.success) {
        showToast('Template successfully saved in active repository!', 'success');
        fetchTemplatesAndAssets();
        
        if (isPreset) {
          // If we created a new entry from preset, update our local pointer so further edits update it
          setActiveTemplate(data.data);
        }
      } else {
        showToast(data?.error || 'Failed to save template', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error saving template: ' + err.message, 'error');
    }
  };

  // Create a brand new blank email template
  const handleCreateNewTemplate = async (type: 'html' | 'mjml') => {
    try {
      const payload = {
        name: `New ${type.toUpperCase()} Template`,
        subject: 'Stay ahead of the curve',
        category: 'General',
        description: 'A newly created clean layout.',
        type: type === 'html' ? 'user' : 'mjml',
        htmlSource: type === 'html' ? '<div>Start building your content here...</div>' : '',
        mjmlSource: type === 'mjml' ? getNewMjmlBoilerplate() : '',
        status: 'draft'
      };

      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data?.success) {
        showToast('Created successfully!', 'success');
        fetchTemplatesAndAssets();
        if (type === 'html') {
          openVisualEditor(data.data);
        } else {
          openMjmlEditor(data.data);
        }
      } else {
        showToast(data?.error || 'Failed to create template', 'error');
      }
    } catch (err: any) {
      showToast('Error creating template: ' + err.message, 'error');
    }
  };

  // Duplicate template helper
  const handleDuplicateTemplate = async (templateId: string) => {
    try {
      // Check if preset
      if (String(templateId).startsWith('preset_') || String(templateId).startsWith('market_')) {
        // Just load, alter name, and post
        const source = [...templates, ...marketplaceTemplates].find(t => t._id === templateId);
        if (!source) return;
        const res = await fetch('/api/email-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...source,
            _id: undefined,
            name: `${source.name} (Copy)`,
            status: 'draft'
          })
        });
        const d = await res.json();
        if (d?.success) {
          showToast('Duplicated local template into database!', 'success');
          fetchTemplatesAndAssets();
        }
        return;
      }

      const res = await fetch('/api/email-templates/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId })
      });
      const data = await res.json();
      if (data?.success) {
        showToast('Duplicated template successfully', 'success');
        fetchTemplatesAndAssets();
      } else {
        showToast(data?.error || 'Failed to duplicate', 'error');
      }
    } catch (err: any) {
      showToast('Error duplicating: ' + err.message, 'error');
    }
  };

  // Delete Template from DB
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you absolutely sure you want to permanently delete this email template?')) return;
    
    // If it's a preset and not in database, just filter it out locally
    if (String(templateId).startsWith('preset_') || String(templateId).startsWith('market_')) {
      setTemplates(prev => prev.filter(t => t._id !== templateId));
      setSelectedTemplates(prev => prev.filter(id => id !== templateId));
      showToast('Removed preset template from active list.', 'success');
      return;
    }

    try {
      const res = await fetch(`/api/email-templates/${templateId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data?.success) {
        showToast('Template deleted successfully', 'success');
        setSelectedTemplates(prev => prev.filter(id => id !== templateId));
        fetchTemplatesAndAssets();
      } else {
        showToast(data?.error || 'Failed to delete template', 'error');
      }
    } catch (err: any) {
      showToast('Error deleting template: ' + err.message, 'error');
    }
  };

  const handleBulkDeleteTemplates = async () => {
    if (selectedTemplates.length === 0) return;
    if (!confirm(`Delete ${selectedTemplates.length} templates?`)) return;
    
    const dbIds = selectedTemplates.filter(id => !id.startsWith('preset_') && !id.startsWith('market_'));

    try {
      if (dbIds.length > 0) {
        const res = await fetch('/api/email-templates', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': localStorage.getItem('activeClientId') || ''
          },
          body: JSON.stringify({ ids: dbIds })
        });
        const data = await res.json();
        if (!data.success) {
          showToast(data.error?.message || 'Failed to delete some templates', 'error');
        }
      }

      setTemplates(prev => prev.filter(t => !selectedTemplates.includes(t._id)));
      setSelectedTemplates([]);
      showToast('Templates removed successfully', 'success');
    } catch (err: any) {
      showToast('Error during bulk deletion: ' + err.message, 'error');
    }
  };

  // Export Template as JSON payload download
  const handleExportTemplate = async (template: any) => {
    try {
      let source = template;
      // If template is database registered, call the proper export endpoint
      if (!String(template._id).startsWith('preset_') && !String(template._id).startsWith('market_')) {
        const res = await fetch('/api/email-templates/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: template._id })
        });
        const data = await res.json();
        if (data?.success) {
          source = data.data;
        }
      }

      const blob = new Blob([JSON.stringify(source, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name.toLowerCase().replace(/\s+/g, '_')}_template.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Template downloaded successfully as JSON!', 'success');
    } catch (err: any) {
      showToast('Failed to export: ' + err.message, 'error');
    }
  };

  // Import JSON Template file
  const handleImportJson = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        if (!content.name) {
          showToast('Invalid JSON schema: Missing template name.', 'error');
          return;
        }

        const res = await fetch('/api/email-templates/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(content)
        });

        const data = await res.json();
        if (data?.success) {
          showToast('Imported template successfully!', 'success');
          setShowImportModal(false);
          fetchTemplatesAndAssets();
        } else {
          showToast(data?.error || 'Failed to import JSON', 'error');
        }
      } catch (err: any) {
        showToast('JSON parse error: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  // AI Template Generator Trigger
  const handleGenerateAiTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/email-templates/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiForm)
      });
      const data = await res.json();
      if (data?.success) {
        showToast('AI Email Template generated successfully!', 'success');
        setShowAiModal(false);

        // Create the actual template in the DB with the AI generated markup
        const createRes = await fetch('/api/email-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `AI generated - ${aiForm.campaignType}`,
            subject: data.data.subject,
            category: 'AI Generated',
            type: aiForm.templateType === 'mjml' ? 'mjml' : 'user',
            htmlSource: data.data.htmlSource,
            mjmlSource: data.data.mjmlSource,
            description: `Auto-generated with OminiRep Enterprise AI for ${aiForm.brandName}`,
            status: 'draft'
          })
        });

        const createData = await createRes.json();
        if (createData?.success) {
          fetchTemplatesAndAssets();
          if (aiForm.templateType === 'html') {
            openVisualEditor(createData.data);
          } else {
            openMjmlEditor(createData.data);
          }
        }
      } else {
        showToast(data?.error || 'AI generation failed', 'error');
      }
    } catch (err: any) {
      showToast('AI generation error: ' + err.message, 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Open Preview Dialog with custom Handlebars variables compiled
  const openPreviewModal = async (template: any) => {
    setActiveTemplate(template);
    setIsLoadingPreview(true);
    setShowPreviewModal(true);
    try {
      let isPreset = String(template._id).startsWith('preset_') || String(template._id).startsWith('market_');
      let url = `/api/email-templates/preview`;
      let body: any = { templateId: template._id };

      // If preset, compile local markup on the fly instead of relying on non-existent database ID
      if (isPreset) {
        // We'll mock render it locally using regex variables replacement or compile it in DB
        // Let's create it in DB first, or render variables using a client-side utility
        const rendered = renderVariablesOffline(template.htmlSource || getAdvisoryBookingHtml());
        setRenderedPreviewContent(rendered);
        setRenderedPreviewSubject(template.subject || 'Preview');
        setIsLoadingPreview(false);
        return;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data?.success) {
        setRenderedPreviewContent(data.data.renderedHtml);
        setRenderedPreviewSubject(data.data.renderedSubject);
      } else {
        showToast('Preview compilation failed on backend.', 'error');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Test Send Dialog Trigger
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailRecipient) return;
    setIsSendingTest(true);
    setTestSendResult(null);

    try {
      let templateId = activeTemplate._id;
      // If it is a preset, we must first save it to Mongo to obtain a valid DB ID
      if (String(templateId).startsWith('preset_') || String(templateId).startsWith('market_')) {
        const createRes = await fetch('/api/email-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...activeTemplate,
            _id: undefined,
            status: 'draft'
          })
        });
        const created = await createRes.json();
        if (created?.success) {
          templateId = created.data._id;
          // Sync state
          fetchTemplatesAndAssets();
        } else {
          throw new Error('Failed to cache mock template to database before dispatching test.');
        }
      }

      const res = await fetch('/api/email-templates/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmailRecipient,
          subject: templateSubject || activeTemplate.subject || 'Test Send',
          templateId,
          variables: {
            full_name: 'Test Customer',
            booking_date: '2026-08-20',
            booking_time: '14:30 PM',
            service_name: 'Premium Consulting'
          }
        })
      });

      const data = await res.json();
      setTestSendResult(data);
      if (data?.success) {
        showToast('Test email sent successfully!', 'success');
      } else {
        showToast('Delivery issue: Simulated mode triggered.', 'error');
      }
    } catch (err: any) {
      showToast('Delivery exception: ' + err.message, 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Local Image Upload Handler
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAsset(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/email-templates/images/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data?.success) {
        showToast('Asset uploaded to media library!', 'success');
        
        // Append newly created image to state list
        const newAsset = { src: data.data.src, name: data.data.name, id: data.data.id };
        setAssets(prev => [newAsset, ...prev]);

        // Inject asset directly into GrapesJS editor state if it's active
        if (gjsEditorRef.current) {
          gjsEditorRef.current.AssetManager.add(newAsset);
        }
      } else {
        showToast(data?.error || 'Failed to upload asset', 'error');
      }
    } catch (err: any) {
      showToast('Upload error: ' + err.message, 'error');
    } finally {
      setIsUploadingAsset(false);
    }
  };

  // Offline mockup renderer for demo presets
  const renderVariablesOffline = (html: string) => {
    let output = html;
    const values: Record<string, string> = {
      full_name: 'Jane Doe',
      company_name: 'OminiRep Global',
      booking_date: '2026-07-04',
      booking_time: '11:15 AM',
      service_name: 'SaaS Architecture Review',
      agent_name: 'Architect Rep Joshua',
      unsubscribe_link: '#',
      support_phone: '+1-555-010-0223',
      support_email: 'care@ominirep.com',
      website_url: '#'
    };

    Object.entries(values).forEach(([k, v]) => {
      const regex = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
      output = output.replace(regex, v);
    });

    return output;
  };

  // Filter templates list
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    if (selectedTemplates.length === 0) {
      setIsSelectionMode(false);
    }
  }, [selectedTemplates]);

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplates(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      return [...prev, id];
    });
  };

  const handleLongPress = (id: string) => {
    setIsSelectionMode(true);
    setSelectedTemplates([id]);
  };

  const handleCardClick = (template: any) => {
    if (isSelectionMode) {
      toggleTemplateSelection(template._id);
    } else {
      template.type === 'mjml' ? openMjmlEditor(template) : openVisualEditor(template);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    
    const matchesType = selectedTypeFilter === 'all' || 
                        (selectedTypeFilter === 'mjml' && t.type === 'mjml') || 
                        (selectedTypeFilter === 'html' && t.type !== 'mjml');

    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-3 rounded-xl border shadow-xl transition-all animate-bounce ${
          toastType === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toastType === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Grid Home Dashboard View */}
      {viewMode === 'grid' && (
        <>
          {/* Header Action Row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-100 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                <Mail className="w-8 h-8 text-indigo-600" />
                Email Template Studio
              </h1>
              <p className="text-slate-500 mt-2">Design responsive HTML/MJML transactional responses and rich campaign updates.</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => handleCreateNewTemplate('html')}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-100"
              >
                <Plus className="w-4 h-4" />
                Create HTML
              </button>
              
              <button 
                onClick={() => handleCreateNewTemplate('mjml')}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-slate-100"
              >
                <FileCode className="w-4 h-4" />
                Create MJML
              </button>

              <button 
                onClick={() => setShowAiModal(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-100"
              >
                <Sparkles className="w-4 h-4" />
                AI Generate
              </button>

              <button 
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition"
              >
                <Upload className="w-4 h-4" />
                Import Template
              </button>
            </div>
          </div>

          {/* Search, Filter, Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search templates by title or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <div className="flex gap-2">
                <select 
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="all">All Coding Formats</option>
                  <option value="html">HTML Builder</option>
                  <option value="mjml">MJML Code</option>
                </select>
              </div>
            </div>

            {/* Micro Stats Widget */}
            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex items-center justify-around text-center">
              <div>
                <span className="block text-xl font-extrabold text-indigo-600">{templates.length}</span>
                <span className="text-xs text-slate-500 font-medium">Templates</span>
              </div>
              <div className="border-l border-slate-200 h-8"></div>
              <div>
                <span className="block text-xl font-extrabold text-purple-600">
                  {templates.filter(t => t.category === 'AI Generated').length}
                </span>
                <span className="text-xs text-slate-500 font-medium">AI Created</span>
              </div>
              <div className="border-l border-slate-200 h-8"></div>
              <div>
                <span className="block text-xl font-extrabold text-slate-700">
                  {templates.filter(t => t.type === 'mjml').length}
                </span>
                <span className="text-xs text-slate-500 font-medium">MJML Code</span>
              </div>
            </div>
          </div>

          {/* Categories Horizontal Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-1 overflow-x-auto whitespace-nowrap">
            {PRESET_CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  selectedCategory === category 
                    ? 'bg-indigo-50 text-indigo-700 font-bold' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Primary Templates Grid */}
          <AnimatePresence mode="wait">
            {isSelectionMode ? (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center justify-between bg-indigo-600 p-4 rounded-2xl shadow-lg text-white mt-4 mb-2"
              >
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedTemplates([])}
                    className="p-2 hover:bg-indigo-500 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <span className="font-black text-sm uppercase tracking-wider">
                    {selectedTemplates.length} Selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allIds = filteredTemplates.map(t => t._id);
                      setSelectedTemplates(allIds);
                    }}
                    className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Select All
                  </button>
                  <button
                    onClick={handleBulkDeleteTemplates}
                    className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {loading ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <span>Fetching enterprise templates database...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-4">
              <div className="inline-flex p-4 bg-slate-50 rounded-full text-indigo-600">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No email templates found</h3>
              <p className="text-slate-500 max-w-md mx-auto">Try adjusting your filters, searching for another term, or create a brand new template using the quick builders above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredTemplates.map(template => {
                const isSelected = selectedTemplates.includes(template._id);

                return (
                  <LongPressWrapper 
                    key={template._id} 
                    layoutId={template._id}
                    disabled={isSelectionMode}
                    onLongPress={() => handleLongPress(template._id)}
                    onClick={() => handleCardClick(template)}
                    className={cn(
                      "bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between relative group",
                      isSelected && "ring-4 ring-indigo-500/20 border-indigo-500 bg-indigo-50/10 shadow-xl shadow-indigo-600/10"
                    )}
                  >
                    <div className="p-6 space-y-4 relative">
                      <AnimatePresence>
                        {isSelectionMode && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute top-2 left-2 z-30"
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all",
                              isSelected 
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/30" 
                                : "bg-white/80 backdrop-blur-sm border-slate-200 text-transparent"
                            )}>
                              <Check className="w-5 h-5" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Header Row */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase tracking-wider rounded-md">
                            {template.category || 'General'}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          template.type === 'mjml' 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {template.type?.toUpperCase() || 'HTML'}
                        </span>
                      </div>

                      {/* Metadata & Description */}
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg hover:text-indigo-600 cursor-pointer transition">
                          {template.name}
                        </h3>
                        <p className="text-slate-500 text-sm mt-1.5 line-clamp-2 h-10 leading-relaxed">
                          {template.description || 'Custom corporate communication layout.'}
                        </p>
                      </div>

                      {/* Subject Line Block */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase">Subject:</span>
                        <span className="text-xs font-semibold text-slate-700 truncate flex-1">{template.subject || '(Unspecified)'}</span>
                      </div>

                      {/* Tags */}
                      {template.tags && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {template.tags.map((t: string) => (
                            <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Info Footer Row */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                      <span>By {template.createdBy || 'OminiRep Agent'}</span>
                      <span>Updated {new Date(template.updatedAt || Date.now()).toLocaleDateString()}</span>
                    </div>

                    {/* Actions Bar */}
                    {!isSelectionMode && (
                      <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-4 gap-2">
                        <button 
                          onClick={() => template.type === 'mjml' ? openMjmlEditor(template) : openVisualEditor(template)}
                          className="inline-flex items-center justify-center py-2 border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 rounded-xl text-xs font-semibold transition"
                          title="Edit template"
                        >
                          Edit
                        </button>

                        <button 
                          onClick={() => openPreviewModal(template)}
                          className="inline-flex items-center justify-center py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                          title="Preview layout"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </button>

                        <button 
                          onClick={() => handleDuplicateTemplate(template._id)}
                          className="inline-flex items-center justify-center py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                          title="Duplicate template"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copy
                        </button>

                        <div className="relative group flex">
                          <button 
                            onClick={() => handleDeleteTemplate(template._id)}
                            className="w-full inline-flex items-center justify-center py-2 border border-rose-100 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition"
                            title="Delete template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </LongPressWrapper>
                );
              })}
            </div>
          )}

          {/* Marketplace Add-On Header section */}
          <div className="border-t border-slate-200 pt-12 mt-12 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Zap className="w-6 h-6 text-indigo-600" />
                  Premium Marketplace Templates
                </h2>
                <p className="text-sm text-slate-500">Deploy validated high-conversion customer touchpoints directly to your tenant workspace.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {marketplaceTemplates.map(template => (
                <div key={template._id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between hover:shadow transition relative overflow-hidden group">
                  {template.isPremium && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-xl shadow flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Premium (${template.price})
                    </div>
                  )}

                  <div className="space-y-4">
                    <span className="px-2.5 py-1 bg-white text-slate-700 font-bold text-[10px] uppercase border border-slate-200 rounded-md">
                      Marketplace App
                    </span>
                    
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition">{template.name}</h4>
                      <p className="text-slate-500 text-sm mt-1 leading-relaxed">{template.description}</p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-slate-400">SUBJECT:</span>
                      <span className="text-xs font-semibold text-slate-600 truncate">{template.subject}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
                    <button 
                      onClick={() => {
                        handleDuplicateTemplate(template._id);
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Install to Tenant
                    </button>
                    
                    <button 
                      onClick={() => openPreviewModal(template)}
                      className="border border-slate-200 hover:bg-white text-slate-700 text-xs font-semibold py-2.5 px-4 rounded-xl transition"
                    >
                      Live Demo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Visual Editor Mode (GrapesJS Canvas & Side Panels) */}
      {viewMode === 'visual_editor' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  setViewMode('grid');
                  if (gjsEditorRef.current) {
                    gjsEditorRef.current.destroy();
                    gjsEditorRef.current = null;
                  }
                }}
                className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <div className="space-y-1">
                <input 
                  type="text" 
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="font-extrabold text-slate-900 text-lg bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition px-1 py-0.5"
                  placeholder="Template Name"
                />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-medium">Category:</span>
                  <select 
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="text-xs font-bold text-slate-600 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer p-0"
                  >
                    <option value="General">General</option>
                    <option value="Transactional">Transactional</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Merge Subject Line Field */}
            <div className="flex-1 max-w-md relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">SUBJECT:</span>
              <input 
                type="text"
                placeholder="Secure Booking Confirmation - {{service_name}}"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                className="w-full pl-16 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700"
              />
            </div>

            {/* Save Dispatches */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => openPreviewModal({ ...activeTemplate, htmlSource: gjsEditorRef.current?.getHtml(), projectData: gjsEditorRef.current?.getProjectData() })}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </button>

              <button 
                onClick={() => {
                  setActiveTemplate(prev => ({
                    ...prev,
                    htmlSource: gjsEditorRef.current?.getHtml(),
                    projectData: gjsEditorRef.current?.getProjectData()
                  }));
                  setShowTestSendModal(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                Test Dispatch
              </button>

              <button 
                onClick={handleSaveTemplate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-md shadow-indigo-100"
              >
                <Save className="w-3.5 h-3.5" />
                Save & Deploy
              </button>
            </div>
          </div>

          {/* GrapesJS Layout (Central Builder & Config Panels Side by Side) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* Visual Builder Canvas */}
            <div className="xl:col-span-9 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div id="gjs" ref={gjsContainerRef} className="grapes-editor-canvas"></div>
            </div>

            {/* Custom Control Panels Side Drawer */}
            <div className="xl:col-span-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-6">
              
              {/* Tabs list */}
              <div className="grid grid-cols-5 gap-1 border-b border-slate-100 pb-3">
                <button 
                  onClick={() => setActiveTab('blocks')}
                  className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 ${activeTab === 'blocks' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-800'}`}
                  title="Blocks"
                >
                  <Grid className="w-4 h-4" />
                  <span className="text-[9px] font-bold">Blocks</span>
                </button>

                <button 
                  onClick={() => setActiveTab('styles')}
                  className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 ${activeTab === 'styles' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-800'}`}
                  title="Styles Manager"
                >
                  <Palette className="w-4 h-4" />
                  <span className="text-[9px] font-bold">Styles</span>
                </button>

                <button 
                  onClick={() => setActiveTab('layers')}
                  className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 ${activeTab === 'layers' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-800'}`}
                  title="Layers"
                >
                  <Layers className="w-4 h-4" />
                  <span className="text-[9px] font-bold">Layers</span>
                </button>

                <button 
                  onClick={() => setActiveTab('variables')}
                  className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 ${activeTab === 'variables' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-800'}`}
                  title="Variables"
                >
                  <Type className="w-4 h-4" />
                  <span className="text-[9px] font-bold">Vars</span>
                </button>

                <button 
                  onClick={() => setActiveTab('assets')}
                  className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 ${activeTab === 'assets' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-800'}`}
                  title="Image Assets"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-[9px] font-bold">Media</span>
                </button>
              </div>

              {/* Dynamic Tab Body */}
              <div className="min-h-[450px] max-h-[500px] overflow-y-auto pr-1">
                
                {/* 1. Blocks Container */}
                <div className={activeTab === 'blocks' ? 'block space-y-4' : 'hidden'}>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">Drag any component directly into the design stage.</p>
                  <div id="blocks-container" className="grapesjs-custom-blocks"></div>
                </div>

                {/* 2. Style Manager */}
                <div className={activeTab === 'styles' ? 'block space-y-4' : 'hidden'}>
                  <p className="text-[11px] text-slate-400 font-medium">Select an element on canvas to modify design properties.</p>
                  <div id="styles-container" className="grapesjs-custom-styles"></div>
                </div>

                {/* 3. Layers & Traits */}
                <div className={activeTab === 'layers' ? 'block space-y-4' : 'hidden'}>
                  <h4 className="font-bold text-xs text-slate-700 border-b pb-1.5 mb-2">Layers DOM</h4>
                  <div id="layers-container"></div>
                  <h4 className="font-bold text-xs text-slate-700 border-b pb-1.5 mt-6 mb-2">Selected Attributes</h4>
                  <div id="traits-container"></div>
                </div>

                {/* 4. Variable Picker */}
                <div className={activeTab === 'variables' ? 'block space-y-4' : 'hidden'}>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-2">
                    <h5 className="font-extrabold text-[10px] text-indigo-700 uppercase">Interactive Variables Picker</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Click any merge field below. It copy-pastes instantly so you can customize dynamic transactional data fields.</p>
                  </div>

                  <div className="space-y-4">
                    {['Customer', 'Booking', 'Business', 'Support', 'System'].map(category => (
                      <div key={category} className="space-y-1.5">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{category}</span>
                        <div className="flex flex-col gap-1.5">
                          {AVAILABLE_VARIABLES.filter(v => v.category === category).map(v => (
                            <button
                              key={v.name}
                              onClick={() => copyVariable(v.name)}
                              className="text-left w-full bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 p-2 rounded-lg text-[11px] font-mono text-slate-700 flex items-center justify-between transition cursor-pointer"
                            >
                              <span className="font-bold text-indigo-600">{"{{"}{v.name}{"}}"}</span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{v.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Image Assets (Integrated Image Manager) */}
                <div className={activeTab === 'assets' ? 'block space-y-4' : 'hidden'}>
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-bold text-xs text-slate-700">Image Library</h4>
                    <label className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition">
                      {isUploadingAsset ? 'Uploading...' : 'Upload File'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleUploadImage} 
                        className="hidden" 
                        disabled={isUploadingAsset}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {assets.map((asset, i) => (
                      <div key={i} className="group relative bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:border-indigo-300 transition-all">
                        <img 
                          src={asset.url || asset.src} 
                          alt={asset.name} 
                          className="w-full h-24 object-cover cursor-pointer"
                          onClick={() => {
                            if (gjsEditorRef.current) {
                              const selected = gjsEditorRef.current.getSelected();
                              if (selected && selected.is('image')) {
                                selected.set('src', asset.url || asset.src);
                                showToast('Replaced active image with asset!', 'success');
                              } else {
                                showToast('Please select an image element on canvas first.', 'error');
                              }
                            }
                          }}
                        />
                        <div className="p-1.5 bg-white border-t flex items-center justify-between">
                          <span className="text-[9px] font-semibold text-slate-500 truncate max-w-[80px]">{asset.name}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(asset.url || asset.src);
                              showToast('Image link copied to clipboard!', 'success');
                            }}
                            className="text-slate-400 hover:text-indigo-600"
                            title="Copy image URL"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* MJML Live Code Editor View */}
      {viewMode === 'mjml_editor' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewMode('grid')}
                className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <div className="space-y-1">
                <input 
                  type="text" 
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="font-extrabold text-slate-900 text-lg bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition px-1 py-0.5"
                  placeholder="MJML Template Name"
                />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-medium">Coding Layout:</span>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest">MJML Schema v4</span>
                </div>
              </div>
            </div>

            {/* Subject line merge field */}
            <div className="flex-1 max-w-md relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">SUBJECT:</span>
              <input 
                type="text"
                placeholder="Subject Line"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                className="w-full pl-16 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700"
              />
            </div>

            {/* Save Dispatches */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleCompileMjml(mjmlSource)}
                disabled={isCompilingMjml}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                {isCompilingMjml ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Compile Markup
              </button>

              <button 
                onClick={() => {
                  setActiveTemplate(prev => ({
                    ...prev,
                    mjmlSource,
                    htmlSource: mjmlPreviewHtml
                  }));
                  setShowTestSendModal(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                Test Dispatch
              </button>

              <button 
                onClick={handleSaveTemplate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-md shadow-indigo-100"
              >
                <Save className="w-3.5 h-3.5" />
                Save & Deploy
              </button>
            </div>
          </div>

          {/* Dual Column Layout (Editor Left, Responsive Preview Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Code input & Variables Bar */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              {/* Quick variables picker ribbon */}
              <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Merge Fields Variable ribbon:</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 max-h-[40px]">
                  {AVAILABLE_VARIABLES.map(v => (
                    <button
                      key={v.name}
                      onClick={() => {
                        setMjmlSource(prev => prev + ` {{${v.name}}}`);
                        showToast(`Inserted {{${v.name}}} merge field!`, 'success');
                      }}
                      className="bg-white hover:bg-indigo-50 border border-slate-200 px-2.5 py-1 rounded text-[10px] font-mono text-indigo-600 whitespace-nowrap transition"
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code TextArea */}
              <div className="relative bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex-1 flex flex-col">
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400">
                  <span className="font-mono">source.mjml</span>
                  <span className="text-[10px] font-black uppercase text-indigo-400">XML Format</span>
                </div>
                
                <textarea
                  value={mjmlSource}
                  onChange={(e) => setMjmlSource(e.target.value)}
                  rows={25}
                  className="w-full bg-slate-950 text-emerald-400 font-mono text-xs p-5 outline-none focus:ring-0 border-none resize-none overflow-y-auto leading-relaxed"
                />
              </div>
            </div>

            {/* Right Column: Compiled HTML Live Responsive Frames */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
              
              {/* Frame Controls Bar */}
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center gap-4">
                <div className="flex gap-1.5 bg-white border rounded-lg p-1">
                  <button 
                    onClick={() => setPreviewSize('desktop')}
                    className={`p-1.5 rounded transition ${previewSize === 'desktop' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Desktop Preview"
                  >
                    <Laptop className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setPreviewSize('tablet')}
                    className={`p-1.5 rounded transition ${previewSize === 'tablet' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Tablet Preview"
                  >
                    <Tablet className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setPreviewSize('mobile')}
                    className={`p-1.5 rounded transition ${previewSize === 'mobile' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Mobile Preview"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Interactive Preview Frame</span>
                </div>
              </div>

              {/* Centered Iframe stage container */}
              <div className="bg-slate-100 p-6 flex-1 flex items-center justify-center min-h-[500px]">
                <div className="bg-white shadow-2xl rounded-xl overflow-hidden transition-all duration-300" style={{
                  width: previewSize === 'desktop' ? '100%' : previewSize === 'tablet' ? '480px' : '360px',
                  height: '600px'
                }}>
                  {mjmlPreviewHtml ? (
                    <iframe 
                      srcDoc={renderVariablesOffline(mjmlPreviewHtml)} 
                      title="MJML Output compiled responsive HTML frame"
                      className="w-full h-full border-none bg-white"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2">
                      <FileCode className="w-10 h-10 text-slate-300" />
                      <span className="font-semibold text-slate-600">No output compiled yet</span>
                      <span className="text-xs">Click "Compile Markup" in header to generate responsive HTML visualization.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL 1: AI Email Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white rounded-t-[2rem] sm:rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start sticky top-0 bg-white z-10 pb-2">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  AI Generator
                </h3>
                <p className="text-xs text-slate-500 mt-1">Harness Groq Llama-3.3 LLMs to produce perfectly optimized and compliant communications layouts.</p>
              </div>
              <button onClick={() => setShowAiModal(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateAiTemplate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Business Niche / Type</label>
                  <input 
                    type="text" 
                    value={aiForm.businessType}
                    onChange={(e) => setAiForm(prev => ({ ...prev, businessType: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                    placeholder="e.g. Legal Consulting, Retail"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Company / Brand Name</label>
                  <input 
                    type="text" 
                    value={aiForm.brandName}
                    onChange={(e) => setAiForm(prev => ({ ...prev, brandName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                    placeholder="e.g. OminiCorp"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Campaign Concept / Type</label>
                <input 
                  type="text" 
                  value={aiForm.campaignType}
                  onChange={(e) => setAiForm(prev => ({ ...prev, campaignType: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  placeholder="e.g. Customer Satisfaction Survey, Black Friday Sale"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Campaign Ultimate Goal / Offer details</label>
                <textarea 
                  value={aiForm.campaignGoal}
                  onChange={(e) => setAiForm(prev => ({ ...prev, campaignGoal: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  placeholder="e.g. Bring inactive customers back with a free checkout shipping coupon."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Call to Action (CTA)</label>
                  <input 
                    type="text" 
                    value={aiForm.cta}
                    onChange={(e) => setAiForm(prev => ({ ...prev, cta: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                    placeholder="Claim Discount Now"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Brand Main Accent Color</label>
                  <input 
                    type="color" 
                    value={aiForm.brandColors}
                    onChange={(e) => setAiForm(prev => ({ ...prev, brandColors: e.target.value }))}
                    className="w-full h-9 bg-transparent border-none cursor-pointer outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Coding Output Format</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setAiForm(prev => ({ ...prev, templateType: 'html' }))}
                    className={`py-2 px-4 rounded-xl border font-bold text-center transition ${
                      aiForm.templateType === 'html' 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    HTML Canvas Layout
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiForm(prev => ({ ...prev, templateType: 'mjml' }))}
                    className={`py-2 px-4 rounded-xl border font-bold text-center transition ${
                      aiForm.templateType === 'mjml' 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    MJML Code Layout
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t flex flex-col sm:flex-row justify-end gap-2 sticky bottom-0 bg-white z-10">
                <button 
                  type="button" 
                  onClick={() => setShowAiModal(false)}
                  className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isGeneratingAi}
                  className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-extrabold shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGeneratingAi ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      LLM Synthesizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Template
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: Import Template Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white rounded-t-[2rem] sm:rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-slate-900">Import Template</h3>
              <button onClick={() => setShowImportModal(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500">Upload a saved `.json` OminiRep template representation from your device. It will automatically load the layout components directly into your active manager.</p>

            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 text-center bg-slate-50/50 cursor-pointer transition">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <span className="block text-xs font-bold text-slate-700">Drag & Drop JSON File</span>
              <span className="block text-[10px] text-slate-400 mt-1">or click to browse local files</span>
              <input 
                type="file" 
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportJson(file);
                }}
                className="hidden" 
                id="json-import-input"
              />
              <label htmlFor="json-import-input" className="mt-4 inline-block bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold py-2 px-4 rounded-lg cursor-pointer transition">
                Select File
              </label>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: Preview Template Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex flex-col justify-end sm:justify-center bg-slate-900/70 backdrop-blur-sm p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white rounded-t-[2rem] sm:rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full mx-auto overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center gap-4 flex-none">
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span className="truncate">Layout Preview</span>
                </h3>
              </div>

              {/* Layout Sizers */}
              <div className="flex gap-1.5 bg-white border rounded-lg p-1 text-slate-500">
                <button 
                  onClick={() => setPreviewSize('desktop')}
                  className={`p-1.5 rounded transition ${previewSize === 'desktop' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Laptop className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setPreviewSize('tablet')}
                  className={`p-1.5 rounded transition ${previewSize === 'tablet' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setPreviewSize('mobile')}
                  className={`p-1.5 rounded transition ${previewSize === 'mobile' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>

              <button onClick={() => setShowPreviewModal(false)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subject preview strip */}
            <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 flex items-center gap-3 text-xs text-amber-900">
              <span className="font-extrabold uppercase">Subject:</span>
              <span className="font-bold truncate">{renderedPreviewSubject || activeTemplate?.subject || '(No Subject)'}</span>
            </div>

            {/* Stage Iframe Frame */}
            <div className="bg-slate-100 p-6 flex-1 overflow-y-auto flex items-center justify-center min-h-[400px]">
              {isLoadingPreview ? (
                <div className="text-center text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                  <span>Compiling Handlebars data context...</span>
                </div>
              ) : (
                <div 
                  className="bg-white shadow-2xl rounded-xl overflow-hidden transition-all duration-300" 
                  style={{
                    width: previewSize === 'desktop' ? '100%' : previewSize === 'tablet' ? '480px' : '360px',
                    height: '520px'
                  }}
                >
                  <iframe 
                    srcDoc={renderedPreviewContent} 
                    title="Compiled HTML view stage"
                    className="w-full h-full border-none"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-2 flex-none">
              <button 
                onClick={() => {
                  setShowPreviewModal(false);
                  setShowTestSendModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Proceed to Test Send
              </button>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition"
              >
                Close Preview
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 4: Test Send Template Modal */}
      {showTestSendModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white rounded-t-[2rem] sm:rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-6"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900">Test Deliver</h3>
                <p className="text-xs text-slate-400 mt-1">Dispatches email to actual mailbox through SMTP.</p>
              </div>
              <button onClick={() => setShowTestSendModal(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Recipient Address (To Email)</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. business.owner@ominirep.com"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Subject Title</label>
                <input 
                  type="text" 
                  value={templateSubject || activeTemplate?.subject || ''}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  placeholder="e.g. Action Required: Your Schedule is Booked"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 text-xs"
                />
              </div>

              {/* Delivery simulator info box */}
              {testSendResult && (
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                  testSendResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <span className="font-bold flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
                    {testSendResult.success ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                    {testSendResult.isSimulated ? 'Simulation Sandbox Notice' : 'SMTP Server Dispatch Status'}
                  </span>
                  <p>{testSendResult.isSimulated 
                    ? 'SMTP is not currently configured for this client. The delivery was intercepted and simulated safely in the Outbox Database.' 
                    : 'The email was successfully routed through Nodemailer SMTP server and processed.'}
                  </p>
                  <div className="pt-2 border-t font-mono text-[9px] text-slate-500">
                    <div>Recipient: {testSendResult.to}</div>
                    <div>Event ID: {testSendResult.messageId || 'N/A'}</div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowTestSendModal(false)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSendingTest}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Test Mail
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}

// HTML & MJML Boilerplate constants for zero placeholder coding experience
function getAdvisoryBookingHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Accent Banner -->
          <tr>
            <td style="background-color: #4f46e5; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; tracking-tight;">Booking Confirmed</h1>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 30px; color: #334155;">
              <p style="font-size: 16px; margin: 0 0 20px 0; line-height: 1.6;">Hello <strong>{{full_name}}</strong>,</p>
              <p style="font-size: 14px; margin: 0 0 24px 0; line-height: 1.6; color: #475569;">We are excited to confirm your appointment for <strong>{{service_name}}</strong>. Our AI coordinator has matched you with <strong>{{agent_name}}</strong>. Below are your scheduling details:</p>
              
              <!-- Booking details table block -->
              <table role="presentation" border="0" cellpadding="10" cellspacing="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td width="30%" style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Date</td>
                  <td width="70%" style="font-size: 14px; font-weight: 600; color: #0f172a;">{{booking_date}}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Time</td>
                  <td style="font-size: 14px; font-weight: 600; color: #0f172a;">{{booking_time}}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Company</td>
                  <td style="font-size: 14px; font-weight: 600; color: #0f172a;">{{company_name}}</td>
                </tr>
              </table>
              
              <p style="font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">If you need to reschedule or cancel your booking, please reach out directly at our helpline or reply to this message.</p>
              
              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <a href="{{website_url}}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Manage Appointment</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer copyright notice block -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
              <p style="margin: 0 0 4px 0;">This communication was dispatched automatically on behalf of {{company_name}}.</p>
              <p style="margin: 0 0 12px 0;">Helpline: {{support_phone}} | Email: {{support_email}}</p>
              <a href="{{unsubscribe_link}}" style="color: #4f46e5; text-decoration: underline;">Safe Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getSupportTicketHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket Resolved</title>
</head>
<body style="background-color: #f1f5f9; padding: 20px; font-family: sans-serif;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background-color: #1e293b; padding: 30px; text-align: center; color: white;">
      <h2 style="margin:0;">Support Case Resolved</h2>
    </div>
    <div style="padding: 30px; color: #334155; line-height: 1.6;">
      <p>Hello {{full_name}},</p>
      <p>This message acknowledges that our team has resolved your ticket inquiry regarding:</p>
      <blockquote style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-left: 4px solid #6366f1; font-weight: 500; font-style: italic;">
        {{inquiry_subject}}
      </blockquote>
      <p>We hope the advisory services provided by <strong>{{agent_name}}</strong> completely answered your concerns. Feel free to access your full interaction portal below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{website_url}}" style="background-color: #6366f1; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Portal</a>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
      <p>You received this as part of support tickets filed under {{company_name}}.</p>
      <p><a href="{{unsubscribe_link}}" style="color: #6366f1; text-decoration: underline;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getOnboardingMjml() {
  return `
<mjml>
  <mj-head>
    <mj-title>Welcome to OminiRep</mj-title>
    <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" />
    <mj-attributes>
      <mj-all font-family="'Inter', sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f8fafc">
    <!-- Header Banner -->
    <mj-section background-color="#1e1b4b" padding="40px 20px">
      <mj-column>
        <mj-text color="#ffffff" font-size="28px" font-weight="700" align="center" letter-spacing="-0.5px">
          Welcome to {{company_name}}!
        </mj-text>
        <mj-text color="#cbd5e1" font-size="15px" align="center" line-height="1.5">
          Your OminiRep automated communication assistant is fully active.
        </mj-text>
      </mj-column>
    </mj-section>
    
    <!-- Hero Body -->
    <mj-section background-color="#ffffff" padding="30px 20px">
      <mj-column>
        <mj-text color="#0f172a" font-size="16px" font-weight="600" line-height="1.6">
          Hello {{full_name}},
        </mj-text>
        <mj-text color="#334155" font-size="14px" line-height="1.6">
          We're thrilled to welcome you to the future of multi-tenant enterprise communication. OminiRep helps businesses connect with leads instantly through AI agents, WhatsApp, and advanced notification routers.
        </mj-text>
        <mj-button background-color="#4f46e5" color="#ffffff" font-size="14px" font-weight="700" href="{{website_url}}" border-radius="6px" padding="20px 0">
          Claim Onboarding Tutorial
        </mj-button>
      </mj-column>
    </mj-section>

    <!-- Footer block -->
    <mj-section background-color="#f8fafc" padding="20px 10px">
      <mj-column>
        <mj-text color="#64748b" font-size="12px" align="center" line-height="1.5">
          You are receiving this transactional update because you registered with {{company_name}}.
        </mj-text>
        <mj-text color="#64748b" font-size="12px" align="center">
          <a href="{{unsubscribe_link}}" style="color: #4f46e5; text-decoration: underline;">Unsubscribe</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
  `.trim();
}

function getNewMjmlBoilerplate() {
  return `
<mjml>
  <mj-head>
    <mj-title>My New Template</mj-title>
  </mj-head>
  <mj-body background-color="#f1f5f9">
    <mj-section background-color="#ffffff" padding="20px">
      <mj-column>
        <mj-text font-size="20px" font-weight="700" color="#4f46e5">New Email Template</mj-text>
        <mj-text font-size="14px" color="#334155">Welcome, {{full_name}}!</mj-text>
        <mj-button background-color="#4f46e5" href="{{website_url}}">Click Here</mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
  `.trim();
}
