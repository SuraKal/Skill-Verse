import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_skill_swap'),
    ]

    operations = [
        migrations.CreateModel(
            name='Event',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('cover_image', models.URLField(blank=True, null=True)),
                ('location', models.CharField(max_length=255)),
                ('start_datetime', models.DateTimeField()),
                ('end_datetime', models.DateTimeField()),
                ('timezone', models.CharField(max_length=64)),
                ('visibility', models.CharField(choices=[
                    ('private', 'Private'),
                    ('org_private', 'Organization Private'),
                    ('public', 'Public'),
                ], max_length=20)),
                ('status', models.CharField(choices=[
                    ('draft', 'Draft'),
                    ('pending_approval', 'Pending Approval'),
                    ('active', 'Active'),
                    ('ongoing', 'Ongoing'),
                    ('completed', 'Completed'),
                    ('archived', 'Archived'),
                    ('rejected', 'Rejected'),
                ], default='draft', max_length=30)),
                ('rejection_note', models.TextField(blank=True, null=True)),
                (
                    'created_by',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='created_events',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'organization',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='events',
                        to='api.organization',
                    ),
                ),
            ],
            options={
                'ordering': ['start_datetime', 'created_at'],
            },
        ),
        migrations.CreateModel(
            name='EventParticipant',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('email', models.EmailField(max_length=254)),
                ('event_role', models.CharField(choices=[
                    ('initiator', 'Initiator'),
                    ('admin', 'Admin'),
                    ('attendee', 'Attendee'),
                    ('speaker', 'Speaker'),
                    ('volunteer', 'Volunteer'),
                    ('guest', 'Guest'),
                ], max_length=20)),
                ('invite_status', models.CharField(choices=[
                    ('pending', 'Pending'),
                    ('accepted', 'Accepted'),
                    ('declined', 'Declined'),
                ], default='pending', max_length=20)),
                ('invite_origin', models.CharField(choices=[
                    ('invited', 'Invited'),
                    ('self_registered', 'Self Registered'),
                ], default='invited', max_length=20)),
                ('invited_at', models.DateTimeField(auto_now_add=True)),
                ('responded_at', models.DateTimeField(blank=True, null=True)),
                (
                    'event',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='participants',
                        to='api.event',
                    ),
                ),
                (
                    'invited_by',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='event_participant_invites_sent',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'user',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='event_participations',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'ordering': ['-invited_at', 'email'],
            },
        ),
        migrations.CreateModel(
            name='EventCoOrganizer',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('invite_email', models.EmailField(max_length=254)),
                ('status', models.CharField(choices=[
                    ('pending', 'Pending'),
                    ('accepted', 'Accepted'),
                    ('declined', 'Declined'),
                ], default='pending', max_length=20)),
                ('invited_at', models.DateTimeField(auto_now_add=True)),
                ('responded_at', models.DateTimeField(blank=True, null=True)),
                (
                    'event',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='co_organizers',
                        to='api.event',
                    ),
                ),
                (
                    'invited_by_user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='sent_event_co_organizer_invites',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'organization',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='event_co_organizer_invitations',
                        to='api.organization',
                    ),
                ),
            ],
            options={
                'ordering': ['-invited_at', 'organization__name'],
            },
        ),
        migrations.CreateModel(
            name='InvitationToken',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('token', models.CharField(db_index=True, max_length=255, unique=True)),
                ('expires_at', models.DateTimeField()),
                ('used_at', models.DateTimeField(blank=True, null=True)),
                ('revoked', models.BooleanField(default=False)),
                (
                    'event_co_organizer',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='tokens',
                        to='api.eventcoorganizer',
                    ),
                ),
                (
                    'event_participant',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='tokens',
                        to='api.eventparticipant',
                    ),
                ),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
