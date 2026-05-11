"""REST endpoints for the `contacts` resource."""
from __future__ import annotations

from collections.abc import Mapping

from flask import Blueprint, jsonify, request

from ..schemas import ContactPayloadSchema
from ..services import contact_service

contacts_bp = Blueprint("contacts", __name__, url_prefix="/api/contacts")

def _read_json_object_or_400() -> tuple[dict[str, object] | None, tuple[object, int] | None]:
    payload = request.get_json(silent=True)
    if payload is None:
        return {}, None
    if not isinstance(payload, Mapping):
        return None, (jsonify({"errors": ["Request body must be a JSON object"]}), 400)
    return dict(payload), None


@contacts_bp.get("")
def list_contacts():
    query = request.args.get("q", type=str)
    contacts = contact_service.list_contacts(query=query)
    return jsonify([contact.to_dict() for contact in contacts])


@contacts_bp.get("/<int:contact_id>")
def get_contact(contact_id: int):
    contact = contact_service.get_contact(contact_id)
    return jsonify(contact.to_dict())


@contacts_bp.post("")
def create_contact():
    payload, error_response = _read_json_object_or_400()
    if error_response:
        return error_response
    if payload is None:
        return jsonify({"errors": ["Request body must be a JSON object"]}), 400
    cleaned, errors = ContactPayloadSchema.validate(payload)
    if errors:
        return jsonify({"errors": errors}), 400

    contact = contact_service.create_contact(cleaned)
    return jsonify(contact.to_dict()), 201


@contacts_bp.put("/<int:contact_id>")
def update_contact(contact_id: int):
    payload, error_response = _read_json_object_or_400()
    if error_response:
        return error_response
    if payload is None:
        return jsonify({"errors": ["Request body must be a JSON object"]}), 400
    cleaned, errors = ContactPayloadSchema.validate(payload)
    if errors:
        return jsonify({"errors": errors}), 400

    contact = contact_service.update_contact(contact_id, cleaned)
    return jsonify(contact.to_dict())


@contacts_bp.delete("/<int:contact_id>")
def delete_contact(contact_id: int):
    contact_service.delete_contact(contact_id)
    return "", 204
