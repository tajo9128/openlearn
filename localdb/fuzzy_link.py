#!/usr/bin/env python3
"""Fuzzy-link lessons that have no classroom: match lesson title to an
unused S3 classroom by prefix/containment (e.g. 'Python Lists' matches
'Python Lists Mastery')."""
import json
import re

import psycopg2

DSN = "postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn"


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def main():
    rooms = json.load(open("/opt/openlearn/localdb/all_classrooms.json", encoding="utf-8"))
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT classroom_id FROM learning_lessons WHERE classroom_id IS NOT NULL")
    used = {r[0] for r in cur.fetchall()}

    cur.execute(
        "SELECT id, title FROM learning_lessons WHERE classroom_id IS NULL ORDER BY course_id, sort_order")
    nulls = cur.fetchall()
    print(f"null-classroom lessons: {len(nulls)}")

    linked, still = 0, 0
    for lid, title in nulls:
        nt = norm(title)
        if not nt:
            continue
        # prefer exact, then containment (either direction), shortest title wins
        cands = [r for r in rooms if r["cid"] not in used and
                 (nt in norm(r["title"]) or norm(r["title"]) in nt) and norm(r["title"])]
        if not cands:
            still += 1
            continue
        cands.sort(key=lambda r: len(r["title"]))
        room = cands[0]
        used.add(room["cid"])
        cur.execute("UPDATE learning_lessons SET classroom_id=%s WHERE id=%s", (room["cid"], lid))
        linked += 1

    print(f"linked: {linked}, still null: {still}")
    cur.execute("SELECT count(*) FROM learning_lessons WHERE classroom_id IS NULL")
    print("remaining nulls in DB:", cur.fetchone()[0])
    conn.close()


if __name__ == "__main__":
    main()
