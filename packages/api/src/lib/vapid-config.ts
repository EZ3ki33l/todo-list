/** Lecture des clés VAPID — sans dépendance Node (importable côté client via tRPC). */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}
