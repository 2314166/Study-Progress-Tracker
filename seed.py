import os
import random
from datetime import timedelta

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from tracker.models import Goal, StudySession

random.seed(42)

if StudySession.objects.exists():
    print("Seed data already exists. Skipping session creation.")
    exit()

goals = list(Goal.objects.order_by('pk'))
allowed = {}

for g_index, goal in enumerate(goals):
    topics = list(goal.topics.order_by('pk'))
    done_count = max(len(topics) - (g_index + 1), 0)
    for i, topic in enumerate(topics):
        # each topic needs the previous one
        if i > 0:
            topic.prerequisites.set([topics[i - 1]])
        else:
            topic.prerequisites.clear()
        topic.completed = i < done_count
        topic.save()
    allowed[goal.pk] = topics[:done_count + 1]  # completed + next unlocked

today = timezone.localdate()
for i in range(30):
    goal = goals[i % len(goals)]
    topic = random.choice(allowed[goal.pk])
    days_ago = min(41, int(i * 42 / 30) + random.randint(0, 2))
    StudySession.objects.create(
        learner=goal.learner,
        topic=topic,
        date=today - timedelta(days=days_ago),
        minutes=random.choice(range(20, 95, 5)),
        note=f"Studied {topic.title}",
    )

print("Goals:", Goal.objects.count())
print("Sessions:", StudySession.objects.count())