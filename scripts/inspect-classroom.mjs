import fs from 'fs';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

function loadEnv() {
  const envPaths = ['.env.local', '.env'];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2]?.replace(/^['"](.*)['"]$/, '$1') || '';
        }
      }
    }
  }
}

loadEnv();

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function main() {
  const classroomId = process.argv[2] || 'ovRYKliCqd';
  console.log('Inspecting classroom:', classroomId);

  const prefix = process.env.AWS_S3_PREFIX || 'learn/';
  const key = `${prefix}classrooms/${classroomId}.json`;

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || 'biodockify-storage',
        Key: key,
      }),
    );
    const str = await res.Body.transformToString();
    const json = JSON.parse(str);
    console.log('Stage ID:', json.stage?.id);
    console.log('Scenes count:', json.scenes?.length);
    console.log('Sample scene 0 actions:', JSON.stringify(json.scenes?.[0]?.actions, null, 2));
    console.log('Sample scene 1 actions:', JSON.stringify(json.scenes?.[1]?.actions, null, 2));
  } catch (err) {
    console.error('Failed to read from S3:', err);
  }
}

main();
