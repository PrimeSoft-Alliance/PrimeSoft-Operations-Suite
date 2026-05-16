import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Booking from './pages/Booking';
import Contact from './pages/Contact';
import ChatbotMini from './pages/ChatbotMini';
import Onboarding from './pages/Onboarding';
import PublicOnboarding from './pages/PublicOnboarding';

import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import BookingsManager from './pages/dashboard/BookingsManager';
import ContactsManager from './pages/dashboard/ContactsManager';
import FormsManager from './pages/dashboard/FormsManager';
import LeadsManager from './pages/dashboard/LeadsManager';
import OperationsNexus from './pages/dashboard/OperationsNexus';
import SettingsManager from './pages/dashboard/SettingsManager';
import AvailabilityManager from './pages/dashboard/AvailabilityManager';
import EmailTemplatesManager from './pages/dashboard/EmailTemplatesManager';
import HeadlessDocs from './pages/dashboard/HeadlessDocs';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
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
import MissionControl from './pages/superadmin/MissionControl';

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
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="get-started" element={<PublicOnboarding />} />
        </Route>
        
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/chatbot-mini" element={<ChatbotMini />} />
        <Route path="/onboarding/:token" element={<Onboarding />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="nexus" element={<OperationsNexus />} />
          <Route path="bookings" element={<BookingsManager />} />
          <Route path="contacts" element={<ContactsManager />} />
          <Route path="forms" element={<FormsManager />} />
          <Route path="leads" element={<LeadsManager />} />
          <Route path="availability" element={<AvailabilityManager />} />
          <Route path="email-templates" element={<EmailTemplatesManager />} />
          <Route path="developer" element={<HeadlessDocs />} />
          <Route path="settings" element={<SettingsManager />} />
        </Route>

        <Route path="/superadmin" element={<SuperAdminLayout />}>
          <Route index element={<GlobalStats />} />
          <Route path="hub" element={<MissionControl />} />
          <Route path="clients" element={<ClientsManager />} />
          <Route path="forms" element={<FormsManager />} />
          <Route path="leads" element={<LeadsManager />} />
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
