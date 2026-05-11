"""SQLite connection lifecycle and schema initialization."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from flask import Flask, current_app, g

SCHEMA_PATH = Path(__file__).resolve().parents[2] / "schema.sql"


def get_db() -> sqlite3.Connection:
    """Return a request-scoped SQLite connection with row dict access."""
    if "db" not in g:
        connection = sqlite3.connect(
            current_app.config["DATABASE"],
            detect_types=sqlite3.PARSE_DECLTYPES,
        )
        connection.row_factory = sqlite3.Row
        # Enforce FK constraints by default; harmless for current schema, future-proof.
        connection.execute("PRAGMA foreign_keys = ON;")
        g.db = connection
    return g.db


def close_db(_exception: BaseException | None = None) -> None:
    """Close the request-scoped connection, if any."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def _table_exists(connection: sqlite3.Connection, table_name: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def _column_exists(connection: sqlite3.Connection, table_name: str, column_name: str) -> bool:
    rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    return any(row["name"] == column_name for row in rows)


def _parse_json_emails(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    result: list[str] = []
    seen: set[str] = set()
    for entry in parsed:
        if not isinstance(entry, str):
            continue
        cleaned = entry.strip()
        if not cleaned:
            continue
        key = cleaned.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(cleaned)
    return result


def _run_schema_migrations(connection: sqlite3.Connection) -> None:
    """Keep legacy databases compatible with the latest single-table schema."""
    if not _column_exists(connection, "contacts", "emails"):
        connection.execute(
            "ALTER TABLE contacts ADD COLUMN emails TEXT NOT NULL DEFAULT '[]'"
        )

    legacy_table_exists = _table_exists(connection, "contact_emails")
    contact_email_rows: dict[int, list[str]] = {}
    if legacy_table_exists:
        rows = connection.execute(
            "SELECT contact_id, email FROM contact_emails ORDER BY id ASC"
        ).fetchall()
        for row in rows:
            contact_email_rows.setdefault(row["contact_id"], []).append(row["email"])

    has_legacy_email_column = _column_exists(connection, "contacts", "email")
    contacts_query = (
        "SELECT id, email, emails FROM contacts"
        if has_legacy_email_column
        else "SELECT id, NULL as email, emails FROM contacts"
    )
    contacts = connection.execute(contacts_query).fetchall()
    for row in contacts:
        merged: list[str] = []
        seen: set[str] = set()

        def append_email(value: str | None) -> None:
            if not isinstance(value, str):
                return
            cleaned = value.strip()
            if not cleaned:
                return
            key = cleaned.casefold()
            if key in seen:
                return
            seen.add(key)
            merged.append(cleaned)

        for existing in _parse_json_emails(row["emails"]):
            append_email(existing)
        append_email(row["email"])
        for existing in contact_email_rows.get(row["id"], []):
            append_email(existing)

        connection.execute(
            "UPDATE contacts SET emails = ? WHERE id = ?",
            (json.dumps(merged), row["id"]),
        )

    if legacy_table_exists:
        connection.execute("DROP TABLE contact_emails")


def init_db(app: Flask) -> None:
    """Create tables if they do not exist using schema.sql."""
    with app.app_context():
        connection = get_db()
        with SCHEMA_PATH.open("r", encoding="utf-8") as schema_file:
            connection.executescript(schema_file.read())
        _run_schema_migrations(connection)
        connection.commit()


def register_db(app: Flask) -> None:
    """Wire up DB lifecycle hooks and ensure schema exists at startup."""
    app.teardown_appcontext(close_db)
    init_db(app)
