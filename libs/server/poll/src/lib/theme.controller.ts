import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
} from '@nestjs/common';
import {
  CreateThemeDtoSchema,
  ThemeResponseDtoSchema,
  parseDto,
  type ThemeResponseDto,
} from '@libs/shared-dto';
import { ThemeService } from './theme.service';

function parseThemeDto<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown,
): T {
  try {
    return schema.parse(data);
  } catch (err: any) {
    const msg =
      err?.issues?.map((i: any) => i.message).join(', ') ??
      err?.message ??
      'Validation error';
    throw new BadRequestException(msg);
  }
}

@Controller('themes')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Get()
  async list(): Promise<ThemeResponseDto[]> {
    const themes = await this.themeService.list();
    return themes.map((t) => parseDto(ThemeResponseDtoSchema, t));
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: unknown): Promise<ThemeResponseDto> {
    const dto = parseThemeDto(CreateThemeDtoSchema, body);
    const theme = await this.themeService.create(dto.slug, dto.label);
    return parseDto(ThemeResponseDtoSchema, theme);
  }
}
