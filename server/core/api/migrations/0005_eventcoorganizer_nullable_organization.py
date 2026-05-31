from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_event_management'),
    ]

    operations = [
        migrations.AlterField(
            model_name='eventcoorganizer',
            name='organization',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='event_co_organizer_invitations',
                to='api.organization',
            ),
        ),
    ]
