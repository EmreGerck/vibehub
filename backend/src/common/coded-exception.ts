import { HttpException } from '@nestjs/common';
import { ERROR_CODES } from './error-codes';

/**
 * Throw this anywhere a user-visible failure has a code in the registry.
 * The global ErrorTrackingFilter reads `errorCode` + `context`, writes a
 * UserErrorLog row, and responds with `{ errorCode, traceId, supportMessage }`.
 *
 * Pass `context` to enrich the captured log — it is NEVER returned to the
 * client. Use it for the actual product name, the offending field, etc.
 */
export class CodedException extends HttpException {
  readonly errorCode: string;
  readonly context: Record<string, unknown>;

  constructor(errorCode: string, context: Record<string, unknown> = {}) {
    const def = ERROR_CODES[errorCode];
    if (!def) {
      // Fall back to VH-9999 to guarantee the filter still has a registry entry.
      // Surfaced to admins via UserErrorLog so a missing code is detectable.
      super(
        { message: `Unknown error code: ${errorCode}`, errorCode: 'VH-9999' },
        500,
      );
      this.errorCode = 'VH-9999';
      this.context = { unknownCode: errorCode, ...context };
      return;
    }
    super({ message: def.internalDescription, errorCode }, def.httpStatus);
    this.errorCode = errorCode;
    this.context = context;
  }
}
