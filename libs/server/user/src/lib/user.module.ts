import { Module } from '@nestjs/common';
import { PollModule } from '@libs/server-poll';
import { UserController } from './user.controller';

@Module({
  imports: [PollModule],
  controllers: [UserController],
})
export class UserModule {}
