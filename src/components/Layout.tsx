import { Outlet, Link, useLocation } from 'react-router-dom';
import { Cpu, Menu, X } from 'lucide-react';
import Chatbot from './Chatbot';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

export default function Layout() {
  const [businessName, setBusinessName] = useState('PrimeSoft Alliance');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    fetch('/api/public/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.businessName) setBusinessName(data.businessName);
          
          // Apply branding colors
          if (data.primaryColor) {
            document.documentElement.style.setProperty('--primary-color', data.primaryColor);
          }
          
          // Apply fonts
          if (data.fontFamily) {
            const fontMap: {[key: string]: string} = {
              'Inter': 'Inter, sans-serif',
              'Outfit': '"Outfit", sans-serif',
              'Space Grotesk': '"Space Grotesk", sans-serif',
              'Montserrat': '"Montserrat", sans-serif'
            };
            const fontStack = fontMap[data.fontFamily] || 'Inter, sans-serif';
            document.documentElement.style.setProperty('--font-sans', fontStack);
          }

          // Apply Favicon
          if (data.favicon) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = data.favicon;
          }
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-primary z-50">
            <Cpu className="h-6 w-6" />
            <span className="font-bold text-xl tracking-tight text-gray-900 truncate max-w-[200px] sm:max-w-none">{businessName}</span>
          </Link>
          
          <nav className="hidden md:flex space-x-8 items-center">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
            <Link to="/services" className="text-sm font-medium hover:text-primary transition-colors">Services</Link>
            <Link to="/about" className="text-sm font-medium hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</Link>
            <Link to="/booking" className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-colors shadow-sm ml-2">
              Start Project
            </Link>
          </nav>

          <button 
            className="md:hidden p-2 -mr-2 text-gray-600 hover:text-gray-900 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={cn(
          "fixed inset-0 top-16 bg-white z-40 md:hidden transition-transform duration-200 ease-in-out border-t border-gray-100",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex flex-col px-6 pt-6 pb-8 space-y-6 overflow-y-auto h-full">
            <Link to="/" className="text-lg font-medium text-gray-900 hover:text-primary">Home</Link>
            <Link to="/services" className="text-lg font-medium text-gray-900 hover:text-primary">Services</Link>
            <Link to="/about" className="text-lg font-medium text-gray-900 hover:text-primary">About</Link>
            <Link to="/contact" className="text-lg font-medium text-gray-900 hover:text-primary">Contact</Link>
            <div className="pt-6 border-t border-gray-100 mt-auto">
              <Link to="/booking" className="flex justify-center items-center w-full bg-primary text-white px-6 py-4 rounded-xl text-base font-medium hover:opacity-90 transition-colors shadow-sm">
                Start Project
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full">
        <Outlet />
      </main>

      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-4">
          <div className="flex items-center space-x-2 text-white">
            <Cpu className="h-5 w-5" />
            <span className="font-semibold text-lg">{businessName}</span>
          </div>
          <div className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} {businessName}. All rights reserved.
          </div>
        </div>
      </footer>

      <Chatbot />
    </div>
  );
}
