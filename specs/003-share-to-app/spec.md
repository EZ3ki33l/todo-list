# Feature Specification: Partage vers l'app

**Feature Branch**: `feat/share-to-app`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Depuis une autre app (messages, notes, navigateur), envoyer du texte vers mon app pour en faire des articles de courses."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Envoyer du texte vers une liste de courses (Priority: P1)

Mon conjoint m'envoie un message « lait, œufs, 2 kg de pommes de terre ». Je sélectionne le texte, je choisis « Partager » puis l'app. Je vois les articles reconnus, je choisis la liste, je valide.

**Why this priority**: c'est le geste le plus fréquent de Bring! : alimenter la liste sans ouvrir l'app et sans retaper.

**Independent Test**: depuis une app de notes, partager un texte de 3 lignes vers l'app et vérifier que 3 articles sont ajoutés à la liste choisie.

**Acceptance Scenarios**:

1. **Given** je partage un texte multi-lignes, **When** l'app s'ouvre, **Then** chaque ligne est proposée comme un article, avec quantité et unité reconnues quand elles sont présentes.
2. **Given** les articles proposés, **When** je décoche l'un d'eux et je valide, **Then** seuls les articles cochés sont ajoutés.
3. **Given** j'ai plusieurs listes de courses, **When** l'écran de partage s'ouvre, **Then** ma liste personnelle est présélectionnée et je peux en choisir une autre.
4. **Given** je suis `invité` (lecture seule) sur une liste, **When** je choisis la cible, **Then** cette liste n'est pas proposée.

---

### User Story 2 - Corriger avant d'ajouter (Priority: P1)

Avant de valider, je peux modifier le nom, la quantité et la catégorie d'un article proposé, ou en retirer.

**Why this priority**: un texte libre est mal reconnu parfois ; sans correction, l'utilisateur ajoute des articles faux puis doit les réparer.

**Independent Test**: partager « 2 pommes, truc », corriger « truc » en « poireaux », valider, vérifier la liste.

**Acceptance Scenarios**:

1. **Given** un article mal reconnu, **When** je modifie son nom, **Then** la valeur corrigée est celle qui est ajoutée.
2. **Given** un article existe déjà dans la liste, **When** je valide, **Then** il est signalé comme déjà présent et je choisis de l'ignorer ou de l'ajouter quand même.

---

### User Story 3 - Envoyer vers une liste de tâches (Priority: P3)

Je peux aussi choisir une liste de tâches comme cible : chaque ligne devient une tâche.

**Why this priority**: utile, mais l'usage courses couvre l'essentiel.

**Independent Test**: partager 2 lignes en choisissant une liste de tâches et vérifier 2 tâches créées.

**Acceptance Scenarios**:

1. **Given** je choisis une liste de tâches, **When** je valide, **Then** chaque ligne devient une tâche sans échéance.

### Edge Cases

- Que se passe-t-il si le texte partagé est vide ou ne contient qu'une URL ? **[Décidé]** Il est refusé avec un message clair qui invite à copier les ingrédients ; aucune page web n'est analysée en v1.
- Que se passe-t-il si le texte est très long (plus de 100 lignes) ? Les 100 premières lignes sont proposées et l'utilisateur en est averti.
- Que se passe-t-il si je ne suis pas connecté ? L'app demande la connexion, puis reprend le partage.
- Que se passe-t-il si je suis hors-ligne ? Les articles sont ajoutés à la file du `001` et envoyés plus tard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: L'app MUST apparaître dans le menu « Partager » d'Android pour du texte brut.
- **FR-002**: Le système MUST découper le texte reçu en articles, une ligne ou un séparateur courant (virgule, point-virgule) par article, en retirant puces et numérotation.
- **FR-003**: Le système MUST reconnaître quantité et unité lorsqu'elles sont écrites en tête d'article (« 2 kg de pommes de terre »).
- **FR-004**: Le système MUST proposer une catégorie à chaque article, en réutilisant la mémoire des catégories déjà existante.
- **FR-005**: Les utilisateurs MUST pouvoir éditer, retirer ou décocher chaque article avant validation.
- **FR-006**: Les utilisateurs MUST pouvoir choisir la liste cible parmi les listes sur lesquelles ils ont un droit d'écriture.
- **FR-007**: Le système MUST signaler les articles déjà présents dans la liste cible.
- **FR-008**: Le système MUST fonctionner hors-ligne en s'appuyant sur la file du `001`.
- **FR-009**: Le système MUST refuser sans erreur technique un partage vide ou non textuel.

### Key Entities

- **Texte partagé**: le contenu brut reçu d'une autre app, éphémère, non conservé après validation.
- **Article proposé**: une ligne analysée (titre, quantité, unité, catégorie, coché ou non), avant son ajout à une liste.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: De la sélection du texte dans une autre app à l'ajout en liste : moins de 15 secondes pour 5 articles.
- **SC-002**: Au moins 90 % des lignes d'une liste de courses courante (« 2 kg de pommes », « lait ») sont reconnues sans correction.
- **SC-003**: Aucun article n'est ajouté sans validation explicite de l'utilisateur.

## Assumptions

- **[Mon choix]** Texte brut seulement en v1 ; images, PDF et pages web sont hors périmètre.
- **[Mon choix]** Le web n'est pas concerné (pas de menu « Partager » équivalent).
- **[Mon choix]** L'analyse du texte se fait sans IA, par règles ; le Chef IA n'est pas sollicité.
- **Exigence native** : ce chantier nécessite un nouveau build de développement EAS ; il ne se teste pas dans Expo Go.
- L'analyse des quantités réutilise la logique existante de `packages/domain` (`shopping-quantity`) quand c'est possible.
