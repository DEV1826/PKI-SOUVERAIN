import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { adminService } from '../services/api';

export default function AdminRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validityDays, setValidityDays] = useState<number>(365);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPemModal, setShowPemModal] = useState(false);
  const [pemText, setPemText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { addToast } = useToast();

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminService.getCertificateRequest(id);
      setRequest(data);
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleDownload = (filename: string) => {
    if (!id) return;
    const url = adminService.downloadRequestDocument(id, filename);
    window.open(url, '_blank');
  };

  const hasCsr = !!request?.csrContent && String(request.csrContent).trim().length > 0;
  const isIdentityReviewStep =
    request?.status === 'PENDING_REVIEW' ||
    request?.status === 'NEEDS_CORRECTION' ||
    request?.status === 'REVIEW_APPROVED';
  const isCsrSigningStep = request?.status === 'CSR_SUBMITTED' || hasCsr;
  const approveActionLabel = isCsrSigningStep ? 'Approuver & Signer' : "Valider l'identite";
  const approveSuccessMessage = isCsrSigningStep
    ? 'CSR approuvee et signee.'
    : "Identite validee. L'utilisateur peut maintenant soumettre le CSR.";
  const approveModalTitle = isCsrSigningStep ? "Confirmer l'approbation" : "Confirmer la validation d'identite";

  const confirmApprove = async () => {
    if (!id) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const resp = isCsrSigningStep
        ? await adminService.approveRequest(id, validityDays)
        : await adminService.reviewApproveRequest(id);
      setPemText(resp?.certificate || null);
      setShowApproveModal(false);
      if (resp?.certificate) setShowPemModal(true);
      addToast({ type: 'success', message: approveSuccessMessage });
      await load();
    } catch (e: any) {
      setErrorMsg(e?.message || "Impossible d'approuver");
      addToast({ type: 'error', message: e?.message || "Impossible d'approuver" });
    } finally {
      setBusy(false);
    }
  };

  const confirmReject = async () => {
    if (!id) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await adminService.rejectRequest(id, rejectReason);
      setShowRejectModal(false);
      addToast({ type: 'success', message: 'Demande rejetee.' });
      navigate('/admin/requests');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Impossible de rejeter');
      addToast({ type: 'error', message: e?.message || 'Impossible de rejeter' });
    } finally {
      setBusy(false);
    }
  };

  const copyPemToClipboard = async () => {
    if (!pemText) return;
    await navigator.clipboard.writeText(pemText);
  };

  const downloadPem = (filename = `certificate-${request?.id || 'cert'}.pem`) => {
    if (!pemText) return;
    const blob = new Blob([pemText], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="dark:text-neutral-300">Chargement...</div>;
  if (error) return <div className="text-red-600 dark:text-red-300">{error}</div>;
  if (!request) return <div className="dark:text-neutral-300">Aucune demande trouvee</div>;

  const field = (...keys: string[]) => {
    for (const key of keys) {
      const value = request?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
    }
    return '-';
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="break-all text-h4 font-bold dark:text-neutral-100">Demande {request.id}</h1>
        <button className="rounded bg-neutral-100 px-3 py-2 dark:bg-neutral-800 dark:text-neutral-200" onClick={() => navigate('/admin/requests')}>
          Retour
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 font-semibold dark:text-neutral-100">Informations utilisateur</h2>
          <div className="dark:text-neutral-300"><strong>Utilisateur:</strong> {request.userFullName || request.userEmail || request.userId}</div>
          <div className="dark:text-neutral-300"><strong>Email:</strong> {request.userEmail}</div>
          <div className="dark:text-neutral-300"><strong>Prenom:</strong> {field('firstName', 'first_name')}</div>
          <div className="dark:text-neutral-300"><strong>Nom:</strong> {field('lastName', 'last_name')}</div>
          <div className="dark:text-neutral-300"><strong>Date de naissance:</strong> {field('birthDate', 'birth_date')}</div>
          <div className="dark:text-neutral-300"><strong>Lieu de naissance:</strong> {field('birthPlace', 'birth_place')}</div>
          <div className="dark:text-neutral-300"><strong>Nationalite:</strong> {field('nationality')}</div>
          <div className="dark:text-neutral-300"><strong>Type de piece:</strong> {field('identityDocumentType', 'identity_document_type')}</div>
          <div className="dark:text-neutral-300"><strong>Numero de piece:</strong> {field('identityDocumentNumber', 'identity_document_number')}</div>
          <div className="dark:text-neutral-300"><strong>Expiration piece:</strong> {field('identityDocumentExpiry', 'identity_document_expiry')}</div>
          <div className="dark:text-neutral-300"><strong>Soumis:</strong> {request.submittedAt}</div>
          <div className="dark:text-neutral-300"><strong>Statut:</strong> {request.status}</div>
        </div>

        <div className="rounded border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 font-semibold dark:text-neutral-100">Sujet / CSR</h2>
          {hasCsr ? (
            <>
              <div className="dark:text-neutral-300"><strong>CN:</strong> {request.commonName || '-'}</div>
              <div className="dark:text-neutral-300"><strong>O:</strong> {request.organization || '-'}</div>
              <div className="dark:text-neutral-300"><strong>OU:</strong> {request.organizationalUnit || '-'}</div>
              <div className="dark:text-neutral-300"><strong>L (Ville):</strong> {request.locality || '-'}</div>
              <div className="dark:text-neutral-300"><strong>ST (Region):</strong> {request.state || '-'}</div>
              <div className="dark:text-neutral-300"><strong>C (Pays):</strong> {request.country || '-'}</div>
              <div className="dark:text-neutral-300"><strong>Email CSR:</strong> {request.email || '-'}</div>
              <div className="mt-3 dark:text-neutral-300"><strong>CSR:</strong></div>
              <pre className="mt-2 max-h-64 overflow-auto rounded bg-neutral-50 p-2 text-xs dark:bg-neutral-800 dark:text-neutral-300">{request.csrContent}</pre>
            </>
          ) : (
            <div className="rounded bg-neutral-50 p-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              Aucun CSR soumis pour le moment. Cette demande est encore au stade de verification d'identite.
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 rounded border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-2 font-semibold dark:text-neutral-100">Pieces jointes</h2>
        {request.documents && request.documents.length > 0 ? (
          <ul className="list-disc pl-5">
            {request.documents.map((d: string) => (
              <li key={d} className="flex items-center gap-3">
                <span className="truncate dark:text-neutral-300">{d}</span>
                <button
                  className="ml-2 rounded bg-primary-100 px-2 py-1 text-sm text-primary-800 dark:bg-primary-950/40 dark:text-primary-300"
                  onClick={() => handleDownload(d)}
                >
                  Telecharger
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="dark:text-neutral-300">Aucune piece jointe</div>
        )}
      </div>

      <div className="mb-6 rounded border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-2 font-semibold dark:text-neutral-100">Actions administrateur</h2>
        {isIdentityReviewStep || isCsrSigningStep ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="w-full lg:w-auto">
              <label className="block text-sm dark:text-neutral-300">Validite (jours)</label>
              <input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="w-40 rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                disabled={!isCsrSigningStep}
              />
            </div>
            <button className="rounded bg-green-600 px-4 py-2 text-white" onClick={() => setShowApproveModal(true)}>
              {approveActionLabel}
            </button>
            <div className="w-full lg:ml-2">
              <label className="block text-sm dark:text-neutral-300">Raison du rejet</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="h-20 w-full rounded border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 lg:max-w-xl"
              />
              <div className="mt-2">
                <button className="rounded bg-red-600 px-4 py-2 text-white" onClick={() => setShowRejectModal(true)}>
                  Rejeter
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-600 dark:text-neutral-300">Aucune action disponible pour le statut actuel.</div>
        )}
      </div>

      <Modal
        open={showApproveModal}
        title={approveModalTitle}
        onClose={() => setShowApproveModal(false)}
        footer={
          <>
            <Button onClick={() => setShowApproveModal(false)} variant="secondary">
              Annuler
            </Button>
            <Button onClick={confirmApprove} disabled={busy} className="ml-2">
              {busy ? 'Traitement...' : isCsrSigningStep ? 'Confirmer et signer' : 'Confirmer la validation'}
            </Button>
          </>
        }
      >
        <div>
          {isCsrSigningStep ? (
            <>Etes-vous sur de vouloir approuver et signer la CSR pour la demande <strong>{request.id}</strong> ?</>
          ) : (
            <>Etes-vous sur de vouloir valider l'identite pour la demande <strong>{request.id}</strong> ?</>
          )}
        </div>
        {errorMsg && <div className="mt-2 text-red-600 dark:text-red-300">{errorMsg}</div>}
      </Modal>

      <Modal
        open={showRejectModal}
        title="Confirmer le rejet"
        onClose={() => setShowRejectModal(false)}
        footer={
          <>
            <Button onClick={() => setShowRejectModal(false)} variant="secondary">
              Annuler
            </Button>
            <Button onClick={confirmReject} disabled={busy} className="ml-2">
              {busy ? 'Traitement...' : 'Rejeter'}
            </Button>
          </>
        }
      >
        <div className="mb-2">Veuillez confirmer le rejet de la demande <strong>{request.id}</strong>.</div>
        <label className="block text-sm dark:text-neutral-300">Raison du rejet</label>
        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="h-24 w-full rounded border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100" />
        {errorMsg && <div className="mt-2 text-red-600 dark:text-red-300">{errorMsg}</div>}
      </Modal>

      <Modal
        open={showPemModal}
        title="Certificat (PEM)"
        onClose={() => setShowPemModal(false)}
        footer={
          <>
            <Button onClick={copyPemToClipboard} variant="secondary">
              Copier
            </Button>
            <Button onClick={() => downloadPem()} className="ml-2">
              Telecharger
            </Button>
            <Button onClick={() => setShowPemModal(false)} className="ml-2">
              Fermer
            </Button>
          </>
        }
      >
        <pre className="max-h-96 overflow-auto rounded bg-neutral-50 p-2 text-xs dark:bg-neutral-800 dark:text-neutral-300">{pemText}</pre>
      </Modal>
    </div>
  );
}
