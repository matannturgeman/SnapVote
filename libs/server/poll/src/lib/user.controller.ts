import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  PaginatedResponseDtoSchema,
  UserVoteHistoryItemDtoSchema,
  UserVoteHistoryQueryDtoSchema,
  parseDto,
  type PaginatedResponseDto,
  type UserVoteHistoryItemDto,
  type UserVoteHistoryQueryDto,
} from '@libs/shared-dto';
import { CurrentUser, type LoggedInUser } from '@libs/server-user';
import { PollService } from './poll.service';

function parseQuery<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown,
): T {
  try {
    return schema.parse(data);
  } catch (err: any) {
    const msg =
      err?.issues?.map((i: any) => i.message).join(', ') ??
      err?.message ??
      'Validation error';
    throw new BadRequestException(msg);
  }
}

@Controller('users')
export class UserVotesController {
  constructor(private readonly pollService: PollService) {}

  @Get(':id/votes')
  async getUserVotes(
    @Param('id', ParseIntPipe) targetId: number,
    @Query() query: any,
    @CurrentUser() requester: LoggedInUser,
  ): Promise<PaginatedResponseDto<UserVoteHistoryItemDto>> {
    const dto: UserVoteHistoryQueryDto = parseQuery(
      UserVoteHistoryQueryDtoSchema,
      query,
    );
    const result = await this.pollService.listUserVotes(
      targetId,
      requester.id,
      dto,
    );
    return parseDto(
      PaginatedResponseDtoSchema(UserVoteHistoryItemDtoSchema),
      result,
    );
  }
}
