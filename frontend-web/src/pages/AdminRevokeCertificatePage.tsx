import { useState } from 'react';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { adminService } from '../services/api';

export default function AdminRevokeCertificatePage() {
  const { addToast } = useToast();
  const [certId, setCertId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const handleRevoke = async () => {
    if (!certId.trim()) {
      addToast({ type: 'error', message: 'Veuillez saisir un ID de certificat.' });
      return;
    }
    setBusy(true);
    try {
      await adminService.revokeCertificate(certId.trim(), reason.trim() || undefined);
      addToast({ type: 'success', message: 'Certificat revoque.' });
      setReason('');
    } catch (e: any) {
      addToast({ type: 'error', message: e?.message || 'Impossible de revoquer le certificat' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-h3 font-semibold text-[var(--text-strong)] dark:text-neutral-100">Revoquer un certificat</h1>
            <p className="text-body text-[var(--text-muted)] dark:text-neutral-400">
              Retirez un certificat et publiez sa revocation dans la CRL.
            </p>
          </div>
          <Button variant="danger" onClick={handleRevoke} disabled={busy}>
            {busy ? 'Traitement...' : 'Revoquer'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] dark:text-neutral-400">ID du certificat</label>
            <input
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              placeholder="ex: 3af5a84e-55a9-4d55-8bb9-f781aa275619"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] dark:text-neutral-400">Raison (optionnel)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              placeholder="ex: cle compromisee"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
