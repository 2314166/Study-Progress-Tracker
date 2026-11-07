
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiCoachService {
  constructor(private prisma: PrismaService) {}

  async getRecommendations(userId: number) {
    const goals = await this.prisma.goal.findMany({
      where: { learnerId: userId },
      include: {
        topics: {
          include: {
            prerequisites: {
              include: { prerequisite: true },
            },
            sessions: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const recommendations = goals.map((goal) => {
      const completedTopics = goal.topics.filter(
        (topic) => topic.completed,
      ).length;

      const unlockedTopics = goal.topics.filter(
        (topic) =>
          !topic.completed &&
          topic.prerequisites.every(
            (item) => item.prerequisite.completed,
          ),
      );

      const nextTopic = unlockedTopics[0];

      const revisionTopics = goal.topics
        .filter((topic) => !topic.completed && topic.sessions.length > 0)
        .map((topic) => ({
          title: topic.title,
          minutes: topic.sessions.reduce(
            (sum, session) => sum + session.minutes,
            0,
          ),
        }))
        .filter((topic) => topic.minutes < 60);

      const totalMinutes = goal.topics.reduce(
        (sum, topic) =>
          sum + topic.sessions.reduce(
            (topicSum, session) => topicSum + session.minutes,
            0,
          ),
        0,
      );

      return {
        goal: goal.title,
        progress:
          goal.topics.length === 0
            ? 0
            : Math.round(
                (completedTopics / goal.topics.length) * 100,
              ),
        totalStudyMinutes: totalMinutes,
        nextRecommendedTopic: nextTopic?.title ?? 'No unlocked topic',
        revisionSuggestions: revisionTopics.map(
          (topic) => topic.title,
        ),
        dailyStudyTargetMinutes: 45,
        message: nextTopic
          ? `Your next recommended topic is ${nextTopic.title}`
          : 'Complete or add topics to continue your learning',
      };
    });

    return {
      coach: 'Smart Study Coach',
      recommendationType: 'Rule-based personalized recommendations',
      recommendations,
    };
  }
}
