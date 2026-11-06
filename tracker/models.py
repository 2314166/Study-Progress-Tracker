from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone


# 1. Learner and Mentor Roles
class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('learner', 'Learner'),
        ('mentor', 'Mentor'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='learner')

    def __str__(self):
        return f"{self.user.username} - {self.role}"


# 2. Study Goals
class Goal(models.Model):
    learner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_goals')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    @property
    def progress(self):
        total = self.topics.count()
        if total == 0:
            return 0
        completed = self.topics.filter(completed=True).count()
        return round(completed * 100 / total)


# 3. Study Topics
class Topic(models.Model):
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='topics')
    title = models.CharField(max_length=200)
    prerequisites = models.ManyToManyField(
        'self', blank=True, symmetrical=False,
        related_name='dependent_topics'
    )
    completed = models.BooleanField(default=False)

    def missing_prerequisites(self):
        return self.prerequisites.filter(completed=False)

    @property
    def is_unlocked(self):
        return not self.missing_prerequisites().exists()

    def __str__(self):
        return self.title


def has_path(start, target):
    """True if target is reachable from start by following prerequisites."""
    seen = set()
    stack = [start]
    while stack:
        current = stack.pop()
        if current.pk == target.pk:
            return True
        if current.pk in seen:
            continue
        seen.add(current.pk)
        stack.extend(current.prerequisites.all())
    return False


# 4. Admin Settings
class TrackerSettings(models.Model):
    min_minutes = models.PositiveIntegerField(default=5)
    max_minutes = models.PositiveIntegerField(default=480)
    max_prerequisites = models.PositiveIntegerField(default=5)

    class Meta:
        verbose_name_plural = "Tracker settings"

    def clean(self):
        if self.min_minutes < 1:
            raise ValidationError("Minimum must be at least 1.")
        if self.max_minutes < self.min_minutes:
            raise ValidationError("Maximum must be greater than minimum.")

    def __str__(self):
        return "Study Tracker Settings"


# 5. Study Session
class StudySession(models.Model):
    learner = models.ForeignKey(User, on_delete=models.CASCADE)
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='sessions')
    date = models.DateField(default=timezone.localdate)
    minutes = models.PositiveIntegerField()
    note = models.TextField(blank=True)

    def clean(self):
        errors = {}

        if self.date and self.date > timezone.localdate():
            errors['date'] = "Future dates are not allowed."

        settings = TrackerSettings.objects.first()
        minimum = settings.min_minutes if settings else 5
        maximum = settings.max_minutes if settings else 480

        if self.minutes is not None and not minimum <= self.minutes <= maximum:
            errors['minutes'] = f"Minutes must be between {minimum} and {maximum}."

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.topic.title} - {self.minutes} minutes"