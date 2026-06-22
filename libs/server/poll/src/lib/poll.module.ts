import { Module } from '@nestjs/common';
import { AuthModule } from '@libs/server-auth';
import { PollController } from './poll.controller';
import { PollService } from './poll.service';
import { PollStreamService } from './poll-stream.service';
import { ThemeController } from './theme.controller';
import { ThemeService } from './theme.service';

@Module({
  imports: [AuthModule],
  controllers: [PollController, ThemeController],
  providers: [PollService, PollStreamService, ThemeService],
  exports: [PollService, PollStreamService, ThemeService],
})
export class PollModule {}
