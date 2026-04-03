import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@libs/server-data-access';
import type {
  CreatePollDto,
  PollResponseDto,
  UpdatePollDto,
} from '@libs/shared-dto';

@Injectable()
export class PollService {
  private readonly logger = new Logger(PollService.name);

  async create(
    ownerId: number,
    dto: CreatePollDto,
  ): Promise<PollResponseDto> {
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

  private async requireOwner(id: string, requesterId: number) {
    const poll = await prisma.poll.findUnique({ where: { id } });

    if (!poll) {
      throw new NotFoundException(`Poll ${id} not found`);
    }

    if (poll.ownerId !== requesterId) {
      throw new ForbiddenException('Only the poll owner can perform this action');
    }

    return poll;
  }

  private toDto(
    poll: {
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
    },
  ): PollResponseDto {
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
