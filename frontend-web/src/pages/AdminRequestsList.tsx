import { useEffect, useState } from 'react';
import { adminService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

export default function AdminRequestsList() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const navigate = useNavigate();

  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getCertificateRequests(statusFilter === 'ALL' ? undefined : statusFilter, page - 1, pageSize);
      setRequests(res.items);
      setTotal(res.total);
      // ensure page bounds
      const totalPages = Math.max(1, Math.ceil(res.total / res.size));
      if (page > totalPages) setPage(totalPages);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); load(); }, [statusFilter, pageSize]);
  useEffect(() => { load(); }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h4 font-bold">Demandes de certificats</h1>
        <div className="flex items-center gap-3">
          <label className="text-body-small">Filtrer :</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded">
            <option value="ALL">Toutes</option>
            <option value="PENDING">PENDING</option>
            <option value="ISSUED">ISSUED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div>Chargement...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="bg-white rounded border border-neutral-200 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 text-sm text-neutral-600">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">CN</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Soumis</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
              const totalPages = Math.max(1, Math.ceil(total / pageSize));
              const p = Math.min(Math.max(1, page), totalPages);
              return (
                <>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                      <td className="px-4 py-3">{r.userEmail || r.userId}</td>
                      <td className="px-4 py-3">{r.commonName}</td>
                      <td className="px-4 py-3">{r.status}</td>
                      <td className="px-4 py-3">{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">
                        <Button onClick={() => navigate(`/admin/requests/${r.id}`)}>Voir</Button>
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center" colSpan={6}>Aucune demande trouvée</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label>Affichage</label>
                          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="px-2 py-1 border rounded">
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                          </select>
                          <div className="text-sm text-neutral-600">{`${total} résultat(s)`}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={p === 1}>Préc</Button>
                          <div className="text-sm">{p} / {totalPages}</div>
                          <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={p === totalPages}>Suiv</Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </>
              );
            })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
