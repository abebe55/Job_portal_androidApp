from rest_framework import serializers
from .models import Job
from users.serializers import UserSerializer


class JobSerializer(serializers.ModelSerializer):
    posted_by     = UserSerializer(read_only=True)
    is_expired    = serializers.SerializerMethodField()
    deadline      = serializers.SerializerMethodField()
    extend_status = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = '__all__'
        read_only_fields = ['posted_by', 'created_at']

    def get_extend_status(self, obj):
        """Return actual extend_status from MongoDB — no normalization."""
        try:
            from django.db import connections
            db_conn = connections['default']
            db_conn.ensure_connection()
            col = db_conn.connection['jobs_job']
            doc = col.find_one({'id': obj.id}, {'extend_status': 1})
            if doc:
                return doc.get('extend_status', 'none') or 'none'
        except Exception:
            pass
        return obj.extend_status or 'none'

    def get_is_expired(self, obj):
        from django.utils import timezone
        dl = self._get_deadline_raw(obj)
        if not dl:
            return False
        try:
            from datetime import date, datetime
            if isinstance(dl, datetime):
                dl = dl.date()
            elif isinstance(dl, str):
                dl = date.fromisoformat(dl[:10])
            return dl < timezone.now().date()
        except Exception:
            return False

    def get_deadline(self, obj):
        """Return deadline as YYYY-MM-DD string — handles datetime/date/string from MongoDB."""
        dl = self._get_deadline_raw(obj)
        if not dl:
            return None
        try:
            from datetime import date, datetime
            if isinstance(dl, datetime):
                return dl.strftime('%Y-%m-%d')
            if isinstance(dl, date):
                return dl.strftime('%Y-%m-%d')
            if isinstance(dl, str) and len(dl) >= 10:
                return dl[:10]
            return str(dl)[:10]
        except Exception:
            return None

    def _get_deadline_raw(self, obj):
        dl = obj.deadline
        if dl is not None:
            return dl
        # djongo may return None even when stored — read directly from MongoDB
        try:
            from django.db import connections
            db_conn = connections['default']
            db_conn.ensure_connection()
            col = db_conn.connection['jobs_job']
            doc = col.find_one({'id': obj.id}, {'deadline': 1})
            if doc:
                return doc.get('deadline')
        except Exception:
            pass
        return None


class JobCreateSerializer(serializers.ModelSerializer):
    deadline = serializers.CharField(required=False, allow_null=True, allow_blank=True, default=None)
    salary   = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = Job
        fields = [
            'title', 'title_am', 'description', 'description_am',
            'location', 'skill_level', 'industry', 'job_type',
            'salary', 'deadline',
        ]

    def to_internal_value(self, data):
        import re
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        # Validate deadline — only accept YYYY-MM-DD, store as string
        dl = data.get('deadline', '') or ''
        dl = str(dl).strip()
        if dl and re.match(r'^\d{4}-\d{2}-\d{2}$', dl):
            data['deadline'] = dl  # keep as string — avoids MongoDB datetime conversion issues
        else:
            data['deadline'] = None
        if not data.get('salary'):
            data['salary'] = ''
        return super().to_internal_value(data)

    def validate_deadline(self, value):
        """Accept string deadline as-is — stored as string in MongoDB."""
        return value
