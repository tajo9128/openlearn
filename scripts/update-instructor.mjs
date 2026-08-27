import fs from 'fs';
import path from 'path';

// Read .env.local if present
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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('No SUPABASE_URL or SUPABASE_KEY found in environment.');
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function main() {
  console.log('Fetching courses from Supabase...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/learning_courses?select=*&order=title.asc`, {
    headers,
  });

  if (!res.ok) {
    console.error('Failed to fetch courses:', res.status, await res.text());
    process.exit(1);
  }

  const courses = await res.json();
  console.log('=== COURSES DUMP ===');
  console.log(JSON.stringify(courses, null, 2));
}

main().catch(console.error);
