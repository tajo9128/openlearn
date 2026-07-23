import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { createNewsfeedPost, listNewsfeedPosts, updateNewsfeedPost, deleteNewsfeedPost, toggleReaction } from '@/lib/learning/newsfeed';

export async function GET(request: NextRequest) {
  try {
    const courseId = request.nextUrl.searchParams.get('course_id');
    if (!courseId) return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing course_id');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10);
    const posts = await listNewsfeedPosts(courseId, limit, offset);
    return apiSuccess({ posts });
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to list posts', String(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { course_id, author_id, author_name, content, is_pinned } = await request.json();
    if (!course_id || !author_id || !content) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing course_id, author_id, or content');
    }
    const post = await createNewsfeedPost({ courseId: course_id, authorId: author_id, authorName: author_name, content, isPinned: is_pinned });
    return apiSuccess({ post }, 201);
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to create post', String(error));
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { post_id, content, action, user_id, reaction_type } = await request.json();

    if (action === 'react' && post_id && user_id && reaction_type) {
      const result = await toggleReaction(post_id, user_id, reaction_type);
      return apiSuccess({ post: result });
    }

    if (post_id && content) {
      const post = await updateNewsfeedPost(post_id, content);
      return apiSuccess({ post });
    }

    return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing required fields');
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to update post', String(error));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const postId = request.nextUrl.searchParams.get('post_id');
    if (!postId) return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing post_id');
    await deleteNewsfeedPost(postId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to delete post', String(error));
  }
}
