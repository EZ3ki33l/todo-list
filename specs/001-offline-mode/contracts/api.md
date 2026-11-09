# Contrat API tRPC — rejeu et « le plus récent gagne »

Toutes les procédures restent `protectedProcedure`. Les droits sont revérifiés à **chaque** appel, y compris pour un rejeu (FR-005). Les schémas zod vivent dans `packages/api/src/schemas.ts`.

Champ commun : `clientAt?: string` (ISO 8601). Absent : le serveur utilise l'heure courante. Présent : `effectiveAt = min(clientAt, maintenant)`.

Règle LWW commune (`packages/api/src/lib/lww.ts`) :

```text
applique si effectiveAt >= element.lwwAt, puis lwwAt = effectiveAt
sinon : rien n'est écrit, la procédure répond avec l'état actuel de l'élément (succès)
```

## Articles de courses (`shoppingItems`)

| Procédure | État | Entrée | Sortie | Rejeu |
|---|---|---|---|---|
| `create` | modifiée | existant + `id?: uuid`, `clientAt?` | l'article | Même `id` et même liste : renvoie l'article existant sans doublon. `id` existant dans une autre liste : `CONFLICT`. Sans `id` : comportement actuel. |
| `update` | modifiée | existant + `clientAt?` | l'article | LWW. Élément absent : `NOT_FOUND` (une édition sur un article supprimé est un refus signalé, pas une erreur technique). |
| `setChecked` | **nouvelle** | `{ itemId, checked: boolean, clientAt? }` | l'article | État explicite, LWW. Rejouer ne change rien. |
| `toggle` | **inchangée, dépréciée** | `{ itemId }` | l'article | Non rejouable. Conservée pour les versions déjà publiées ; plus utilisée par les apps après J1. |
| `delete` | modifiée | `{ itemId, clientAt? }` | `void` | Élément absent : succès. Élément modifié après `clientAt` (LWW) : ignoré. Élément existant : droits vérifiés. |
| `clearChecked`, `reorder` | inchangées | — | — | Réservées au réseau (non mises en file). |

## Tâches (`actions`)

| Procédure | État | Entrée | Sortie | Rejeu |
|---|---|---|---|---|
| `setDone` | **nouvelle** | `{ actionId, done: boolean, clientAt? }` | identique à `toggle` (`ToggleActionResult`) | Si l'état effectif demandé est déjà atteint : aucun effet, y compris sur la série. LWW sur `lwwAt`. Droits : rôle `membre` ou propriétaire, comme `toggle`. |
| `toggle` | **inchangée, dépréciée** | `{ actionId }` | `ToggleActionResult` | Non rejouable ; conservée pour les versions publiées. |
| `create`, `update`, `delete`, `reorder` | inchangées | — | — | Réservées au réseau. |

## Codes d'erreur sur lesquels s'appuie la file

| Code tRPC | Quand | Traitement côté file |
|---|---|---|
| `UNAUTHORIZED` | jeton expiré ou invalide | pause, renouvellement du jeton, reprise |
| `FORBIDDEN` | rôle `invité`, accès retiré | opération `rejected` |
| `NOT_FOUND` | liste introuvable, ou `update` sur article supprimé | opération `rejected` |
| `CONFLICT` | `id` d'article déjà pris par une autre liste | opération `rejected` |
| `BAD_REQUEST` | validation zod | opération `rejected` |
| `INTERNAL_SERVER_ERROR`, réseau, délai | panne temporaire | réessai |

## Compatibilité

- Aucune procédure existante n'est retirée ni ne change de forme de réponse.
- Ordre de déploiement : serveur (PR 1) en production → build Android. Une app récente face à un serveur ancien échouerait sur `setChecked`/`setDone` ; une app ancienne face au nouveau serveur continue de fonctionner via `toggle`.
