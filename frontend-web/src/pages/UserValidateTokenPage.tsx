import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, CheckCircle, Download } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/Button';

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
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!requestId || !token) {
      setError('Parametres manquants : requestId ou token');
      setLoading(false);
      return;
    }

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
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      setCertificate(response.data);
      setSuccess(true);
    } catch (err: any) {
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
    <div className="min-h-screen bg-neutral-50 py-8 dark:bg-neutral-950">
      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-h3 font-semibold text-[var(--text-strong)] dark:text-neutral-100">Validation du certificat</h1>
              <p className="text-body text-[var(--text-muted)] dark:text-neutral-400">
                Saisissez votre token pour finaliser la demande.
              </p>
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">{user?.email}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {loading && (
            <div className="text-center text-neutral-600 dark:text-neutral-300">Validation en cours...</div>
          )}

          {error && !loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                <AlertCircle size={20} />
                <span className="text-sm">{error}</span>
              </div>
              <Button onClick={() => navigate('/dashboard')}>Aller au tableau de bord</Button>
            </div>
          )}

          {success && certificate && !loading && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
                <CheckCircle size={20} />
                <span className="text-sm">Certificat valide avec succes.</span>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">ID du certificat</div>
                <div className="mt-1 font-mono text-xs">{certificate.certificateId}</div>
                <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">Empreinte (fingerprint)</div>
                <div className="mt-1 font-mono text-xs">{certificate.fingerprint}</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Delivre le</div>
                    <div className="text-sm">
                      {new Date(certificate.issuedAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Expire le</div>
                    <div className="text-sm">
                      {new Date(certificate.expiresAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={downloadCertificate}>
                  <Download size={16} />
                  <span className="ml-2">Telecharger le certificat</span>
                </Button>
                <Button variant="secondary" onClick={() => navigate('/dashboard')}>Aller au tableau de bord</Button>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Apercu PEM</div>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono">
                  {certificate.certificate.substring(0, 200)}...
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
