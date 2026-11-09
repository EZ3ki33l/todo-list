# Feature Specification: Ordre par rayon

**Feature Branch**: `feat/aisle-order`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Pouvoir trier ma liste de courses dans l'ordre du parcours du magasin, pour ne pas faire d'allers-retours."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Liste groupée par rayon dans mon ordre (Priority: P1)

J'ouvre ma liste de courses : les articles sont regroupés par catégorie (fruits et légumes, boulangerie, laitier…), et les groupes suivent l'ordre de mon parcours habituel.

**Why this priority**: c'est le gain principal : suivre la liste du début à la fin du magasin sans revenir en arrière.

**Independent Test**: ajouter un article de chaque catégorie dans le désordre et vérifier que les groupes apparaissent dans l'ordre par défaut.

**Acceptance Scenarios**:

1. **Given** ma liste contient du lait, des pommes et du pain, **When** j'ouvre la liste en mode « par rayon », **Then** les articles sont regroupés par catégorie selon l'ordre des rayons.
2. **Given** une catégorie n'a aucun article, **When** j'ouvre la liste, **Then** son groupe n'apparaît pas.
3. **Given** j'ai coché un article, **When** je regarde la liste, **Then** il reste dans son rayon mais passe après les articles non cochés du même rayon.

---

### User Story 2 - Régler l'ordre de mes rayons (Priority: P1)

Je réorganise l'ordre des catégories pour qu'il corresponde à mon magasin habituel.

**Why this priority**: l'ordre par défaut ne convient pas à tous les magasins ; sans réglage, la fonction perd son intérêt.

**Independent Test**: déplacer « Boulangerie » en premier, rouvrir la liste, vérifier que le groupe est en tête, puis relancer l'app et vérifier que l'ordre est conservé.

**Acceptance Scenarios**:

1. **Given** je suis sur l'écran d'ordre des rayons, **When** je déplace une catégorie, **Then** l'ordre est enregistré et appliqué à mes listes de courses.
2. **Given** j'ai modifié l'ordre, **When** je choisis « rétablir l'ordre par défaut », **Then** l'ordre d'origine revient.

---

### User Story 3 - Revenir au tri manuel (Priority: P2)

Je peux basculer entre « par rayon » et « manuel » (l'ordre glissé-déposé actuel).

**Why this priority**: certains préfèrent leur propre ordre ; on ne retire rien à l'existant.

**Independent Test**: basculer entre les deux modes sur une même liste et vérifier l'affichage.

**Acceptance Scenarios**:

1. **Given** je suis en mode « par rayon », **When** je bascule en « manuel », **Then** les articles reprennent l'ordre glissé-déposé.
2. **Given** je suis en mode « par rayon », **When** je glisse un article, **Then** il se déplace seulement à l'intérieur de son rayon.

### Edge Cases

- Que se passe-t-il pour un article de catégorie « Autre » ? Il apparaît dans son propre groupe, placé selon l'ordre défini (par défaut en dernier).
- Que se passe-t-il sur une liste partagée ? Chaque membre voit les rayons dans son propre ordre ; l'ordre n'est pas partagé.
- Que se passe-t-il si je change la catégorie d'un article ? Il passe dans le nouveau groupe immédiatement.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST proposer un mode d'affichage « par rayon » qui regroupe les articles d'une liste de courses par catégorie.
- **FR-002**: Les groupes MUST suivre un ordre de catégories propre à chaque utilisateur, avec un ordre par défaut cohérent avec un parcours de magasin courant.
- **FR-003**: Les utilisateurs MUST pouvoir réordonner les catégories et rétablir l'ordre par défaut.
- **FR-004**: L'ordre choisi MUST être conservé entre les sessions et sur les appareils de l'utilisateur.
- **FR-005**: Le système MUST permettre de basculer entre « par rayon » et « manuel » sans perdre l'ordre manuel existant.
- **FR-006**: En mode « par rayon », le glisser-déposer MUST rester possible à l'intérieur d'un même rayon.
- **FR-007**: Les catégories sans article MUST ne pas apparaître dans la liste.
- **FR-008**: L'ordre des rayons d'un utilisateur MUST NOT modifier l'affichage des autres membres d'une liste partagée.

### Key Entities

- **Ordre des rayons**: la suite ordonnée des catégories de courses propre à un utilisateur, avec une valeur par défaut.
- **Mode d'affichage d'une liste**: « par rayon » ou « manuel », choisi par l'utilisateur.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur réordonne les rayons en moins de 30 secondes.
- **SC-002**: Le passage entre « par rayon » et « manuel » est instantané, sans rechargement visible.
- **SC-003**: Avec 50 articles, la liste reste fluide au défilement et au cochage.

## Assumptions

- **[Décidé]** L'ordre est par utilisateur, non par magasin ni par liste.
- **[Mon choix]** Le mode d'affichage choisi (par rayon / manuel) est mémorisé par utilisateur, pas par liste.
- **[Mon choix]** Le web reçoit l'affichage par rayon dans un second temps ; ce chantier cible Android.
- Les 10 catégories existantes sont réutilisées ; aucune nouvelle catégorie n'est créée.
- Dépend du `001` uniquement pour que l'ordre se lise hors-ligne ; sinon indépendant.
