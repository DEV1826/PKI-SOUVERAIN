import { useEffect, useState } from 'react';
import { userService } from '../services/api';

interface RequestDocument {
  filename: string;
  requestId: string;
}

export default function UserRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8080/api';

  useEffect(() => {
    userService.getMyRequests()
      .then(setRequests)
      .catch(() => setError('Erreur lors du chargement des demandes.'))
      .finally(() => setLoading(false));
  }, []);

  // Visualiser un document (ouvrir dans nouvel onglet)
  const previewDocument = (doc: RequestDocument) => {
    const url = `${apiBaseUrl}/user/certificate-requests/${doc.requestId}/documents/${encodeURIComponent(doc.filename)}?preview=true`;
    window.open(url, '_blank');
  };

  // Télécharger un document
  const downloadDocument = (doc: RequestDocument) => {
    const url = `${apiBaseUrl}/user/certificate-requests/${doc.requestId}/documents/${encodeURIComponent(doc.filename)}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h2 className="text-h3 font-semibold mb-4">Suivi de mes demandes</h2>
      {loading ? (
        <div className="text-neutral-500">Chargement...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : requests.length === 0 ? (
        <div className="text-neutral-500">Aucune demande trouvée.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow p-4 border border-neutral-100">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-primary-900">{r.commonName}</div>
                  <div className="text-sm text-neutral-600">{r.organization}</div>
                  <div className="text-xs text-neutral-400">Soumis le: {r.submittedAt?.slice(0,10)}</div>
                </div>
                <div className="text-sm font-medium text-neutral-700">{r.status}</div>
              </div>
              {r.documents && r.documents.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-semibold mb-2">Pièces jointes</div>
                  <ul className="space-y-2">
                    {r.documents.map((d:string) => (
                      <li key={d} className="flex items-center justify-between bg-neutral-50 p-2 rounded">
                        <div className="text-sm text-neutral-700 truncate flex-1">{d}</div>
                        <div className="flex gap-2 ml-2">
                          <button 
                            onClick={() => previewDocument({ filename: d, requestId: r.id })}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                          >
                            Visualiser
                          </button>
                          <button 
                            onClick={() => downloadDocument({ filename: d, requestId: r.id })}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                          >
                            Télécharger
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}