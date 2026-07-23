/**
 * Supabase Auth wrapper — no npm dependency needed.
 * Uses Supabase Auth REST API directly via native fetch.
 *
 * Handles: signup, login, email verification, user session.
 * JWT stored in HttpOnly cookie for security.
 */

import { cookies } from 'next/headers';

// ==================== Config ====================

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';
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

// ==================== Supabase Auth REST API ====================

const authHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Sign up a new user with email/password.
 * Supabase automatically sends a verification email.
 */
export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        email,
        password,
        data: { display_name: name },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.msg ?? data.error_description ?? 'Signup failed',
      };
    }

    // Supabase returns user but may not return access_token if email confirmation is required
    const user: AuthUser = {
      id: data.user?.id ?? '',
      email: data.user?.email ?? email,
      name: data.user?.user_metadata?.display_name ?? name,
      emailVerified: data.user?.email_confirmed_at != null,
      createdAt: data.user?.created_at ?? new Date().toISOString(),
    };

    return {
      success: true,
      user,
      accessToken: data.access_token ?? undefined,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Sign in with email/password.
 * Returns JWT access token on success.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ email, password }),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error_description ?? data.msg ?? 'Login failed',
      };
    }

    const user: AuthUser = {
      id: data.user?.id ?? '',
      email: data.user?.email ?? email,
      name: data.user?.user_metadata?.display_name ?? email.split('@')[0],
      emailVerified: data.user?.email_confirmed_at != null,
      createdAt: data.user?.created_at ?? new Date().toISOString(),
    };

    return {
      success: true,
      user,
      accessToken: data.access_token,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Get current user from JWT access token (server-side verification).
 */
export async function getUser(accessToken: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        ...authHeaders,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      id: data.id ?? '',
      email: data.email ?? '',
      name: data.user_metadata?.display_name ?? data.email?.split('@')[0] ?? '',
      emailVerified: data.email_confirmed_at != null,
      createdAt: data.created_at ?? '',
    };
  } catch {
    return null;
  }
}

/**
 * Sign out (invalidate token on Supabase side).
 */
export async function signOut(accessToken: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    // Ignore logout errors
  }
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
 * Use getCurrentUser() for security-sensitive operations.
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
