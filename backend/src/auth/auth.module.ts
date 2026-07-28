import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { AUTH_CONFIG, loadAuthConfig } from './auth.config';
import {
  JwksSigningKeyProvider,
  SigningKeyProvider,
} from './signing-key.provider';
import { UserProvisioningService } from './user-provisioning.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * AuthModule wires real Auth0 verification: RS256 access tokens validated
 * against the tenant's published JWKS, with issuer and audience asserted.
 *
 * There is deliberately NO shared-secret fallback and no "dev bypass" branch.
 * A guard that can be switched into an accept-anything mode by an environment
 * variable is one misconfigured deploy away from being the whole security
 * model. Tests instead override SigningKeyProvider with a local keypair,
 * which exercises the same verification code path.
 */
@Global()
@Module({
  imports: [
    PrismaModule,
    // No secret here — the key is supplied per-request by the guard, since
    // which key to use depends on the `kid` in the token being verified.
    JwtModule.register({ global: true }),
  ],
  providers: [
    {
      provide: AUTH_CONFIG,
      useFactory: () => loadAuthConfig(),
    },
    {
      provide: SigningKeyProvider,
      useClass: JwksSigningKeyProvider,
    },
    UserProvisioningService,
    AuthGuard,
  ],
  // Exporting so feature modules (and e2e tests) can apply the guard.
  exports: [
    AuthGuard,
    SigningKeyProvider,
    UserProvisioningService,
    AUTH_CONFIG,
  ],
})
export class AuthModule {}
