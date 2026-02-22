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
    userService
      .getMyRequests()
      .then(setRequests)
      .catch(() => setError('Erreur lors du chargement des demandes.'))
      .finally(() => setLoading(false));
  }, []);

  const previewDocument = (doc: RequestDocument) => {
    const url = `${apiBaseUrl}/user/certificate-requests/${doc.requestId}/documents/${encodeURIComponent(doc.filename)}?preview=true`;
    window.open(url, '_blank');
  };

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
    <div className="mx-auto max-w-4xl py-8">
      <h2 className="mb-4 text-h3 font-semibold dark:text-neutral-100">Suivi de mes demandes</h2>
      {loading ? (
        <div className="text-neutral-500 dark:text-neutral-400">Chargement...</div>
      ) : error ? (
        <div className="text-red-600 dark:text-red-300">{error}</div>
      ) : requests.length === 0 ? (
        <div className="text-neutral-500 dark:text-neutral-400">Aucune demande trouvee.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-neutral-100 bg-white p-4 shadow dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-primary-900 dark:text-primary-300">{r.commonName}</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">{r.organization}</div>
                  <div className="text-xs text-neutral-400 dark:text-neutral-500">Soumis le: {r.submittedAt?.slice(0, 10)}</div>
                </div>
                <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{r.status}</div>
              </div>
              {r.documents && r.documents.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 text-sm font-semibold dark:text-neutral-100">Pieces jointes</div>
                  <ul className="space-y-2">
                    {r.documents.map((d: string) => (
                      <li key={d} className="flex items-center justify-between rounded bg-neutral-50 p-2 dark:bg-neutral-800">
                        <div className="flex-1 truncate text-sm text-neutral-700 dark:text-neutral-300">{d}</div>
                        <div className="ml-2 flex gap-2">
                          <button
                            onClick={() => previewDocument({ filename: d, requestId: r.id })}
                            className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 transition hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
                          >
                            Visualiser
                          </button>
                          <button
                            onClick={() => downloadDocument({ filename: d, requestId: r.id })}
                            className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 transition hover:bg-green-200 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/50"
                          >
                            Telecharger
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
