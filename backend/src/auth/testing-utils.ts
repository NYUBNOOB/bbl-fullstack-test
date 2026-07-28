/**
 * Helper module for TESTS ONLY. Never import this in production code.
 *
 * DESIGN: rather than weakening the guard for tests (e.g. a shared-secret
 * mode), we generate a real RSA keypair in-process and hand the public half
 * to the guard through the same `SigningKeyProvider` seam that JWKS uses in
 * production. Tests therefore mint genuine RS256 tokens and exercise the
 * exact verification path that runs against Auth0 — signature, algorithm,
 * issuer, audience and expiry checks all included — with no network access.
 */
import { generateKeyPairSync } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import { SigningKeyProvider } from './signing-key.provider';
import { AuthConfig } from './auth.config';

export const TEST_ISSUER = 'https://test-tenant.us.auth0.com/';
export const TEST_AUDIENCE = 'https://bbl-bookmarks/api';
export const TEST_KID = 'test-signing-key-1';

export const TEST_AUTH_CONFIG: AuthConfig = {
  issuer: TEST_ISSUER,
  audience: TEST_AUDIENCE,
  jwksUri: `${TEST_ISSUER}.well-known/jwks.json`,
};

/** The keypair the "tenant" signs with. */
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

export const TEST_PUBLIC_KEY = publicKey;
export const TEST_PRIVATE_KEY = privateKey;

/** A second, unrelated keypair — used to forge "correctly shaped" tokens. */
const attacker = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
export const ATTACKER_PRIVATE_KEY = attacker.privateKey;

/**
 * Stands in for JwksSigningKeyProvider. Only TEST_KID resolves; anything else
 * rejects, exactly as a real JWKS lookup would for an unpublished key.
 */
export class StaticSigningKeyProvider extends SigningKeyProvider {
  getPublicKey(kid: string): Promise<string> {
    if (kid !== TEST_KID) {
      return Promise.reject(new Error(`Unknown kid: ${kid}`));
    }
    return Promise.resolve(TEST_PUBLIC_KEY);
  }
}

export interface TestUser {
  sub: string;
  email: string;
}

export const TEST_USER_A: TestUser = {
  sub: 'auth0|user_a',
  email: 'alice@example.com',
};
export const TEST_USER_B: TestUser = {
  sub: 'auth0|user_b',
  email: 'bob@example.com',
};
export const TEST_USER_C: TestUser = {
  sub: 'auth0|user_c',
  email: 'charlie@example.com',
};

interface SignOptions {
  issuer?: string;
  audience?: string;
  kid?: string;
  expiresIn?: string | number;
  key?: string;
  omitSub?: boolean;
}

/** Mint an RS256 token. Defaults produce a token the guard should ACCEPT. */
export function signToken(user: TestUser, opts: SignOptions = {}): string {
  // Omit rather than send an empty claim, so `{ email: '' }` models the real
  // Auth0 case of a connection that provides no email at all.
  const payload: Record<string, unknown> = {};
  if (user.email) payload.email = user.email;
  if (!opts.omitSub) payload.sub = user.sub;

  return jwt.sign(payload, opts.key ?? TEST_PRIVATE_KEY, {
    algorithm: 'RS256',
    keyid: opts.kid ?? TEST_KID,
    issuer: opts.issuer ?? TEST_ISSUER,
    audience: opts.audience ?? TEST_AUDIENCE,
    expiresIn: opts.expiresIn ?? '30m',
  } as jwt.SignOptions);
}

/** Build an Authorization header value the AuthGuard will accept. */
export function bearerFor(user: TestUser, opts: SignOptions = {}): string {
  return `Bearer ${signToken(user, opts)}`;
}

/** A token with no `sub` claim — must be REJECTED. */
export function bearerWithoutSub(): string {
  return `Bearer ${signToken(TEST_USER_A, { omitSub: true })}`;
}

/** Correctly formed and signed, but by a key the tenant never published. */
export function bearerForgedKey(user: TestUser = TEST_USER_A): string {
  return `Bearer ${signToken(user, { key: ATTACKER_PRIVATE_KEY })}`;
}

/**
 * Algorithm-confusion attack: re-sign the token as HS256 using the tenant's
 * PUBLIC key as the HMAC secret. A verifier that does not pin `algorithms`
 * will treat the public key as a shared secret and accept this.
 */
export function bearerAlgConfusion(user: TestUser = TEST_USER_A): string {
  const token = jwt.sign(
    { sub: user.sub, email: user.email },
    TEST_PUBLIC_KEY,
    {
      algorithm: 'HS256',
      keyid: TEST_KID,
      issuer: TEST_ISSUER,
      audience: TEST_AUDIENCE,
      expiresIn: '30m',
    } as jwt.SignOptions,
  );
  return `Bearer ${token}`;
}

/** A token whose `alg` is "none" — the degenerate unsigned case. */
export function bearerAlgNone(user: TestUser = TEST_USER_A): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT', kid: TEST_KID }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.sub,
      iss: TEST_ISSUER,
      aud: TEST_AUDIENCE,
      exp: Math.floor(Date.now() / 1000) + 1800,
    }),
  ).toString('base64url');
  return `Bearer ${header}.${payload}.`;
}

/** Syntactically a JWT, but garbage signature. */
export const BEARER_INVALID =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdXRoMHx1c2VyX2EiLCJpYXQiOjF9.invalid_signature_marker';
