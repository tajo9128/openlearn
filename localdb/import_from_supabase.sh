#!/bin/bash
# Import the authoritative schema + data from Supabase into the local
# openlearn-postgres. Usage:
#   ./import_from_supabase.sh '<DB_PASSWORD>'
# Password = Supabase Dashboard -> Project Settings -> Database.
#
# Uses the session pooler (IPv4-friendly). RLS policies are stripped because
# they reference Supabase-internal roles; the gateway is private, so the
# PostgREST role grants are the access boundary.
set -euo pipefail

DB_PASS="${1:?usage: import_from_supabase.sh <DB_PASSWORD>}"
PROJ="pkdheinxgjvgwjphienu"
POOLER="aws-0-eu-central-1.pooler.supabase.com"
SRC_URI="postgresql://postgres.${PROJ}:${DB_PASS}@${POOLER}:5432/postgres"
LOCAL_URI="postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn"
WORK=/tmp/supabase_import
mkdir -p "$WORK"

echo "[1/5] dumping public schema + data ..."
docker run --rm --network host -v "$WORK:/work" postgres:16-alpine \
  pg_dump "$SRC_URI" --schema public --no-owner --no-privileges \
  --exclude-schema extensions -f /work/public.sql

echo "[2/5] dumping auth.users ..."
docker run --rm --network host -v "$WORK:/work" postgres:16-alpine \
  pg_dump "$SRC_URI" --table 'auth.users' --no-owner --no-privileges \
  -f /work/authusers.sql || echo "WARN: auth.users dump failed (continuing)"

echo "[3/5] cleaning (strip RLS/policies) ..."
sed -i -E '/^CREATE POLICY /d; /^ALTER TABLE .* ENABLE ROW LEVEL SECURITY/d; /^ALTER TABLE .* FORCE ROW LEVEL SECURITY/d' "$WORK/public.sql" || true

echo "[4/5] restoring into local postgres ..."
docker exec -i openlearn-postgres psql -U learn -d learn -v ON_ERROR_STOP=0 \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
docker exec -i openlearn-postgres psql -U learn -d learn -v ON_ERROR_STOP=0 \
  < "$WORK/public.sql" > "$WORK/restore.log" 2>&1 || true
grep -ci error "$WORK/restore.log" || true

if [ -s "$WORK/authusers.sql" ]; then
  echo "[5/5] importing auth users into local_users ..."
  # auth.users lands in a scratch schema, then converts to local_users rows
  docker exec -i openlearn-postgres psql -U learn -d learn -v ON_ERROR_STOP=0 \
    -c "DROP SCHEMA IF EXISTS supauth CASCADE; CREATE SCHEMA supauth;" >/dev/null
  sed 's/CREATE TABLE public\./CREATE TABLE supauth./; s/ALTER TABLE ONLY public\./ALTER TABLE ONLY supauth./; s/ INTO public\./ INTO supauth./' \
    "$WORK/authusers.sql" > "$WORK/authusers2.sql" || true
  docker exec -i openlearn-postgres psql -U learn -d learn -v ON_ERROR_STOP=0 \
    < "$WORK/authusers2.sql" > "$WORK/authrestore.log" 2>&1 || true
  docker exec -i openlearn-postgres psql -U learn -d learn <<'SQL'
INSERT INTO local_users (id, email, password_hash, display_name, email_confirmed_at, created_at)
SELECT u.id, u.email, u.encrypted_password,
       coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email,'@',1)),
       u.email_confirmed_at, u.created_at
FROM supauth.users u
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
DROP SCHEMA supauth CASCADE;
SQL
else
  echo "[5/5] skipped auth import"
fi

# re-apply roles/grants (restore dropped them with the schema)
docker cp "$(dirname "$0")/schema.sql" openlearn-postgres:/tmp/schema.sql >/dev/null 2>&1 || true
docker exec -i openlearn-postgres psql -U learn -d learn \
  -c "GRANT USAGE ON SCHEMA public TO learn_anon;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO learn_anon;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO learn_anon;" >/dev/null

docker restart openlearn-postgrest
echo "IMPORT DONE"
