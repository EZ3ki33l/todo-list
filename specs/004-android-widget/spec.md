# Feature Specification: Widget Android — liste de courses

**Feature Branch**: `feat/android-widget`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Cocher et ajouter des articles depuis l'écran d'accueil, sans ouvrir l'app."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voir ma liste et cocher depuis l'accueil (Priority: P1)

J'ajoute le widget à l'écran d'accueil, je choisis ma liste de courses. Elle s'affiche ; je coche un article directement dans le widget.

**Why this priority**: c'est l'usage central du widget : consulter et cocher d'un geste, sans ouvrir l'app.

**Independent Test**: ajouter le widget, choisir une liste, cocher un article, ouvrir l'app et vérifier qu'il est coché.

**Acceptance Scenarios**:

1. **Given** j'ajoute le widget, **When** je choisis une liste, **Then** les articles non cochés s'affichent.
2. **Given** le widget affiche ma liste, **When** je coche un article, **Then** il disparaît ou passe en barré et l'état est enregistré.
3. **Given** la liste dépasse la place disponible, **When** je fais défiler le widget, **Then** je peux atteindre tous les articles.
4. **Given** je suis `invité` (lecture seule), **When** j'essaie de cocher, **Then** rien n'est modifié et le widget l'indique.

---

### User Story 2 - Ajouter un article rapidement (Priority: P2)

Depuis le widget, un bouton « + » ouvre la saisie rapide de l'app sur cette liste, avec la liste d'articles fréquents.

**Why this priority**: utile, mais la saisie dans un widget est limitée ; ouvrir une saisie dédiée suffit.

**Independent Test**: appuyer sur « + », saisir un article, valider ; il apparaît dans le widget.

**Acceptance Scenarios**:

1. **Given** je touche « + », **When** l'écran de saisie s'ouvre, **Then** la liste du widget est déjà sélectionnée.
2. **Given** j'ai ajouté un article, **When** je reviens à l'accueil, **Then** le widget l'affiche.

---

### User Story 3 - Widget toujours à jour et utilisable hors-ligne (Priority: P2)

Le widget affiche des données récentes, y compris sans réseau, et reflète les changements faits dans l'app ou par un autre membre.

**Why this priority**: un widget périmé fait perdre confiance ; il est utile surtout en magasin, donc souvent sans réseau.

**Independent Test**: modifier la liste dans l'app, vérifier le widget ; passer en mode avion, cocher dans le widget, rétablir le réseau, vérifier l'envoi.

**Acceptance Scenarios**:

1. **Given** je modifie la liste dans l'app, **When** je reviens à l'accueil, **Then** le widget est à jour.
2. **Given** je suis hors-ligne, **When** je coche dans le widget, **Then** le changement est mis en file et envoyé au retour du réseau.
3. **Given** la liste a été supprimée ou je n'y ai plus accès, **When** le widget se met à jour, **Then** il propose de choisir une autre liste.

### Edge Cases

- Que se passe-t-il si je ne suis pas connecté ? Le widget affiche « Se connecter » et ouvre l'app.
- Que se passe-t-il avec 0 article ? Le widget affiche « Liste vide » avec le bouton « + ».
- Que se passe-t-il si j'ai plusieurs widgets ? Chacun garde sa propre liste.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: L'app MUST fournir un widget Android redimensionnable affichant une liste de courses.
- **FR-002**: Les utilisateurs MUST pouvoir choisir, à l'ajout du widget, la liste affichée, et la changer ensuite.
- **FR-003**: Les utilisateurs MUST pouvoir cocher un article depuis le widget, avec le même effet que dans l'app.
- **FR-004**: Le widget MUST ouvrir la saisie rapide de l'app, sur la bonne liste, via un bouton d'ajout.
- **FR-005**: Le widget MUST se mettre à jour après un changement dans l'app et à intervalle régulier.
- **FR-006**: Le widget MUST s'appuyer sur la copie locale et la file du `001` pour fonctionner hors-ligne.
- **FR-007**: Le widget MUST respecter les rôles : aucun cochage sur une liste en lecture seule.
- **FR-008**: Le widget MUST gérer les états vide, déconnecté et liste inaccessible avec un message clair.
- **FR-009**: Chaque instance de widget MUST garder sa propre liste.

### Key Entities

- **Instance de widget**: un widget posé sur l'écran d'accueil, associé à une liste de courses.
- **Copie locale d'une liste**: définie dans le `001`, source des données affichées.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cocher un article depuis l'écran d'accueil prend un seul geste et moins de 2 secondes pour s'afficher.
- **SC-002**: Un changement fait dans l'app apparaît dans le widget en moins de 5 secondes quand le téléphone est actif.
- **SC-003**: Le widget affiche la dernière liste connue dans 100 % des cas sans réseau.
- **SC-004**: Le widget n'augmente pas sensiblement la consommation de batterie : pas de réveil permanent en arrière-plan.

## Assumptions

- **[Mon choix]** Seules les listes de courses sont concernées ; un widget « tâches du jour » est hors périmètre de cette version.
- **[Mon choix]** L'ajout passe par l'ouverture de l'app (écran de saisie rapide), pas par un champ de texte dans le widget.
- **Dépendance forte** : ce chantier ne démarre qu'après le `001`.
- **Exigence native** : nécessite un build de développement EAS ; il ne se teste pas dans Expo Go.
- La bibliothèque de widgets à utiliser est un choix technique laissé au plan, à valider sur la version d'Expo du projet.
