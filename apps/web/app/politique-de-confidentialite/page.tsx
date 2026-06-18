import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité de TodoList by EZ3 : données collectées, finalités, sous-traitants et droits des utilisateurs.",
};

const LAST_UPDATED = "15 juin 2026";

export default function PolitiqueConfidentialitePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 text-app-text">
      <header className="space-y-2 border-b border-app-border-soft pb-6">
        <p className="text-sm text-app-text-subtle">Dernière mise à jour : {LAST_UPDATED}</p>
        <h1 className="text-2xl font-semibold text-app-text">
          Politique de confidentialité
        </h1>
        <p className="text-sm leading-relaxed">
          La présente politique décrit comment l&apos;application{" "}
          <strong>TodoList by EZ3</strong> (site web et application mobile Android)
          traite vos données personnelles. Elle s&apos;applique au service accessible
          sur{" "}
          <a
            href="https://todolist.ez3ki33l.ovh"
            className="text-app-text underline underline-offset-2 hover:text-app-text"
          >
            todolist.ez3ki33l.ovh
          </a>{" "}
          et dans l&apos;application mobile associée.
        </p>
        <p className="text-sm leading-relaxed">
          En créant un compte, vous confirmez avoir lu la présente politique. Lors de
          l&apos;inscription, une case à cocher vous demande votre consentement exprès
          avant la création du compte.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-text">1. Responsable du traitement</h2>
        <p className="text-sm leading-relaxed">
          Le service est édité par <strong>EZ3ki33l</strong> (développeur indépendant).
        </p>
        <p className="text-sm leading-relaxed">
          Contact :{" "}
          <a
            href="mailto:r.rousset31@gmail.com"
            className="text-app-text underline underline-offset-2 hover:text-app-text"
          >
            r.rousset31@gmail.com
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-text">2. Données collectées</h2>
        <p className="text-sm leading-relaxed">
          Dans le cadre de l&apos;utilisation du service, nous traitons les catégories
          de données suivantes :
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            <strong>Données de compte</strong> : nom, adresse e-mail et photo de profil
            fournis lors de l&apos;inscription ou de la connexion (e-mail et mot de
            passe, ou connexion avec Google via notre prestataire Clerk).
          </li>
          <li>
            <strong>Identifiants d&apos;authentification</strong> : identifiant
            utilisateur Clerk, jetons de session (site web et application mobile) et
            jeton d&apos;accès à l&apos;API, nécessaires pour maintenir votre connexion
            de façon sécurisée.
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
            <strong>Données techniques</strong> : adresse IP approximative lors des
            appels à l&apos;API (sécurité et limitation de débit), journaux techniques
            limités (diagnostic d&apos;erreurs).
          </li>
        </ul>
        <p className="text-sm leading-relaxed">
          Si vous choisissez <strong>« Continuer avec Google »</strong>, Google peut
          nous transmettre (via Clerk) votre adresse e-mail, votre nom et votre photo
          de profil associés à votre compte Google, conformément aux paramètres de
          votre compte Google et à la{" "}
          <a
            href="https://policies.google.com/privacy"
            className="text-app-text underline underline-offset-2 hover:text-app-text"
            rel="noopener noreferrer"
            target="_blank"
          >
            politique de confidentialité de Google
          </a>
          .
        </p>
        <p className="text-sm leading-relaxed">
          Nous ne vendons pas vos données et ne les utilisons pas à des fins
          publicitaires.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-text">3. Finalités et bases légales</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            <strong>Fourniture du service</strong> (exécution du contrat) : créer et
            synchroniser vos listes, partager avec d&apos;autres utilisateurs,
            afficher votre tableau de bord.
          </li>
          <li>
            <strong>Authentification</strong> (exécution du contrat) : création de
            compte, connexion (e-mail, mot de passe ou Google), maintien de votre
            session sur le web et le mobile.
          </li>
          <li>
            <strong>Consentement exprès</strong> (article 6.1.a RGPD) : acceptation de
            la présente politique lors de l&apos;inscription, matérialisée par la case
            à cocher affichée avant la création du compte.
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
          <li>
            <strong>Suggestions « Idées repas »</strong> (exécution du contrat /
            intérêt légitime) : envoi des intitulés d&apos;articles de votre liste de
            courses au prestataire d&apos;IA uniquement lorsque vous utilisez cette
            fonctionnalité.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-text">4. Partage et sous-traitants</h2>
        <p className="text-sm leading-relaxed">
          Vos données peuvent être traitées par les prestataires suivants, dans la
          limite nécessaire au fonctionnement du service :
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            <strong>Clerk</strong> (Clerk, Inc.) : authentification et gestion de
            session sur le site web et l&apos;application mobile.{" "}
            <a
              href="https://clerk.com/privacy"
              className="text-app-text underline underline-offset-2 hover:text-app-text"
              rel="noopener noreferrer"
              target="_blank"
            >
              Politique Clerk
            </a>
          </li>
          <li>
            <strong>Google</strong> : connexion optionnelle avec un compte Google
            (OAuth) et, le cas échéant, Firebase Cloud Messaging pour les notifications
            push Android.
          </li>
          <li>
            <strong>Neon</strong> : hébergement de la base de données PostgreSQL
            (données de compte et contenus créés).
          </li>
          <li>
            <strong>Expo (EAS)</strong> : infrastructure d&apos;envoi des notifications
            push mobiles.
          </li>
          <li>
            <strong>Mistral AI</strong> : génération optionnelle de suggestions de
            plats à partir des articles de vos listes de courses (uniquement si vous
            utilisez la fonctionnalité « Idées repas »).
          </li>
        </ul>
        <p className="text-sm leading-relaxed">
          Certains de ces prestataires peuvent être situés hors de l&apos;Union
          européenne (notamment aux États-Unis). Lorsque c&apos;est le cas, les
          transferts reposent sur les garanties appropriées prévues par le RGPD (clauses
          contractuelles types ou décisions d&apos;adéquation, selon les prestataires).
        </p>
        <p className="text-sm leading-relaxed">
          Lorsque vous partagez une liste, les autres membres invités peuvent voir le
          contenu de cette liste et votre nom ou adresse e-mail affiché dans
          l&apos;interface.
        </p>
      </section>

      <section id="suppression-compte" className="space-y-3 scroll-mt-8">
        <h2 className="text-lg font-semibold text-app-text">5. Suppression de compte</h2>
        <p className="text-sm leading-relaxed">
          Vous pouvez demander la suppression de votre compte et de l&apos;ensemble des
          données associées (listes, tâches, listes de courses, préférences,
          jetons de notification).
        </p>
        <p className="text-sm leading-relaxed">
          <strong>Procédure :</strong> envoyez un e-mail à{" "}
          <a
            href="mailto:r.rousset31@gmail.com?subject=Suppression%20de%20compte%20TodoList"
            className="text-app-text underline underline-offset-2 hover:text-app-text"
          >
            r.rousset31@gmail.com
          </a>{" "}
          depuis l&apos;adresse liée à votre compte, avec l&apos;objet{" "}
          <strong>« Suppression de compte »</strong>. Nous traitons la demande sous
          30 jours et supprimons également le compte côté Clerk lorsque cela est
          applicable.
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
        <h2 className="text-lg font-semibold text-app-text">6. Durée de conservation</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            Données de compte et contenus : conservées tant que votre compte est actif.
          </li>
          <li>
            Jetons push et abonnements Web Push : supprimés lors de la désactivation
            des notifications ou de la suppression du compte.
          </li>
          <li>
            Sessions et jetons d&apos;accès : durée limitée ; sur mobile, le jeton
            d&apos;accès est stocké de façon chiffrée dans l&apos;espace sécurisé de
            l&apos;appareil (Secure Store) jusqu&apos;à déconnexion ou suppression du
            compte.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-text">7. Sécurité</h2>
        <p className="text-sm leading-relaxed">
          Nous mettons en œuvre des mesures techniques raisonnables : connexion
          chiffrée (HTTPS), authentification déléguée à Clerk, jetons d&apos;accès à
          durée limitée, accès aux listes contrôlé par identifiant utilisateur,
          limitation du débit sur l&apos;API. Aucun système n&apos;étant infaillible,
          nous ne pouvons garantir une sécurité absolue.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-text">8. Vos droits</h2>
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
            className="text-app-text underline underline-offset-2 hover:text-app-text"
          >
            r.rousset31@gmail.com
          </a>
          . Vous pouvez également introduire une réclamation auprès de la CNIL (
          <a
            href="https://www.cnil.fr"
            className="text-app-text underline underline-offset-2 hover:text-app-text"
            rel="noopener noreferrer"
            target="_blank"
          >
            www.cnil.fr
          </a>
          ).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-text">
          9. Cookies, stockage local et traceurs
        </h2>
        <p className="text-sm leading-relaxed">
          Le site utilise des cookies et technologies similaires strictement
          nécessaires à l&apos;authentification, gérés par Clerk (session, sécurité).
          Nous n&apos;utilisons pas de cookies publicitaires ou de mesure d&apos;audience
          tiers sur le site.
        </p>
        <p className="text-sm leading-relaxed">
          Les notifications Web Push reposent sur un service worker et un abonnement
          stocké côté navigateur, uniquement après votre accord explicite dans les
          réglages.
        </p>
        <p className="text-sm leading-relaxed">
          Sur l&apos;application mobile Android, les jetons de session sont stockés dans
          le stockage sécurisé de l&apos;appareil ; aucun cookie navigateur n&apos;est
          utilisé dans l&apos;app native.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-text">10. Modifications</h2>
        <p className="text-sm leading-relaxed">
          Cette politique peut être mise à jour. La date de dernière révision est
          indiquée en haut de page. En cas de changement important, nous pourrons vous
          en informer via l&apos;application ou le site.
        </p>
      </section>

      <footer className="border-t border-app-border-soft pt-6">
        <Link
          href="/"
          className="text-sm text-app-text-muted underline underline-offset-2 hover:text-app-text"
        >
          ← Retour à l&apos;accueil
        </Link>
      </footer>
    </article>
  );
}
