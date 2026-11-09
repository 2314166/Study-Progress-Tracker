import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { TopicsService } from './topics/topics.service';
import { SessionsService } from './sessions/sessions.service';
import { SettingsService } from './settings/settings.service';

const mockPrisma = () => ({
  topic: { findUnique: jest.fn(), update: jest.fn() },
  topicPrerequisite: {
    count: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  appSetting: { findUnique: jest.fn(), upsert: jest.fn() },
  studySession: { create: jest.fn() },
});

describe('Prerequisite rules', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let service: TopicsService;

  const topic = (id: number, goalId = 1, learnerId = 1) => ({
    id,
    goalId,
    goal: { id: goalId, learnerId },
  });

  beforeEach(() => {
    prisma = mockPrisma();
    service = new TopicsService(prisma as any);
    prisma.appSetting.findUnique.mockResolvedValue({ maxPrerequisites: 5 });
    prisma.topicPrerequisite.count.mockResolvedValue(0);
    prisma.topicPrerequisite.findMany.mockResolvedValue([]);
  });

  it('rejects a topic being its own prerequisite', async () => {
    await expect(service.addPrerequisite(1, 3, 3)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a circular dependency (A needs B, then B needs A)', async () => {
    prisma.topic.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(topic(where.id)),
    );
    // existing link: topic 10 (A) requires topic 20 (B)
    prisma.topicPrerequisite.findMany.mockImplementation(({ where }: any) =>
      Promise.resolve(
        where.topicId === 10 ? [{ topicId: 10, prerequisiteId: 20 }] : [],
      ),
    );

    // now try to make B (20) require A (10)
    await expect(service.addPrerequisite(1, 20, 10)).rejects.toThrow(
      'cycle',
    );
  });

  it('rejects when the maximum prerequisite limit is reached', async () => {
    prisma.topic.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(topic(where.id)),
    );
    prisma.topicPrerequisite.count.mockResolvedValue(5);

    await expect(service.addPrerequisite(1, 1, 2)).rejects.toThrow(
      'Maximum prerequisites reached',
    );
  });

  it('accepts a valid prerequisite', async () => {
    prisma.topic.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(topic(where.id)),
    );
    prisma.topicPrerequisite.create.mockResolvedValue({ id: 1 });

    await expect(service.addPrerequisite(1, 1, 2)).resolves.toEqual({ id: 1 });
  });

  it("rejects modifying another learner's topics", async () => {
    prisma.topic.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(topic(where.id, 1, 99)),
    );
    await expect(service.addPrerequisite(1, 1, 2)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refuses to complete a topic while a prerequisite is incomplete', async () => {
    prisma.topic.findUnique.mockResolvedValue(topic(2));
    prisma.topicPrerequisite.findMany.mockResolvedValue([
      { prerequisite: { title: 'HTML Basics', completed: false } },
    ]);
    await expect(service.updateCompletion(1, 2, true)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('reopening a prerequisite relocks (reopens) dependent topics', async () => {
    prisma.topic.findUnique.mockResolvedValue(topic(1));
    prisma.topicPrerequisite.findMany.mockImplementation(({ where }: any) =>
      Promise.resolve(
        where.prerequisiteId === 1 ? [{ topicId: 2, prerequisiteId: 1 }] : [],
      ),
    );

    await service.updateCompletion(1, 1, false);

    expect(prisma.topic.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { completed: false },
    });
  });
});

describe('Study session validation', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let service: SessionsService;
  const today = new Date().toISOString().slice(0, 10);

  beforeEach(() => {
    prisma = mockPrisma();
    service = new SessionsService(prisma as any);
    prisma.appSetting.findUnique.mockResolvedValue({
      minMinutes: 5,
      maxMinutes: 480,
    });
    prisma.topic.findUnique.mockResolvedValue({
      id: 1,
      goal: { learnerId: 1 },
    });
    prisma.topicPrerequisite.findMany.mockResolvedValue([]);
    prisma.studySession.create.mockResolvedValue({ id: 1 });
  });

  it('rejects minutes below the minimum', async () => {
    await expect(service.createSession(1, 1, today, 3)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects minutes above the maximum', async () => {
    await expect(service.createSession(1, 1, today, 481)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a future date', async () => {
    const future = new Date(Date.now() + 3 * 86400000)
      .toISOString()
      .slice(0, 10);
    await expect(service.createSession(1, 1, future, 30)).rejects.toThrow(
      'Future dates are not allowed',
    );
  });

  it('rejects sessions on a locked topic', async () => {
    prisma.topicPrerequisite.findMany.mockResolvedValue([
      { prerequisite: { title: 'HTML Basics', completed: false } },
    ]);
    await expect(service.createSession(1, 1, today, 30)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates a valid session', async () => {
    await expect(service.createSession(1, 1, today, 30, 'ok')).resolves.toEqual(
      { id: 1 },
    );
  });
});

describe('Settings validation', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let service: SettingsService;

  beforeEach(() => {
    prisma = mockPrisma();
    service = new SettingsService(prisma as any);
    prisma.appSetting.upsert.mockResolvedValue({});
  });

  it('rejects max less than min', async () => {
    await expect(service.updateSettings(50, 10, 5)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects maxPrerequisites of 0', async () => {
    await expect(service.updateSettings(5, 480, 0)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('accepts valid settings', async () => {
    await expect(service.updateSettings(10, 240, 3)).resolves.toBeDefined();
  });
});
