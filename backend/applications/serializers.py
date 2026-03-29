from rest_framework import serializers
from .models import Application
from jobs.serializers import JobSerializer
from users.serializers import UserSerializer


class ApplicationSerializer(serializers.ModelSerializer):
    job       = JobSerializer(read_only=True)
    job_id    = serializers.IntegerField(write_only=True)
    applicant = UserSerializer(read_only=True)
    # Include applicant's CV inline so employer sees full profile
    applicant_cv = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'job', 'job_id', 'applicant', 'applicant_cv',
            'cover_letter', 'status', 'employer_note',
            'applied_at', 'status_updated_at',
        ]
        read_only_fields = ['status', 'applied_at', 'status_updated_at', 'applicant']

    def get_applicant_cv(self, obj):
        try:
            cv = obj.applicant.cv
            from cvs.serializers import CVSerializer
            return CVSerializer(cv).data
        except Exception:
            return None


class ApplicationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ['status', 'employer_note']
