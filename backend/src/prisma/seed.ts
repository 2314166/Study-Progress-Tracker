
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Demo@12345', 10);

  const learner = await prisma.user.upsert({
    where: { email: 'learner@demo.com' },
    update: {},
    create: {
      name: 'Demo Learner',
      email: 'learner@demo.com',
      passwordHash,
      role: Role.LEARNER,
    },
  });

  const mentor = await prisma.user.upsert({
    where: { email: 'mentor@demo.com' },
    update: { role: Role.MENTOR },
    create: {
      name: 'Demo Mentor',
      email: 'mentor@demo.com',
      passwordHash,
      role: Role.MENTOR,
    },
  });

  const goalData = [
    {
      title: 'Full Stack Development',
      description: 'Learn backend and frontend development',
      topics: [
        'HTML Basics',
        'CSS Basics',
        'JavaScript',
        'Node.js',
      ],
    },
    {
      title: 'Python Programming',
      description: 'Build strong Python fundamentals',
      topics: [
        'Python Basics',
        'Variables',
        'Loops',
        'Functions',
      ],
    },
    {
      title: 'Database Management',
      description: 'Learn relational databases',
      topics: [
        'Database Basics',
        'SQL Queries',
        'Joins',
        'Database Design',
      ],
    },
  ];

  const createdTopics: { id: number; title: string }[][] = [];

  for (const item of goalData) {
    const goal = await prisma.goal.create({
      data: {
        title: item.title,
        description: item.description,
        learnerId: learner.id,
      },
    });

    const topics = [];

    for (const title of item.topics) {
      const topic = await prisma.topic.create({
        data: {
          title,
          goalId: goal.id,
        },
      });
      topics.push(topic);
    }

    createdTopics.push(topics);
  }

  for (const topics of createdTopics) {
    for (let i = 1; i < topics.length; i++) {
      await prisma.topicPrerequisite.create({
        data: {
          topicId: topics[i].id,
          prerequisiteId: topics[i - 1].id,
        },
      });
    }
  }

  const allTopics = createdTopics.flat();

  for (let i = 0; i < 30; i++) {
    const topic = allTopics[i % allTopics.length];

    const date = new Date();
    date.setDate(date.getDate() - Math.floor((i * 41) / 29));

    await prisma.studySession.create({
      data: {
        userId: learner.id,
        topicId: topic.id,
        date,
        minutes: 30 + (i % 4) * 15,
        note: 'Demo study session',
      },
    });
  }

  await prisma.appSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  console.log('Seed completed successfully!');
  console.log('Learner:', learner.email);
  console.log('Mentor:', mentor.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
