from rest_framework import serializers
from django.db import DatabaseError
from .models import User, EmployerVerification


class EmployerVerificationDetailSerializer(serializers.ModelSerializer):
    """Used by admin to see full verification data including user info and doc URLs."""
    username     = serializers.CharField(source='user.username', read_only=True)
    email        = serializers.CharField(source='user.email', read_only=True)
    phone        = serializers.CharField(source='user.phone', read_only=True)
    location     = serializers.CharField(source='user.location', read_only=True)
    user_id      = serializers.IntegerField(source='user.id', read_only=True)
    is_approved  = serializers.BooleanField(source='user.is_approved', read_only=True)

    class Meta:
        model = EmployerVerification
        fields = '__all__'


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    # Employer verification fields — all optional at field level
    employer_type       = serializers.CharField(required=False, allow_blank=True, default='')
    employer_type_other = serializers.CharField(required=False, allow_blank=True, default='')
    organization_name   = serializers.CharField(required=False, allow_blank=True, default='')
    national_id_number  = serializers.CharField(required=False, allow_blank=True, default='')

    # File fields — use allow_empty_file so empty/missing values don't crash
    business_license    = serializers.FileField(required=False, allow_null=True, allow_empty_file=True, default=None)
    tin_certificate     = serializers.FileField(required=False, allow_null=True, allow_empty_file=True, default=None)
    registration_cert   = serializers.FileField(required=False, allow_null=True, allow_empty_file=True, default=None)
    national_id_front   = serializers.ImageField(required=False, allow_null=True, allow_empty_file=True, default=None)
    national_id_back    = serializers.ImageField(required=False, allow_null=True, allow_empty_file=True, default=None)
    supporting_doc      = serializers.FileField(required=False, allow_null=True, allow_empty_file=True, default=None)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'role', 'phone', 'location',
            'employer_type', 'employer_type_other', 'organization_name',
            'business_license', 'tin_certificate', 'registration_cert',
            'national_id_front', 'national_id_back', 'national_id_number',
            'supporting_doc',
        ]

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, data):
        role = data.get('role', 'jobseeker')

        if role != 'employer':
            return data

        # ── Employer-specific validation ──
        emp_type = (data.get('employer_type') or '').strip()
        if not emp_type:
            raise serializers.ValidationError({'employer_type': 'Employer type is required.'})

        if emp_type == 'other' and not (data.get('employer_type_other') or '').strip():
            raise serializers.ValidationError({'employer_type_other': 'Please describe your employer type.'})

        if emp_type in ('company', 'factory'):
            if not data.get('business_license'):
                raise serializers.ValidationError({'business_license': 'Business license is required.'})
        elif emp_type == 'ngo':
            if not data.get('registration_cert'):
                raise serializers.ValidationError({'registration_cert': 'Registration certificate is required.'})
        elif emp_type in ('shop', 'individual', 'other'):
            if not data.get('national_id_front'):
                raise serializers.ValidationError({'national_id_front': 'National ID front photo is required.'})
            if not data.get('national_id_back'):
                raise serializers.ValidationError({'national_id_back': 'National ID back photo is required.'})
            if not (data.get('national_id_number') or '').strip():
                raise serializers.ValidationError({'national_id_number': 'National ID number is required.'})

        return data

    def create(self, validated_data):
        employer_fields = [
            'employer_type', 'employer_type_other', 'organization_name',
            'business_license', 'tin_certificate', 'registration_cert',
            'national_id_front', 'national_id_back', 'national_id_number',
            'supporting_doc',
        ]
        emp_data = {k: validated_data.pop(k, None) for k in employer_fields}

        try:
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password'],
                role=validated_data.get('role', 'jobseeker'),
                phone=validated_data.get('phone', ''),
                location=validated_data.get('location', ''),
                is_approved=validated_data.get('role', 'jobseeker') != 'employer',
            )
        except DatabaseError:
            raise serializers.ValidationError(
                {'detail': 'Registration failed. Username or email may already exist.'}
            )

        if user.role == 'employer' and emp_data.get('employer_type'):
            EmployerVerification.objects.create(
                user=user,
                employer_type=emp_data.get('employer_type') or '',
                employer_type_other=emp_data.get('employer_type_other') or '',
                organization_name=emp_data.get('organization_name') or '',
                business_license=emp_data.get('business_license'),
                tin_certificate=emp_data.get('tin_certificate'),
                registration_cert=emp_data.get('registration_cert'),
                national_id_front=emp_data.get('national_id_front'),
                national_id_back=emp_data.get('national_id_back'),
                national_id_number=emp_data.get('national_id_number') or '',
                supporting_doc=emp_data.get('supporting_doc'),
            )

        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'phone', 'location', 'bio',
                  'profile_photo', 'preferred_language', 'is_approved', 'is_suspended']
        read_only_fields = ['id', 'username', 'email']
