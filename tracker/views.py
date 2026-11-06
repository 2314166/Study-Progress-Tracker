from datetime import timedelta

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.db.models import Sum
from django.utils import timezone
from django.views.decorators.http import require_POST
from .forms import StudySessionForm
from .models import Goal, UserProfile, StudySession, Topic


def get_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


@login_required
def dashboard(request):
    profile = get_profile(request.user)
    role = profile.role

    if role == 'mentor':
        goals = Goal.objects.all()
        sessions = StudySession.objects.all()
    else:
        goals = Goal.objects.filter(learner=request.user)
        sessions = StudySession.objects.filter(learner=request.user)

    if request.method == 'POST':
        form = StudySessionForm(request.POST, user=request.user, role=role)
        if form.is_valid():
            form.save()
            messages.success(request, "Study session logged.")
            return redirect('dashboard')
    else:
        form = StudySessionForm(user=request.user, role=role)

    goals = list(goals.prefetch_related('topics'))
    for goal in goals:
        rows = []
        for topic in goal.topics.all():
            minutes = topic.sessions.aggregate(m=Sum('minutes'))['m'] or 0
            rows.append({'title': topic.title, 'minutes': minutes})
        biggest = max([r['minutes'] for r in rows], default=0) or 1
        for r in rows:
            r['pct'] = round(r['minutes'] * 100 / biggest)
        goal.chart = rows
        goal.total_minutes = sum(r['minutes'] for r in rows)

    today = timezone.localdate()
    weekly = []
    for w in range(5, -1, -1):
        end = today - timedelta(days=w * 7)
        start = end - timedelta(days=6)
        minutes = sessions.filter(date__range=(start, end)).aggregate(m=Sum('minutes'))['m'] or 0
        weekly.append({'label': start.strftime('%d %b'), 'minutes': minutes})
    biggest = max([x['minutes'] for x in weekly], default=0) or 1
    for x in weekly:
        x['pct'] = round(x['minutes'] * 100 / biggest)

    total_minutes = sessions.aggregate(total=Sum('minutes'))['total'] or 0
    recent_sessions = sessions.select_related('topic', 'learner').order_by('-date', '-id')[:5]

    return render(request, 'tracker/dashboard.html', {
        'goals': goals,
        'role': role,
        'form': form,
        'weekly': weekly,
        'total_minutes': total_minutes,
        'total_hours': round(total_minutes / 60, 1),
        'recent_sessions': recent_sessions,
    })


@login_required
@require_POST
def toggle_topic(request, topic_id):
    topic = get_object_or_404(Topic, pk=topic_id)
    role = get_profile(request.user).role

    if role != 'mentor' and topic.goal.learner_id != request.user.id:
        raise PermissionDenied

    if not topic.completed and not topic.is_unlocked:
        missing = ", ".join(t.title for t in topic.missing_prerequisites())
        messages.error(request, f"Locked. Complete first: {missing}")
    else:
        topic.completed = not topic.completed
        topic.save()
    return redirect('dashboard')