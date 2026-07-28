import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { JwksClient } from 'jwks-rsa';
import { AUTH_CONFIG, AuthConfig } from './auth.config';

/**
 * Resolves the RSA public key that a given token claims to be signed with.
 *
 * This is an abstract class rather than an interface so it can be used as a
 * Nest DI token: tests bind a deterministic in-memory implementation, while
 * production binds the JWKS-backed one below. That keeps the test suite
 * offline while still exercising the real RS256 verification path.
 */
export abstract class SigningKeyProvider {
  /**
   * @param kid The `kid` from the token's JOSE header.
   * @returns PEM-encoded public key.
   * @throws if no key matches — callers MUST treat this as "reject the token".
   */
  abstract getPublicKey(kid: string): Promise<string>;
}

@Injectable()
export class JwksSigningKeyProvider
  extends SigningKeyProvider
  implements OnModuleDestroy
{
  private readonly client: JwksClient;

  constructor(@Inject(AUTH_CONFIG) config: AuthConfig) {
    super();
    this.client = new JwksClient({
      jwksUri: config.jwksUri,
      // Cache keys so we are not doing an outbound HTTPS round-trip on every
      // request. Auth0 rotates signing keys rarely; 10 minutes is the
      // conventional trade-off between rotation latency and load.
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000,
      // Bound how hard we can hammer Auth0 if we are fed a flood of tokens
      // carrying unknown `kid`s — otherwise an attacker can turn our verifier
      // into an amplifier against our own identity provider.
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      timeout: 5000,
    });
  }

  async getPublicKey(kid: string): Promise<string> {
    const key = await this.client.getSigningKey(kid);
    return key.getPublicKey();
  }

  onModuleDestroy() {
    // jwks-rsa holds no persistent handles, but keep the hook so future
    // additions (e.g. an agent-keepalive pool) have somewhere to clean up.
  }
}
