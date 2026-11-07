-- Local schema for learn.biodockify.com (reconstructed from app code).
-- The authoritative schema+data arrives later via import_from_supabase.sh;
-- this bootstraps enough for the app to run immediately.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PostgREST role (app sends Supabase-style apikey headers; ignored here)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'learn_anon') THEN
    CREATE ROLE learn_anon NOLOGIN;
  END IF;
END $$;

-- ============ core learning tables ============

CREATE TABLE IF NOT EXISTS learning_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text DEFAULT 'General',
  difficulty text,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES learning_courses(id) ON DELETE CASCADE,
  title text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES learning_courses(id) ON DELETE CASCADE,
  module_id uuid REFERENCES learning_modules(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text,
  duration_minutes int,
  classroom_id text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  course_id uuid REFERENCES learning_courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  lesson_id uuid REFERENCES learning_lessons(id) ON DELETE CASCADE,
  course_id uuid REFERENCES learning_courses(id) ON DELETE CASCADE,
  status text DEFAULT 'in_progress',
  score int,
  time_spent_seconds int,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS learning_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  course_id uuid REFERENCES learning_courses(id) ON DELETE CASCADE,
  certificate_code text,
  issued_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_certificate_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid REFERENCES learning_certificates(id) ON DELETE CASCADE,
  recipient_email text,
  issued_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES learning_lessons(id) ON DELETE CASCADE,
  course_id uuid REFERENCES learning_courses(id) ON DELETE CASCADE,
  title text,
  description text,
  exercise_type text DEFAULT 'coding',
  difficulty text DEFAULT 'easy',
  points int DEFAULT 20,
  time_limit_minutes int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_exercise_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid REFERENCES learning_exercises(id) ON DELETE CASCADE,
  question text,
  question_type text DEFAULT 'multiple_choice',
  options jsonb,
  correct_answer text,
  explanation text,
  sort_order int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS learning_exercise_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid REFERENCES learning_exercises(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  answer text,
  code text,
  is_correct boolean,
  score int,
  submitted_at timestamptz DEFAULT now()
);

-- ============ cohorts / social ============

CREATE TABLE IF NOT EXISTS learning_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_cohort_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid REFERENCES learning_cohorts(id) ON DELETE CASCADE,
  user_id text,
  email text,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_cohort_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid REFERENCES learning_cohorts(id) ON DELETE CASCADE,
  title text,
  reminder_days_before int DEFAULT 3,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_cohort_goal_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES learning_cohort_goals(id) ON DELETE CASCADE,
  member_id uuid REFERENCES learning_cohort_members(id) ON DELETE CASCADE,
  due_date timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS learning_cohort_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid REFERENCES learning_cohorts(id) ON DELETE CASCADE,
  course_id uuid REFERENCES learning_courses(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_newsfeed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid REFERENCES learning_cohorts(id) ON DELETE CASCADE,
  author_id text,
  content text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_newsfeed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsfeed_id uuid REFERENCES learning_newsfeed(id) ON DELETE CASCADE,
  author_id text,
  content text,
  created_at timestamptz DEFAULT now()
);

-- ============ misc features ============

CREATE TABLE IF NOT EXISTS learning_knowledge_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_github_repos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  repo_name text,
  repo_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_compliance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  requirement text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_compliance_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid REFERENCES learning_compliance_records(id) ON DELETE CASCADE,
  sent_at timestamptz DEFAULT now()
);

-- ============ local auth (GoTrue-compatible shim backing store) ============

CREATE TABLE IF NOT EXISTS local_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text,
  display_name text,
  email_confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS local_sessions (
  token text PRIMARY KEY,
  user_id uuid REFERENCES local_users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- ============ indexes & grants ============

CREATE INDEX IF NOT EXISTS idx_lessons_course ON learning_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_classroom ON learning_lessons(classroom_id);
CREATE INDEX IF NOT EXISTS idx_enroll_user ON learning_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_certs_user ON learning_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_exq_exercise ON learning_exercise_questions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON local_sessions(user_id);

GRANT USAGE ON SCHEMA public TO learn_anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO learn_anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO learn_anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO learn_anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO learn_anon;
