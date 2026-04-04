import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { userService } from '../services/api';

export default function UserDownloadCrlPage() {
  const { addToast } = useToast();

  const handleDownload = async () => {
    try {
      const blob = await userService.downloadCrl();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'crl.pem';
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: 'CRL telechargee.' });
    } catch (e: any) {
      addToast({ type: 'error', message: e?.message || 'Impossible de telecharger la CRL' });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-h3 font-semibold text-[var(--text-strong)] dark:text-neutral-100">Telecharger la CRL</h1>
            <p className="text-body text-[var(--text-muted)] dark:text-neutral-400">
              Accedez a la CRL publiee pour verifier la validite des certificats.
            </p>
          </div>
          <Button onClick={handleDownload}>Telecharger la CRL</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-[var(--text-muted)] shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        Format: PEM (.pem). Utilisez la CRL pour vos verifications locales.
      </div>
    </div>
  );
}
