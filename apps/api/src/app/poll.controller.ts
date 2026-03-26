import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PollService } from './poll.service';
import { CreatePollDto, UpdatePollDto, PollResponseDto } from '@libs/shared-dto';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

@Controller('polls')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post()
  async create(@Body() dto: CreatePollDto): Promise<PollResponseDto> {
    return this.pollService.create(dto.ownerId, dto);
  }

  @Get(':id')
  async get(@Param('id') pollId: string): Promise<PollResponseDto> {
    const poll = await this.pollService.getPoll(pollId);
    if (!poll) throw new NotFoundException('Poll not found');
    return poll;
  }

  @Patch(':id')
  async update(
    @Param('id') pollId: string,
    @Body() dto: UpdatePollDto,
  ): Promise<PollResponseDto> {
    return this.pollService.updatePoll(pollId, dto.ownerId, dto);
  }

  @Post(':id/close')
  async close(@Param('id') pollId: string): Promise<PollResponseDto> {
    return this.pollService.closePoll(pollId);
  }

  @Delete(':id')
  async delete(@Param('id') pollId: string): Promise<void> {
    await this.pollService.deletePoll(pollId);
  }

  @Get()
  async list(
    @Query() query: {
      page: number;
      limit: number;
      themeIds?: string[];
      voterId?: number;
      ownerId?: number;
    },
  ): Promise<{
    data: PollResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.pollService.listPolls(
      query.userId,
      query.page,
      query.limit,
      query.themeIds,
      query.voterId,
      query.ownerId,
    );
  }
}
