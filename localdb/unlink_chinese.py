#!/usr/bin/env python3
"""Find classrooms with Chinese narration, unlink them for regeneration."""
import json
import os
import re
import subprocess

import psycopg2

DSN = "postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn"
CJK = re.compile(r"[\u4e00-\u9fff]")
TMP = "/tmp/clsr_check"


def main():
    os.makedirs(TMP, exist_ok=True)

    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(
        "SELECT l.id, l.title, l.classroom_id, c.title "
        "FROM learning_lessons l JOIN learning_courses c ON c.id=l.course_id "
        "WHERE l.classroom_id IS NOT NULL")
    rows = cur.fetchall()
    print(f"linked classrooms: {len(rows)}", flush=True)

    bad = []
    checked = 0
    for lid, ltitle, cid, ctitle in rows:
        p = f"{TMP}/{cid}.json"
        if not os.path.isfile(p):
            subprocess.run(
                ["bash", "-c",
                 f"set -a; . /tmp/aws.env; set +a; "
                 f"aws s3 cp s3://$AWS_S3_BUCKET/learn/classrooms/{cid}.json {p} "
                 f"--region $AWS_S3_REGION >/dev/null 2>&1"])
        if not os.path.isfile(p):
            continue
        try:
            d = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        checked += 1
        # only check narration text (speech actions) + scene titles
        texts = []
        cl = d.get("classroom") or (d.get("data") or {}).get("classroom") or d
        for s in cl.get("scenes", []):
            texts.append(s.get("title") or "")
            for a in s.get("actions", []):
                if a.get("type") == "speech":
                    texts.append(a.get("text") or "")
        cjk = sum(len(CJK.findall(t)) for t in texts)
        total = sum(len(t) for t in texts)
        if total > 0 and cjk / max(total, 1) > 0.15:
            bad.append((lid, ltitle, cid, ctitle, cjk))

    print(f"checked content: {checked}, chinese classrooms: {len(bad)}", flush=True)
    for lid, lt, cid, ct, n in bad:
        print(f"  UNLINK {cid} | {lt[:45]} | {ct[:28]} | {n} cjk", flush=True)
        cur.execute(
            "UPDATE learning_lessons SET classroom_id = NULL WHERE id = %s", (lid,))
    print("unlinked:", len(bad), flush=True)
    conn.close()


if __name__ == "__main__":
    main()
