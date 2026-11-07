#!/usr/bin/env python3
"""Fix the 3 Chinese scenes: inline translations, update S3 JSON, regen TTS."""
import json
import os
import re
import subprocess

BULK = "/tmp/audit_bulk"
TTS_URL = "http://127.0.0.1:3000/api/tts/audio/speech"

TRANSLATIONS = {
    "action_m2JrxnSv": "Chimeric DNA molecules, as the name suggests, are hybrid molecules. They form during amplification when DNA fragments from distant, unrelated genomic locations are joined together through abnormal mechanisms.",
    "action_uiAguGza": "Let's look at exactly how this happens. During strand-displacement synthesis, a newly extending DNA strand displaces a partially synthesized, incomplete strand from the template. The critical problem is that this displaced single-stranded DNA does not stay put — it searches for a new template to prime.",
    "action_atzHQGQJ": "Hello everyone! Today let's quickly check our understanding of the core concepts of pre-training. Please complete the questions below independently — we'll review them together after you submit.",
    "action_w39kb-vS": "However, this is not always the case. The second scenario is 'activation' — the exact opposite. Here, the parent drug itself may be inactive or only weakly active; it is a 'prodrug'. After metabolism, it is converted into a metabolite with stronger pharmacological activity. The classic example is codeine, which is converted to morphine by CYP2D6 in the body — and morphine is the main substance responsible for the analgesic effect. This tells us that individual differences in metabolic enzyme activity can significantly affect the efficacy of such drugs.",
    "action_83vZgCG-": "Now, let's look at a third scenario that is critically important in clinical practice: the formation of toxic metabolites. Some drug metabolites not only lack therapeutic effect, but directly damage body tissues, especially the liver. Acetaminophen is a typical example. At therapeutic doses, it is metabolized mainly through safe pathways. But when the dose is excessive, or certain metabolic enzymes are inhibited, a highly reactive toxic intermediate called NAPQI is formed. If glutathione stores are depleted, it causes hepatocyte necrosis. This is a classic teaching case linking drug metabolism directly to drug toxicity and safe medication use.",
    "action_lWCoZh90": "Chimeric DNA molecules, as the name suggests, are hybrid molecules.",
    "action_OcL2jpe1": "This displaced single-stranded DNA searches for a new template to prime.",
    "action_aQpJud9T": "This is how chimeric artifacts form during amplification.",
    "action_Dpn0UCBB": "Let's examine the differences between active and inactive metabolites.",
    "action__PQOOlkP": "The parent drug may be inactive — a so-called prodrug.",
    "action_055wxH9y": "This links drug metabolism directly to drug safety.",
}


def find_classroom(doc):
    if isinstance(doc, dict) and isinstance(doc.get("scenes"), list):
        return doc
    if isinstance(doc, dict):
        for v in doc.values():
            r = find_classroom(v)
            if r is not None:
                return r
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


def sh_ok(cmd):
    r = subprocess.run(["bash", "-c", cmd], capture_output=True, text=True)
    return r.stdout.strip().endswith("OK") or "Completed" in r.stdout


def upload(path, key):
    return sh_ok(
        "set -a; . /tmp/aws.env; set +a; "
        f"aws s3 cp {path} s3://$AWS_S3_BUCKET/{key} --region $AWS_S3_REGION "
        ">/dev/null 2>&1 && echo OK || echo FAIL")


def main():
    for cid, scene in [("pa8s_7DPYg", 5), ("1CtUwNRPoY", 11), ("uRXvTOMc50", 12)]:
        p = f"{BULK}/{cid}.json"
        d = json.load(open(p, encoding="utf-8"))
        cl = find_classroom(d)
        s = cl.get("scenes", [])[scene - 1]
        fixed_audio = 0
        for a in s.get("actions", []):
            if a.get("type") == "speech" and a["id"] in TRANSLATIONS:
                a["text"] = TRANSLATIONS[a["id"]]
                fname = (a.get("audioUrl") or "").rsplit("/", 1)[-1]
                if fname:
                    local = f"{BULK}/{cid}/audio/{fname}"
                    if regen_audio(a["text"], local) and upload(local, f"learn/classrooms/{cid}/audio/{fname}"):
                        fixed_audio += 1
                        print(f"  {cid} {a['id']}: translated + audio OK", flush=True)
                    else:
                        print(f"  {cid} {a['id']}: translated, AUDIO FAILED", flush=True)
        json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False)
        ok = upload(p, f"learn/classrooms/{cid}.json")
        print(f"  {cid}: {fixed_audio} audio fixed, json upload={'OK' if ok else 'FAIL'}", flush=True)
    print("CHINESE FIXES DONE", flush=True)


if __name__ == "__main__":
    main()
