/**
 * Media URL Utility
 *
 * Normalizes media URLs so that absolute localhost/127.0.0.1 URLs or host-specific /api/ URLs
 * are converted to relative paths (e.g. /api/classroom-media/...) to avoid Mixed Content
 * and connection refused errors in production HTTPS deployments.
 */

/**
 * Normalizes a single media URL to a relative or secure path.
 */
export function normalizeMediaUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;

  // If it contains /api/classroom-media/, strip any domain/origin prefix
  if (url.includes('/api/classroom-media/')) {
    const idx = url.indexOf('/api/classroom-media/');
    return url.slice(idx);
  }

  // If it's an absolute localhost / 127.0.0.1 url with any port
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url)) {
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i, '/');
  }

  return url;
}

/**
 * Recursively walks an object / array and sanitizes any media URL fields (audioUrl, src, poster, url).
 */
export function sanitizeClassroomMediaUrls<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeClassroomMediaUrls(item)) as unknown as T;
  }

  const result: Record<string, unknown> = { ...(obj as Record<string, unknown>) };

  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string') {
      if (
        (key === 'audioUrl' || key === 'src' || key === 'poster' || key === 'url') &&
        (value.includes('/api/classroom-media/') || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(value))
      ) {
        result[key] = normalizeMediaUrl(value);
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeClassroomMediaUrls(value);
    }
  }

  return result as T;
}
