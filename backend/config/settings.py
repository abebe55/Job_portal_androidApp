from decouple import config
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = ['*']  # Railway sets the domain automatically

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'users',
    'jobs',
    'applications',
    'cvs',
    'wallet',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ── Database ─────────────────────────────────────────────────────────────────
# Full MongoDB Atlas via djongo — no SQLite
DATABASES = {
    'default': {
        'ENGINE': 'config.db_backend',  # custom wrapper to prevent MongoClient close
        'NAME': config('MONGO_DB_NAME', default='jobportal'),
        'ENFORCE_SCHEMA': False,
        'CLIENT': {
            'host': config('MONGO_URI'),
            'tls': True,
            'tlsAllowInvalidCertificates': False,
            'retryWrites': True,
            'maxPoolSize': 10,
            'serverSelectionTimeoutMS': 5000,
            'connectTimeoutMS': 10000,
            'socketTimeoutMS': 20000,
        },
    }
}

AUTH_USER_MODEL = 'users.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOW_ALL_ORIGINS = True

# Chapa payment gateway
CHAPA_SECRET_KEY = config('CHAPA_SECRET_KEY', default='')
BACKEND_URL  = config('BACKEND_URL',  default='http://127.0.0.1:8000')
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# ── Email (SMTP) ──────────────────────────────────────────────────────────────
EMAIL_BACKEND   = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST      = config('EMAIL_HOST',      default='smtp.gmail.com')
EMAIL_PORT      = config('EMAIL_PORT',      default=465, cast=int)
EMAIL_USE_TLS   = config('EMAIL_USE_TLS',   default=False, cast=bool)
EMAIL_USE_SSL   = config('EMAIL_USE_SSL',   default=True,  cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL  = config('DEFAULT_FROM_EMAIL', default='JobPortal <noreply@jobportal.et>')

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Addis_Ababa'
USE_I18N = True
USE_L10N = True
USE_TZ = True

STATIC_URL = '/static/'
MEDIA_URL  = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
