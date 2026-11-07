
import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SettingsService', () => {
  let service: SettingsService;

  const prismaMock = {
    appSetting: {
      upsert: jest.fn().mockResolvedValue({
        id: 1,
        minMinutes: 5,
        maxMinutes: 480,
        maxPrerequisites: 5,
      }),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return existing settings', async () => {
    const result = await service.getSettings();

    expect(result.minMinutes).toBe(5);
    expect(result.maxMinutes).toBe(480);
    expect(prismaMock.appSetting.upsert).toHaveBeenCalled();
  });

  it('should update valid settings', async () => {
    const result = await service.updateSettings(10, 480, 5);

    expect(result).toBeDefined();
    expect(prismaMock.appSetting.upsert).toHaveBeenCalled();
  });

  it('should reject minimum minutes below 5', async () => {
    await expect(
      service.updateSettings(4, 480, 5),
    ).rejects.toThrow('Invalid settings values');
  });

  it('should reject maximum minutes above 480', async () => {
    await expect(
      service.updateSettings(5, 481, 5),
    ).rejects.toThrow('Invalid settings values');
  });

  it('should reject maximum minutes below minimum minutes', async () => {
    await expect(
      service.updateSettings(60, 30, 5),
    ).rejects.toThrow('Invalid settings values');
  });

  it('should reject maximum prerequisites above 10', async () => {
    await expect(
      service.updateSettings(5, 480, 11),
    ).rejects.toThrow('Invalid settings values');
  });
});
