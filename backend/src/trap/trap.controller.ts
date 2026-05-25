import { Controller, Get, NotFoundException, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/public.decorator';
import { AuditService } from '../audit/audit.service';

/**
 * Trap routes — well-known paths that legitimate clients never request but
 * automated scanners constantly probe (looking for leaked credentials,
 * misconfigured admin panels, exposed git repos, etc.).
 *
 * Each handler:
 *   1. Audits the hit (path + IP + UA) so admins can see scan activity.
 *   2. Returns a generic 404 so the attacker can't tell the trap exists.
 *
 * Throttled aggressively so a determined scanner can't flood our audit table.
 */
@Controller()
export class TrapController {
  constructor(private readonly audit: AuditService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get([
    '.env',
    '.env.local',
    '.env.production',
    '.git/config',
    '.git/HEAD',
    'wp-admin',
    'wp-admin/setup-config.php',
    'wp-login.php',
    'phpmyadmin',
    'phpinfo.php',
    'admin/config.php',
    '.aws/credentials',
    '.ssh/id_rsa',
    'config.json',
    'docker-compose.yml',
    'backup.zip',
    'backup.sql',
    'database.sql',
  ])
  trap(@Req() req: Request): never {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';
    const ua = (req.headers['user-agent'] as string | undefined) ?? 'unknown';

    this.audit.log({
      actorId: null,
      action: 'TRAP_ROUTE_HIT',
      targetType: 'TrapRoute',
      targetId: null,
      metadata: {
        path: req.path,
        method: req.method,
        ip,
        userAgent: ua.slice(0, 300),
      },
    }).catch(() => {});

    // Same 404 the real Not-Found handler returns — don't reveal it's a trap
    throw new NotFoundException();
  }
}
