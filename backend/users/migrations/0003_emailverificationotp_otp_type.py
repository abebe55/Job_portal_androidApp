from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_email_verification'),
    ]

    operations = [
        migrations.AddField(
            model_name='emailverificationotp',
            name='otp_type',
            field=models.CharField(
                choices=[
                    ('email_verification', 'Email Verification'),
                    ('password_reset', 'Password Reset'),
                ],
                default='email_verification',
                max_length=30,
            ),
        ),
    ]
