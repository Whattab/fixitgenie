import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Verification from './pages/Verification';
import Forum from './pages/Forum';
import Signup from './pages/Signup';
import Login from './pages/Login';
import AdminDashboard from './pages/Admin/AdminDashboard';
import HomeownerDashboard from './pages/HomeownerDashboard';
import ProDashboard from './pages/ProDashboard';
import RepairRequest from './pages/RepairRequest';
import ServiceRequestsList from './pages/ServiceRequestsList';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Professionals from './pages/Professionals';
import PublicProProfile from './pages/PublicProProfile';
import ProOnboarding from './pages/ProOnboarding';
import Messages from './pages/Messages';
import HomeownerProfile from './pages/HomeownerProfile';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import EditRequest from './pages/EditRequest';
import JobDetail from './pages/JobDetail';
import Header from './components/Header';
import { AuthProvider } from './context/AuthContext';
import { ServiceProvider } from './context/ServiceContext';
import { MessagingProvider } from './context/MessagingContext';

function App() {
  return (
    <AuthProvider>
      <ServiceProvider>
        <MessagingProvider>
          <Router>
            <Header />
            <main style={{ flex: 1, paddingTop: '120px' }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/forum" element={<Forum />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/my-requests" element={<HomeownerDashboard />} />
                <Route path="/my-bids" element={<ProDashboard />} />
                <Route path="/request-repair" element={<RepairRequest />} />
                <Route path="/services" element={<ServiceRequestsList />} />
                <Route path="/professionals" element={<Professionals />} />
                <Route path="/professional/:id" element={<PublicProProfile />} />
                <Route path="/pro-onboarding" element={<ProOnboarding />} />
                <Route path="/about" element={<About />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/my-profile" element={<HomeownerProfile />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/edit-request/:id" element={<EditRequest />} />
                <Route path="/job/:id" element={<JobDetail />} />
              </Routes>
            </main>
          </Router>
        </MessagingProvider>
      </ServiceProvider>
    </AuthProvider>
  )
}

export default App
