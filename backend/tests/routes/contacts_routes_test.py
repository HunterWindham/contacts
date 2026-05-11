"""Route-level tests for the contacts API."""
from __future__ import annotations


def test_health_endpoint_returns_ok(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_contacts_crud_flow(client, contact_payload):
    create_response = client.post("/api/contacts", json=contact_payload())
    assert create_response.status_code == 201
    created_contact = create_response.get_json()
    assert created_contact["id"] > 0
    assert created_contact["first_name"] == "Ada"

    list_response = client.get("/api/contacts")
    assert list_response.status_code == 200
    assert len(list_response.get_json()) == 1

    get_response = client.get(f"/api/contacts/{created_contact['id']}")
    assert get_response.status_code == 200
    assert get_response.get_json()["emails"] == ["ada@example.com"]

    update_response = client.put(
        f"/api/contacts/{created_contact['id']}",
        json=contact_payload(first_name="Augusta"),
    )
    assert update_response.status_code == 200
    assert update_response.get_json()["first_name"] == "Augusta"

    delete_response = client.delete(f"/api/contacts/{created_contact['id']}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/api/contacts/{created_contact['id']}")
    assert missing_response.status_code == 404
    assert missing_response.get_json() == {"errors": ["Contact not found"]}


def test_create_contact_validation_errors(client):
    response = client.post("/api/contacts", json={"first_name": " ", "emails": ["nope"]})

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": [
            "first_name is required",
            "last_name is required",
            "nope is not a valid email address",
        ]
    }


def test_optional_fields_default_to_empty_values(client):
    response = client.post(
        "/api/contacts",
        json={"first_name": "Grace", "last_name": "Hopper"},
    )

    assert response.status_code == 201
    body = response.get_json()
    assert body["emails"] == []
    assert body["phone"] is None


def test_optional_phone_accepts_empty_string(client):
    response = client.post(
        "/api/contacts",
        json={
            "first_name": "Grace",
            "last_name": "Hopper",
            "phone": "",
        },
    )

    assert response.status_code == 201
    assert response.get_json()["phone"] is None


def test_list_contacts_query_filters_by_name_and_email(client, contact_payload):
    client.post(
        "/api/contacts",
        json=contact_payload(
            first_name="Ada",
            last_name="Lovelace",
            emails=["ada@example.com"],
        ),
    )
    client.post(
        "/api/contacts",
        json=contact_payload(
            first_name="Grace",
            last_name="Hopper",
            emails=["grace@example.com"],
        ),
    )

    full_name_response = client.get("/api/contacts?q=ada%20lovelace")
    assert full_name_response.status_code == 200
    assert [item["first_name"] for item in full_name_response.get_json()] == ["Ada"]

    email_response = client.get("/api/contacts?q=grace@example.com")
    assert email_response.status_code == 200
    assert [item["first_name"] for item in email_response.get_json()] == ["Grace"]


def test_update_and_delete_missing_contact_returns_not_found(client, contact_payload):
    update_response = client.put("/api/contacts/9999", json=contact_payload())
    assert update_response.status_code == 404
    assert update_response.get_json() == {"errors": ["Contact not found"]}

    delete_response = client.delete("/api/contacts/9999")
    assert delete_response.status_code == 404
    assert delete_response.get_json() == {"errors": ["Contact not found"]}


def test_create_contact_rejects_non_object_json_body(client):
    response = client.post("/api/contacts", json=["not", "an", "object"])

    assert response.status_code == 400
    assert response.get_json() == {"errors": ["Request body must be a JSON object"]}
