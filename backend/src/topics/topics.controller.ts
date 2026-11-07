
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';

import { TopicsService } from './topics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard/jwt-auth.guard';

@Controller('topics')
@UseGuards(JwtAuthGuard)
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Post(':goalId')
  createTopic(
    @Req() req: any,
    @Param('goalId', ParseIntPipe) goalId: number,
    @Body() body: { title: string; description?: string },
  ) {
    return this.topicsService.createTopic(
      req.user.id,
      goalId,
      body.title,
      body.description,
    );
  }

  @Get(':goalId')
  getTopics(
    @Req() req: any,
    @Param('goalId', ParseIntPipe) goalId: number,
  ) {
    return this.topicsService.getTopics(
      req.user.id,
      goalId,
      req.user.role,
    );
  }

  @Post(':topicId/prerequisites')
  addPrerequisite(
    @Req() req: any,
    @Param('topicId', ParseIntPipe) topicId: number,
    @Body() body: { prerequisiteId: number },
  ) {
    return this.topicsService.addPrerequisite(
      req.user.id,
      topicId,
      body.prerequisiteId,
    );
  }

  @Patch(':topicId/completion')
  updateCompletion(
    @Req() req: any,
    @Param('topicId', ParseIntPipe) topicId: number,
    @Body() body: { completed: boolean },
  ) {
    return this.topicsService.updateCompletion(
      req.user.id,
      topicId,
      body.completed,
    );
  }
}
