import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/api';

interface RequestDocument {
  filename: string;
  requestId: string;
}

export default function UserRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csrTextById, setCsrTextById] = useState<Record<string, string>>({});
  const [csrFileById, setCsrFileById] = useState<Record<string, File | null>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8080/api';

  useEffect(() => {
    userService
      .getMyRequests()
      .then(setRequests)
      .catch(() => setError('Erreur lors du chargement des demandes.'))
      .finally(() => setLoading(false));
  }, []);

  const reload = async () => {
    try {
      const data = await userService.getMyRequests();
      setRequests(data);
    } catch {
      setError('Erreur lors du chargement des demandes.');
    }
  };

  const submitCsr = async (requestId: string) => {
    const csrText = csrTextById[requestId];
    const csrFile = csrFileById[requestId] || undefined;
    if (!csrText?.trim() && !csrFile) {
      setError('Veuillez fournir un CSR (texte ou fichier).');
      return;
    }
    setSubmittingId(requestId);
    try {
      await userService.submitCsrAfterReview(requestId, csrText, csrFile || undefined);
      setCsrTextById((prev) => ({ ...prev, [requestId]: '' }));
      setCsrFileById((prev) => ({ ...prev, [requestId]: null }));
      await reload();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Erreur lors de l'envoi du CSR.");
    } finally {
      setSubmittingId(null);
    }
  };

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

              {r.status === 'REVIEW_APPROVED' && (
                <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/40 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
                  <div className="text-sm font-semibold text-primary-800 dark:text-primary-300">Soumettre le CSR</div>
                  <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                    L admin a valide votre identite. Vous pouvez maintenant envoyer votre CSR.
                  </div>
                  <div className="mt-3">
                    <Link to="/phase-3-csr" className="text-xs font-semibold text-primary-700 underline dark:text-primary-300">
                      Ouvrir la page Phase 3
                    </Link>
                  </div>
                  <textarea
                    className="mt-3 h-28 w-full rounded-lg border border-neutral-200 bg-white p-3 text-xs shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    value={csrTextById[r.id] || ''}
                    onChange={(e) => setCsrTextById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder={'-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----'}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      accept=".csr,.pem,text/*"
                      onChange={(e) => setCsrFileById((prev) => ({ ...prev, [r.id]: e.target.files?.[0] || null }))}
                    />
                    <button
                      className="rounded bg-primary-700 px-3 py-2 text-xs font-semibold text-white"
                      onClick={() => submitCsr(r.id)}
                      disabled={submittingId === r.id}
                    >
                      {submittingId === r.id ? 'Envoi...' : 'Envoyer le CSR'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
