import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';
import { userService, Certificate } from '../services/api';

export default function DashboardUserPage() {
  const user = useAuthStore((state) => state.user);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userService.getMyCertificates()
      .then(setCertificates)
      .catch(() => setError("Erreur lors du chargement des certificats."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 py-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profil / Actions */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl shadow p-6 border border-neutral-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700">{user?.firstName?.charAt(0) || 'U'}</div>
              <div>
                <div className="text-h4 font-semibold text-primary-900">{user?.firstName} {user?.lastName}</div>
                <div className="text-sm text-neutral-600">{user?.email}</div>
                <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">{user?.role}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="bg-neutral-50 p-3 rounded text-center">
                <div className="text-xs text-neutral-500">Certificats</div>
                <div className="text-h4 font-bold">{certificates.length}</div>
              </div>
              <div className="bg-neutral-50 p-3 rounded text-center">
                <div className="text-xs text-neutral-500">Demandes</div>
                <div className="text-h4 font-bold">—</div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Link to="/generate-csr" className="w-full px-4 py-3 rounded-lg bg-primary-100 text-primary-800 font-medium text-center hover:bg-primary-200 transition">📝 Nouvelle demande</Link>
              <Link to="/requests" className="w-full px-4 py-3 rounded-lg bg-neutral-50 text-primary-700 font-medium text-center hover:bg-neutral-100 transition">📄 Suivi demandes</Link>
            </div>
          </div>
        </div>

        {/* Contenu principal - certificats */}
        <div className="col-span-2">
          <div className="bg-white rounded-2xl shadow p-6 border border-neutral-100 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-h4 font-semibold text-primary-700">Mes certificats</h3>
              <Link to="/certificates" className="text-sm text-primary-800 underline">Voir tout</Link>
            </div>

            {loading ? (
              <div className="text-neutral-500 mt-4">Chargement...</div>
            ) : error ? (
              <div className="text-red-600 mt-4">{error}</div>
            ) : certificates.length === 0 ? (
              <div className="text-neutral-500 mt-4">Aucun certificat trouvé.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {certificates.map(cert => (
                  <div key={cert.id} className="p-4 rounded-lg border bg-neutral-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-neutral-500">Titulaire</div>
                        <div className="font-semibold text-neutral-900">{cert.subjectDN.split(',')[0]?.replace('CN=', '') || '—'}</div>
                        <div className="text-xs text-neutral-500">Valide jusqu'au {cert.notAfter?.slice(0,10)}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button className="px-3 py-1 rounded bg-primary-800 text-white text-sm">Télécharger .crt</button>
                        <button className="px-3 py-1 rounded border border-primary-800 text-primary-800 text-sm">Télécharger .p12</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick tips */}
          <div className="bg-white rounded-2xl shadow p-4 border border-neutral-100">
            <div className="font-semibold text-primary-900 mb-2">Conseils</div>
            <ul className="text-sm text-neutral-700 list-disc list-inside">
              <li>Conservez votre fichier .p12 dans un lieu sûr.</li>
              <li>Renouvelez 30 jours avant expiration.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
