# Contrat du module `@repo/domain/offline`

Module en TypeScript pur : aucune dépendance à React, Expo ni au DOM. Les apps lui fournissent un stockage, un client d'envoi et une horloge.

## Interfaces fournies par l'app

```ts
interface OutboxStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
// Android : expo-sqlite/kv-store (même forme).  Web : adaptateur idb-keyval.

type SendOp = (op: OutboxOp) => Promise<void>;
// Appelle la procédure tRPC correspondant à op.kind (voir api.md). Lève l'erreur d'origine.
```

## API du module

| Fonction | Rôle |
|---|---|
| `createOutbox({ storage, send, userId, now? })` | Crée la file pour un utilisateur ; recharge l'état stocké. |
| `outbox.enqueue(op)` | Ajoute une opération (validée), la persiste **avant** de rendre la main. Refuse au-delà de 500 `pending`. |
| `outbox.flush()` | Envoie les `pending` dans l'ordre. Un seul envoi à la fois : un appel pendant un envoi attend ou est ignoré. |
| `outbox.pause()` / `outbox.resume()` | Gèle ou relance l'envoi (jeton expiré). |
| `outbox.getState()` / `outbox.subscribe(cb)` | `{ pending: n, rejected: [...], flushing, paused }` pour le bandeau d'état. |
| `outbox.dismissRejected(opId)` | Retire un refus après lecture par l'utilisateur. |
| `outbox.clear()` | Supprime tout (déconnexion). |
| `classifyError(err)` | Retourne `retry` \| `pause-auth` \| `reject` selon [api.md](./api.md). |

## Algorithme d'envoi

```text
flush():
  si déjà en cours, en pause ou aucun pending : sortir
  tant qu'il reste un pending (ordre de création) :
    op = premier pending ; op.attempts++
    essayer send(op)
      succès           : retirer op de la file
      classifyError :
        retry          : arrêter la boucle, planifier un nouveau flush (5 s, x2, plafond 5 min)
        pause-auth     : pause(), arrêter ; resume() par le renouvellement du jeton
        reject         : op.status = rejected, op.error = {code,message} ; continuer
  à la fin : notifier les abonnés ; l'app invalide les caches des listes touchées
```

## Déclencheurs d'envoi (dans chaque app)

1. Après `enqueue`, si le réseau est joignable.
2. Retour du réseau (`expo-network` / événement `online`).
3. App ramenée au premier plan.
4. Renouvellement du jeton après `pause-auth`.
5. Démarrage de l'app.

## Garanties testables

- **Persistance** : redémarrer entre `enqueue` et `flush` ne perd aucune opération.
- **Ordre** : les envois partent dans l'ordre de `enqueue`.
- **Isolation** : une opération d'un autre `userId` n'est jamais envoyée.
- **Non-perte** : une erreur `retry` ou `pause-auth` laisse l'opération en place.
- **Refus visibles** : une erreur `reject` n'arrête pas les suivantes et reste consultable.
- **Idempotence côté appel** : un même `opId` n'est jamais envoyé deux fois en parallèle.
