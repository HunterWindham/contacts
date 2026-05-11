"""Contact model used by services and API responses."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Contact:
    """Domain model for a single contact row."""

    id: int
    first_name: str
    last_name: str
    emails: list[str]
    phone: str | None
    created_at: str
    updated_at: str

    def to_dict(self) -> dict[str, int | str | list[str] | None]:
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "emails": self.emails,
            "phone": self.phone,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
