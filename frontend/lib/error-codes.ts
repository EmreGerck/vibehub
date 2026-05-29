import type { AxiosError } from 'axios';

/**
 * Shape of the body returned by the backend ErrorTrackingFilter (see
 * backend/src/common/error-tracking.filter.ts). `errorCode` + `traceId` are
 * always present; `internalMessage` only when the requester is an internal
 * user (admin or vendor).
 */
export interface CodedApiErrorBody {
  success: false;
  errorCode: string;
  traceId: string;
  supportMessage: string;
  message: string;
  internalMessage?: string;
}

export interface ParsedApiError {
  errorCode?: string;
  traceId?: string;
  supportMessage?: string;
  message: string;
  /** True when the API gave us a structured coded error. */
  isCoded: boolean;
}

/**
 * Pull the structured error fields off an axios error. Falls back to a plain
 * `{ message }` shape when the server response isn't in the new format (e.g.
 * network failure, 502 from upstream, legacy endpoint not yet behind the
 * global filter).
 */
export function parseApiError(err: unknown, fallback: string): ParsedApiError {
  const ax = err as AxiosError<Partial<CodedApiErrorBody>> | undefined;
  const body = ax?.response?.data;
  if (body && typeof body === 'object' && body.errorCode && body.traceId) {
    return {
      errorCode: body.errorCode,
      traceId: body.traceId,
      supportMessage: body.supportMessage,
      message: body.internalMessage ?? body.message ?? body.supportMessage ?? fallback,
      isCoded: true,
    };
  }
  const legacyMsg =
    (typeof body === 'object' && body && typeof body.message === 'string' && body.message) ||
    (err as Error)?.message ||
    fallback;
  return { message: legacyMsg, isCoded: false };
}
