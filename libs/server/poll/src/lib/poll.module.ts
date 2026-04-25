import { Module } from '@nestjs/common';
import { AuthModule } from '@libs/server-auth';
import { PollController } from './poll.controller';
import { PollService } from './poll.service';
import { PollStreamService } from './poll-stream.service';

@Module({
  imports: [AuthModule],
  controllers: [PollController],
  providers: [PollService, PollStreamService],
  exports: [PollService, PollStreamService],
})
export class PollModule {}
