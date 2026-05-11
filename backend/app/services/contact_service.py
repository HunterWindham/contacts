"""Business logic for contact CRUD operations."""
from __future__ import annotations

import json
import sqlite3

from flask import abort

from ..models import Contact
from ..schemas import ContactWritePayload
from .db import get_db


def _parse_db_emails(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    emails: list[str] = []
    for entry in parsed:
        if isinstance(entry, str) and entry.strip():
            emails.append(entry.strip())
    return emails


def _row_to_model(row: sqlite3.Row) -> Contact:
    return Contact(
        id=row["id"],
        first_name=row["first_name"],
        last_name=row["last_name"],
        emails=_parse_db_emails(row["emails"]),
        phone=row["phone"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _get_contact_row_or_404(contact_id: int) -> sqlite3.Row:
    row = get_db().execute(
        "SELECT * FROM contacts WHERE id = ?", (contact_id,)
    ).fetchone()
    if row is None:
        abort(404, description="Contact not found")
    return row


def list_contacts(query: str | None = None) -> list[Contact]:
    cleaned_query = (query or "").strip()
    if cleaned_query:
        search_pattern = f"%{cleaned_query.lower()}%"
        rows = get_db().execute(
            """
            SELECT *
              FROM contacts
             WHERE lower(first_name) LIKE ?
                OR lower(last_name) LIKE ?
                OR lower(first_name || ' ' || last_name) LIKE ?
                OR lower(last_name || ' ' || first_name) LIKE ?
                OR lower(emails) LIKE ?
             ORDER BY datetime(created_at) DESC, id DESC
            """,
            (
                search_pattern,
                search_pattern,
                search_pattern,
                search_pattern,
                search_pattern,
            ),
        ).fetchall()
    else:
        rows = get_db().execute(
            "SELECT * FROM contacts ORDER BY datetime(created_at) DESC, id DESC"
        ).fetchall()
    return [_row_to_model(row) for row in rows]


def get_contact(contact_id: int) -> Contact:
    return _row_to_model(_get_contact_row_or_404(contact_id))


def create_contact(payload: ContactWritePayload) -> Contact:
    db = get_db()
    cursor = db.execute(
        """
        INSERT INTO contacts (first_name, last_name, emails, phone)
        VALUES (:first_name, :last_name, :emails, :phone)
        """,
        {**payload.to_db_params(), "emails": json.dumps(payload.emails)},
    )
    db.commit()
    row = db.execute(
        "SELECT * FROM contacts WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return _row_to_model(row)


def update_contact(contact_id: int, payload: ContactWritePayload) -> Contact:
    _get_contact_row_or_404(contact_id)
    db = get_db()
    db.execute(
        """
        UPDATE contacts
           SET first_name = :first_name,
               last_name  = :last_name,
               emails     = :emails,
               phone      = :phone,
               updated_at = datetime('now')
         WHERE id = :id
        """,
        {**payload.to_db_params(), "emails": json.dumps(payload.emails), "id": contact_id},
    )
    db.commit()
    row = db.execute(
        "SELECT * FROM contacts WHERE id = ?", (contact_id,)
    ).fetchone()
    return _row_to_model(row)


def delete_contact(contact_id: int) -> None:
    _get_contact_row_or_404(contact_id)
    db = get_db()
    db.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))
    db.commit()
