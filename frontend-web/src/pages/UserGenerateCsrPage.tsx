import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as tmImage from '@teachablemachine/image';
import { userService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/Button';

export default function UserGenerateCsrPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commonName, setCommonName] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [organizationalUnit, setOrganizationalUnit] = useState<string>('');
  const [locality, setLocality] = useState<string>('');
  const [stateRegion, setStateRegion] = useState<string>('');
  const [country, setCountry] = useState<string>('CM');
  const [emailAddr, setEmailAddr] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthPlace, setBirthPlace] = useState<string>('');
  const [nationality, setNationality] = useState<string>('CM');
  const [identityDocumentType, setIdentityDocumentType] = useState<string>('CNI');
  const [identityDocumentNumber, setIdentityDocumentNumber] = useState<string>('');
  const [identityDocumentExpiry, setIdentityDocumentExpiry] = useState<string>('');
  const [aiModel, setAiModel] = useState<tmImage.CustomMobileNet | null>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, { label: string; score: number; ok: boolean }>>({});
  const aiRequestIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    setError(null);
    setCommonName((user?.firstName + ' ' + user?.lastName) || '');
    setEmailAddr(user?.email || '');
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadModel = async () => {
      setAiStatus('loading');
      setAiError(null);
      try {
        const model = await tmImage.load('/ai/id-model/model.json', '/ai/id-model/metadata.json');
        if (cancelled) return;
        setAiModel(model);
        setAiStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setAiStatus('error');
        setAiError("Le modele IA n'a pas pu etre charge.");
      }
    };
    loadModel();
    return () => {
      cancelled = true;
    };
  }, []);

  const fileKey = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;

  const loadImage = (file: File) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image invalide'));
      };
      img.src = url;
    });

  const validateWithAi = async (file: File) => {
    if (!aiModel) throw new Error('Modele non disponible');
    const img = await loadImage(file);
    const predictions: tmImage.Prediction[] = await aiModel.predict(img);
    const best = predictions.reduce<tmImage.Prediction>(
      (acc, cur) => (cur.probability > acc.probability ? cur : acc),
      predictions[0]
    );
    const label = best?.className || 'UNKNOWN';
    const score = best?.probability ?? 0;
    const normalized = label.toLowerCase();
    const isAllowed = ['cni', 'passport', 'passeport'].some((v) => normalized.includes(v));
    const ok = isAllowed && score >= 0.8;
    return { label, score, ok };
  };

  const onFiles = useCallback(
    async (selected: FileList | null) => {
      if (!selected) return;
      if (aiStatus !== 'ready' || !aiModel) {
        setError("Le modele IA est en cours de chargement. Reessayez dans quelques secondes.");
        return;
      }
      setError(null);
      const arr = Array.from(selected);
      const allowed = arr.filter((f) => /png|jpe?g/.test(f.type));
      const rejected = arr.filter((f) => !/png|jpe?g/.test(f.type)).map((f) => f.name);
      if (rejected.length) {
        setError(`Format non pris en charge: ${rejected.join(', ')}`);
      }

      const requestId = ++aiRequestIdRef.current;
      const nextResults: Record<string, { label: string; score: number; ok: boolean }> = {};
      const accepted: File[] = [];
      const invalid: string[] = [];

      for (const file of allowed) {
        try {
          const result = await validateWithAi(file);
          nextResults[fileKey(file)] = result;
          if (result.ok) accepted.push(file);
          else invalid.push(file.name);
        } catch {
          nextResults[fileKey(file)] = { label: 'UNKNOWN', score: 0, ok: false };
          invalid.push(file.name);
        }
      }

      if (requestId !== aiRequestIdRef.current) return;
      setAiResults((prev) => ({ ...prev, ...nextResults }));
      if (invalid.length) {
        setError(`Seules les pieces d'identite CNI/Passeport sont acceptees. Fichiers non valides: ${invalid.join(', ')}`);
      }
      setFiles((prev) => [...prev, ...accepted].slice(0, 5));
    },
    [aiModel, aiStatus]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      onFiles(e.dataTransfer.files);
    },
    [onFiles]
  );

  const onBrowse = () => fileInputRef.current?.click();

  const removeFile = (idx: number) =>
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      const removed = prev[idx];
      if (removed) {
        setAiResults((curr) => {
          const copy = { ...curr };
          delete copy[fileKey(removed)];
          return copy;
        });
      }
      return next;
    });

  const validateStep1 = () => {
    if (!firstName.trim()) return 'Le prenom est requis';
    if (!lastName.trim()) return 'Le nom est requis';
    if (!identityDocumentNumber.trim()) return 'Le numero de piece est requis';
    if (!identityDocumentExpiry.trim()) return "La date d'expiration est requise";
    if (!nationality.trim() || !/^[A-Za-z]{2}$/.test(nationality.trim())) return 'La nationalite doit etre un code ISO 2 lettres';
    if (!commonName.trim()) return 'Le Common Name (CN) est requis';
    if (!organization.trim()) return "L'organisation (O) est requise";
    if (!locality.trim()) return 'La ville (L) est requise';
    if (!country.trim() || !/^[A-Za-z]{2}$/.test(country.trim())) return 'Le pays (C) doit etre un code ISO 2 lettres';
    if (!emailAddr.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailAddr.trim().toLowerCase())) return 'Un email valide est requis';
    return null;
  };

  const goNext = () => {
    setError(null);
    if (step === 1) {
      const validation = validateStep1();
      if (validation) {
        setError(validation);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (files.length === 0) {
        setError("Veuillez ajouter au moins une piece d'identite avant de continuer.");
        return;
      }
    }
  };

  const goPrevious = () => {
    setError(null);
    setStep((prev) => (prev === 1 ? 1 : ((prev - 1) as 1 | 2)));
  };

  const onSubmit = async () => {
    setError(null);
    const validation = validateStep1();
    if (validation) return setError(validation);
    if (files.length === 0) return setError("Veuillez ajouter au moins une piece d'identite.");

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('commonName', commonName);
      form.append('organization', organization || '');
      form.append('organizationalUnit', organizationalUnit || '');
      form.append('locality', locality || '');
      form.append('state', stateRegion || '');
      form.append('country', country || '');
      form.append('email', emailAddr.trim().toLowerCase());
      form.append('firstName', firstName.trim());
      form.append('lastName', lastName.trim());
      if (birthDate.trim()) form.append('birthDate', birthDate.trim());
      if (birthPlace.trim()) form.append('birthPlace', birthPlace.trim());
      form.append('nationality', nationality.trim().toUpperCase());
      form.append('identityDocumentType', identityDocumentType.trim().toUpperCase());
      form.append('identityDocumentNumber', identityDocumentNumber.trim());
      form.append('identityDocumentExpiry', identityDocumentExpiry.trim());
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
        <h1 className="mb-2 text-h3 font-semibold dark:text-neutral-100">Nouvelle demande</h1>
        <div className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          Etape {step}/2 - {step === 1 ? 'Informations personnelles' : "Piece d'identite"}
        </div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <StepBadge active={step === 1} done={step > 1} label="1. Infos" />
          <StepBadge active={step === 2} done={false} label="2. Identite" />
        </div>
      </div>

      {step === 1 && (
        <div className="mb-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-h3 font-semibold dark:text-neutral-100">Informations personnelles</h2>
          <div className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Renseignez les informations telles qu'elles figurent sur votre piece d'identite.
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Prenom *" value={firstName} onChange={setFirstName} placeholder="Prenom" />
            <Field label="Nom *" value={lastName} onChange={setLastName} placeholder="Nom" />
            <Field label="Date de naissance" value={birthDate} onChange={setBirthDate} placeholder="YYYY-MM-DD" />
            <Field label="Lieu de naissance" value={birthPlace} onChange={setBirthPlace} placeholder="Ville" />
            <Field label="Nationalite (ISO) *" value={nationality} onChange={(v) => setNationality(v.toUpperCase())} placeholder="CM" />
            <Field label="Type de piece *" value={identityDocumentType} onChange={(v) => setIdentityDocumentType(v.toUpperCase())} placeholder="CNI" />
            <Field label="Numero de piece *" value={identityDocumentNumber} onChange={setIdentityDocumentNumber} placeholder="123456789" />
            <Field label="Expiration piece *" value={identityDocumentExpiry} onChange={setIdentityDocumentExpiry} placeholder="YYYY-MM-DD" />
            <Field label="Common Name (CN) *" value={commonName} onChange={setCommonName} placeholder="Japhet Fadil" help="Votre nom complet tel qu'il apparaitra sur le certificat" />
            <Field label="Organisation (O) *" value={organization} onChange={setOrganization} placeholder="Ministere de l'Interieur" />
            <Field label="Unite Organisationnelle (OU)" value={organizationalUnit} onChange={setOrganizationalUnit} placeholder="Direction des Systemes d'Information" />
            <Field label="Ville (L) *" value={locality} onChange={setLocality} placeholder="Yaounde" />
            <Field label="Region / Etat (ST)" value={stateRegion} onChange={setStateRegion} placeholder="Centre" />
            <Field label="Pays (C) *" value={country} onChange={(v) => setCountry(v.toUpperCase())} placeholder="CM" help="Code pays ISO 3166-1 (2 lettres)" />
            <Field label="Email *" value={emailAddr} onChange={setEmailAddr} placeholder="japhet.fadil@organisation.fr" wide />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mb-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-h3 font-semibold dark:text-neutral-100">Piece d'identite</h2>
          <div className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
            Importez votre piece d'identite (CNI ou passeport). Seules les images sont acceptees.
          </div>
          <div className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
            IA: {aiStatus === 'loading' ? 'chargement du modele...' : aiStatus === 'ready' ? 'active (CNI/Passeport)' : 'indisponible'}
            {aiError ? ` - ${aiError}` : ''}
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
            <div className="mt-2 flex justify-center">
              <Button variant="secondary" onClick={onBrowse}>Parcourir les fichiers</Button>
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} accept="image/*" />
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              <ul className="space-y-2">
                {files.map((f, idx) => (
                  <li key={idx} className="flex items-center justify-between rounded bg-neutral-50 p-3 dark:bg-neutral-800">
                    <div className="text-sm dark:text-neutral-200">
                      {f.name} <span className="text-xs text-neutral-400 dark:text-neutral-500">({Math.round(f.size / 1024)} KB)</span>
                      {aiResults[fileKey(f)] && (
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                            aiResults[fileKey(f)].ok
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {aiResults[fileKey(f)].label} - {Math.round(aiResults[fileKey(f)].score * 100)}%
                        </span>
                      )}
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
      )}

      {step === 2 && (
        <div className="mb-4 rounded-2xl border border-neutral-100 bg-white p-4 text-sm text-neutral-600 shadow dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          Apres verification admin, vous pourrez soumettre la CSR depuis la page "Suivi de mes demandes".
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          Annuler
        </Button>
        {step > 1 && (
          <Button variant="secondary" onClick={goPrevious} disabled={submitting}>
            Precedent
          </Button>
        )}
        {step < 2 ? (
          <Button onClick={goNext} disabled={submitting}>
            Suivant
          </Button>
        ) : (
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Envoi...' : 'Soumettre pour verification'}
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

function StepBadge({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center text-sm font-semibold ${
        done
          ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300'
          : active
            ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300'
            : 'border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
      }`}
    >
      {label}
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
      <input
        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {help && <div className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{help}</div>}
    </label>
  );
}
