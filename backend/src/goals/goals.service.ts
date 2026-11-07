
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  // Create a new goal for learner
  async createGoal(
    userId: number,
    title: string,
    description?: string,
  ) {
    if (!title || !title.trim()) {
      throw new BadRequestException('Goal title is required');
    }

    return this.prisma.goal.create({
      data: {
        title: title.trim(),
        description,
        learnerId: userId,
      },
    });
  }

  // Get logged-in learner's goals
  async getMyGoals(userId: number) {
    return this.prisma.goal.findMany({
      where: { learnerId: userId },
      include: {
        topics: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Mentor can view a learner's goals
  async getLearnerGoals(learnerId: number) {
    const learner = await this.prisma.user.findFirst({
      where: {
        id: learnerId,
        role: 'LEARNER',
      },
    });

    if (!learner) {
      throw new NotFoundException('Learner not found');
    }

    return this.prisma.goal.findMany({
      where: { learnerId },
      include: {
        topics: {
          include: {
            prerequisites: {
              include: {
                prerequisite: true,
              },
            },
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Delete only the logged-in learner's own goal
  async deleteGoal(userId: number, goalId: number) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (goal.learnerId !== userId) {
      throw new ForbiddenException(
        'You cannot delete another learner goal',
      );
    }

    return this.prisma.goal.delete({
      where: { id: goalId },
    });
  }
}
