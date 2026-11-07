import { Test, TestingModule } from '@nestjs/testing';
import { AiCoachController } from './ai-coach.controller';
import { AiCoachService } from './ai-coach.service';

describe('AiCoachController', () => {
  let controller: AiCoachController;

  const aiCoachServiceMock = {
    getRecommendations: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiCoachController],
      providers: [
        {
          provide: AiCoachService,
          useValue: aiCoachServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AiCoachController>(AiCoachController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});