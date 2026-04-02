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

# What if for institutions creating courses
class Course(models.Model):
    DIFFICULTY_CHOICES = [('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')]
    STATUS_CHOICES = [('draft', 'Draft'), ('published', 'Published')]
    uuid = models.UUIDField(unique=True, editable=False, null=True, blank=True) 
    title = models.CharField(max_length=255)
    description = models.TextField()
    # ✅ Instructor (required)
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='instructed_courses'
    )

    # ✅ Organization (optional owner)
    organization = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='organization_courses'
    )
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    difficulty = models.CharField(max_length=50, choices=DIFFICULTY_CHOICES, default='beginner')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    enrollment_count = models.PositiveIntegerField(default=0)
    rating = models.FloatField(default=0.0)
    cover_image = models.ImageField(upload_to='course_covers/', blank=True, null=True)
    tags = models.ManyToManyField('Tag', blank=True)
    is_featured = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self) -> str:
        return self.title
    
    # ✅ Optional helper
    @property
    def owner(self):
        return self.organization if self.organization else self.instructor
# # Courses taught by instructor
# user.instructed_courses.all()

# # Courses owned by organization
# user.organization_courses.all()

# # Get owner
# course.owner

class CourseMaterial(models.Model):
    MATERIAL_TYPE_CHOICES = [('video', 'Video'), ('document', 'Document'), ('quiz', 'Quiz')]
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPE_CHOICES)
    content = models.TextField(blank=True, null=True)
    file_url = models.URLField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return f"{self.course.title} - {self.title}"


class Enrollment(models.Model):
    STATUS_CHOICES = [('enrolled', 'Enrolled'), ('completed', 'Completed')]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='enrolled')
    progress = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('user', 'course')

    def __str__(self) -> str:
        return f"{self.user.username} enrolled in {self.course.title}"


class Assessment(models.Model):
    STATUS_CHOICES = [('draft', 'Draft'), ('published', 'Published')]
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    time_limit_minutes = models.PositiveIntegerField(default=60)
    passing_score_percentage = models.FloatField(default=70.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    def __str__(self) -> str:
        return f"{self.course.title} - {self.title}"

class question(models.Model):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE)
    question_text = models.TextField()
    option_a = models.TextField()
    option_b = models.TextField()
    option_c = models.TextField()
    option_d = models.TextField()
    correct_option = models.CharField(max_length=1, choices=[('A', 'Option A'), ('B', 'Option B'), ('C', 'Option C'), ('D', 'Option D')])
    order = models.PositiveIntegerField(default=0)
    def __str__(self) -> str:
        return f"{self.assessment.title} - Question {self.order}"


class AssessmentResult(models.Model):
    STATUS_CHOICES = [('passed', 'Passed'), ('failed', 'Failed')]
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE)
    score = models.FloatField(default=0.0)
    completed_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='failed')

    class Meta:
        unique_together = ('enrollment', 'assessment')

    def __str__(self) -> str:
        return f"{self.enrollment.user.username} - {self.assessment.title} - Score: {self.score}"

class Certificate(models.Model):
    STATUS_CHOICES = [('valid', 'Valid'), ('revoked', 'Revoked')]
    issuer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    enrollment = models.OneToOneField(Enrollment, on_delete=models.CASCADE)
    certificate_url = models.URLField()
    verification_code = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='valid')
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Certificate for {self.enrollment.user.username} - {self.enrollment.course.title}"

class Review(models.Model):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'course')

    def __str__(self) -> str:
        return f"{self.user.username} rated {self.course.title} - {self.rating} stars"
    
class Comment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.user.username} commented on {self.course.title}"
    

