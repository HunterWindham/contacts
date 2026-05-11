"""Flask application factory."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from .config import default_database_path, resolve_config_class, resolve_cors_origins
from .routes.contacts import contacts_bp
from .services.db import register_db

def create_app(
    config_overrides: dict[str, Any] | None = None,
    environment: str | None = None,
) -> Flask:
    """Build and configure a Flask app instance."""
    resolved_environment = (environment or os.getenv("APP_ENV", "development")).lower().strip()
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(resolve_config_class(resolved_environment))
    app.config["APP_ENV"] = resolved_environment

    # Persist the SQLite file inside Flask's instance folder so it's outside the
    # source tree and easy to gitignore.
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)
    if not app.config.get("DATABASE"):
        app.config["DATABASE"] = default_database_path(app.instance_path)
    if config_overrides:
        app.config.update(config_overrides)

    # CORS keeps local dev simple when the frontend is served from a different
    # origin (e.g. a static file server on another port).
    cors_origins = resolve_cors_origins(app.config.get("CORS_ORIGINS"))
    if resolved_environment == "production" and not cors_origins:
        raise RuntimeError(
            "CORS_ORIGINS must be configured in production (comma-separated allowed)."
        )
    CORS(app, resources={r"/api/*": {"origins": cors_origins}})

    register_db(app)
    app.register_blueprint(contacts_bp)

    @app.get("/api/health")
    def health() -> Any:
        return jsonify({"status": "ok"})

    @app.errorhandler(HTTPException)
    def handle_http_exception(exc: HTTPException):
        response = jsonify({"errors": [exc.description]})
        response.status_code = exc.code or 500
        return response

    return app
