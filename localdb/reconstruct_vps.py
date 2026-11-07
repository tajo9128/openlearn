#!/usr/bin/env python3
"""Reconstruct all lessons on the VPS from S3 classrooms + local sources,
then INSERT into the local postgres.

Sources:
  S3 classrooms (383)  -> title, classroom_id, createdAt, narration
  audit_lessons.log     -> course -> example lesson titles (anchors)
  build_plans.json      -> exact modules+order for 6 newer courses
  rerender_all.log      -> exact order for Python Bootcamp
  sitemap_snapshot.xml  -> public lesson UUIDs
  courses_extracted.json -> course UUIDs
"""
import json
import os
import re
import subprocess
import sys
import tempfile

BASE = "/opt/openlearn/localdb"
PY_COURSE = "bd127d48-37d6-4ff0-9821-acdf9abf667e"

# curated topic classifier for courses without exact sources
TOPIC_RULES = [
    ("Introduction to Pharmacology", r"pharmacolog|drug action|dose response|therapeutic|agonist|antagonist|pharmacodynamic"),
    ("Molecular Docking with AutoDock Vina", r"docking|autodock|vina|ligand binding|binding affinity|virtual screening"),
    ("Medicinal Chemistry Essentials", r"medicinal chem|structure.activity|lead compound|lipinski|drug design|scaffold"),
    ("Pharmacokinetics & Drug Metabolism", r"pharmacokinetic|adme|metabolism|clearance|half.life|bioavailab|first.pass|cyp"),
    ("Structural Biology & Drug Discovery", r"protein structure|pdb|crystallograph|fold|alpha helix|secondary structure|protein basics|dynamics"),
    ("Bioinformatics & Computational Genomics", r"bioinformatic|genomic|sequencing|blast|fasta|alignment|genome|transcriptom|rnaseq"),
    ("Research Methods and Scientific Writing", r"research method|scientific writing|hypothesis|peer review|manuscript|research design|citation"),
    ("AI in Drug Discovery", r"drug discovery|molecular property|qsar|deep learning|neural network|generative chem|screening ai"),
    ("AI for Beginners", r"artificial intelligence|machine learning|neural|regression|classification|clustering|llm|prompt"),
    ("Python for Data Science", r"pandas|numpy|dataframe|matplotlib|data visuali|data clean|eda|data science"),
    ("Python for Pharmaceutical Research", r"pharmaceutical research|lab data|assay|ic50|research python"),
    ("Python Programming - Basics", r"python"),
    ("Deep Learning with PyTorch: Zero to Production", r"pytorch|tensor|neural network|training loop|gradient"),
    ("Deep Generative Models: GANs, VAEs & Diffusion", r"gan|vae|diffusion|generative model|autoencoder"),
    ("The Complete Python Bootcamp: Basics to Pharma & Data Science", r"\bpython bootcamp|complete python"),
]


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:80] or "lesson"


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def load_classrooms():
    """Download every classroom JSON from S3 and extract key fields."""
    out = subprocess.run(
        ["bash", "-c",
         "set -a; . /tmp/aws.env; set +a; "
         "aws s3api list-objects-v2 --bucket $AWS_S3_BUCKET --prefix learn/classrooms/ "
         "--region $AWS_S3_REGION --query \"Contents[?ends_with(Key, '.json')].Key\" --output text"],
        capture_output=True, text=True, check=True).stdout.split()
    rooms = []
    tmp = tempfile.mkdtemp(prefix="clsr_")
    for i, key in enumerate(out):
        cid = key.split("/")[-1][:-5]
        p = os.path.join(tmp, f"{cid}.json")
        r = subprocess.run(
            ["bash", "-c",
             f"set -a; . /tmp/aws.env; set +a; aws s3 cp s3://$AWS_S3_BUCKET/{key} {p} --region $AWS_S3_REGION "
             ">/dev/null 2>&1"],
            capture_output=True, text=True)
        try:
            d = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        cl = d.get("classroom") or (d.get("data") or {}).get("classroom") or d
        stage = cl.get("stage") or {}
        title = stage.get("name") or ""
        text = []
        for s in (cl.get("scenes") or [])[:3]:
            for a in s.get("actions", []):
                if a.get("type") == "speech" and a.get("text"):
                    text.append(a["text"])
        rooms.append({
            "cid": cl.get("id") or cid,
            "title": title,
            "created": cl.get("createdAt") or "",
            "narr": norm(" ".join(text))[:1500],
        })
    return rooms


