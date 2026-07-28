/**
 * Auth0 configuration, resolved once at boot and validated eagerly.
 *
 * SECURITY: `issuer` and `audience` are NOT optional. A JWT verifier that
 * skips either check will happily accept a valid, correctly-signed token
 * that was minted for a *different* application by the same tenant — or by
 * any tenant, if issuer is unchecked. Both must be asserted on every request.
 */
export interface AuthConfig {
  /** e.g. https://dev-xxxx.us.auth0.com/ — always has a trailing slash. */
  issuer: string;
  /** The Auth0 API Identifier this backend is registered as. */
  audience: string;
  /** Derived JWKS endpoint. */
  jwksUri: string;
}

export class AuthConfigError extends Error {}

/**
 * Build the auth config from the environment.
 *
 * Fails closed: if AUTH0_ISSUER_URL or AUTH0_AUDIENCE is missing we throw at
 * bootstrap rather than starting a server that cannot authenticate anyone.
 * A misconfigured deployment must not silently degrade into one that accepts
 * unverified tokens.
 */
export function loadAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthConfig {
  const rawIssuer = env.AUTH0_ISSUER_URL?.trim();
  const audience = env.AUTH0_AUDIENCE?.trim();

  if (!rawIssuer) {
    throw new AuthConfigError(
      'AUTH0_ISSUER_URL is not set. Expected e.g. https://<tenant>.us.auth0.com/',
    );
  }
  if (!audience) {
    throw new AuthConfigError(
      'AUTH0_AUDIENCE is not set. This must match the Identifier of the API ' +
        'you created in the Auth0 dashboard (Applications -> APIs).',
    );
  }

  // Auth0's `iss` claim always carries a trailing slash; normalise so that a
  // config value written without one still compares equal.
  const issuer = rawIssuer.endsWith('/') ? rawIssuer : `${rawIssuer}/`;

  if (!issuer.startsWith('https://')) {
    throw new AuthConfigError(
      `AUTH0_ISSUER_URL must be an https:// URL (got "${rawIssuer}"). ` +
        'Fetching signing keys over plaintext http would allow key substitution.',
    );
  }

  return {
    issuer,
    audience,
    jwksUri: `${issuer}.well-known/jwks.json`,
  };
}

/** DI token for the resolved config. */
export const AUTH_CONFIG = Symbol('AUTH_CONFIG');
