import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { CLASSROOMS_DIR, isValidClassroomId } from '@/lib/server/classroom-storage';
import { isS3Configured, s3GetPresignedUrl, s3GetObject } from '@/lib/server/s3-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('ClassroomMedia');

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classroomId: string; path: string[] }> },
) {
  const { classroomId, path: pathSegments } = await params;

  if (!isValidClassroomId(classroomId)) {
    return NextResponse.json({ error: 'Invalid classroom ID' }, { status: 400 });
  }

  const joined = pathSegments.join('/');
  if (joined.includes('..') || pathSegments.some((s) => s.includes('\0'))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const subDir = pathSegments[0];
  if (subDir !== 'media' && subDir !== 'audio' && subDir !== 'video' && subDir !== 'videos') {
    return NextResponse.json({ error: 'Invalid path' }, { status: 404 });
  }

  const ext = path.extname(pathSegments[pathSegments.length - 1]).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // 1. Try local filesystem first (fastest, most reliable)
  const filePath = path.join(CLASSROOMS_DIR, classroomId, ...pathSegments);
  const resolvedBase = path.resolve(CLASSROOMS_DIR, classroomId);

  try {
    const realPath = await fs.realpath(filePath);
    if (realPath.startsWith(resolvedBase + path.sep) || realPath === resolvedBase) {
      const stat = await fs.stat(realPath);
      if (stat.isFile()) {
        const stream = createReadStream(realPath);
        const webStream = new ReadableStream({
          start(controller) {
            stream.on('data', (chunk: Buffer | string) => controller.enqueue(chunk));
            stream.on('end', () => controller.close());
            stream.on('error', (err) => controller.error(err));
          },
          cancel() {
            stream.destroy();
          },
        });

        return new NextResponse(webStream, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(stat.size),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        });
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn(`Local file read check failed [classroomId=${classroomId}, path=${joined}]:`, error);
    }
  }

  // 2. Fallback: try S3
  if (isS3Configured()) {
    try {
      const s3Key = `classrooms/${classroomId}/${joined}`;
      const { data, error } = await s3GetObject(s3Key);
      if (data && !error) {
        return new NextResponse(data, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(data.byteLength),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        });
      }
    } catch (err) {
      log.warn('S3 retrieval failed:', err);
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
