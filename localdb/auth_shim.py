#!/usr/bin/env python3
"""GoTrue-compatible auth shim for learn.biodockify.com.

Implements the subset of Supabase Auth (/auth/v1/*) that the app uses
(lib/learning/auth.ts): signup, password grant, user get/update, logout,
recover, verify. Backed by local Postgres (openlearn-postgres) with bcrypt
hashes, so users migrated from Supabase's auth.users keep their passwords.

Runs on the host at 127.0.0.1:8767; the nginx gateway proxies /auth/v1 here.
"""
import json
import os
import secrets
import sys
import threading
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

import bcrypt
import psycopg2
import psycopg2.extras

DSN = os.environ.get(
    "LOCALDB_DSN",
    "postgres://learn:IucXuQWv2_8tDOT9tUpVkmU9@127.0.0.1:5434/learn",
)
SESSION_DAYS = 30

_conn_lock = threading.Lock()


def db():
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    return conn


def now():
    return datetime.now(timezone.utc)


def user_row_to_gotrue(u):
    return {
        "id": str(u["id"]),
        "email": u["email"],
        "user_metadata": {"display_name": u["display_name"] or u["email"].split("@")[0]},
        "app_metadata": {},
        "email_confirmed_at": u["email_confirmed_at"].isoformat() if u["email_confirmed_at"] else None,
        "created_at": u["created_at"].isoformat() if u["created_at"] else None,
        "aud": "authenticated",
        "role": "authenticated",
    }


def find_user(conn, email):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM local_users WHERE lower(email) = lower(%s)", (email,))
        return cur.fetchone()


def find_user_by_id(conn, uid):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM local_users WHERE id = %s", (uid,))
        return cur.fetchone()


def create_session(conn, uid):
    token = secrets.token_urlsafe(48)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO local_sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
            (token, uid, now() + timedelta(days=SESSION_DAYS)),
        )
    return token


def session_user(conn, token):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT u.* FROM local_sessions s JOIN local_users u ON u.id = s.user_id "
            "WHERE s.token = %s AND s.expires_at > %s",
            (token, now()),
        )
        return cur.fetchone()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write("[auth-shim] %s %s\n" % (self.command, self.path))

    def _json(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode())
        except Exception:
            return {}

    def _bearer(self):
        auth = self.headers.get("Authorization") or ""
        if auth.lower().startswith("bearer "):
            return auth[7:].strip()
        return None

    def do_GET(self):
        if self.path.startswith("/auth/v1/user"):
            token = self._bearer()
            if not token:
                return self._json(401, {"message": "no bearer token"})
            with _conn_lock, db() as conn:
                u = session_user(conn, token)
                if not u:
                    return self._json(401, {"message": "invalid token"})
                return self._json(200, user_row_to_gotrue(u))
        return self._json(404, {"message": "not found"})

    def do_PUT(self):
        if self.path.startswith("/auth/v1/user"):
            token = self._bearer()
            body = self._body()
            with _conn_lock, db() as conn:
                u = session_user(conn, token) if token else None
                if not u:
                    return self._json(401, {"message": "invalid token"})
                if body.get("password"):
                    pw = body["password"].encode()
                    if len(pw) < 6:
                        return self._json(400, {"msg": "Password should be at least 6 characters"})
                    with conn.cursor() as cur:
                        cur.execute(
                            "UPDATE local_users SET password_hash = %s WHERE id = %s",
                            (bcrypt.hashpw(pw, bcrypt.gensalt()).decode(), u["id"]),
                        )
                if body.get("data", {}).get("display_name"):
                    with conn.cursor() as cur:
                        cur.execute(
                            "UPDATE local_users SET display_name = %s WHERE id = %s",
                            (body["data"]["display_name"], u["id"]),
                        )
                u = find_user_by_id(conn, u["id"])
                return self._json(200, user_row_to_gotrue(u))
        return self._json(404, {"message": "not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        route = parsed.path
        body = self._body()

        if route == "/auth/v1/signup":
            email = (body.get("email") or "").strip()
            password = body.get("password") or ""
            name = (body.get("data") or {}).get("display_name") or email.split("@")[0]
            if not email or "@" not in email:
                return self._json(400, {"msg": "invalid email"})
            if len(password) < 6:
                return self._json(400, {"msg": "Password should be at least 6 characters"})
            with _conn_lock, db() as conn:
                if find_user(conn, email):
                    return self._json(400, {"msg": "User already registered"})
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO local_users (email, password_hash, display_name, email_confirmed_at) "
                        "VALUES (%s, %s, %s, %s) RETURNING *",
                        (email, bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
                         name, now()),
                    )
                    u = cur.fetchone()
                token = create_session(conn, u["id"])
            return self._json(200, {
                "access_token": token,
                "token_type": "bearer",
                "expires_in": SESSION_DAYS * 86400,
                "user": user_row_to_gotrue(u),
            })

        if route == "/auth/v1/token":
            grant = (parse_qs(parsed.query).get("grant_type") or [""])[0]
            if grant != "password":
                return self._json(400, {"error_description": "unsupported grant_type"})
            email = (body.get("email") or "").strip()
            password = body.get("password") or ""
            with _conn_lock, db() as conn:
                u = find_user(conn, email)
                if not u or not u["password_hash"]:
                    return self._json(400, {"error_description": "Invalid login credentials"})
                try:
                    ok = bcrypt.checkpw(password.encode(), u["password_hash"].encode())
                except ValueError:
                    ok = False
                if not ok:
                    return self._json(400, {"error_description": "Invalid login credentials"})
                token = create_session(conn, u["id"])
            return self._json(200, {
                "access_token": token,
                "token_type": "bearer",
                "expires_in": SESSION_DAYS * 86400,
                "user": user_row_to_gotrue(u),
            })

        if route == "/auth/v1/logout":
            token = self._bearer()
            if token:
                with _conn_lock, db() as conn:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM local_sessions WHERE token = %s", (token,))
            return self._json(204, {}) if False else self._no_content()

        if route == "/auth/v1/recover":
            # No SMTP wired locally; log the request so resets can be handled
            # manually if ever needed. Always 200 to avoid leaking accounts.
            sys.stderr.write("[auth-shim] recover requested for %r\n" % body.get("email"))
            return self._json(200, {})

        if route == "/auth/v1/verify":
            # Signups are auto-confirmed locally; nothing to verify.
            return self._json(200, {})

        return self._json(404, {"message": "not found"})

    def _no_content(self):
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()


def main():
    host, port = os.environ.get("AUTH_BIND_HOST", "0.0.0.0"), 8767
    srv = ThreadingHTTPServer((host, port), Handler)
    sys.stderr.write(f"[auth-shim] listening on {host}:{port}\n")
    srv.serve_forever()


if __name__ == "__main__":
    main()
