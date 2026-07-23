import { promises as fs } from 'fs';
import path from 'path';
import type { NextRequest } from 'next/server';
import type { Scene, Stage } from '@/lib/types/stage';
import { isS3Configured, s3PutObject, s3GetObject } from './s3-client';

export const CLASSROOMS_DIR = path.join(process.cwd(), 'data', 'classrooms');
export const CLASSROOM_JOBS_DIR = path.join(process.cwd(), 'data', 'classroom-jobs');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function ensureClassroomsDir() {
  await ensureDir(CLASSROOMS_DIR);
}

export async function ensureClassroomJobsDir() {
  await ensureDir(CLASSROOM_JOBS_DIR);
}

export async function writeJsonFileAtomic(filePath: string, data: unknown) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tempFilePath, content, 'utf-8');
  await fs.rename(tempFilePath, filePath);
}

export function buildRequestOrigin(req: NextRequest): string {
  return req.headers.get('x-forwarded-host')
    ? `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('x-forwarded-host')}`
    : req.nextUrl.origin;
}

export interface PersistedClassroomData {
  id: string;
  stage: Stage;
  scenes: Scene[];
  createdAt: string;
}

export function isValidClassroomId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Read classroom from S3 (primary) or local filesystem (fallback).
 */
export async function readClassroom(id: string): Promise<PersistedClassroomData | null> {
  // Try S3 first
  if (isS3Configured()) {
    try {
      const { data, error } = await s3GetObject(`classrooms/${id}.json`);
      if (data && !error) {
        const text = new TextDecoder().decode(data);
        return JSON.parse(text) as PersistedClassroomData;
      }
    } catch {
      // Fall through to local
    }
  }

  // Fallback: local filesystem
  const filePath = path.join(CLASSROOMS_DIR, `${id}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as PersistedClassroomData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Upload a media file to S3 (primary) or save locally (fallback).
 */
export async function uploadClassroomMedia(
  classroomId: string,
  relativePath: string,
  data: Buffer | ArrayBuffer,
  contentType: string,
): Promise<string> {
  const s3Key = `classrooms/${classroomId}/${relativePath}`;

  if (isS3Configured()) {
    const { success, error } = await s3PutObject(s3Key, data, contentType);
    if (success) {
      // Return S3 URL for direct access
      return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${process.env.AWS_S3_PREFIX ?? 'learn/'}${s3Key}`;
    }
    console.warn('S3 upload failed, falling back to local:', error);
  }

  // Fallback: save locally
  const localPath = path.join(CLASSROOMS_DIR, classroomId, relativePath);
  await ensureDir(path.dirname(localPath));
  await fs.writeFile(localPath, Buffer.from(data));
  return `/api/classroom-media/${classroomId}/${relativePath}`;
}

/**
 * Persist classroom to S3 (primary) or local filesystem (fallback).
 */
export async function persistClassroom(
  data: {
    id: string;
    stage: Stage;
    scenes: Scene[];
  },
  baseUrl: string,
): Promise<PersistedClassroomData & { url: string }> {
  const classroomData: PersistedClassroomData = {
    id: data.id,
    stage: data.stage,
    scenes: data.scenes,
    createdAt: new Date().toISOString(),
  };

  const jsonContent = JSON.stringify(classroomData, null, 2);

  // Try S3 first
  if (isS3Configured()) {
    const { success, error } = await s3PutObject(
      `classrooms/${data.id}.json`,
      jsonContent,
      'application/json',
    );
    if (success) {
      console.log(`Classroom ${data.id} persisted to S3`);
    } else {
      console.warn('S3 persist failed, falling back to local:', error);
      // Fallback: local filesystem
      await ensureClassroomsDir();
      const filePath = path.join(CLASSROOMS_DIR, `${data.id}.json`);
      await writeJsonFileAtomic(filePath, classroomData);
    }
  } else {
    // No S3 configured, use local filesystem
    await ensureClassroomsDir();
    const filePath = path.join(CLASSROOMS_DIR, `${data.id}.json`);
    await writeJsonFileAtomic(filePath, classroomData);
  }

  return {
    ...classroomData,
    url: `${baseUrl}/classroom/${data.id}`,
  };
}
