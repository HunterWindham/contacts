# Backend

Flask API for the Contacts app, organized by responsibility so each layer stays easy to reason about and test.

## Folder structure

```text
backend/
├── app/
│   ├── __init__.py       # App factory + extension wiring
│   ├── config.py         # Environment-based configuration classes
│   ├── models/           # Domain data models
│   ├── routes/           # HTTP endpoints (Blueprints)
│   ├── schemas/          # Request validation/normalization
│   └── services/         # Business logic + data access
├── tests/                # API smoke and integration tests
├── .env.example          # Starter environment variables
├── .env                  # Local runtime environment variables (gitignored)
├── requirements.txt      # Python dependencies
├── run.py                # Local development entrypoint
└── schema.sql            # SQLite schema initialization
```

## Why this architecture

- `routes` now focuses on HTTP concerns only (request/response codes).
- `schemas` centralizes validation rules in one place.
- `services` owns contact business rules and persistence operations.
- `models` defines clear domain objects passed between layers.
- `config.py` keeps environment differences explicit and maintainable.

This separation helps keep the codebase clean as new endpoints and features are added.

## Environment and CORS

Copy and customize the provided environment template:

```bash
cd backend
cp .env.example .env
```

- `APP_ENV=development` allows CORS only for local frontend origins by default.
- `APP_ENV=production` requires an explicit `CORS_ORIGINS` value.
- `CORS_ORIGINS` accepts a comma-separated list of origins.

## Seed test data

Use the seed script to quickly populate local SQLite with generated contacts.

```bash
cd backend
python scripts/seed_contacts.py --count 1000 --reset
```

- `--count` controls how many contacts to create (default: `1000`).
- `--reset` clears existing contacts before inserting.
- `--seed` controls deterministic randomness (default: `42`).
