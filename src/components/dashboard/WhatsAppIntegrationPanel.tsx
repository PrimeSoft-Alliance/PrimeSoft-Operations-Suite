import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  Trash2, 
  Zap, 
  Copy, 
  Eye, 
  EyeOff, 
  Check,
  Info,
  Facebook,
  Phone,
  Key
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface WhatsAppIntegrationPanelProps {
  clientId: string;
}

export function WhatsAppIntegrationPanel({ clientId }: WhatsAppIntegrationPanelProps) {
  const [status, setStatus] = useState<'disconnected' | 'active'>('disconnected');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedVerify, setCopiedVerify] = useState(false);
  const [isConnectingEmbedded, setIsConnectingEmbedded] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Connection fields (Meta Cloud API properties)
  const [apiKey, setApiKey] = useState(''); // Displays and saves as whatsappAccessToken
  const [channelId, setChannelId] = useState(''); // Displays and saves as whatsappPhoneNumberId
  const [webhookSecret, setWebhookSecret] = useState(''); // Displays and saves as whatsappBusinessAccountId
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Facebook SDK and App Settings
  const [facebookAppId, setFacebookAppId] = useState('1757327225299952');
  const [copiedDomain, setCopiedDomain] = useState<'dev' | 'pre' | null>(null);
  const devDomain = 'https://ais-dev-sd5duguczjtfv63a5bf3xo-205179001401.europe-west2.run.app';
  const preDomain = 'https://ais-pre-sd5duguczjtfv63a5bf3xo-205179001401.europe-west2.run.app';

  // Pre-verified phone numbers state variables
  const [preVerifyBusinessId, setPreVerifyBusinessId] = useState('800777143114313');
  const [preVerifyPhoneNumber, setPreVerifyPhoneNumber] = useState('2349138986702');
  const [preVerifyAccessToken, setPreVerifyAccessToken] = useState('EAAYZBR6EEoZCABR8IqkdfkWvFu5GWDY4MyhLuGZBmWaEFlll9Joun4b8qUoxVgBvDDKAr6taTpwrwH6rt6EZAvlcFU4LZAuNmx17EzbOxs5s1gCXIkZAEmUZAMCRXgZComDaVLaM7xPiZBw17BehLJg3mA43yGg905moBg8uhp21w6ZBW3bi6IDZBuxWNZACx4rUuwZDZD');
  const [preVerifyResponse, setPreVerifyResponse] = useState<any>(null);
  const [preVerifyLoading, setPreVerifyLoading] = useState(false);
  const [preVerifyError, setPreVerifyError] = useState<string | null>(null);
  const [showPreVerifySection, setShowPreVerifySection] = useState(false);

  // Password visibility
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Is editing flag for when already connected but want to update credentials
  const [isEditing, setIsEditing] = useState(false);

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}/webhooks/whatsapp`
    : '';

  // Asynchronously load and initialize Facebook JS SDK
  const initFacebookSdk = (appId: string) => {
    if (!appId.trim()) return;

    // If FB is already loaded, re-init with new App ID
    if ((window as any).FB) {
      try {
        (window as any).FB.init({
          appId: appId.trim(),
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v25.0'
        });
      } catch (e) {
        console.error('Error re-initializing Facebook SDK:', e);
      }
      return;
    }

    (window as any).fbAsyncInit = function() {
      try {
        (window as any).FB.init({
          appId: appId.trim(),
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v25.0'
        });
        console.log('Facebook SDK loaded and initialized successfully with App ID:', appId);
      } catch (e) {
        console.error('Error in FB.init:', e);
      }
    };

    // Load the Facebook SDK script asynchronously
    const id = 'facebook-jssdk';
    if (document.getElementById(id)) return;
    const js = document.createElement('script') as HTMLScriptElement;
    js.id = id;
    js.async = true;
    js.defer = true;
    js.crossOrigin = 'anonymous';
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    const fjs = document.getElementsByTagName('script')[0];
    if (fjs && fjs.parentNode) {
      fjs.parentNode.insertBefore(js, fjs);
    } else {
      document.body.appendChild(js);
    }
  };

  useEffect(() => {
    initFacebookSdk(facebookAppId);
  }, [facebookAppId]);

  const handleEmbeddedSignup = async () => {
    setIsConnectingEmbedded(true);
    try {
      const redirectUri = encodeURIComponent(`${window.location.origin}/v1/whatsapp/facebook-callback`);
      const scope = encodeURIComponent('whatsapp_business_management,whatsapp_business_messaging');
      const extras = encodeURIComponent(JSON.stringify({
        setup: {
          company_name: "OminiRep"
        }
      }));
      
      // Direct redirect URL to the official Facebook login / business dialog page
      const facebookDialogUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${facebookAppId.trim()}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${clientId}&extras=${extras}`;
      
      window.open(facebookDialogUrl, '_blank');
    } catch (err) {
      console.error('Failed to connect via official Facebook flow:', err);
      alert('Network error initiating official Facebook onboarding.');
    } finally {
      setIsConnectingEmbedded(false);
    }
  };

  const handleSdkEmbeddedSignup = () => {
    if (!(window as any).FB) {
      alert('Facebook SDK is still loading or blocked. Please try again in a moment, or use the direct Redirect flow!');
      return;
    }

    setIsConnectingEmbedded(true);
    try {
      (window as any).FB.login((response: any) => {
        setIsConnectingEmbedded(false);
        console.log('Facebook login response:', response);
        if (response.authResponse) {
          // Inside standard Embedded Signup, we redirect with state and code/token
          const code = response.authResponse.code;
          if (code) {
            window.location.href = `/v1/whatsapp/facebook-callback?code=${code}&state=${clientId}`;
          } else {
            alert('Connected successfully! Completing integration setup...');
            window.location.href = `/v1/whatsapp/facebook-callback?code=sdk_success&state=${clientId}`;
          }
        } else {
          alert('Facebook login was cancelled or not authorized.');
        }
      }, {
        scope: 'whatsapp_business_management,whatsapp_business_messaging',
        extras: {
          setup: {
            company_name: "OminiRep"
          }
        }
      });
    } catch (err) {
      console.error('FB.login failed:', err);
      setIsConnectingEmbedded(false);
      alert('Error triggering Facebook Login popup.');
    }
  };

  const handlePreVerifyPhone = async () => {
    if (!preVerifyBusinessId.trim()) {
      alert('Please enter a valid Meta Business ID.');
      return;
    }
    if (!preVerifyPhoneNumber.trim()) {
      alert('Please enter a phone number.');
      return;
    }
    if (!preVerifyAccessToken.trim()) {
      alert('Please enter a System User Access Token.');
      return;
    }

    setPreVerifyLoading(true);
    setPreVerifyResponse(null);
    setPreVerifyError(null);

    const url = `https://graph.facebook.com/v25.0/${preVerifyBusinessId.trim()}/add_phone_numbers`;

    try {
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({
          "phone_number": preVerifyPhoneNumber.trim(),
          "access_token": preVerifyAccessToken.trim()
        }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      setPreVerifyResponse(data);
      if (data.error) {
        setPreVerifyError(data.error.message || 'Meta API returned an error.');
      }
    } catch (err: any) {
      console.error('Pre-verification API call failed:', err);
      setPreVerifyError(err?.message || 'Network error calling Meta API. Please check your internet connection or browser security settings.');
    } finally {
      setPreVerifyLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [clientId]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/v1/omni/client-settings/${clientId}`);
      const data = await res.json();
      if (data.success) {
        const client = data.data;
        if (client.whatsappPhoneNumberId) {
          setStatus('active');
          setIsEditing(false);
        } else {
          setStatus('disconnected');
          setIsEditing(true);
        }
        setApiKey(client.whatsappAccessToken || '');
        setChannelId(client.whatsappPhoneNumberId || '');
        setWebhookSecret(client.whatsappBusinessAccountId || '');
        setWhatsappNumber(client.whatsappNumber || '');
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !channelId.trim() || !whatsappNumber.trim()) {
      alert('Please fill in the WhatsApp Access Token, Phone Number ID, and WhatsApp Number.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/v1/whatsapp/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          whatsappAccessToken: apiKey.trim(),
          whatsappPhoneNumberId: channelId.trim(),
          whatsappBusinessAccountId: webhookSecret.trim(),
          whatsappNumber: whatsappNumber.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('active');
        setIsEditing(false);
        alert('WhatsApp credentials connected and saved successfully!');
        fetchStatus();
      } else {
        alert(data.error || 'Failed to save settings.');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      alert('An error occurred while saving your integration settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect this WhatsApp configuration? This will stop OminiRep AI auto-replies.')) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await fetch(`/v1/whatsapp/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('disconnected');
        setIsEditing(true);
        setApiKey('');
        setChannelId('');
        setWebhookSecret('');
        setWhatsappNumber('');
        alert('WhatsApp disconnected successfully.');
      } else {
        alert(data.error || 'Failed to disconnect.');
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
      alert('An error occurred during disconnection.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyVerifyToken = () => {
    navigator.clipboard.writeText('ominirep_token_2026');
    setCopiedVerify(true);
    setTimeout(() => setCopiedVerify(false), 2000);
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500 font-medium">Checking connection status...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Main Integration Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">WhatsApp Business API</h3>
              <p className="text-sm font-medium text-slate-400">Official Meta Cloud API Connection</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <span className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
             )}>
                {status === 'active' ? 'Connected' : 'Not Connected'}
             </span>
          </div>
        </div>

        {status === 'active' && !isEditing ? (
          // ACTIVE / CONNECTED STATE
          <div className="space-y-6">
            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
              <div>
                <h4 className="font-black text-emerald-900">Your WhatsApp Business Channel is Active</h4>
                <p className="text-sm text-emerald-700/80 leading-relaxed mt-1">
                  AI-powered customer interactions are live on <span className="font-black text-emerald-900">{whatsappNumber}</span>. Messages sent to this number are processed automatically.
                </p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-4">
              <h4 className="font-bold text-slate-700 text-sm">Connection Parameters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block mb-0.5">Phone Number ID</span>
                  <span className="text-slate-700 font-medium bg-white border border-slate-200 px-2 py-1 rounded block truncate">{channelId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">WhatsApp Number</span>
                  <span className="text-slate-700 font-medium bg-white border border-slate-200 px-2 py-1 rounded block">{whatsappNumber}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors"
              >
                Update Credentials
              </button>
              <button 
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="text-slate-400 font-bold text-sm hover:text-rose-600 transition-colors flex items-center gap-2 ml-auto"
              >
                <Trash2 className="w-4 h-4" />
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
              </button>
            </div>
          </div>
        ) : (
          // SETUP / FORM STATE (Disconnected or Editing)
          <div className="space-y-8">
            {/* Embedded Signup Onboarding Mode */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Facebook className="w-6 h-6 text-blue-600 animate-pulse" />
                    <h4 className="font-black text-slate-800 text-lg">Official Meta / Facebook Embedded Onboarding</h4>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Set up your WhatsApp Business Account (WABA) in minutes using Meta's official secure onboarding flow.
                  </p>
                </div>
              </div>

              {/* FB App Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 border border-slate-200 rounded-2xl">
                <div className="md:col-span-1 space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Your Meta App ID</label>
                  <input
                    type="text"
                    value={facebookAppId}
                    onChange={(e) => setFacebookAppId(e.target.value)}
                    placeholder="e.g. 1757327225299952"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono transition-all outline-none"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    Initialize Meta SDK with this custom app credential.
                  </p>
                </div>

                <div className="md:col-span-2 space-y-3 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Allowlist Domains for Meta JavaScript SDK</label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Under your Facebook Login → Settings page on Meta Developers dashboard, you MUST enter these domains under <strong>"Allowed Domains for the JavaScript SDK"</strong>:
                  </p>
                  
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-150 px-3 py-2 rounded-xl">
                      <span className="text-slate-600 truncate">{devDomain}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(devDomain);
                          setCopiedDomain('dev');
                          setTimeout(() => setCopiedDomain(null), 2000);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold shrink-0"
                      >
                        {copiedDomain === 'dev' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-150 px-3 py-2 rounded-xl">
                      <span className="text-slate-600 truncate">{preDomain}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(preDomain);
                          setCopiedDomain('pre');
                          setTimeout(() => setCopiedDomain(null), 2000);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold shrink-0"
                      >
                        {copiedDomain === 'pre' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleSdkEmbeddedSignup}
                  disabled={isConnectingEmbedded}
                  className="flex-1 flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider text-xs px-6 py-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all active:translate-y-0.5 hover:-translate-y-0.5"
                >
                  <Facebook className="w-4 h-4 fill-current" />
                  Popup Login (JS SDK)
                </button>

                <button
                  type="button"
                  onClick={handleEmbeddedSignup}
                  disabled={isConnectingEmbedded}
                  className="flex-1 flex items-center justify-center gap-2.5 bg-[#1877F2] hover:bg-[#155ebc] text-white font-black uppercase tracking-wider text-xs px-6 py-4 rounded-xl shadow-lg shadow-blue-600/15 transition-all active:translate-y-0.5 hover:-translate-y-0.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  Direct Redirect Flow
                </button>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-xs text-amber-800 leading-relaxed">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Pro-tip:</strong> Use <strong>Popup Login (JS SDK)</strong> if your domain is allowlisted on your App settings. Use the <strong>Direct Redirect Flow</strong> if you are having issues with popups inside nested sandbox preview iframes.
                </div>
              </div>

              {/* Pre-verified Phone Number Utility */}
              <div className="border-t border-slate-200 pt-6 mt-4">
                <button
                  type="button"
                  onClick={() => setShowPreVerifySection(!showPreVerifySection)}
                  className="w-full flex items-center justify-between text-left text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">Pre-verified Phone Number Utility</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-xl transition-all">
                    {showPreVerifySection ? 'Hide Utility' : 'Show Utility'}
                  </span>
                </button>

                {showPreVerifySection && (
                  <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                    <div className="text-xs text-slate-500 leading-relaxed">
                      This developer utility runs a direct Meta API Graph request to register a pre-verified phone number to your Meta Business Account before or during the Embedded Signup flow.
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Meta Business Account ID</label>
                        <input
                          type="text"
                          value={preVerifyBusinessId}
                          onChange={(e) => setPreVerifyBusinessId(e.target.value)}
                          placeholder="e.g. 800777143114313"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-mono outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Phone Number (E.164, no +)</label>
                        <input
                          type="text"
                          value={preVerifyPhoneNumber}
                          onChange={(e) => setPreVerifyPhoneNumber(e.target.value)}
                          placeholder="e.g. 2349138986702"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-mono outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">System User Access Token</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={preVerifyAccessToken}
                          onChange={(e) => setPreVerifyAccessToken(e.target.value)}
                          placeholder="Meta System User Token (EAAY...)"
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-mono outline-none"
                        />
                        <Key className="w-4 h-4 text-slate-400 absolute left-2.5 top-3.5" />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handlePreVerifyPhone}
                      disabled={preVerifyLoading}
                      className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-xs py-3.5 rounded-xl transition-all disabled:opacity-50"
                    >
                      {preVerifyLoading ? (
                        <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                      ) : (
                        <Phone className="w-3.5 h-3.5" />
                      )}
                      {preVerifyLoading ? 'Submitting request...' : 'Pre-Verify Phone Number'}
                    </button>

                    {preVerifyResponse && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Meta API Output</span>
                          {preVerifyError ? (
                            <span className="text-xs text-red-600 font-bold">Failed</span>
                          ) : (
                            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Success
                            </span>
                          )}
                        </div>
                        <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-48 leading-relaxed">
                          {JSON.stringify(preVerifyResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Or Configure Manually</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Manual Toggle */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowManualEntry(!showManualEntry)}
                className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 mx-auto transition-colors"
              >
                {showManualEntry ? 'Hide Manual Setup' : 'Show Manual Setup (Advanced)'}
              </button>
            </div>

            {(showManualEntry || apiKey || channelId) && (
              <form onSubmit={handleSave} className="space-y-6 border border-slate-200 p-6 rounded-2xl bg-white shadow-sm animate-in fade-in duration-300">
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-start gap-3">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-indigo-700 leading-relaxed">
                    Manually enter your official Meta Cloud API credentials obtained from the <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-0.5">Meta App Dashboard <ExternalLink className="w-3 h-3" /></a>.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* API Key */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">WhatsApp System Access Token</label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="EAABw..."
                        required
                        className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Channel ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Phone Number ID</label>
                    <input
                      type="text"
                      value={channelId}
                      onChange={(e) => setChannelId(e.target.value)}
                      placeholder="1039..."
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono transition-all outline-none"
                    />
                  </div>

                  {/* Webhook Secret */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">WhatsApp Business Account ID (WABA ID)</label>
                    <div className="relative">
                      <input
                        type={showSecret ? "text" : "password"}
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        placeholder="1234..."
                        className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">WhatsApp Number</label>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="e.g. +2349138986702"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md shadow-emerald-600/10 hover:bg-emerald-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Connecting...' : 'Save & Connect'}
                  </button>
                  {status === 'active' && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Step-by-Step Instructions & Webhook endpoint display */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-8 space-y-6">
        <div>
          <h4 className="text-lg font-black text-indigo-950 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Meta Webhook Configuration
          </h4>
          <p className="text-sm text-indigo-700/80 mt-1">
            Configure your Meta Developer dashboard to send real-time message events directly to OminiRep.
          </p>
        </div>

        {/* Webhook Endpoint Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-indigo-100 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-900 uppercase tracking-wider block">Your Webhook Callback URL</span>
              {copied ? (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Copied!
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl font-mono text-xs text-slate-700 grow overflow-x-auto whitespace-nowrap">
                {webhookUrl || 'Fetching webhook callback...'}
              </div>
              <button 
                onClick={copyWebhook}
                type="button"
                className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors border border-indigo-100"
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-indigo-100 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-900 uppercase tracking-wider block">Your Verify Token</span>
              {copiedVerify ? (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Copied!
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl font-mono text-xs text-slate-700 grow overflow-x-auto whitespace-nowrap">
                ominirep_token_2026
              </div>
              <button 
                onClick={copyVerifyToken}
                type="button"
                className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors border border-indigo-100"
                title="Copy Verify Token"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { 
              step: '1', 
              title: 'Get Meta Dev Credentials', 
              desc: 'Log in to developers.facebook.com. Create a Business App, enable WhatsApp product, and copy your System User Access Token and Phone Number ID.' 
            },
            { 
              step: '2', 
              title: 'Configure Webhook Callback', 
              desc: 'In WhatsApp → Configuration, click "Edit" under Webhooks. Paste the Webhook Callback URL copied above and enter "ominirep_token_2026" as the Verification Token.' 
            },
            { 
              step: '3', 
              title: 'Subscribe to Message Webhooks', 
              desc: 'Under Webhook Fields, subscribe to "messages". This ensures that OminiRep receives inbound client chats to process via AI.' 
            },
            { 
              step: '4', 
              title: 'Connect and Live Test', 
              desc: 'Save your Token, Phone Number ID, and WABA ID in the form above. Send a direct WhatsApp test chat to your phone number ID to chat with your OminiRep AI!' 
            }
          ].map((item, idx) => (
            <div key={idx} className="flex gap-4 p-4 bg-white rounded-2xl border border-indigo-100/50 shadow-sm">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-xs font-black shrink-0">
                {item.step}
              </div>
              <div>
                <h5 className="text-sm font-black text-indigo-900">{item.title}</h5>
                <p className="text-xs font-medium text-indigo-700/70 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
