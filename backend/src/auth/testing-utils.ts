/**
 * Helper module for TESTS ONLY — generates tokens signed by the same secret
 * the mocked AuthModule trusts. Never import this in production code.
 *
 * Used by e2e / unit tests to mint tokens for Alice, Bob, or arbitrary subs
 * so we can write adversarial "User A tries to touch User B" test cases.
 */
import { JwtService } from '@nestjs/jwt';

export interface TestUser {
  sub: string;
  email: string;
}

export const TEST_USER_A: TestUser = { sub: 'auth0|user_a', email: 'alice@example.com' };
export const TEST_USER_B: TestUser = { sub: 'auth0|user_b', email: 'bob@example.com' };
export const TEST_USER_C: TestUser = { sub: 'auth0|user_c', email: 'charlie@example.com' };

/**
 * Build an Authorization header value the AuthGuard will accept.
 * Tokens use the shared dev secret configured in AuthModule.
 */
export function bearerFor(jwtService: JwtService, user: TestUser): string {
  const signed = jwtService.sign({ sub: user.sub, email: user.email });
  return `Bearer ${signed}`;
}

/** A token that has no `sub` claim — should be REJECTED by the guard. */
export function bearerWithoutSub(jwtService: JwtService): string {
  const signed = jwtService.sign({ email: 'orphan@example.com' });
  return `Bearer ${signed}`;
}

/** A token that is syntactically a JWT but not signed by our secret. */
export const BEARER_INVALID =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdXRoMHx1c2VyX2EiLCJpYXQiOjF9.invalid_signature_marker';
