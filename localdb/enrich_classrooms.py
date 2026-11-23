#!/usr/bin/env python3
"""Enrich Python classrooms with worked code-example scenes (data from JSON)."""
import json
import os
import re
import subprocess
import uuid

import psycopg2

DSN = "postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn"
CID = "f14ecef4-baa6-4170-ad45-4783b045fb76"
TTS = "http://127.0.0.1:3000/api/tts/audio/speech"
BULK = "/tmp/audit_bulk"
HERE = "/opt/openlearn/localdb"
MARKER = "Worked Example"


def load_examples():
    data = json.load(open(f"{HERE}/pharma_examples.json", encoding="utf-8"))
    for ex in data:
        ex["match"] = [re.compile(p) for p in ex["match"]]
    return data


def pick(examples, title):
    t = (title or "").lower()
    for ex in examples:
        for p in ex["match"]:
            if p.search(t):
                return ex
    return examples[0]


def tts(text, outfile):
    body = json.dumps({"model": "tts", "voice": "alloy", "input": text[:3500],
                       "response_format": "mp3"})
    r = subprocess.run(
        ["curl", "-s", "-m", "60", "-o", outfile, "-w", "%{http_code}",
         "-X", "POST", TTS, "-H", "Content-Type: application/json", "-d", body],
        capture_output=True, text=True)
    return (r.stdout.strip() == "200" and os.path.isfile(outfile)
            and os.path.getsize(outfile) > 1000)


def upload(local, key):
    r = subprocess.run(
        ["bash", "-c",
         "set -a; . /tmp/aws.env; set +a; "
         f"aws s3 cp '{local}' s3://$AWS_S3_BUCKET/{key} --region $AWS_S3_REGION "
         ">/dev/null 2>&1 && echo OK || echo FAIL"],
        capture_output=True, text=True)
    return r.stdout.strip() == "OK"


def find_cl(d):
    return d.get("classroom") or (d.get("data") or {}).get("classroom") or d


def main():
    examples = load_examples()
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(
        "SELECT l.classroom_id, l.title FROM learning_lessons l "
        "WHERE l.course_id = %s AND l.classroom_id IS NOT NULL "
        "ORDER BY l.module_id, l.sort_order", (CID,))
    lessons = cur.fetchall()
    conn.close()
    print(f"lessons to enrich: {len(lessons)}", flush=True)

    enriched = skipped = failed = 0
    for cid, title in lessons:
        p = f"{BULK}/{cid}.json"
        if not os.path.isfile(p):
            subprocess.run(
                ["bash", "-c",
                 "set -a; . /tmp/aws.env; set +a; "
                 f"aws s3 cp s3://$AWS_S3_BUCKET/learn/classrooms/{cid}.json {p} "
                 "--region $AWS_S3_REGION >/dev/null 2>&1"])
        if not os.path.isfile(p):
            failed += 1
            continue
        try:
            d = json.load(open(p, encoding="utf-8"))
        except Exception:
            failed += 1
            continue
        cl = find_cl(d)
        scenes = cl.get("scenes") or []

        if any(MARKER in (s.get("title") or "") for s in scenes):
            skipped += 1
            continue

        ex = pick(examples, title)
        action_id = f"action_{uuid.uuid4().hex[:10]}"
        audio_fname = f"tts_ex_{action_id}.mp3"
        adir = f"{BULK}/{cid}/audio"
        os.makedirs(adir, exist_ok=True)
        local_audio = f"{adir}/{audio_fname}"

        if not tts(ex["narration"], local_audio):
            print(f"  TTS FAIL: {title[:40]}", flush=True)
            failed += 1
            time.sleep(5)
            continue

        if not upload(local_audio, f"learn/classrooms/{cid}/audio/{audio_fname}"):
            print(f"  UPLOAD FAIL: {title[:40]}", flush=True)
            failed += 1
            continue

        scene = {
            "id": f"scene_{uuid.uuid4().hex[:10]}",
            "type": "interactive",
            "title": ex["title"],
            "content": {
                "type": "interactive",
                "widgetType": "code",
                "language": "python",
                "title": ex["title"],
                "description": "Try this pharmaceutical Python example yourself.",
                "html": (
                    '<div style="font-family:Consolas,Monaco,monospace;background:#0d1117;'
                    'color:#c9d1d9;padding:20px;border-radius:8px;overflow-x:auto;'
                    'font-size:13px;line-height:1.6;">'
                    '<div style="color:#8b949e;margin-bottom:10px;font-size:11px;'
                    'letter-spacing:1px;">PHARMACEUTICAL PYTHON EXAMPLE</div>'
                    '<pre style="margin:0;white-space:pre-wrap;">'
                    + ex["code"].replace("&", "&amp;").replace("<", "&lt;")
                    + "</pre></div>"
                ),
                "initialCode": ex["code"],
            },
            "actions": [{
                "id": action_id,
                "type": "speech",
                "text": ex["narration"],
                "audioId": audio_fname.replace(".mp3", ""),
                "audioUrl": f"/api/classroom-media/{cid}/audio/{audio_fname}",
            }],
        }
        scenes.append(scene)
        cl["scenes"] = scenes
        json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False)

        up = subprocess.run(
            ["bash", "-c",
             "set -a; . /tmp/aws.env; set +a; "
             f"aws s3 cp {p} s3://$AWS_S3_BUCKET/learn/classrooms/{cid}.json "
             "--region $AWS_S3_REGION >/dev/null 2>&1 && echo OK || echo FAIL"],
            capture_output=True, text=True)
        if up.stdout.strip() == "OK":
            enriched += 1
        else:
            failed += 1
        if enriched % 10 == 0 and enriched:
            print(f"  progress: {enriched} enriched, {skipped} skipped, {failed} failed", flush=True)

    print(f"\nDONE: {enriched} enriched, {skipped} already done, {failed} failed", flush=True)


if __name__ == "__main__":
    import time
    main()
