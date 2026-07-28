import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AUTH_CONFIG, AuthConfig } from './auth.config';
import { SigningKeyProvider } from './signing-key.provider';
import { UserProvisioningService } from './user-provisioning.service';

/**
 * The shape of the object placed on `request.user` after token verification.
 *
 * IMPORTANT: any code that needs the current user MUST read it from this
 * object (via `@CurrentUser()`), NEVER from a request body/param. That is
 * the structural guarantee that prevents a caller from spoofing ownerId.
 */
export interface AuthenticatedUser {
  sub: string; // Auth0 `sub` — the canonical user identifier
  email?: string;
}

/** Auth0 signs with RS256. Pinning this list is what defeats alg confusion. */
const ALLOWED_ALGORITHMS = ['RS256'] as const;

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly signingKeys: SigningKeyProvider,
    private readonly provisioning: UserProvisioningService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const payload = await this.verify(token);

    // Fail closed: a token without `sub` is malformed and MUST be rejected.
    // Downstream services rely on `.sub` being the ownerId.
    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new UnauthorizedException('Token missing subject claim');
    }

    // Materialise the User row so ownership foreign keys resolve. Must happen
    // before the handler runs, and only ever for a verified identity.
    await this.provisioning.ensureProvisioned(payload.sub, payload.email);

    // Inject authenticated user onto the request for downstream use
    // via the @CurrentUser() parameter decorator.
    (request as Request & { user: AuthenticatedUser }).user = {
      sub: payload.sub,
      email: payload.email,
    };

    return true;
  }

  /**
   * Verify an Auth0-issued access token.
   *
   * SECURITY — every one of these steps is load-bearing:
   *  1. Read `kid` from the JOSE header to pick a key. We reject tokens whose
   *     header we cannot parse, and never fall back to a default key.
   *  2. Pin `algorithms: ['RS256']`. This is defence in depth against the
   *     algorithm-confusion attack (re-signing as HS256 with the public key
   *     as the HMAC secret). Verified by experiment: jsonwebtoken v9 already
   *     rejects that case on its own with "invalid algorithm", so the pin is
   *     not currently the only thing stopping it — but it is what keeps the
   *     property from silently depending on library internals, and it also
   *     rules out any other algorithm the tenant might start issuing.
   *  3. Assert `issuer` — otherwise a token from any other Auth0 tenant,
   *     correctly signed by *that* tenant, would pass.
   *  4. Assert `audience` — otherwise a token minted for a different API in
   *     our own tenant (e.g. the userinfo endpoint) would pass.
   * Expiry (`exp`) is enforced by the library by default.
   */
  private async verify(token: string): Promise<AuthenticatedUser> {
    const kid = this.extractKid(token);

    let publicKey: string;
    try {
      publicKey = await this.signingKeys.getPublicKey(kid);
    } catch (err) {
      // An unknown kid is indistinguishable, from the caller's perspective,
      // from a bad signature — do not leak which it was. Log for operators
      // because a JWKS outage also lands here and looks identical.
      this.logger.warn(
        `Could not resolve signing key for kid="${kid}": ${(err as Error).message}`,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }

    try {
      return await this.jwtService.verifyAsync<AuthenticatedUser>(token, {
        publicKey,
        algorithms: [...ALLOWED_ALGORITHMS],
        issuer: this.config.issuer,
        audience: this.config.audience,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /** Pull `kid` out of the token header without trusting anything in it. */
  private extractKid(token: string): string {
    const decoded = this.jwtService.decode(token, { complete: true }) as {
      header?: { kid?: string; alg?: string };
    } | null;

    const kid = decoded?.header?.kid;
    if (!kid) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return kid;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
