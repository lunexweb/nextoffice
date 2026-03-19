import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LandingPage from '@/pages/LandingPage';
import SignInPage from '@/pages/SignInPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import AppLayout from '@/components/nextoffice/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import ClientsPage from '@/pages/ClientsPage';
import ClientProfilePage from '@/pages/ClientProfilePage';
import InvoicesPage from '@/pages/InvoicesPage';
import CommunicationsPage from '@/pages/CommunicationsPage';
import ReliabilityPage from '@/pages/ReliabilityPage';
import SettingsPage from '@/pages/SettingsPage';
import UserProfilePage from '@/pages/UserProfilePage';
import PaymentSettingsPage from '@/pages/PaymentSettingsPage';
import ReminderSettingsPage from '@/pages/ReminderSettingsPage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';
import CommitmentsPage from '@/pages/CommitmentsPage';
import ClientCommitmentPage from '@/pages/ClientCommitmentPage';
import CEODashboardPage from '@/pages/CEODashboardPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { auth } = useApp();
  
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!auth.isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/signin" element={<SignInPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/invoice/:invoiceNumber/commitment" element={<ClientCommitmentPage />} />
    <Route path="/ceo" element={<ProtectedRoute><CEODashboardPage /></ProtectedRoute>} />
    <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route index element={<DashboardPage />} />
      <Route path="clients" element={<ClientsPage />} />
      <Route path="clients/:slug" element={<ClientProfilePage />} />
      <Route path="invoices" element={<InvoicesPage />} />
      <Route path="commitments" element={<CommitmentsPage />} />
      <Route path="communications" element={<CommunicationsPage />} />
      <Route path="reliability" element={<ReliabilityPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="settings/profile" element={<UserProfilePage />} />
      <Route path="settings/payment" element={<PaymentSettingsPage />} />
      <Route path="settings/reminders" element={<ReminderSettingsPage />} />
      <Route path="settings/security" element={<ChangePasswordPage />} />
    </Route>
  </Routes>
);

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <AppProvider>
        <Toaster />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
