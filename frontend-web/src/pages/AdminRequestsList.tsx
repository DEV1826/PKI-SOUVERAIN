import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { adminService } from '../services/api';

export default function AdminRequestsList() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getCertificateRequests(statusFilter === 'ALL' ? undefined : statusFilter, page - 1, pageSize);
      setRequests(res.items);
      setTotal(res.total);
      const totalPages = Math.max(1, Math.ceil(res.total / res.size));
      if (page > totalPages) setPage(totalPages);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load();
  }, [statusFilter, pageSize]);

  useEffect(() => {
    load();
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h4 font-bold dark:text-neutral-100">Demandes de certificats</h1>
        <div className="flex items-center gap-3">
          <label className="text-body-small dark:text-neutral-300">Filtrer :</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          >
            <option value="ALL">Toutes</option>
            <option value="PENDING">PENDING</option>
            <option value="ISSUED">ISSUED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="dark:text-neutral-300">Chargement...</div>
      ) : error ? (
        <div className="text-red-600 dark:text-red-300">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-neutral-50 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">CN</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Soumis</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {requests.map((r) => (
                <tr key={r.id} className="transition-colors odd:bg-white even:bg-neutral-50/60 hover:bg-neutral-100/80 dark:odd:bg-neutral-900 dark:even:bg-neutral-900/70 dark:hover:bg-neutral-800/60">
                  <td className="px-4 py-3 font-mono text-xs dark:text-neutral-200">{r.id}</td>
                  <td className="px-4 py-3 dark:text-neutral-200">{r.userEmail || r.userId}</td>
                  <td className="px-4 py-3 dark:text-neutral-200">{r.commonName}</td>
                  <td className="px-4 py-3 dark:text-neutral-200">{r.status}</td>
                  <td className="px-4 py-3 dark:text-neutral-300">{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3">
                    <Button onClick={() => navigate(`/admin/requests/${r.id}`)}>Voir</Button>
                  </td>
                </tr>
              ))}

              {requests.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center dark:text-neutral-300" colSpan={6}>
                    Aucune demande trouvee
                  </td>
                </tr>
              )}

              <tr className="border-t border-neutral-200 dark:border-neutral-800">
                <td colSpan={6} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label className="dark:text-neutral-300">Affichage</label>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                      </select>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">{`${total} resultat(s)`}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        Prec
                      </Button>
                      <div className="text-sm dark:text-neutral-300">
                        {currentPage} / {totalPages}
                      </div>
                      <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                        Suiv
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
