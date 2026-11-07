#!/usr/bin/env python3
"""Deep audit using bulk-synced files at /tmp/audit_bulk (JSON + audio local)."""
import json
import os
import re
import sys
from collections import Counter

import psycopg2

DSN = "postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn"
BULK = "/tmp/audit_bulk"
CJK = re.compile(r"[\u4e00-\u9fff]")


def lum(h):
    c = h.lstrip("#")
    if len(c) == 3:
        c = "".join(x * 2 for x in c)
    try:
        r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
    except Exception:
        return None
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255


def ov(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    return ix * iy


def audit(cid, ltitle, ctitle):
    issues = []
    p = f"{BULK}/{cid}.json"
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

    for si, s in enumerate(scenes, 1):
        content = s.get("content") or {}
        canvas = content.get("canvas") or {}
        els = canvas.get("elements") or []
        stype = s.get("type") or content.get("type") or ""

        if not els and not content.get("html") and stype in ("slide", ""):
            issues.append(("EMPTY_SCENE", cid, ltitle, ctitle, f"scene {si}"))

        bg = (canvas.get("background") or {}).get("color") or "#ffffff"
        if els and (lum(bg) or 0) > 0.5:
            backdrops = [
                (e.get("left", 0), e.get("top", 0),
                 e.get("left", 0) + e.get("width", 0),
                 e.get("top", 0) + e.get("height", 0))
                for e in els
                if ((e.get("type") == "shape" and isinstance(e.get("fill"), str)
                     and (lum(e["fill"]) or 1) < 0.5) or e.get("type") == "image")
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
                        if not any(ov(tb, bd) > ta * 0.5 for bd in backdrops):
                            issues.append(("INVISIBLE_TEXT", cid, ltitle, ctitle,
                                           f"s{si} {m.group(1)}"))
                            break

        texts = [s.get("title") or ""]
        for a in s.get("actions", []):
            if a.get("type") == "speech":
                texts.append(a.get("text") or "")
        if len(CJK.findall(" ".join(texts))) > 10:
            issues.append(("CHINESE", cid, ltitle, ctitle, f"scene {si}"))

        for a in s.get("actions", []):
            if a.get("type") == "speech" and a.get("audioUrl"):
                fname = a["audioUrl"].rsplit("/", 1)[-1]
                ap = f"{BULK}/{cid}/audio/{fname}"
                if not os.path.isfile(ap):
                    issues.append(("MISSING_AUDIO", cid, ltitle, ctitle,
                                   f"s{si} {fname[:30]}"))
                elif os.path.getsize(ap) < 1000:
                    issues.append(("TINY_AUDIO", cid, ltitle, ctitle,
                                   f"s{si} {fname[:30]} ({os.path.getsize(ap)}B)"))

        if not s.get("actions"):
            issues.append(("SILENT_SCENE", cid, ltitle, ctitle, f"scene {si}"))

    return issues


def main():
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
    cur.execute(
        "SELECT l.classroom_id, l.title, c.title FROM learning_lessons l "
        "JOIN learning_courses c ON c.id = l.course_id "
        "WHERE l.classroom_id IS NOT NULL")
    rows = cur.fetchall()
    conn.close()
    print(f"auditing {len(rows)} classrooms (local files)...", flush=True)

    all_issues = []
    for i, (cid, lt, ct) in enumerate(rows, 1):
        all_issues.extend(audit(cid, lt, ct))
        if i % 100 == 0:
            print(f"  {i}/{len(rows)}", flush=True)

    per_type = Counter(x[0] for x in all_issues)
    print("\n=== AUDIT SUMMARY ===")
    for k, v in per_type.most_common():
        print(f"{k}: {v}")
    print(f"total issues: {len(all_issues)}")
    json.dump(all_issues, open("/opt/openlearn/localdb/audit_issues.json", "w"), indent=1)

    seen = set()
    for t, cid, lt, ct, det in all_issues:
        if t not in seen:
            seen.add(t)
            print(f"eg {t}: {cid} | {lt[:38]} | {ct[:22]} | {det}")


if __name__ == "__main__":
    main()
