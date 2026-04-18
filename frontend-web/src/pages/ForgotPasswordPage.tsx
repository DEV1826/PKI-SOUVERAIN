import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useToast } from '../components/Toast';
import { authService } from '../services/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      addToast({ type: 'error', message: 'Veuillez entrer votre email' });
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
      addToast({ type: 'success', message: 'Email de reinitialisation envoye avec succes' });
    } catch (error: any) {
      console.error('Erreur:', error);
      addToast({ type: 'error', message: "Erreur lors de l'envoi de l'email" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 dark:from-neutral-950 dark:via-slate-950 dark:to-indigo-950/30">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm mb-8 transition dark:text-indigo-300 dark:hover:text-indigo-200">
          <ArrowLeft size={16} />
          Retour a la connexion
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden dark:bg-neutral-900 dark:border dark:border-neutral-800">
          {!submitted ? (
            <>
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-8">
                <div className="flex justify-center mb-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    <Mail size={28} className="text-white" />
                  </div>
                </div>
                <h1 className="text-h2 font-bold text-white text-center">Reinitialiser le mot de passe</h1>
                <p className="text-indigo-100 text-center text-sm mt-2">
                  Entrez votre adresse email pour recevoir un lien de reinitialisation
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <Input
                  label="Email"
                  type="email"
                  placeholder="Votre email"
                  value={email}
                  onChange={setEmail}
                  disabled={loading}
                  icon={<Mail size={18} />}
                />

                <Button type="submit" className="w-full" loading={loading}>
                  Envoyer le lien de reinitialisation
                </Button>

                <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
                  Vous n'avez pas recu d'email ? Verifiez votre dossier spam
                </p>
              </form>
            </>
          ) : (
            <>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-8 py-12 text-center space-y-6 dark:from-green-950/30 dark:to-emerald-950/30">
                <div className="flex justify-center">
                  <div className="bg-green-100 p-3 rounded-full dark:bg-green-950/40">
                    <Mail size={32} className="text-green-600 dark:text-green-300" />
                  </div>
                </div>
                <h2 className="text-h3 font-bold text-green-800 dark:text-green-300">Email envoye avec succes</h2>
                <p className="text-green-700 dark:text-green-300/80">
                  Un email contenant le lien de reinitialisation a ete envoye a <span className="font-semibold">{email}</span>
                </p>
                <p className="text-sm text-green-600 dark:text-green-300/80">
                  Le lien expire dans 24 heures. Verifiez votre dossier spam si vous ne le voyez pas.
                </p>

                <div className="pt-4 space-y-3">
                  <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
                    Retour a la connexion
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEmail('');
                      setSubmitted(false);
                    }}
                    className="w-full"
                  >
                    Renvoyer un email
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
