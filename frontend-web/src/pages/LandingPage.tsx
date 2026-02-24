import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Award,
  Globe,
  ChevronRight,
  Lock,
  Zap,
  Users,
  FileCheck2,
  Building2,
  KeyRound,
  BadgeCheck,
  Scale,
  Clock3,
  FileSearch
} from 'lucide-react';
import Button from '../components/Button';

/**
 * Page d'accueil (Landing Page)
 */
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-neutral-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent">
                PKI Souverain
              </span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-1">
              {[
                ['Fonctionnalites', '#fonctionnalites'],
                ['Processus', '#processus'],
                ['FAQ', '#faq'],
                ['A propos', '#a-propos']
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="px-4 py-2 text-neutral-700 hover:text-indigo-600 font-medium transition-colors"
                >
                  {label}
                </a>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-neutral-700 font-semibold hover:text-indigo-600 transition-colors"
              >
                Connexion
              </button>
              <Button onClick={() => navigate('/register')} variant="primary" size="md">
                S'inscrire
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-indigo-50 py-20 md:py-32">
        {/* Background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8 inline-flex items-center px-4 py-2 rounded-full bg-indigo-100/50 border border-indigo-200">
            <Zap className="h-4 w-4 text-indigo-600 mr-2" />
            <span className="text-sm font-semibold text-indigo-700">Infrastructure de confiance nationale</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 mb-6 leading-tight">
            Votre Identite Numerique
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent">
              Souveraine et Securisee
            </span>
          </h1>

          <p className="text-xl text-neutral-700 mb-12 max-w-2xl mx-auto leading-relaxed">
            Plateforme nationale de certification numerique conforme aux standards X.509.
            Demandez, suivez et recuperez vos certificats sur un parcours clair et verifiable.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              onClick={() => navigate('/register')}
              variant="primary"
              size="lg"
              icon={<ChevronRight size={20} />}
              iconPosition="right"
            >
              Commencer maintenant
            </Button>
            <Button onClick={() => navigate('/login')} variant="outline" size="lg">
              J'ai deja un compte
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto py-12">
            {[
              { icon: Lock, label: 'Chiffrement RSA 4096', desc: 'Securite bancaire' },
              { icon: Shield, label: 'Conforme X.509', desc: 'Standard international' },
              { icon: Users, label: '100% Souverain', desc: 'Sans tiers externe' }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-100 mb-3">
                  <stat.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="text-sm font-semibold text-neutral-900">{stat.label}</div>
                <div className="text-xs text-neutral-600 mt-1">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">Une infrastructure complete</h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour gerer vos certificats numeriques de maniere fiable et securisee.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Securite renforcee',
                description: 'Cryptographie RSA 4096 bits et algorithmes certifies pour la protection maximale de vos donnees.'
              },
              {
                icon: Award,
                title: 'Conformite X.509',
                description: 'Standard international reconnu garantissant l interoperabilite avec vos systemes existants.'
              },
              {
                icon: Globe,
                title: 'Infrastructure souveraine',
                description: 'Hebergement maitrise et gouvernance locale, sans dependance a des autorites externes.'
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="relative group rounded-xl border border-neutral-200 p-8 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 bg-white overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-indigo-100 mb-6 group-hover:bg-indigo-200 transition-colors">
                    <feature.icon className="h-7 w-7 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-3">{feature.title}</h3>
                  <p className="text-neutral-700 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="processus" className="py-20 bg-neutral-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">Comment ca marche</h2>
            <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
              Un processus clair en 3 etapes: demande, verification administrative, puis emission du certificat.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileCheck2,
                title: '1. Soumettre la demande',
                description: 'Renseignez vos informations, ajoutez votre piece d identite et envoyez la demande.'
              },
              {
                icon: FileSearch,
                title: '2. Verification admin',
                description: 'Un administrateur valide ou demande des corrections avec un motif explicite.'
              },
              {
                icon: KeyRound,
                title: '3. Signature et livraison',
                description: 'Apres validation, votre CSR est signee et le certificat est disponible dans votre espace.'
              }
            ].map((step, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-5">
                  <step.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">{step.title}</h3>
                <p className="text-neutral-700">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Scale,
                title: 'Traçabilite complete',
                text: 'Toutes les actions critiques sont journalisees (audit) pour faciliter le controle et la conformite.'
              },
              {
                icon: Clock3,
                title: 'Cycle de vie maitrise',
                text: 'Emission, suivi, renouvellement et revocation des certificats dans une seule plateforme.'
              },
              {
                icon: Building2,
                title: 'Gouvernance centralisee',
                text: 'Gestion admin des demandes, des statuts et de la chaine de certification.'
              }
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 p-6 bg-neutral-50">
                <div className="w-11 h-11 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">{item.title}</h3>
                <p className="text-neutral-700 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="a-propos" className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-neutral-900 mb-6 leading-tight">Pourquoi choisir PKI Souverain ?</h2>
              <ul className="space-y-4">
                {[
                  'Parcours utilisateur guide avec etapes de verification',
                  'Validation administrative avant signature finale',
                  'Gestion de plusieurs demandes en parallele',
                  'Visualisation et telechargement des pieces jointes',
                  'Suivi clair des statuts et actions correctives',
                  'Controle centralise de la chaine de confiance'
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 mt-1">
                      <ChevronRight className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-lg text-neutral-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl blur-3xl opacity-20"></div>
              <div className="relative bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-8 border border-indigo-100">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 mx-auto mb-6">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <p className="text-center text-neutral-800 font-semibold mb-4">Certificats numeriques PKI Souverain</p>
                <p className="text-center text-neutral-600">La solution de confiance pour votre identite numerique.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">FAQ</h2>
            <p className="text-lg text-neutral-600">Reponses rapides aux questions frequentes.</p>
          </div>
          <div className="space-y-4">
            {[
              {
                q: 'Combien de temps prend une demande ?',
                a: 'Le delai depend de la qualite des informations et des pieces fournies. Les statuts sont visibles en temps reel.'
              },
              {
                q: 'Puis-je faire plusieurs demandes ?',
                a: 'Oui. Vous pouvez gerer plusieurs demandes en parallele depuis la section Nouvelle demande.'
              },
              {
                q: 'Quels formats de pieces justificatives sont recommandes ?',
                a: 'JPG, PNG et PDF sont les plus adaptes pour la verification et l apercu dans l application.'
              },
              {
                q: 'Que se passe-t-il en cas de rejet ?',
                a: 'L administrateur laisse un motif de correction. Vous pouvez modifier puis resoumettre.'
              }
            ].map((item, idx) => (
              <div key={idx} className="rounded-xl border border-neutral-200 p-6 bg-neutral-50">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-neutral-900">{item.q}</h3>
                    <p className="text-neutral-700 mt-2">{item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Commencez des maintenant</h2>
          <p className="text-xl text-indigo-100 mb-12 max-w-2xl mx-auto">
            Obtenez votre certificat numerique securise en quelques etapes.
          </p>
          <Button
            onClick={() => navigate('/register')}
            variant="primary"
            size="lg"
            className="bg-white text-indigo-600 hover:bg-indigo-50"
          >
            Creer mon compte
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-400 py-12 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-6 w-6 text-indigo-400" />
                <span className="font-bold text-white">PKI Souverain</span>
              </div>
              <p className="text-sm text-neutral-500">Infrastructure de confiance nationale</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#fonctionnalites" className="hover:text-white transition">Fonctionnalites</a></li>
                <li><a href="#processus" className="hover:text-white transition">Processus</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Ressources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
                <li><a href="#a-propos" className="hover:text-white transition">A propos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:support@pki.gov" className="hover:text-white transition">Support</a></li>
                <li><a href="mailto:admin@pki.gov" className="hover:text-white transition">Administration</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm">© 2026 PKI Souverain. Tous droits reserves.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
