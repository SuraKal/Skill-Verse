from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CourseSubsection',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('order', models.PositiveIntegerField(default=0)),
                ('course_section', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subsections', to='api.coursephasesection')),
            ],
            options={
                'ordering': ['order', 'created_at'],
            },
        ),
        migrations.CreateModel(
            name='CourseSubsectionVideo',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('embed_code', models.TextField()),
                ('order', models.PositiveIntegerField(default=0)),
                ('subsection', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='videos', to='api.coursesubsection')),
            ],
            options={
                'ordering': ['order', 'created_at'],
            },
        ),
        migrations.CreateModel(
            name='CourseSubsectionNote',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(blank=True, max_length=255)),
                ('file', models.FileField(upload_to='course_notes/')),
                ('order', models.PositiveIntegerField(default=0)),
                ('subsection', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notes', to='api.coursesubsection')),
            ],
            options={
                'ordering': ['order', 'created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='coursesubsection',
            constraint=models.UniqueConstraint(fields=('course_section', 'order'), name='unique_course_subsection_order'),
        ),
        migrations.AddConstraint(
            model_name='coursesubsectionvideo',
            constraint=models.UniqueConstraint(fields=('subsection', 'order'), name='unique_course_subsection_video_order'),
        ),
        migrations.AddConstraint(
            model_name='coursesubsectionnote',
            constraint=models.UniqueConstraint(fields=('subsection', 'order'), name='unique_course_subsection_note_order'),
        ),
    ]
