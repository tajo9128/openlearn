import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { listDocuments, uploadDocument } from '@/lib/learning/knowledge';
import { createLogger } from '@/lib/logger';

const log = createLogger('Knowledge API');

/**
 * GET /api/learning/knowledge — List user's documents
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    if (!userId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id');
    }

    const docs = await listDocuments(userId);
    return apiSuccess({ documents: docs });
  } catch (error) {
    log.error('List documents failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to list documents', String(error));
  }
}

/**
 * POST /api/learning/knowledge — Upload a document
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, title, content, doc_type, source_url, tags } = await request.json();

    if (!user_id || !title || !content) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id, title, or content');
    }

    const doc = await uploadDocument({
      userId: user_id,
      title,
      content,
      docType: doc_type,
      sourceUrl: source_url,
      tags: tags ?? [],
    });

    if (!doc) {
      return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to upload document');
    }

    return apiSuccess({ document: doc }, 201);
  } catch (error) {
    log.error('Upload document failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to upload document', String(error));
  }
}