def main():
    courses = json.load(open(f"{BASE}/courses_extracted.json", encoding="utf-8"))
    by_title = {norm(c["title"]): c for c in courses}
    plans = json.load(open(f"{BASE}/build_plans.json", encoding="utf-8"))
    plan_by = {norm(p["title"]): p for p in plans}

    src = open(f"{BASE}/sitemap_snapshot.xml", encoding="utf-8").read()
    slug_to_id = {}
    for u, lid in re.findall(
        r"<loc>https://learn\.biodockify\.com/learn/(.+?)--([a-f0-9-]{36})</loc>", src):
        slug_to_id.setdefault(u, lid)

    print("downloading classrooms from S3 ...", flush=True)
    rooms = load_classrooms()
    print(f"classrooms: {len(rooms)}", flush=True)
    json.dump(rooms, open(f"{BASE}/all_classrooms.json", "w"))

    # per-title lists (titles can repeat across courses)
    by_title_rooms = {}
    for r in rooms:
        by_title_rooms.setdefault(r["title"], []).append(r)

    # ---- anchors from audit log: "Course | ..." then "MISSING: .../CLASSROOM_ID/audio | LESSON TITLE"
    anchors = {}  # lesson title -> course title
    cur_course = None
    for line in open(f"{BASE}/audit_lessons.log", encoding="utf-8", errors="ignore"):
        m = re.match(r"^(.+?) \| pub=", line)
        if m:
            cur_course = m.group(1).strip()
            continue
        m = re.search(r"MISSING: learn/classrooms/([^/]+)/audio \| (.+)$", line.strip())
        if m and cur_course:
            anchors[m.group(2).strip()] = cur_course

    rows = []
    used_cids = set()

    def take_room(title):
        """Consume an unused classroom for this title, else None."""
        for r in by_title_rooms.get(title, []):
            if r["cid"] not in used_cids:
                used_cids.add(r["cid"])
                return r
        return None

    def add(course_title, lesson_title, module_title, order):
        course = by_title.get(norm(course_title))
        if not course:
            return False
        room = take_room(lesson_title)
        rows.append({
            "course_id": course["id"],
            "course_title": course["title"],
            "module_title": module_title,
            "lesson_title": lesson_title,
            "classroom_id": room["cid"] if room else None,
            "created": room["created"] if room else "",
            "lesson_uuid": slug_to_id.get(slug(lesson_title)),
            "sort_order": order,
        })
        return True

    # 1) build plans (exact)
    n1 = 0
    for ptitle, plan in plan_by.items():
        order = 0
        for mtitle, lessons in plan["modules"]:
            for lt in lessons:
                order += 1
                if add(ptitle, lt, mtitle, order):
                    n1 += 1

    # 2) python bootcamp render order
    n2 = 0
    seen = set()
    py_rows = []
    for line in open(f"{BASE}/rerender_all.log", encoding="utf-8", errors="ignore"):
        m = re.match(r"\s*OK (\d+)_(.+)\.mp4", line)
        if m:
            t = m.group(2).strip()
            if t not in seen:
                seen.add(t)
                py_rows.append((int(m.group(1)), t))
    for num, t in sorted(py_rows):
        if any(r["lesson_title"] == t for r in rows):
            continue
        if add(by_title[PY_COURSE]["title"] if PY_COURSE in by_title else "The Complete Python Bootcamp: Basics to Pharma & Data Science", t, None, num):
            n2 += 1

    # 3) audit anchors
    n3 = 0
    for lt, ct in anchors.items():
        if any(r["lesson_title"] == lt for r in rows):
            continue
        if add(ct, lt, None, 9500):
            n3 += 1

    # 4) topic classifier for the rest (python-first, deduped per course)
    n4, n_left = 0, 0
    leftovers = []
    course_titles_seen = set((r["course_id"], norm(r["lesson_title"])) for r in rows)
    for title, rlist in by_title_rooms.items():
        for r in rlist:
            if r["cid"] in used_cids:
                continue
            text = r["narr"] + " " + norm(title)
            best = None
            if re.search(r"pandas|numpy|matplotlib|dataframe|python", text):
                for ct, rx in [
                    ("Python for Data Science", r"pandas|numpy|matplotlib|dataframe|data visuali|data clean|eda"),
                    ("Python for Pharmaceutical Research", r"pharma|assay|ic50|lab data"),
                    ("Python Programming - Basics", r"python"),
                ]:
                    if re.search(rx, text):
                        best = ct
                        break
                if best is None:
                    best = "Python Programming - Basics"
            else:
                for ct, rx in TOPIC_RULES:
                    if re.search(rx, text):
                        best = ct
                        break
            if best:
                bc = by_title.get(norm(best))
                if bc is None:
                    leftovers.append((title, r["cid"]))
                    n_left += 1
                    continue
                key = (bc["id"], norm(title))
                if key in course_titles_seen:
                    leftovers.append((title, r["cid"]))
                    n_left += 1
                    continue
                course_titles_seen.add(key)
                if add(best, title, None, 9600):
                    n4 += 1
            else:
                leftovers.append((title, r["cid"]))
                n_left += 1

    print(f"build-plan: {n1} | render-order: {n2} | audit-anchors: {n3} | classified: {n4} | leftover: {n_left}")

    from collections import Counter
    per = Counter(r["course_title"][:44] for r in rows)
    for k, v in per.most_common():
        print(f"  {v:3} {k}")
    linked = sum(1 for r in rows if r["lesson_uuid"])
    print(f"total rows: {len(rows)} | uuid-linked: {linked} | classroom-linked: {sum(1 for r in rows if r['classroom_id'])}")

    # ---- INSERT into postgres
    import psycopg2
    conn = psycopg2.connect("postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn")
    conn.autocommit = True
    cur = conn.cursor()

    # modules
    mod_ids = {}
    for r in rows:
        if not r["module_title"]:
            continue
        key = (r["course_id"], r["module_title"])
        if key in mod_ids:
            continue
        cur.execute(
            "INSERT INTO learning_modules (course_id, title, sort_order) VALUES (%s,%s,%s) RETURNING id",
            (r["course_id"], r["module_title"], len(mod_ids)))
        mod_ids[key] = cur.fetchone()[0]

    # order unknown rows by createdAt within course
    rows.sort(key=lambda r: (r["course_id"], r["sort_order"], r["created"]))
    # renumber sort per course to be stable
    counter = {}
    for r in rows:
        counter[r["course_id"]] = counter.get(r["course_id"], 0) + 1
        r["final_order"] = counter[r["course_id"]]

    for r in rows:
        mid = mod_ids.get((r["course_id"], r["module_title"]))
        if r["lesson_uuid"]:
            cur.execute(
                """INSERT INTO learning_lessons (id, course_id, module_id, title, classroom_id, sort_order)
                   VALUES (%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (id) DO UPDATE SET course_id=EXCLUDED.course_id,
                     classroom_id=EXCLUDED.classroom_id, sort_order=EXCLUDED.sort_order""",
                (r["lesson_uuid"], r["course_id"], mid, r["lesson_title"], r["classroom_id"], r["final_order"]))
        else:
            cur.execute(
                """INSERT INTO learning_lessons (course_id, module_id, title, classroom_id, sort_order)
                   VALUES (%s,%s,%s,%s,%s)""",
                (r["course_id"], mid, r["lesson_title"], r["classroom_id"], r["final_order"]))
    cur.execute("SELECT count(*) FROM learning_lessons")
    print("lessons in DB:", cur.fetchone()[0])
    conn.close()
    json.dump(rows, open(f"{BASE}/final_lessons.json", "w"), indent=1)


if __name__ == "__main__":
    main()
