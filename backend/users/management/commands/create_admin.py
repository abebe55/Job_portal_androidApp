"""
Management command to create or update the admin superuser.

Usage on Render Shell:
    python manage.py create_admin

This creates:
    username : abebe
    email    : abebemarye5360@gmail.com
    password : 123123Aa@
    role     : admin
    is_staff : True
    is_superuser : True
    email_verified : True
    is_approved : True
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password


class Command(BaseCommand):
    help = 'Create or update the admin user for JobPortal'

    def handle(self, *args, **options):
        from django.db import connections

        username = 'abebe'
        email    = 'abebemarye5360@gmail.com'
        password = '123123Aa@'

        try:
            db  = connections['default']
            if db.connection is None:
                db.ensure_connection()
            col = db.connection['users_user']
        except Exception as e:
            self.stderr.write(f'DB connection failed: {e}')
            return

        hashed = make_password(password)

        existing = col.find_one({'username': username})

        if existing:
            col.update_one(
                {'username': username},
                {'$set': {
                    'email':          email,
                    'password':       hashed,
                    'role':           'admin',
                    'is_staff':       True,
                    'is_superuser':   True,
                    'is_active':      True,
                    'is_approved':    True,
                    'email_verified': True,
                    'is_suspended':   False,
                }},
            )
            self.stdout.write(self.style.SUCCESS(
                f'✅ Admin user "{username}" updated successfully.'
            ))
        else:
            # Use Django ORM to create with proper auto-increment id
            from users.models import User
            try:
                user = User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password,
                )
                # Update extra fields via raw pymongo
                col.update_one(
                    {'username': username},
                    {'$set': {
                        'role':           'admin',
                        'is_approved':    True,
                        'email_verified': True,
                        'is_suspended':   False,
                    }},
                )
                self.stdout.write(self.style.SUCCESS(
                    f'✅ Admin user "{username}" created successfully.'
                ))
            except Exception as e:
                # Fallback: raw insert
                import datetime
                col.insert_one({
                    'username':       username,
                    'email':          email,
                    'password':       hashed,
                    'role':           'admin',
                    'is_staff':       True,
                    'is_superuser':   True,
                    'is_active':      True,
                    'is_approved':    True,
                    'email_verified': True,
                    'is_suspended':   False,
                    'date_joined':    datetime.datetime.utcnow(),
                    'last_login':     None,
                    'first_name':     '',
                    'last_name':      '',
                    'phone':          '',
                    'location':       '',
                    'bio':            '',
                    'preferred_language': 'en',
                    'profile_photo':  '',
                })
                self.stdout.write(self.style.SUCCESS(
                    f'✅ Admin user "{username}" created via raw insert.'
                ))

        self.stdout.write('')
        self.stdout.write('Admin credentials:')
        self.stdout.write(f'  Username : {username}')
        self.stdout.write(f'  Email    : {email}')
        self.stdout.write(f'  Password : {password}')
        self.stdout.write(f'  Role     : admin')
