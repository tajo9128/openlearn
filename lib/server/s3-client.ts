/**
 * AWS S3 Client — native fetch with AWS Signature V4.
 * No npm dependency. Uses Web Crypto API for signing.
 *
 * Supports: PUT, GET, DELETE, LIST, presigned URLs.
 * Gracefully falls back to local filesystem when S3 env vars are missing.
 */

// ==================== Config ====================

const S3_BUCKET = process.env.AWS_S3_BUCKET ?? '';
const S3_REGION = process.env.AWS_S3_REGION ?? 'ap-south-2';
const S3_PREFIX = process.env.AWS_S3_PREFIX ?? 'learn/';
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID ?? '';
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? '';

/** Check if S3 is configured */
export function isS3Configured(): boolean {
  return !!(S3_BUCKET && ACCESS_KEY && SECRET_KEY);
}

function s3Endpoint(): string {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;
}

function s3ObjectUrl(key: string): string {
  return `${s3Endpoint()}/${S3_PREFIX}${key}`;
}

// ==================== AWS Signature V4 ====================

async function hmacSha256(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSignatureKey(dateStamp: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256('AWS4' + SECRET_KEY, dateStamp);
  const kRegion = await hmacSha256(kDate, S3_REGION);
  const kService = await hmacSha256(kRegion, 's3');
  return hmacSha256(kService, 'aws4_request');
}

async function signRequest(
  method: string,
  url: string,
  body: string | ArrayBuffer,
  contentType: string,
): Promise<Record<string, string>> {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').substring(0, 8);
  const amzDate = dateStamp + 'T' + now.toISOString().replace(/[:-]|\.\d{3}/g, '').substring(9, 15) + 'Z';

  const parsedUrl = new URL(url);
  const host = parsedUrl.host;
  const canonicalUri = parsedUrl.pathname;
  const canonicalQueryString = '';

  const bodyHash = typeof body === 'string'
    ? await sha256(body)
    : Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', body)))
        .map(b => b.toString(16).padStart(2, '0')).join('');

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    method, canonicalUri, canonicalQueryString,
    canonicalHeaders, signedHeaders, bodyHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${S3_REGION}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`;

  const signingKey = await getSignatureKey(dateStamp);
  const signature = Array.from(new Uint8Array(await hmacSha256(signingKey, stringToSign)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    'Host': host,
    'x-amz-content-sha256': bodyHash,
    'x-amz-date': amzDate,
    'Authorization': `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'Content-Type': contentType,
  };
}

// ==================== S3 Operations ====================

/**
 * Upload an object to S3.
 */
export async function s3PutObject(
  key: string,
  body: string | ArrayBuffer,
  contentType = 'application/octet-stream',
): Promise<{ success: boolean; error?: string }> {
  if (!isS3Configured()) return { success: false, error: 'S3 not configured' };

  const url = s3ObjectUrl(key);
  const headers = await signRequest('PUT', url, body, contentType);

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    return { success: false, error: `S3 PUT failed: ${res.status} ${errText}` };
  }

  return { success: true };
}

/**
 * Download an object from S3.
 */
export async function s3GetObject(key: string): Promise<{ data: ArrayBuffer | null; error?: string }> {
  if (!isS3Configured()) return { data: null, error: 'S3 not configured' };

  const url = s3ObjectUrl(key);
  const headers = await signRequest('GET', url, '', 'application/octet-stream');

  const res = await fetch(url, { method: 'GET', headers });

  if (!res.ok) {
    return { data: null, error: `S3 GET failed: ${res.status}` };
  }

  return { data: await res.arrayBuffer() };
}

/**
 * Get a presigned URL for direct browser access (valid for `expiresIn` seconds).
 */
export async function s3GetPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  if (!isS3Configured()) return '';

  const url = s3ObjectUrl(key);
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').substring(0, 8);
  const amzDate = dateStamp + 'T' + now.toISOString().replace(/[:-]|\.\d{3}/g, '').substring(9, 15) + 'Z';
  const credentialScope = `${dateStamp}/${S3_REGION}/s3/aws4_request`;

  const parsedUrl = new URL(url);
  const canonicalUri = parsedUrl.pathname;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${ACCESS_KEY}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  });

  const canonicalQueryString = Array.from(queryParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const canonicalHeaders = `host:${parsedUrl.host}\n`;
  const signedHeaders = 'host';
  const canonicalRequest = ['GET', canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');

  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`;
  const signingKey = await getSignatureKey(dateStamp);
  const signature = Array.from(new Uint8Array(await hmacSha256(signingKey, stringToSign)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return `${url}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

/**
 * Delete an object from S3.
 */
export async function s3DeleteObject(key: string): Promise<{ success: boolean; error?: string }> {
  if (!isS3Configured()) return { success: false, error: 'S3 not configured' };

  const url = s3ObjectUrl(key);
  const headers = await signRequest('DELETE', url, '', 'application/octet-stream');

  const res = await fetch(url, { method: 'DELETE', headers });

  if (!res.ok) {
    return { success: false, error: `S3 DELETE failed: ${res.status}` };
  }

  return { success: true };
}

/**
 * List objects by prefix.
 */
export async function s3ListObjects(prefix: string): Promise<{ keys: string[]; error?: string }> {
  if (!isS3Configured()) return { keys: [], error: 'S3 not configured' };

  const fullPrefix = S3_PREFIX + prefix;
  const url = `${s3Endpoint()}?list-type=2&prefix=${encodeURIComponent(fullPrefix)}`;
  const headers = await signRequest('GET', url, '', 'application/xml');

  const res = await fetch(url, { method: 'GET', headers });

  if (!res.ok) {
    return { keys: [], error: `S3 LIST failed: ${res.status}` };
  }

  const xml = await res.text();
  const keys: string[] = [];
  const keyRegex = /<Key>([^<]+)<\/Key>/g;
  let match;
  while ((match = keyRegex.exec(xml)) !== null) {
    keys.push(match[1].replace(S3_PREFIX, ''));
  }

  return { keys };
}
