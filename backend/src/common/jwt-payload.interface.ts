import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  /** Email is included ONLY in short-lived MFA challenge tokens, not in access tokens.
   *  Access tokens must not carry PII beyond the minimum (sub, role, tenantId). */
  email?: string;
  role: UserRole;
  tenantId: string | null;
}
