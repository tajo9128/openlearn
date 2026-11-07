#!/bin/bash
# Continuous generation master: for every course with unlinked lessons,
# ensure a shard worker is running. Runs forever.
KEY=$(grep "^SUPABASE_ANON_KEY" /opt/openlearn/.env.local | cut -d= -f2)
SURL=$(grep "^SUPABASE_URL" /opt/openlearn/.env.local | cut -d= -f2)
while true; do
  # auto-discover every course that still has unlinked lessons
  ALL_COURSES=$(curl -s --retry 3 "$SURL/rest/v1/learning_lessons?classroom_id=is.null&select=course_id" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" | python3 -c "import json,sys; print(' '.join(sorted(set(r['course_id'] for r in json.load(sys.stdin)))))" 2>/dev/null)
  for CID in $ALL_COURSES; do
    MISSING=$(curl -s --retry 3 "$SURL/rest/v1/learning_lessons?course_id=eq.$CID&classroom_id=is.null&select=id" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)
    if [ -n "$MISSING" ] && [ "$MISSING" -gt 0 ] 2>/dev/null; then
      if ! pgrep -f "shard-loop.sh $CID" > /dev/null; then
        IDS=$(curl -s --retry 3 "$SURL/rest/v1/learning_lessons?course_id=eq.$CID&classroom_id=is.null&select=id&order=sort_order" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" | python3 -c "import json,sys; print(','.join(r['id'] for r in json.load(sys.stdin)))" 2>/dev/null)
        [ -n "$IDS" ] && setsid nohup bash /tmp/shard-loop.sh $CID pipe-$CID "$IDS" > /dev/null 2>&1 < /dev/null &
        echo "$(date +%H:%M) relaunched worker for $CID ($MISSING missing)"
      fi
    fi
  done
  sleep 300
done
