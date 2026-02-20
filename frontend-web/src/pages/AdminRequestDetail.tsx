import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../services/api';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { useToast } from '../components/Toast';

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

  useEffect(() => { load(); }, [id]);

  const handleDownload = (filename: string) => {
    if (!id) return;
    const url = adminService.downloadRequestDocument(id, filename);
    window.open(url, '_blank');
  };

  const handleApprove = () => {
    setShowApproveModal(true);
  };

  const { addToast } = useToast();

  const confirmApprove = async () => {
    if (!id) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const resp = await adminService.approveRequest(id, validityDays);
      setPemText(resp?.certificate || null);
      setShowApproveModal(false);
      if (resp?.certificate) setShowPemModal(true);
      addToast({ type: 'success', message: 'Demande approuvée.' });
    } catch (e: any) {
      setErrorMsg(e?.message || 'Impossible d\'approuver');
      addToast({ type: 'error', message: e?.message || 'Impossible d\'approuver' });
    } finally {
      setBusy(false);
    }
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!id) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await adminService.rejectRequest(id, rejectReason);
      setShowRejectModal(false);
      addToast({ type: 'success', message: 'Demande rejetée.' });
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

  if (loading) return <div>Chargement...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!request) return <div>Aucune demande trouvée</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-h4 font-bold">Demande {request.id}</h1>
        <button className="px-3 py-2 bg-neutral-100 rounded" onClick={() => navigate('/admin/requests')}>Retour</button>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 border rounded">
          <h2 className="font-semibold mb-2">Informations utilisateur</h2>
          <div><strong>Utilisateur:</strong> {request.userFullName || request.userEmail || request.userId}</div>
          <div><strong>Email:</strong> {request.userEmail}</div>
          <div><strong>Soumis:</strong> {request.submittedAt}</div>
          <div><strong>Statut:</strong> {request.status}</div>
        </div>
        <div className="bg-white p-4 border rounded">
          <h2 className="font-semibold mb-2">Sujet / CSR</h2>
          <div><strong>CN:</strong> {request.commonName}</div>
          <div><strong>O:</strong> {request.organization}</div>
          <div className="mt-3"><strong>CSR:</strong></div>
          <pre className="mt-2 p-2 bg-neutral-50 rounded text-xs overflow-auto">{request.csrContent || 'Aucun CSR'}</pre>
        </div>
      </div>

      <div className="bg-white p-4 border rounded mb-6">
        <h2 className="font-semibold mb-2">Pièces jointes</h2>
        {request.documents && request.documents.length > 0 ? (
          <ul className="list-disc pl-5">
            {request.documents.map((d: string) => (
              <li key={d} className="flex items-center gap-3">
                <span className="truncate">{d}</span>
                <button className="ml-2 text-sm px-2 py-1 bg-primary-100 text-primary-800 rounded" onClick={() => handleDownload(d)}>Télécharger</button>
              </li>
            ))}
          </ul>
        ) : (
          <div>Aucune pièce jointe</div>
        )}
      </div>

      <div className="bg-white p-4 border rounded mb-6">
        <h2 className="font-semibold mb-2">Actions administrateur</h2>
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-sm">Validité (jours)</label>
            <input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} className="px-3 py-2 border rounded w-40" />
          </div>
          <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleApprove}>Approuver & Signer</button>
          <div className="ml-6">
            <label className="block text-sm">Raison du rejet</label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-80 h-20 p-2 border rounded" />
            <div className="mt-2">
              <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={handleReject}>Rejeter</button>
            </div>
          </div>
        </div>
      </div>

      <Modal open={showApproveModal} title="Confirmer l'approbation" onClose={() => setShowApproveModal(false)}
        footer={
          <>
            <Button onClick={() => setShowApproveModal(false)} variant="secondary">Annuler</Button>
            <Button onClick={confirmApprove} disabled={busy} className="ml-2">{busy ? 'Traitement...' : 'Confirmer et signer'}</Button>
          </>
        }
      >
        <div>Êtes-vous sûr de vouloir approuver et signer la CSR pour la demande <strong>{request.id}</strong> ?</div>
        {errorMsg && <div className="text-red-600 mt-2">{errorMsg}</div>}
      </Modal>

      <Modal open={showRejectModal} title="Confirmer le rejet" onClose={() => setShowRejectModal(false)}
        footer={
          <>
            <Button onClick={() => setShowRejectModal(false)} variant="secondary">Annuler</Button>
            <Button onClick={confirmReject} disabled={busy} className="ml-2">{busy ? 'Traitement...' : 'Rejeter'}</Button>
          </>
        }
      >
        <div className="mb-2">Veuillez confirmer le rejet de la demande <strong>{request.id}</strong>.</div>
        <label className="block text-sm">Raison du rejet</label>
        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full h-24 p-2 border rounded" />
        {errorMsg && <div className="text-red-600 mt-2">{errorMsg}</div>}
      </Modal>

      <Modal open={showPemModal} title="Certificat (PEM)" onClose={() => setShowPemModal(false)}
        footer={
          <>
            <Button onClick={copyPemToClipboard} variant="secondary">Copier</Button>
            <Button onClick={() => downloadPem()} className="ml-2">Télécharger</Button>
            <Button onClick={() => setShowPemModal(false)} className="ml-2">Fermer</Button>
          </>
        }
      >
        <pre className="max-h-96 overflow-auto p-2 bg-neutral-50 rounded text-xs">{pemText}</pre>
      </Modal>
    </div>
  );
}
