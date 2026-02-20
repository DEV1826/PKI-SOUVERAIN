import { useEffect } from 'react';
import { userService } from './services/api';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardUserPage from './pages/DashboardUserPage';
import DashboardAdminPage from './pages/DashboardAdminPage';
import UserCertificatesPage from './pages/UserCertificatesPage';
import UserGenerateCsrPage from './pages/UserGenerateCsrPage';
import UserRevokeCertificatePage from './pages/UserRevokeCertificatePage';
import UserDownloadCrlPage from './pages/UserDownloadCrlPage';
import UserValidateTokenPage from './pages/UserValidateTokenPage';
import AdminStatsPage from './pages/AdminStatsPage';
import AdminGenerateCaPage from './pages/AdminGenerateCaPage';
import AdminSignCsrPage from './pages/AdminSignCsrPage';
import AdminGenerateCrlPage from './pages/AdminGenerateCrlPage';
import AdminRevokeCertificatePage from './pages/AdminRevokeCertificatePage';
import AdminDownloadCrlPage from './pages/AdminDownloadCrlPage';
import AdminManageUsersPage from './pages/AdminManageUsersPage';
import { AdminRequestsList, AdminRequestDetail, UserRequestsPage } from './pages';
import { ToastProvider } from './components/Toast';
// Hydratation du store auth au chargement de l'app
function useHydrateAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    userService.getMe()
      .then((user) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [setUser, setLoading]);
}

function App() {
  useHydrateAuth();
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-h3 text-primary-800">Chargement...</div>
      </div>
    );
  }
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/validate-token" element={<UserValidateTokenPage />} />

        {/* Layout avec sidebar pour toutes les routes protégées */}
        <Route
          element={
            <ProtectedRoute>
              <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 bg-neutral-50 p-8">
                  <Outlet />
                </main>
              </div>
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardUserPage />} />
          <Route path="/certificates" element={<UserCertificatesPage />} />
          <Route path="/generate-csr" element={<UserGenerateCsrPage />} />
          <Route path="/requests" element={<UserRequestsPage />} />
          <Route path="/revoke-certificate" element={<UserRevokeCertificatePage />} />
          <Route path="/download-crl" element={<UserDownloadCrlPage />} />
          {/* Admin */}
          <Route path="/admin/dashboard" element={<DashboardAdminPage />} />
          <Route path="/admin/stats" element={<AdminStatsPage />} />
          <Route path="/admin/manage-users" element={<AdminManageUsersPage />} />
          <Route path="/admin/generate-ca" element={<AdminGenerateCaPage />} />
          <Route path="/admin/sign-csr" element={<AdminSignCsrPage />} />
          <Route path="/admin/generate-crl" element={<AdminGenerateCrlPage />} />
          <Route path="/admin/revoke-certificate" element={<AdminRevokeCertificatePage />} />
          <Route path="/admin/download-crl" element={<AdminDownloadCrlPage />} />
          <Route path="/admin/requests" element={<AdminRequestsList />} />
          <Route path="/admin/requests/:id" element={<AdminRequestDetail />} />
        </Route>

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

// Composant de protection des routes
function ProtectedRoute({ children, adminOnly = false }: any) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

export default App;