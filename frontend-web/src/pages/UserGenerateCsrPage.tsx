import { useCallback, useEffect, useRef, useState } from 'react';
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
    const allowed = arr.filter((f) => /pdf|png|jpe?g/.test(f.type) || f.name.endsWith('.pdf'));
    setFiles((prev) => [...prev, ...allowed].slice(0, 5));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      onFiles(e.dataTransfer.files);
    },
    [onFiles]
  );

  const onBrowse = () => fileInputRef.current?.click();

  const onSelectCsrFile = (f: File | null) => {
    if (!f) {
      setCsrFile(null);
      return;
    }
    if (f.size > 200 * 1024) {
      setError('Fichier CSR trop volumineux (>200KB)');
      return;
    }
    if (!(/\.pem$|\.csr$|text\/|application\/x-pem-file/.test(f.name) || /text\//.test(f.type))) {
      setError('Type de fichier CSR non pris en charge');
      return;
    }
    setCsrFile(f);
    setError(null);
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));
  const removeCsrFile = () => setCsrFile(null);

  const onSubmit = async () => {
    setError(null);
    if (!commonName.trim()) return setError('Le Common Name (CN) est requis');
    if (!organization.trim()) return setError("L'organisation (O) est requise");
    if (!locality.trim()) return setError('La ville (L) est requise');
    if (!country.trim() || !/^[A-Za-z]{2}$/.test(country.trim())) return setError('Le pays (C) doit etre un code ISO 2 lettres');
    if (!emailAddr.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailAddr.trim())) return setError('Un email valide est requis');
    if (!csrText.trim() && !csrFile) return setError('Un CSR (texte ou fichier) est requis pour soumettre la demande.');

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
      files.forEach((f) => form.append('documents', f));
      await userService.submitCertificateRequest(form);
      navigate('/requests');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-2 text-h3 font-semibold dark:text-neutral-100">Pieces justificatives</h2>
        <div className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          Joignez les documents necessaires a la validation de votre identite (piece d'identite, justificatif de fonction, etc.)
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-lg border-2 p-12 text-center ${
            dragOver
              ? 'border-dashed border-primary-600 bg-primary-50 dark:bg-primary-950/30'
              : 'border-dashed border-neutral-300 dark:border-neutral-700'
          }`}
        >
          <div className="font-semibold dark:text-neutral-100">Glissez-deposez vos fichiers ici</div>
          <div className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
            ou{' '}
            <button className="text-primary-700 underline dark:text-primary-300" onClick={onBrowse}>
              cliquez pour selectionner
            </button>
          </div>
          <button onClick={onBrowse} className="mt-2 inline-block rounded-lg border-2 border-primary-700 px-4 py-2 text-primary-700 dark:border-primary-300 dark:text-primary-300">
            Parcourir les fichiers
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} accept=".pdf,image/*" />
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <ul className="space-y-2">
              {files.map((f, idx) => (
                <li key={idx} className="flex items-center justify-between rounded bg-neutral-50 p-3 dark:bg-neutral-800">
                  <div className="text-sm dark:text-neutral-200">
                    {f.name} <span className="text-xs text-neutral-400 dark:text-neutral-500">({Math.round(f.size / 1024)} KB)</span>
                  </div>
                  <button className="text-sm text-red-600" onClick={() => removeFile(idx)}>
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-h3 font-semibold dark:text-neutral-100">Informations du certificat</h2>
        <div className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Remplissez les informations de votre certificat numerique. Tous les champs marques d'un asterisque sont obligatoires.
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Common Name (CN) *" value={commonName} onChange={setCommonName} placeholder="Jean Dupont" help="Votre nom complet tel qu'il apparaitra sur le certificat" />
          <Field label="Organisation (O) *" value={organization} onChange={setOrganization} placeholder="Ministere de l'Interieur" />
          <Field label="Unite Organisationnelle (OU)" value={organizationalUnit} onChange={setOrganizationalUnit} placeholder="Direction des Systemes d'Information" />
          <Field label="Ville (L) *" value={locality} onChange={setLocality} placeholder="Paris" />
          <Field label="Region / Etat (ST)" value={stateRegion} onChange={setStateRegion} placeholder="Ile-de-France" />
          <Field label="Pays (C) *" value={country} onChange={(v) => setCountry(v.toUpperCase())} placeholder="FR" help="Code pays ISO 3166-1 (2 lettres)" />
          <Field label="Email *" value={emailAddr} onChange={setEmailAddr} placeholder="jean.dupont@organisation.fr" wide />
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-neutral-100 bg-white p-6 shadow dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-2 text-h3 font-semibold dark:text-neutral-100">CSR (optionnel)</h2>
        <div className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
          Collez une CSR au format PEM ou uploadez un fichier CSR.
        </div>
        <div className="mb-4">
          <textarea
            className="h-36 w-full rounded border bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            value={csrText}
            onChange={(e) => setCsrText(e.target.value)}
            placeholder={'-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----'}
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">OU uploader un fichier CSR</div>
          <div className="flex items-center gap-3">
            <input ref={csrFileRef} type="file" className="hidden" accept=".csr,.pem,text/*" onChange={(e) => onSelectCsrFile(e.target.files ? e.target.files[0] : null)} />
            <button className="rounded border px-4 py-2 dark:border-neutral-700 dark:text-neutral-200" onClick={() => csrFileRef.current?.click()}>
              {csrFile ? 'Remplacer le fichier CSR' : 'Choisir un fichier CSR'}
            </button>
            {csrFile && (
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                {csrFile.name}
                <button className="ml-3 text-red-600" onClick={removeCsrFile}>
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button className="rounded-lg border-2 border-primary-700 px-6 py-3 text-primary-700 dark:border-primary-300 dark:text-primary-300" onClick={() => navigate('/dashboard')}>
          Annuler
        </button>
        <button className="rounded-lg bg-primary-800 px-6 py-3 font-semibold text-white" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Envoi...' : 'Soumettre la demande'}
        </button>
      </div>

      {error && <div className="mt-4 text-red-600 dark:text-red-300">{error}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  help,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  help?: string;
  wide?: boolean;
}) {
  return (
    <label className={`flex flex-col ${wide ? 'md:col-span-2' : ''}`}>
      <span className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <input className="rounded border bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {help && <div className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{help}</div>}
    </label>
  );
}
