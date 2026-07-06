import { Outlet, Link, useLocation } from 'react-router-dom';
import { Cpu, Menu, X } from 'lucide-react';
import Chatbot from './Chatbot';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

import { useClientId } from '../lib/useClientId';

import Navbar from './Navbar';
import Footer from './Footer';
import BackButton from './BackButton';

export default function Layout() {
  const { pathname } = useLocation();
  const { clientId } = useClientId();

  useEffect(() => {
    fetch(`/v1/public/settings?clientId=${clientId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.success && data.data) {
          const s = data.data;
          
          // Apply branding colors
          if (s.primaryColor) {
            document.documentElement.style.setProperty('--primary-color', s.primaryColor);
          }
          
          // Apply fonts
          if (s.fontFamily) {
            const fontMap: {[key: string]: string} = {
              'Inter': 'Inter, sans-serif',
              'Outfit': '"Outfit", sans-serif',
              'Space Grotesk': '"Space Grotesk", sans-serif',
              'Montserrat': '"Montserrat", sans-serif'
            };
            const fontStack = fontMap[s.fontFamily] || 'Inter, sans-serif';
            document.documentElement.style.setProperty('--font-sans', fontStack);
          }

          // Apply Favicon
          if (s.favicon) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = s.favicon;
          }
        }
      })
      .catch(console.error);
  }, [clientId]);

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-gray-50 overflow-x-hidden">
      <Navbar />

      <main id="main-content" className="flex-1 flex flex-col w-full pt-20">
        {pathname !== '/' && (
          <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 mt-8 mb-4">
            <BackButton />
          </div>
        )}
        <Outlet />
      </main>

      <Footer />
      <Chatbot />
    </div>
  );
}
