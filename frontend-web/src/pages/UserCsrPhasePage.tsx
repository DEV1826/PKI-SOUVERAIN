import { useEffect, useMemo, useState } from 'react';
import Button from '../components/Button';
import { userService } from '../services/api';

type RequestItem = {
  id: string;
  status: string;
  commonName?: string;
  organization?: string;
  submittedAt?: string;
};

export default function UserCsrPhasePage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csrTextById, setCsrTextById] = useState<Record<string, string>>({});
  const [csrFileById, setCsrFileById] = useState<Record<string, File | null>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const [genFormById, setGenFormById] = useState<Record<string, { cn: string; o: string; ou: string; l: string; st: string; c: string; email: string }>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getMyRequests();
      setRequests(data || []);
      const initial: Record<string, { cn: string; o: string; ou: string; l: string; st: string; c: string; email: string }> = {};
      (data || []).forEach((r: any) => {
        initial[r.id] = {
          cn: r.commonName || '',
          o: r.organization || '',
          ou: r.organizationalUnit || '',
          l: r.locality || '',
          st: r.state || '',
          c: r.country || 'CM',
          email: r.email || '',
        };
      });
      setGenFormById(initial);
    } catch {
      setError('Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const phase3Requests = useMemo(
    () => requests.filter((r) => r.status === 'REVIEW_APPROVED'),
    [requests]
  );

  const submitCsr = async (requestId: string) => {
    const csrText = (csrTextById[requestId] || '').trim();
    const csrFile = csrFileById[requestId] || undefined;

    if (!csrText && !csrFile) {
      setError('Ajoute un CSR (texte ou fichier) avant envoi.');
      return;
    }

    setSubmittingId(requestId);
    setError(null);
    try {
      await userService.submitCsrAfterReview(requestId, csrText, csrFile);
      setCsrTextById((prev) => ({ ...prev, [requestId]: '' }));
      setCsrFileById((prev) => ({ ...prev, [requestId]: null }));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.response?.data?.message || "Echec d'envoi du CSR.");
    } finally {
      setSubmittingId(null);
    }
  };

  const generateAndSubmit = async (requestId: string) => {
    const payload = genFormById[requestId];
    if (!payload) return;

    if (!payload.cn?.trim() || !payload.o?.trim() || !payload.l?.trim() || !payload.c?.trim()) {
      setError('CN, O, L et C sont obligatoires pour generer un CSR.');
      return;
    }

    setSubmittingId(requestId);
    setError(null);
    try {
      await userService.generateCsrAfterReview(requestId, {
        cn: payload.cn,
        o: payload.o,
        ou: payload.ou,
        l: payload.l,
        st: payload.st,
        c: payload.c.toUpperCase(),
        email: payload.email,
      });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.response?.data?.message || 'Generation CSR impossible.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return <div className="py-8 text-sm text-neutral-500 dark:text-neutral-300">Chargement de la phase 3...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl py-4 md:py-8">
      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-6">
        <h1 className="text-xl font-bold dark:text-neutral-100 md:text-2xl">Phase 3 - Soumission CSR</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Cette page affiche uniquement les demandes approuvees a l'etape identite (statut <strong>REVIEW_APPROVED</strong>).
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {phase3Requests.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          Aucune demande en phase 3 pour le moment.
        </div>
      ) : (
        <div className="space-y-5">
          {phase3Requests.map((r) => {
            const payload = genFormById[r.id] || { cn: '', o: '', ou: '', l: '', st: '', c: 'CM', email: '' };
            return (
              <div key={r.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-6">
                <div className="mb-4">
                  <div className="text-sm font-semibold text-primary-700 dark:text-primary-300">Demande {r.id}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{r.commonName || '-'} - {r.organization || '-'}</div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="CN *" value={payload.cn} onChange={(v) => setGenFormById((prev) => ({ ...prev, [r.id]: { ...payload, cn: v } }))} />
                  <Field label="O *" value={payload.o} onChange={(v) => setGenFormById((prev) => ({ ...prev, [r.id]: { ...payload, o: v } }))} />
                  <Field label="OU" value={payload.ou} onChange={(v) => setGenFormById((prev) => ({ ...prev, [r.id]: { ...payload, ou: v } }))} />
                  <Field label="L *" value={payload.l} onChange={(v) => setGenFormById((prev) => ({ ...prev, [r.id]: { ...payload, l: v } }))} />
                  <Field label="ST" value={payload.st} onChange={(v) => setGenFormById((prev) => ({ ...prev, [r.id]: { ...payload, st: v } }))} />
                  <Field label="C *" value={payload.c} onChange={(v) => setGenFormById((prev) => ({ ...prev, [r.id]: { ...payload, c: v.toUpperCase() } }))} />
                  <div className="md:col-span-2">
                    <Field label="Email" value={payload.email} onChange={(v) => setGenFormById((prev) => ({ ...prev, [r.id]: { ...payload, email: v } }))} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => generateAndSubmit(r.id)} disabled={submittingId === r.id}>
                    {submittingId === r.id ? 'Generation...' : 'Generer et envoyer le CSR'}
                  </Button>
                </div>

                <div className="my-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Ou coller/importer un CSR existant</p>
                  <textarea
                    className="h-28 w-full rounded-lg border border-neutral-200 bg-white p-3 text-xs dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                    value={csrTextById[r.id] || ''}
                    onChange={(e) => setCsrTextById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder={'-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----'}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      accept=".csr,.pem,text/*"
                      onChange={(e) => setCsrFileById((prev) => ({ ...prev, [r.id]: e.target.files?.[0] || null }))}
                      className="w-full text-sm md:w-auto"
                    />
                    <Button onClick={() => submitCsr(r.id)} disabled={submittingId === r.id}>
                      {submittingId === r.id ? 'Envoi...' : 'Envoyer le CSR'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
      />
    </label>
  );
}
