import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

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
  ): Promise<string> {
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const folderPath = path.join(this.uploadDir, folder);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.join(folderPath, filename);
    fs.writeFileSync(filePath, buffer);

    const relativePath = `/${folder}/${filename}`;
    this.logger.log(`File saved: ${relativePath}`);

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
