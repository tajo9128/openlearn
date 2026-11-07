#!/usr/bin/env python3
"""Final fixes from the deep audit:
1. INVISIBLE_TEXT: darken light-on-light text in 6 classrooms (S3 + local JSON)
2. CHINESE: translate 3 scenes' narration to English via Gemini, update JSON,
   delete old audio, regenerate via edge-tts endpoint.
"""
import json
import os
import re
import subprocess
import time

BULK = "/tmp/audit_bulk"
DARK = "#1e293b"
TTS_URL = "http://127.0.0.1:3000/api/tts/audio/speech"
VERTEX = "http://172.30.1.1:8766/v1/chat/completions"

INVISIBLE_CIDS = ["WVc6HW52OH", "XJ7yY_NXGb", "ZEirj9OUIz", "d5a0qR98hL",
                  "dvRTflV6ND", "nnsPWfqgHS"]
CHINESE_FIX = [("pa8s_7DPYg", 5), ("1CtUwNRPoY", 11), ("uRXvTOMc50", 12)]


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


COLOR_RE = re.compile(r"(color:\s*)(#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b)")


def find_classroom(doc):
    if isinstance(doc, dict) and isinstance(doc.get("scenes"), list):
        return doc
    if isinstance(doc, dict):
        for v in doc.values():
            r = find_classroom(v)
            if r is not None:
                return r
    return None


def fix_contrast_in(cid):
    p = f"{BULK}/{cid}.json"
    d = json.load(open(p, encoding="utf-8"))
    cl = find_classroom(d)
    changed = 0
    for s in cl.get("scenes", []):
        cv = (s.get("content") or {}).get("canvas") or {}
        els = cv.get("elements") or []
        if not els:
            continue
        bg = (cv.get("background") or {}).get("color") or "#ffffff"
        if (lum(bg) or 0) < 0.5:
            continue
        backdrops = [
            (e.get("left", 0), e.get("top", 0), e.get("left", 0) + e.get("width", 0),
             e.get("top", 0) + e.get("height", 0))
            for e in els
            if ((e.get("type") == "shape" and isinstance(e.get("fill"), str)
                 and (lum(e["fill"]) or 1) < 0.5) or e.get("type") == "image")
        ]
        for e in els:
            if e.get("type") != "text":
                continue
            html = e.get("content") or ""
            if not isinstance(html, str) or "color:" not in html:
                continue
            if not any((lum(m.group(2)) or 0) > 0.75 for m in COLOR_RE.finditer(html)):
                continue
            tb = (e.get("left", 0), e.get("top", 0), e.get("left", 0) + e.get("width", 0),
                  e.get("top", 0) + e.get("height", 0))
            ta = max(1, tb[2] - tb[0]) * max(1, tb[3] - tb[1])
            if any(ov(tb, bd) > ta * 0.5 for bd in backdrops):
                continue

            def repl(m):
                return m.group(1) + (DARK if (lum(m.group(2)) or 0) > 0.75 else m.group(2))

            new_html = COLOR_RE.sub(repl, html)
            if new_html != html:
                e["content"] = new_html
                changed += 1
    if changed:
        json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False)
    return changed


def upload_json(cid):
    r = subprocess.run(
        ["bash", "-c",
         "set -a; . /tmp/aws.env; set +a; "
         f"aws s3 cp {BULK}/{cid}.json s3://$AWS_S3_BUCKET/learn/classrooms/{cid}.json "
         "--region $AWS_S3_REGION >/dev/null 2>&1 && echo OK || echo FAIL"],
        capture_output=True, text=True)
    return r.stdout.strip() == "OK"


