import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Booking from './pages/Booking';
import Contact from './pages/Contact';
import ChatbotMini from './pages/ChatbotMini';
import Onboarding from './pages/Onboarding';

import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import BookingsManager from './pages/dashboard/BookingsManager';
import ContactsManager from './pages/dashboard/ContactsManager';
import SettingsManager from './pages/dashboard/SettingsManager';
import AvailabilityManager from './pages/dashboard/AvailabilityManager';
import EmailTemplatesManager from './pages/dashboard/EmailTemplatesManager';
import Login from './pages/Login';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import ClientsManager from './pages/superadmin/ClientsManager';
import GlobalStats from './pages/superadmin/GlobalStats';

import SuperadminUsage from './pages/superadmin/SuperadminUsage';
import SuperadminTemplates from './pages/superadmin/SuperadminTemplates';
import SuperadminLogs from './pages/superadmin/SuperadminLogs';
import OnboardingRequests from './pages/superadmin/OnboardingRequests';
import PromptGenerator from './pages/superadmin/PromptGenerator';
import SystemHealth from './pages/superadmin/SystemHealth';
import DomainsManager from './pages/superadmin/DomainsManager';
import NotificationsManager from './pages/superadmin/NotificationsManager';
import PlatformSettings from './pages/superadmin/PlatformSettings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="services" element={<Services />} />
          <Route path="booking" element={<Booking />} />
          <Route path="contact" element={<Contact />} />
        </Route>
        
        <Route path="/login" element={<Login />} />
        <Route path="/chatbot-mini" element={<ChatbotMini />} />
        <Route path="/onboarding/:token" element={<Onboarding />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="bookings" element={<BookingsManager />} />
          <Route path="contacts" element={<ContactsManager />} />
          <Route path="availability" element={<AvailabilityManager />} />
          <Route path="email-templates" element={<EmailTemplatesManager />} />
          <Route path="settings" element={<SettingsManager />} />
        </Route>

        <Route path="/superadmin" element={<SuperAdminLayout />}>
          <Route index element={<GlobalStats />} />
          <Route path="clients" element={<ClientsManager />} />
          <Route path="onboarding" element={<OnboardingRequests />} />
          <Route path="prompts" element={<PromptGenerator />} />
          <Route path="domains" element={<DomainsManager />} />
          <Route path="usage" element={<SuperadminUsage />} />
          <Route path="logs" element={<SuperadminLogs />} />
          <Route path="health" element={<SystemHealth />} />
          <Route path="notifications" element={<NotificationsManager />} />
          <Route path="settings" element={<PlatformSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
