from datetime import timedelta

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import (
    Goal, Topic, StudySession, TrackerSettings, UserProfile, has_path,
)


def make_user(name, role='learner'):
    user = User.objects.create_user(username=name, password='pass12345')
    UserProfile.objects.create(user=user, role=role)
    return user


class UnlockRuleTests(TestCase):
    def setUp(self):
        self.learner = make_user('l1')
        self.goal = Goal.objects.create(learner=self.learner, title='Python')
        self.a = Topic.objects.create(goal=self.goal, title='A')
        self.b = Topic.objects.create(goal=self.goal, title='B')
        self.b.prerequisites.add(self.a)

    def test_topic_without_prerequisites_is_unlocked(self):
        self.assertTrue(self.a.is_unlocked)

    def test_topic_locked_when_prerequisite_incomplete(self):
        self.assertFalse(self.b.is_unlocked)

    def test_missing_prerequisites_are_listed(self):
        self.assertEqual(list(self.b.missing_prerequisites()), [self.a])

    def test_topic_unlocks_when_prerequisite_complete(self):
        self.a.completed = True
        self.a.save()
        self.assertTrue(self.b.is_unlocked)

    def test_reopened_topic_relocks_dependents(self):
        self.a.completed = True
        self.a.save()
        self.assertTrue(self.b.is_unlocked)
        self.a.completed = False
        self.a.save()
        self.assertFalse(self.b.is_unlocked)

    def test_goal_progress_percent(self):
        self.assertEqual(self.goal.progress, 0)
        self.a.completed = True
        self.a.save()
        self.assertEqual(self.goal.progress, 50)


class PrerequisiteLoopTests(TestCase):
    def setUp(self):
        learner = make_user('l1')
        goal = Goal.objects.create(learner=learner, title='G')
        self.a = Topic.objects.create(goal=goal, title='A')
        self.b = Topic.objects.create(goal=goal, title='B')
        self.c = Topic.objects.create(goal=goal, title='C')
        self.b.prerequisites.add(self.a)   # B needs A
        self.c.prerequisites.add(self.b)   # C needs B

    def test_has_path_detects_indirect_dependency(self):
        # C depends on A (through B), so A needing C would be a loop
        self.assertTrue(has_path(self.c, self.a))

    def test_has_path_false_when_no_dependency(self):
        self.assertFalse(has_path(self.a, self.c))


class SessionValidationTests(TestCase):
    def setUp(self):
        self.learner = make_user('l1')
        goal = Goal.objects.create(learner=self.learner, title='G')
        self.topic = Topic.objects.create(goal=goal, title='T')

    def make_session(self, minutes, date=None):
        return StudySession(
            learner=self.learner, topic=self.topic, minutes=minutes,
            date=date or timezone.localdate(),
        )

    def test_minutes_below_default_minimum_rejected(self):
        with self.assertRaises(ValidationError):
            self.make_session(2).full_clean()

    def test_minutes_above_default_maximum_rejected(self):
        with self.assertRaises(ValidationError):
            self.make_session(481).full_clean()

    def test_valid_minutes_accepted(self):
        self.make_session(30).full_clean()

    def test_future_date_rejected(self):
        tomorrow = timezone.localdate() + timedelta(days=1)
        with self.assertRaises(ValidationError):
            self.make_session(30, tomorrow).full_clean()

    def test_changing_admin_setting_changes_behavior(self):
        # 7 minutes is valid by default (min 5)...
        self.make_session(7).full_clean()
        # ...but invalid after the admin raises the minimum to 10
        TrackerSettings.objects.create(min_minutes=10, max_minutes=100)
        with self.assertRaises(ValidationError):
            self.make_session(7).full_clean()


class RoleEnforcementTests(TestCase):
    def setUp(self):
        self.learner1 = make_user('l1')
        self.learner2 = make_user('l2')
        self.mentor = make_user('m1', role='mentor')
        self.goal1 = Goal.objects.create(learner=self.learner1, title='G1')
        self.goal2 = Goal.objects.create(learner=self.learner2, title='G2')
        self.topic1 = Topic.objects.create(goal=self.goal1, title='T1')
        self.topic2 = Topic.objects.create(goal=self.goal2, title='T2')

    def test_dashboard_requires_login(self):
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, 302)

    def test_learner_sees_only_own_goals(self):
        self.client.login(username='l1', password='pass12345')
        response = self.client.get(reverse('dashboard'))
        self.assertContains(response, 'G1')
        self.assertNotContains(response, 'G2')

    def test_mentor_sees_all_goals(self):
        self.client.login(username='m1', password='pass12345')
        response = self.client.get(reverse('dashboard'))
        self.assertContains(response, 'G1')
        self.assertContains(response, 'G2')

    def test_learner_cannot_edit_other_learners_topic(self):
        self.client.login(username='l1', password='pass12345')
        response = self.client.post(reverse('toggle_topic', args=[self.topic2.id]))
        self.assertEqual(response.status_code, 403)
        self.topic2.refresh_from_db()
        self.assertFalse(self.topic2.completed)

    def test_learner_can_edit_own_topic(self):
        self.client.login(username='l1', password='pass12345')
        self.client.post(reverse('toggle_topic', args=[self.topic1.id]))
        self.topic1.refresh_from_db()
        self.assertTrue(self.topic1.completed)

    def test_mentor_can_edit_any_topic(self):
        self.client.login(username='m1', password='pass12345')
        self.client.post(reverse('toggle_topic', args=[self.topic2.id]))
        self.topic2.refresh_from_db()
        self.assertTrue(self.topic2.completed)