# Research: Mode hors-ligne

Aucune clarification ouverte ne subsiste dans le spec. Cette recherche tranche les choix techniques demandés par le plan.

## R-01 — Persistance du cache de lecture

- **Decision**: `PersistQueryClientProvider` (`@tanstack/react-query-persist-client`) avec `createAsyncStoragePersister`. Le `QueryClient` existant reste en place. Seules les requêtes utiles sont sauvegardées (`shoppingLists.*`, `shoppingItems.getByList`, `lists.*`, `actions.getByList`, `auth.me`), pas le Chef IA, les recettes ni le catalogue.
- **Rationale**: les écrans lisent déjà via `trpc.*.useQuery` ; la persistance rend la lecture hors-ligne sans réécrire les composants. Point d'attention vérifié dans l'usage de TanStack : `gcTime` du client doit être **au moins égal** à `maxAge` du persisteur, sinon les données sont ramassées avant d'être sauvegardées. Réglage retenu : 30 jours pour les deux.
- **Alternatives considered**: base locale relationnelle (SQLite + schéma miroir) : refait toute la couche de données, hors proportion pour des listes de quelques dizaines d'éléments. Cache HTTP seul : ne couvre pas les requêtes groupées en POST/GET tRPC de façon fiable.

## R-02 — Stockage local

- **Decision**: Android : `expo-sqlite/kv-store`. Web : IndexedDB via `idb-keyval`.
- **Rationale**: la doc Expo indique que `expo-sqlite/kv-store` est un remplaçant direct d'`@react-native-async-storage/async-storage` (mêmes `getItem`/`setItem`/`removeItem`, avec des variantes synchrones) et il est lisible par un futur widget via la même base. Il évite une bibliothèque tierce native de plus. `expo-secure-store`, déjà installé, est inadapté : prévu pour de petits secrets. `localStorage` web est limité à environ 5 Mo et synchrone ; IndexedDB convient mieux au cache.
- **Alternatives considered**: `@react-native-async-storage/async-storage` (dépendance native supplémentaire, aucun gain), `react-native-mmkv` (rapide mais impose un module natif tiers).

## R-03 — Règle « le plus récent gagne »

