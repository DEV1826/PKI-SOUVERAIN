import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useToast } from '../components/Toast';
import { authService } from '../services/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Lien de réinitialisation invalide ou expiré');
    }
  }, [token]);

  const validatePassword = () => {
    if (!password.trim()) {
      setError('Le mot de passe est requis');
      return false;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Lien de réinitialisation invalide');
      return;
    }

    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      addToast({ type: 'success', message: 'Mot de passe réinitialisé avec succès' });
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Erreur:', err);
      const errorMsg = err?.response?.data?.error || 'Erreur lors de la réinitialisation';
      setError(errorMsg);
      addToast({ type: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 text-center">
            <div className="bg-red-100 p-3 rounded-full inline-block">
              <Lock size={32} className="text-red-600" />
            </div>
            <h1 className="text-h2 font-bold text-neutral-900">Lien invalide</h1>
            <p className="text-neutral-600">
              Ce lien de réinitialisation est invalide ou a expiré. Veuillez demander une nouvelle réinitialisation.
            </p>
            <Link to="/forgot-password" className="block">
              <Button variant="primary" className="w-full">
                Demander une réinitialisation
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Bouton retour */}
        <Link to="/login" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm mb-8 transition">
          <ArrowLeft size={16} />
          Retour à la connexion
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {!success ? (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-8">
                <div className="flex justify-center mb-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    <Lock size={28} className="text-white" />
                  </div>
                </div>
                <h1 className="text-h2 font-bold text-white text-center">Nouveau mot de passe</h1>
                <p className="text-indigo-100 text-center text-sm mt-2">
                  Créez un nouveau mot de passe sécurisé
                </p>
              </div>

              {/* Formulaire */}
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 caractères"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      disabled={loading}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700">Confirmer le mot de passe</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirmer le mot de passe"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                      }}
                      disabled={loading}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                  <strong>Conseils pour un mot de passe sécurisé :</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                    <li>Au moins 8 caractères</li>
                    <li>Mix de majuscules et minuscules</li>
                    <li>Incluez des chiffres et symboles</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                >
                  Réinitialiser le mot de passe
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Message de succès */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-8 py-12 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Lock size={32} className="text-green-600" />
                  </div>
                </div>
                <h2 className="text-h3 font-bold text-green-800">Mot de passe réinitialisé</h2>
                <p className="text-green-700">
                  Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </p>
                <p className="text-sm text-neutral-600">
                  Redirection vers la page de connexion...
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
