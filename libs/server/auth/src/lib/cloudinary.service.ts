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
    buffer: Buffer,
    userId: number,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
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
