#!/usr/bin/env python3
"""Deep audit of every classroom linked to a lesson.

Checks per classroom:
  1. JSON loads and has scenes
  2. Every speech action's audio file exists in S3
  3. Slide scenes have visible text (no light-on-light)
  4. Narration is English (no Chinese)
  5. Scenes have actions (not empty shells)

Outputs a per-issue report + summary counts.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

import psycopg2

DSN = "postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn"
CJK = re.compile(r"[\u4e00-\u9fff]")
TMP = "/tmp/audit_cls"
os.makedirs(TMP, exist_ok=True)


def sh(cmd):
    return subprocess.run(["bash", "-c", cmd], capture_output=True, text=True).stdout.strip()


def lum(h):
    c = h.lstrip("#")
    if len(c) == 3:
        c = "".join(x * 2 for x in c)
    try:
        r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
    except Exception:
        return None
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255


def s3_exists(key):
    r = sh(
        "set -a; . /tmp/aws.env; set +a; "
        f"aws s3api head-object --bucket $AWS_S3_BUCKET --key '{key}' "
        f"--region $AWS_S3_REGION >/dev/null 2>&1 && echo YES || echo NO"
    )
    return r == "YES"


def audit_classroom(cid, ltitle, ctitle):
    issues = []
    p = f"{TMP}/{cid}.json"
    if not os.path.isfile(p):
        sh(
            "set -a; . /tmp/aws.env; set +a; "
            f"aws s3 cp s3://$AWS_S3_BUCKET/learn/classrooms/{cid}.json {p} "
            f"--region $AWS_S3_REGION >/dev/null 2>&1"
        )
    if not os.path.isfile(p):
        return [("MISSING_JSON", cid, ltitle, ctitle, "")]

    try:
        d = json.load(open(p, encoding="utf-8"))
    except Exception:
        return [("BAD_JSON", cid, ltitle, ctitle, "")]

    cl = d.get("classroom") or (d.get("data") or {}).get("classroom") or d
    scenes = cl.get("scenes") or []
    if not scenes:
        return [("NO_SCENES", cid, ltitle, ctitle, "")]

    # per-scene checks
    for si, s in enumerate(scenes, 1):
        content = s.get("content") or {}
        canvas = content.get("canvas") or {}
        els = canvas.get("elements") or []

        # empty scene (no canvas, no interactive html)
        if not els and not content.get("html") and s.get("type") == "slide":
            issues.append(("EMPTY_SCENE", cid, ltitle, ctitle, f"scene {si}"))

        # contrast: light text on light bg with no dark backdrop
        bg = (canvas.get("background") or {}).get("color") or "#ffffff"
        if els and (lum(bg) or 0) > 0.5:
            backdrops = [
                (e.get("left", 0), e.get("top", 0),
                 e.get("left", 0) + e.get("width", 0),
                 e.get("top", 0) + e.get("height", 0))
                for e in els
                if (e.get("type") == "shape" and isinstance(e.get("fill"), str)
                    and (lum(e["fill"]) or 1) < 0.5)
                or e.get("type") == "image"
            ]
            for e in els:
                if e.get("type") != "text":
                    continue
                html = e.get("content") or ""
                for m in re.finditer(r"color:\s*(#[0-9a-fA-F]{3,6})", html):
                    l = lum(m.group(1))
                    if l is not None and l > 0.75:
                        tb = (e.get("left", 0), e.get("top", 0),
                              e.get("left", 0) + e.get("width", 0),
                              e.get("top", 0) + e.get("height", 0))
                        ta = max(1, tb[2] - tb[0]) * max(1, tb[3] - tb[1])
                        def ov(a, b):
                            ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
                            iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
                            return ix * iy
                        if not any(ov(tb, bd) > ta * 0.5 for bd in backdrops):
                            issues.append(("INVISIBLE_TEXT", cid, ltitle, ctitle,
                                           f"scene {si} color {m.group(1)}"))
                            break

        # language check
        texts = [s.get("title") or ""]
        for a in s.get("actions", []):
            if a.get("type") == "speech":
                texts.append(a.get("text") or "")
        joined = " ".join(texts)
        if len(CJK.findall(joined)) > 10:
            issues.append(("CHINESE", cid, ltitle, ctitle, f"scene {si}"))

        # audio existence
        for a in s.get("actions", []):
            if a.get("type") == "speech" and a.get("audioUrl"):
                key = a["audioUrl"].lstrip("/")
                if not key.startswith("learn/"):
                    key = "learn/" + key if not key.startswith("api/") else key
                # audioUrl format: /api/classroom-media/{cid}/audio/{file}
                m = re.search(r"audio/(.+)$", key)
                if m:
                    s3key = f"learn/classrooms/{cid}/audio/{m.group(1)}"
                    if not s3_exists(s3key):
                        issues.append(("MISSING_AUDIO", cid, ltitle, ctitle,
                                       f"scene {si}: {m.group(1)}"))

        # scene has zero actions = silent slide
        if not s.get("actions"):
            issues.append(("SILENT_SCENE", cid, ltitle, ctitle, f"scene {si}"))

    return issues


def main():
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
    cur.execute(
        "SELECT l.classroom_id, l.title, c.title FROM learning_lessons l "
        "JOIN learning_courses c ON c.id = l.course_id "
        "WHERE l.classroom_id IS NOT NULL ORDER BY c.title, l.sort_order")
    rows = cur.fetchall()
    conn.close()
    print(f"auditing {len(rows)} classrooms ...", flush=True)

    all_issues = []
    done = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(audit_classroom, *r): r for r in rows}
        for fut in futures:
            try:
                all_issues.extend(fut.result())
            except Exception as e:
                all_issues.append(("AUDIT_ERROR", "?", "?", "?", str(e)[:60]))
            done += 1
            if done % 50 == 0:
                print(f"  {done}/{len(rows)} ...", flush=True)

    from collections import Counter
    per_type = Counter(i[0] for i in all_issues)
    print("\n=== AUDIT SUMMARY ===")
    for k, v in per_type.most_common():
        print(f"{k}: {v}")
    print(f"\ntotal issues: {len(all_issues)}")
    json.dump(all_issues, open("/opt/openlearn/localdb/audit_issues.json", "w"), indent=1)
    print("saved to audit_issues.json")
    # print sample of each type
    seen_types = set()
    for t, cid, lt, ct, detail in all_issues:
        if t not in seen_types:
            seen_types.add(t)
            print(f"example {t}: {cid} | {lt[:40]} | {ct[:25]} | {detail}")


if __name__ == "__main__":
    main()
