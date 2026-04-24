import { Module } from '@nestjs/common';
import { PollController } from './poll.controller';
import { PollService } from './poll.service';
import { PollStreamService } from './poll-stream.service';

@Module({
  controllers: [PollController],
  providers: [PollService, PollStreamService],
  exports: [PollService, PollStreamService],
})
export class PollModule {}
