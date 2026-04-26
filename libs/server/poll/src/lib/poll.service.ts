/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@libs/server-data-access';
import type {
  CastVoteDto,
  CreatePollDto,
  CreateShareLinkDto,
  JoinPollResponseDto,
  PaginatedResponseDto,
  PollListQueryDto,
  PollResponseDto,
  PollResultsDto,
  ShareLinkResponseDto,
  UpdatePollDto,
} from '@libs/shared-dto';
import { PollStreamService } from './poll-stream.service';

@Injectable()
export class PollService {
  private readonly logger = new Logger(PollService.name);

  constructor(private readonly pollStreamService: PollStreamService) {}

  async create(ownerId: number, dto: CreatePollDto): Promise<PollResponseDto> {
    const poll = await prisma.poll.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        status: 'OPEN',
        visibilityMode: dto.visibilityMode ?? 'PRIVATE',
        allowMultipleAnswers: dto.allowMultipleAnswers ?? false,
        ownerId,
        openedAt: new Date(),
        options: {
          create: dto.options.map((text, index) => ({ text, order: index })),
        },
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    this.logger.log(`Poll created: ${poll.id} by user ${ownerId}`);
    return this.toDto(poll);
  }

  async listOwn(
    ownerId: number,
    query: PollListQueryDto = { page: 1, limit: 20 },
  ): Promise<PaginatedResponseDto<PollResponseDto>> {
    const { page, limit, status, from, to } = query;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {
      ownerId,
      ...(status ? { status } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [polls, total] = await Promise.all([
      prisma.poll.findMany({
        where,
        include: {
          options: { orderBy: { order: 'asc' } },
          _count: { select: { votes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.poll.count({ where }),
    ]);

    return {
      data: polls.map((p) => this.toDto(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<PollResponseDto> {
    const poll = await prisma.poll.findUnique({
      where: { id },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    if (!poll) {
      throw new NotFoundException(`Poll ${id} not found`);
    }

    return this.toDto(poll);
  }

  async update(
    id: string,
    requesterId: number,
    dto: UpdatePollDto,
  ): Promise<PollResponseDto> {
    const poll = await this.requireOwner(id, requesterId);

    if (poll.status === 'CLOSED') {
      throw new ForbiddenException('Cannot update a closed poll');
    }

    const updated = await prisma.poll.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        ...(dto.options
          ? {
              options: {
                deleteMany: {},
                create: dto.options.map((text, index) => ({
                  text,
                  order: index,
                })),
              },
            }
          : {}),
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    this.logger.log(`Poll updated: ${updated.id} by user ${requesterId}`);
    return this.toDto(updated);
  }

  async close(id: string, requesterId: number): Promise<PollResponseDto> {
    await this.requireOwner(id, requesterId);

    const closed = await prisma.poll.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    this.logger.log(`Poll closed: ${id} by user ${requesterId}`);

    this.pollStreamService
      .publish(id, { type: 'closed', data: { pollId: id } })
      .catch((err) => this.logger.error(`Stream publish failed: ${err}`));

    return this.toDto(closed);
  }

  async createShareLink(
    pollId: string,
    ownerId: number,
    dto: CreateShareLinkDto,
  ): Promise<ShareLinkResponseDto> {
    await this.requireOwner(pollId, ownerId);

    const link = await prisma.pollShareLink.create({
      data: {
        pollId,
        expiresAt: dto.expiresAt ?? null,
      },
    });

    this.logger.log(`Share link created: ${link.id} for poll ${pollId}`);
    return this.toShareLinkDto(link);
  }

  async listShareLinks(
    pollId: string,
    ownerId: number,
  ): Promise<ShareLinkResponseDto[]> {
    await this.requireOwner(pollId, ownerId);

    const links = await prisma.pollShareLink.findMany({
      where: { pollId },
      orderBy: { createdAt: 'desc' },
    });

    return links.map((l) => this.toShareLinkDto(l));
  }

  async revokeShareLink(
    pollId: string,
    linkId: string,
    ownerId: number,
  ): Promise<ShareLinkResponseDto> {
    await this.requireOwner(pollId, ownerId);

    const link = await prisma.pollShareLink.findUnique({
      where: { id: linkId },
    });

    if (!link || link.pollId !== pollId) {
      throw new NotFoundException(`Share link ${linkId} not found`);
    }

    const revoked = await prisma.pollShareLink.update({
      where: { id: linkId },
      data: { status: 'REVOKED' },
    });

    this.logger.log(`Share link revoked: ${linkId} for poll ${pollId}`);
    return this.toShareLinkDto(revoked);
  }

  async findByShareToken(token: string): Promise<JoinPollResponseDto> {
    const link = await prisma.pollShareLink.findUnique({
      where: { token },
      include: {
        poll: { include: { options: { orderBy: { order: 'asc' } } } },
      },
    });

    if (!link) {
      throw new NotFoundException('Share link not found');
    }

    if (link.status === 'REVOKED') {
      throw new ForbiddenException('This share link has been revoked');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new ForbiddenException('This share link has expired');
    }

    return {
      poll: this.toDto(link.poll),
      shareLink: this.toShareLinkDto(link),
    };
  }

  async castVote(
    pollId: string,
    participantId: number,
    dto: CastVoteDto,
  ): Promise<PollResultsDto> {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });

    if (!poll) {
      throw new NotFoundException(`Poll ${pollId} not found`);
    }

    if (poll.status !== 'OPEN') {
      throw new ForbiddenException('Poll is not open for voting');
    }

    const optionExists = poll.options.some((o) => o.id === dto.optionId);
    if (!optionExists) {
      throw new BadRequestException('Invalid option for this poll');
    }

    if (poll.allowMultipleAnswers) {
      // Multi-select: idempotent create — one vote per option per participant
      await prisma.vote.upsert({
        where: {
          pollId_participantId_optionId: {
            pollId,
            participantId,
            optionId: dto.optionId,
          },
        },
        create: { pollId, optionId: dto.optionId, participantId },
        update: {},
      });
    } else {
      // Single-select: replace any existing vote with the new selection
      await prisma.$transaction([
        prisma.vote.deleteMany({ where: { pollId, participantId } }),
        prisma.vote.create({
          data: { pollId, optionId: dto.optionId, participantId },
        }),
      ]);
    }

    const results = await this.getResults(pollId, participantId);

    // Publish to stream subscribers (fire-and-forget; don't block the response)
    this.pollStreamService
      .publish(pollId, { type: 'results', data: results })
      .catch((err) => this.logger.error(`Stream publish failed: ${err}`));

    return results;
  }

  async deleteVote(
    pollId: string,
    participantId: number,
    optionId: string,
  ): Promise<PollResultsDto> {
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });

    if (!poll) {
      throw new NotFoundException(`Poll ${pollId} not found`);
    }

    if (poll.status !== 'OPEN') {
      throw new ForbiddenException('Poll is not open for voting');
    }

    const deleted = await prisma.vote.deleteMany({
      where: { pollId, participantId, optionId },
    });

    if (deleted.count === 0) {
      throw new BadRequestException('No vote found for this option');
    }

    const results = await this.getResults(pollId, participantId);

    this.pollStreamService
      .publish(pollId, { type: 'results', data: results })
      .catch((err) => this.logger.error(`Stream publish failed: ${err}`));

    return results;
  }

  async getResults(
    pollId: string,
    requesterId: number,
  ): Promise<PollResultsDto> {
    const isTransparent = await prisma.poll
      .findUnique({ where: { id: pollId }, select: { visibilityMode: true } })
      .then((p) => p?.visibilityMode === 'TRANSPARENT');

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { votes: true } },
            ...(isTransparent
              ? { votes: { include: { voter: { select: { id: true, name: true } } } } }
              : {}),
          },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException(`Poll ${pollId} not found`);
    }

    const myVotes = await prisma.vote.findMany({
      where: { pollId, participantId: requesterId },
      select: { optionId: true },
    });

    const totalVotes = poll.options.reduce((sum, o) => sum + o._count.votes, 0);

    return {
      pollId,
      totalVotes,
      visibilityMode: poll.visibilityMode as 'PRIVATE' | 'TRANSPARENT',
      options: poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        order: o.order,
        voteCount: o._count.votes,
        ...(isTransparent && 'votes' in o
          ? {
              voters: (
                o.votes as unknown as {
                  voter: { id: number; name: string | null };
                }[]
              ).map((v) => ({ id: v.voter.id, name: v.voter.name })),
            }
          : {}),
      })),
      myVotes: myVotes.map((v) => ({ optionId: v.optionId })),
    };
  }

  private async requireOwner(id: string, requesterId: number) {
    const poll = await prisma.poll.findUnique({ where: { id } });

    if (!poll) {
      throw new NotFoundException(`Poll ${id} not found`);
    }

    if (poll.ownerId !== requesterId) {
      throw new ForbiddenException(
        'Only the poll owner can perform this action',
      );
    }

    return poll;
  }

  private toShareLinkDto(link: {
    id: string;
    pollId: string;
    token: string;
    status: 'ACTIVE' | 'REVOKED';
    expiresAt: Date | null;
    createdAt: Date;
  }): ShareLinkResponseDto {
    return {
      id: link.id,
      pollId: link.pollId,
      token: link.token,
      status: link.status,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    };
  }

  private toDto(poll: {
    id: string;
    title: string;
    description: string | null;
    status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'LOCKED';
    visibilityMode: 'PRIVATE' | 'TRANSPARENT';
    allowMultipleAnswers: boolean;
    ownerId: number;
    openedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    options: { id: string; text: string; order: number; createdAt: Date }[];
    _count?: { votes: number };
  }): PollResponseDto {
    return {
      id: poll.id,
      title: poll.title,
      description: poll.description ?? undefined,
      status: poll.status,
      visibilityMode: poll.visibilityMode,
      allowMultipleAnswers: poll.allowMultipleAnswers,
      ownerId: poll.ownerId,
      openedAt: poll.openedAt,
      closedAt: poll.closedAt,
      createdAt: poll.createdAt,
      updatedAt: poll.updatedAt,
      options: poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        order: o.order,
      })),
      totalVotes: poll._count?.votes,
    };
  }

