import logging
from django.apps import AppConfig

logger = logging.getLogger('users')


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'

    def ready(self):
        """
        Create / ensure the default admin account exists on every startup.
        Runs after all models are loaded — safe to use ORM / pymongo here.
        Silently skips on any error so it never blocks startup.
        """
        try:
            _ensure_admin()
        except Exception as exc:
            logger.warning('[startup] ensure_admin skipped: %s', exc)


def _ensure_admin():
    """
    Idempotent: creates the admin user if it doesn't exist,
    or updates password/role/flags if it does.
    Uses raw pymongo to avoid djongo ORM issues on cold start.
    """
    import datetime
    from django.contrib.auth.hashers import make_password
    from django.db import connections

    USERNAME = 'abebe'
    EMAIL    = 'abebemarye5360@gmail.com'
    PASSWORD = '123123Aa@'

    # Get DB connection with retry
    import time
    db = None
    for attempt in range(5):
        try:
            conn = connections['default']
            if conn.connection is None:
                conn.ensure_connection()
            db = conn
            break
        except Exception:
            connections['default'].close()
            time.sleep(1.0 * (attempt + 1))

    if db is None:
        logger.warning('[startup] Could not connect to DB — skipping admin creation')
        return

    col = db.connection['users_user']

    hashed = make_password(PASSWORD)

    admin_fields = {
        'email':             EMAIL,
        'password':          hashed,
        'role':              'admin',
        'is_staff':          True,
        'is_superuser':      True,
        'is_active':         True,
        'is_approved':       True,
        'email_verified':    True,
        'is_suspended':      False,
        'preferred_language':'en',
    }

    existing = col.find_one({'username': USERNAME})

    if existing:
        col.update_one({'username': USERNAME}, {'$set': admin_fields})
        logger.info('[startup] Admin user "%s" updated.', USERNAME)
    else:
        # Get the next integer id (djongo auto-increment)
        try:
            last = col.find_one(sort=[('id', -1)])
            next_id = (last.get('id', 0) or 0) + 1 if last else 1
        except Exception:
            next_id = 1

        doc = {
            'id':               next_id,
            'username':         USERNAME,
            'first_name':       '',
            'last_name':        '',
            'phone':            '',
            'location':         '',
            'bio':              '',
            'profile_photo':    '',
            'date_joined':      datetime.datetime.utcnow(),
            'last_login':       None,
        }
        doc.update(admin_fields)
        col.insert_one(doc)
        logger.info('[startup] Admin user "%s" created (id=%s).', USERNAME, next_id)
