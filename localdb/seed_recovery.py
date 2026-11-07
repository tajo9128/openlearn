#!/usr/bin/env python3
"""Seed the local DB with courses recovered from the cached catalog page,
plus the Python-bootcamp lesson list recovered from the video render order.
Full data arrives later via import_from_supabase.sh.
Run on the VPS:  python3 seed_recovery.py courses.json [--lessons manifest lessons.json workdir]
"""
import json
import re
import sys
import os

import psycopg2

DSN = "postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn"


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:80] or "lesson"


def seed_courses(conn, courses):
    with conn.cursor() as cur:
        for c in courses:
            cur.execute(
                """INSERT INTO learning_courses (id, title, description, category, is_published, updated_at)
                   VALUES (%s, %s, %s, %s, true, now())
                   ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title,
                     description = EXCLUDED.description""",
                (c["id"], c["title"], c["description"], c.get("category") or "General"),
            )
    print(f"courses seeded: {len(courses)}")


def seed_python_lessons(conn, manifest_lines, workdir):
    """manifest_lines: ordered lesson titles from the render log; workdir has
    classroom JSONs whose stage.name matches lesson titles."""
    name_to_cid = {}
    for fn in os.listdir(workdir):
        if not fn.endswith(".json"):
            continue
        try:
            d = json.load(open(os.path.join(workdir, fn), encoding="utf-8"))
            cl = d.get("classroom") or {}
            nm = (cl.get("stage") or {}).get("name")
            if nm:
                name_to_cid[nm] = cl.get("id") or fn[:-5]
        except Exception:
            pass

    PY_COURSE = "bd127d48-37d6-4ff0-9821-acdf9abf667e"
    seen, order = set(), []
    for line in manifest_lines:
        m = re.match(r"\s*OK (\d+)_(.+)\.mp4", line)
        if not m:
            continue
        title = m.group(2).strip()
        if title in seen:
            continue
        seen.add(title)
        order.append((int(m.group(1)), title))

    # lesson UUIDs come from the live sitemap snapshot if provided
    slug_to_id = {}
    sm = os.environ.get("SITEMAP_FILE")
    if sm and os.path.exists(sm):
        src = open(sm, encoding="utf-8").read()
        for u, lid in re.findall(r"<loc>https://learn\.biodockify\.com/learn/(.+?)--([a-f0-9-]{36})</loc>", src):
            slug_to_id[u] = lid

    n = 0
    with conn.cursor() as cur:
        for idx, (num, title) in enumerate(sorted(order), 1):
            cid = name_to_cid.get(title)
            lid = slug_to_id.get(slug(title))
            if not lid:
                continue  # cannot mint ids that match public URLs; skip for pg_dump
            cur.execute(
                """INSERT INTO learning_lessons (id, course_id, title, classroom_id, sort_order)
                   VALUES (%s, %s, %s, %s, %s)
                   ON CONFLICT (id) DO NOTHING""",
                (lid, PY_COURSE, title, cid, num),
            )
            n += 1
    print(f"python-bootcamp lessons seeded: {n}")


def main():
    courses = json.load(open(sys.argv[1], encoding="utf-8"))
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    seed_courses(conn, courses)
    if len(sys.argv) > 3 and sys.argv[2] == "--lessons":
        lines = open(sys.argv[3], encoding="utf-8").read().splitlines()
        seed_python_lessons(conn, lines, sys.argv[4])
    conn.close()


if __name__ == "__main__":
    main()
