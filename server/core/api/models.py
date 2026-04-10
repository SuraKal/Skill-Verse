from django.db import models
from django.conf import settings
import uuid


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
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

    def __str__(self):
        return self.user.username


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    def __str__(self):
        return self.name


class Course(models.Model):
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced')
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published')
    ]

    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()

    # Instructor
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='instructed_courses'
    )

    # Optional organization owner
    organization = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='organization_courses'
    )

    categories = models.ManyToManyField('Category', blank=True)
    tags = models.ManyToManyField('Tag', blank=True)

    difficulty = models.CharField(
        max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='draft')

    enrollment_count = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)

    cover_image = models.ImageField(
        upload_to='course_covers/', blank=True, null=True)

    is_featured = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['difficulty']),
        ]

    def __str__(self):
        return self.title

    @property
    def owner(self):
        return self.organization if self.organization else self.instructor


class CourseMaterial(models.Model):
    MATERIAL_TYPE_CHOICES = [
        ('video', 'Video'),
        ('document', 'Document')
    ]

    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="materials")
    title = models.CharField(max_length=255)
    material_type = models.CharField(
        max_length=20, choices=MATERIAL_TYPE_CHOICES)

    content = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to='materials/', blank=True, null=True)

    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Enrollment(models.Model):
    STATUS_CHOICES = [
        ('enrolled', 'Enrolled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('dropped', 'Dropped')
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="enrollments")

    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_date = models.DateTimeField(blank=True, null=True)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='enrolled')

    progress = models.PositiveIntegerField(default=0)  # 0–100%

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'course'], name='unique_enrollment')
        ]

    def __str__(self):
        return f"{self.user.username} enrolled in {self.course.title}"


class Assessment(models.Model):
    STATUS_CHOICES = [('draft', 'Draft'), ('published', 'Published')]

    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="assessments")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    time_limit_minutes = models.PositiveIntegerField(default=60)
    passing_score_percentage = models.FloatField(default=70.0)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='draft')

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Question(models.Model):
    assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE, related_name="questions")

    question_text = models.TextField()

    option_a = models.TextField()
    option_b = models.TextField()
    option_c = models.TextField()
    option_d = models.TextField()

    correct_option = models.CharField(
        max_length=1,
        choices=[
            ('A', 'Option A'),
            ('B', 'Option B'),
            ('C', 'Option C'),
            ('D', 'Option D')
        ]
    )

    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.assessment.title} - Question {self.order}"


class AssessmentResult(models.Model):
    STATUS_CHOICES = [('passed', 'Passed'), ('failed', 'Failed')]

    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name="results")
    assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE, related_name="results")

    score = models.FloatField(default=0.0)
    completed_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='failed')

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['enrollment', 'assessment'], name='unique_assessment_result')
        ]

    def __str__(self):
        return f"{self.enrollment.user.username} - {self.assessment.title} - Score: {self.score}"


class Certificate(models.Model):
    STATUS_CHOICES = [('valid', 'Valid'), ('revoked', 'Revoked')]

    enrollment = models.OneToOneField(
        Enrollment, on_delete=models.CASCADE, related_name="certificate")

    certificate_url = models.URLField()
    verification_code = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='valid')

    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Certificate for {self.enrollment.user.username} - {self.enrollment.course.title}"


class Review(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ]

    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="reviews")

    rating = models.IntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True, null=True)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'course'], name='unique_review')
        ]

    def __str__(self):
        return f"{self.user.username} rated {self.course.title} - {self.rating} stars"


class Comment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments")
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="comments")

    content = models.TextField()

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending')

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} commented on {self.course.title}"

class Announcement(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published')
    ]
    title = models.CharField(max_length=255)
    content = models.TextField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.course.title} - {self.title}"

