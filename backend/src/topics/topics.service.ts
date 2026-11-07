
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  private async getOwnedGoal(userId: number, goalId: number) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, learnerId: userId },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    return goal;
  }

  async createTopic(
    userId: number,
    goalId: number,
    title: string,
    description?: string,
  ) {
    await this.getOwnedGoal(userId, goalId);

    if (!title?.trim()) {
      throw new BadRequestException('Topic title is required');
    }

    return this.prisma.topic.create({
      data: {
        title: title.trim(),
        description,
        goalId,
      },
    });
  }

  async getTopics(
    userId: number,
    goalId: number,
    role: string,
  ) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Mentors can view any learner's topics.
    // Learners can view only their own topics.
    if (role !== 'MENTOR' && goal.learnerId !== userId) {
      throw new ForbiddenException('You cannot view this goal');
    }

    const topics = await this.prisma.topic.findMany({
      where: { goalId },
      include: {
        prerequisites: {
          include: { prerequisite: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return topics.map((topic) => {
      const missing = topic.prerequisites
        .filter((item) => !item.prerequisite.completed)
        .map((item) => item.prerequisite.title);

      return {
        ...topic,
        locked: missing.length > 0,
        missingPrerequisites: missing,
      };
    });
  }

  async addPrerequisite(
    userId: number,
    topicId: number,
    prerequisiteId: number,
  ) {
    if (topicId === prerequisiteId) {
      throw new BadRequestException(
        'A topic cannot be its own prerequisite',
      );
    }

    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { goal: true },
    });

    const prerequisite = await this.prisma.topic.findUnique({
      where: { id: prerequisiteId },
      include: { goal: true },
    });

    if (!topic || !prerequisite) {
      throw new NotFoundException('Topic not found');
    }

    if (
      topic.goal.learnerId !== userId ||
      prerequisite.goal.learnerId !== userId
    ) {
      throw new ForbiddenException(
        'You cannot modify these topics',
      );
    }

    if (topic.goalId !== prerequisite.goalId) {
      throw new BadRequestException(
        'Prerequisites must belong to the same goal',
      );
    }

    const settings = await this.prisma.appSetting.findUnique({
      where: { id: 1 },
    });

    const count = await this.prisma.topicPrerequisite.count({
      where: { topicId },
    });

    if (count >= (settings?.maxPrerequisites ?? 5)) {
      throw new BadRequestException(
        'Maximum prerequisites reached',
      );
    }

    // Prevent circular dependencies.
    const visited = new Set<number>();

    const hasCycle = async (
      currentId: number,
    ): Promise<boolean> => {
      if (currentId === topicId) return true;
      if (visited.has(currentId)) return false;

      visited.add(currentId);

      const links = await this.prisma.topicPrerequisite.findMany({
        where: { topicId: currentId },
      });

      for (const link of links) {
        if (await hasCycle(link.prerequisiteId)) {
          return true;
        }
      }

      return false;
    };

    if (await hasCycle(prerequisiteId)) {
      throw new BadRequestException(
        'This prerequisite creates a cycle',
      );
    }

    return this.prisma.topicPrerequisite.create({
      data: {
        topicId,
        prerequisiteId,
      },
    });
  }

  async updateCompletion(
    userId: number,
    topicId: number,
    completed: boolean,
  ) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { goal: true },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (topic.goal.learnerId !== userId) {
      throw new ForbiddenException(
        'You cannot update this topic',
      );
    }

    if (completed) {
      const requirements =
        await this.prisma.topicPrerequisite.findMany({
          where: { topicId },
          include: { prerequisite: true },
        });

      const missing = requirements
        .filter((item) => !item.prerequisite.completed)
        .map((item) => item.prerequisite.title);

      if (missing.length > 0) {
        throw new BadRequestException({
          message: 'Complete prerequisites first',
          missingPrerequisites: missing,
        });
      }

      return this.prisma.topic.update({
        where: { id: topicId },
        data: { completed: true },
      });
    }

    // Reopening a topic also reopens dependent topics.
    const visited = new Set<number>();

    const reopenDependents = async (currentId: number) => {
      if (visited.has(currentId)) return;

      visited.add(currentId);

      const dependents =
        await this.prisma.topicPrerequisite.findMany({
          where: { prerequisiteId: currentId },
        });

      for (const link of dependents) {
        await this.prisma.topic.update({
          where: { id: link.topicId },
          data: { completed: false },
        });

        await reopenDependents(link.topicId);
      }
    };

    await this.prisma.topic.update({
      where: { id: topicId },
      data: { completed: false },
    });

    await reopenDependents(topicId);

    return {
      message:
        'Topic reopened and dependent topics relocked',
    };
  }
}
