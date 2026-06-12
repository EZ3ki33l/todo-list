export type ShareRole = "membre" | "invité";

export const SHARE_ROLES: ShareRole[] = ["membre", "invité"];

export function shareRoleLabel(role: ShareRole): string {
  return role === "membre" ? "Lecture et écriture" : "Lecture seule";
}

export function memberRoleLabel(role: string): string {
  return role === "membre" ? "Lecture et écriture" : "Lecture seule";
}

export function toggleShareRole(role: ShareRole): ShareRole {
  return role === "membre" ? "invité" : "membre";
}
