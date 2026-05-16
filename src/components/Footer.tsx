import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu, Mail, Phone, MapPin, Linkedin, Twitter, Github, ChevronRight } from 'lucide-react';

export default function Footer() {
  const businessName = 'PrimeSoft Alliance';

  return (
    <footer id="main-footer" className="bg-slate-900 text-slate-400 pt-20 pb-10 font-sans">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2 text-white group">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="font-black text-xl tracking-tight">{businessName}</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Empowering businesses with enterprise-grade AI solutions, custom software, and digital transformation strategies.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><Linkedin className="w-4 h-4" /></a>
              <a href="#" className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><Twitter className="w-4 h-4" /></a>
              <a href="#" className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><Github className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-6">Quick Links</h4>
            <ul className="space-y-4 text-sm font-bold">
              <li><Link to="/services" className="hover:text-indigo-400 transition-colors flex items-center gap-2 group"><ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /> Services</Link></li>
              <li><Link to="/about" className="hover:text-indigo-400 transition-colors flex items-center gap-2 group"><ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /> About Us</Link></li>
              <li><Link to="/contact" className="hover:text-indigo-400 transition-colors flex items-center gap-2 group"><ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /> Contact</Link></li>
              <li><Link to="/get-started" className="hover:text-indigo-400 transition-colors flex items-center gap-2 group"><ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /> Get Started</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-6">Legal</h4>
            <ul className="space-y-4 text-sm font-bold">
              <li><Link to="/privacy" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
              <li><Link to="/cookies" className="hover:text-indigo-400 transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-6">Contact Us</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400"><Mail className="w-4 h-4" /></div>
                hello@primesoft.com
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400"><Phone className="w-4 h-4" /></div>
                +1 (555) 000-0000
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400"><MapPin className="w-4 h-4" /></div>
                Digital Plaza, Silicon Valley
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-900 gap-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            &copy; {new Date().getFullYear()} {businessName}. Built for the future.
          </p>
          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
            <span className="text-indigo-600">Status: Online</span>
            <a href="https://primesoft.alliance" className="hover:text-white transition-colors">primesoft.alliance</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
