import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';

import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard/roles.guard';

import {
  Roles,
  UserRole,
} from '../auth/decorators/roles.decorator/roles.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MENTOR)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
  ) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  updateSettings(
    @Body()
    body: {
      minMinutes: number;
      maxMinutes: number;
      maxPrerequisites: number;
    },
  ) {
    return this.settingsService.updateSettings(
      Number(body.minMinutes),
      Number(body.maxMinutes),
      Number(body.maxPrerequisites),
    );
  }
}