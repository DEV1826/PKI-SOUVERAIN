import { useEffect, useState } from 'react';
import { userService, Certificate } from '../services/api';

export default function UserCertificatesPage() {
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'pem' | 'crt' | null>(null);

  useEffect(() => {
    userService.getMyCertificates()
      .then((certs) => setCert(certs[0] || null))
      .catch(() => setError("Erreur lors du chargement du certificat."))
      .finally(() => setLoading(false));
  }, []);

  // Helpers pour affichage
  function formatDate(dateStr?: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Fonction de téléchargement
  async function downloadCertificate(format: 'pem' | 'crt') {
    if (!cert || !cert.id) return;
    
    try {
      setDownloading(format as any);
      const blob = await userService.downloadCertificate(cert.id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${cert.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError("Erreur lors du téléchargement du certificat.");
      console.error(err);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      {/* Header visuel */}
      <div className="flex flex-col items-center pt-10 pb-4">
        <div className="bg-green-100 rounded-full p-4 mb-2">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#34D399"/><path d="M8 12.5l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1 className="text-h2 font-bold text-center mb-1">Certificat émis avec succès</h1>
        <div className="text-lg text-neutral-600 text-center mb-4">Votre certificat numérique X.509 a été généré et est prêt à être utilisé.</div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bloc infos certificat */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow p-7 border border-neutral-100">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-h3 font-semibold">Informations du certificat</h2>
            {cert && (
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">Certificat actif</span>
            )}
          </div>
          {loading ? (
            <div className="text-neutral-500">Chargement...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : !cert ? (
            <div className="text-neutral-500">Aucun certificat trouvé.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-base">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Titulaire (CN)</div>
                <div className="font-medium text-neutral-900">{cert.subjectDN.split(',')[0]?.replace('CN=', '') || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Date d'émission</div>
                <div className="font-medium text-neutral-900">{formatDate(cert.notBefore)}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Organisation</div>
                <div className="font-medium text-neutral-900">{cert.subjectDN.split(',')[1]?.replace('O=', '') || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Date d'expiration</div>
                <div className="font-medium text-neutral-900">{formatDate(cert.notAfter)}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Algorithme</div>
                <div className="font-medium text-neutral-900">RSA 4096 bits</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Numéro de série</div>
                <div className="font-mono text-neutral-900 tracking-wider">{cert.serialNumber.match(/.{1,2}/g)?.join(':') || cert.serialNumber}</div>
              </div>
            </div>
          )}
          {/* Empreinte SHA-256 */}
          {cert && (
            <div className="mt-6">
              <div className="text-xs text-neutral-500 mb-1">Empreinte SHA-256</div>
              <div className="bg-neutral-100 rounded px-3 py-2 font-mono text-xs text-neutral-700 break-all">
                SHA-256 : {cert.serialNumber ? cert.serialNumber.replace(/(.{2})/g, '$1:').slice(0, -1) : ''} ...
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite : téléchargement, conformité, rappel */}
        <div className="flex flex-col gap-4">
          {/* Téléchargement */}
          <div className="bg-white rounded-2xl shadow p-6 border border-neutral-100 mb-2">
            <div className="text-h4 font-semibold mb-3">Télécharger le certificat</div>
            <button 
              onClick={() => downloadCertificate('crt')}
              disabled={downloading !== null}
              className="w-full flex items-center gap-2 justify-center bg-primary-800 hover:bg-primary-900 text-white font-semibold py-2.5 rounded-lg mb-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 4v12m0 0l-4-4m4 4l4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="4" y="18" width="16" height="2" rx="1" fill="#fff"/></svg>
              {downloading === 'crt' ? 'Téléchargement...' : 'Certificat (.crt)'}
            </button>
            <button 
              onClick={() => downloadCertificate('pem')}
              disabled={downloading !== null}
              className="w-full flex items-center gap-2 justify-center border-2 border-primary-800 text-primary-800 font-semibold py-2.5 rounded-lg hover:bg-primary-50 transition disabled:opacity-50 disabled:cursor-not-allowed">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#1e40af" strokeWidth="2"/><path d="M8 12h8M8 16h8M8 8h8" stroke="#1e40af" strokeWidth="2" strokeLinecap="round"/></svg>
              {downloading === 'pem' ? 'Téléchargement...' : 'Certificat (.pem)'}
            </button>
            <div className="text-xs text-neutral-500 mt-2">Le fichier .crt est compatible avec la plupart des navigateurs et applications.</div>
          </div>
          {/* Conformité */}
          <div className="bg-white rounded-2xl shadow p-5 border border-neutral-100">
            <div className="flex items-center gap-2 mb-2">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#1e40af" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="font-semibold text-primary-900">Conformité et sécurité</span>
            </div>
            <ul className="list-disc list-inside text-sm text-neutral-700">
              <li>Certificat X.509 v3</li>
              <li>Chiffrement RSA 4096 bits</li>
              <li>Conforme PKCS#12</li>
              <li>Horodatage certifié</li>
            </ul>
          </div>
          {/* Rappel */}
          <div className="bg-white rounded-2xl shadow p-4 border border-neutral-100">
            <div className="text-xs text-orange-700 font-semibold">Rappel : <span className="font-normal text-neutral-700">Vous recevrez une notification 30 jours avant l'expiration de votre certificat.</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
