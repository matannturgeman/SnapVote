import { Injectable } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class StorageService {
  constructor(private readonly cloudinary: CloudinaryService) {}

  async uploadAvatar(buffer: Buffer, userId: number): Promise<string> {
    const result = await this.cloudinary.uploadAvatar(buffer, userId);
    return result.secure_url;
  }
}
