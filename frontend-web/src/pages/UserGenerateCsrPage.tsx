import { useCallback, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function UserGenerateCsrPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commonName, setCommonName] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [organizationalUnit, setOrganizationalUnit] = useState<string>('');
  const [locality, setLocality] = useState<string>('');
  const [stateRegion, setStateRegion] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [emailAddr, setEmailAddr] = useState<string>('');
  const [csrText, setCsrText] = useState<string>('');
  const [csrFile, setCsrFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csrFileRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    setError(null);
    setCommonName(user?.firstName + ' ' + user?.lastName || '');
    setOrganization('');
    setEmailAddr(user?.email || '');
    setCountry('CM');
  }, [user]);

  const onFiles = useCallback((selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected);
    // Filter types
    const allowed = arr.filter(f => /pdf|png|jpe?g/.test(f.type) || f.name.endsWith('.pdf'));
    setFiles(prev => [...prev, ...allowed].slice(0, 5));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onFiles(e.dataTransfer.files);
  }, [onFiles]);

  const onBrowse = () => fileInputRef.current?.click();

  const onSelectCsrFile = (f: File | null) => {
    if (!f) { setCsrFile(null); return; }
    // Accept small text/pem files
    if (f.size > 200 * 1024) { setError('Fichier CSR trop volumineux (>200KB)'); return; }
    if (!(/\.pem$|\.csr$|text\/|application\/x-pem-file/.test(f.name) || /text\//.test(f.type))) { setError('Type de fichier CSR non pris en charge'); return; }
    setCsrFile(f);
    setError(null);
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const removeCsrFile = () => setCsrFile(null);

  const onSubmit = async () => {
    setError(null);
    // Validate required fields taken from form per UX (CN, O, L, C, Email)
    if (!commonName.trim()) { setError('Le Common Name (CN) est requis'); return; }
    if (!organization.trim()) { setError("L'organisation (O) est requise"); return; }
    if (!locality.trim()) { setError('La ville (L) est requise'); return; }
    if (!country.trim() || !/^[A-Za-z]{2}$/.test(country.trim())) { setError('Le pays (C) doit être un code ISO 2 lettres'); return; }
    if (!emailAddr.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailAddr.trim())) { setError('Un email valide est requis'); return; }
    // Validation CSR obligatoire (texte ou fichier)
    if (!csrText.trim() && !csrFile) {
      setError('Un CSR (texte ou fichier) est requis pour soumettre la demande.');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('commonName', commonName);
      form.append('organization', organization || '');
      form.append('organizationalUnit', organizationalUnit || '');
      form.append('locality', locality || '');
      form.append('state', stateRegion || '');
      form.append('country', country || '');
      form.append('email', emailAddr || '');
      if (csrText.trim()) form.append('csr', csrText.trim());
      else if (csrFile) form.append('csrFile', csrFile);
      files.forEach(f => form.append('documents', f));
      await userService.submitCertificateRequest(form);
      navigate('/requests');
    } catch (err:any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-2xl shadow p-6 border border-neutral-100 mb-6">
        <h2 className="text-h3 font-semibold mb-2">Pièces justificatives</h2>
        <div className="text-sm text-neutral-600 mb-4">Joignez les documents nécessaires à la validation de votre identité (pièce d'identité, justificatif de fonction, etc.)</div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 ${dragOver ? 'border-dashed border-primary-600 bg-primary-50' : 'border-dashed border-neutral-300'} rounded-lg p-12 text-center`}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" className="mx-auto mb-3 text-neutral-400"><path d="M12 3v12" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 7l4-4 4 4" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div className="font-semibold">Glissez-déposez vos fichiers ici</div>
          <div className="text-sm text-neutral-500 mb-3">ou <button className="text-primary-700 underline" onClick={onBrowse}>cliquez pour sélectionner</button></div>
          <button onClick={onBrowse} className="mt-2 inline-block px-4 py-2 border-2 border-primary-700 text-primary-700 rounded-lg">Parcourir les fichiers</button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} accept=".pdf,image/*" />
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <ul className="space-y-2">
              {files.map((f, idx) => (
                <li key={idx} className="flex items-center justify-between bg-neutral-50 p-3 rounded">
                  <div className="text-sm">{f.name} <span className="text-xs text-neutral-400">({Math.round(f.size/1024)} KB)</span></div>
                  <button className="text-sm text-red-600" onClick={() => removeFile(idx)}>Supprimer</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        </div>

      {/* Informations du certificat (formulaire complet) */}
      <div className="bg-white rounded-2xl shadow p-6 border border-neutral-100 mb-6">
        <h2 className="text-h3 font-semibold mb-3">Informations du certificat</h2>
        <div className="text-sm text-neutral-500 mb-4">Remplissez les informations de votre certificat numérique. Tous les champs marqués d'un astérisque sont obligatoires.</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Common Name (CN) *</span>
            <input className="px-3 py-2 border rounded" value={commonName} onChange={(e) => setCommonName(e.target.value)} placeholder="Jean Dupont" />
            <div className="text-xs text-neutral-400 mt-1">Votre nom complet tel qu'il apparaîtra sur le certificat</div>
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Organisation (O) *</span>
            <input className="px-3 py-2 border rounded" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Ministère de l'Intérieur" />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Unité Organisationnelle (OU)</span>
            <input className="px-3 py-2 border rounded" value={organizationalUnit} onChange={(e) => setOrganizationalUnit(e.target.value)} placeholder="Direction des Systèmes d'Information" />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Ville (L) *</span>
            <input className="px-3 py-2 border rounded" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="Paris" />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Région / État (ST)</span>
            <input className="px-3 py-2 border rounded" value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} placeholder="Île-de-France" />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Pays (C) *</span>
            <input className="px-3 py-2 border rounded" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="FR" />
            <div className="text-xs text-neutral-400 mt-1">Code pays ISO 3166-1 (2 lettres)</div>
          </label>

          <label className="flex flex-col md:col-span-2">
            <span className="text-xs text-neutral-500 mb-1">Email *</span>
            <input className="px-3 py-2 border rounded" value={emailAddr} onChange={(e) => setEmailAddr(e.target.value)} placeholder="jean.dupont@organisation.fr" />
          </label>
        </div>
      </div>

      {/* CSR Form */}
      <div className="bg-white rounded-2xl shadow p-6 border border-neutral-100 mb-8">
        <h2 className="text-h3 font-semibold mb-2">CSR (optionnel)</h2>
        <div className="text-sm text-neutral-500 mb-3">Collez une CSR au format PEM ou uploadez un fichier CSR. Si aucun CSR n'est fourni, l'administrateur traitera la demande manuellement.</div>
        <div className="mb-4">
          <textarea className="w-full h-36 p-3 border rounded" value={csrText} onChange={(e) => setCsrText(e.target.value)} placeholder="-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----"></textarea>
        </div>

        <div>
          <div className="text-xs text-neutral-500 mb-1">OU Uploader un fichier CSR</div>
          <div className="flex items-center gap-3">
            <input ref={csrFileRef} type="file" className="hidden" accept=".csr,.pem,text/*" onChange={(e) => onSelectCsrFile(e.target.files ? e.target.files[0] : null)} />
            <button className="px-4 py-2 border rounded" onClick={() => csrFileRef.current?.click()}>{csrFile ? 'Remplacer le fichier CSR' : 'Choisir un fichier CSR'}</button>
            {csrFile && <div className="text-sm text-neutral-700">{csrFile.name} <button className="text-red-600 ml-3" onClick={removeCsrFile}>Supprimer</button></div>}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button className="px-6 py-3 rounded-lg border-2 border-primary-700 text-primary-700" onClick={() => navigate('/dashboard')}>Annuler</button>
        <button className="px-6 py-3 rounded-lg bg-primary-800 text-white font-semibold" onClick={onSubmit} disabled={submitting}>{submitting ? 'Envoi...' : 'Soumettre la demande'}</button>
      </div>

      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
}
