import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Just-in-time user provisioning.
 *
 * WHY THIS EXISTS: `Collection.ownerId` and `Bookmark.ownerId` are real
 * foreign keys onto `User.id`. With real Auth0 the `sub` of a first-time
 * visitor has never been seen by our database, so the very first write they
 * attempt would fail on a FK constraint. We therefore materialise a User row
 * for the verified `sub` before any request handler runs.
 *
 * SECURITY: the identity written here comes exclusively from claims on an
 * already-signature-verified token. Nothing from the request body or query
 * string reaches this code, so a caller cannot provision (or overwrite) an
 * arbitrary user record.
 */
@Injectable()
export class UserProvisioningService {
  private readonly logger = new Logger(UserProvisioningService.name);

  /**
   * Subs we have already provisioned in this process. Purely a hot-path
   * optimisation to avoid a DB round-trip per request; correctness never
   * depends on it, and a cold cache simply means one extra upsert.
   */
  private readonly known = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  async ensureProvisioned(sub: string, email?: string): Promise<void> {
    if (this.known.has(sub)) return;

    // Auth0 does not guarantee an `email` claim (e.g. a passwordless SMS
    // connection has none), but our schema marks email UNIQUE and NOT NULL.
    // Synthesise a stable, collision-free placeholder in that case rather
    // than rejecting an otherwise perfectly valid identity.
    // `||` not `??` on purpose: an empty-string claim is as unusable as a
    // missing one, and would collide on the UNIQUE index for every such user.
    const resolvedEmail = email || `${encodeURIComponent(sub)}@no-email.local`;

    try {
      await this.prisma.user.upsert({
        where: { id: sub },
        // Deliberately empty: we do NOT overwrite a stored profile on every
        // request. Auth0 remains the source of truth for identity; this row
        // exists only to satisfy the ownership foreign keys.
        update: {},
        create: { id: sub, email: resolvedEmail },
      });
      this.known.add(sub);
    } catch (err) {
      // A concurrent first request for the same brand-new sub can lose the
      // upsert race on the UNIQUE(email) index. The row exists either way,
      // so confirm and continue rather than failing the user's request.
      const exists = await this.prisma.user.findUnique({ where: { id: sub } });
      if (!exists) throw err;
      this.logger.debug(`Provisioning race resolved for ${sub}`);
      this.known.add(sub);
    }
  }
}
