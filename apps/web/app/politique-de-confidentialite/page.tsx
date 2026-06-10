import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité de TodoList by EZ3 : données collectées, finalités, sous-traitants et droits des utilisateurs.",
};

const LAST_UPDATED = "10 juin 2026";

export default function PolitiqueConfidentialitePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 text-gray-700">
      <header className="space-y-2 border-b border-gray-200 pb-6">
        <p className="text-sm text-gray-500">Dernière mise à jour : {LAST_UPDATED}</p>
        <h1 className="text-2xl font-semibold text-gray-900">
          Politique de confidentialité
        </h1>
        <p className="text-sm leading-relaxed">
          La présente politique décrit comment l&apos;application{" "}
          <strong>TodoList by EZ3</strong> (site web et application mobile Android)
          traite vos données personnelles. Elle s&apos;applique au service accessible
          sur{" "}
          <a
            href="https://todolist.ez3ki33l.ovh"
            className="text-gray-900 underline underline-offset-2 hover:text-gray-600"
          >
            todolist.ez3ki33l.ovh
          </a>
          .
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">1. Responsable du traitement</h2>
        <p className="text-sm leading-relaxed">
          Le service est édité par <strong>EZ3ki33l</strong> (développeur indépendant).
        </p>
        <p className="text-sm leading-relaxed">
          Contact :{" "}
          <a
            href="mailto:r.rousset31@gmail.com"
            className="text-gray-900 underline underline-offset-2 hover:text-gray-600"
          >
            r.rousset31@gmail.com
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">2. Données collectées</h2>
        <p className="text-sm leading-relaxed">
          Dans le cadre de l&apos;utilisation du service, nous traitons les catégories
          de données suivantes :
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            <strong>Données de compte</strong> : nom, adresse e-mail et photo de profil
            fournis par Google lors de la connexion (OAuth).
          </li>
          <li>
            <strong>Contenus que vous créez</strong> : listes de tâches, tâches
            (titres, dates, récurrences), listes de courses, articles, quantités,
            catégories et informations de partage entre utilisateurs.
          </li>
          <li>
            <strong>Préférences</strong> : réglages de notifications (alertes
            navigateur, badge, types d&apos;événements activés).
          </li>
          <li>
            <strong>Données techniques de notification</strong> : jetons push mobile
            (Expo / Firebase Cloud Messaging) et abonnements Web Push (navigateur),
            uniquement si vous activez ces fonctionnalités.
          </li>
          <li>
            <strong>Historique d&apos;activité</strong> : événements liés à votre
            compte (partage de liste, ajouts sur listes partagées) pour alimenter la
            cloche de notifications.
          </li>
          <li>
            <strong>Statistiques d&apos;usage courses</strong> : habitudes d&apos;achat
            (articles fréquents, catégories mémorisées) pour proposer des suggestions.
          </li>
          <li>
            <strong>Données techniques</strong> : identifiants de session, journaux
            techniques limités (sécurité, diagnostic d&apos;erreurs).
          </li>
        </ul>
        <p className="text-sm leading-relaxed">
          Nous ne vendons pas vos données et ne les utilisons pas à des fins
          publicitaires.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">3. Finalités et bases légales</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            <strong>Fourniture du service</strong> (exécution du contrat) : créer et
            synchroniser vos listes, partager avec d&apos;autres utilisateurs,
            afficher votre tableau de bord.
          </li>
          <li>
            <strong>Authentification</strong> (exécution du contrat) : connexion via
            Google et maintien de votre session.
          </li>
          <li>
            <strong>Notifications</strong> (consentement ou intérêt légitime selon le
            canal) : vous informer des activités sur vos listes partagées, si vous
            avez activé les alertes correspondantes.
          </li>
          <li>
            <strong>Amélioration de l&apos;expérience</strong> (intérêt légitime) :
            suggestions d&apos;articles, mémorisation des catégories, sécurisation de
            l&apos;API (limitation de débit).
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">4. Partage et sous-traitants</h2>
        <p className="text-sm leading-relaxed">
          Vos données peuvent être traitées par les prestataires suivants, dans la
          limite nécessaire au fonctionnement du service :
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            <strong>Google</strong> : connexion OAuth (web et mobile), et Firebase
            Cloud Messaging pour les notifications push Android.
          </li>
          <li>
            <strong>Neon</strong> : hébergement de la base de données PostgreSQL.
          </li>
          <li>
            <strong>Expo (EAS)</strong> : infrastructure d&apos;envoi des notifications
            push mobiles.
          </li>
        </ul>
        <p className="text-sm leading-relaxed">
          Lorsque vous partagez une liste, les autres membres invités peuvent voir le
          contenu de cette liste et votre nom ou adresse e-mail affiché dans
          l&apos;interface.
        </p>
      </section>

      <section id="suppression-compte" className="space-y-3 scroll-mt-8">
        <h2 className="text-lg font-semibold text-gray-900">5. Suppression de compte</h2>
        <p className="text-sm leading-relaxed">
          Vous pouvez demander la suppression de votre compte et de l&apos;ensemble des
          données associées (listes, tâches, listes de courses, préférences,
          jetons de notification).
        </p>
        <p className="text-sm leading-relaxed">
          <strong>Procédure :</strong> envoyez un e-mail à{" "}
          <a
            href="mailto:r.rousset31@gmail.com?subject=Suppression%20de%20compte%20TodoList"
            className="text-gray-900 underline underline-offset-2 hover:text-gray-600"
          >
            r.rousset31@gmail.com
          </a>{" "}
          depuis l&apos;adresse liée à votre compte Google, avec l&apos;objet{" "}
          <strong>« Suppression de compte »</strong>. Nous traitons la demande sous
          30 jours.
        </p>
        <p className="text-sm leading-relaxed">
          <strong>Données supprimées :</strong> profil, contenus créés, partages,
          historique d&apos;activité, jetons push et abonnements Web Push.
        </p>
        <p className="text-sm leading-relaxed">
          <strong>Données conservées :</strong> aucune donnée personnelle n&apos;est
          conservée au-delà de ce qui est strictement nécessaire au traitement de la
          demande ; les journaux techniques sont purgés ou anonymisés dans un délai
          raisonnable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">6. Durée de conservation</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            Données de compte et contenus : conservées tant que votre compte est actif.
          </li>
          <li>
            Jetons push et abonnements Web Push : supprimés lors de la désactivation
            des notifications ou de la suppression du compte.
          </li>
          <li>
            Sessions : durée limitée conformément aux mécanismes d&apos;authentification.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">7. Sécurité</h2>
        <p className="text-sm leading-relaxed">
          Nous mettons en œuvre des mesures techniques raisonnables : connexion
          chiffrée (HTTPS), authentification sécurisée, accès aux listes contrôlé par
          identifiant utilisateur, limitation du débit sur l&apos;API. Aucun système
          n&apos;étant infaillible, nous ne pouvons garantir une sécurité absolue.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">8. Vos droits</h2>
        <p className="text-sm leading-relaxed">
          Conformément au Règlement général sur la protection des données (RGPD), vous
          disposez des droits d&apos;accès, de rectification, d&apos;effacement, de
          limitation, d&apos;opposition et de portabilité concernant vos données
          personnelles.
        </p>
        <p className="text-sm leading-relaxed">
          Pour exercer ces droits, contactez-nous à{" "}
          <a
            href="mailto:r.rousset31@gmail.com"
            className="text-gray-900 underline underline-offset-2 hover:text-gray-600"
          >
            r.rousset31@gmail.com
          </a>
          . Vous pouvez également introduire une réclamation auprès de la CNIL (
          <a
            href="https://www.cnil.fr"
            className="text-gray-900 underline underline-offset-2 hover:text-gray-600"
            rel="noopener noreferrer"
            target="_blank"
          >
            www.cnil.fr
          </a>
          ).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">9. Cookies et stockage local</h2>
        <p className="text-sm leading-relaxed">
          Le site utilise des cookies de session strictement nécessaires à
          l&apos;authentification. Les notifications Web Push reposent sur un service
          worker et un abonnement stocké côté navigateur, uniquement après votre
          accord explicite dans les réglages.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">10. Modifications</h2>
        <p className="text-sm leading-relaxed">
          Cette politique peut être mise à jour. La date de dernière révision est
          indiquée en haut de page. En cas de changement important, nous pourrons vous
          en informer via l&apos;application ou le site.
        </p>
      </section>

      <footer className="border-t border-gray-200 pt-6">
        <Link
          href="/"
          className="text-sm text-gray-600 underline underline-offset-2 hover:text-gray-900"
        >
          ← Retour à l&apos;accueil
        </Link>
      </footer>
    </article>
  );
}
