import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_course_outline_materials'),
    ]

    operations = [
        migrations.CreateModel(
            name='SkillSwapProfile',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('teach_skills', models.TextField(blank=True)),
                ('learn_skills', models.TextField(blank=True)),
                ('summary', models.TextField(blank=True)),
                (
                    'user',
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='skill_swap_profile',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'ordering': ['user__first_name', 'user__email'],
            },
        ),
        migrations.CreateModel(
            name='SkillMatch',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('matched_skill', models.CharField(max_length=120)),
                ('teaching_text', models.CharField(blank=True, max_length=255)),
                ('learning_text', models.CharField(blank=True, max_length=255)),
                ('match_score', models.PositiveIntegerField(default=100)),
                ('is_active', models.BooleanField(default=True)),
                (
                    'learning_user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='skill_swap_learning_matches',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'teaching_user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='skill_swap_teaching_matches',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'ordering': ['-updated_at', 'matched_skill'],
            },
        ),
        migrations.CreateModel(
            name='SkillChatThread',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('last_message_at', models.DateTimeField(blank=True, null=True)),
                (
                    'match',
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='thread',
                        to='api.skillmatch',
                    ),
                ),
            ],
            options={
                'ordering': ['-last_message_at', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='SkillChatMessage',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('body', models.TextField()),
                (
                    'sender',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='skill_swap_messages',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'thread',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='messages',
                        to='api.skillchatthread',
                    ),
                ),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='skillmatch',
            constraint=models.UniqueConstraint(
                fields=('teaching_user', 'learning_user', 'matched_skill'),
                name='unique_skill_swap_match',
            ),
        ),
    ]
