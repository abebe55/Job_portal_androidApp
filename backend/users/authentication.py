"""
JWT auth for MongoDB/djongo users.

djongo often persists AbstractUser with id=None (only Mongo _id exists).
SimpleJWT then stores user_id="None", and JWTAuthentication does
User.objects.get(id="None") → ValueError 500 on every authenticated request.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.contrib.auth import get_user_model


def _users_col():
    from django.db import connections
    db = connections['default']
    if db.connection is None:
        db.ensure_connection()
    return db.connection['users_user']


def ensure_numeric_user_id(user):
    """
    If the Django user has no integer pk, assign the next integer `id` on the
    Mongo document so JWT and FKs (wallet, jobs) have a real number.
    """
    if user is None:
        return user
    pk = getattr(user, 'pk', None)
    if isinstance(pk, int) or (isinstance(pk, str) and str(pk).isdigit()):
        return user
    try:
        col = _users_col()
        doc = col.find_one({'username': user.username})
        if not doc:
            return user
        existing = doc.get('id')
        if isinstance(existing, int):
            user.pk = user.id = existing
            return user
        last = col.find_one(
            {'id': {'$type': ['int', 'long']}},
            sort=[('id', -1)],
        )
        next_id = int(last['id']) + 1 if last and last.get('id') is not None else 1
        while col.find_one({'id': next_id}):
            next_id += 1
        col.update_one({'_id': doc['_id']}, {'$set': {'id': next_id}})
        user.pk = user.id = next_id
    except Exception:
        pass
    return user


class MongoJWTAuthentication(JWTAuthentication):
    """Resolve JWT users by integer id, then username — never query id=None."""

    def get_user(self, validated_token):
        User = get_user_model()
        raw_id = validated_token.get('user_id')
        username = validated_token.get('username') or ''

        if raw_id in (None, 'None', '', 'null'):
            raw_id = None

        user = None

        if raw_id is not None and str(raw_id).isdigit():
            try:
                user = User.objects.get(pk=int(raw_id))
            except (User.DoesNotExist, ValueError, TypeError):
                user = None

        if user is None and username:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                user = None

        if user is None and raw_id and not str(raw_id).isdigit():
            try:
                user = User.objects.get(username=str(raw_id))
            except User.DoesNotExist:
                user = None

        if user is None:
            raise InvalidToken('User not found or token is missing a valid user id.')

        if not user.is_active:
            raise AuthenticationFailed('User is inactive', code='user_inactive')

        ensure_numeric_user_id(user)
        return user
