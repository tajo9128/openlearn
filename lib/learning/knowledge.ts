/**
 * Knowledge Engine — document upload, full-text search, and AI Q&A
 *
 * Uses PostgreSQL full-text search (tsvector/tsquery) via Supabase REST API.
 * AI Q&A uses the Brain's callLLM with document context.
 */

import { supabaseQuery, supabaseInsert, supabaseUpsert, TABLES } from './supabase-client';
import { resolveModel } from '@/lib/server/resolve-model';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';

const log = createLogger('Knowledge');

const TABLE = 'learning_knowledge_docs';

// ==================== Types ====================

export interface KnowledgeDoc {
  id: string;
  user_id: string;
  title: string;
  content: string;
  doc_type: 'pdf' | 'text' | 'markdown' | 'url' | 'csv';
  source_url?: string;
  file_size: number;
  tags: string[];
  created_at: string;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  doc_type: string;
  rank: number;
  created_at: string;
}

// ==================== Document CRUD ====================

export async function listDocuments(userId: string): Promise<KnowledgeDoc[]> {
  const { data, error } = await supabaseQuery<any>(TABLE, {
    select: 'id, user_id, title, doc_type, source_url, file_size, tags, created_at',
    filters: { user_id: `eq.${userId}` },
    order: { column: 'created_at', ascending: false },
  });

  if (error) {
    log.error('Failed to list documents:', error);
    return [];
  }
  return data ?? [];
}

export async function uploadDocument(params: {
  userId: string;
  title: string;
  content: string;
  docType?: string;
  sourceUrl?: string;
  tags?: string[];
}): Promise<KnowledgeDoc | null> {
  const { userId, title, content, docType = 'text', sourceUrl, tags = [] } = params;

  // Clean and truncate content (Supabase text field limit)
  const cleanContent = cleanText(content).substring(0, 500000);

  const { data, error } = await supabaseInsert<any>(TABLE, {
    user_id: userId,
    title,
    content: cleanContent,
    doc_type: docType,
    source_url: sourceUrl ?? null,
    file_size: cleanContent.length,
    tags,
  });

  if (error) {
    log.error('Failed to upload document:', error);
    return null;
  }

  return data;
}

export async function deleteDocument(docId: string, userId: string): Promise<boolean> {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? '';

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${docId}&user_id=eq.${userId}`,
    {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    },
  );

  return res.ok;
}

// ==================== Full-Text Search ====================

/**
 * Search documents using PostgreSQL full-text search.
 * Uses Supabase RPC to call a stored function for ts_query search.
 */
export async function searchDocuments(
  userId: string,
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  // Sanitize query for tsquery: split words, join with &
  const sanitized = query
    .replace(/[^\w\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .join(' & ');

  if (!sanitized) return [];

  // Use Supabase RPC for full-text search
  const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? '';

  try {
    // Try using the REST API with a raw SQL filter
    // Supabase REST doesn't support tsquery directly, so we use a workaround:
    // Filter with ilike on title + content for basic search, then rank by tsvector
    const { data, error } = await supabaseQuery<any>(TABLE, {
      select: 'id, title, doc_type, created_at, ts_rank(content_tsv, to_tsquery($1)) as rank',
      filters: {
        user_id: `eq.${userId}`,
        content_tsv: `fts.${sanitized}`,
      },
      limit,
    });

    if (error || !data) {
      // Fallback: simple ilike search
      return await searchDocumentsFallback(userId, query, limit);
    }

    return data.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      snippet: extractSnippet(doc.content ?? '', query),
      doc_type: doc.doc_type,
      rank: doc.rank ?? 0,
      created_at: doc.created_at,
    }));
  } catch {
    return await searchDocumentsFallback(userId, query, limit);
  }
}

/**
 * Fallback search using ilike (works without tsvector setup).
 */
async function searchDocumentsFallback(
  userId: string,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const { data } = await supabaseQuery<any>(TABLE, {
    select: 'id, title, content, doc_type, created_at',
    filters: {
      user_id: `eq.${userId}`,
    },
    limit: 100,
  });

  if (!data) return [];

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const doc of data) {
    const titleMatch = doc.title?.toLowerCase().includes(lowerQuery);
    const contentMatch = doc.content?.toLowerCase().includes(lowerQuery);

    if (titleMatch || contentMatch) {
      results.push({
        id: doc.id,
        title: doc.title,
        snippet: extractSnippet(doc.content ?? '', query),
        doc_type: doc.doc_type,
        rank: titleMatch ? 1 : 0.5,
        created_at: doc.created_at,
      });
    }
  }

  return results.sort((a, b) => b.rank - a.rank).slice(0, limit);
}

// ==================== AI Q&A over Documents ====================

/**
 * Answer a question using document context.
 * Searches relevant documents, builds context, calls LLM.
 */
export async function askOverDocuments(
  userId: string,
  question: string,
  modelOpts?: { modelString?: string; apiKey?: string; baseUrl?: string; providerType?: string },
): Promise<{ answer: string; sources: string[] }> {
  // Search for relevant documents
  const searchResults = await searchDocuments(userId, question, 5);

  if (searchResults.length === 0) {
    return {
      answer: 'No relevant documents found in your knowledge base. Try uploading some documents first.',
      sources: [],
    };
  }

  // Fetch full content of top results
  const docIds = searchResults.map((r) => r.id);
  const { data: docs } = await supabaseQuery<any>(TABLE, {
    select: 'id, title, content',
    filters: { id: `in.(${docIds.join(',')})` },
  });

  if (!docs || docs.length === 0) {
    return { answer: 'Could not retrieve documents.', sources: [] };
  }

  // Build context (truncate each doc to ~2000 chars to fit context window)
  const contextParts = docs.map((doc: any) => {
    const snippet = (doc.content ?? '').substring(0, 2000);
    return `### ${doc.title}\n${snippet}`;
  });
  const context = contextParts.join('\n\n---\n\n');

  // Resolve model
  const resolved = await resolveModel({
    stage: 'brain' as any,
    modelString: modelOpts?.modelString,
    apiKey: modelOpts?.apiKey,
    baseUrl: modelOpts?.baseUrl,
    providerType: modelOpts?.providerType,
  });

  if (!resolved?.model) {
    throw new Error('No AI model configured. Open Settings and add an API key.');
  }

  // Call LLM with document context
  const result = await callLLM(
    {
      model: resolved.model,
      system: `You are a knowledgeable AI assistant. Answer the student's question based on the provided document context. If the answer is not in the documents, say so clearly. Keep answers concise and accurate. Cite the document title when referencing specific content.`,
      prompt: `## Document Context\n\n${context}\n\n## Question\n${question}\n\n## Answer`,
      maxOutputTokens: 1500,
    },
    'brain',
  );

  return {
    answer: result.text,
    sources: docs.map((d: any) => d.title),
  };
}

// ==================== Helpers ====================

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/\x00/g, '')
    .trim();
}

function extractSnippet(content: string, query: string, contextChars = 200): string {
  const lower = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lower.indexOf(lowerQuery);

  if (idx === -1) {
    return content.substring(0, contextChars) + (content.length > contextChars ? '...' : '');
  }

  const start = Math.max(0, idx - contextChars / 2);
  const end = Math.min(content.length, idx + query.length + contextChars / 2);
  const snippet = content.substring(start, end);

  return (start > 0 ? '...' : '') + snippet + (end < content.length ? '...' : '');
}
