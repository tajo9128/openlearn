#!/bin/bash
# Shard worker: generate classrooms for lessons (async job flow).
# Usage: shard-loop.sh COURSE_ID WORKER_NAME LESSON_IDS(comma-separated)
CID="$1"
NAME="$2"
IDS="$3"
KEY=$(grep "^SUPABASE_ANON_KEY" /opt/openlearn/.env.local | cut -d= -f2)
SURL=$(grep "^SUPABASE_URL" /opt/openlearn/.env.local | cut -d= -f2)
SITE="http://127.0.0.1:3000"
MAX_WAIT=600

IFS=',' read -ra LESSON_ARRAY <<< "$IDS"
for LID in "${LESSON_ARRAY[@]}"; do
  TITLE=$(curl -s --retry 3 "$SURL/rest/v1/learning_lessons?id=eq.$LID&select=title" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['title'] if d else '')" 2>/dev/null)
  [ -z "$TITLE" ] && continue
  echo "$(date +%H:%M:%S) [$NAME] generating: $TITLE"

  # step 1: start generation job
  GEN=$(curl -s --max-time 120 -X POST "$SITE/api/learning/classroom/generate" \
    -H "Content-Type: application/json" \
    -d "{\"lesson_id\": \"$LID\", \"course_id\": \"$CID\"}")
  JOB_ID=$(echo "$GEN" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('job_id','') if d.get('success') else '')" 2>/dev/null)
  if [ -z "$JOB_ID" ]; then
    echo "$(date +%H:%M:%S) [$NAME] FAIL to start: $TITLE"
    sleep 15
    continue
  fi

  # step 2: poll for completion
  WAITED=0
  CLID=""
  while [ $WAITED -lt $MAX_WAIT ]; do
    sleep 20
    WAITED=$((WAITED + 20))
    STATUS=$(curl -s --max-time 30 "$SITE/api/generate-classroom/$JOB_ID")
    S=$(echo "$STATUS" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null)
    if [ "$S" = "succeeded" ]; then
      # step 3: extract stage/classroom id from result
      CLID=$(echo "$STATUS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
stage = d.get('stage') or (d.get('result') or {}).get('stage') or {}
cid = stage.get('id') or (d.get('result') or {}).get('classroom_id') or ''
print(cid)" 2>/dev/null)
      break
    elif [ "$S" = "failed" ] || [ "$S" = "error" ]; then
      echo "$(date +%H:%M:%S) [$NAME] JOB FAILED: $TITLE"
      break
    fi
  done

  if [ -n "$CLID" ]; then
    # step 4: save classroom_id to lesson
    SAVE=$(curl -s --max-time 60 -X POST "$SITE/api/learning/classroom/save" \
      -H "Content-Type: application/json" \
      -d "{\"lesson_id\": \"$LID\", \"classroom_id\": \"$CLID\"}")
    OK=$(echo "$SAVE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null)
    if [ "$OK" = "True" ]; then
      echo "$(date +%H:%M:%S) [$NAME] OK: $TITLE -> $CLID"
    else
      # fallback: direct DB update
      curl -s -X PATCH "$SURL/rest/v1/learning_lessons?id=eq.$LID" \
        -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
        -d "{\"classroom_id\": \"$CLID\"}" > /dev/null
      echo "$(date +%H:%M:%S) [$NAME] OK-direct: $TITLE -> $CLID"
    fi
  else
    echo "$(date +%H:%M:%S) [$NAME] TIMEOUT: $TITLE (${WAITED}s)"
  fi
  sleep 5
done
echo "$(date +%H:%M:%S) [$NAME] shard complete"
