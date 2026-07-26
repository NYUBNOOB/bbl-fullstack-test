import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from './auth.guard';

/**
 * Parameter decorator that extracts the AuthenticatedUser for the current
 * request. Guarantees a non-null, verified identity — if this returns
 * anything at all, the AuthGuard has already accepted the token.
 *
 * Usage: `@CurrentUser() user: AuthenticatedUser`
 * Access: `user.sub` is the ownerId — pass it to every Prisma where clause.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    return data ? user?.[data] : user;
  },
);
