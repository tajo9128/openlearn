#!/usr/bin/env python3
"""Parallel content generation worker. Usage: content_worker.py OFFSET COUNT"""
import json
import re
import sys
import time
import urllib.request

import psycopg2

DSN = "postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn"
PROXY = "http://172.30.1.1:8766/v1/chat/completions"

OFFSET = int(sys.argv[1]) if len(sys.argv) > 1 else 0
COUNT = int(sys.argv[2]) if len(sys.argv) > 2 else 200

PROMPT = """Write the complete lesson content as clean HTML for an online course.
Lesson title: "{title}"
Course: "{course}"

Teach this topic at an upper-undergraduate level for pharmacy/biotech students.
Include: one h2 heading, several explanation paragraphs, at least two code
examples in pre/code blocks, one ul of key takeaways, one paragraph practice
exercise. Output ONLY the HTML, no markdown fences."""


def main():
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("""
        SELECT l.id, l.title, c.title FROM learning_lessons l
        JOIN learning_courses c ON c.id = l.course_id
        WHERE (l.content IS NULL OR l.content = '')
        ORDER BY c.title, l.sort_order OFFSET %s LIMIT %s
    """, (OFFSET, COUNT))
    lessons = cur.fetchall()
    print(f"worker[{OFFSET}]: {len(lessons)} lessons", flush=True)
    ok = fail = 0
    for lid, title, ctitle in lessons:
        prompt = PROMPT.format(title=title, course=ctitle)
        body = json.dumps({
            "model": "gemini-2.5-flash",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 3000, "temperature": 0.7,
        }).encode()
        req = urllib.request.Request(PROXY, data=body,
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.loads(r.read())
                text = d["choices"][0]["message"]["content"].strip()
                text = re.sub(r"^```(html)?\s*", "", text)
                text = re.sub(r"\s*```\s*$", "", text)
                if len(text) > 200 and "<" in text:
                    cur.execute("UPDATE learning_lessons SET content=%s WHERE id=%s",
                                (text, lid))
                    ok += 1
                    print(f"  OK: {title[:45]}", flush=True)
                else:
                    fail += 1
        except Exception as e:
            fail += 1
            print(f"  FAIL: {title[:40]} {str(e)[:50]}", flush=True)
        time.sleep(2)
    print(f"worker[{OFFSET}] DONE: {ok} ok, {fail} fail", flush=True)


if __name__ == "__main__":
    main()
