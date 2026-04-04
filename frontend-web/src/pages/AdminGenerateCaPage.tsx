import { useState } from 'react';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { adminService } from '../services/api';

export default function AdminGenerateCaPage() {
  const { addToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('PKI Intermediate CA');
  const [keySize, setKeySize] = useState(4096);
  const [validityDays, setValidityDays] = useState(3650);

  const handleGenerateRoot = async () => {
    setBusy(true);
    try {
      await adminService.initializeCA();
      addToast({ type: 'success', message: 'CA racine initialisee.' });
    } catch (e: any) {
      addToast({ type: 'error', message: e?.message || 'Impossible de generer la CA racine' });
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateIntermediate = async () => {
    setBusy(true);
    try {
      await adminService.generateIntermediateCa(name.trim() || 'PKI Intermediate CA', keySize, validityDays);
      addToast({ type: 'success', message: 'CA intermediaire generee.' });
    } catch (e: any) {
      addToast({ type: 'error', message: e?.message || 'Impossible de generer la CA intermediaire' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-h3 font-semibold text-[var(--text-strong)] dark:text-neutral-100">Generer une CA</h1>
            <p className="text-body text-[var(--text-muted)] dark:text-neutral-400">
              Creez une autorite racine ou intermediaire pour signer les certificats.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerateRoot} disabled={busy}>
              {busy ? 'Traitement...' : 'CA racine'}
            </Button>
            <Button variant="secondary" onClick={handleGenerateIntermediate} disabled={busy}>
              {busy ? 'Traitement...' : 'CA intermediaire'}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold text-[var(--text-strong)] dark:text-neutral-100">Parametres CA intermediaire</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] dark:text-neutral-400">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] dark:text-neutral-400">Taille de cle</label>
            <input
              type="number"
              value={keySize}
              onChange={(e) => setKeySize(Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] dark:text-neutral-400">Validite (jours)</label>
            <input
              type="number"
              value={validityDays}
              onChange={(e) => setValidityDays(Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
