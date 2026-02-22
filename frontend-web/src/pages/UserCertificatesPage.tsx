import { useEffect, useState } from 'react';
import { Certificate, userService } from '../services/api';

export default function UserCertificatesPage() {
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'pem' | 'crt' | null>(null);

  useEffect(() => {
    userService
      .getMyCertificates()
      .then((certs) => setCert(certs[0] || null))
      .catch(() => setError('Erreur lors du chargement du certificat.'))
      .finally(() => setLoading(false));
  }, []);

  function formatDate(dateStr?: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  async function downloadCertificate(format: 'pem' | 'crt') {
    if (!cert?.id) return;
    try {
      setDownloading(format);
      const blob = await userService.downloadCertificate(cert.id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${cert.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError('Erreur lors du telechargement du certificat.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-12 dark:bg-neutral-950">
      <div className="flex flex-col items-center pb-4 pt-10">
        <div className="mb-2 rounded-full bg-green-100 p-4 dark:bg-green-950/40">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" fill="#34D399" />
            <path d="M8 12.5l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mb-1 text-center text-h2 font-bold dark:text-neutral-100">Certificat emis avec succes</h1>
        <div className="mb-4 text-center text-lg text-neutral-600 dark:text-neutral-400">
          Votre certificat numerique X.509 a ete genere et est pret a etre utilise.
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-100 bg-white p-7 shadow dark:border-neutral-800 dark:bg-neutral-900 md:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-h3 font-semibold dark:text-neutral-100">Informations du certificat</h2>
            {cert && <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-300">Certificat actif</span>}
          </div>

          {loading ? (
            <div className="text-neutral-500 dark:text-neutral-400">Chargement...</div>
          ) : error ? (
            <div className="text-red-600 dark:text-red-300">{error}</div>
          ) : !cert ? (
            <div className="text-neutral-500 dark:text-neutral-400">Aucun certificat trouve.</div>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-base md:grid-cols-2">
              <Info label="Titulaire (CN)" value={cert.subjectDN.split(',')[0]?.replace('CN=', '') || '-'} />
              <Info label="Date d'emission" value={formatDate(cert.notBefore)} />
              <Info label="Organisation" value={cert.subjectDN.split(',')[1]?.replace('O=', '') || '-'} />
              <Info label="Date d'expiration" value={formatDate(cert.notAfter)} />
              <Info label="Algorithme" value="RSA 4096 bits" />
              <Info label="Numero de serie" value={cert.serialNumber.match(/.{1,2}/g)?.join(':') || cert.serialNumber} mono />
            </div>
          )}

          {cert && (
            <div className="mt-6">
              <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Empreinte SHA-256</div>
              <div className="break-all rounded bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                SHA-256 : {cert.serialNumber ? cert.serialNumber.replace(/(.{2})/g, '$1:').slice(0, -1) : ''} ...
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="mb-2 rounded-2xl border border-neutral-100 bg-white p-6 shadow dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 text-h4 font-semibold dark:text-neutral-100">Telecharger le certificat</div>
            <button
              onClick={() => downloadCertificate('crt')}
              disabled={downloading !== null}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-800 py-2.5 font-semibold text-white transition hover:bg-primary-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading === 'crt' ? 'Telechargement...' : 'Certificat (.crt)'}
            </button>
            <button
              onClick={() => downloadCertificate('pem')}
              disabled={downloading !== null}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary-800 py-2.5 font-semibold text-primary-800 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-primary-300 dark:text-primary-300 dark:hover:bg-primary-950/30"
            >
              {downloading === 'pem' ? 'Telechargement...' : 'Certificat (.pem)'}
            </button>
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Le fichier .crt est compatible avec la plupart des navigateurs et applications.</div>
          </div>

          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-semibold text-primary-900 dark:text-primary-300">Conformite et securite</span>
            </div>
            <ul className="list-inside list-disc text-sm text-neutral-700 dark:text-neutral-300">
              <li>Certificat X.509 v3</li>
              <li>Chiffrement RSA 4096 bits</li>
              <li>Conforme PKCS#12</li>
              <li>Horodatage certifie</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-xs font-semibold text-orange-700 dark:text-orange-300">
              Rappel :
              <span className="font-normal text-neutral-700 dark:text-neutral-300"> Vous recevrez une notification 30 jours avant l'expiration de votre certificat.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className={`font-medium text-neutral-900 dark:text-neutral-100 ${mono ? 'font-mono tracking-wider' : ''}`}>{value}</div>
    </div>
  );
}
