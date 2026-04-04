import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { prisma } from '@libs/server-data-access';
import { PollService } from './poll.service';

jest.mock('@libs/server-data-access', () => ({
  prisma: {
    poll: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

type PrismaMock = {
  poll: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const POLL_WITH_OPTIONS = {
  id: 'poll-1',
  title: 'Favourite framework?',
  description: null,
  status: 'OPEN' as const,
  ownerId: 1,
  openedAt: new Date('2026-01-01'),
  closedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  options: [
    { id: 'opt-1', text: 'React', order: 0, createdAt: new Date('2026-01-01') },
    { id: 'opt-2', text: 'Vue', order: 1, createdAt: new Date('2026-01-01') },
  ],
};

describe('PollService', () => {
  const prismaMock = prisma as unknown as PrismaMock;
  let service: PollService;

  beforeEach(() => {
    service = new PollService();
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create', () => {
    it('creates a poll with OPEN status and returns dto', async () => {
      prismaMock.poll.create.mockResolvedValue(POLL_WITH_OPTIONS);

      const result = await service.create(1, {
        title: 'Favourite framework?',
        options: ['React', 'Vue'],
      });

      expect(prismaMock.poll.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Favourite framework?',
            status: 'OPEN',
            ownerId: 1,
            openedAt: expect.any(Date),
            options: {
              create: [
                { text: 'React', order: 0 },
                { text: 'Vue', order: 1 },
              ],
            },
          }),
        }),
      );

      expect(result.id).toBe('poll-1');
      expect(result.status).toBe('OPEN');
      expect(result.options).toHaveLength(2);
    });

    it('maps null description to undefined in the dto', async () => {
      prismaMock.poll.create.mockResolvedValue(POLL_WITH_OPTIONS);

      const result = await service.create(1, {
        title: 'Test',
        options: ['A', 'B'],
      });

      expect(result.description).toBeUndefined();
    });

    it('passes description through when provided', async () => {
      prismaMock.poll.create.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        description: 'Some context',
      });

      const result = await service.create(1, {
        title: 'Test',
        description: 'Some context',
        options: ['A', 'B'],
      });

      expect(result.description).toBe('Some context');
    });
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------

  describe('findById', () => {
    it('returns the poll dto when found', async () => {
      prismaMock.poll.findUnique.mockResolvedValue(POLL_WITH_OPTIONS);

      const result = await service.findById('poll-1');

      expect(prismaMock.poll.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'poll-1' } }),
      );
      expect(result.title).toBe('Favourite framework?');
    });

    it('throws NotFoundException when poll does not exist', async () => {
      prismaMock.poll.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    it('updates title on an open poll owned by the requester', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({ ...POLL_WITH_OPTIONS, options: undefined });
      prismaMock.poll.update.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        title: 'Updated title',
      });

      const result = await service.update('poll-1', 1, { title: 'Updated title' });

      expect(prismaMock.poll.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'poll-1' },
          data: expect.objectContaining({ title: 'Updated title' }),
        }),
      );
      expect(result.title).toBe('Updated title');
    });

    it('replaces options when options array is provided', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({ ...POLL_WITH_OPTIONS, options: undefined });
      prismaMock.poll.update.mockResolvedValue(POLL_WITH_OPTIONS);

      await service.update('poll-1', 1, { options: ['A', 'B', 'C'] });

      expect(prismaMock.poll.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            options: {
              deleteMany: {},
              create: [
                { text: 'A', order: 0 },
                { text: 'B', order: 1 },
                { text: 'C', order: 2 },
              ],
            },
          }),
        }),
      );
    });

    it('throws NotFoundException when poll does not exist', async () => {
      prismaMock.poll.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', 1, { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when requester is not the owner', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({ ...POLL_WITH_OPTIONS, ownerId: 99 });

      await expect(service.update('poll-1', 1, { title: 'X' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when poll is already closed', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        status: 'CLOSED',
      });

      await expect(service.update('poll-1', 1, { title: 'X' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // close
  // ---------------------------------------------------------------------------

  describe('close', () => {
    it('closes an open poll owned by the requester', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({ ...POLL_WITH_OPTIONS, options: undefined });
      prismaMock.poll.update.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        status: 'CLOSED',
        closedAt: new Date(),
      });

      const result = await service.close('poll-1', 1);

      expect(prismaMock.poll.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'poll-1' },
          data: expect.objectContaining({
            status: 'CLOSED',
            closedAt: expect.any(Date),
          }),
        }),
      );
      expect(result.status).toBe('CLOSED');
    });

    it('throws NotFoundException when poll does not exist', async () => {
      prismaMock.poll.findUnique.mockResolvedValue(null);

      await expect(service.close('missing', 1)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not the owner', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({ ...POLL_WITH_OPTIONS, ownerId: 99 });

      await expect(service.close('poll-1', 1)).rejects.toThrow(ForbiddenException);
    });
  });
});
