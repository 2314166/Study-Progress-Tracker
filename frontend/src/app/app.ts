
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private api = 'http://localhost:3000';
  private cdr = inject(ChangeDetectorRef);

  token = '';
  user: any = null;
  isRegister = false;
  loading = false;
  message = '';
  error = '';

  authForm = {
    name: '',
    email: 'learner@demo.com',
    password: 'Demo@12345'
  };

  goals: any[] = [];
  topics: any[] = [];
  sessions: any[] = [];
  recommendations: any[] = [];

  selectedGoalId = 0;
  progress: any = null;

  get completedTopicPercentage(): number {
    const total = Number(this.progress?.totalTopics || 0);
    const completed = Number(this.progress?.completedTopics || 0);
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, (completed / total) * 100));
  }

  get remainingTopicPercentage(): number {
    return 100 - this.completedTopicPercentage;
  }

  get remainingTopics(): number {
    const total = Number(this.progress?.totalTopics || 0);
    const completed = Number(this.progress?.completedTopics || 0);
    return Math.max(0, total - completed);
  }

  sessionForm = {
    topicId: 0,
    date: new Date().toISOString().slice(0, 10),
    minutes: 30,
    note: ''
  };

  settings = {
    minMinutes: 5,
    maxMinutes: 480,
    maxPrerequisites: 5
  };

  goalForm = { title: '' };
  topicForm = { title: '' };
  prereqForm = { topicId: 0, prerequisiteId: 0 };

  constructor(private http: HttpClient) {}

  private refresh() {
    this.cdr.detectChanges();
  }

  get headers() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.token}`
      })
    };
  }

  login() {
    this.message = '';
    this.error = '';
    this.loading = true;
    this.refresh();

    const endpoint = this.isRegister ? '/auth/register' : '/auth/login';

    const body = this.isRegister
      ? this.authForm
      : {
          email: this.authForm.email,
          password: this.authForm.password
        };

    this.http.post<any>(this.api + endpoint, body).subscribe({
      next: (response) => {
        if (this.isRegister) {
          this.isRegister = false;
          this.loading = false;
          this.message = 'Registration successful. Please log in.';
          this.refresh();
          return;
        }

        this.token = response.access_token;
        this.user = response.user;
        this.loading = false;

        this.refresh();
        this.loadDashboard();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Login failed. Check your details.';
        this.refresh();
      }
    });
  }

  loadDashboard() {
    this.loadGoals();
    this.loadRecommendations();
    this.loadSessions();

    if (this.user?.role === 'MENTOR') {
      this.http.get<any>(this.api + '/settings', this.headers).subscribe({
        next: (data) => {
          this.settings = data;
          this.refresh();
        },
        error: (err) => this.showError(err)
      });
    }
  }

  loadGoals(selectId?: number) {
    this.http.get<any[]>(this.api + '/goals', this.headers).subscribe({
      next: (data) => {
        this.goals = data || [];
        this.refresh();

        if (this.goals.length > 0) {
          const existingGoal = this.goals.find(
            (goal) => Number(goal.id) === Number(this.selectedGoalId)
          );

          const goalToSelect =
            selectId ?? existingGoal?.id ?? this.goals[0].id;

          this.selectGoal(Number(goalToSelect));
        } else {
          this.selectedGoalId = 0;
          this.topics = [];
          this.progress = null;
          this.refresh();
        }
      },
      error: (err) => this.showError(err)
    });
  }

  selectGoal(goalId: number) {
    const id = Number(goalId);

    if (!id || Number.isNaN(id)) {
      this.error = 'Please select a valid learning goal.';
      this.refresh();
      return;
    }

    this.selectedGoalId = id;
    this.progress = null;
    this.topics = [];
    this.sessionForm.topicId = 0;
    this.error = '';
    this.refresh();

    this.http.get<any>(this.api + `/topics/${id}`, this.headers).subscribe({
      next: (data) => {
        this.topics = Array.isArray(data) ? data : [];
        this.refresh();
      },
      error: (err) => this.showError(err)
    });

    this.http.get<any>(
      this.api + `/sessions/progress/${id}`,
      this.headers
    ).subscribe({
      next: (data) => {
        this.progress = data;
        this.refresh();
      },
      error: (err) => {
        this.progress = null;
        this.showError(err);
      }
    });
  }

  toggleCompletion(topic: any) {
    this.message = '';
    this.error = '';
    this.refresh();

    this.http.patch<any>(
      this.api + `/topics/${topic.id}/completion`,
      { completed: !topic.completed },
      this.headers
    ).subscribe({
      next: (response) => {
        this.message = response.message || 'Topic updated successfully.';
        this.refresh();
        this.selectGoal(this.selectedGoalId);
        this.loadRecommendations();
      },
      error: (err) => this.showError(err)
    });
  }

  deleteGoal(goalId: number, event: Event) {
    event.stopPropagation();

    if (!confirm('Delete this goal?')) return;

    this.message = '';
    this.error = '';

    this.http.delete<any>(
      this.api + `/goals/${goalId}`,
      this.headers
    ).subscribe({
      next: () => {
        this.message = 'Goal deleted successfully!';

        if (Number(this.selectedGoalId) === Number(goalId)) {
          this.selectedGoalId = 0;
          this.topics = [];
          this.progress = null;
        }

        this.refresh();
        this.loadGoals();
      },
      error: (err) => this.showError(err)
    });
  }

  addGoal() {
    this.message = '';
    this.error = '';

    const title = this.goalForm.title.trim();

    if (!title) {
      this.error = 'Please enter a goal title.';
      this.refresh();
      return;
    }

    this.http.post<any>(
      this.api + '/goals',
      { title },
      this.headers
    ).subscribe({
      next: (goal) => {
        this.message = 'Goal added successfully!';
        this.goalForm.title = '';
        this.refresh();
        this.loadGoals(Number(goal?.id));
      },
      error: (err) => this.showError(err)
    });
  }

  addTopic() {
    this.message = '';
    this.error = '';

    const title = this.topicForm.title.trim();

    if (!this.selectedGoalId) {
      this.error = 'Please select a goal first.';
      this.refresh();
      return;
    }

    if (!title) {
      this.error = 'Please enter a topic title.';
      this.refresh();
      return;
    }

    this.http.post<any>(
      this.api + `/topics/${this.selectedGoalId}`,
      { title },
      this.headers
    ).subscribe({
      next: () => {
        this.message = 'Topic added successfully!';
        this.topicForm.title = '';
        this.refresh();
        this.loadGoals(this.selectedGoalId);
      },
      error: (err) => this.showError(err)
    });
  }

  addPrerequisite() {
    this.message = '';
    this.error = '';

    const topicId = Number(this.prereqForm.topicId);
    const prerequisiteId = Number(this.prereqForm.prerequisiteId);

    if (!topicId || !prerequisiteId) {
      this.error = 'Please select both a topic and its prerequisite.';
      this.refresh();
      return;
    }

    if (topicId === prerequisiteId) {
      this.error = 'A topic cannot be its own prerequisite.';
      this.refresh();
      return;
    }

    this.http.post<any>(
      this.api + `/topics/${topicId}/prerequisites`,
      { prerequisiteId },
      this.headers
    ).subscribe({
      next: () => {
        this.message = 'Prerequisite added successfully!';
        this.prereqForm = { topicId: 0, prerequisiteId: 0 };
        this.refresh();
        this.selectGoal(this.selectedGoalId);
      },
      error: (err) => this.showError(err)
    });
  }

  addSession() {
    this.message = '';
    this.error = '';

    if (!this.sessionForm.topicId) {
      this.error = 'Please select an unlocked topic.';
      this.refresh();
      return;
    }

    const body = {
      topicId: Number(this.sessionForm.topicId),
      date: this.sessionForm.date,
      minutes: Number(this.sessionForm.minutes),
      note: this.sessionForm.note
    };

    this.http.post<any>(
      this.api + '/sessions',
      body,
      this.headers
    ).subscribe({
      next: () => {
        this.message = 'Study session saved successfully!';
        this.sessionForm.note = '';
        this.refresh();
        this.loadSessions();
        this.selectGoal(this.selectedGoalId);
      },
      error: (err) => this.showError(err)
    });
  }

  loadSessions() {
    this.http.get<any[]>(this.api + '/sessions', this.headers).subscribe({
      next: (data) => {
        this.sessions = Array.isArray(data) ? data : [];
        this.refresh();
      },
      error: (err) => {
        this.sessions = [];
        this.showError(err);
      }
    });
  }

  loadRecommendations() {
    this.http.get<any>(
      this.api + '/ai-coach/recommendations',
      this.headers
    ).subscribe({
      next: (data) => {
        this.recommendations = Array.isArray(data)
          ? data
          : (data?.recommendations ?? data?.data ?? []);
        this.refresh();
      },
      error: (err) => {
        this.recommendations = [];
        this.showError(err);
      }
    });
  }

  updateSettings() {
    this.message = '';
    this.error = '';
    this.refresh();

    this.http.patch<any>(
      this.api + '/settings',
      this.settings,
      this.headers
    ).subscribe({
      next: (data) => {
        this.settings = data;
        this.message = 'Settings updated successfully!';
        this.refresh();
      },
      error: (err) => this.showError(err)
    });
  }

  // LEARNER PERMISSION TEST
  testLearnerSettingsPermission() {
    this.message = '';
    this.error = '';

    if (this.user?.role !== 'LEARNER') {
      this.error = 'Please log in using a learner account to run this test.';
      this.refresh();
      return;
    }

    this.http.get<any>(
      this.api + '/settings',
      this.headers
    ).subscribe({
      next: () => {
        this.error = 'Permission test failed: Learner accessed mentor settings.';
        this.refresh();
      },
      error: (err) => {
        if (err.status === 403) {
          this.message = 'Permission test passed: Learner cannot access mentor settings.';
        } else {
          this.error = err.error?.message || 'Permission test could not be completed.';
        }
        this.refresh();
      }
    });
  }

  showError(err: any) {
    const message = err?.error?.message;

    this.error = Array.isArray(message)
      ? message.join(', ')
      : message || 'Something went wrong. Please try again.';

    this.refresh();
  }

  logout() {
    this.token = '';
    this.user = null;
    this.goals = [];
    this.topics = [];
    this.sessions = [];
    this.recommendations = [];
    this.progress = null;
    this.selectedGoalId = 0;

    this.goalForm = { title: '' };
    this.topicForm = { title: '' };
    this.prereqForm = { topicId: 0, prerequisiteId: 0 };

    this.message = '';
    this.error = '';
    this.refresh();
  }
}
