import { BadRequestException } from '@nestjs/common';
import { PollController } from './poll.controller';
import type { PollService } from './poll.service';

const POLL_RESPONSE = {
  id: 'poll-1',
  title: 'Favourite framework?',
  description: undefined,
  status: 'OPEN' as const,
  ownerId: 1,
  openedAt: new Date('2026-01-01'),
  closedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  options: [
    { id: 'opt-1', text: 'React', order: 0 },
    { id: 'opt-2', text: 'Vue', order: 1 },
  ],
};

const CURRENT_USER = { id: 1, email: 'owner@example.com', name: 'Owner' };

describe('PollController', () => {
  let controller: PollController;
  let pollService: jest.Mocked<PollService>;

  beforeEach(() => {
    pollService = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<PollService>;

    controller = new PollController(pollService);
  });

  // ---------------------------------------------------------------------------
  // POST /polls
  // ---------------------------------------------------------------------------

  describe('create', () => {
    it('parses body, calls service, and returns poll dto', async () => {
      pollService.create.mockResolvedValue(POLL_RESPONSE);

      const result = await controller.create(
        { title: 'Favourite framework?', options: ['React', 'Vue'] },
        CURRENT_USER,
      );

      expect(pollService.create).toHaveBeenCalledWith(1, {
        title: 'Favourite framework?',
        options: ['React', 'Vue'],
      });
      expect(result.id).toBe('poll-1');
      expect(result.options).toHaveLength(2);
    });

    it('throws BadRequestException for invalid body (missing title)', async () => {
      await expect(
        controller.create({ options: ['A', 'B'] }, CURRENT_USER),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when fewer than 2 options provided', async () => {
      await expect(
        controller.create(
          { title: 'Poll', options: ['Only one'] },
          CURRENT_USER,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ZodError for invalid response shape from service', async () => {
      pollService.create.mockResolvedValue({
        ...POLL_RESPONSE,
        options: [],
      } as never);

      await expect(
        controller.create({ title: 'Poll', options: ['A', 'B'] }, CURRENT_USER),
      ).rejects.toBeInstanceOf(ZodError);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /polls/:id
  // ---------------------------------------------------------------------------

  describe('findById', () => {
    it('calls service with id and returns poll dto', async () => {
      pollService.findById.mockResolvedValue(POLL_RESPONSE);

      const result = await controller.findById('poll-1');

      expect(pollService.findById).toHaveBeenCalledWith('poll-1');
      expect(result.title).toBe('Favourite framework?');
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /polls/:id
  // ---------------------------------------------------------------------------

  describe('update', () => {
    it('parses body, calls service with id and user, and returns updated dto', async () => {
      const updated = { ...POLL_RESPONSE, title: 'Updated' };
      pollService.update.mockResolvedValue(updated);

      const result = await controller.update(
        'poll-1',
        { title: 'Updated' },
        CURRENT_USER,
      );

      expect(pollService.update).toHaveBeenCalledWith('poll-1', 1, {
        title: 'Updated',
      });
      expect(result.title).toBe('Updated');
    });

    it('accepts partial update body (only description)', async () => {
      pollService.update.mockResolvedValue(POLL_RESPONSE);

      await controller.update(
        'poll-1',
        { description: 'New desc' },
        CURRENT_USER,
      );

      expect(pollService.update).toHaveBeenCalledWith('poll-1', 1, {
        description: 'New desc',
      });
    });

    it('throws BadRequestException when options array has fewer than 2 items', async () => {
      await expect(
        controller.update('poll-1', { options: ['solo'] }, CURRENT_USER),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /polls/:id/close
  // ---------------------------------------------------------------------------

  describe('close', () => {
    it('calls service with id and user, and returns closed poll dto', async () => {
      const closed = {
        ...POLL_RESPONSE,
        status: 'CLOSED' as const,
        closedAt: new Date(),
      };
      pollService.close.mockResolvedValue(closed);

      const result = await controller.close('poll-1', CURRENT_USER);

      expect(pollService.close).toHaveBeenCalledWith('poll-1', 1);
      expect(result.status).toBe('CLOSED');
    });
  });
});
