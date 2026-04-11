"""
Custom djongo database backend — prevents MongoClient from closing between requests.
"""
from djongo.base import DatabaseWrapper as DjongoDatabaseWrapper


class DatabaseWrapper(DjongoDatabaseWrapper):
    def close(self):
        # Keep the connection alive between requests.
        # Django/djongo would otherwise close and fail to reuse it.
        pass
