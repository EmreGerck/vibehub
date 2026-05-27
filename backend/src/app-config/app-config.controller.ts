import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AppConfigService } from './app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '../common/response.dto';

class ContactDto {
  @IsNotEmpty() @IsString() @MaxLength(100) name: string;
  @IsEmail() email: string;
  @IsNotEmpty() @IsString() @MaxLength(2000) message: string;
}

@ApiTags('AppConfig')
@Controller()
export class AppConfigController {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  @Public()
  @Get('app-config')
  @ApiOperation({ summary: 'Get all app config (mobile startup fetch)' })
  async getAll() {
    const data = await this.appConfigService.getAll();
    return ApiResponse.ok(data, 'App config retrieved');
  }

  @Public()
  @Get('app-config/:key')
  @ApiOperation({ summary: 'Get a single app config value by key' })
  async getOne(@Param('key') key: string) {
    const value = await this.appConfigService.get(key);
    if (value === null) throw new NotFoundException(`Config key '${key}' not found`);
    return ApiResponse.ok(value, 'App config value retrieved');
  }

  @ApiBearerAuth()
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Put('admin/app-config/:key')
  @ApiOperation({ summary: 'Upsert an app config value (admin only)' })
  async upsert(@Param('key') key: string, @Body() body: { value: unknown }) {
    await this.appConfigService.set(key, body.value);
    return ApiResponse.ok(null, `App config key '${key}' updated`);
  }

  /** Public contact form — sends an email to the platform support address */
  @Throttle({ default: { ttl: 3600000, limit: 5 } }) // 5 per hour per IP
  @Public()
  @Post('contact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a contact form message' })
  async submitContact(@Body() dto: ContactDto) {
    const settings = await this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    });
    const to = settings.supportEmail || 'info@vibehub.com.tr';
    await this.mail.sendGeneric(
      to,
      `[VibeHub İletişim] ${dto.name} — ${dto.email}`,
      `<h2>Yeni İletişim Mesajı</h2>
       <p><strong>İsim:</strong> ${dto.name}</p>
       <p><strong>E-posta:</strong> <a href="mailto:${dto.email}">${dto.email}</a></p>
       <hr />
       <p>${dto.message.replace(/\n/g, '<br/>')}</p>
       <hr />
       <p style="color:#888;font-size:12px">vibehub.com.tr iletişim formu aracılığıyla gönderildi.</p>`,
    );
    return ApiResponse.ok(null, 'Mesajınız gönderildi');
  }

  /** Public endpoint returning only SEO-relevant platform settings (no sensitive data) */
  @Public()
  @Get('platform/seo')
  @ApiOperation({ summary: 'Get public SEO settings (meta, OG, robots, schema)' })
  async getPublicSeo() {
    const s = await this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    });
    return ApiResponse.ok({
      metaTitle: s.metaTitle,
      metaDescription: s.metaDescription,
      ogImageUrl: s.ogImageUrl,
      twitterHandle: s.twitterHandle,
      facebookPixelId: s.facebookPixelId,
      googleTagManagerId: s.googleTagManagerId,
      robotsTxt: s.robotsTxt,
      schemaOrgJson: s.schemaOrgJson,
      platformName: s.platformName,
    }, 'SEO settings retrieved');
  }
}
