import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { prisma } from '@libs/server-data-access';
import type {
  CreatePollDto,
  UpdatePollDto,
  PollResponseDto,
  ThemeResponseDto,
  CastVoteDto,
  VoteResponseDto,
} from '@libs/shared-dto';
import { parseDto } from '@libs/shared-dto';

const DEFAULT_VOTE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days, same as session

@Injectable()
export class PollService {
  private readonly logger = new Logger(PollService.name);

  // ===========================================================================
  // POLL CRUD OPERATIONS
  // ===========================================================================

  async createPoll(
    ownerId: number,
    dto: CreatePollDto,
  ): Promise<PollResponseDto> {
    // Validate theme IDs exist if provided
    if (dto.themeIds && dto.themeIds.length > 0) {
      const existingThemes = await prisma.theme.findMany({
        where: { id: { in: dto.themeIds }, deleted: false },
        select: { id: true },
      });
      if (existingThemes.length !== dto.themeIds.length) {
        throw new BadRequestException('One or more theme IDs are invalid');
      }
    }

    // Create poll with options and theme associations in a transaction
    const poll = await prisma.$transaction(async (tx) => {
      const poll = await tx.poll.create({
        data: {
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          ownerId,
          visibilityMode: dto.visibilityMode,
          allowMultipleAnswers: dto.allowMultipleAnswers,
          status: 'DRAFT',
          themes: dto.themeIds
            ? {
                create: dto.themeIds.map((themeId) => ({ themeId })),
              }
            : undefined,
        },
      });

      // Create options
      if (dto.options.length > 0) {
        await tx.pollOption.createMany({
          data: dto.options.map((opt) => ({
            pollId: poll.id,
            text: opt.text.trim(),
          })),
        });
      }

      return poll;
    });

    return this.toPollResponse(poll);
  }

