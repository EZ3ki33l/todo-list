# Feature Specification: Mode hors-ligne (courses et tâches)

**Feature Branch**: `feat/offline-mode`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "En magasin, souvent sans réseau, la liste de courses doit s'ouvrir et rester utilisable. Les ajouts et cochages faits hors-ligne ne doivent pas être perdus."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulter mes listes sans réseau (Priority: P1)

Je ferme l'app avec du réseau, je me retrouve en sous-sol de supermarché sans réseau, je rouvre l'app : mes listes de courses et mes tâches s'affichent comme à ma dernière synchronisation.

**Why this priority**: c'est le blocage n°1 face à Bring! : sans cela, la liste est inutilisable au moment où on en a besoin.

**Independent Test**: ouvrir l'app en ligne, passer en mode avion, tuer et relancer l'app. Les listes et leurs articles s'affichent.

**Acceptance Scenarios**:

1. **Given** j'ai ouvert ma liste de courses en ligne, **When** je relance l'app sans réseau, **Then** la liste et ses articles s'affichent.
2. **Given** je n'ai jamais ouvert une liste sur cet appareil, **When** je suis hors-ligne, **Then** l'app m'indique que cette liste n'est pas disponible hors-ligne plutôt qu'un écran vide ou une erreur technique.

---

### User Story 2 - Cocher, ajouter, modifier hors-ligne (Priority: P1)

Hors-ligne, je coche des articles, j'en ajoute, je coche des tâches. Au retour du réseau, tout est envoyé sans que j'aie rien à faire.

**Why this priority**: consulter sans pouvoir agir ne suffit pas pour faire ses courses.

**Independent Test**: en mode avion, ajouter 2 articles et en cocher 3, puis rétablir le réseau. Les changements apparaissent sur un second appareil.

**Acceptance Scenarios**:

1. **Given** je suis hors-ligne sur une liste de courses, **When** j'ajoute un article, **Then** il apparaît immédiatement dans ma liste.
2. **Given** j'ai des changements en attente, **When** le réseau revient, **Then** ils sont envoyés dans l'ordre où je les ai faits.
3. **Given** je suis `invité` (lecture seule) sur une liste, **When** je suis hors-ligne, **Then** je ne peux pas la modifier, comme en ligne.

---

### User Story 3 - Savoir où j'en suis (Priority: P2)

Je vois à tout moment si l'app est hors-ligne et si des changements attendent d'être envoyés.

**Why this priority**: sans retour visuel, on ne sait pas si l'ajout a « pris ».

**Independent Test**: passer hors-ligne, faire un changement, observer l'indicateur, rétablir le réseau, observer sa disparition.

**Acceptance Scenarios**:

1. **Given** je suis hors-ligne, **When** je regarde l'écran, **Then** un indicateur discret le signale.
2. **Given** des changements sont en attente, **When** je regarde l'écran, **Then** leur nombre est visible.

---

### User Story 4 - Liste partagée modifiée par quelqu'un d'autre (Priority: P3)

Pendant que je suis hors-ligne, mon conjoint ajoute et coche des articles sur la même liste. À mon retour en ligne, les deux séries de changements sont conservées.

**Why this priority**: cas réel pour un foyer, mais moins fréquent que l'usage solo.

**Independent Test**: deux appareils sur la même liste ; l'un hors-ligne ajoute un article, l'autre en coche un autre ; après reconnexion, les deux changements sont présents.

**Acceptance Scenarios**:

1. **Given** deux membres modifient des articles différents, **When** le premier se reconnecte, **Then** les deux changements sont conservés.
2. **Given** les deux modifient le même article, **When** le premier se reconnecte, **Then** le changement le plus récent l'emporte.
3. **Given** un article a été supprimé par quelqu'un d'autre, **When** mon changement hors-ligne le concerne, **Then** le changement est ignoré sans erreur bloquante.

### Edge Cases

