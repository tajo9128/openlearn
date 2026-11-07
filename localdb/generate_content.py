#!/usr/bin/env python3
"""Regenerate lesson content HTML for all lessons using the Vertex AI proxy.
Writes directly to the local postgres content column."""
import json
import re
import sys
import time
import urllib.request

import psycopg2

DSN = "postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn"
PROXY = "http://172.30.1.1:8766/v1/chat/completions"
MODEL = "gemini-2.5-flash"
BATCH_SIZE = int(sys.argv[1]) if len(sys.argv) > 1 else 50

PROMPT = """Write the complete lesson content as clean HTML for an online course.
Lesson title: "{title}"
Course: "{course}"
Course description: {desc}

Teach this topic at an upper-undergraduate level for pharmacy/biotech students.
Include:
- One h2 heading with the lesson title
- Several paragraphs of clear explanation
- At least two code examples in pre/code blocks (Python where relevant)
- One ul list of key takeaways
- One paragraph describing a practice exercise

Output ONLY the HTML, no markdown fences, no explanation."""


def gen_content(title, course_title, course_desc):
    prompt = PROMPT.format(title=title, course=course_title, desc=course_desc[:300])
    body = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 3000,
        "temperature": 0.7,
    }).encode()
    req = urllib.request.Request(PROXY, data=body,
                                 headers={"Content-Type": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.loads(r.read())
                text = d["choices"][0]["message"]["content"].strip()
                # strip markdown fences if the model added them
                text = re.sub(r"^```(html)?\s*", "", text)
                text = re.sub(r"\s*```\s*$", "", text)
                if len(text) > 200 and "<" in text:
                    return text
        except Exception as e:
            print(f"  retry {attempt+1}: {str(e)[:80]}", flush=True)
            time.sleep(10)
    return None


def main():
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        SELECT l.id, l.title, c.title, c.description
        FROM learning_lessons l
        JOIN learning_courses c ON c.id = l.course_id
        WHERE (l.content IS NULL OR l.content = '')
        ORDER BY c.title, l.sort_order
        LIMIT %s
    """, (BATCH_SIZE,))
    lessons = cur.fetchall()
    print(f"lessons needing content: {len(lessons)}", flush=True)

    done, failed = 0, 0
    for lid, title, ctitle, cdesc in lessons:
        print(f"  [{done+failed+1}/{len(lessons)}] {title[:50]}", flush=True)
        html = gen_content(title, ctitle, cdesc or "")
        if html:
            cur.execute(
                "UPDATE learning_lessons SET content = %s WHERE id = %s",
                (html, lid),
            )
            done += 1
        else:
            failed += 1
        time.sleep(2)

    print(f"DONE: {done} generated, {failed} failed", flush=True)
    conn.close()


if __name__ == "__main__":
    main()
