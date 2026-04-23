import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { userService, Certificate } from '../services/api';
import Button from '../components/Button';

export default function DashboardUserPage() {
  const user = useAuthStore((state) => state.user);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userService
      .getMyCertificates()
      .then(setCertificates)
      .catch(() => setError('Erreur lors du chargement des certificats.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-neutral-50 py-4 dark:bg-neutral-950 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-h3 font-semibold text-[var(--text-strong)] dark:text-neutral-100">Tableau de bord</h1>
              <p className="text-body text-[var(--text-muted)] dark:text-neutral-400">
                Bienvenue, {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">{user?.email}</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                {(user?.firstName?.charAt(0) || 'U').toUpperCase()}
              </div>
              <div>
                <div className="text-h4 font-semibold text-[var(--text-strong)] dark:text-neutral-100">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-sm text-[var(--text-muted)] dark:text-neutral-400">{user?.role}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center dark:border-neutral-800 dark:bg-neutral-950">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Certificats</div>
                <div className="text-h3 font-semibold text-[var(--text-strong)] dark:text-neutral-100">{certificates.length}</div>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center dark:border-neutral-800 dark:bg-neutral-950">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Demandes</div>
                <div className="text-h3 font-semibold text-[var(--text-strong)] dark:text-neutral-100">-</div>
              </div>
            </div>

            <div className="mt-6 grid gap-2">
              <Link to="/generate-csr">
                <Button className="w-full">Nouvelle demande</Button>
              </Link>
              <Link to="/phase-3-csr">
                <Button variant="secondary" className="w-full">Phase 3 - CSR</Button>
              </Link>
              <Link to="/requests">
                <Button variant="secondary" className="w-full">Suivi des demandes</Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between">
                <h2 className="text-h4 font-semibold text-[var(--text-strong)] dark:text-neutral-100">Mes certificats</h2>
                <Link to="/certificates" className="text-sm text-primary-700 underline dark:text-primary-300">
                  Voir tout
                </Link>
              </div>

              {loading ? (
                <div className="mt-4 text-neutral-500 dark:text-neutral-400">Chargement...</div>
              ) : error ? (
                <div className="mt-4 text-red-600 dark:text-red-300">{error}</div>
              ) : certificates.length === 0 ? (
                <div className="mt-4 text-neutral-500 dark:text-neutral-400">Aucun certificat trouve.</div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {certificates.slice(0, 4).map((cert) => (
                    <div key={cert.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">Titulaire</div>
                      <div className="mt-1 font-semibold text-[var(--text-strong)] dark:text-neutral-100">
                        {cert.subjectDN.split(',')[0]?.replace('CN=', '') || '-'}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Valide jusqu'au {cert.notAfter?.slice(0, 10)}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm">Telecharger .crt</Button>
                        <Button size="sm" variant="secondary">Telecharger .p12</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
              <div className="font-semibold text-[var(--text-strong)] dark:text-neutral-100">Conseils rapides</div>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>Conservez votre fichier .p12 dans un lieu sur.</li>
                <li>Renouvelez vos certificats 30 jours avant expiration.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
