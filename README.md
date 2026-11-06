# Study Progress Tracker

A Django app where learners track study goals and topics. A topic unlocks only when all its prerequisites are complete.

## Setup

    python -m venv venv
    venv\Scripts\activate
    pip install django
    python manage.py migrate
    python manage.py createsuperuser
    python manage.py runserver

Open http://127.0.0.1:8000/ and log in.

## Roles

- Learner: sees and edits only their own goals, topics and sessions.
- Mentor: sees all learners' goals and acts as admin for configuration.

Roles are enforced on the server. Editing another learner's topic returns 403.

## Architecture

- Django, SQLite, server-rendered templates
- tracker/models.py: data model and business rules
- tracker/views.py: dashboard, session logging, topic complete/reopen
- tracker/forms.py: session form (locked topic check, minutes/date validation)
- tracker/admin.py: admin config, prerequisite validation (self and loop rejected)

## Data model

- UserProfile (user, role)
- Goal (learner, title, description)
- Topic (goal, title, prerequisites, completed)
- StudySession (learner, topic, date, minutes, note)
- TrackerSettings (min_minutes, max_minutes, max_prerequisites), editable in admin

## Business rules

- A topic is locked until all prerequisites are complete; missing ones are shown.
- Reopening a topic re-locks its dependents.
- Session minutes must be within the configured min/max (default 5-480), and the date cannot be in the future.
- A topic cannot be its own prerequisite or create a loop. Max prerequisites is configurable.

## Run the tests

    python manage.py test

19 automated tests cover unlock rules, re-locking, loops, validation, config changes and role enforcement.
## Seed data

    python seed.py

Creates 30 study sessions over 6 weeks and sets prerequisite chains for the 3 goals / 12 topics.

## Features

- Progress per goal: percent complete, total minutes, per-topic chart
- Weekly minutes chart for the last 6 weeks
- Mark complete / Reopen topics (reopening re-locks dependents)