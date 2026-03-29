from rest_framework import serializers
from .models import Job
from users.serializers import UserSerializer

class JobSerializer(serializers.ModelSerializer):
    posted_by = UserSerializer(read_only=True)

    class Meta:
        model = Job
        fields = '__all__'
        read_only_fields = ['posted_by', 'created_at']

class JobCreateSerializer(serializers.ModelSerializer):
    deadline = serializers.DateField(required=False, allow_null=True, default=None)
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
        # Convert any invalid deadline to None — only accept YYYY-MM-DD
        dl = data.get('deadline', '')
        if not dl or not re.match(r'^\d{4}-\d{2}-\d{2}$', str(dl)):
            data['deadline'] = None
        # Convert empty salary to blank string
        if not data.get('salary'):
            data['salary'] = ''
        return super().to_internal_value(data)
