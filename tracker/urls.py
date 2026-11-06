from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('topic/<int:topic_id>/toggle/', views.toggle_topic, name='toggle_topic'),
]