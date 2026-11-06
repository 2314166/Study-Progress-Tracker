from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError
from .models import UserProfile, Goal, Topic, StudySession, TrackerSettings, has_path


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role')
    list_filter = ('role',)


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('title', 'learner', 'created_at')
    search_fields = ('title', 'learner__username')


class TopicAdminForm(forms.ModelForm):
    class Meta:
        model = Topic
        fields = '__all__'

    def clean_prerequisites(self):
        prereqs = self.cleaned_data['prerequisites']
        topic = self.instance

        config = TrackerSettings.objects.first()
        max_allowed = config.max_prerequisites if config else 5
        if len(prereqs) > max_allowed:
            raise ValidationError(f"A topic can have at most {max_allowed} prerequisites.")

        if topic.pk:
            for p in prereqs:
                if p.pk == topic.pk:
                    raise ValidationError("A topic cannot be its own prerequisite.")
                if has_path(p, topic):
                    raise ValidationError(f"'{p.title}' already depends on this topic. That creates a loop.")
        return prereqs


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    form = TopicAdminForm
    list_display = ('title', 'goal', 'completed')
    list_filter = ('completed',)
    filter_horizontal = ('prerequisites',)


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    list_display = ('learner', 'topic', 'date', 'minutes')
    list_filter = ('date',)


@admin.register(TrackerSettings)
class TrackerSettingsAdmin(admin.ModelAdmin):
    list_display = ('min_minutes', 'max_minutes', 'max_prerequisites')