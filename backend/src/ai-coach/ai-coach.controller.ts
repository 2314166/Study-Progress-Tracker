
import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AiCoachService } from './ai-coach.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard/jwt-auth.guard';

@Controller('ai-coach')
@UseGuards(JwtAuthGuard)
export class AiCoachController {
  constructor(
    private readonly aiCoachService: AiCoachService,
  ) {}

  @Get('recommendations')
  getRecommendations(@Req() req: any) {
    return this.aiCoachService.getRecommendations(req.user.id);
  }
}
