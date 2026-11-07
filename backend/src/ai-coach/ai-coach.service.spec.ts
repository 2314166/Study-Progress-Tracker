import { Test, TestingModule } from '@nestjs/testing';
import { AiCoachService } from './ai-coach.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AiCoachService', () => {
  let service: AiCoachService;

  const prismaMock = {
    goal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    topic: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    studySession: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    prerequisite: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCoachService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AiCoachService>(AiCoachService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});