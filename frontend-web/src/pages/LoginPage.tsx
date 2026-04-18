import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import Input from '../components/Input';
import Button from '../components/Button';
import { Shield, LogIn, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
    } catch (err: any) {
      if (!err?.response || err?.code === 'ERR_NETWORK') {
        setError('Serveur indisponible. Reessayez dans quelques instants.');
      } else {
        setError(err.response?.data?.message || 'Email ou mot de passe invalide');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-center justify-center p-4 dark:from-neutral-950 dark:via-slate-950 dark:to-indigo-950/30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob dark:bg-indigo-900/40" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 dark:bg-indigo-950/50" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 mx-auto mb-4 shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2 dark:text-neutral-100">Connexion</h1>
            <p className="text-neutral-600 dark:text-neutral-400">Accedez a votre compte PKI Souverain</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="votre@email.com"
              icon={<Mail size={18} />}
              required
            />

            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="********"
              icon={<Lock size={18} />}
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm font-medium dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={<LogIn size={20} />}
              iconPosition="right"
            >
              Se connecter
            </Button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition dark:text-indigo-300 dark:hover:text-indigo-200"
              >
                Mot de passe oublie?
              </Link>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">Nouveau sur la plateforme?</span>
            </div>
          </div>

          <Button onClick={() => navigate('/register')} variant="outline" size="lg" fullWidth>
            Creer un compte
          </Button>
        </div>

        <p className="text-center text-neutral-600 text-sm mt-6 dark:text-neutral-400">
          Probleme de connexion?{' '}
          <a href="#" className="text-indigo-600 font-semibold hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200">
            Contactez le support
          </a>
        </p>
      </div>
    </div>
  );
}
