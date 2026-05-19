import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif',
  '.pdf', '.mp4', '.mov', '.mp3', '.wav',
]);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'application/pdf',
  'video/mp4', 'video/quicktime',
  'audio/mpeg', 'audio/wav',
]);

const ALLOWED_FOLDERS = new Set(['products', 'avatars', 'banners', 'media', 'general']);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = config.get('UPLOAD_DIR', './uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(
    buffer: Buffer,
    originalName: string,
    folder = 'general',
    mimeType?: string,
  ): Promise<string> {
    // Validate folder to prevent path traversal
    if (!ALLOWED_FOLDERS.has(folder)) {
      throw new BadRequestException(`Invalid upload folder: ${folder}`);
    }

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
    }

    // Validate extension
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`File type not allowed: ${ext}`);
    }

    // Validate MIME type if provided
    if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(`MIME type not allowed: ${mimeType}`);
    }

    const filename = `${uuidv4()}${ext}`;
    // Use path.resolve + verify to prevent path traversal even with valid folder name
    const folderPath = path.resolve(this.uploadDir, folder);
    if (!folderPath.startsWith(path.resolve(this.uploadDir))) {
      throw new BadRequestException('Invalid folder path');
    }

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.join(folderPath, filename);
    fs.writeFileSync(filePath, buffer);

    const relativePath = `/${folder}/${filename}`;
    this.logger.log(`File saved: ${relativePath} (${buffer.length} bytes)`);

    return relativePath;
  }

  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`File deleted: ${relativePath}`);
    }
  }

  // S3-ready: swap this implementation with AWS SDK calls later
  // The interface (saveFile/deleteFile) remains identical
  getPublicUrl(relativePath: string): string {
    return `/uploads${relativePath}`;
  }
}
