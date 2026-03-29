from django.db import models
from django.conf import settings


# ── Education level choices (Ethiopian context) ──────────────────────────────
EDUCATION_LEVEL_CHOICES = (
    ('phd',           'PhD / Doctorate'),
    ('masters',       "Master's Degree"),
    ('postgrad_dip',  'Postgraduate Diploma'),
    ('bachelor',      "Bachelor's Degree (BSc / BA / BEd / BEng)"),
    ('advanced_dip',  'Advanced Diploma (3-year TVET)'),
    ('diploma',       'Diploma (2-year TVET / College)'),
    ('level4',        'TVET Level IV Certificate'),
    ('level3',        'TVET Level III Certificate'),
    ('level2',        'TVET Level II Certificate'),
    ('level1',        'TVET Level I Certificate'),
    ('preparatory',   'Preparatory (Grade 11–12)'),
    ('secondary',     'Secondary School (Grade 9–10)'),
    ('primary',       'Primary School (Grade 1–8)'),
    ('informal',      'Informal / Non-formal Education'),
    ('no_formal',     'No Formal Education'),
    ('other',         'Other / Self-taught / Vocational'),
)

FIELD_OF_STUDY_CHOICES = (
    # Engineering & Technology
    ('civil_eng',         'Civil Engineering'),
    ('electrical_eng',    'Electrical Engineering'),
    ('mechanical_eng',    'Mechanical Engineering'),
    ('software_eng',      'Software Engineering'),
    ('computer_science',  'Computer Science / IT'),
    ('architecture',      'Architecture'),
    ('construction',      'Construction Technology'),
    ('water_resource',    'Water Resource Engineering'),
    ('environmental_eng', 'Environmental Engineering'),
    # Business & Economics
    ('accounting',        'Accounting & Finance'),
    ('economics',         'Economics'),
    ('management',        'Management'),
    ('marketing',         'Marketing'),
    ('banking_finance',   'Banking & Finance'),
    ('logistics',         'Logistics & Supply Chain'),
    # Health
    ('medicine',          'Medicine (MD)'),
    ('nursing',           'Nursing'),
    ('pharmacy',          'Pharmacy'),
    ('public_health',     'Public Health'),
    ('midwifery',         'Midwifery'),
    ('health_officer',    'Health Officer'),
    ('medical_lab',       'Medical Laboratory'),
    # Education
    ('education',         'Education / Teaching'),
    ('special_needs',     'Special Needs Education'),
    # Law & Social
    ('law',               'Law (LLB)'),
    ('social_work',       'Social Work'),
    ('journalism',        'Journalism & Communication'),
    ('political_science', 'Political Science'),
    ('sociology',         'Sociology'),
    ('psychology',        'Psychology'),
    # Agriculture
    ('agriculture',       'Agriculture'),
    ('animal_science',    'Animal Science / Veterinary'),
    ('natural_resource',  'Natural Resource Management'),
    # Arts & Humanities
    ('amharic',           'Amharic Language & Literature'),
    ('english',           'English Language & Literature'),
    ('history',           'History'),
    ('geography',         'Geography'),
    # TVET / Vocational
    ('auto_mechanics',    'Automotive Mechanics'),
    ('electricity',       'Electricity / Electrical Installation'),
    ('welding',           'Welding & Metal Fabrication'),
    ('garment',           'Garment & Textile'),
    ('hotel_tourism',     'Hotel & Tourism'),
    ('ict_tvet',          'ICT (TVET)'),
    ('other_field',       'Other'),
)

EMPLOYMENT_STATUS_CHOICES = (
    ('employed_full',   'Currently Employed (Full-time)'),
    ('employed_part',   'Currently Employed (Part-time)'),
    ('self_employed',   'Self-Employed / Freelancer'),
    ('unemployed',      'Unemployed / Looking for Work'),
    ('student',         'Student'),
    ('fresh_graduate',  'Fresh Graduate'),
    ('intern',          'Intern / Trainee'),
)

LANGUAGE_PROFICIENCY = (
    ('native',       'Native'),
    ('fluent',       'Fluent'),
    ('professional', 'Professional Working'),
    ('intermediate', 'Intermediate'),
    ('basic',        'Basic'),
)


