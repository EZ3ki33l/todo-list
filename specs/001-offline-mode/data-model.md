# Data Model: Mode hors-ligne

## Côté serveur (PostgreSQL)

Deux colonnes ajoutées, appliquées par `pnpm --filter @repo/db db:push` (le projet utilise `db push`, pas de migrations versionnées).

| Modèle | Champ ajouté | Type | Rôle |
|---|---|---|---|
| `ShoppingItem` | `lwwAt` | `DateTime @default(now())` | Instant du dernier changement **appliqué** à l'article, au sens « le plus récent gagne ». Distinct de `updatedAt`, réécrit par Prisma à chaque écriture. |
| `Action` | `lwwAt` | `DateTime @default(now())` | Idem pour une tâche (cochage). |

**Règles** :
- Toute écriture sur ces éléments pose `lwwAt = effectiveAt` (`min(clientAt, maintenant)`, ou maintenant si absent).
- Une opération dont `effectiveAt < lwwAt` est ignorée, sans erreur.
- Les lignes existantes prennent la date du `db push` comme `lwwAt` ; sans conséquence, aucune opération hors-ligne antérieure n'existe.
- Aucune autre table ne change. Les identifiants d'articles créés hors-ligne sont des UUID fournis par le client, stockés dans la colonne `id` (type `String`, déjà compatible).

## Côté appareil (Android et web)

### Opération en attente (`OutboxOp`)

| Champ | Type | Description |
|---|---|---|
| `opId` | UUID | Identifiant de l'opération elle-même (suivi, suppression). |
| `userId` | string | Propriétaire de la file. Une opération d'un autre utilisateur n'est jamais envoyée. |
| `kind` | `shopping.create` \| `shopping.update` \| `shopping.setChecked` \| `shopping.delete` \| `todo.setDone` | Types couverts par FR-002. |
| `listId` | string | Liste concernée (pour invalider le bon cache et afficher les refus). |
| `entityId` | string | Article ou tâche. Pour `shopping.create`, l'UUID généré par l'appareil. |
| `payload` | objet selon `kind` | Champs de l'article, `checked`, ou `done`. |
| `clientAt` | ISO 8601 | Instant du geste, base de « le plus récent gagne ». |
| `attempts` | entier | Nombre d'envois tentés. |
| `status` | `pending` \| `rejected` | `rejected` : refusée par le serveur, conservée pour affichage. |
| `error` | `{ code, message }?` | Renseigné si `rejected`. |

Plafond : 500 opérations `pending`. Au-delà, l'ajout est refusé avec un message (`shortcut: plafond fixe, à réévaluer si une vraie liste approche cette taille`).

### Transitions d'état

```text
        enqueue                    envoi OK
(nouvelle) ─────▶ pending ───────────────────▶ (supprimée de la file)
                    │  ▲
   réseau/5xx/      │  │ réessai (attente croissante 5 s → 5 min)
   délai            ▼  │
                 (reste pending)
                    │
   UNAUTHORIZED     ▼
              pending, file en pause ──▶ reprise après renouvellement du jeton

   FORBIDDEN / BAD_REQUEST / CONFLICT / liste introuvable
                    ▼
                 rejected ──▶ (l'utilisateur l'ignore ➜ supprimée)
```

### Copie locale d'une liste

Pas de modèle propre : c'est l'entrée du cache TanStack Query persisté (clés tRPC `shoppingLists.getById`, `shoppingItems.getByList`, `actions.getByList`, …), avec son horodatage `dataUpdatedAt` utilisé comme « dernière synchronisation ». Le cache est mis à jour **immédiatement** à chaque geste (mise à jour optimiste) pour tenir SC-003.

### Clés de stockage

| Clé | Contenu |
|---|---|
| `todolist.query-cache.v1` | Cache de requêtes persisté (version dans la clé = `buster`). |
| `todolist.outbox.v1` | Tableau d'`OutboxOp` (`pending` et `rejected`). |

Les deux clés sont supprimées à la déconnexion (R-10).