- Que se passe-t-il si l'envoi échoue au retour du réseau (serveur indisponible) ? Les changements restent en attente et sont retentés.
- Que se passe-t-il si mon accès à la liste a été retiré pendant que j'étais hors-ligne ? Les changements concernés sont refusés par le serveur et je suis informé que la liste n'est plus accessible.
- Que se passe-t-il si la session expire hors-ligne ? Les changements restent en attente jusqu'à la reconnexion.
- Que se passe-t-il si je me déconnecte alors que des changements sont en attente ? Ils sont effacés avec le reste (FR-011) ; l'app prévient avant la déconnexion s'il en reste.
- Que se passe-t-il pour une tâche récurrente cochée hors-ligne ? La série ne doit être comptée qu'une fois par période.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST afficher les listes de courses et de tâches déjà consultées lorsque l'appareil n'a pas de réseau.
- **FR-002**: Les utilisateurs MUST pouvoir, hors-ligne, ajouter, cocher/décocher, modifier et supprimer des articles de courses, et cocher/décocher des tâches.
- **FR-003**: Le système MUST conserver les changements faits hors-ligne même si l'app est fermée ou redémarrée, jusqu'à leur envoi.
- **FR-004**: Le système MUST envoyer automatiquement les changements en attente au retour du réseau, dans l'ordre de leur création.
- **FR-005**: Le système MUST refuser, hors-ligne comme en ligne, les modifications d'un utilisateur `invité`, et le serveur MUST revérifier les droits à l'envoi.
- **FR-006**: Le système MUST indiquer l'état hors-ligne et le nombre de changements en attente.
- **FR-007**: Le système MUST fusionner les changements concurrents sur des éléments différents et appliquer « le plus récent gagne » sur un même élément.
- **FR-008**: Le système MUST ne pas dupliquer un ajout lorsqu'un envoi est retenté.
- **FR-009**: Les actions qui exigent le réseau (partage de liste, Chef IA, création ou suppression de liste, catalogue de recettes, réorganisation des éléments, suppression des articles cochés en une fois, création, modification ou suppression d'une tâche) MUST être désactivées hors-ligne avec un message clair.
- **FR-010**: Les exigences FR-001 à FR-009 MUST s'appliquer à l'app Android et au site web, y compris après fermeture et réouverture du navigateur.
- **FR-011**: À la déconnexion, le système MUST effacer de l'appareil les copies locales des listes et les changements en attente ou refusés, de sorte qu'un autre compte ne retrouve aucune donnée du précédent.

### Key Entities

- **Changement en attente**: une modification faite hors-ligne (ajout, cochage, édition, suppression), avec la liste concernée, l'élément, l'instant de création et son état (en attente, envoyé, refusé).
- **Copie locale d'une liste**: la dernière version connue d'une liste et de ses éléments, avec l'instant de dernière synchronisation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Une liste déjà consultée s'affiche en moins de 2 secondes sans réseau.
- **SC-002**: 100 % des changements faits hors-ligne sont retrouvés sur un second appareil après retour du réseau, dans le cas d'un seul auteur.
- **SC-003**: Un cochage hors-ligne est visible à l'écran en moins de 300 ms.
- **SC-004**: Aucun doublon d'article après 3 retours réseau instables consécutifs.

## Assumptions

- **[Décidé]** Périmètre : **Android et web**. Le comportement hors-ligne est identique sur les deux, avec la même règle de conflit.
- **[Décidé]** Pas de création ni de suppression de listes hors-ligne : seulement des changements dans le contenu de listes existantes.
- **[Décidé]** Conflit sur un même élément : le changement le plus récent gagne.
- **[Mon choix]** Les listes jamais ouvertes sur l'appareil ne sont pas disponibles hors-ligne ; pas de téléchargement préventif de toutes les listes.
- **[Mon choix]** La copie locale est conservée 30 jours après la dernière synchronisation, durée de validité de la session de l'API : au-delà, les données ne pourraient de toute façon plus être synchronisées.
- **[Mon choix]** Livraison en deux temps : Android d'abord (nécessaire au widget `004`), puis web, sous la même spec. Le plan décidera si c'est un ou deux jalons.
- Les droits d'accès existants (`todo-list-access`, `shopping-list-access`) sont réutilisés tels quels.
- Ce chantier est la base du widget (`004`).
