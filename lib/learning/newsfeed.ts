/**
 * Newsfeed / Announcements — adapted from ClassroomIO
 * Source: /opt/classroomio/apps/api/src/services/newsfeed/newsfeed.ts
 *
 * CRUD for posts + comments with HTML sanitization and reactions.
 */

import {
  supabaseQuery,
  supabaseInsert,
  supabaseUpsert,
  TABLES,
} from './supabase-client';

// ==================== HTML Sanitization ====================

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'span', 'div',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
  span: new Set(['style']),
  div: new Set(['style']),
};

export function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let result = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove style tags
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Remove on* event attributes
  result = result.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  result = result.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  // Remove javascript: URLs
  result = result.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
  // Remove iframe, object, embed
  result = result.replace(/<\/?(iframe|object|embed|form|input|button)[^>]*>/gi, '');

  return result;
}

// ==================== Posts ====================

export async function createNewsfeedPost(params: {
  courseId: string;
  authorId: string;
  authorName?: string;
  content: string;
  isPinned?: boolean;
}): Promise<any> {
  const { data, error } = await supabaseInsert(TABLES.NEWSFEED, {
    course_id: params.courseId,
    author_id: params.authorId,
    author_name: params.authorName,
    content: sanitizeHtml(params.content),
    is_pinned: params.isPinned ?? false,
  });
  if (error) throw new Error(`Failed to create post: ${error}`);
  return data;
}

export async function listNewsfeedPosts(
  courseId: string,
  limit = 20,
  offset = 0,
): Promise<any[]> {
  const { data } = await supabaseQuery<any>(TABLES.NEWSFEED, {
    filters: { course_id: `eq.${courseId}` },
    order: { column: 'created_at', ascending: false },
    limit,
    offset,
  });
  return data ?? [];
}

export async function updateNewsfeedPost(
  postId: string,
  content: string,
): Promise<any> {
  const { data: existing } = await supabaseQuery<any>(TABLES.NEWSFEED, {
    filters: { id: `eq.${postId}` },
  });
  if (!existing?.length) return null;

  const { data } = await supabaseUpsert(
    TABLES.NEWSFEED,
    { ...existing[0], content: sanitizeHtml(content), updated_at: new Date().toISOString() },
    'id',
  );
  return data;
}

export async function deleteNewsfeedPost(postId: string): Promise<void> {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? '';
  await fetch(`${SUPABASE_URL}/rest/v1/${TABLES.NEWSFEED}?id=eq.${postId}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
}

// ==================== Reactions ====================

export async function toggleReaction(
  postId: string,
  userId: string,
  reactionType: 'clap' | 'smile' | 'thumbsup' | 'thumbsdown',
): Promise<any> {
  const { data: posts } = await supabaseQuery<any>(TABLES.NEWSFEED, {
    filters: { id: `eq.${postId}` },
  });
  if (!posts?.length) return null;

  const post = posts[0];
  const reactions = post.reactions ?? { clap: [], smile: [], thumbsup: [], thumbsdown: [] };
  const list: string[] = reactions[reactionType] ?? [];

  if (list.includes(userId)) {
    reactions[reactionType] = list.filter((id) => id !== userId);
  } else {
    reactions[reactionType] = [...list, userId];
  }

  const { data } = await supabaseUpsert(
    TABLES.NEWSFEED,
    { ...post, reactions },
    'id',
  );
  return data;
}

// ==================== Comments ====================

export async function createComment(params: {
  newsfeedId: string;
  authorId: string;
  authorName?: string;
  content: string;
}): Promise<any> {
  const { data, error } = await supabaseInsert(TABLES.NEWSFEED_COMMENTS, {
    newsfeed_id: params.newsfeedId,
    author_id: params.authorId,
    author_name: params.authorName,
    content: sanitizeHtml(params.content),
  });
  if (error) throw new Error(`Failed to create comment: ${error}`);
  return data;
}

export async function listComments(newsfeedId: string): Promise<any[]> {
  const { data } = await supabaseQuery<any>(TABLES.NEWSFEED_COMMENTS, {
    filters: { newsfeed_id: `eq.${newsfeedId}` },
    order: { column: 'created_at', ascending: true },
  });
  return data ?? [];
}