class CV(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cv'
    )
    # ── Personal Info ────────────────────────────────────────────────────────
    full_name        = models.CharField(max_length=200, blank=True)
    full_name_am     = models.CharField(max_length=200, blank=True)
    first_name       = models.CharField(max_length=100, blank=True)
    father_name      = models.CharField(max_length=100, blank=True)
    grandfather_name = models.CharField(max_length=100, blank=True)
    email            = models.EmailField(blank=True)
    phone            = models.CharField(max_length=20, blank=True)
    phone_alt        = models.CharField(max_length=20, blank=True)
    phone_alt2       = models.CharField(max_length=20, blank=True)
    region           = models.CharField(max_length=100, blank=True)
    city             = models.CharField(max_length=100, blank=True)
    sub_city         = models.CharField(max_length=100, blank=True)
    woreda           = models.CharField(max_length=50, blank=True)
    kebele           = models.CharField(max_length=50, blank=True)
    house_number     = models.CharField(max_length=50, blank=True)
    nationality      = models.CharField(max_length=50, default='Ethiopian')
    gender           = models.CharField(max_length=20, blank=True)
    marital_status   = models.CharField(max_length=20, blank=True)
    date_of_birth    = models.CharField(max_length=20, blank=True, default='')
    disability       = models.CharField(max_length=50, blank=True, default='None')
    profile_photo    = models.ImageField(upload_to='cv/photos/', blank=True, null=True)
    # ── Skill / Profession ───────────────────────────────────────────────────
    skill_category    = models.CharField(max_length=30, blank=True)
    skill_title       = models.CharField(max_length=100, blank=True)
    skill_title_custom = models.CharField(max_length=100, blank=True)
    skill_specialization = models.CharField(max_length=200, blank=True, verbose_name='Specialization / Subject / Department')
    objective         = models.TextField(blank=True)
    employment_status = models.CharField(max_length=50, blank=True)
    # ── Education (stored as JSON list of entries) ───────────────────────────
    education_entries = models.TextField(blank=True, default='[]', verbose_name='Education entries (JSON)')
    # Legacy single-entry fields kept for compatibility
    education_level  = models.CharField(max_length=30, blank=True)
    field_of_study   = models.CharField(max_length=50, blank=True)
    institution_name = models.CharField(max_length=200, blank=True)
    graduation_year  = models.CharField(max_length=4, blank=True)
    cgpa             = models.CharField(max_length=10, blank=True)
    cgpa_scale       = models.CharField(max_length=5, blank=True, default='4.0')
    exit_exam_score  = models.CharField(max_length=10, blank=True)
    exit_exam_year   = models.CharField(max_length=4, blank=True)
    thesis_title     = models.CharField(max_length=300, blank=True)
    # ── Skills ───────────────────────────────────────────────────────────────
    technical_skills = models.TextField(blank=True, verbose_name='Technical Skills (comma separated)')
    soft_skills      = models.TextField(blank=True, verbose_name='Soft Skills (comma separated)')
    computer_skills  = models.TextField(blank=True, verbose_name='Computer / IT Skills')
    driving_license  = models.BooleanField(default=False)
    driving_license_type = models.CharField(max_length=20, blank=True, verbose_name='License Type (A, B, C, D, F)')
    # ── Work Experience ──────────────────────────────────────────────────────
    has_experience    = models.BooleanField(default=False)
    experience_years  = models.CharField(max_length=5, blank=True)
    experience_entries = models.TextField(blank=True, default='[]', verbose_name='Experience entries (JSON)')
    experience_detail = models.TextField(blank=True)  # legacy fallback
    reference_1       = models.CharField(max_length=300, blank=True)
    reference_2       = models.CharField(max_length=300, blank=True)
    # ── Languages ────────────────────────────────────────────────────────────
    amharic_level    = models.CharField(max_length=20, blank=True, default='Native')
    english_level    = models.CharField(max_length=20, blank=True)
    other_languages  = models.CharField(max_length=200, blank=True)
    # ── Uploaded Documents ───────────────────────────────────────────────────
    transcript_file       = models.FileField(upload_to='cv/transcripts/', blank=True, null=True)
    exit_exam_file        = models.FileField(upload_to='cv/exit_exams/', blank=True, null=True)
    degree_certificate    = models.FileField(upload_to='cv/degrees/', blank=True, null=True)
    tvet_certificate      = models.FileField(upload_to='cv/tvet/', blank=True, null=True)
    experience_letter     = models.FileField(upload_to='cv/experience/', blank=True, null=True)
    recommendation_letter = models.FileField(upload_to='cv/recommendations/', blank=True, null=True)
    national_id           = models.FileField(upload_to='cv/ids/', blank=True, null=True)
    other_document        = models.FileField(upload_to='cv/other/', blank=True, null=True)
    other_document_label  = models.CharField(max_length=100, blank=True)
    # ── Meta ─────────────────────────────────────────────────────────────────
    is_complete      = models.BooleanField(default=False)
    updated_at       = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"CV — {self.full_name or self.user.username}"
