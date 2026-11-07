import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SessionsService', () => {
  let service: SessionsService;

  const prismaMock = {
    studySession: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    topic: {
      findUnique: jest.fn(),
    },
    goal: {
      findUnique: jest.fn(),
    },
    appSetting: {
      findFirst: jest.fn().mockResolvedValue({
        minMinutes: 5,
        maxMinutes: 480,
      }),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});