  async reportPoll(
    pollId: string,
    voteId: string | undefined,
    reporterId: number,
    dto: {
      reason: 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'DUPLICATE';
      details?: string;
    },
  ): Promise<void> {
    await prisma.moderationReport.create({
      data: {
        pollId,
        voteId: voteId ?? null,
        reason: dto.reason as any,
        details: dto.details ?? null,
        reporterId,
      },
    });
    this.logger.log(`Poll ${pollId} reported by user ${reporterId}`);
  }

  async lockPoll(pollId: string, actorId: number): Promise<PollResponseDto> {
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Poll not found');
    if (poll.ownerId !== actorId) {
      throw new ForbiddenException('Only owner can lock poll');
    }

    await prisma.poll.update({
      where: { id: pollId },
      data: { status: 'LOCKED' },
    });
    await prisma.moderationLog.create({
      data: {
        action: 'LOCK',
        targetType: 'poll',
        targetId: pollId,
        actorId,
      },
    });
    this.logger.log(`Poll ${pollId} locked by user ${actorId}`);
    return this.findById(pollId);
  }

  async deletePoll(pollId: string, actorId: number): Promise<void> {
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Poll not found');
    if (poll.ownerId !== actorId) {
      throw new ForbiddenException('Only owner can delete poll');
    }

    await prisma.poll.delete({ where: { id: pollId } });
    await prisma.moderationLog.create({
      data: {
        action: 'DELETE',
        targetType: 'poll',
        targetId: pollId,
        actorId,
      },
    });
    this.logger.log(`Poll ${pollId} deleted by user ${actorId}`);
  }
}
