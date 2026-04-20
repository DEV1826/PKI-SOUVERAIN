import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as tmImage from '@teachablemachine/image';
import Button from '../components/Button';
import { userService } from '../services/api';
import { useAuthStore } from '../stores/authStore';

type AiResult = { label: string; score: number; ok: boolean };

export default function UserGenerateCsrPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [identityFiles, setIdentityFiles] = useState<File[]>([]);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [dragOverIdentity, setDragOverIdentity] = useState(false);
  const [dragOverSelfie, setDragOverSelfie] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [aiResults, setAiResults] = useState<Record<string, AiResult>>({});

  const aiRequestIdRef = useRef(0);
  const identityInputRef = useRef<HTMLInputElement | null>(null);
  const selfieInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    setError(null);
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
      } catch {
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

  const validateWithAi = async (file: File): Promise<AiResult> => {
    if (!aiModel) throw new Error('Modele non disponible');

    const img = await loadImage(file);
    const predictions: tmImage.Prediction[] = await aiModel.predict(img);
    const best = predictions.reduce<tmImage.Prediction>(
      (acc: tmImage.Prediction, cur: tmImage.Prediction) => (cur.probability > acc.probability ? cur : acc),
      predictions[0]
    );

    const label = best?.className || 'UNKNOWN';
    const score = best?.probability ?? 0;
    const normalized = label.toLowerCase();
    const isAllowed = ['cni', 'passport', 'passeport'].some((v) => normalized.includes(v));
    const ok = isAllowed && score >= 0.8;

    return { label, score, ok };
  };

  const onIdentityFiles = useCallback(
    async (selected: FileList | null) => {
      if (!selected) return;
      if (aiStatus !== 'ready' || !aiModel) {
        setError("Le modele IA est en cours de chargement. Reessayez dans quelques secondes.");
        return;
      }

      setError(null);
      const arr = Array.from(selected);
      const allowed = arr.filter((f) => /^image\//.test(f.type));
      const rejected = arr.filter((f) => !/^image\//.test(f.type)).map((f) => f.name);

      if (rejected.length > 0) {
        setError(`Format non pris en charge: ${rejected.join(', ')}`);
      }

      const requestId = ++aiRequestIdRef.current;
      const nextResults: Record<string, AiResult> = {};
      const accepted: File[] = [];
      const invalid: string[] = [];

      for (const file of allowed) {
        try {
          const result = await validateWithAi(file);
          nextResults[fileKey(file)] = result;
          if (result.ok) {
            accepted.push(file);
          } else {
            invalid.push(file.name);
          }
        } catch {
          nextResults[fileKey(file)] = { label: 'UNKNOWN', score: 0, ok: false };
          invalid.push(file.name);
        }
      }

      if (requestId !== aiRequestIdRef.current) return;

      setAiResults((prev) => ({ ...prev, ...nextResults }));
      if (invalid.length > 0) {
        setError(`Seules les pieces d'identite CNI/Passeport sont acceptees. Fichiers non valides: ${invalid.join(', ')}`);
      }
      setIdentityFiles((prev) => [...prev, ...accepted].slice(0, 5));
    },
    [aiModel, aiStatus]
  );

  const onSelfieFiles = useCallback((selected: FileList | null) => {
    if (!selected || selected.length === 0) return;

    const file = selected[0];
    if (!/^image\//.test(file.type)) {
      setError('La photo visage doit etre une image.');
      return;
    }

    setError(null);
    setSelfieFile(file);
  }, []);

  const removeIdentityFile = (idx: number) => {
    setIdentityFiles((prev) => {
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
  };

  const clearSelfie = () => setSelfieFile(null);

  const validateStep1 = () => {
    if (!firstName.trim()) return 'Le prenom est requis';
    if (!lastName.trim()) return 'Le nom est requis';
    if (!birthDate.trim()) return 'La date de naissance est requise';
    if (!birthPlace.trim()) return 'Le lieu de naissance est requis';
    if (!identityDocumentNumber.trim()) return 'Le numero de piece est requis';
    if (!identityDocumentExpiry.trim()) return "La date d'expiration de la piece est requise";
    if (!nationality.trim() || !/^[A-Za-z]{2}$/.test(nationality.trim())) return 'La nationalite doit etre un code ISO 2 lettres';

    const normalizedEmail = emailAddr.trim().toLowerCase();
    if (!normalizedEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      return 'Un email valide est requis';
    }

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
    }
  };

  const goPrevious = () => {
    setError(null);
    setStep(1);
  };

  const onSubmit = async () => {
    setError(null);

    const validation = validateStep1();
    if (validation) {
      setError(validation);
      return;
    }

    if (identityFiles.length === 0) {
      setError("Veuillez ajouter au moins une piece d'identite.");
      return;
    }

    if (!selfieFile) {
      setError('Une photo visage est obligatoire pour la verification d\'identite.');
      return;
    }

    setSubmitting(true);

    try {
      const normalizedFirstName = firstName.trim();
      const normalizedLastName = lastName.trim();
      const normalizedDocType = identityDocumentType.trim().toUpperCase();
      const normalizedDocNumber = identityDocumentNumber.trim();
      const normalizedNationality = nationality.trim().toUpperCase();

      const form = new FormData();
      form.append('firstName', normalizedFirstName);
      form.append('lastName', normalizedLastName);
      form.append('birthDate', birthDate.trim());
      form.append('birthPlace', birthPlace.trim());
      form.append('nationality', normalizedNationality);
      form.append('identityDocumentType', normalizedDocType);
      form.append('identityDocumentNumber', normalizedDocNumber);
      form.append('identityDocumentExpiry', identityDocumentExpiry.trim());
      form.append('email', emailAddr.trim().toLowerCase());

      // Champs X.509 derives pour rester compatible backend, sans exposer ce formulaire a l'utilisateur ici.
      form.append('commonName', `${normalizedFirstName} ${normalizedLastName}`.trim());
      form.append('organization', `DETENTEUR_${normalizedDocType}`);
      form.append('organizationalUnit', `DOC:${normalizedDocType}-${normalizedDocNumber}`);
      form.append('locality', birthPlace.trim());
      form.append('state', '-');
      form.append('country', normalizedNationality);

      identityFiles.forEach((f) => form.append('documents', f));
      form.append('documents', selfieFile, `selfie_${selfieFile.name}`);
      form.append('livePhotoProvided', 'true');

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
          Etape {step}/2 - {step === 1 ? 'Informations personnelles' : "Piece d'identite + photo visage"}
        </div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <StepBadge active={step === 1} done={step > 1} label="1. Infos personnelles" />
          <StepBadge active={step === 2} done={false} label="2. Identite + Selfie" />
        </div>
      </div>

      {step === 1 && (
        <div className="mb-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-h3 font-semibold dark:text-neutral-100">Informations personnelles</h2>
          <div className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Renseignez les informations exactement comme sur la piece d'identite ou le passeport.
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Prenom *" value={firstName} onChange={setFirstName} placeholder="Prenom" />
            <Field label="Nom *" value={lastName} onChange={setLastName} placeholder="Nom" />
            <Field label="Date de naissance *" value={birthDate} onChange={setBirthDate} placeholder="YYYY-MM-DD" type="date" />
            <Field label="Lieu de naissance *" value={birthPlace} onChange={setBirthPlace} placeholder="Ville" />
            <Field label="Nationalite (ISO) *" value={nationality} onChange={(v) => setNationality(v.toUpperCase())} placeholder="CM" />

            <label className="flex flex-col">
              <span className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Type de piece *</span>
              <select
                value={identityDocumentType}
                onChange={(e) => setIdentityDocumentType(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <option value="CNI">CNI</option>
                <option value="PASSEPORT">Passeport</option>
                <option value="CARTE_SEJOUR">Carte de sejour</option>
              </select>
            </label>

            <Field label="Numero de piece *" value={identityDocumentNumber} onChange={setIdentityDocumentNumber} placeholder="123456789" />
            <Field
              label="Expiration piece *"
              value={identityDocumentExpiry}
              onChange={setIdentityDocumentExpiry}
              placeholder="YYYY-MM-DD"
              type="date"
            />
            <Field label="Email de contact *" value={emailAddr} onChange={setEmailAddr} placeholder="nom@domaine.com" wide />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-2 text-h3 font-semibold dark:text-neutral-100">Piece d'identite (obligatoire)</h2>
            <div className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
              Importez votre piece d'identite (CNI/Passeport). Validation IA active.
            </div>
            <div className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
              IA: {aiStatus === 'loading' ? 'chargement du modele...' : aiStatus === 'ready' ? 'active (CNI/Passeport)' : 'indisponible'}
              {aiError ? ` - ${aiError}` : ''}
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIdentity(true);
              }}
              onDragLeave={() => setDragOverIdentity(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverIdentity(false);
                onIdentityFiles(e.dataTransfer.files);
              }}
              className={`rounded-lg border-2 p-10 text-center ${
                dragOverIdentity
                  ? 'border-dashed border-primary-600 bg-primary-50 dark:bg-primary-950/30'
                  : 'border-dashed border-neutral-300 dark:border-neutral-700'
              }`}
            >
              <div className="font-semibold dark:text-neutral-100">Glissez-deposez vos pieces ici</div>
              <div className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
                ou{' '}
                <button className="text-primary-700 underline dark:text-primary-300" onClick={() => identityInputRef.current?.click()}>
                  cliquez pour selectionner
                </button>
              </div>
              <div className="mt-2 flex justify-center">
                <Button variant="secondary" onClick={() => identityInputRef.current?.click()}>Parcourir les fichiers</Button>
              </div>
              <input
                ref={identityInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => onIdentityFiles(e.target.files)}
                accept="image/*"
              />
            </div>

            {identityFiles.length > 0 && (
              <div className="mt-4">
                <ul className="space-y-2">
                  {identityFiles.map((f, idx) => {
                    const result = aiResults[fileKey(f)];
                    return (
                      <li key={fileKey(f)} className="flex items-center justify-between rounded bg-neutral-50 p-3 dark:bg-neutral-800">
                        <div className="text-sm dark:text-neutral-200">
                          {f.name} <span className="text-xs text-neutral-400 dark:text-neutral-500">({Math.round(f.size / 1024)} KB)</span>
                          {result && (
                            <span
                              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                                result.ok
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              }`}
                            >
                              {result.label} - {Math.round(result.score * 100)}%
                            </span>
                          )}
                        </div>
                        <button className="text-sm text-red-600" onClick={() => removeIdentityFile(idx)}>
                          Supprimer
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-2 text-h3 font-semibold dark:text-neutral-100">Photo visage / preuve de vie (obligatoire)</h2>
            <div className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
              Ajoutez une photo recente de votre visage pour l'authentification faciale.
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverSelfie(true);
              }}
              onDragLeave={() => setDragOverSelfie(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverSelfie(false);
                onSelfieFiles(e.dataTransfer.files);
              }}
              className={`rounded-lg border-2 p-8 text-center ${
                dragOverSelfie
                  ? 'border-dashed border-primary-600 bg-primary-50 dark:bg-primary-950/30'
                  : 'border-dashed border-neutral-300 dark:border-neutral-700'
              }`}
            >
              <div className="font-semibold dark:text-neutral-100">Deposez votre selfie ici</div>
              <div className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
                ou{' '}
                <button className="text-primary-700 underline dark:text-primary-300" onClick={() => selfieInputRef.current?.click()}>
                  cliquez pour selectionner
                </button>
              </div>
              <div className="mt-2 flex justify-center">
                <Button variant="secondary" onClick={() => selfieInputRef.current?.click()}>Choisir une photo</Button>
              </div>
              <input ref={selfieInputRef} type="file" className="hidden" onChange={(e) => onSelfieFiles(e.target.files)} accept="image/*" />
            </div>

            {selfieFile && (
              <div className="mt-4 flex items-center justify-between rounded bg-neutral-50 p-3 dark:bg-neutral-800">
                <div className="text-sm dark:text-neutral-200">
                  {selfieFile.name} <span className="text-xs text-neutral-400 dark:text-neutral-500">({Math.round(selfieFile.size / 1024)} KB)</span>
                </div>
                <button className="text-sm text-red-600" onClick={clearSelfie}>
                  Supprimer
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-100 bg-white p-4 text-sm text-neutral-600 shadow dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Apres validation admin de votre identite, vous recevrez la main pour soumettre le CSR depuis la page "Suivi de mes demandes".
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
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
  wide = false,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  wide?: boolean;
  type?: 'text' | 'date' | 'email';
}) {
  return (
    <label className={`flex flex-col ${wide ? 'md:col-span-2' : ''}`}>
      <span className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <input
        type={type}
        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
