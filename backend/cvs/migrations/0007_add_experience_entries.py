from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cvs', '0006_add_skill_specialization'),
    ]

    operations = [
        migrations.AddField(
            model_name='cv',
            name='experience_entries',
            field=models.TextField(blank=True, default='[]', verbose_name='Experience entries (JSON)'),
        ),
    ]
