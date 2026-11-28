-- Per-course certificate templates: title/description/hours frozen per course.
-- Issuing a certificate later only needs student name + date.

CREATE TABLE IF NOT EXISTS certificate_templates (
  course_id uuid PRIMARY KEY REFERENCES learning_courses(id) ON DELETE CASCADE,
  course_title text NOT NULL,
  course_description text,
  training_hours int NOT NULL DEFAULT 10,
  signatories jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

GRANT ALL ON certificate_templates TO learn_anon;

-- Seed one template per published course, hours = sum of lesson durations
INSERT INTO certificate_templates (course_id, course_title, course_description, training_hours)
SELECT c.id, c.title, c.description,
  GREATEST(10, CEIL(COALESCE(SUM(l.duration_minutes), 0) / 60.0)::int)
FROM learning_courses c
LEFT JOIN learning_lessons l ON l.course_id = c.id
WHERE c.is_published = true
GROUP BY c.id, c.title, c.description
ON CONFLICT (course_id) DO UPDATE
  SET course_title = EXCLUDED.course_title,
      course_description = EXCLUDED.course_description,
      training_hours = EXCLUDED.training_hours,
      updated_at = now();

SELECT ct.course_title, ct.training_hours
FROM certificate_templates ct ORDER BY ct.course_title;
