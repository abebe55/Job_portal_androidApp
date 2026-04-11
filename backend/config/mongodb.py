"""
MongoDB Atlas connection via pymongo.
Usage anywhere in the project:
    from config.mongodb import get_db
    db = get_db()
    db.jobs.find_one({'_id': ...})
"""
from pymongo import MongoClient
from django.conf import settings

_client = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGO_URI)
    return _client

def get_db():
    return get_client()[settings.MONGO_DB_NAME]
