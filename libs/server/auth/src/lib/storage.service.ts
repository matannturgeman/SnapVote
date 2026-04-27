import { Injectable } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class StorageService {
  constructor(private readonly cloudinary: CloudinaryService) {}

  async uploadAvatar(userId: number, buffer: Buffer): Promise<string> {
    const result = await this.cloudinary.uploadAvatar(userId, buffer);
    if (!result.secure_url) {
      throw new Error('Cloudinary returned no URL');
    }
    return result.secure_url;
  }
}
