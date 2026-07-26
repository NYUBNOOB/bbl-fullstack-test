import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * The shape of the object placed on `request.user` after token verification.
 * In production this will be populated by validating Auth0's JWKs; for now,
 * the JWT is a stand-in we sign ourselves for testing.
 *
 * IMPORTANT: any code that needs the current user MUST read it from this
 * object (via `@CurrentUser()`), NEVER from a request body/param. That is
 * the structural guarantee that prevents a caller from spoofing ownerId.
 */
export interface AuthenticatedUser {
  sub: string; // Auth0 `sub` — the canonical user identifier
  email?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(
        token,
      );
      // Fail closed: a token without `sub` is malformed and MUST be rejected.
      // Downstream services rely on `.sub` being the ownerId.
      if (!payload || typeof payload.sub !== 'string' || !payload.sub) {
        throw new UnauthorizedException('Token missing subject claim');
      }
      // Inject authenticated user onto the request for downstream use
      // via the @CurrentUser() parameter decorator.
      (request as any).user = payload;
    } catch (err: any) {
      // Re-throw Nest exceptions; otherwise wrap as Unauthorized
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
