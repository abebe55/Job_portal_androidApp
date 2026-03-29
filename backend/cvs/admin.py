from django.contrib import admin
from .models import CV


@admin.register(CV)
class CVAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'user', 'education_level', 'field_of_study', 'city', 'is_complete', 'updated_at']
    list_filter   = ['education_level', 'is_complete', 'gender']
    search_fields = ['full_name', 'full_name_am', 'user__username', 'user__email', 'city']
    readonly_fields = ['updated_at', 'is_complete']
    fieldsets = (
        ('Personal Info', {'fields': (
            'user', 'full_name', 'full_name_am', 'email', 'phone', 'phone_alt',
            'gender', 'date_of_birth', 'nationality',
            'region', 'city', 'woreda', 'kebele', 'profile_photo',
        )}),
        ('Career', {'fields': ('employment_status', 'objective')}),
        ('Education', {'fields': (
            'education_level', 'field_of_study', 'institution_name',
            'graduation_year', 'cgpa', 'cgpa_scale',
            'exit_exam_score', 'exit_exam_year', 'thesis_title',
        )}),
        ('TVET / Vocational', {'fields': (
            'tvet_level', 'tvet_center', 'tvet_year', 'competency_areas',
        )}),
        ('Skills', {'fields': (
            'technical_skills', 'soft_skills', 'computer_skills',
            'driving_license', 'driving_license_type',
        )}),
        ('Work Experience', {'fields': (
            'has_experience', 'experience_years', 'experience_detail',
        )}),
        ('Languages', {'fields': (
            'amharic_level', 'english_level', 'other_languages',
        )}),
        ('References', {'fields': ('references',)}),
        ('Documents', {'fields': (
            'transcript_file', 'exit_exam_file', 'degree_certificate',
            'tvet_certificate', 'experience_letter',
            'recommendation_letter', 'other_document', 'other_document_label',
        )}),
        ('Meta', {'fields': ('is_complete', 'updated_at')}),
    )
