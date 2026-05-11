"""Local development entrypoint: `python run.py`."""
from __future__ import annotations

import os

from app import create_app

app = create_app(environment=os.getenv("APP_ENV"))

if __name__ == "__main__":
    app.run(
        host=os.getenv("FLASK_RUN_HOST", "127.0.0.1"),
        port=int(os.getenv("FLASK_RUN_PORT", "5000")),
        debug=app.config.get("DEBUG", False),
    )