- **Decision**: chaque opération porte `clientAt` (heure du geste sur l'appareil). Le serveur calcule `effectiveAt = min(clientAt, maintenant)` et compare à la colonne `lwwAt` de l'élément. Si `effectiveAt < lwwAt`, l'opération est ignorée (succès sans effet). Sinon elle est appliquée et `lwwAt = effectiveAt`. Les appels sans `clientAt` (anciennes versions, web en ligne) utilisent l'heure courante.
- **Rationale**: `updatedAt` est réécrit par Prisma à chaque écriture. Scénario faussé : A coche à 10:00 hors-ligne, B coche à 10:30 hors-ligne. A se synchronise à 11:00 (`updatedAt` = 11:00), puis B à 11:05 : avec `updatedAt` B perd alors que son geste est plus récent. Avec `lwwAt` : A pose 10:00, B (10:30 ≥ 10:00) gagne. Granularité par élément, conforme à la décision « par élément ».
- **Alternatives considered**: horloges logiques/CRDT (disproportionné), « le serveur gagne » (refusé par toi), fusion par champ (refusée).
- **Limite assumée**: horloge du téléphone supposée correcte à quelques secondes près (R2 du plan).

## R-04 — Rejeu sans effet de bord (idempotence)

- **Decision**:
  - `create` : accepte un `id` UUID fourni par le client. Rejouer avec le même `id` et la même liste renvoie l'article existant ; un `id` existant dans une autre liste donne `CONFLICT`.
  - `toggle` → nouvelles `setChecked({ itemId, checked })` et `setDone({ actionId, done })` : l'état voulu est explicite, rejouer ne l'inverse pas. `toggle` est conservé pour les versions déjà publiées.
  - `delete` : un élément déjà absent est un succès.
- **Rationale**: aujourd'hui `shoppingItems.toggle` inverse l'état (`!item.checked`) et `create` génère l'identifiant côté serveur : un envoi réessayé après un délai d'attente dupliquerait un article ou annulerait un cochage (SC-004). `actions.toggle` passe par `performActionToggle` qui calcule déjà l'état effectif ; `setDone` réutilise cette logique et ne fait rien si l'état voulu est déjà atteint, ce qui évite aussi de compter deux fois une série récurrente.
- **Note de sécurité**: un `delete` sur un identifiant absent répond « succès » sans vérification d'accès. Les identifiants étant des UUID/cuid non devinables, la fuite d'information (existence d'un identifiant) est négligeable ; tout élément **existant** reste soumis à la vérification de droits.

## R-05 — File d'envoi : maison ou mutations TanStack en pause

- **Decision**: file maison, pure, dans `packages/domain/src/offline/`.
- **Rationale**: voir « Complexity Tracking » du plan. Points déterminants : exécution possible hors React (widget `004`), ordre FIFO garanti, état « refusé » conservé et affichable, logique testable avec vitest sans renderer.
- **Alternatives considered**: mutations en pause de TanStack avec `setMutationDefaults` et `scope` : viable mais couple la file au `QueryClient` et perd les échecs. Service worker Background Sync (web) : non disponible sur tous les navigateurs et inutile côté Android.

## R-06 — Détection du réseau

- **Decision**: Android : `expo-network` (`addNetworkStateListener`, `getNetworkStateAsync`, champ `isInternetReachable`) branché sur `onlineManager` de TanStack. Web : événements `online`/`offline` du navigateur, déjà utilisés par TanStack.
- **Rationale**: sur Android, `isInternetReachable` exige un accès confirmé (capacité validée), ce qui gère le Wi-Fi captif de certains magasins. L'état n'est qu'un indice : la file ne se fie pas à lui seul et classe les échecs réels (R-07).
- **Alternatives considered**: `@react-native-community/netinfo` : équivalent, mais module tiers supplémentaire.

## R-07 — Classes d'erreur au rejeu

- **Decision**: voir [contracts/outbox.md](./contracts/outbox.md). Réseau, délai dépassé et 5xx : on arrête et on réessaie plus tard, rien n'est perdu. `UNAUTHORIZED` : file mise en pause, jeton renouvelé par le mécanisme existant (`ClerkSessionBridge`), reprise ensuite. `FORBIDDEN`, `BAD_REQUEST`, `CONFLICT`, liste introuvable : l'opération est **refusée** et conservée dans une liste visible ; les suivantes continuent.
- **Rationale**: respecte « jamais perdue en silence » et FR-005 (rôle invité refusé à l'envoi).

## R-08 — Démarrage à froid sans réseau (Android)

- **Decision**: la session API est déjà lue en stockage local (`AuthProvider`), et `useMeValidation` ne déconnecte que sur `UNAUTHORIZED` : un échec réseau n'est donc pas bloquant côté code. Le jeton API vit 30 jours (`jwt.ts`), cohérent avec la rétention du cache.
- **Reste à vérifier sur appareil** (tâche 0, pas de conclusion possible par lecture du code) : que `ClerkProvider` ne retarde pas l'affichage sans réseau. Les gardes `AuthGuard` ne dépendent de Clerk que pour `pendingApiExchange`, qui exige un utilisateur Clerk chargé et pas de jeton API.

## R-09 — Web : rechargement hors-ligne

- **Decision**: étendre `apps/web/public/sw.js` (aujourd'hui limité aux notifications push) pour précacher les ressources statiques `/_next/static/**` et une route `/offline`. Cette page est une **coquille cliente** sans donnée serveur ; elle lit le cache IndexedDB et réutilise `ShoppingListDetail`, déjà un composant client alimenté par `trpc.*.useQuery`. Une navigation échouée vers `/dashboard/**` est redirigée vers `/offline`.
- **Rationale**: les pages `/dashboard/**` sont rendues côté serveur avec redirection d'authentification (`getAppUser`, `proxy.ts`) : sans réseau elles ne se chargent pas, et on ne veut pas mettre du HTML personnel en cache navigateur.
- **À traiter en J2**: `lists/[listId]/page.tsx` fournit les tâches par props serveur (`initialActions`) ; elles doivent aussi pouvoir se lire via `trpc.actions.getByList`. Le jeton API du web n'est **pas** persisté (récupéré via `/api/auth/trpc-token` au retour du réseau) pour ne pas stocker un secret dans IndexedDB.
- **Alternatives considered**: bibliothèque PWA (Serwist/Workbox) : plus de dépendances et de configuration que nécessaire pour deux besoins précis ; à reconsidérer si le service worker grossit.

## R-10 — Purge à la déconnexion

- **Decision**: `signOut` (natif : `AuthProvider.signOut` ; web : déconnexion Clerk) vide le cache persistant, la file, la liste des refusés et, sur le web, les caches du service worker.
- **Rationale**: exigence de confidentialité non couverte par le spec ; à ajouter (FR-011).
