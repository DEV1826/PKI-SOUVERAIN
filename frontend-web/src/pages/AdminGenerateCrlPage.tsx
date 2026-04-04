import { useState } from 'react';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { adminService } from '../services/api';

export default function AdminGenerateCrlPage() {
  const { addToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [crlPem, setCrlPem] = useState<string | null>(null);

  const handleGenerate = async () => {
    setBusy(true);
    setCrlPem(null);
    try {
      const data = await adminService.generateCrl();
      setCrlPem(data?.crlPem || null);
      addToast({ type: 'success', message: 'CRL generee avec succes.' });
    } catch (e: any) {
      addToast({ type: 'error', message: e?.message || 'Impossible de generer la CRL' });
    } finally {
      setBusy(false);
    }
  };

  const handleRotate = async () => {
    setBusy(true);
    setCrlPem(null);
    try {
      const data = await adminService.rotateCrl();
      setCrlPem(data?.crlPem || null);
      addToast({ type: 'success', message: 'CRL pivotee avec succes.' });
    } catch (e: any) {
      addToast({ type: 'error', message: e?.message || 'Impossible de pivoter la CRL' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-h3 font-semibold text-[var(--text-strong)] dark:text-neutral-100">CRL (liste de revocation)</h1>
            <p className="text-body text-[var(--text-muted)] dark:text-neutral-400">
              Generez ou pivotez la CRL pour publier les certificats revoques.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerate} disabled={busy}>
              {busy ? 'Traitement...' : 'Generer la CRL'}
            </Button>
            <Button variant="secondary" onClick={handleRotate} disabled={busy}>
              {busy ? 'Traitement...' : 'Rotation CRL'}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold text-[var(--text-strong)] dark:text-neutral-100">Apercu CRL</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)] dark:text-neutral-400">
          Le contenu PEM s'affiche ici apres generation.
        </p>
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {crlPem || 'Aucune CRL generee pour le moment.'}
        </pre>
      </div>
    </div>
  );
}
