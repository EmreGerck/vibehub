import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { CodedException } from './coded-exception';
import { ERROR_CODES, codeForHttpStatus } from './error-codes';
import { ErrorTrackingService } from './error-tracking.service';

// Roles that get to see the raw internal message in error responses (vendors
// and admins need actionable detail; external customers do not).
const INTERNAL_ROLES = new Set(['GOD_USER', 'ADMIN', 'VENDOR_OWNER', 'VENDOR_STAFF']);

const SUPPORT_MESSAGE_TR =
  'Bir hata oluştu. Destek ekibimize bu kodu iletin.';

@Catch()
export class ErrorTrackingFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorTrackingFilter.name);

  constructor(private readonly tracker: ErrorTrackingService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { user?: { id?: string; role?: string } }>();
    const res = ctx.getResponse<Response>();

    let errorCode = 'VH-9999';
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let internalMessage = 'Internal error';
    let stack: string | undefined;
    let context: Record<string, unknown> = {};

    if (exception instanceof CodedException) {
      errorCode = exception.errorCode;
      httpStatus = exception.getStatus();
      internalMessage = ERROR_CODES[errorCode]?.internalDescription ?? exception.message;
      stack = exception.stack;
      context = exception.context;
    } else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      errorCode = codeForHttpStatus(httpStatus);
      const r = exception.getResponse() as any;
      internalMessage =
        typeof r === 'string' ? r : r?.message ?? exception.message;
      stack = exception.stack;
    } else if (exception instanceof Error) {
      errorCode = 'VH-9999';
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      internalMessage = exception.message;
      stack = exception.stack;
    }

    const traceId = randomUUID();
    const def = ERROR_CODES[errorCode];

    // Capture before responding so the user always has a row to reference.
    this.tracker.capture({
      errorCode,
      traceId,
      userId: req.user?.id ?? null,
      route: req.originalUrl ?? req.url ?? 'unknown',
      method: req.method ?? 'unknown',
      statusCode: httpStatus,
      payloadSnapshot: { body: req.body, query: req.query, params: req.params, context },
      message: internalMessage,
      stack,
      userAgent: (req.headers?.['user-agent'] as string) ?? null,
      ipAddress: (req.ip || (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]) ?? null,
    });

    // Log the 5xx case so it shows in container logs even before admin opens the UI.
    if (httpStatus >= 500) {
      this.logger.error(
        `${errorCode} ${req.method} ${req.url} — ${internalMessage}`,
        stack,
      );
    }

    const isInternalUser = INTERNAL_ROLES.has(req.user?.role ?? '');
    const supportMessage = def?.userMessage ?? SUPPORT_MESSAGE_TR;
    // Internal users (admins, vendors) need the raw text to act on; external
    // users only see a generic support hint and the code+trace they should
    // report. `message` is duplicated for backward-compat with existing UI
    // code that reads `err.response.data.message`.
    const messageForClient = isInternalUser ? internalMessage : supportMessage;

    res.status(httpStatus).json({
      success: false,
      errorCode,
      traceId,
      supportMessage,
      message: messageForClient,
      ...(isInternalUser && { internalMessage }),
    });
  }
}
