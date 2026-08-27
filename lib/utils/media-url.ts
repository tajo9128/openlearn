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
export function normalizeMediaUrl(
  url: string | null | undefined,
  classroomId?: string,
): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // 1. If it contains /api/classroom-media/, strip any origin
  if (url.includes('/api/classroom-media/')) {
    const idx = url.indexOf('/api/classroom-media/');
    return url.slice(idx);
  }

  // 2. If it contains duplicate /classroom/:id/:id/(audio|media|videos|video|images)/
  const dupClassroomMatch = url.match(/(?:\/|^)classroom\/([^/]+)\/\1\/(audio|media|videos|video|images)\/(.+)$/i);
  if (dupClassroomMatch) {
    return `/api/classroom-media/${dupClassroomMatch[1]}/${dupClassroomMatch[2]}/${dupClassroomMatch[3]}`;
  }

  // 3. If it contains /classroom/:id/(audio|media|videos|video|images)/
  const classroomMatch = url.match(/(?:\/|^)classroom\/([^/]+)\/(audio|media|videos|video|images)\/(.+)$/i);
  if (classroomMatch) {
    return `/api/classroom-media/${classroomMatch[1]}/${classroomMatch[2]}/${classroomMatch[3]}`;
  }

  // 4. If it starts with :id/(audio|media|videos|video|images)/ (e.g. "ovRYKliCqd/audio/...")
  const idPathMatch = url.match(/^(?:\/)?([a-zA-Z0-9_-]+)\/(audio|media|videos|video|images)\/(.+)$/i);
  if (idPathMatch) {
    const firstSeg = idPathMatch[1].toLowerCase();
    if (firstSeg !== 'api' && firstSeg !== 'classroom') {
      return `/api/classroom-media/${idPathMatch[1]}/${idPathMatch[2]}/${idPathMatch[3]}`;
    }
  }

  // 5. If it's an absolute localhost / 127.0.0.1 url with any port
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url)) {
    const stripped = url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i, '/');
    return normalizeMediaUrl(stripped, classroomId);
  }

  // 6. If it's a bare relative path like audio/... or media/... or videos/...
  if (/^(?:\.\/)?(audio|media|videos|video|images)\//i.test(url)) {
    const cid =
      classroomId ||
      (typeof window !== 'undefined'
        ? window.location.pathname.match(/\/classroom\/([^/]+)/)?.[1]
        : undefined);
    if (cid) {
      const cleanPath = url.replace(/^\.?\//, '');
      return `/api/classroom-media/${cid}/${cleanPath}`;
    }
  }

  return url;
}

/**
 * Recursively walks an object / array and sanitizes any media URL fields (audioUrl, src, poster, url).
 */
export function sanitizeClassroomMediaUrls<T>(obj: T, classroomId?: string): T {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeClassroomMediaUrls(item, classroomId)) as unknown as T;
  }

  const result: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  const currentClassroomId =
    classroomId || (typeof result.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(result.id) ? result.id : undefined);

  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string') {
      if (key === 'audioUrl' || key === 'src' || key === 'poster' || key === 'url') {
        result[key] = normalizeMediaUrl(value, currentClassroomId);
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeClassroomMediaUrls(value, currentClassroomId);
    }
  }

  return result as T;
}
