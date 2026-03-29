from rest_framework import serializers
from .models import CV


class CVSerializer(serializers.ModelSerializer):
    # Expose choice display labels as read-only extras
    education_level_display  = serializers.CharField(source='get_education_level_display',  read_only=True)
    field_of_study_display   = serializers.CharField(source='get_field_of_study_display',   read_only=True)
    employment_status_display = serializers.CharField(source='get_employment_status_display', read_only=True)
    amharic_level_display    = serializers.CharField(source='get_amharic_level_display',    read_only=True)
    english_level_display    = serializers.CharField(source='get_english_level_display',    read_only=True)

    class Meta:
        model = CV
        fields = '__all__'
        read_only_fields = ['user', 'updated_at', 'is_complete']

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        # Auto-mark complete if key fields are filled
        instance.is_complete = bool(
            instance.full_name and
            instance.phone and
            instance.education_level
        )
        instance.save(update_fields=['is_complete'])
        return instance
