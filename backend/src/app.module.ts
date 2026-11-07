import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GoalsModule } from './goals/goals.module';
import { TopicsModule } from './topics/topics.module';
import { SessionsModule } from './sessions/sessions.module';
import { AiCoachModule } from './ai-coach/ai-coach.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [PrismaModule, AuthModule, GoalsModule, TopicsModule, SessionsModule, AiCoachModule, SettingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}