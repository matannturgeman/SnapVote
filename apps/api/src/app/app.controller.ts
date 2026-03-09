import { Controller, Get } from '@nestjs/common';
import {
  MessageResponseDtoSchema,
  parseDto,
  type MessageResponseDto,
} from '@libs/shared-dto';
import { Public } from '@libs/server-auth';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getData(): MessageResponseDto {
    return parseDto(MessageResponseDtoSchema, this.appService.getData());
  }
}
