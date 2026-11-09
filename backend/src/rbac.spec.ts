import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';

import { GoalsController } from './goals/goals.controller';
import { GoalsService } from './goals/goals.service';
import { SettingsController } from './settings/settings.controller';
import { SettingsService } from './settings/settings.service';
import { TopicsController } from './topics/topics.controller';
import { TopicsService } from './topics/topics.service';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy/jwt.strategy';
import { RolesGuard } from './auth/guards/roles.guard/roles.guard';

const SECRET = process.env.JWT_SECRET || 'temporary-development-secret';

describe('Role-based access control (HTTP level, real guards)', () => {
  let app: INestApplication;
  let mentorToken: string;
  let learnerToken: string;

  const goalsService = {
    getAllLearners: jest.fn().mockResolvedValue([{ id: 1, name: 'L' }]),
    getLearnerGoals: jest.fn().mockResolvedValue([]),
    getMyGoals: jest.fn().mockResolvedValue([]),
    createGoal: jest.fn().mockResolvedValue({ id: 9 }),
    deleteGoal: jest.fn().mockResolvedValue({ id: 9 }),
  };
  const settingsService = {
    getSettings: jest
      .fn()
      .mockResolvedValue({ minMinutes: 5, maxMinutes: 480, maxPrerequisites: 5 }),
    updateSettings: jest.fn().mockResolvedValue({}),
  };
  const topicsService = {
    getTopics: jest.fn().mockResolvedValue([]),
    createTopic: jest.fn(),
    addPrerequisite: jest.fn(),
    updateCompletion: jest.fn(),
  };
  const sessionsService = {
    createSession: jest.fn(),
    getMySessions: jest.fn().mockResolvedValue([]),
    getGoalProgress: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [
        GoalsController,
        SettingsController,
        TopicsController,
        SessionsController,
      ],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: GoalsService, useValue: goalsService },
        { provide: SettingsService, useValue: settingsService },
        { provide: TopicsService, useValue: topicsService },
        { provide: SessionsService, useValue: sessionsService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const jwt = moduleRef.get(JwtService);
    mentorToken = await jwt.signAsync({ sub: 2, email: 'm@x.com', role: 'MENTOR' });
    learnerToken = await jwt.signAsync({ sub: 1, email: 'l@x.com', role: 'LEARNER' });
  });

  afterAll(async () => {
    await app.close();
  });

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('mentor can list all learners', async () => {
    await request(app.getHttpServer())
      .get('/goals/mentor/learners')
      .set(as(mentorToken))
      .expect(200);
  });

  it('mentor can view one learner goals', async () => {
    await request(app.getHttpServer())
      .get('/goals/mentor/learner/1')
      .set(as(mentorToken))
      .expect(200);
  });

  it('mentor can read settings', async () => {
    const res = await request(app.getHttpServer())
      .get('/settings')
      .set(as(mentorToken))
      .expect(200);
    expect(res.body.minMinutes).toBe(5);
  });

  it('mentor can view topics of a goal', async () => {
    await request(app.getHttpServer())
      .get('/topics/5')
      .set(as(mentorToken))
      .expect(200);
    expect(topicsService.getTopics).toHaveBeenCalledWith(2, 5, 'MENTOR');
  });

  it('learner is forbidden from settings (403)', async () => {
    await request(app.getHttpServer())
      .get('/settings')
      .set(as(learnerToken))
      .expect(403);
  });

  it('learner is forbidden from mentor learner list (403)', async () => {
    await request(app.getHttpServer())
      .get('/goals/mentor/learners')
      .set(as(learnerToken))
      .expect(403);
  });

  it('learner can read own goals', async () => {
    await request(app.getHttpServer())
      .get('/goals')
      .set(as(learnerToken))
      .expect(200);
  });

  it('mentor calling learner-only GET /goals gets 403 (the old dashboard bug)', async () => {
    await request(app.getHttpServer())
      .get('/goals')
      .set(as(mentorToken))
      .expect(403);
  });

  it('mentor cannot delete a learner goal (403)', async () => {
    await request(app.getHttpServer())
      .delete('/goals/9')
      .set(as(mentorToken))
      .expect(403);
    expect(goalsService.deleteGoal).not.toHaveBeenCalled();
  });

  it('request without a token is rejected (401)', async () => {
    await request(app.getHttpServer()).get('/settings').expect(401);
  });
});
