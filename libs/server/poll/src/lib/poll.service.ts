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
  PollResponseDto,
  PollResultsDto,
  ShareLinkResponseDto,
  UpdatePollDto,
} from '@libs/shared-dto';

@Injectable()
export class PollService {
  private readonly logger = new Logger(PollService.name);

  async create(ownerId: number, dto: CreatePollDto): Promise<PollResponseDto> {
    const poll = await prisma.poll.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        status: 'OPEN',
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

    const existing = await prisma.vote.findUnique({
      where: {
        pollId_participantId: { pollId, participantId },
      },
    });

    if (!existing) {
      await prisma.vote.create({
        data: { pollId, optionId: dto.optionId, participantId },
      });
    }

    return this.getResults(pollId, participantId);
  }

  async getResults(
    pollId: string,
    requesterId: number,
  ): Promise<PollResultsDto> {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { votes: true } } },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException(`Poll ${pollId} not found`);
    }

    const myVote = await prisma.vote.findUnique({
      where: { pollId_participantId: { pollId, participantId: requesterId } },
    });

    const totalVotes = poll.options.reduce((sum, o) => sum + o._count.votes, 0);

    return {
      pollId,
      totalVotes,
      options: poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        order: o.order,
        voteCount: o._count.votes,
      })),
      myVote: myVote ? { optionId: myVote.optionId } : null,
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
    status: 'DRAFT' | 'OPEN' | 'CLOSED';
    ownerId: number;
    openedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    options: { id: string; text: string; order: number; createdAt: Date }[];
  }): PollResponseDto {
    return {
      id: poll.id,
      title: poll.title,
      description: poll.description ?? undefined,
      status: poll.status,
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
    };
  }
}
