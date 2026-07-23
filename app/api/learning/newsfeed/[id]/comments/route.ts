import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { createComment, listComments } from '@/lib/learning/newsfeed';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const comments = await listComments(id);
    return apiSuccess({ comments });
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to list comments', String(error));
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { author_id, author_name, content } = await request.json();
    if (!author_id || !content) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing author_id or content');
    }
    const comment = await createComment({ newsfeedId: id, authorId: author_id, authorName: author_name, content });
    return apiSuccess({ comment }, 201);
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to create comment', String(error));
  }
}
