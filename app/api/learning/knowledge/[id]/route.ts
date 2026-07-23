import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { deleteDocument } from '@/lib/learning/knowledge';
import { createLogger } from '@/lib/logger';

const log = createLogger('Knowledge Delete API');

/**
 * DELETE /api/learning/knowledge/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = request.nextUrl.searchParams.get('user_id');

    if (!userId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id');
    }

    const deleted = await deleteDocument(id, userId);
    if (!deleted) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'Document not found');
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    log.error('Delete document failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to delete document', String(error));
  }
}
