import { ConflictException, Injectable } from '@nestjs/common';
import { prisma } from '@libs/server-data-access';
import type { ThemeResponseDto } from '@libs/shared-dto';

@Injectable()
export class ThemeService {
  async list(): Promise<ThemeResponseDto[]> {
    return prisma.theme.findMany({ orderBy: { label: 'asc' } });
  }

  async create(slug: string, label: string): Promise<ThemeResponseDto> {
    const existing = await prisma.theme.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Theme with slug "${slug}" already exists`);
    }
    return prisma.theme.create({ data: { slug, label } });
  }
}
