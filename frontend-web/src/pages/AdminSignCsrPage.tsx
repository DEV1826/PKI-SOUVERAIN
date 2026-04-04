import { Link } from 'react-router-dom';
import Button from '../components/Button';

export default function AdminSignCsrPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 py-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-h3 font-semibold text-[var(--text-strong)] dark:text-neutral-100">Signature CSR</h1>
            <p className="text-body text-[var(--text-muted)] dark:text-neutral-400">
              Accedez aux demandes en attente pour approuver et signer les CSR.
            </p>
          </div>
          <Link to="/admin/requests">
            <Button>Voir les demandes</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-[var(--text-muted)] shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        Les actions de signature se font depuis la liste des demandes admin.
      </div>
    </div>
  );
}
