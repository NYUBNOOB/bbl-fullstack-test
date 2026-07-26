import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

/**
 * AuthModule configures the mocked JWT infrastructure. In production this
 * is where we swap in Auth0 JWKs + OIDC verification; the AuthGuard and
 * @CurrentUser() decorator stay unchanged.
 *
 * The JWT_SECRET for testing is intentionally hardcoded (see .env.dev) so
 * the test suite can sign helper tokens. Real deployments will read the
 * Auth0 JWKS URI instead.
 */
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'bbl-dev-secret-do-not-use-in-prod',
      signOptions: { expiresIn: '30m' },
    }),
  ],
  providers: [AuthGuard],
  // Exporting so feature modules (and e2e tests) can apply the guard.
  exports: [AuthGuard],
})
export class AuthModule {}
