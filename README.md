# Contacts

A small address-book MVP. Vanilla JavaScript frontend, Flask + SQLite backend.

```text
contacts/
├── README.md
├── backend/                     # Flask API + SQLite persistence
│   ├── app/
│   │   ├── routes/              # REST endpoints
│   │   ├── schemas/             # Request/response validation
│   │   ├── services/            # Data access + business logic
│   │   └── models/              # Domain models
│   ├── tests/                   # Backend pytest suite
│   ├── scripts/seed_contacts.py # Local data seeding helper
│   ├── run.py                   # Backend entrypoint
│   ├── schema.sql               # SQLite schema
│   └── .env.example             # Backend env template
└── frontend/                    # Static app (vanilla JS)
    ├── index.html               # App shell
    ├── src/
    │   ├── logic/               # Controllers + API client
    │   └── ui/                  # DOM views/rendering helpers
    ├── styles/                  # CSS
    ├── tests/                   # Vitest suite
    └── package.json             # Frontend scripts/deps
```

Generated local directories (for example `backend/.venv/`,
`backend/.pytest_cache/`, and `frontend/node_modules/`) are omitted.

## Prerequisites

- Python 3.10+
- A modern browser
- (Optional) Python's built-in `http.server` to serve the frontend

## Run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python run.py
```

The API starts at <http://127.0.0.1:5000>. The SQLite file is created on first
run at `backend/instance/contacts.db` (gitignored).

## Run the frontend

In another terminal:

```bash
cd frontend
python -m http.server 5500
```

Open <http://127.0.0.1:5500>. The frontend talks to the API at
`http://127.0.0.1:5000/api` by default.

To point the frontend to another backend URL, either:

- Set `<meta name="contacts-api-base" ...>` in `frontend/index.html`
- Or set `window.__CONTACTS_API_BASE__` before `src/main.js` loads

## Run the tests

```bash
cd backend
source .venv/bin/activate
pytest
```

```bash
cd frontend
npm install
npm test
```

## Environment configuration

`backend/.env` drives runtime behavior:

```env
APP_ENV=development
FLASK_RUN_HOST=127.0.0.1
FLASK_RUN_PORT=5000
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
# DATABASE_URL=/absolute/path/to/contacts.db
```

- In `development`, CORS defaults to local frontend origins only.
- In `production`, you **must** set `CORS_ORIGINS` (comma-separated list).
- `phone` is optional; empty values are normalized to `null`.

## REST API

All endpoints return JSON. Errors have shape `{ "errors": ["..."] }`.
Non-object JSON request bodies return `400` with
`{ "errors": ["Request body must be a JSON object"] }`.

| Method | Path                  | Description           | Success |
| ------ | --------------------- | --------------------- | ------- |
| GET    | `/api/health`         | Liveness probe        | 200     |
| GET    | `/api/contacts`       | List contacts (newest first) | 200 |
| GET    | `/api/contacts/<id>`  | Get one contact       | 200     |
| POST   | `/api/contacts`       | Create contact        | 201     |
| PUT    | `/api/contacts/<id>`  | Update contact        | 200     |
| DELETE | `/api/contacts/<id>`  | Delete contact        | 204     |

### Contact shape

```json
{
  "id": 1,
  "first_name": "Ada",
  "last_name": "Lovelace",
  "emails": ["ada@example.com", "ada@work.com"],
  "phone": "(212) 555-0100",
  "created_at": "2026-05-06 19:30:00",
  "updated_at": "2026-05-06 19:30:00"
}
```

`first_name` and `last_name` are required; `emails` and `phone` are optional.
`emails` must be an array of valid email addresses. `phone` must be a valid US
number and is normalized to `(XXX) XXX-XXXX`.

### Contact search

Use the optional `q` query parameter on `GET /api/contacts` to filter contacts by
first name, last name, either full-name order, or email.

```bash
GET /api/contacts?q=ada
GET /api/contacts?q=ada%20lovelace
GET /api/contacts?q=ada@example.com
```

## Manual verification checklist

1. Start the backend (`python run.py`).
2. Start the frontend (`python -m http.server 5500`).
3. Visit the page — the list should say "No contacts yet."
4. Create a contact via the form — it appears in the list, count updates.
5. Click **Edit**, change a field, save — the row reflects the update.
6. Click **Delete**, confirm — the row disappears.
7. Submit an invalid form (missing names / bad emails list) — inline errors render.
8. Type into the search box — the list filters by first name, last name, full name, or email.
