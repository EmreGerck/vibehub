import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Shape of `request.user` after the global `JwtAuthGuard` runs.
 *
 * Matches `jwt.strategy.ts` `validate()` — the DB user fetched by JWT `sub`.
 * Keep this in sync with the `select` clause in that strategy.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
