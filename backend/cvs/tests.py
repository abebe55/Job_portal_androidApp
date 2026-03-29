from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from .models import CV


class CVTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seeker = User.objects.create_user(
            username='cv_seeker', email='cv@test.com',
            password='pass1234', role='jobseeker'
        )
        self.seeker2 = User.objects.create_user(
            username='cv_seeker2', email='cv2@test.com',
            password='pass1234', role='jobseeker'
        )

    def test_get_cv_auto_creates_blank_cv(self):
        """TC-C01: GET /cvs/ auto-creates a blank CV for the user if none exists"""
        self.client.force_authenticate(user=self.seeker)
        res = self.client.get(reverse('cv'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(CV.objects.filter(user=self.seeker).count(), 1)

    def test_get_cv_twice_does_not_duplicate(self):
        """TC-C02: Calling GET /cvs/ multiple times creates only one CV (OneToOne)"""
        self.client.force_authenticate(user=self.seeker)
        self.client.get(reverse('cv'))
        self.client.get(reverse('cv'))
        self.assertEqual(CV.objects.filter(user=self.seeker).count(), 1)

    def test_cv_requires_authentication(self):
        """TC-C03: CV endpoint returns 401 without authentication"""
        res = self.client.get(reverse('cv'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_personal_info(self):
        """TC-C04: User can update personal info fields on their CV"""
        self.client.force_authenticate(user=self.seeker)
        self.client.get(reverse('cv'))  # create it first
        res = self.client.patch(reverse('cv'), {
            'full_name': 'Abebe Kebede',
            'first_name': 'Abebe',
            'father_name': 'Kebede',
            'email': 'abebe@test.com',
            'phone': '0911111111',
            'region': 'Addis Ababa',
            'city': 'Addis Ababa',
            'nationality': 'Ethiopian',
            'gender': 'Male',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['full_name'], 'Abebe Kebede')
        self.assertEqual(res.data['phone'], '0911111111')
        self.assertEqual(res.data['nationality'], 'Ethiopian')

    def test_update_education_fields(self):
        """TC-C05: User can update education level and field of study"""
        self.client.force_authenticate(user=self.seeker)
        self.client.get(reverse('cv'))
        res = self.client.patch(reverse('cv'), {
            'education_level': 'bachelor',
            'field_of_study': 'software_eng',
            'institution_name': 'Addis Ababa University',
            'graduation_year': '2022',
            'cgpa': '3.75',
            'cgpa_scale': '4.0',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['education_level'], 'bachelor')
        self.assertEqual(res.data['institution_name'], 'Addis Ababa University')

    def test_update_skills(self):
        """TC-C06: User can update technical and soft skills"""
        self.client.force_authenticate(user=self.seeker)
        self.client.get(reverse('cv'))
        res = self.client.patch(reverse('cv'), {
            'technical_skills': 'Python, Django, React Native',
            'soft_skills': 'Communication, Teamwork',
            'computer_skills': 'MS Office, Git',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['technical_skills'], 'Python, Django, React Native')

    def test_update_language_proficiency(self):
        """TC-C07: User can set Amharic and English proficiency levels"""
        self.client.force_authenticate(user=self.seeker)
        self.client.get(reverse('cv'))
        res = self.client.patch(reverse('cv'), {
            'amharic_level': 'native',
            'english_level': 'fluent',
            'other_languages': 'French (basic)',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['amharic_level'], 'native')
        self.assertEqual(res.data['english_level'], 'fluent')

    def test_update_work_experience(self):
        """TC-C08: User can update work experience fields"""
        self.client.force_authenticate(user=self.seeker)
        self.client.get(reverse('cv'))
        res = self.client.patch(reverse('cv'), {
            'has_experience': True,
            'experience_years': '3',
            'experience_detail': 'Worked as Django developer at XYZ company',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['has_experience'])
        self.assertEqual(res.data['experience_years'], '3')

    def test_cv_is_complete_when_key_fields_filled(self):
        """TC-C09: CV is_complete becomes True when full_name, phone, education_level are set"""
        self.client.force_authenticate(user=self.seeker)
        self.client.get(reverse('cv'))
        self.client.patch(reverse('cv'), {
            'full_name': 'Tigist Alemu',
            'phone': '0922222222',
            'education_level': 'diploma',
        })
        cv = CV.objects.get(user=self.seeker)
        self.assertTrue(cv.is_complete)

    def test_upload_cv_document(self):
        """TC-C10: User can upload a transcript file to their CV"""
        self.client.force_authenticate(user=self.seeker)
        self.client.get(reverse('cv'))
        fake_file = SimpleUploadedFile(
            'transcript.pdf', b'%PDF-1.4 fake content', content_type='application/pdf'
        )
        res = self.client.patch(reverse('cv'), {'transcript_file': fake_file}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res.data['transcript_file'])

    def test_each_user_has_separate_cv(self):
        """TC-C11: Two different users each get their own separate CV"""
        self.client.force_authenticate(user=self.seeker)
        self.client.patch(reverse('cv'), {'full_name': 'User One'})
        self.client.force_authenticate(user=self.seeker2)
        self.client.patch(reverse('cv'), {'full_name': 'User Two'})
        cv1 = CV.objects.get(user=self.seeker)
        cv2 = CV.objects.get(user=self.seeker2)
        self.assertNotEqual(cv1.full_name, cv2.full_name)
        self.assertEqual(CV.objects.count(), 2)


class CVExtendedFieldTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seeker = User.objects.create_user(
            username='cv_ext', email='cv_ext@test.com',
            password='pass1234', role='jobseeker'
        )
        self.client.force_authenticate(user=self.seeker)
        self.client.get(reverse('cv'))  # auto-create CV

    def test_update_exit_exam_and_thesis(self):
        """TC-C12: User can update exit_exam_score, exit_exam_year, thesis_title"""
        res = self.client.patch(reverse('cv'), {
            'exit_exam_score': '85',
            'exit_exam_year': '2022',
            'thesis_title': 'Machine Learning in Ethiopian Agriculture',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['exit_exam_score'], '85')
        self.assertEqual(res.data['thesis_title'], 'Machine Learning in Ethiopian Agriculture')

    def test_update_driving_license(self):
        """TC-C13: User can set driving_license=True and driving_license_type"""
        res = self.client.patch(reverse('cv'), {
            'driving_license': True,
            'driving_license_type': 'B',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['driving_license'])
        self.assertEqual(res.data['driving_license_type'], 'B')

    def test_update_experience_entries_json(self):
        """TC-C14: User can update experience_entries as JSON string"""
        import json
        entries = json.dumps([
            {'company': 'ABC Ltd', 'role': 'Developer', 'years': '2', 'description': 'Built APIs'}
        ])
        res = self.client.patch(reverse('cv'), {'experience_entries': entries})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('ABC Ltd', res.data['experience_entries'])

    def test_update_education_entries_json(self):
        """TC-C15: User can update education_entries as JSON string"""
        import json
        entries = json.dumps([
            {'level': 'bachelor', 'institution': 'AAU', 'year': '2022', 'cgpa': '3.8'}
        ])
        res = self.client.patch(reverse('cv'), {'education_entries': entries})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('AAU', res.data['education_entries'])

    def test_upload_degree_certificate(self):
        """TC-C16: User can upload degree_certificate file"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        fake_file = SimpleUploadedFile('degree.pdf', b'%PDF-1.4 degree', content_type='application/pdf')
        res = self.client.patch(reverse('cv'), {'degree_certificate': fake_file}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res.data['degree_certificate'])

    def test_upload_national_id_file(self):
        """TC-C17: User can upload national_id file"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        fake_file = SimpleUploadedFile('id.pdf', b'%PDF-1.4 id', content_type='application/pdf')
        res = self.client.patch(reverse('cv'), {'national_id': fake_file}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res.data['national_id'])

    def test_cv_is_complete_false_when_fields_missing(self):
        """TC-C18: CV is_complete stays False when full_name or phone or education_level missing"""
        # Only set full_name — phone and education_level missing
        self.client.patch(reverse('cv'), {'full_name': 'Partial User'})
        cv = CV.objects.get(user=self.seeker)
        self.assertFalse(cv.is_complete)

    def test_update_references(self):
        """TC-C19: User can set reference_1 and reference_2"""
        res = self.client.patch(reverse('cv'), {
            'reference_1': 'Dr. Abebe Girma, AAU, +251911000001',
            'reference_2': 'Ato Kebede Alemu, Manager, +251922000002',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('Dr. Abebe Girma', res.data['reference_1'])
