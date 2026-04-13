import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@libs/server-data-access';
import { PollService } from './poll.service';

jest.mock('@libs/server-data-access', () => ({
  prisma: {
    poll: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    pollShareLink: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    vote: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

type PrismaMock = {
  poll: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  pollShareLink: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  vote: {
    findUnique: jest.Mock;
    create: jest.Mock;
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

const SHARE_LINK = {
  id: 'link-1',
  pollId: 'poll-1',
  token: 'token-abc',
  status: 'ACTIVE' as const,
  expiresAt: null,
  createdAt: new Date('2026-01-01'),
};

const POLL_WITH_VOTE_COUNTS = {
  ...POLL_WITH_OPTIONS,
  options: [
    {
      id: 'opt-1',
      text: 'React',
      order: 0,
      createdAt: new Date('2026-01-01'),
      _count: { votes: 3 },
    },
    {
      id: 'opt-2',
      text: 'Vue',
      order: 1,
      createdAt: new Date('2026-01-01'),
      _count: { votes: 1 },
    },
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
  // listOwn
  // ---------------------------------------------------------------------------

  describe('listOwn', () => {
    it('returns polls owned by the user ordered by createdAt desc', async () => {
      prismaMock.poll.findMany.mockResolvedValue([POLL_WITH_OPTIONS]);

      const result = await service.listOwn(1);

      expect(prismaMock.poll.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: 1 },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('poll-1');
    });

    it('returns empty array when user has no polls', async () => {
      prismaMock.poll.findMany.mockResolvedValue([]);

      const result = await service.listOwn(1);

      expect(result).toEqual([]);
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

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    it('updates title on an open poll owned by the requester', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        options: undefined,
      });
      prismaMock.poll.update.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        title: 'Updated title',
      });

      const result = await service.update('poll-1', 1, {
        title: 'Updated title',
      });

      expect(prismaMock.poll.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'poll-1' },
          data: expect.objectContaining({ title: 'Updated title' }),
        }),
      );
      expect(result.title).toBe('Updated title');
    });

    it('replaces options when options array is provided', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        options: undefined,
      });
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

      await expect(
        service.update('missing', 1, { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not the owner', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        ownerId: 99,
      });

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
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        options: undefined,
      });
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

      await expect(service.close('missing', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when requester is not the owner', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        ownerId: 99,
      });

      await expect(service.close('poll-1', 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // createShareLink
  // ---------------------------------------------------------------------------

  describe('createShareLink', () => {
    it('creates and returns a share link dto for the poll owner', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        options: undefined,
      });
      prismaMock.pollShareLink.create.mockResolvedValue(SHARE_LINK);

      const result = await service.createShareLink('poll-1', 1, {});

      expect(prismaMock.pollShareLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pollId: 'poll-1', expiresAt: null }),
        }),
      );
      expect(result.token).toBe('token-abc');
      expect(result.status).toBe('ACTIVE');
    });

    it('throws ForbiddenException when requester is not the owner', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        ownerId: 99,
      });

      await expect(service.createShareLink('poll-1', 1, {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // listShareLinks
  // ---------------------------------------------------------------------------

  describe('listShareLinks', () => {
    it('returns share links for the poll owner', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        options: undefined,
      });
      prismaMock.pollShareLink.findMany.mockResolvedValue([SHARE_LINK]);

      const result = await service.listShareLinks('poll-1', 1);

      expect(prismaMock.pollShareLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { pollId: 'poll-1' } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('link-1');
    });

    it('throws ForbiddenException when requester is not the owner', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        ownerId: 99,
      });

      await expect(service.listShareLinks('poll-1', 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // revokeShareLink
  // ---------------------------------------------------------------------------

  describe('revokeShareLink', () => {
    it('revokes an active share link', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        options: undefined,
      });
      prismaMock.pollShareLink.findUnique.mockResolvedValue(SHARE_LINK);
      prismaMock.pollShareLink.update.mockResolvedValue({
        ...SHARE_LINK,
        status: 'REVOKED',
      });

      const result = await service.revokeShareLink('poll-1', 'link-1', 1);

      expect(prismaMock.pollShareLink.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'link-1' },
          data: { status: 'REVOKED' },
        }),
      );
      expect(result.status).toBe('REVOKED');
    });

    it('throws NotFoundException when link does not exist', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        options: undefined,
      });
      prismaMock.pollShareLink.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeShareLink('poll-1', 'missing', 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when link belongs to a different poll', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        options: undefined,
      });
      prismaMock.pollShareLink.findUnique.mockResolvedValue({
        ...SHARE_LINK,
        pollId: 'other-poll',
      });

      await expect(
        service.revokeShareLink('poll-1', 'link-1', 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // castVote
  // ---------------------------------------------------------------------------

  describe('castVote', () => {
    it('creates a vote and returns results for a valid open poll', async () => {
      prismaMock.poll.findUnique
        .mockResolvedValueOnce(POLL_WITH_OPTIONS)
        .mockResolvedValueOnce(POLL_WITH_VOTE_COUNTS);
      prismaMock.vote.findUnique.mockResolvedValue(null);
      prismaMock.vote.create.mockResolvedValue({
        id: 'vote-1',
        pollId: 'poll-1',
        optionId: 'opt-1',
        participantId: 2,
        createdAt: new Date('2026-01-01'),
      });

      const result = await service.castVote('poll-1', 2, { optionId: 'opt-1' });

      expect(prismaMock.vote.create).toHaveBeenCalledWith({
        data: { pollId: 'poll-1', optionId: 'opt-1', participantId: 2 },
      });
      expect(result.pollId).toBe('poll-1');
      expect(result.totalVotes).toBe(4);
      expect(result.options[0].voteCount).toBe(3);
    });

    it('is idempotent: skips create when vote already exists', async () => {
      prismaMock.poll.findUnique
        .mockResolvedValueOnce(POLL_WITH_OPTIONS)
        .mockResolvedValueOnce(POLL_WITH_VOTE_COUNTS);
      prismaMock.vote.findUnique.mockResolvedValue({
        id: 'vote-1',
        pollId: 'poll-1',
        optionId: 'opt-1',
        participantId: 2,
        createdAt: new Date('2026-01-01'),
      });

      await service.castVote('poll-1', 2, { optionId: 'opt-1' });

      expect(prismaMock.vote.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when poll does not exist', async () => {
      prismaMock.poll.findUnique.mockResolvedValue(null);

      await expect(
        service.castVote('missing', 2, { optionId: 'opt-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when poll is not OPEN', async () => {
      prismaMock.poll.findUnique.mockResolvedValue({
        ...POLL_WITH_OPTIONS,
        status: 'CLOSED',
      });

      await expect(
        service.castVote('poll-1', 2, { optionId: 'opt-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when optionId does not belong to poll', async () => {
      prismaMock.poll.findUnique.mockResolvedValue(POLL_WITH_OPTIONS);

      await expect(
        service.castVote('poll-1', 2, { optionId: 'opt-999' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // getResults
  // ---------------------------------------------------------------------------

  describe('getResults', () => {
    it('returns vote counts and myVote for the requesting user', async () => {
      prismaMock.poll.findUnique.mockResolvedValue(POLL_WITH_VOTE_COUNTS);
      prismaMock.vote.findUnique.mockResolvedValue({
        id: 'vote-1',
        pollId: 'poll-1',
        optionId: 'opt-1',
        participantId: 2,
        createdAt: new Date('2026-01-01'),
      });

      const result = await service.getResults('poll-1', 2);

      expect(result.pollId).toBe('poll-1');
      expect(result.totalVotes).toBe(4);
      expect(result.options).toHaveLength(2);
      expect(result.myVote).toEqual({ optionId: 'opt-1' });
    });

    it('returns myVote: null when user has not voted', async () => {
      prismaMock.poll.findUnique.mockResolvedValue(POLL_WITH_VOTE_COUNTS);
      prismaMock.vote.findUnique.mockResolvedValue(null);

      const result = await service.getResults('poll-1', 2);

      expect(result.myVote).toBeNull();
    });

    it('throws NotFoundException when poll does not exist', async () => {
      prismaMock.poll.findUnique.mockResolvedValue(null);

      await expect(service.getResults('missing', 2)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findByShareToken
  // ---------------------------------------------------------------------------

  describe('findByShareToken', () => {
    it('returns poll and share link for a valid active token', async () => {
      prismaMock.pollShareLink.findUnique.mockResolvedValue({
        ...SHARE_LINK,
        poll: POLL_WITH_OPTIONS,
      });

      const result = await service.findByShareToken('token-abc');

      expect(prismaMock.pollShareLink.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { token: 'token-abc' } }),
      );
      expect(result.poll.id).toBe('poll-1');
      expect(result.shareLink.token).toBe('token-abc');
    });

    it('throws NotFoundException when token does not exist', async () => {
      prismaMock.pollShareLink.findUnique.mockResolvedValue(null);

      await expect(service.findByShareToken('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when link is revoked', async () => {
      prismaMock.pollShareLink.findUnique.mockResolvedValue({
        ...SHARE_LINK,
        status: 'REVOKED',
        poll: POLL_WITH_OPTIONS,
      });

      await expect(service.findByShareToken('token-abc')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when link is expired', async () => {
      prismaMock.pollShareLink.findUnique.mockResolvedValue({
        ...SHARE_LINK,
        expiresAt: new Date('2020-01-01'),
        poll: POLL_WITH_OPTIONS,
      });

      await expect(service.findByShareToken('token-abc')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
