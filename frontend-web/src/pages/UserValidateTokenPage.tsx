import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { userService } from '../services/api';
import { AlertCircle, CheckCircle, Download, ArrowLeft } from 'lucide-react';
import axios from 'axios';

interface CertificateData {
  certificateId: string;
  certificate: string;
  fingerprint: string;
  issuedAt: string;
  expiresAt: string;
}

export default function UserValidateTokenPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  const requestId = searchParams.get('requestId');
  const token = searchParams.get('token');

  useEffect(() => {
    // Rediriger si non authentifié
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Vérifier les paramètres
    if (!requestId || !token) {
      setError('Paramètres manquants : requestId ou token');
      setLoading(false);
      return;
    }

    // Valider le token
    validateToken();
  }, [requestId, token, isAuthenticated]);

  const validateToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8080/api';
      const authToken = localStorage.getItem('accessToken');
      
      const response = await axios.post<CertificateData>(
        `${apiBaseUrl}/user/certificate-requests/${requestId}/validate-token`,
        null,
        {
          params: { token },
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      setCertificate(response.data);
      setSuccess(true);
    } catch (err: any) {
      console.error('Erreur lors de la validation du token:', err);
      const message = err.response?.data?.error || err.message || 'Erreur lors de la validation';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = () => {
    if (!certificate) return;

    const element = document.createElement('a');
    const file = new Blob([certificate.certificate], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `certificate-${certificate.certificateId}.pem`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-purple-300 hover:text-purple-200 transition"
          >
            <ArrowLeft size={20} />
            <span>Retour</span>
          </button>
        </div>

        {/* Card */}
        <div className="bg-slate-800/95 backdrop-blur border border-purple-500/30 rounded-lg shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            Validation du Certificat
          </h1>

          {/* Loading State */}
          {loading && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-purple-900 animate-pulse">
                <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-purple-400 border-r-purple-400 animate-spin" />
              </div>
              <p className="text-slate-300">Validation en cours...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-600/50 rounded-lg">
                <AlertCircle size={24} className="text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Aller au tableau de bord
              </button>
            </div>
          )}

          {/* Success State */}
          {success && certificate && !loading && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/30 border border-green-600/50">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-lg font-semibold text-green-300 mb-2">
                  Certificat Validé
                </h2>
                <p className="text-slate-400 text-sm">
                  Votre certificat numérique a été validé avec succès
                </p>
              </div>

              {/* Certificate Details */}
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">
                    ID du Certificat
                  </label>
                  <p className="text-slate-200 text-xs font-mono break-all mt-1">
                    {certificate.certificateId}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">
                    Empreinte (Fingerprint)
                  </label>
                  <p className="text-slate-200 text-xs font-mono break-all mt-1">
                    {certificate.fingerprint}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">
                      Délivré le
                    </label>
                    <p className="text-slate-200 text-xs mt-1">
                      {new Date(certificate.issuedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">
                      Expire le
                    </label>
                    <p className="text-slate-200 text-xs mt-1">
                      {new Date(certificate.expiresAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  onClick={downloadCertificate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition transform hover:scale-105"
                >
                  <Download size={20} />
                  <span>Télécharger le Certificat</span>
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Aller au tableau de bord
                </button>
              </div>

              {/* Certificate Preview */}
              <div className="bg-slate-900/50 rounded-lg p-3 max-h-40 overflow-y-auto border border-slate-600">
                <label className="text-xs font-semibold text-slate-400 uppercase block mb-2">
                  Contenu du Certificat (PEM)
                </label>
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
                  {certificate.certificate.substring(0, 200)}...
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-slate-400 text-sm">
          <p>Utilisateur: <span className="text-purple-300 font-semibold">{user?.email}</span></p>
        </div>
      </div>
    </div>
  );
}
