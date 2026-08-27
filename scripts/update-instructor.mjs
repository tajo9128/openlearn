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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/learning_courses?select=id,title,instructor_name`, {
    headers,
  });

  if (!res.ok) {
    console.error('Failed to fetch courses:', res.status, await res.text());
    process.exit(1);
  }

  const courses = await res.json();
  console.log(`Found ${courses.length} courses:`);
  for (const c of courses) {
    console.log(` - [${c.id}] ${c.title} (Instructor: "${c.instructor_name}")`);
  }

  const toUpdate = courses.filter((c) => c.instructor_name && c.instructor_name.toLowerCase().includes('tajuddin'));
  console.log(`Found ${toUpdate.length} courses with Tajuddin as instructor.`);

  for (const c of toUpdate) {
    console.log(`Updating course "${c.title}" to instructor "BioDockify AI"...`);
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/learning_courses?id=eq.${encodeURIComponent(c.id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ instructor_name: 'BioDockify AI' }),
    });

    if (!updateRes.ok) {
      console.error(`Failed to update course ${c.id}:`, updateRes.status, await updateRes.text());
    } else {
      console.log(`Successfully updated course ${c.id}`);
    }
  }

  // Also check if any other courses have null or empty instructor_name
  const emptyInstructor = courses.filter((c) => !c.instructor_name || c.instructor_name.trim() === '');
  for (const c of emptyInstructor) {
    console.log(`Setting default instructor "BioDockify AI" for course "${c.title}"...`);
    await fetch(`${SUPABASE_URL}/rest/v1/learning_courses?id=eq.${encodeURIComponent(c.id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ instructor_name: 'BioDockify AI' }),
    });
  }

  console.log('All courses updated successfully.');
}

main().catch(console.error);
