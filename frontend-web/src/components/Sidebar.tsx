import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  LayoutGrid, Award, FileText, CheckSquare, XCircle, Download,
  BarChart3, RefreshCw, Key, LogOut, ChevronRight, Shield
} from 'lucide-react';

const userLinks = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutGrid },
  { to: '/certificates', label: 'Mes certificats', icon: Award },
  { to: '/generate-csr', label: 'Nouvelle demande', icon: FileText },
  { to: '/requests', label: 'Suivi de demande', icon: CheckSquare },
  { to: '/revoke-certificate', label: 'Révoquer certificat', icon: XCircle },
  { to: '/download-crl', label: 'Télécharger CRL', icon: Download },
];

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/admin/stats', label: 'Statistiques', icon: BarChart3 },
  { to: '/admin/requests', label: 'Gérer demandes', icon: CheckSquare },
  { to: '/admin/generate-ca', label: 'Générer AC', icon: Key },
  { to: '/admin/sign-csr', label: 'Signer CSR', icon: Award },
  { to: '/admin/generate-crl', label: 'CRL/Rotation', icon: RefreshCw },
  { to: '/admin/revoke-certificate', label: 'Révoquer cert', icon: XCircle },
  { to: '/admin/download-crl', label: 'Télécharger CRL', icon: Download },
];

export default function Sidebar() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const links = user?.role === 'ADMIN' ? adminLinks : userLinks;

  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 min-h-screen flex flex-col p-6 shadow-sm">
      {/* Logo */}
      <div className="flex items-center space-x-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="text-lg font-bold text-neutral-900">PKI</div>
          <div className="text-xs text-neutral-600">Souverain</div>
        </div>
      </div>

      {/* Role Badge */}
      {user?.role === 'ADMIN' ? (
        <div className="mb-6 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-center">
          <div className="text-xs font-bold text-red-700">👨‍💼 ADMINISTRATEUR</div>
          <div className="text-xs text-red-600 mt-0.5">{user?.email}</div>
        </div>
      ) : (
        <div className="mb-6 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-center">
          <div className="text-xs font-bold text-blue-700">👤 UTILISATEUR</div>
          <div className="text-xs text-blue-600 mt-0.5">{user?.email}</div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 space-y-2 mb-8">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                ${active
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm border border-indigo-200'
                  : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                }
              `}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="text-sm font-medium">{link.label}</span>
              {active && <ChevronRight size={16} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="border-t border-neutral-200 mb-6" />

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium transition-all duration-200 border border-red-200 hover:border-red-300"
      >
        <LogOut size={18} className="flex-shrink-0" />
        <span className="text-sm">Déconnexion</span>
      </button>
    </aside>
  );
}
