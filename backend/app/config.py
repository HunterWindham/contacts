"""Environment-aware Flask configuration."""
from __future__ import annotations

import os
from collections.abc import Sequence
from pathlib import Path

DEV_DEFAULT_CORS_ORIGINS = (
    "http://127.0.0.1:5500",
    "http://localhost:5500",
)


class BaseConfig:
    """Base configuration shared across all environments."""

    TESTING = False
    DEBUG = False
    CORS_ORIGINS: str | Sequence[str] = ()
    DATABASE = os.getenv("DATABASE_URL")


class DevelopmentConfig(BaseConfig):
    """Local development defaults."""

    DEBUG = True
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", ",".join(DEV_DEFAULT_CORS_ORIGINS))


class TestConfig(BaseConfig):
    """Fast deterministic test configuration."""

    TESTING = True
    DATABASE = ":memory:"
    CORS_ORIGINS = "*"


class ProductionConfig(BaseConfig):
    """Production-safe defaults."""

    DEBUG = False
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")


def resolve_config_class(environment: str | None):
    """Resolve a config class from `APP_ENV` style values."""
    env = (environment or os.getenv("APP_ENV", "development")).lower().strip()
    if env == "production":
        return ProductionConfig
    if env == "test":
        return TestConfig
    return DevelopmentConfig


def default_database_path(instance_path: str) -> str:
    """Build the default SQLite path inside Flask's instance folder."""
    return str(Path(instance_path) / "contacts.db")


def resolve_cors_origins(value: str | Sequence[str] | None) -> str | list[str]:
    """Normalize CORS origins from env/config values."""
    if value is None:
        return []
    if isinstance(value, str):
        cleaned_value = value.strip()
        if cleaned_value == "*":
            return "*"
        if not cleaned_value:
            return []
        return [item.strip() for item in cleaned_value.split(",") if item.strip()]
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]