def translate_to_english(text):
    body = json.dumps({
        "model": "gemini-2.5-flash",
        "messages": [{"role": "user", "content":
            "Translate this classroom narration to natural English suitable for a "
            "university lecture. Keep the BioDockify AI instructor tone. Output ONLY "
            "the translation, nothing else:\n\n" + text}],
        "max_tokens": 2000, "temperature": 0.3,
    }).encode()
    req = subprocess.run(
        ["curl", "-s", "-m", "90", "-X", "POST", VERTEX,
         "-H", "Content-Type: application/json", "-d", "@-"],
        input=body, capture_output=True)
    try:
        d = json.loads(req.stdout)
        out = d["choices"][0]["message"]["content"].strip()
        # strip any fences
        out = re.sub(r"^```.*?\n", "", out)
        out = re.sub(r"\n```$", "", out)
        return out if len(out) > 30 else None
    except Exception:
        return None


def regen_audio(text, outfile):
    if len(text) > 3500:
        text = text[:3500]
    body = json.dumps({"model": "tts", "voice": "alloy", "input": text,
                       "response_format": "mp3"})
    r = subprocess.run(
        ["curl", "-s", "-m", "60", "-o", outfile, "-w", "%{http_code}",
         "-X", "POST", TTS_URL, "-H", "Content-Type: application/json", "-d", body],
        capture_output=True, text=True)
    return r.stdout.strip() == "200" and os.path.isfile(outfile) and os.path.getsize(outfile) > 1000


def upload_audio(local, cid, fname):
    r = subprocess.run(
        ["bash", "-c",
         "set -a; . /tmp/aws.env; set +a; "
         f"aws s3 cp {local} s3://$AWS_S3_BUCKET/learn/classrooms/{cid}/audio/{fname} "
         "--region $AWS_S3_REGION >/dev/null 2>&1 && echo OK || echo FAIL"],
        capture_output=True, text=True)
    return r.stdout.strip() == "OK"


def fix_chinese_scene(cid, scene_no):
    p = f"{BULK}/{cid}.json"
    d = json.load(open(p, encoding="utf-8"))
    cl = find_classroom(d)
    s = cl.get("scenes", [])[scene_no - 1]

    # translate title
    if s.get("title"):
        t = translate_to_english(s["title"])
        if t:
            print(f"    title: {s['title'][:40]!r} -> {t[:40]!r}", flush=True)
            s["title"] = t

    # translate each speech action + regen audio
    for a in s.get("actions", []):
        if a.get("type") == "speech" and a.get("text"):
            eng = translate_to_english(a["text"])
            if not eng:
                print(f"    translation failed for action {a.get('id')}", flush=True)
                continue
            a["text"] = eng
            fname = (a.get("audioUrl") or "").rsplit("/", 1)[-1]
            if not fname:
                continue
            local = f"{BULK}/{cid}/audio/{fname}"
            if regen_audio(eng, local) and upload_audio(local, cid, fname):
                print(f"    audio regenerated: {fname}", flush=True)
            else:
                print(f"    audio regen FAILED: {fname}", flush=True)

    json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False)
    upload_json(cid)
    # also refresh canvas text elements with CJK in this scene
    for e in (s.get("content") or {}).get("canvas", {}).get("elements") or []:
        if e.get("type") == "text" and re.search(r"[\u4e00-\u9fff]", e.get("content") or ""):
            eng = translate_to_english(re.sub(r"<[^>]+>", "", e["content"]))
            if eng:
                e["content"] = f'<p style="font-size: inherit;">{eng}</p>'
    json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False)
    upload_json(cid)


def main():
    print("== contrast fixes ==", flush=True)
    for cid in INVISIBLE_CIDS:
        n = fix_contrast_in(cid)
        up = upload_json(cid) if n else True
        print(f"  {cid}: {n} texts darkened, upload={'OK' if up else 'FAIL'}", flush=True)

    print("== chinese scene fixes ==", flush=True)
    for cid, scene in CHINESE_FIX:
        print(f"  {cid} scene {scene}:", flush=True)
        try:
            fix_chinese_scene(cid, scene)
        except Exception as e:
            print(f"    ERROR: {e}", flush=True)

    print("ALL FIXES DONE", flush=True)


if __name__ == "__main__":
    main()
