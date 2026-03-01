"""
db.py — Centralized MongoDB connection module for SoilSense.

Loads credentials from .env via python-dotenv.
Exposes a get_db() helper returning the active database handle.
Connection is attempted on import; if MongoDB is unavailable the app
continues to run but DB operations will be skipped gracefully.
"""

import logging
import os

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError

# Load .env from the root of the project
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

_client: MongoClient | None = None
_db = None

logger = logging.getLogger(__name__)


def init_db() -> bool:
    """
    Initialise the MongoDB connection.
    Returns True if the connection succeeded, False otherwise.
    Call this once at application startup.
    """
    global _client, _db

    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME", "soilsense")

    if not mongo_uri:
        logger.warning(
            "MONGO_URI not set in .env — running without database persistence."
        )
        return False

    try:
        _client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
        # Ping to validate the connection before accepting traffic
        _client.admin.command("ping")
        _db = _client[db_name]
        logger.info("MongoDB connected successfully → database: '%s'", db_name)
        return True
    except (ConnectionFailure, ConfigurationError) as exc:
        logger.warning(
            "MongoDB connection failed (%s). Running without DB persistence.", exc
        )
        _client = None
        _db = None
        return False


def get_db():
    """
    Return the active database handle, or None if not connected.
    All callers must handle the None case gracefully.
    """
    return _db


def is_connected() -> bool:
    """Returns True if the MongoDB client is currently active."""
    return _db is not None
