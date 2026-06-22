import { ConflictException } from '@nestjs/common';
import { ThemeService } from './theme.service';

const themeMock = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
};

jest.mock('@libs/server-data-access', () => ({
  prisma: {
    theme: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require('@libs/server-data-access');

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Bind to the mocked prisma.theme so assertions work
    themeMock.findMany = prisma.theme.findMany;
    themeMock.findUnique = prisma.theme.findUnique;
    themeMock.create = prisma.theme.create;
    service = new ThemeService();
  });

  describe('list', () => {
    it('returns all themes ordered by label', async () => {
      const themes = [
        { id: '1', slug: 'anime', label: 'Anime', createdAt: new Date() },
        { id: '2', slug: 'movies', label: 'Movies', createdAt: new Date() },
      ];
      prisma.theme.findMany.mockResolvedValue(themes);

      const result = await service.list();

      expect(prisma.theme.findMany).toHaveBeenCalledWith({
        orderBy: { label: 'asc' },
      });
      expect(result).toEqual(themes);
    });
  });

  describe('create', () => {
    it('creates a theme with valid slug + label', async () => {
      const theme = {
        id: '1',
        slug: 'sports',
        label: 'Sports',
        createdAt: new Date(),
      };
      prisma.theme.findUnique.mockResolvedValue(null);
      prisma.theme.create.mockResolvedValue(theme);

      const result = await service.create('sports', 'Sports');

      expect(prisma.theme.create).toHaveBeenCalledWith({
        data: { slug: 'sports', label: 'Sports' },
      });
      expect(result).toEqual(theme);
    });

    it('throws ConflictException when slug already exists', async () => {
      prisma.theme.findUnique.mockResolvedValue({
        id: '1',
        slug: 'anime',
        label: 'Anime',
        createdAt: new Date(),
      });

      await expect(service.create('anime', 'Anime')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.theme.create).not.toHaveBeenCalled();
    });
  });
});
