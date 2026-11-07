#!/usr/bin/env python3
"""Analyze downloaded classroom JSONs for Chinese narration; unlink those lessons."""
import json
import os
import re

import psycopg2

DSN = "postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn"
CJK = re.compile(r"[\u4e00-\u9fff]")
TMP = "/tmp/clsr_check"


def main():
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(
        "SELECT l.id, l.title, l.classroom_id FROM learning_lessons l "
        "WHERE l.classroom_id IS NOT NULL")
    rows = cur.fetchall()

    bad = []
    for lid, ltitle, cid in rows:
        p = f"{TMP}/{cid}.json"
        if not os.path.isfile(p):
            continue
        try:
            d = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        cl = d.get("classroom") or (d.get("data") or {}).get("classroom") or d
        texts = []
        for s in cl.get("scenes", []):
            texts.append(s.get("title") or "")
            for a in s.get("actions", []):
                if a.get("type") == "speech":
                    texts.append(a.get("text") or "")
        cjk = sum(len(CJK.findall(t)) for t in texts)
        total = sum(len(t) for t in texts)
        if total > 0 and cjk / max(total, 1) > 0.15:
            bad.append((lid, ltitle, cid, cjk))

    print(f"chinese classrooms found: {len(bad)}")
    for lid, lt, cid, n in bad:
        print(f"  UNLINK {cid} | {lt[:45]} | {n} cjk")
        cur.execute(
            "UPDATE learning_lessons SET classroom_id = NULL WHERE id = %s", (lid,))
    cur.execute("SELECT count(*) FROM learning_lessons WHERE classroom_id IS NULL")
    print("lessons unlinked (queued for English regen):", cur.fetchone()[0])
    conn.close()


if __name__ == "__main__":
    main()
