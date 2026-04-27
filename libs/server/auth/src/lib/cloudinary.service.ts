import { Inject, Injectable, Logger } from '@nestjs/common';
import { v2 as Cloudinary, type UploadApiResponse } from 'cloudinary';

export const CLOUDINARY = 'CLOUDINARY';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(
    @Inject(CLOUDINARY) private readonly cloudinary: typeof Cloudinary,
  ) {}

  async uploadAvatar(
    userId: number,
    buffer: Buffer,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Cloudinary upload timed out')), 30_000);

      this.cloudinary.uploader
        .upload_stream(
          {
            folder: 'avatars',
            public_id: `user_${userId}`,
            overwrite: true,
            transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
            resource_type: 'image',
          },
          (error, result) => {
            clearTimeout(timeout);
            if (error || !result) {
              this.logger.error('Cloudinary upload failed', error);
              reject(error ?? new Error('Upload returned no result'));
            } else {
              resolve(result);
            }
          },
        )
        .end(buffer);
    });
  }
}
