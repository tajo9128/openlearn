const USER_KEY = 'biodockify_user_id';

/**
 * Return the current user ID.
 * - If the user is logged in, this comes from localStorage (set by login/signup).
 * - Otherwise, generate a unique anonymous UUID and persist it.
 * Safe to call in both SSR (returns empty string) and client (returns real ID).
 */
export function getUserId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}
