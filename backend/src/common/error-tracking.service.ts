import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CapturePayload {
  errorCode: string;
  traceId: string;
  userId?: string | null;
  route: string;
  method: string;
  statusCode: number;
  payloadSnapshot: Record<string, unknown>;
  message?: string | null;
  stack?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

/**
 * Substring patterns redact ANY key whose lower-cased name contains the
 * pattern. This catches `password`, `ownerPassword`, `confirmPassword`,
 * `newPassword`, `accessToken`, `refreshToken`, `apiKey`, `clientSecret`,
 * etc. — the pre-fix set used exact match and missed `ownerPassword` on the
 * vendor-apply endpoint, leaking a plaintext password into the log.
 */
const SENSITIVE_SUBSTRINGS = [
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'creditcard',
  'cardnumber',
  'cvv',
];

/**
 * Exact-match keys for short common names where substring matching would
 * cause too many false positives (e.g. matching `discountCode`, `errorCode`).
 */
const SENSITIVE_EXACT = new Set([
  'code',
  'otp',
  'cookie',
  'pin',
]);

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_EXACT.has(lower)) return true;
  return SENSITIVE_SUBSTRINGS.some((p) => lower.includes(p));
}

const MAX_DEPTH = 4;
const MAX_STRING_LEN = 500;

function sanitise(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[depth-cap]';
  if (value == null) return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LEN ? value.slice(0, MAX_STRING_LEN) + '…' : value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitise(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(k)) {
      out[k] = '[redacted]';
      continue;
    }
    out[k] = sanitise(v, depth + 1);
  }
  return out;
}

@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger(ErrorTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget. Capture must NEVER block the response or surface its own
   * failure — if logging breaks, the user error itself still needs to flow.
   */
  capture(payload: CapturePayload): void {
    const safe = sanitise(payload.payloadSnapshot ?? {}) as Prisma.InputJsonValue;
    this.prisma.userErrorLog
      .create({
        data: {
          errorCode: payload.errorCode,
          traceId: payload.traceId,
          userId: payload.userId ?? null,
          route: payload.route,
          method: payload.method,
          statusCode: payload.statusCode,
          payloadSnapshot: safe,
          message: payload.message?.slice(0, 2000) ?? null,
          stack: payload.stack?.slice(0, 8000) ?? null,
          userAgent: payload.userAgent?.slice(0, 500) ?? null,
          ipAddress: payload.ipAddress?.slice(0, 64) ?? null,
        },
      })
      .catch((err: any) => {
        this.logger.error(`UserErrorLog capture failed: ${err?.message ?? err}`);
      });
  }
}
