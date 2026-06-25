import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  async uploadFile(file: Express.Multer.File): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const response = await cloudinary.uploader.upload(base64File, {
        folder: 'trincobites',
      });
      return response;
    } catch (error) {
      throw new BadRequestException(`Cloudinary upload failed: ${error.message || error}`);
    }
  }
}