  async getPoll(pollId: string, userId?: number): Promise<PollResponseDto> {
    const poll = await prisma.poll.findFirst({
      where: { id: pollId, deleted: false },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
        options: {
          where: { deleted: false },
          orderBy: { id: 'asc' },
        },
        themes: {
          include: {
            theme: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    // Check access based on visibility and status
    if (!this.canUserViewPoll(poll, userId)) {
      throw new ForbiddenException('You do not have access to this poll');
    }

    return this.toPollResponse(poll);
  }

  async updatePoll(
    pollId: string,
    userId: number,
    dto: UpdatePollDto,
  ): Promise<PollResponseDto> {
    const poll = await prisma.poll.findFirst({
      where: { id: pollId, deleted: false },
      include: { options: true },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can update this poll');
    }

    if (poll.status !== 'DRAFT') {
      throw new ForbiddenException(
        'Cannot update a poll that is not in DRAFT status',
      );
    }

    // Update poll fields
    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.description !== undefined)
      updateData.description = dto.description?.trim() || null;
    if (dto.visibilityMode !== undefined)
      updateData.visibilityMode = dto.visibilityMode;
    if (dto.allowMultipleAnswers !== undefined)
      updateData.allowMultipleAnswers = dto.allowMultipleAnswers;

    await prisma.$transaction(async (tx) => {
      // Update poll
      if (Object.keys(updateData).length > 0) {
        await tx.poll.update({
          where: { id: pollId },
          data: updateData,
        });
      }

      // Update options if provided
      if (dto.options !== undefined) {
        // Delete existing options
        await tx.pollOption.updateMany({
          where: { pollId },
          data: { deleted: true },
        });

        // Create new options
        await tx.pollOption.createMany({
          data: dto.options.map((opt, index) => ({
            pollId,
            text: opt.text.trim(),
          })),
        });
      }
    });

    return this.getPoll(pollId, userId);
  }

  async closePoll(pollId: string, userId: number): Promise<PollResponseDto> {
    const poll = await prisma.poll.findFirst({
      where: { id: pollId, deleted: false },
      include: { options: true },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can close this poll');
    }

    if (poll.status === 'CLOSED') {
      throw new BadRequestException('Poll is already closed');
    }

    await prisma.poll.update({
      where: { id: pollId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    return this.getPoll(pollId, userId);
  }

  async deletePoll(pollId: string, userId: number): Promise<void> {
    const poll = await prisma.poll.findFirst({
      where: { id: pollId, deleted: false },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete this poll');
    }

    // Soft delete
    await prisma.poll.update({
      where: { id: pollId },
      data: { deleted: true },
    });
  }

  async listPolls(
    userId: number,
    page: number = 1,
    limit: number = 20,
    themeIds?: string[],
    voterId?: number,
    ownerId?: number,
  ): Promise<{
    data: PollResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: any = { deleted: false };

    // Filter by theme
    if (themeIds && themeIds.length > 0) {
      where.themes = {
        some: {
          themeId: { in: themeIds },
        },
      };
    }

    // Filter by owner
    if (ownerId) {
      where.ownerId = ownerId;
    }

    // Filter by voter participation
    if (voterId) {
      where.votes = {
        some: {
          participantId: voterId,
          deleted: false,
        },
      };
    }

    // Only show polls user has access to (owned or open/transparent)
    if (userId) {
      where.OR = [
        { ownerId },
        {
          status: 'OPEN',
          visibilityMode: { in: ['TRANSPARENT', 'ANONYMOUS'] },
        },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.poll.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, email: true, name: true },
          },
          options: {
            where: { deleted: false },
            orderBy: { id: 'asc' },
          },
          themes: {
            include: {
              theme: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      }),
      prisma.poll.count({ where }),
    ]);

    return {
      data: data.map(this.toPollResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ===========================================================================
  // VOTE OPERATIONS
  // ===========================================================================

  async castVote(
    pollId: string,
    userId: number,
    dto: CastVoteDto,
  ): Promise<VoteResponseDto> {
    const poll = await prisma.poll.findFirst({
      where: { id: pollId, deleted: false },
      include: {
        options: {
          where: { deleted: false },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (!this.canUserVoteInPoll(poll, userId)) {
      throw new ForbiddenException('You cannot vote in this poll');
    }

    // Find the option
    const option = poll.options.find((opt) => opt.id === dto.optionId);
    if (!option) {
      throw new NotFoundException('Poll option not found');
    }

    // Check if poll is open
    if (poll.status !== 'OPEN') {
      throw new BadRequestException('Poll is not open for voting');
    }

    // Check for existing vote (idempotency)
    const existingVote = await prisma.vote.findFirst({
      where: {
        pollId,
        participantId: userId,
        deleted: false,
      },
    });

    await prisma.$transaction(async (tx) => {
      if (existingVote) {
        // Update existing vote (change selection)
        await tx.vote.update({
          where: { id: existingVote.id },
          data: {
            optionId: dto.optionId,
            updatedAt: new Date(),
          },
        });

        // Decrement old option count, increment new
        await tx.pollOption.update({
          where: { id: existingVote.optionId },
          data: { voteCount: { decrement: 1 } },
        });
      } else {
        // Create new vote
        await tx.vote.create({
          data: {
            pollId,
            participantId: userId,
            optionId: dto.optionId,
          },
        });
      }

      // Increment option vote count
      await tx.pollOption.update({
        where: { id: dto.optionId },
        data: { voteCount: { increment: 1 } },
      });
    });

    // Return updated vote info
    const updatedOption = await prisma.pollOption.findUnique({
      where: { id: dto.optionId },
    });

    return {
      id: existingVote?.id || '', // Would need to fetch the new vote ID
      pollId,
      optionId: dto.optionId,
      optionText: option.text,
      optionVoteCount: updatedOption?.voteCount || 0,
      pollStatus: poll.status,
    };
  }

  async getUserVote(
    pollId: string,
    userId: number,
  ): Promise<{ optionId: number } | null> {
    const vote = await prisma.vote.findFirst({
      where: {
        pollId,
        participantId: userId,
        deleted: false,
      },
      select: { optionId: true },
    });

    return vote || null;
  }

  async removeVote(pollId: string, userId: number): Promise<void> {
    const vote = await prisma.vote.findFirst({
      where: {
        pollId,
        participantId: userId,
        deleted: false,
      },
    });

    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    await prisma.$transaction(async (tx) => {
      // Soft delete vote
      await tx.vote.update({
        where: { id: vote.id },
        data: { deleted: true },
      });

      // Decrement option count
      await tx.pollOption.update({
        where: { id: vote.optionId },
        data: { voteCount: { decrement: 1 } },
      });
    });
  }

  // ===========================================================================
  // THEME MANAGEMENT
  // ===========================================================================

  async createTheme(
    ownerId: number,
    dto: { name: string; slug: string; description?: string },
  ): Promise<ThemeResponseDto> {
    // Only admins can create themes (for now, allow any authenticated user)
    const theme = await prisma.theme.create({
      data: {
        name: dto.name.trim(),
        slug: dto.slug.trim().toLowerCase(),
        description: dto.description?.trim() || null,
      },
    });

    return this.toThemeResponse(theme);
  }

  async listThemes(): Promise<ThemeResponseDto[]> {
    const themes = await prisma.theme.findMany({
      where: { deleted: false },
      orderBy: { name: 'asc' },
    });

    return themes.map(this.toThemeResponse);
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private canUserViewPoll(poll: any, userId?: number): boolean {
    // Owner can always view
    if (userId && poll.ownerId === userId) {
      return true;
    }

    // Deleted polls cannot be viewed
    if (poll.deleted) {
      return false;
    }

    // Draft polls are only visible to owner
    if (poll.status === 'DRAFT') {
      return false;
    }

    // Open polls: visibility rules apply
    if (poll.status === 'OPEN') {
      if (poll.visibilityMode === 'PRIVATE') {
        return false; // Private polls only visible to owner and participants
      }
      // TRANSPARENT and ANONYMOUS are publicly viewable while open
      return true;
    }

    // Closed polls: visibility rules apply
    if (poll.status === 'CLOSED') {
      if (poll.visibilityMode === 'PRIVATE') {
        return false;
      }
      return true;
    }

    return false;
  }

  private canUserVoteInPoll(poll: any, userId: number): boolean {
    // Must be authenticated
    if (!userId) {
      return false;
    }

    // Owner can vote in their own poll
    if (poll.ownerId === userId) {
      return true;
    }

    // Only open polls accept votes
    if (poll.status !== 'OPEN') {
      return false;
    }

    // Private polls: only invited participants (simplified: allow if you have a vote record)
    if (poll.visibilityMode === 'PRIVATE') {
      // In a full implementation, check share link or participant list
      // For now, allow if they haven't voted yet
      return true;
    }

    return true;
  }

  private toPollResponse(poll: any): PollResponseDto {
    return {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      ownerId: poll.ownerId,
      status: poll.status,
      visibilityMode: poll.visibilityMode,
      allowMultipleAnswers: poll.allowMultipleAnswers,
      openedAt: poll.openedAt,
      closedAt: poll.closedAt,
      createdAt: poll.createdAt,
      updatedAt: poll.updatedAt,
      options: poll.options.map((opt: any) => ({
        id: opt.id,
        text: opt.text,
        voteCount: opt.voteCount,
      })),
      themes: poll.themes.map((pt: any) => ({
        id: pt.theme.id,
        name: pt.theme.name,
        slug: pt.theme.slug,
      })),
    };
  }

  private toThemeResponse(theme: any): ThemeResponseDto {
    return {
      id: theme.id,
      name: theme.name,
      slug: theme.slug,
      description: theme.description,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    };
  }
}
