#!/usr/bin/env python3
"""Repair missing classroom narration audio.

For every classroom JSON in /tmp/audit_bulk, finds speech actions whose
audio file is missing locally (bulk sync = S3 mirror), generates TTS via
the app's edge-tts endpoint, and uploads to S3.

Resume-safe: skips files that already exist locally.
"""
import json
import os
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

BULK = "/tmp/audit_bulk"
TTS_URL = "http://127.0.0.1:3000/api/tts/audio/speech"
S3_PREFIX = "learn/classrooms"


def sh(cmd):
    return subprocess.run(["bash", "-c", cmd], capture_output=True, text=True)


def tts_generate(text, outfile):
    """Generate TTS mp3 via the app endpoint; returns True on success."""
    if len(text) > 3500:
        text = text[:3500]
    body = json.dumps({
        "model": "tts",
        "voice": "alloy",
        "input": text,
        "response_format": "mp3",
    })
    try:
        r = subprocess.run(
            ["curl", "-s", "-m", "60", "-o", outfile, "-w", "%{http_code}",
             "-X", "POST", TTS_URL, "-H", "Content-Type: application/json",
             "-d", body],
            capture_output=True, text=True, timeout=70)
    except Exception:
        return False
    code = (r.stdout or "").strip()
    size = os.path.getsize(outfile) if os.path.isfile(outfile) else 0
    if code != "200" or size <= 1000:
        if not hasattr(tts_generate, "_logged"):
            tts_generate._logged = True
            print(f"    [debug] tts http={code} size={size} out={outfile[-30:]}", flush=True)
        return False
    return True


def upload_s3(local, key):
    r = sh(
        "set -a; . /tmp/aws.env; set +a; "
        f"aws s3 cp '{local}' s3://$AWS_S3_BUCKET/{key} --region $AWS_S3_REGION"
        " >/dev/null 2>&1 && echo OK || echo FAIL")
    return r.stdout.strip() == "OK"


def process_classroom(cid):
    """Generate + upload all missing audio for one classroom."""
    p = f"{BULK}/{cid}.json"
    adir = f"{BULK}/{cid}/audio"
    if not os.path.isfile(p):
        return 0, 0
    try:
        d = json.load(open(p, encoding="utf-8"))
    except Exception:
        return 0, 0
    cl = d.get("classroom") or (d.get("data") or {}).get("classroom") or d

    tasks = []
    for s in cl.get("scenes") or []:
        for a in s.get("actions") or []:
            if a.get("type") == "speech" and a.get("audioUrl") and a.get("text"):
                fname = a["audioUrl"].rsplit("/", 1)[-1]
                local = f"{adir}/{fname}"
                if not os.path.isfile(local) or os.path.getsize(local) < 1000:
                    tasks.append((a["text"], fname, local))

    if not tasks:
        return 0, 0

    os.makedirs(adir, exist_ok=True)
    fixed, failed = 0, 0
    first_fail_reason = ""
    for text, fname, local in tasks:
        ok = False
        for attempt in range(3):
            if tts_generate(text, local):
                ok = True
                break
            time.sleep(3 * (attempt + 1))
        if ok:
            key = f"{S3_PREFIX}/{cid}/audio/{fname}"
            if upload_s3(local, key):
                fixed += 1
            else:
                failed += 1
                if not first_fail_reason:
                    first_fail_reason = f"UPLOAD_FAIL {fname[:30]}"
        else:
            failed += 1
            if not first_fail_reason:
                first_fail_reason = f"TTS_FAIL {fname[:30]}"
            try:
                os.remove(local)
            except OSError:
                pass
        time.sleep(0.3)
    if failed and first_fail_reason:
        print(f"    {cid} fail reason: {first_fail_reason}", flush=True)
    return fixed, failed


def main():
    cids = sorted(f[:-5] for f in os.listdir(BULK) if f.endswith(".json"))
    print(f"classrooms: {len(cids)}", flush=True)

    total_fixed = total_failed = 0
    start = time.time()
    with ThreadPoolExecutor(max_workers=4) as pool:
        for i, (fixed, failed) in enumerate(pool.map(process_classroom, cids), 1):
            total_fixed += fixed
            total_failed += failed
            if fixed or failed:
                print(f"  [{i}/{len(cids)}] {cids[i-1]}: +{fixed} audio, {failed} failed", flush=True)
            if i % 25 == 0:
                rate = i / max(time.time() - start, 1) * 60
                print(f"  progress {i}/{len(cids)} | fixed {total_fixed} | failed {total_failed} | {rate:.0f} cls/min", flush=True)

    print(f"\nDONE: {total_fixed} audio files repaired, {total_failed} failed", flush=True)


if __name__ == "__main__":
    main()
