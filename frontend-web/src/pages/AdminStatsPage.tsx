
import { useEffect, useState } from 'react';
import { adminService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';

export default function AdminStatsPage() {
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminService.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-neutral-600">Chargement des statistiques...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="bg-white border-b p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-h2 font-bold text-blue-800">📊 Statistiques du système</h1>
            <p className="text-body-small text-neutral-600">
              Admin: <span className="font-semibold">{user?.email}</span>
            </p>
          </div>
          <Link to="/admin/dashboard" className="text-blue-600 hover:text-blue-800 underline text-sm">
            ← Retour au dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        {/* Grille de statistiques principales */}
        <div className="mb-8">
          <h2 className="text-h3 mb-4 font-bold">Vue d'ensemble</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <StatTile
              icon="👥"
              label="Utilisateurs"
              value={dashboard?.totalUsers || 0}
              color="blue"
              description="utilisateurs actifs"
            />
            <StatTile
              icon="⏳"
              label="Demandes en attente"
              value={dashboard?.pendingRequests || 0}
              color="orange"
              description="à traiter"
            />
            <StatTile
              icon="✅"
              label="Certificats actifs"
              value={dashboard?.activeCertificates || 0}
              color="green"
              description="en cours de validité"
            />
            <StatTile
              icon="❌"
              label="Certificats révoqués"
              value={dashboard?.revokedCertificates || 0}
              color="red"
              description="révoqués"
            />
          </div>
        </div>

        {/* Section Autorité de Certification */}
        <div className="bg-white rounded-2xl p-8 border shadow mb-8">
          <h2 className="text-h3 mb-6 font-bold text-neutral-900">🏢 Autorité de Certification</h2>

          {dashboard?.caStatus?.isInitialized ? (
            <div className="space-y-6">
              {/* Statut général */}
              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Statut de l'AC</div>
                    <div className="text-2xl font-bold text-green-700">🟢 Active et opérationnelle</div>
                  </div>
                  <div className="text-4xl">🏢</div>
                </div>
              </div>

              {/* Informations de l'AC */}
              <div className="grid md:grid-cols-2 gap-4">
                <InfoBox label="Nom de l'AC" value={dashboard.caStatus.caName} icon="📛" />
                <InfoBox
                  label="Distinguished Name"
                  value={dashboard.caStatus.subjectDN}
                  icon="🔐"
                  mono
                />
              </div>

              {/* Dates de validité */}
              <div className="grid md:grid-cols-2 gap-4">
                <InfoBox
                  label="Valide depuis"
                  value={
                    dashboard.caStatus.validFrom
                      ? new Date(dashboard.caStatus.validFrom).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'
                  }
                  icon="📅"
                />
                <InfoBox
                  label="Expire le"
                  value={
                    dashboard.caStatus.validUntil
                      ? new Date(dashboard.caStatus.validUntil).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'
                  }
                  icon="⏰"
                />
              </div>

              {/* Alerte d'expiration */}
              {dashboard.caStatus.daysUntilExpiration !== undefined && (
                <div
                  className={`p-6 rounded-xl border ${
                    dashboard.caStatus.daysUntilExpiration < 30
                      ? 'bg-red-50 border-red-200'
                      : dashboard.caStatus.daysUntilExpiration < 90
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-neutral-600 mb-1">Jours avant expiration</div>
                      <div
                        className={`text-3xl font-bold ${
                          dashboard.caStatus.daysUntilExpiration < 30
                            ? 'text-red-700'
                            : dashboard.caStatus.daysUntilExpiration < 90
                              ? 'text-yellow-700'
                              : 'text-green-700'
                        }`}
                      >
                        {dashboard.caStatus.daysUntilExpiration} jours
                      </div>
                    </div>
                    <div className="text-4xl">
                      {dashboard.caStatus.daysUntilExpiration < 30
                        ? '🔴'
                        : dashboard.caStatus.daysUntilExpiration < 90
                          ? '🟡'
                          : '🟢'}
                    </div>
                  </div>
                  {dashboard.caStatus.daysUntilExpiration < 30 && (
                    <p className="text-sm text-red-700 mt-3">
                      ⚠️ Attention: L'AC expire bientôt. Planifiez son renouvellement.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-red-700 font-semibold mb-2">L'AC n'est pas initialisée</p>
              <p className="text-sm text-red-600 mb-4">
                Vous devez initialiser l'Autorité de Certification racine avant de pouvoir émettre des certificats.
              </p>
              <Link
                to="/admin/dashboard"
                className="inline-block px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition"
              >
                Initialiser l'AC
              </Link>
            </div>
          )}
        </div>

        {/* Graphiques de synthèse */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Résumé des activités */}
          <div className="bg-white rounded-2xl p-8 border shadow">
            <h3 className="text-h4 mb-6 font-bold">📈 Résumé des activités</h3>
            <div className="space-y-4">
              <SummaryItem
                label="Demandes en attente"
                value={dashboard?.pendingRequests || 0}
                icon="⏳"
                color="orange"
              />
              <SummaryItem
                label="Certificats émis"
                value={dashboard?.activeCertificates || 0}
                icon="✅"
                color="green"
              />
              <SummaryItem
                label="Certificats révoqués"
                value={dashboard?.revokedCertificates || 0}
                icon="❌"
                color="red"
              />
              <SummaryItem
                label="Utilisateurs enregistrés"
                value={dashboard?.totalUsers || 0}
                icon="👥"
                color="blue"
              />
            </div>
          </div>

          {/* Actions rapides */}
          <div className="bg-white rounded-2xl p-8 border shadow">
            <h3 className="text-h4 mb-6 font-bold">⚡ Actions rapides</h3>
            <div className="space-y-3">
              <ActionLink to="/admin/certificate-requests" icon="📋" text="Voir les demandes" />
              <ActionLink to="/admin/generate-ca" icon="🏢" text="Générer une CA" />
              <ActionLink to="/admin/sign-csr" icon="✍️" text="Signer une CSR" />
              <ActionLink to="/admin/generate-crl" icon="🔄" text="Générer une CRL" />
              <ActionLink to="/admin/revoke-certificate" icon="❌" text="Révoquer un certificat" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Composants réutilisables

function StatTile({ icon, label, value, color, description }: any) {
  const colorClasses: any = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
  };

  const numberClasses: any = {
    blue: 'text-blue-700',
    orange: 'text-orange-700',
    green: 'text-green-700',
    red: 'text-red-700',
  };

  return (
    <div className={`rounded-xl p-6 border ${colorClasses[color]}`}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className={`text-3xl font-bold ${numberClasses[color]}`}>{value}</div>
      <div className="text-sm font-medium text-neutral-600 mt-1">{label}</div>
      <div className="text-xs text-neutral-500 mt-1">{description}</div>
    </div>
  );
}

function InfoBox({ label, value, icon, mono = false }: any) {
  return (
    <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <div className="text-xs text-neutral-600 font-medium">{label}</div>
      </div>
      <div className={`font-semibold text-neutral-900 ${mono ? 'font-mono text-sm break-all' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function SummaryItem({ label, value, icon, color }: any) {
  const colorClasses: any = {
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className={`text-2xl ${colorClasses[color]} p-2 rounded`}>{icon}</div>
        <div className="text-sm text-neutral-700">{label}</div>
      </div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
    </div>
  );
}

function ActionLink({ to, icon, text }: any) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border hover:bg-neutral-100 hover:border-neutral-300 transition"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-neutral-700">{text}</span>
      </div>
      <span className="text-neutral-400">→</span>
    </Link>
  );
}
