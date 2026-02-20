import { useEffect, useState } from 'react';
import { adminService } from '../services/api';  // ← DÉPEND de api.ts
import { useAuthStore } from '../stores/authStore';  // ← DÉPEND de authStore.ts
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { Link } from 'react-router-dom';

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

  const handleInitializeCA = async () => {
    setShowInitModal(true);
  };

  const confirmInitialize = async () => {
    setBusyInit(true);
    try {
      await adminService.initializeCA();
      loadDashboard();  // Recharger
      addToast({ type: 'success', message: "AC Racine initialisée avec succès !" });
      setShowInitModal(false);
    } catch (error: any) {
      addToast({ type: 'error', message: error?.message || "Erreur lors de l'initialisation" });
    } finally {
      setBusyInit(false);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      <header className="bg-white border-b p-4 shadow-sm">
        <h1 className="text-h2 font-bold text-red-800">Tableau de bord - Admin</h1>
        <p className="text-body-small text-neutral-600">
          Connecté en tant que <span className="font-semibold">{user?.email}</span>
        </p>
      </header>
      <main className="max-w-7xl mx-auto p-8">
        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link to="/admin/stats" className="block px-4 py-6 rounded-xl bg-red-100 text-red-800 font-semibold text-center shadow hover:bg-red-200 transition">📊 Statistiques</Link>
          <Link to="/admin/manage-users" className="block px-4 py-6 rounded-xl bg-indigo-100 text-indigo-800 font-semibold text-center shadow hover:bg-indigo-200 transition">👥 Gérer les utilisateurs</Link>
          <Link to="/admin/generate-ca" className="block px-4 py-6 rounded-xl bg-orange-100 text-orange-800 font-semibold text-center shadow hover:bg-orange-200 transition">🏢 Générer CA</Link>
          <Link to="/admin/sign-csr" className="block px-4 py-6 rounded-xl bg-yellow-100 text-yellow-800 font-semibold text-center shadow hover:bg-yellow-200 transition">✍️ Signer une CSR</Link>
          <Link to="/admin/generate-crl" className="block px-4 py-6 rounded-xl bg-pink-100 text-pink-800 font-semibold text-center shadow hover:bg-pink-200 transition">🔄 Générer/Faire pivoter la CRL</Link>
          <Link to="/admin/revoke-certificate" className="block px-4 py-6 rounded-xl bg-purple-100 text-purple-800 font-semibold text-center shadow hover:bg-purple-200 transition">❌ Révoquer un certificat</Link>
          <Link to="/admin/download-crl" className="block px-4 py-6 rounded-xl bg-gray-100 text-gray-800 font-semibold text-center shadow hover:bg-gray-200 transition">📥 Télécharger la CRL</Link>
        </div>
        
        {/* Statistiques principales */}
        <div className="mb-8">
          <h2 className="text-h3 mb-4 font-bold text-neutral-900">📈 Statistiques principales</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <StatCard 
              icon="👥" 
              label="Utilisateurs" 
              value={dashboard?.totalUsers || 0}
              color="blue"
            />
            <StatCard 
              icon="⏳" 
              label="Demandes en attente" 
              value={dashboard?.pendingRequests || 0}
              color="orange"
            />
            <StatCard 
              icon="✅" 
              label="Certificats actifs" 
              value={dashboard?.activeCertificates || 0}
              color="green"
            />
            <StatCard 
              icon="❌" 
              label="Certificats révoqués" 
              value={dashboard?.revokedCertificates || 0}
              color="red"
            />
          </div>
        </div>
        
        {/* État AC */}
        <div className="bg-white rounded-2xl p-8 border shadow mb-8">
          <h2 className="text-h3 mb-6 text-red-800 font-bold">🏢 Autorité de Certification (AC)</h2>
          {dashboard?.caStatus?.isInitialized ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <span className="font-semibold text-green-900">Statut</span>
                <span className="text-green-700 font-bold">🟢 Active</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 rounded-lg border">
                  <div className="text-xs text-neutral-600 mb-1">Nom de l'AC</div>
                  <div className="font-semibold text-neutral-900">{dashboard.caStatus.caName}</div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg border">
                  <div className="text-xs text-neutral-600 mb-1">Distinguished Name (DN)</div>
                  <div className="font-mono text-xs text-neutral-900 truncate">{dashboard.caStatus.subjectDN}</div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 rounded-lg border">
                  <div className="text-xs text-neutral-600 mb-1">Valide depuis</div>
                  <div className="text-sm font-medium text-neutral-900">
                    {dashboard.caStatus.validFrom ? new Date(dashboard.caStatus.validFrom).toLocaleDateString('fr-FR') : 'N/A'}
                  </div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg border">
                  <div className="text-xs text-neutral-600 mb-1">Expire le</div>
                  <div className="text-sm font-medium text-neutral-900">
                    {dashboard.caStatus.validUntil ? new Date(dashboard.caStatus.validUntil).toLocaleDateString('fr-FR') : 'N/A'}
                  </div>
                </div>
              </div>
              {dashboard.caStatus.daysUntilExpiration !== undefined && (
                <div className={`p-4 rounded-lg border ${
                  dashboard.caStatus.daysUntilExpiration < 30 
                    ? 'bg-red-50 border-red-200' 
                    : dashboard.caStatus.daysUntilExpiration < 90
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="text-xs text-neutral-600 mb-1">Jours avant expiration</div>
                  <div className={`text-lg font-bold ${
                    dashboard.caStatus.daysUntilExpiration < 30 
                      ? 'text-red-700' 
                      : dashboard.caStatus.daysUntilExpiration < 90
                      ? 'text-yellow-700'
                      : 'text-green-700'
                  }`}>
                    {dashboard.caStatus.daysUntilExpiration} jours
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-semibold">⚠️ L'AC n'est pas encore initialisée</p>
                <p className="text-sm text-red-600 mt-1">Vous devez d'abord initialiser l'Autorité de Certification racine.</p>
              </div>
              <Button onClick={handleInitializeCA}>
                🔧 Initialiser l'Autorité de Certification
              </Button>
            </div>
          )}

          <Modal open={showInitModal} title="Initialiser l'AC Racine" onClose={() => setShowInitModal(false)}
            footer={
              <>
                <Button onClick={() => setShowInitModal(false)} variant="secondary">Annuler</Button>
                <Button onClick={confirmInitialize} className="ml-2" disabled={busyInit}>{busyInit ? 'Traitement...' : 'Confirmer'}</Button>
              </>
            }
          >
            <p>Initialiser l'AC Racine ? Cette action est irréversible.</p>
            <p className="text-sm text-neutral-600 mt-2">Un nouvel ensemble de clés et certificats root sera créé.</p>
          </Modal>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color = 'blue' }: any) {
  const colorClasses: any = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900'
  };
  
  const numberClasses: any = {
    blue: 'text-blue-700',
    orange: 'text-orange-700',
    green: 'text-green-700',
    red: 'text-red-700'
  };

  return (
    <div className={`rounded-2xl p-6 border ${colorClasses[color]}`}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className={`text-h1 font-bold ${numberClasses[color]}`}>{value || 0}</div>
      <div className="text-sm font-medium text-neutral-600 mt-1">{label}</div>
    </div>
  );
}