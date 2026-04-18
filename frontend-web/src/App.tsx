import { useEffect } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import NotificationBell from './components/NotificationBell';
import Sidebar from './components/Sidebar';
import ThemeToggle from './components/ThemeToggle';
import { ToastProvider } from './components/Toast';
import AdminDownloadCrlPage from './pages/AdminDownloadCrlPage';
import AdminGenerateCaPage from './pages/AdminGenerateCaPage';
import AdminGenerateCrlPage from './pages/AdminGenerateCrlPage';
import AdminManageUsersPage from './pages/AdminManageUsersPage';
import AdminRevokeCertificatePage from './pages/AdminRevokeCertificatePage';
import AdminSignCsrPage from './pages/AdminSignCsrPage';
import AdminStatsPage from './pages/AdminStatsPage';
import DashboardAdminPage from './pages/DashboardAdminPage';
import DashboardUserPage from './pages/DashboardUserPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UserCertificatesPage from './pages/UserCertificatesPage';
import UserDownloadCrlPage from './pages/UserDownloadCrlPage';
import UserGenerateCsrPage from './pages/UserGenerateCsrPage';
import UserRevokeCertificatePage from './pages/UserRevokeCertificatePage';
import UserValidateTokenPage from './pages/UserValidateTokenPage';
import { AdminRequestDetail, AdminRequestsList, UserRequestsPage } from './pages';
import { userService } from './services/api';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';

function useHydrateAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'undefined' || token === 'null') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setLoading(false);
      return;
    }

    setLoading(true);
    userService
      .getMe()
      .then((user) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [setLoading, setUser]);
}

function useSyncTheme() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
}

function App() {
  useHydrateAuth();
  useSyncTheme();

  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-h3 text-primary-800 dark:text-neutral-100">Chargement...</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <HashRouter>
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
        </div>

        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/validate-token" element={<UserValidateTokenPage />} />

          <Route
            element={
              <ProtectedRoute>
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1 bg-neutral-50 p-8 dark:bg-neutral-950">
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

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}

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

