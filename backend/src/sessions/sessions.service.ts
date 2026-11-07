
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async createSession(
    userId: number,
    topicId: number,
    date: string,
    minutes: number,
    note?: string,
  ) {
    const settings = await this.prisma.appSetting.findUnique({
      where: { id: 1 },
    });

    const minMinutes = settings?.minMinutes ?? 5;
    const maxMinutes = settings?.maxMinutes ?? 480;

    if (!Number.isInteger(minutes) ||
        minutes < minMinutes ||
        minutes > maxMinutes) {
      throw new BadRequestException(
        `Study minutes must be between ${minMinutes} and ${maxMinutes}`,
      );
    }

    const sessionDate = new Date(date);

    if (isNaN(sessionDate.getTime())) {
      throw new BadRequestException('Invalid session date');
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (sessionDate > today) {
      throw new BadRequestException('Future dates are not allowed');
    }

    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { goal: true },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (topic.goal.learnerId !== userId) {
      throw new ForbiddenException('You cannot log sessions for this topic');
    }

    const prerequisites = await this.prisma.topicPrerequisite.findMany({
      where: { topicId },
      include: { prerequisite: true },
    });

    const missing = prerequisites
      .filter((item) => !item.prerequisite.completed)
      .map((item) => item.prerequisite.title);

    if (missing.length > 0) {
      throw new BadRequestException({
        message: 'Topic is locked. Complete prerequisites first.',
        missingPrerequisites: missing,
      });
    }

    return this.prisma.studySession.create({
      data: {
        userId,
        topicId,
        date: sessionDate,
        minutes,
        note,
      },
    });
  }

  async getMySessions(userId: number) {
    return this.prisma.studySession.findMany({
      where: { userId },
      include: {
        topic: {
          include: { goal: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getGoalProgress(userId: number, goalId: number) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, learnerId: userId },
      include: {
        topics: {
          include: { sessions: true },
        },
      },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const totalTopics = goal.topics.length;
    const completedTopics = goal.topics.filter(
      (topic) => topic.completed,
    ).length;

    const totalMinutes = goal.topics.reduce(
      (sum, topic) =>
        sum + topic.sessions.reduce(
          (topicSum, session) => topicSum + session.minutes,
          0,
        ),
      0,
    );

    return {
      goalId,
      goalTitle: goal.title,
      totalTopics,
      completedTopics,
      progressPercentage:
        totalTopics === 0
          ? 0
          : Math.round((completedTopics / totalTopics) * 100),
      totalStudyMinutes: totalMinutes,
      totalStudyHours: Math.round((totalMinutes / 60) * 100) / 100,
    };
  }
}
