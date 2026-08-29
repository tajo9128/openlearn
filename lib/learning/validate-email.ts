import { promises as dns } from 'dns';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Domains that never receive mail (common disposable/typo sources of bounces).
const BLOCKED_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'temp-mail.org', 'throwawaymail.com', 'yopmail.com', 'sharklasers.com',
  'getnada.com', 'dispostable.com', 'trashmail.com', 'fakeinbox.com',
  'example.com', 'example.org', 'example.net', 'test.com', 'testing.com',
  'mailinator.net', 'spamgourmet.com', 'mytemp.email', 'mohmal.com',
]);

export interface EmailCheckResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validate an email before handing it to Supabase auth. Bounces from
 * confirmation/reset mails count against the project's sending reputation,
 * so reject malformed addresses, known no-mail domains, and domains with
 * no MX/A record before an email is ever sent.
 */
export async function validateEmailDeliverable(rawEmail: string): Promise<EmailCheckResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, reason: 'Enter a valid email address' };
  }
  const domain = email.split('@')[1];
  if (BLOCKED_DOMAINS.has(domain)) {
    return { ok: false, reason: 'Please use a real email address' };
  }
  try {
    const mx = await dns.resolveMx(domain);
    if (mx && mx.length > 0) return { ok: true };
  } catch {
    // no MX; fall through to A-record check
  }
  try {
    const a = await dns.resolve4(domain);
    if (a && a.length > 0) return { ok: true };
    return { ok: false, reason: 'Email domain cannot receive mail' };
  } catch {
    return { ok: false, reason: 'Email domain does not exist' };
  }
}
