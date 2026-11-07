
import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    return this.prisma.appSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async updateSettings(
    minMinutes: number,
    maxMinutes: number,
    maxPrerequisites: number,
  ) {
    minMinutes = Number(minMinutes);
    maxMinutes = Number(maxMinutes);
    maxPrerequisites = Number(maxPrerequisites);

    if (
      !Number.isInteger(minMinutes) ||
      !Number.isInteger(maxMinutes) ||
      !Number.isInteger(maxPrerequisites) ||
      minMinutes < 5 ||
      maxMinutes > 480 ||
      maxMinutes < minMinutes ||
      maxPrerequisites < 1 ||
      maxPrerequisites > 10
    ) {
      throw new BadRequestException('Invalid settings values');
    }

    return this.prisma.appSetting.upsert({
      where: { id: 1 },
      update: {
        minMinutes,
        maxMinutes,
        maxPrerequisites,
      },
      create: {
        id: 1,
        minMinutes,
        maxMinutes,
        maxPrerequisites,
      },
    });
  }
}
