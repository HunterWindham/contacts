"""Seed the SQLite database with generated test contacts."""
from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path
from typing import Final

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app import create_app
from app.services.db import get_db

FIRST_NAMES: Final[tuple[str, ...]] = (
    "Alex",
    "Avery",
    "Bailey",
    "Cameron",
    "Casey",
    "Charlie",
    "Dakota",
    "Drew",
    "Elliot",
    "Emerson",
    "Finley",
    "Harper",
    "Jamie",
    "Jordan",
    "Kai",
    "Logan",
    "Micah",
    "Morgan",
    "Parker",
    "Quinn",
    "Reese",
    "Riley",
    "Rowan",
    "Sawyer",
    "Skyler",
    "Taylor",
)

LAST_NAMES: Final[tuple[str, ...]] = (
    "Anderson",
    "Bailey",
    "Bennett",
    "Brooks",
    "Campbell",
    "Collins",
    "Davis",
    "Diaz",
    "Evans",
    "Flores",
    "Garcia",
    "Gray",
    "Harris",
    "Hughes",
    "Jackson",
    "Johnson",
    "Lee",
    "Lewis",
    "Martinez",
    "Miller",
    "Moore",
    "Nguyen",
    "Patel",
    "Reed",
    "Rivera",
    "Robinson",
    "Rodriguez",
    "Smith",
    "Taylor",
    "Thomas",
    "Turner",
    "Walker",
    "White",
    "Williams",
    "Wilson",
    "Young",
)

EMAIL_DOMAINS: Final[tuple[str, ...]] = (
    "example.com",
    "testmail.dev",
    "seed.local",
)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed the contacts database with generated test records."
    )
    parser.add_argument(
        "--count",
        type=int,
        default=1000,
        help="Number of contacts to insert (default: 1000).",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing contacts before inserting new ones.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed to make generated data deterministic (default: 42).",
    )
    return parser.parse_args()


def _build_phone(rng: random.Random) -> str:
    area = rng.randint(200, 989)
    prefix = rng.randint(200, 999)
    line = rng.randint(0, 9999)
    return f"({area}) {prefix:03d}-{line:04d}"


def _build_emails(
    first_name: str,
    last_name: str,
    sequence: int,
    rng: random.Random,
) -> list[str]:
    username = f"{first_name.lower()}.{last_name.lower()}{sequence}"
    primary = f"{username}@{rng.choice(EMAIL_DOMAINS)}"
    if rng.random() < 0.2:
        secondary = f"{first_name.lower()[0]}{last_name.lower()}{sequence}@{rng.choice(EMAIL_DOMAINS)}"
        return [primary, secondary]
    return [primary]


def seed_contacts(count: int, reset: bool, seed_value: int) -> int:
    if count < 1:
        raise ValueError("--count must be at least 1")

    rng = random.Random(seed_value)
    app = create_app()

    with app.app_context():
        db = get_db()

        if reset:
            db.execute("DELETE FROM contacts")
            # Reset sqlite autoincrement so seeded ids start from 1.
            db.execute("DELETE FROM sqlite_sequence WHERE name = 'contacts'")

        contact_rows: list[dict[str, str | None]] = []
        for sequence in range(1, count + 1):
            first_name = rng.choice(FIRST_NAMES)
            last_name = rng.choice(LAST_NAMES)
            emails = _build_emails(first_name, last_name, sequence, rng)
            phone = _build_phone(rng) if rng.random() < 0.85 else None

            contact_rows.append(
                {
                    "first_name": first_name,
                    "last_name": last_name,
                    "emails": json.dumps(emails),
                    "phone": phone,
                }
            )

        db.executemany(
            """
            INSERT INTO contacts (first_name, last_name, emails, phone)
            VALUES (:first_name, :last_name, :emails, :phone)
            """,
            contact_rows,
        )
        db.commit()

    return count


if __name__ == "__main__":
    arguments = _parse_args()
    inserted_count = seed_contacts(
        count=arguments.count,
        reset=arguments.reset,
        seed_value=arguments.seed,
    )
    print(f"Inserted {inserted_count} contacts.")
