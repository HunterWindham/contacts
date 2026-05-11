"""Schema-level tests for contact payload validation."""
from __future__ import annotations

from app.schemas import ContactPayloadSchema


def test_validate_returns_normalized_payload(contact_payload):
    payload, errors = ContactPayloadSchema.validate(
        contact_payload(
            first_name="  Ada  ",
            last_name="  Lovelace ",
            emails=["ada@example.com", " ADA@example.com ", " "],
            phone=" 1 (212) 555-0100 ",
        )
    )

    assert errors == []
    assert payload is not None
    assert payload.first_name == "Ada"
    assert payload.last_name == "Lovelace"
    assert payload.emails == ["ada@example.com"]
    assert payload.phone == "(212) 555-0100"


def test_validate_allows_missing_optional_fields():
    payload, errors = ContactPayloadSchema.validate(
        {"first_name": "Grace", "last_name": "Hopper"}
    )

    assert errors == []
    assert payload is not None
    assert payload.emails == []
    assert payload.phone is None


def test_validate_allows_blank_phone_as_optional():
    payload, errors = ContactPayloadSchema.validate(
        {"first_name": "Grace", "last_name": "Hopper", "phone": "   "}
    )

    assert errors == []
    assert payload is not None
    assert payload.phone is None


def test_validate_rejects_invalid_required_fields_and_email():
    payload, errors = ContactPayloadSchema.validate(
        {"first_name": " ", "last_name": None, "emails": ["invalid-email"]}
    )

    assert payload is None
    assert errors == [
        "first_name is required",
        "last_name is required",
        "invalid-email is not a valid email address",
    ]


def test_validate_rejects_non_list_emails():
    payload, errors = ContactPayloadSchema.validate(
        {"first_name": "Ada", "last_name": "Lovelace", "emails": "ada@example.com"}
    )

    assert payload is None
    assert errors == ["emails must be an array of strings"]


def test_validate_rejects_invalid_phone_number():
    payload, errors = ContactPayloadSchema.validate(
        {"first_name": "Ada", "last_name": "Lovelace", "phone": "555-0100"}
    )

    assert payload is None
    assert errors == ["phone must be a valid US phone number"]
