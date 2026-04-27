import { Injectable } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class StorageService {
  constructor(private readonly cloudinary: CloudinaryService) {}

  async uploadAvatar(userId: number, buffer: Buffer): Promise<string> {
    const result = await this.cloudinary.uploadAvatar(userId, buffer);
    return result.secure_url;
  }
}
