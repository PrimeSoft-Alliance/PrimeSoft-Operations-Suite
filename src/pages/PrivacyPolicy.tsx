import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Shield, FileText, ArrowLeft, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function PrivacyPolicy() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'privacy';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const tabs = [
    { id: 'privacy', name: 'Privacy, Cookies & AI Policy' },
    { id: 'terms', name: 'Terms of Service' },
    { id: 'dpa', name: 'Data Processing Addendum (DPA)' },
    { id: 'subscription', name: 'SaaS Subscription Agreement' },
    { id: 'refunds', name: 'Refund, Billing & Cancellation' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* Background Aesthetics */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-100/50 to-transparent -z-10 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 pt-10">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Landing Page</span>
        </Link>

        {/* Title Block */}
        <div className="mb-10 text-center sm:text-left">
          <span className="text-[10px] uppercase font-black text-indigo-700 bg-indigo-100/60 px-3 py-1 rounded-full tracking-widest shrink-0">
            Corporate Governance & Trust Center
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mt-3">Legal, Trust & Security Center</h1>
          <p className="text-slate-500 font-semibold text-sm mt-2">
            Read our master service terms, acceptable AI practices, refund terms, and data security guarantees maintained by PrimeSoft Alliance.
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
            <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider ml-2.5 mb-3">Documents Index</div>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold leading-normal transition flex items-center justify-between group cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-transparent text-slate-650 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <span>{tab.name}</span>
                <span className={activeTab === tab.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}>
                  &rarr;
                </span>
              </button>
            ))}

            <div className="mt-8 pt-6 border-t border-slate-100 px-2">
              <div className="bg-indigo-50/55 rounded-2xl p-4 border border-indigo-100 flex items-start gap-3">
                <Shield className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-[11px] font-black uppercase text-indigo-950">Tenant Security</h4>
                  <p className="text-[10.5px] leading-relaxed text-indigo-750/90 mt-1 font-semibold">
                    All client databases operate within logical isolation parameters. Data is guaranteed under PrimeSoft Alliance SLA policies.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Document Viewer */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[2rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
            {activeTab === 'privacy' && <PrivacyPolicyDocument />}
            {activeTab === 'terms' && <TermsOfServiceDocument />}
            {activeTab === 'dpa' && <DpaDocument />}
            {activeTab === 'subscription' && <SaaSAgreementDocument />}
            {activeTab === 'refunds' && <RefundsPolicyDocument />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* 1. DPA Document Component */
function DpaDocument() {
  return (
    <article className="prose prose-slate max-w-none text-slate-650 leading-relaxed text-sm">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <span>Document Index: Annex A</span>
      </div>
      <h2 className="text-3xl font-black text-slate-950 tracking-tight mb-6">PrimeSoft Alliance Data Processing Addendum (DPA)</h2>
      <p className="text-xs text-slate-400 font-semibold mb-6">Effective Date: June 15, 2026 | Last Updated: June 15, 2026</p>

      <p className="mb-6 font-semibold">
        This Data Processing Addendum ("DPA") forms part of and is incorporated into the PrimeSoft Alliance Terms of Service, SaaS Subscription Agreement, Master Services Agreement, Order Form, or other written agreement governing the use of PrimeSoft Alliance services (collectively, the "Agreement"). This DPA applies whenever PrimeSoft Alliance processes Personal Data on behalf of a customer.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">1. Parties</h3>
      <p className="mb-4">
        This DPA is entered into between <strong>PrimeSoft Alliance</strong> ("Processor", "Service Provider", "us") and the <strong>Customer</strong> ("Controller", "Business", "you"). Each may be referred to individually as a "Party" and collectively as the "Parties."
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">2. Purpose</h3>
      <p className="mb-4">
        This DPA establishes the rights and obligations of the Parties regarding the processing of Personal Data in connection with PrimeSoft Alliance services. The Parties intend for this DPA to satisfy applicable data protection laws including, where applicable, Nigeria Data Protection Act (NDPA), UK GDPR, EU GDPR, California Consumer Privacy Act (CCPA), and other global specifications.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">3. Definitions & Roles</h3>
      <p className="mb-4">
        "Personal Data" means information relating to an identified or identifiable natural person. "Processing" means any operation performed on Personal Data, including collection, storage, retrieval, disclosure, or deletion. Customer acts as Controller; PrimeSoft Alliance acts as Processor.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">4. Scope of Processing & Categories of Data</h3>
      <p className="mb-4">
        PrimeSoft Alliance processes Personal Data in connection with providing SaaS platform services, website widget execution, booking systems, leads stream, and AI-powered reasoning cache. Categories of data include Customer Account Data (names, emails, credentials), Business Info, end Customer booking vectors, Technical IPs, and AI Interaction prompts.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">5. Confidentiality & Security Measures</h3>
      <p className="mb-4">
        PrimeSoft Alliance shall ensure authorized personnel are subject to confidentiality obligations and security training. We implement commercially reasonable technical and organizational measures designed to protect Personal Data, including role-based authentication, secure encryption layers, continuous logging, and active file backups.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">6. AI Services</h3>
      <p className="mb-4">
        Where Customer uses AI-powered features, Customer remains responsible for determining whether personal data may be submitted to the vector prompt. PrimeSoft Alliance may process interaction weights to streamline performance, reduce hallucination, and monitor policy violations.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">7. Return or Deletion of Data</h3>
      <p className="mb-4">
        Upon termination of Services and subject to legal obligations, PrimeSoft Alliance will delete, return, or anonymize Customer Personal Data where technically feasible. Backup files may continue to exist in secured environments for limited periods.
      </p>
    </article>
  );
}

/* 2. Privacy Policy Document Component */
function PrivacyPolicyDocument() {
  return (
    <article className="prose prose-slate max-w-none text-slate-650 leading-relaxed text-sm">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <span>Document Index: trust-011</span>
      </div>
      <h2 className="text-3xl font-black text-slate-950 tracking-tight mb-6">Privacy, Cookies, AI & Acceptable Use Policy</h2>
      <p className="text-xs text-slate-400 font-semibold mb-6">Effective Date: June 15, 2026 | Last Updated: June 15, 2026</p>

      <p className="mb-6 font-semibold">
        PrimeSoft Alliance respects your privacy and is committed to protecting personal information. This Privacy, Cookies, AI & Acceptable Use Policy explains how we collect, use, disclose, store, protect, and process information when you use our websites, applications, widgets, software, dashboards, calendars, and AI tools (collectively, the "Services").
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">1. Information We Collect</h3>
      <ul className="list-disc pl-5 space-y-2 mb-6">
        <li><strong>Information You Provide:</strong> Full name, company metadata, email coordinates, phone, credentials, onboarding parameters, and training documents uploaded directly into your AI Brain.</li>
        <li><strong>AI Interaction Data:</strong> Prompts, chat logs, lead capture metrics, similarity matching feedbacks, and conversation logs.</li>
        <li><strong>Technical Information:</strong> IP addresses, browser types, session metrics, cookie vectors, and location estimations.</li>
      </ul>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">2. How We Use Information</h3>
      <p className="mb-4">
        We use information to execute and maintain the Services, configure personalized multi-tenant environments, trigger booking confirmation actions, prevent system abuse, comply with governing legal bodies, and refine conversion analytics.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">3. AI Usage Policy & Limitations</h3>
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 mb-6 text-amber-905 text-xs text-amber-900 leading-relaxed font-semibold">
        <strong>AI Representation Disclaimer:</strong> Users acknowledge that AI outputs may occasionally be inaccurate, outdated, or incomplete. Customer is solely responsible for reviewing responses and verifying correctness before publication or actioning customer orders.
      </div>
      <p className="mb-4">
        Users agree not to use OminiRep AI features to generate fraudulent instructions, compile phishing networks, impersonate unauthorized entities, produce malware, or violate privacy layers. PrimeSoft Alliance reserves the right to restrict quotas or block keys detected committing abuse.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">4. Cookies and Similar Technologies</h3>
      <p className="mb-4">
        We use session cookies and local browser storage to persist client login tokens, protect dashboards against cross-site scripting, coordinate load balancing, and remember active workspace preferences. Disabling them may severely restrict portal login functions.
      </p>
    </article>
  );
}

/* 3. Refund, Billing & Cancellation Policy */
function RefundsPolicyDocument() {
  return (
    <article className="prose prose-slate max-w-none text-slate-650 leading-relaxed text-sm">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <span>Document Index: commercial-bill</span>
      </div>
      <h2 className="text-3xl font-black text-slate-950 tracking-tight mb-6">Enterprise Refund, Billing & Cancellation Policy</h2>
      <p className="text-xs text-slate-400 font-semibold mb-6">Effective Date: June 15, 2026 | Last Updated: June 15, 2026</p>

      <p className="mb-6 font-semibold">
        This policy governs all cancellations, platform renewals, and transaction terms for subscriptions, custom setup integrations, and managed services processed through PrimeSoft Alliance.
      </p>

      <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold leading-normal mb-8">
        <strong>Strict B2B Policy:</strong> PrimeSoft Alliance offers business-to-business services. Due to automatic system resource provisioning, API keys generation, and immediate cloud allocations, ALL TRANSACTIONS ARE FINAL AND NON-REFUNDABLE.
      </div>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">1. Subscriptions Automatic Renewal</h3>
      <p className="mb-4">
        Both Monthly and Annual subscription packages automatically renew at the termination of each period. Customers are solely responsible for initiating cancellations under their settings or notifying administrative billing teams prior to the transaction date. Renewals are not refundable under any conditions.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">2. Setup, Custom Development & Onboarding Fees</h3>
      <p className="mb-4">
        Fees relating to initial client workspace onboarding, custom website design, WhatsApp dedicated API configurations, and vector training development compensate dedicated engineering resource allocations immediately and are strictly non-refundable.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">3. Payment Suspensions</h3>
      <p className="mb-4">
        If transaction attempts fail, PrimeSoft Alliance reserves the right to freeze the corresponding tenant, restrict widget chats, and suspend calendar synchronizations until pending dues are normalized. Late payment interest rules apply according to active B2B subscription structures.
      </p>
    </article>
  );
}

/* 4. SaaS Subscription Agreement */
function SaaSAgreementDocument() {
  return (
    <article className="prose prose-slate max-w-none text-slate-650 leading-relaxed text-sm">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <span>Document Index: saas-agree</span>
      </div>
      <h2 className="text-3xl font-black text-slate-950 tracking-tight mb-6">SaaS Subscription Agreement</h2>
      <p className="text-xs text-slate-400 font-semibold mb-6">Effective Date: June 15, 2026 | Last Updated: June 15, 2026</p>

      <p className="mb-6 font-semibold">
        This SaaS Subscription Agreement governs the terms of system license, access models, customer responsibilities, and liability safeguards for the OminiRep Platform operated by PrimeSoft Alliance.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">1. Limited Usage Grant</h3>
      <p className="mb-4">
        Subject to compliance with this Agreement and payment of designated quotas, PrimeSoft Alliance grants Customer a limited, non-exclusive, non-transferable, non-sublicensable license to access the OminiRep portals. No source-level copyrights are transferred to client teams.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">2. Acceptable Platform Interaction</h3>
      <p className="mb-4">
        Clients agree to comply with system capacity limitations, respect multi-tenant rules, avoid any vectors bypass or scraping attempts, and obtain valid consent structures before tracking physical end customer coordinates.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">3. Ownership of Customer Data</h3>
      <p className="mb-4">
        The corporate client retains total, unhampered copyrights in any content, files, or vector embeddings uploaded to their workspace brain. Customer grants PrimeSoft Alliance a worldwide, limited, safe license to host, parse, and process such information solely to provide the Services.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">4. Limitation of Liability</h3>
      <p className="mb-4 underline font-bold">
        TO THE MAXIMUM EXTENT PERMITTED BY LAW: PrimeSoft Alliance disclaims any consequential, special, indirect, or punitive damages. Total aggregate liability in any billing year shall never exceed the fees paid by Customer during the previous twelve (12) months.
      </p>
    </article>
  );
}

/* 5. Terms of Service Document */
function TermsOfServiceDocument() {
  return (
    <article className="prose prose-slate max-w-none text-slate-650 leading-relaxed text-sm">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <span>Document Index: tos-001</span>
      </div>
      <h2 className="text-3xl font-black text-slate-950 tracking-tight mb-6">PrimeSoft Alliance Terms of Service</h2>
      <p className="text-xs text-slate-400 font-semibold mb-6">Effective Date: June 15, 2026 | Last Updated: June 15, 2026</p>

      <p className="mb-6 font-semibold">
        Welcome to PrimeSoft Alliance. These Terms of Service ("Terms") govern your access to the websites, applications, widgets, booking systems, and developer portals provided by PrimeSoft Alliance under the product suite OminiRep.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">1. Eligibility & Registration</h3>
      <p className="mb-4">
        By registering a customer portal workspace, you represent that you have legal capacity to enter binding commercial arrangements, and that you are authorized to act on behalf of the company or business entity listed.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">2. Description of Services</h3>
      <p className="mb-4">
        OminiRep operates as a multi-tenant client representative platform. We provide SaaS dashboards, calendar availability APIs, product catalog vector mapping, and AI chat integrations. We reserve the right to enrich, revise, or delay specific features as required to maintain network-wide reliability.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">3. Tenant Isolation Boundaries</h3>
      <p className="mb-4">
        Every workspace is allocated a unique, logically separated, cryptographically guarded Client ID. Bypassing, sniffing, or executing unauthorized injection queries against of other tenant channels is strictly prohibited and results in immediate account termination.
      </p>

      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-3">4. Broad Warranties Disclaimer</h3>
      <p className="mb-4 font-mono text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
        THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE." PRIMESOFT ALLIANCE AND ITS AFFILIATES DISCLAIM ALL REPRESENTATIONS OF PERFECT SECURITY, ACCURACY OF AI EMBEDDINGS COMPILATION, OR UNINTERRUPTED UPTIME AND CONVERSIONS RATIOS.
      </p>
    </article>
  );
}
