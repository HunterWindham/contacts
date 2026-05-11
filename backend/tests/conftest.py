"""Shared pytest fixtures for backend tests."""
from __future__ import annotations

import sys
from collections.abc import Iterator
from pathlib import Path

import pytest

# Make `app` importable when running pytest from the repo root.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app import create_app  # noqa: E402


@pytest.fixture()
def app(tmp_path):
    db_path = tmp_path / "test_contacts.db"
    app = create_app({"TESTING": True, "DATABASE": str(db_path)})
    yield app


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def app_context(app) -> Iterator[None]:
    with app.app_context():
        yield


@pytest.fixture()
def contact_payload():
    def _build_payload(**overrides):
        payload = {
            "first_name": "Ada",
            "last_name": "Lovelace",
            "emails": ["ada@example.com"],
            "phone": "(212) 555-0100",
        }
        payload.update(overrides)
        return payload

    return _build_payload
