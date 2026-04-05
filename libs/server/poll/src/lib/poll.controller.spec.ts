import { BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';
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

const SHARE_LINK_RESPONSE = {
  id: 'link-1',
  pollId: 'poll-1',
  token: 'token-abc',
  status: 'ACTIVE' as const,
  expiresAt: null,
  createdAt: new Date('2026-01-01'),
};

describe('PollController', () => {
  let controller: PollController;
  let pollService: jest.Mocked<PollService>;

  beforeEach(() => {
    pollService = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      close: jest.fn(),
      createShareLink: jest.fn(),
      listShareLinks: jest.fn(),
      revokeShareLink: jest.fn(),
      findByShareToken: jest.fn(),
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

  // ---------------------------------------------------------------------------
  // GET /polls/join/:token
  // ---------------------------------------------------------------------------

  describe('joinByToken', () => {
    it('returns poll and shareLink for a valid token', async () => {
      pollService.findByShareToken.mockResolvedValue({
        poll: POLL_RESPONSE,
        shareLink: SHARE_LINK_RESPONSE,
      });

      const result = await controller.joinByToken('token-abc');

      expect(pollService.findByShareToken).toHaveBeenCalledWith('token-abc');
      expect(result.poll.id).toBe('poll-1');
      expect(result.shareLink.token).toBe('token-abc');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /polls/:id/share-links
  // ---------------------------------------------------------------------------

  describe('listShareLinks', () => {
    it('returns share links for the poll owner', async () => {
      pollService.listShareLinks.mockResolvedValue([SHARE_LINK_RESPONSE]);

      const result = await controller.listShareLinks('poll-1', CURRENT_USER);

      expect(pollService.listShareLinks).toHaveBeenCalledWith('poll-1', 1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('link-1');
    });
  });

  // ---------------------------------------------------------------------------
  // POST /polls/:id/share-links
  // ---------------------------------------------------------------------------

  describe('createShareLink', () => {
    it('creates a share link and returns the dto', async () => {
      pollService.createShareLink.mockResolvedValue(SHARE_LINK_RESPONSE);

      const result = await controller.createShareLink(
        'poll-1',
        {},
        CURRENT_USER,
      );

      expect(pollService.createShareLink).toHaveBeenCalledWith('poll-1', 1, {});
      expect(result.token).toBe('token-abc');
    });
  });

  // ---------------------------------------------------------------------------
  // POST /polls/:id/share-links/:linkId/revoke
  // ---------------------------------------------------------------------------

  describe('revokeShareLink', () => {
    it('revokes a share link and returns the updated dto', async () => {
      const revoked = { ...SHARE_LINK_RESPONSE, status: 'REVOKED' as const };
      pollService.revokeShareLink.mockResolvedValue(revoked);

      const result = await controller.revokeShareLink(
        'poll-1',
        'link-1',
        CURRENT_USER,
      );

      expect(pollService.revokeShareLink).toHaveBeenCalledWith(
        'poll-1',
        'link-1',
        1,
      );
      expect(result.status).toBe('REVOKED');
    });
  });
});
