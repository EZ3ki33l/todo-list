# Quickstart: valider le mode hors-ligne

## Prérequis

- Une branche dédiée depuis `main` à jour (règle du dépôt) : `git checkout main && git pull && git checkout -b feat/offline-mode`.
- `pnpm install` ; `DATABASE_URL` vers une base de développement (jamais la production) dans `packages/db/.env`.
- Appliquer le schéma : `pnpm --filter @repo/db db:push`.
- Deux comptes de test et une liste de courses partagée entre eux.
- Pour Android : un build de développement EAS (nouveaux modules natifs `expo-sqlite`, `expo-network`).

## 1. Tests automatisés (sans appareil)

```bash
pnpm --filter @repo/domain test    # file : persistance, ordre, isolation, non-perte, refus
pnpm --filter @repo/api test       # idempotence, LWW, rôle invité, anciennes procédures
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter @repo/api typecheck
pnpm --filter native exec tsc --noEmit   # le package natif n'a pas de script typecheck
```

Attendu : tout passe. Les tests de routeur couvrent notamment : rejouer `create` avec le même `id` ne crée qu'un article ; `setChecked` rejoué ne change rien ; une opération plus ancienne que `lwwAt` est ignorée ; un `invité` reçoit `FORBIDDEN`.

## 2. Spike Clerk (tâche 0, avant tout développement)

1. Se connecter, ouvrir une liste de courses, fermer l'app.
2. Passer en mode avion, **tuer** l'app, la relancer.
3. Attendu : l'écran des listes s'affiche et aucune déconnexion n'a lieu. Sinon : voir risque R1 du plan.

## 3. Scénarios sur appareil (Android)

| # | Scénario | Résultat attendu | Spec |
|---|---|---|---|
| A | Ouvrir une liste en ligne, mode avion, relancer l'app | Liste et articles affichés en moins de 2 s | US1, SC-001 |
| B | Liste jamais ouverte, hors-ligne | Message « non disponible hors-ligne », pas d'écran vide | US1 §2 |
| C | Hors-ligne : ajouter 2 articles, en cocher 3 | Visibles immédiatement (moins de 300 ms) ; bandeau « 5 en attente » | US2, US3, SC-003 |
| D | Fermer l'app avec des changements en attente, la rouvrir | Les 5 changements sont toujours là | FR-003 |
| E | Rétablir le réseau | Compteur à 0 ; changements visibles sur le second appareil | US2, SC-002 |
| F | Couper/rétablir le réseau 3 fois pendant un envoi | Aucun doublon d'article | SC-004 |
| G | Compte `invité` : tenter de modifier hors-ligne | Édition impossible, comme en ligne | US2 §3, FR-005 |
| H | Deux appareils, articles différents modifiés hors-ligne | Les deux changements conservés | US4 §1 |
| I | Deux appareils, **même** article, l'un à 10:00 l'autre à 10:30, synchro dans l'ordre inverse | Le geste de 10:30 gagne | US4 §2, FR-007 |
| J | Un article supprimé par l'autre, puis édité hors-ligne | Changement refusé, signalé sans blocage | US4 §3 |
| K | Cocher une tâche récurrente hors-ligne puis synchroniser | Série comptée une seule fois | Cas limites |
| L | Retirer l'accès à la liste côté serveur, puis synchroniser | Opération « refusée », message visible | Cas limites |
| M | Se déconnecter | Cache local et file vidés ; reconnexion avec un autre compte sans trace du premier | R-10 |
| N | Actions réseau (partage, Chef IA, créer une liste, réordonner) | Désactivées avec un message clair | FR-009 |

## 4. Scénarios web (jalon J2)

Mêmes scénarios A à N dans un navigateur, avec « Hors connexion » activé dans les outils de développement, plus :

- Recharger la page hors-ligne sur `/dashboard/shopping/<id>` : la coquille `/offline` s'affiche avec les données locales.
- Après déconnexion, les caches du service worker et IndexedDB sont vides.

## 5. Compatibilité

Installer une ancienne version de l'app (avant J1) face au serveur mis à jour : cocher un article doit toujours fonctionner (`toggle` conservé).
