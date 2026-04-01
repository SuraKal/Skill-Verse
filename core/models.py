from django.db import models
from django.conf import settings

class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uuid = models.UUIDField(unique=True, editable=False, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    verification_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('verified', 'Verified'),
            ('rejected', 'Rejected')
        ],
        default='pending'
    )
    def __str__(self) -> str:
        return self.user.username

# Course	title, description, instructor_email, instructor_name, category, difficulty, status, enrollment_count, rating, cover_image, tags

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    uuid = models.UUIDField(unique=True, editable=False, null=True, blank=True)
    def __str__(self) -> str:
        return self.name

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    uuid = models.UUIDField(unique=True, editable=False, null=True, blank=True)
    def __str__(self) -> str:
        return self.name
class Course(models.Model):
    DIFFICULTY_CHOICES = [('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')]
    STATUS_CHOICES = [('draft', 'Draft'), ('published', 'Published')]
    uuid = models.UUIDField(unique=True, editable=False, null=True, blank=True) 
    title = models.CharField(max_length=255)
    description = models.TextField()
    instructor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    difficulty = models.CharField(max_length=50, choices=DIFFICULTY_CHOICES, default='beginner')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    enrollment_count = models.PositiveIntegerField(default=0)
    rating = models.FloatField(default=0.0)
    cover_image = models.ImageField(upload_to='course_covers/', blank=True, null=True)
    tags = models.ManyToManyField('Tag', blank=True)

    def __str__(self) -> str:
        return self.title