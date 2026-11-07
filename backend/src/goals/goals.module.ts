import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { RolesGuard } from '../auth/guards/roles.guard/roles.guard';

@Module({
  providers: [GoalsService, RolesGuard],
  controllers: [GoalsController],
})
export class GoalsModule {}