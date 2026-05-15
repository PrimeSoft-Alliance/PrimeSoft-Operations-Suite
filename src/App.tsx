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
import Login from './pages/Login';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import ClientsManager from './pages/superadmin/ClientsManager';

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
          <Route path="settings" element={<SettingsManager />} />
        </Route>

        <Route path="/superadmin" element={<SuperAdminLayout />}>
          <Route index element={<ClientsManager />} />
          <Route path="clients" element={<ClientsManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
