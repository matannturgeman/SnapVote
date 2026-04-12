import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CastVoteDtoSchema,
  CreatePollDtoSchema,
  CreateShareLinkDtoSchema,
  JoinPollResponseDtoSchema,
  PollResponseDtoSchema,
  PollResultsDtoSchema,
  ShareLinkResponseDtoSchema,
  UpdatePollDtoSchema,
  parseDto,
  type JoinPollResponseDto,
  type PollResponseDto,
  type PollResultsDto,
  type ShareLinkResponseDto,
} from '@libs/shared-dto';
import { CurrentUser, type LoggedInUser } from '@libs/server-user';
import { Public } from '@libs/server-auth';
import { PollService } from './poll.service';

function parsePollDto<T>(
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

@Controller('polls')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  // Public: participants access poll via share token (declared first to avoid :id capture)
  @Public()
  @Get('join/:token')
  async joinByToken(
    @Param('token') token: string,
  ): Promise<JoinPollResponseDto> {
    const result = await this.pollService.findByShareToken(token);
    return parseDto(JoinPollResponseDtoSchema, result);
  }

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: LoggedInUser,
  ): Promise<PollResponseDto> {
    const dto = parsePollDto(CreatePollDtoSchema, body);
    const result = await this.pollService.create(user.id, dto);
    return parseDto(PollResponseDtoSchema, result);
  }

  // Auth required (JWT guard is global). Polls are not public — only authenticated
  // users can read poll details. Add @Public() here if unauthenticated access is needed.
  @Get(':id')
  async findById(@Param('id') id: string): Promise<PollResponseDto> {
    const result = await this.pollService.findById(id);
    return parseDto(PollResponseDtoSchema, result);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: LoggedInUser,
  ): Promise<PollResponseDto> {
    const dto = parsePollDto(UpdatePollDtoSchema, body);
    const result = await this.pollService.update(id, user.id, dto);
    return parseDto(PollResponseDtoSchema, result);
  }

  @HttpCode(200)
  @Post(':id/close')
  async close(
    @Param('id') id: string,
    @CurrentUser() user: LoggedInUser,
  ): Promise<PollResponseDto> {
    const result = await this.pollService.close(id, user.id);
    return parseDto(PollResponseDtoSchema, result);
  }

  @Get(':id/share-links')
  async listShareLinks(
    @Param('id') id: string,
    @CurrentUser() user: LoggedInUser,
  ): Promise<ShareLinkResponseDto[]> {
    return this.pollService.listShareLinks(id, user.id);
  }

  @Post(':id/share-links')
  async createShareLink(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: LoggedInUser,
  ): Promise<ShareLinkResponseDto> {
    const dto = parsePollDto(CreateShareLinkDtoSchema, body);
    const result = await this.pollService.createShareLink(id, user.id, dto);
    return parseDto(ShareLinkResponseDtoSchema, result);
  }

  @HttpCode(200)
  @Post(':id/share-links/:linkId/revoke')
  async revokeShareLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: LoggedInUser,
  ): Promise<ShareLinkResponseDto> {
    const result = await this.pollService.revokeShareLink(id, linkId, user.id);
    return parseDto(ShareLinkResponseDtoSchema, result);
  }

  @HttpCode(200)
  @Post(':id/votes')
  async castVote(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: LoggedInUser,
  ): Promise<PollResultsDto> {
    const dto = parsePollDto(CastVoteDtoSchema, body);
    const result = await this.pollService.castVote(id, user.id, dto);
    return parseDto(PollResultsDtoSchema, result);
  }

  @Get(':id/results')
  async getResults(
    @Param('id') id: string,
    @CurrentUser() user: LoggedInUser,
  ): Promise<PollResultsDto> {
    const result = await this.pollService.getResults(id, user.id);
    return parseDto(PollResultsDtoSchema, result);
  }
}
