import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function DashboardAdminPage() {
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInitModal, setShowInitModal] = useState(false);
  const [busyInit, setBusyInit] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await adminService.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const confirmInitialize = async () => {
    setBusyInit(true);
    try {
      await adminService.initializeCA();
      await loadDashboard();
      addToast({ type: 'success', message: 'AC racine initialisee avec succes.' });
      setShowInitModal(false);
    } catch (error: any) {
      addToast({ type: 'error', message: error?.message || "Erreur lors de l'initialisation" });
    } finally {
      setBusyInit(false);
    }
  };

  if (loading) return <div className="px-6 py-8 text-neutral-600 dark:text-neutral-300">Chargement...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-h3 font-semibold text-[var(--text-strong)] dark:text-neutral-100">Tableau de bord - Admin</h1>
          <p className="text-sm text-[var(--text-muted)] dark:text-neutral-400">
            Connecte en tant que <span className="font-semibold">{user?.email}</span>
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Link to="/admin/stats" className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-primary-950/20">
            Statistiques
          </Link>
          <Link to="/admin/manage-users" className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-primary-950/20">
            Gerer les utilisateurs
          </Link>
          <Link to="/admin/generate-ca" className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-primary-950/20">
            Generer CA
          </Link>
          <Link to="/admin/sign-csr" className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-primary-950/20">
            Signer une CSR
          </Link>
          <Link to="/admin/generate-crl" className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-primary-950/20">
            Generer / Pivoter la CRL
          </Link>
          <Link to="/admin/revoke-certificate" className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-primary-950/20">
            Revoquer un certificat
          </Link>
          <Link to="/admin/download-crl" className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-primary-950/20">
            Telecharger la CRL
          </Link>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-h4 font-semibold text-[var(--text-strong)] dark:text-neutral-100">Statistiques principales</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <StatCard label="Utilisateurs" value={dashboard?.totalUsers || 0} />
            <StatCard label="Demandes en attente" value={dashboard?.pendingRequests || 0} />
            <StatCard label="Certificats actifs" value={dashboard?.activeCertificates || 0} />
            <StatCard label="Certificats revoques" value={dashboard?.revokedCertificates || 0} />
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-h4 font-semibold text-[var(--text-strong)] dark:text-neutral-100">Autorite de Certification (AC)</h2>
          {dashboard?.caStatus?.isInitialized ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
                <span className="font-semibold">Statut</span>
                <span className="font-semibold">Active</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard label="Nom de l'AC" value={dashboard.caStatus.caName} />
                <InfoCard label="Distinguished Name (DN)" value={dashboard.caStatus.subjectDN} mono />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard label="Valide depuis" value={dashboard.caStatus.validFrom ? new Date(dashboard.caStatus.validFrom).toLocaleDateString('fr-FR') : 'N/A'} />
                <InfoCard label="Expire le" value={dashboard.caStatus.validUntil ? new Date(dashboard.caStatus.validUntil).toLocaleDateString('fr-FR') : 'N/A'} />
              </div>
              {dashboard.caStatus.daysUntilExpiration !== undefined && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Jours avant expiration</div>
                  <div className="text-lg font-semibold">{dashboard.caStatus.daysUntilExpiration} jours</div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                L'AC n'est pas encore initialisee.
              </div>
              <Button onClick={() => setShowInitModal(true)}>Initialiser l'Autorite de Certification</Button>
            </div>
          )}

          <Modal
            open={showInitModal}
            title="Initialiser l'AC Racine"
            onClose={() => setShowInitModal(false)}
            footer={
              <>
                <Button onClick={() => setShowInitModal(false)} variant="secondary">Annuler</Button>
                <Button onClick={confirmInitialize} className="ml-2" disabled={busyInit}>
                  {busyInit ? 'Traitement...' : 'Confirmer'}
                </Button>
              </>
            }
          >
            <p>Initialiser l'AC Racine ? Cette action est irreversible.</p>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Un nouvel ensemble de cles et certificats root sera cree.
            </p>
          </Modal>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center dark:border-neutral-800 dark:bg-neutral-950">
      <div className="text-h3 font-semibold text-[var(--text-strong)] dark:text-neutral-100">{value}</div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  );
}

function InfoCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className={`mt-1 text-sm text-neutral-800 dark:text-neutral-100 ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '-'}
      </div>
    </div>
  );
}
