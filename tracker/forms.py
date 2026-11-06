from django import forms
from .models import StudySession, Topic


class StudySessionForm(forms.ModelForm):
    class Meta:
        model = StudySession
        fields = ['date', 'topic', 'minutes', 'note']
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date'}),
            'note': forms.Textarea(attrs={'rows': 2}),
        }

    def __init__(self, *args, user=None, role='learner', **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user
        if role == 'mentor':
            self.fields['topic'].queryset = Topic.objects.all()
        else:
            self.fields['topic'].queryset = Topic.objects.filter(goal__learner=user)

    def clean_topic(self):
        topic = self.cleaned_data['topic']
        if not topic.is_unlocked:
            missing = ", ".join(t.title for t in topic.missing_prerequisites())
            raise forms.ValidationError(f"Topic is locked. Complete first: {missing}")
        return topic

    def clean(self):
        # runs model validation (future date, min/max minutes)
        self.instance.learner = self.user
        return super().clean()