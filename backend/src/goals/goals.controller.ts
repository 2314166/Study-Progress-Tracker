
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';

import { GoalsService } from './goals.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard/jwt-auth.guard';

import { RolesGuard } from '../auth/guards/roles.guard/roles.guard';

import {
  Roles,
  UserRole,
} from '../auth/decorators/roles.decorator/roles.decorator';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.LEARNER)
  createGoal(
    @Req() req: any,
    @Body() body: { title: string; description?: string },
  ) {
    return this.goalsService.createGoal(
      req.user.id,
      body.title,
      body.description,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.LEARNER)
  getMyGoals(@Req() req: any) {
    return this.goalsService.getMyGoals(req.user.id);
  }

  @Get('mentor/learner/:learnerId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MENTOR)
  getLearnerGoals(
    @Param('learnerId', ParseIntPipe) learnerId: number,
  ) {
    return this.goalsService.getLearnerGoals(learnerId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.LEARNER)
  deleteGoal(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.goalsService.deleteGoal(req.user.id, id);
  }
}
