"""Validation schema for contact create/update payloads."""
from __future__ import annotations

import re
from dataclasses import dataclass
from collections.abc import Mapping
from typing import Any

# Pragmatic email pattern: enough to catch obvious typos without overengineering.
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
NON_DIGIT_PATTERN = re.compile(r"\D")


@dataclass
class ContactWritePayload:
    """Normalized payload used by the service layer."""

    first_name: str
    last_name: str
    emails: list[str]
    phone: str | None

    def to_db_params(self) -> dict[str, str | None]:
        return {
            "first_name": self.first_name,
            "last_name": self.last_name,
            "phone": self.phone,
        }


class ContactPayloadSchema:
    """Central place for request payload validation."""

    @staticmethod
    def _normalize(value: Any) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            return None
        trimmed = value.strip()
        return trimmed or None

    @classmethod
    def _normalize_emails(cls, value: Any) -> tuple[list[str], list[str]]:
        if value is None:
            return [], []
        if not isinstance(value, list):
            return [], ["emails must be an array of strings"]

        errors: list[str] = []
        seen: set[str] = set()
        normalized: list[str] = []
        for entry in value:
            cleaned = cls._normalize(entry)
            if cleaned is None:
                continue
            lowered = cleaned.casefold()
            if lowered in seen:
                continue
            if not EMAIL_PATTERN.match(cleaned):
                errors.append(f"{cleaned} is not a valid email address")
                continue
            seen.add(lowered)
            normalized.append(cleaned)

        return normalized, errors

    @classmethod
    def _normalize_phone(cls, value: Any) -> tuple[str | None, str | None]:
        cleaned = cls._normalize(value)
        if cleaned is None:
            if value is None or (isinstance(value, str) and value.strip() == ""):
                return None, None
            return None, "phone must be a string"

        digits = NON_DIGIT_PATTERN.sub("", cleaned)
        if len(digits) == 11 and digits.startswith("1"):
            digits = digits[1:]

        if len(digits) != 10:
            return None, "phone must be a valid US phone number"

        formatted = f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        return formatted, None

    @classmethod
    def validate(
        cls, payload: Mapping[str, Any]
    ) -> tuple[ContactWritePayload | None, list[str]]:
        errors: list[str] = []
        first_name = cls._normalize(payload.get("first_name"))
        last_name = cls._normalize(payload.get("last_name"))
        phone, phone_error = cls._normalize_phone(payload.get("phone"))
        emails, email_errors = cls._normalize_emails(payload.get("emails"))

        if not first_name:
            errors.append("first_name is required")
        if not last_name:
            errors.append("last_name is required")
        errors.extend(email_errors)
        if phone_error:
            errors.append(phone_error)

        if errors:
            return None, errors

        return ContactWritePayload(
            first_name=first_name,
            last_name=last_name,
            emails=emails,
            phone=phone,
        ), []
