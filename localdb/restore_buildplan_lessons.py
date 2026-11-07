#!/usr/bin/env python3
"""Restore lessons deleted by the null-classroom cleanup.
Re-inserts build-plan lessons with fuzzy classroom matching."""
import json
import re

import psycopg2

DSN = "postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn"
BASE = "/opt/openlearn/localdb"


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def main():
    plans = json.load(open(f"{BASE}/build_plans.json", encoding="utf-8"))
    rooms = json.load(open(f"{BASE}/all_classrooms.json", encoding="utf-8"))

    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor()

    # course id lookup by title
    cur.execute("SELECT id, title FROM learning_courses")
    course_by_norm = {norm(t): (cid, t) for cid, t in cur.fetchall()}

    # existing lesson titles per course
    cur.execute("SELECT course_id, title FROM learning_lessons")
    existing = set()
    for cid, t in cur.fetchall():
        existing.add((cid, norm(t)))

    # used classrooms
    cur.execute("SELECT classroom_id FROM learning_lessons WHERE classroom_id IS NOT NULL")
    used = {r[0] for r in cur.fetchall()}

    # module id lookup
    cur.execute("SELECT id, course_id, title FROM learning_modules")
    mod_ids = {}
    for mid, cid, mt in cur.fetchall():
        mod_ids[(cid, norm(mt))] = mid

    inserted = 0
    for plan in plans:
        key = norm(plan["title"])
        course = course_by_norm.get(key)
        if not course:
            continue
        cid, ctitle = course
        order = 0
        for mtitle, lessons in plan["modules"]:
            mid = mod_ids.get((cid, norm(mtitle)))
            for lt in lessons:
                order += 1
                if (cid, norm(lt)) in existing:
                    continue
                # fuzzy classroom match
                nt = norm(lt)
                room_cid = None
                best_score = 0
                for r in rooms:
                    if r["cid"] in used or not r["title"]:
                        continue
                    rt = norm(r["title"])
                    # score: containment or word overlap
                    if nt and rt:
                        if nt in rt or rt in nt:
                            score = min(len(nt), len(rt))
                        else:
                            nw, rw = set(nt.split()), set(rt.split())
                            overlap = len(nw & rw)
                            score = overlap * 3 if overlap >= 2 else 0
                        if score > best_score:
                            best_score = score
                            room_cid = r["cid"]
                if room_cid:
                    used.add(room_cid)
                cur.execute(
                    """INSERT INTO learning_lessons (course_id, module_id, title, classroom_id, sort_order)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (cid, mid, lt, room_cid, order),
                )
                inserted += 1

    cur.execute("SELECT count(*) FROM learning_lessons")
    total = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM learning_lessons WHERE classroom_id IS NOT NULL")
    linked = cur.fetchone()[0]
    print(f"re-inserted: {inserted}")
    print(f"total lessons: {total} | with classroom: {linked}")
    conn.close()


if __name__ == "__main__":
    main()
