#!/usr/bin/env python3
"""Create the BP-101T course mirroring the book's 5-unit PCI structure.

Maps existing Python classrooms (by lesson title keywords) into the correct
book unit, creating a course whose modules match the downloadable book 1:1.
"""
import re
import uuid

import psycopg2

DSN = "postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn"

COURSE_TITLE = "Python for Pharmaceutical Sciences (BP-101T)"

UNITS = [
    ("Unit 1: Introduction to Python & Pharmaceutical Applications", [
        r"\bintro\b", r"get started", r"installation", r"\bsyntax\b", r"variables?",
        r"data types", r"\boperators?\b", r"\bprint\b", r"\boutput\b", r"\binput\b",
        r"\bcasting\b", r"\bnumbers?\b", r"\bbooleans?\b", r"if[ /-]?else", r"control",
        r"\bloops?\b", r"\bwhile\b", r"\bfor\b", r"\bmatch\b", r"\bbasics\b",
    ]),
    ("Unit 2: Functions, Modules & Strings", [
        r"functions?", r"lambda", r"modules?", r"\bimport\b", r"arguments?",
        r"strings?", r"\bscope\b",
    ]),
    ("Unit 3: Data Structures: Lists, Tuples, Sets & Dictionaries", [
        r"\blists?\b", r"\btuples?\b", r"\bsets?\b", r"dictionaries?", r"\barrays?\b",
        r"data structures", r"stacks? .+ queues", r"queues",
    ]),
    ("Unit 4: File Handling, Exceptions & Libraries", [
        r"\bfiles?\b", r"file handling", r"exceptions?", r"\btry\b", r"\berror",
        r"\bjson\b", r"\bcsv\b", r"sqlite", r"\blibraries?\b", r"documentation",
        r"clean code",
    ]),
    ("Unit 5: NumPy, Pandas & Data Visualization for Pharmacy", [
        r"numpy", r"pandas", r"matplotlib", r"visualization", r"dataframes?",
        r"\beda\b", r"exploratory", r"data science", r"data analysis",
        r"scikit", r"machine learning", r"\bml\b", r"regression", r"classification",
        r"clustering", r"k-?means", r"sorting algorithms",
    ]),
]


def norm(s):
    return (s or "").lower().strip()


def classify(title):
    t = norm(title)
    for unit_title, patterns in UNITS:
        for p in patterns:
            if re.search(p, t):
                return unit_title
    return UNITS[0][0]  # default: Unit 1


def main():
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor()

    # Skip if already created (idempotent)
    cur.execute("SELECT id FROM learning_courses WHERE title = %s", (COURSE_TITLE,))
    row = cur.fetchone()
    if row:
        cid = row[0]
        print(f"course already exists: {cid}")
    else:
        cid = str(uuid.uuid4())
        cur.execute(
            """INSERT INTO learning_courses (id, title, description, category, is_published, created_at, updated_at)
               VALUES (%s, %s, %s, 'Python', true, now(), now())""",
            (cid, COURSE_TITLE,
             "The complete BP-101T course aligned 1:1 with the free Python for Pharmacists book — "
             "5 units per PCI syllabus: Python basics, functions & strings, data structures, "
             "file handling & exceptions, NumPy/Pandas/visualization with pharmaceutical examples."),
        )
        print(f"course created: {cid}")

    # Create the 5 modules
    mod_ids = {}
    for i, (unit_title, _) in enumerate(UNITS):
        cur.execute(
            "SELECT id FROM learning_modules WHERE course_id=%s AND title=%s", (cid, unit_title))
        row = cur.fetchone()
        if row:
            mod_ids[unit_title] = row[0]
        else:
            mid = str(uuid.uuid4())
            cur.execute(
                "INSERT INTO learning_modules (id, course_id, title, sort_order) VALUES (%s,%s,%s,%s)",
                (mid, cid, unit_title, i))
            mod_ids[unit_title] = mid
    print(f"modules ready: {len(mod_ids)}")

    # Collect existing Python classrooms from other courses (dedupe by classroom_id)
    cur.execute("""
        SELECT DISTINCT ON (l.classroom_id) l.classroom_id, l.title
        FROM learning_lessons l
        JOIN learning_courses c ON c.id = l.course_id
        WHERE l.classroom_id IS NOT NULL
          AND (c.title ILIKE '%%python%%' OR c.title ILIKE '%%data science%%')
          AND c.id != %s
        ORDER BY l.classroom_id, l.created_at ASC
    """, (cid,))
    rows = cur.fetchall()
    print(f"candidate classrooms: {len(rows)}")

    # Existing lessons in this course (by classroom) to avoid duplicates
    cur.execute("SELECT classroom_id FROM learning_lessons WHERE course_id=%s AND classroom_id IS NOT NULL", (cid,))
    used = {r[0] for r in cur.fetchall()}

    assigned = {t: 0 for t in mod_ids}
    inserted = 0
    for classroom_id, title in rows:
        if classroom_id in used:
            continue
        unit = classify(title)
        cur.execute(
            """INSERT INTO learning_lessons (course_id, module_id, title, classroom_id, sort_order, content, duration_minutes)
               VALUES (%s, %s, %s, %s, %s,
                 'Interactive video lesson with AI narration, slides and quizzes.',
                 15)""",
            (cid, mod_ids[unit], title, classroom_id, assigned[unit] + 1))
        assigned[unit] += 1
        inserted += 1

    print(f"lessons inserted: {inserted}")
    for t, n in assigned.items():
        print(f"  {t[:45]:47} {n}")

    cur.execute("""
        SELECT m.title, count(l.id) FROM learning_modules m
        LEFT JOIN learning_lessons l ON l.module_id = m.id
        WHERE m.course_id = %s GROUP BY m.title, m.sort_order ORDER BY m.sort_order
    """, (cid,))
    print("\nfinal course structure:")
    for t, n in cur.fetchall():
        print(f"  {t[:50]:52} {n} lessons")
    conn.close()


if __name__ == "__main__":
    main()
