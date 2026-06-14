import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';
import Signup from './pages/Signup';
import ChatbotMini from './pages/ChatbotMini';

// Existing imports
import Home from './pages/Home';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Activate from './pages/Activate';

import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import BookingsManager from './pages/dashboard/BookingsManager';
import LeadsManager from './pages/dashboard/LeadsManager';
import SettingsManager from './pages/dashboard/SettingsManager';
import AvailabilityManager from './pages/dashboard/AvailabilityManager';
import EmailTemplatesManager from './pages/dashboard/EmailTemplatesManager';
import HeadlessDocs from './pages/dashboard/HeadlessDocs';
import KnowledgeManager from './pages/dashboard/KnowledgeManager';
import Analytics from './pages/dashboard/Analytics';
import Notifications from './pages/dashboard/Notifications';
import SupportSuite from './pages/dashboard/SupportSuite';
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
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      
      <Route path="/client/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/activate" element={<Activate />} />
        <Route path="/chatbot-mini" element={<ChatbotMini />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="bookings" element={<ClientBookings />} />
          <Route path="support" element={<SupportSuite />} />
          <Route path="inquiries" element={<Navigate to="/dashboard/support" replace />} />
          <Route path="tickets" element={<Navigate to="/dashboard/support" replace />} />
          <Route path="leads" element={<LeadsManager />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="notifications" element={<Notifications />} />
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
