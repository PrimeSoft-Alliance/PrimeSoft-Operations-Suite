import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';
import Signup from './pages/Signup';
import ChatbotMini from './pages/ChatbotMini';

// Existing imports
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Activate from './pages/Activate';

import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import BookingsManager from './pages/dashboard/BookingsManager';
import LeadsManager from './pages/dashboard/LeadsManager';
import Tickets from './pages/dashboard/Tickets';
import SettingsManager from './pages/dashboard/SettingsManager';
import AvailabilityManager from './pages/dashboard/AvailabilityManager';
import EmailTemplatesManager from './pages/dashboard/EmailTemplatesManager';
import HeadlessDocs from './pages/dashboard/HeadlessDocs';
import KnowledgeManager from './pages/dashboard/KnowledgeManager';
import Analytics from './pages/dashboard/Analytics';
import ClientInquiries from './pages/dashboard/Inquiries';
import ClientBookings from './pages/dashboard/Bookings';
import Login from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    // Visitor Tracking Logic
    const track = async () => {
      try {
        let sessionId = localStorage.getItem('v_session');
        if (!sessionId) {
          sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
          localStorage.setItem('v_session', sessionId);
        }

        const isDashboard = location.pathname.startsWith('/dashboard');
        const clientId = isDashboard 
          ? localStorage.getItem('ps_client_id') 
          : (new URLSearchParams(window.location.search).get('clientId') || 'platform-prime');

        if (!clientId) return;

        await fetch('/v1/public/track', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-client-id': String(clientId)
          },
          body: JSON.stringify({
            page: document.title || 'App',
            route: location.pathname,
            referrer: document.referrer,
            sessionId,
            interactedWithBot: sessionStorage.getItem('bot_interacted') === 'true'
          })
        });
      } catch (e) {
        // Silently fail tracking
      }
    };

    track();
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      
      <Route path="/client/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/activate" element={<Activate />} />
        <Route path="/chatbot-mini" element={<ChatbotMini />} />
        <Route path="/onboarding/:token" element={<Onboarding />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="bookings" element={<ClientBookings />} />
          <Route path="inquiries" element={<ClientInquiries />} />
          <Route path="leads" element={<LeadsManager />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="availability" element={<AvailabilityManager />} />
          <Route path="email-templates" element={<EmailTemplatesManager />} />
          <Route path="developer" element={<HeadlessDocs />} />
          <Route path="settings" element={<SettingsManager />} />
          <Route path="knowledge" element={<KnowledgeManager />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}
