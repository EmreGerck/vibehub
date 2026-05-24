/**
 * UploadController — POST /upload/image
 * ────────────────────────────────────────
 * Handles multipart image uploads for products, avatars, banners, etc.
 * Uses StorageService.saveFile() which is S3/R2-ready (swap implementation).
 *
 * Image-only endpoint (images/jpeg, images/png, image/webp, image/gif, image/avif).
 * Max 10 MB per file, 1 file per request.
 * Returns: { url: string } — a public URL for the uploaded file.
 */

import {
  Controller, Post, Query, UploadedFile,
  UseInterceptors, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import { ApiResponse } from '../common/response.dto';

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
]);

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

type UploadFolder = 'products' | 'avatars' | 'banners' | 'media' | 'general';
const VALID_FOLDERS: UploadFolder[] = ['products', 'avatars', 'banners', 'media', 'general'];

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(
    private readonly storage: StorageService,
    private readonly config:  ConfigService,
  ) {}

  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Post('image')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image (product, avatar, banner). Returns public URL.' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits:  { fileSize: MAX_IMAGE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (IMAGE_MIME_TYPES.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type not allowed: ${file.mimetype}`), false);
        }
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string = 'general',
  ) {
    if (!file) throw new BadRequestException('No file provided — use field name "file"');

    // Validate folder
    if (!VALID_FOLDERS.includes(folder as UploadFolder)) {
      throw new BadRequestException(`Invalid folder. Allowed: ${VALID_FOLDERS.join(', ')}`);
    }

    // Extra extension check (defence in depth)
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    if (!IMAGE_EXTENSIONS.has(`.${ext}`)) {
      throw new BadRequestException(`File extension not allowed: .${ext}`);
    }

    const relativePath = await this.storage.saveFile(
      file.buffer,
      file.originalname,
      folder,
      file.mimetype,
    );

    const baseUrl = this.config.get<string>('NEXT_PUBLIC_API_URL', 'http://localhost:3001');
    const url = `${baseUrl}/uploads${relativePath}`;

    return ApiResponse.ok(
      { url, path: relativePath, size: file.size, mimetype: file.mimetype },
      'Image uploaded',
    );
  }
}
