import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, Shield, Zap, Globe, Users, Target, Database, Search, 
  Image as ImageIcon, Calendar, Code, MessageSquare, Check, CheckCircle2, 
  Layers, ChevronRight, HelpCircle, HardDrive, RefreshCw, Smartphone, 
  BarChart3, Settings, ShieldAlert, Cpu
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 font-black text-xl sm:text-2xl tracking-tighter text-slate-900">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Layers className="w-5 h-5" />
            </div>
            <span>OminiRep</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link to="/client/login" className="font-bold text-xs sm:text-sm text-slate-600 hover:text-indigo-650 transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="bg-indigo-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/10 hover:bg-indigo-700 transition-all hover:shadow-lg hover:shadow-indigo-600/25">
              Deploy Agent
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-24 lg:py-28 bg-white border-b border-slate-100 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-50 rounded-full blur-3xl -z-10 translate-x-12 -translate-y-12"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider mb-6">
            Formerly Ask OminiCSR
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 leading-[1.2] md:leading-[1.15] mb-6">
            Your AI Representative for <span className="text-indigo-600">Sales, Support & Success.</span>
          </h1>
          
          <p className="text-base sm:text-md md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10 font-semibold">
            OminiRep lets you deploy friendly, smart digital assistants on your website, WhatsApp, and social channels to answer customer questions, book appointments, and capture leads 24/7.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full max-w-sm sm:max-w-none mx-auto">
            <Link to="/signup" className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
              Deploy Your AI Representative
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
            <Link to="/client/login" className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center">
              Enter Workspace Portal
            </Link>
          </div>
        </div>
      </section>

      {/* What is OminiRep? Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
            <div>
              <span className="text-xs font-black tracking-widest text-indigo-600 uppercase">Interactive Digital Helpers</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-950 mt-2 mb-6 tracking-tight">What is OminiRep?</h2>
              <p className="text-slate-600 font-semibold text-sm leading-relaxed mb-4">
                OminiRep acts as an online digital employee that learns directly from your business manuals, FAQs, and files. We help you give your customers instant, accurate answers around the clock with zero guesswork.
              </p>
              <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
                We combine friendly chat assistants, calendar booking, and major messaging channels into a single easy-to-use workspace for your business.
              </p>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm">
              <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-4">Full Representative Capabilities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  'Customer Support', 'Shopping Support', 'Capturing Leads', 
                  'Appointment Booking', 'Order Status Lookups', 'New User Onboarding', 
                  'Common FAQ Solutions', 'Helpful Recommendations', 'Customer Engagement', 'Website Assistance'
                ].map((cap, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-indigo-505 text-indigo-500 shrink-0" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Vision Section */}
      <section className="py-12 sm:py-16 bg-white border-b border-slate-105 border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-black tracking-widest text-indigo-600 uppercase">Our Core Goal</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-2 mb-6">All in One Place</h2>
          <p className="text-slate-600 font-semibold text-sm sm:text-md leading-relaxed max-w-2xl mx-auto">
            You shouldn't have to pay for five different tools to chat with customers, take bookings, and manage leads. OminiRep brings everything together into a digital helper that feels like a natural part of your team.
          </p>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Tailored Solutions</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-1 tracking-tight">How Businesses Use OminiRep</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* E-commerce Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 md:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl w-fit mb-6">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-950 mb-3">E-Commerce Assistance</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-6">
                  Our helper recommends products, compares items for shoppers, answers sizing or shipping questions, and guides buyers to check out.
                </p>
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  {['Recommend and compare products', 'Help shoppers with their carts', 'Provide order shipping updates', 'Answer refund questions clearly'].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Service card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 md:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl w-fit mb-6">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-950 mb-3">Service & Local Businesses</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-6">
                  Perfect for clinics, salons, hotels, consultants, restaurants, and local services who want to automate bookings and capture leads automatically.
                </p>
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  {['Book appointments automatically', 'Provide quick pricing estimates', 'Explain your services and options', 'Ask preliminary questions'].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SaaS card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 md:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl w-fit mb-6">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-950 mb-3">Software & Online Services</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-6">
                  Give your users immediate help with tutorial lookups, step-by-step guides, payment questions, and subscription choices.
                </p>
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  {['Friendly helper for customer setup', 'Walk users through key features', 'Resolve billing and pricing questions', 'Answer setup questions instantly'].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Knowledge & Document Loading Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
          <div>
            <span className="text-xs font-black tracking-widest text-indigo-600 uppercase">Knowledge Loading</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-2 mb-6">Under the Hood: Smart Answers, No Guesswork</h2>
            <p className="text-slate-650 leading-relaxed mb-4 text-sm font-medium">
              Your company gets a secure, private assistant. Simply upload your PDFs, Word documents, spreadsheets, links, FAQs, or catalog lists.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6 text-sm font-semibold">
              When a customer asks a question, our system searches your documents instantly, finds the exact matching paragraphs, and composes a safe, correct, and professional response using your facts.
            </p>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 md:p-8">
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-6 text-center">How OminiRep Finds the Right Answer</h3>
            <div className="space-y-4">
              {[
                { step: '01', title: 'User Inquiry', desc: 'Customer asks a question via your website chat or WhatsApp.' },
                { step: '02', title: 'Semantic Understanding', desc: 'The assistant figures out the exact meaning of the question.' },
                { step: '03', title: 'Quick Fact Search', desc: 'Looks up facts in your uploaded business documents.' },
                { step: '04', title: 'Sentence Matching', desc: 'Pulls the most relevant sentences that match what the user is asking.' },
                { step: '05', title: 'Context Preparation', desc: 'Hands the relevant sentences to our secure AI helper model.' },
                { step: '06', title: 'Polished Response', desc: 'Produces a friendly, accurate response backed by your facts.' }
              ].map((stepObj) => (
                <div key={stepObj.step} className="flex gap-4 items-start bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md font-mono shrink-0">
                    {stepObj.step}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{stepObj.title}</h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">{stepObj.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Capabilities (Grid) */}
      <section className="py-12 sm:py-16 md:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Key Features</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-1 tracking-tight">Our Primary Features</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Vector Search */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200">
              <div className="text-indigo-600 mb-4"><Database className="w-6 h-6" /></div>
              <h3 className="font-extrabold text-md sm:text-lg text-slate-950 mb-2">Secure Document Search</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Connects your documents, files, and guides to build an instant reference library for your assistant.
              </p>
            </div>

            {/* Product Intelligence */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200">
              <div className="text-indigo-600 mb-4"><Cpu className="w-6 h-6" /></div>
              <h3 className="font-extrabold text-md sm:text-lg text-slate-950 mb-2">Smart Product Assistant</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Analyzes customer needs, suggests alternative products, and checks size or availability options.
              </p>
            </div>

            {/* Image Recognition */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200">
              <div className="text-indigo-600 mb-4"><ImageIcon className="w-6 h-6" /></div>
              <h3 className="font-extrabold text-md sm:text-lg text-slate-950 mb-2">Image Helper</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Allows buyers to upload pictures of products so the assistant can recognize them and find matching items.
              </p>
            </div>

            {/* Metadata Engine */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200">
              <div className="text-indigo-600 mb-4"><Search className="w-6 h-6" /></div>
              <h3 className="font-extrabold text-md sm:text-lg text-slate-950 mb-2">Catalog Detailer</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Instantly serves details like pricing, sizes, inventory levels, colors, and shipping fees.
              </p>
            </div>

            {/* Booking & Reservations */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200">
              <div className="text-indigo-600 mb-4"><Calendar className="w-6 h-6" /></div>
              <h3 className="font-extrabold text-md sm:text-lg text-slate-950 mb-2">Calendar Syncing</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Automate scheduling. Checks your real-time availability, reserves spots, and works with your Google Calendar.
              </p>
            </div>

            {/* AI Sandbox */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200">
              <div className="text-indigo-600 mb-4"><Code className="w-6 h-6" /></div>
              <h3 className="font-extrabold text-md sm:text-lg text-slate-950 mb-2">Testing Sandbox</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Test your assistant with mock questions, inspect what documents it reads, and refine its tone easily.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-tenant, White-Label, Analytics */}
      <section className="py-12 sm:py-16 md:py-20 bg-white border-b border-slate-150">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="space-y-4">
            <div className="mx-auto md:mx-0 w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-md sm:text-lg text-slate-950">Total Privacy & Security</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Every business gets completely separate folders, settings, and documents. Your business information remains strictly yours.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="mx-auto md:mx-0 w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-md sm:text-lg text-slate-950">Agency Rebranding</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Rebrand the portal with your own logo and colors, create client workspaces, and offer digital workers under your brand.
            </p>
          </div>

          <div className="space-y-4">
            <div className="mx-auto md:mx-0 w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-md sm:text-lg text-slate-950">Simple Performance Statistics</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              See intuitive counters like total conversations, leads collected, bookings completed, and customer feedback.
            </p>
          </div>
        </div>
      </section>

      {/* Widget & WhatsApp Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
          <div>
            <span className="text-xs font-black tracking-widest text-indigo-600 uppercase">Seamless Channels</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-2 mb-6 tracking-tight">Website Widget & Messaging Apps</h2>
            <p className="text-slate-650 font-semibold text-sm leading-relaxed mb-6">
              Speak to customers where they are: either via a modern website chat widget or directly on WhatsApp.
            </p>
            
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 p-4 rounded-xl flex gap-4 items-start">
                <Smartphone className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Standard WhatsApp Setup</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">A shared number for quick, simple setup and affordable pricing options.</p>
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl flex gap-4 items-start">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Your Own Business Number</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Use your own phone number, enable custom message routing, and get higher sending limits.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 p-5 sm:p-6 md:p-8 rounded-2xl">
            <h3 className="font-extrabold text-sm text-slate-950 mb-3">Easy Website Installation</h3>
            <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
              Add a snippet of code to your website to display your assistant instantly. Simply place this code within your website HTML.
            </p>
            <div className="bg-slate-900 rounded-xl p-4 text-slate-300 font-mono text-xs overflow-x-auto">
              <div className="text-slate-500">&lt;!-- Embed OminiRep AI Representative --&gt;</div>
              <div className="text-indigo-400">&lt;div <span className="text-slate-200">id</span>="ai-assistant-widget" <span className="text-slate-200">client_id</span>="YOUR-CLIENT-ID"&gt;&lt;/div&gt;</div>
              <div className="text-indigo-400">&lt;script <span className="text-slate-200">src</span>="https://your-domain.com/widget.js"&gt;&lt;/script&gt;</div>
            </div>
          </div>
        </div>
      </section>

      {/* Operational Logic Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Smart Workflows</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-1 tracking-tight">Automated Customer Workflows</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50 p-5 sm:p-6 rounded-xl border border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-950 mb-2">Smart Conversation Memory</h3>
              <p className="text-xs text-slate-500 leading-normal font-semibold">
                Remembers past customer conversations, context, and schedules to offer highly personalized follow-ups.
              </p>
            </div>
            <div className="bg-slate-50 p-5 sm:p-6 rounded-xl border border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-950 mb-2">Automatic Lead Collection</h3>
              <p className="text-xs text-slate-500 leading-normal font-semibold">
                Identifies potential buyers, collects contact fields, notes what they want, and updates your dashboard automatically.
              </p>
            </div>
            <div className="bg-slate-50 p-5 sm:p-6 rounded-xl border border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-950 mb-2">Helpful Recommendation Mode</h3>
              <p className="text-xs text-slate-500 leading-normal font-semibold">
                A friendly approach to showing your catalog, answering product questions, and helping shoppers choose the right option.
              </p>
            </div>
            <div className="bg-slate-50 p-5 sm:p-6 rounded-xl border border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-950 mb-2">Hand-off to Human Team</h3>
              <p className="text-xs text-slate-500 leading-normal font-semibold">
                Seamlessly routes more complex inquiries to your real support team and notifies local staff immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure Deployments Options */}
      <section className="py-12 sm:py-16 md:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Reliable Hosting</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-1 tracking-tight">Flexible Infrastructure Options</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Cloud */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded w-fit block mb-4">Standard Option</span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-950 mb-2">Fully Hosted Cloud Portal</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">Hassle-free setup on our secure, managed cloud servers. We handle maintenance, updates, and daily performance.</p>
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>No server setup or maintenance needed</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Instant automatic updates and security checks</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Standard file storage, chats, and widgets included</span>
                  </div>
                </div>
              </div>
              <div className="pt-8">
                <Link to="/signup" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl block text-center shadow-md">
                  Deploy Cloud Portal
                </Link>
              </div>
            </div>

            {/* Dedicated */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded w-fit block mb-4">Enterprise Option</span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-950 mb-2">Dedicated Server Setup</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">A tailored database and private server setup built for teams that require isolated, higher-capacity resources.</p>
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Dedicated server instances for high performance</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Custom WhatsApp connections and dedicated assistance</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Higher usage counts and custom storage levels</span>
                  </div>
                </div>
              </div>
              <div className="pt-8">
                <a href="mailto:support@primesoftalliance.com" className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl block text-center shadow-md">
                  Request Private Proposal
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workforce Roadmap */}
      <section className="py-12 sm:py-16 md:py-20 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-black tracking-widest text-indigo-600 uppercase">Product Future</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-2 mb-6 tracking-tight">Your Future Digital Workforce</h2>
          <p className="text-slate-650 font-semibold text-sm leading-relaxed mb-8">
            We are expanding so you can deploy specialized digital assistants for sales, support, HR, or clinical bookings, all working together in one unified dashboard.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['Sales Representative', 'Customer Support Rep', 'Customer Success Associate', 'Booking Coordinator', 'Human Resource Clerk', 'Recruitment Specialist', 'Real Estate Agent', 'Medical Receptionist', 'E-commerce Operator'].map((spec) => (
              <span key={spec} className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200">
                {spec}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 sm:py-16 text-slate-400 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="font-sans font-black text-lg sm:text-xl tracking-tighter text-white mb-4">OminiRep</div>
              <p className="text-xs font-semibold leading-relaxed text-slate-400">
                Professional customer assistant software. Your AI Representative for sales, support, and success. Supported of PrimeSoft Alliance.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest text-slate-100 mb-4">SaaS Platform</h4>
              <div className="flex flex-col gap-2.5 text-xs font-semibold">
                <Link to="/signup" className="hover:text-white transition">Deploy Agent</Link>
                <Link to="/client/login" className="hover:text-white transition">Client Dashboard</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest text-slate-100 mb-4">Legal & Compliance</h4>
              <div className="flex flex-col gap-2.5 text-xs font-semibold">
                <Link to="/privacy?tab=terms" className="hover:text-white transition">Terms of Service</Link>
                <Link to="/privacy?tab=privacy" className="hover:text-white transition">Privacy Policy & Acceptable Use</Link>
                <Link to="/privacy?tab=dpa" className="hover:text-white transition">Data Processing Addendum (DPA)</Link>
                <Link to="/privacy?tab=subscription" className="hover:text-white transition">SaaS Subscription Terms</Link>
                <Link to="/privacy?tab=refunds" className="hover:text-white transition">Refund & Cancellation Rules</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest text-slate-100 mb-4">Power Providers</h4>
              <p className="text-xs leading-normal mb-3 text-slate-400">
                Supported, operated, and guaranteed under the strict B2B service-level agreements of PrimeSoft Alliance.
              </p>
              <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded">SLA 99.99% Reliability Guarantee</span>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 mt-12 flex flex-col sm:flex-row justify-between items-center text-xs opacity-50 font-semibold text-slate-400 gap-4">
            <span className="text-center sm:text-left">&copy; {new Date().getFullYear()} OminiRep Platform. Deployments maintained by PrimeSoft Alliance. All rights reserved.</span>
            <span>Corporate Governance Framework: ISO/IEC Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
