
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';

import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard/jwt-auth.guard';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  createSession(
    @Req() req: any,
    @Body()
    body: {
      topicId: number;
      date: string;
      minutes: number;
      note?: string;
    },
  ) {
    return this.sessionsService.createSession(
      req.user.id,
      Number(body.topicId),
      body.date,
      Number(body.minutes),
      body.note,
    );
  }

  @Get()
  getMySessions(@Req() req: any) {
    return this.sessionsService.getMySessions(req.user.id);
  }

  @Get('progress/:goalId')
  getGoalProgress(
    @Req() req: any,
    @Param('goalId', ParseIntPipe) goalId: number,
  ) {
    return this.sessionsService.getGoalProgress(
      req.user.id,
      goalId,
    );
  }
}
