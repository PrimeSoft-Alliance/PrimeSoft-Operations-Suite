import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';
import Signup from './pages/Signup';

// Existing imports
import Home from './pages/Home';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Activate from './pages/Activate';

import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import LeadsManager from './pages/dashboard/LeadsManager';
import ContactsManager from './pages/dashboard/ContactsManager';
import SettingsManager from './pages/dashboard/SettingsManager';
import AvailabilityManager from './pages/dashboard/AvailabilityManager';
import EmailTemplatesManager from './pages/dashboard/EmailTemplatesManager';
import HeadlessDocs from './pages/dashboard/HeadlessDocs';
import KnowledgeManager from './pages/dashboard/KnowledgeManager';
import ProductManager from './pages/dashboard/ProductManager';
import Analytics from './pages/dashboard/Analytics';
import Notifications from './pages/dashboard/Notifications';
import SupportSuite from './pages/dashboard/SupportSuite';
import ClientBookings from './pages/dashboard/Bookings';
import Login from './pages/Login';
import Integrations from './pages/dashboard/Integrations';
import WhatsAppIntegration from './pages/dashboard/integrations/WhatsAppIntegration';
import TelegramIntegration from './pages/dashboard/integrations/TelegramIntegration';
import EmailIntegration from './pages/dashboard/integrations/EmailIntegration';
import CalendarIntegration from './pages/dashboard/integrations/CalendarIntegration';
import MissedCalls from './pages/dashboard/MissedCalls';
import Marketing from './pages/dashboard/Marketing';
import Numbers from './pages/dashboard/Numbers';
import CallForwardingSetup from './pages/dashboard/CallForwardingSetup';
import SharedInbox from './pages/dashboard/SharedInbox';

import BookingSuccess from './pages/BookingSuccess';
import ChatbotMini from './pages/ChatbotMini';

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
      <Route path="/booking-success/:id" element={<BookingSuccess />} />
      <Route path="/chatbot-mini" element={<ChatbotMini />} />
      
      <Route path="/client/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/activate" element={<Activate />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="bookings" element={<ClientBookings />} />
          <Route path="support" element={<SupportSuite />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="integrations/whatsapp" element={<WhatsAppIntegration />} />
          <Route path="integrations/telegram" element={<TelegramIntegration />} />
          <Route path="integrations/email" element={<EmailIntegration />} />
          <Route path="integrations/calendar" element={<CalendarIntegration />} />
          <Route path="integrations/call-forwarding" element={<CallForwardingSetup />} />
          <Route path="missed-calls" element={<MissedCalls />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="numbers" element={<Numbers />} />
          <Route path="inquiries" element={<Navigate to="/dashboard/support" replace />} />
          <Route path="tickets" element={<Navigate to="/dashboard/support" replace />} />
          <Route path="leads" element={<LeadsManager />} />
          <Route path="contacts" element={<ContactsManager />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="availability" element={<AvailabilityManager />} />
          <Route path="email-templates" element={<EmailTemplatesManager />} />
          <Route path="developer" element={<HeadlessDocs />} />
          <Route path="settings" element={<SettingsManager />} />
          <Route path="knowledge" element={<KnowledgeManager />} />
          <Route path="shared-inbox" element={<SharedInbox />} />
          <Route path="catalog" element={<ProductManager />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}
