/**
 * BioDockify Learn Auth — backed by the main platform's local auth API.
 *
 * The Learn platform previously called a long-dead Supabase project, so every
 * signup/login failed with "fetch failed". It now proxies to the same
 * /auth endpoints that power www.biodockify.com (local PostgreSQL auth):
 *
 *   POST {MAIN_API_URL}/auth/register  (JSON)       -> create account
 *   POST {MAIN_API_URL}/auth/login     (form)       -> JWT access token
 *   GET  {MAIN_API_URL}/auth/me        (Bearer)     -> current user
 *
 * Students use ONE BioDockify account across the main platform and Learn.
 * The main platform's JWT carries `sub` (user id), so cookie handling and
 * extractUserIdFromToken() are unchanged.
 */

import { cookies } from 'next/headers';

// ==================== Config ====================

const MAIN_API_URL = process.env.MAIN_API_URL ?? 'http://host.docker.internal:8000';
const COOKIE_NAME = 'bd_auth_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ==================== Types ====================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  accessToken?: string;
}

// ==================== Main Platform Auth API ====================

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'Student';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Sign up a new student on the main BioDockify platform, then sign them in
 * immediately (the main platform auto-verifies accounts, so no email-
 * confirmation dead-end — students land straight in the classroom).
 */
export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const res = await fetch(`${MAIN_API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        designation: 'Student',
        organization: 'BioDockify Learn',
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // FastAPI validation errors arrive as an array — flatten to text.
      let detail = data?.detail ?? 'Signup failed';
      if (Array.isArray(detail)) {
        detail = detail.map((d: { msg?: string }) => d?.msg ?? '').filter(Boolean).join('; ') || 'Signup failed';
      }
      return { success: false, error: detail };
    }

    // Account created — log in right away.
    return await signIn(email, password);
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Sign in with email/password via the main platform.
 * Returns the platform JWT on success.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const body = new URLSearchParams({ username: email, password });

    const res = await fetch(`${MAIN_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return { success: false, error: data?.detail ?? 'Invalid email or password' };
    }

    const user: AuthUser = {
      id: data.user_id ?? '',
      email: data.email ?? email,
      name: nameFromEmail(data.email ?? email),
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };

    return { success: true, user, accessToken: data.access_token };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Get current user from the platform JWT (verified server-side).
 */
export async function getUser(accessToken: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${MAIN_API_URL}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      id: data.id ?? '',
      email: data.email ?? '',
      name: data.designation || nameFromEmail(data.email ?? ''),
      emailVerified: true,
      createdAt: data.created_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Sign out. The main platform is stateless-JWT, so clearing the cookie
 * (handled by the caller) is the whole logout — nothing to invalidate.
 */
export async function signOut(_accessToken: string): Promise<void> {
  void _accessToken;
}

// ==================== Cookie Helpers ====================

export async function setAuthCookie(accessToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get the current authenticated user from the request cookie.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getAuthCookie();
  if (!token) return null;
  return getUser(token);
}

/**
 * Extract user ID from JWT without full verification (for non-critical reads).
 * The main platform's JWT payload carries `sub` (user id).
 */
export function extractUserIdFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

// ==================== Middleware Helper ====================

/**
 * For middleware.ts — extract user from cookie without Next.js cookies() API.
 * Uses raw cookie header parsing (middleware runs in Edge runtime).
 */
export async function getUserFromCookieHeader(
  cookieHeader: string | null,
): Promise<AuthUser | null> {
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    }),
  );

  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  return getUser(token);
}
