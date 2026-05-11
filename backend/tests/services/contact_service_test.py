"""Service-level tests for contact CRUD logic."""
from __future__ import annotations

import pytest
from werkzeug.exceptions import NotFound

from app.schemas import ContactPayloadSchema
from app.services import contact_service


def _validated_payload(payload: dict[str, object]):
    cleaned_payload, errors = ContactPayloadSchema.validate(payload)
    assert errors == []
    assert cleaned_payload is not None
    return cleaned_payload


def test_create_and_get_contact(app_context, contact_payload):
    created_contact = contact_service.create_contact(
        _validated_payload(contact_payload())
    )

    fetched_contact = contact_service.get_contact(created_contact.id)
    assert fetched_contact.id == created_contact.id
    assert fetched_contact.first_name == "Ada"
    assert fetched_contact.emails == ["ada@example.com"]


def test_list_contacts_returns_newest_first(app_context, contact_payload):
    first_contact = contact_service.create_contact(
        _validated_payload(contact_payload(first_name="First"))
    )
    second_contact = contact_service.create_contact(
        _validated_payload(contact_payload(first_name="Second"))
    )

    contacts = contact_service.list_contacts()
    assert [contact.id for contact in contacts] == [second_contact.id, first_contact.id]


def test_list_contacts_filters_by_name_or_email(app_context, contact_payload):
    contact_service.create_contact(
        _validated_payload(
            contact_payload(
                first_name="Ada",
                last_name="Lovelace",
                emails=["ada@example.com"],
            )
        )
    )
    contact_service.create_contact(
        _validated_payload(
            contact_payload(
                first_name="Grace",
                last_name="Hopper",
                emails=["grace@example.com"],
            )
        )
    )

    by_first_name = contact_service.list_contacts(query="ada")
    assert [contact.first_name for contact in by_first_name] == ["Ada"]

    by_full_name = contact_service.list_contacts(query="hopper grace")
    assert [contact.first_name for contact in by_full_name] == ["Grace"]

    by_email = contact_service.list_contacts(query="ada@example.com")
    assert [contact.first_name for contact in by_email] == ["Ada"]


def test_update_contact_persists_changes(app_context, contact_payload):
    created_contact = contact_service.create_contact(
        _validated_payload(contact_payload())
    )

    updated_contact = contact_service.update_contact(
        created_contact.id,
        _validated_payload(
            contact_payload(
                first_name="Augusta",
                emails=["augusta@example.com", "second@example.com"],
                phone=None,
            )
        ),
    )

    assert updated_contact.first_name == "Augusta"
    assert updated_contact.emails == ["augusta@example.com", "second@example.com"]
    assert updated_contact.phone is None


def test_delete_contact_removes_row(app_context, contact_payload):
    created_contact = contact_service.create_contact(
        _validated_payload(contact_payload())
    )

    contact_service.delete_contact(created_contact.id)
    with pytest.raises(NotFound) as error_info:
        contact_service.get_contact(created_contact.id)
    assert "404 Not Found" in str(error_info.value)


def test_update_missing_contact_raises_not_found(app_context, contact_payload):
    with pytest.raises(NotFound) as error_info:
        contact_service.update_contact(
            9999,
            _validated_payload(contact_payload()),
        )

    assert "404 Not Found" in str(error_info.value)
