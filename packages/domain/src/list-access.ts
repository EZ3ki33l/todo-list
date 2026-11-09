/**
 * Droits d'un utilisateur sur une liste (todo ou courses).
 * Source unique : web et native dérivaient chacun la même logique de leur côté.
 */

export const WRITE_ROLE = "membre";

export type ListMemberRef = {
  userId: string;
  role: string;
};

export type ListAccessSource = {
  ownerId?: string | null;
  members?: readonly ListMemberRef[];
  /**
   * Nombre total de membres, quand `members` est déjà filtré côté serveur
   * (ex. requête qui ne remonte que l'adhésion de l'utilisateur courant).
   */
  memberCount?: number;
};

export type ListAccess = {
  isOwner: boolean;
  /** Adhésion de l'utilisateur courant, si ce n'est pas le propriétaire. */
  member: ListMemberRef | null;
  canWrite: boolean;
  /** La liste est partagée : elle a des membres, ou l'utilisateur en est un. */
  isShared: boolean;
};

const NO_ACCESS: ListAccess = {
  isOwner: false,
  member: null,
  canWrite: false,
  isShared: false,
};

export function listAccess(
  list: ListAccessSource | null | undefined,
  userId: string | null | undefined,
): ListAccess {
  if (!list) return NO_ACCESS;

  const isOwner = !!userId && !!list.ownerId && list.ownerId === userId;
  const member = (userId && list.members?.find((m) => m.userId === userId)) || null;
  const memberCount = list.memberCount ?? list.members?.length ?? 0;

  return {
    isOwner,
    member,
    canWrite: isOwner || member?.role === WRITE_ROLE,
    isShared: memberCount > 0 || (!isOwner && !!member),
  };
}
