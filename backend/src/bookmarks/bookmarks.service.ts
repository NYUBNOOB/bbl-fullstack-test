import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookmarkDto, UpdateBookmarkDto } from './dto/bookmark.dto';

/**
 * BookmarksService — every Prisma query HERE includes ownerId filtering.
 *
 * SECURITY INVARIANT:
 *   When linking a bookmark to a collection, we MUST verify the collection
 *   belongs to the SAME owner. We do this via a compound relation:
 *     collection: { connect: { id_collectionId_ownerId: { ... } } }
 *   OR by a pre-flight findFirst({ id, ownerId }). Either way, the compound
 *   FK in the DB is the last line of defence.
 */
@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.bookmark.findMany({
      where: { ownerId: userId },
      include: { collection: true }, // include so client can render collection name
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(id: string, userId: string) {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: { id, ownerId: userId },
      include: { collection: true },
    });
    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }
    return bookmark;
  }

  /**
   * Create a bookmark. If `collectionId` is supplied, verify it belongs to
   * the SAME userId — otherwise reject with BadRequest. This prevents
   * User A from filing their bookmark into User B's collection.
   */
  async createForUser(userId: string, dto: CreateBookmarkDto) {
    if (dto.collectionId) {
      await this.verifyCollectionOwnership(userId, dto.collectionId);
    }

    try {
      return await this.prisma.bookmark.create({
        data: {
          ownerId: userId, // from token, never from client
          title: dto.title,
          url: dto.url,
          notes: dto.notes,
          // Pass collectionId directly (unchecked variant avoids the
          // checked/unchecked union conflict with `connect`).
          collectionId: dto.collectionId,
        },
        include: { collection: true },
      });
    } catch (err) {
      // If the compound FK rejects (collectionId exists but not owned by
      // userId), Prisma will throw P2014/P2003. We surface a generic
      // BadRequest rather than leak DB internals.
      this.rethrowForeignKeyViolation(err);
      throw err;
    }
  }

  /**
   * Update a bookmark. If `collectionId` is supplied (even an unchanged
   * one), re-verify ownership. If set to null, that un-files it (no
   * ownership check needed — removing a relation is always safe).
   */
  async updateForUser(id: string, userId: string, dto: UpdateBookmarkDto) {
    // Verify bookmark exists and is owned
    await this.findOneForUser(id, userId);

    // If re-targeting a collection, verify ownership
    if (dto.collectionId) {
      await this.verifyCollectionOwnership(userId, dto.collectionId);
    }

    // Build the update payload. We use the "unchecked" variant
    // (BookmarkUncheckedUpdateInput) because the checked variant's
    // { disconnect: true } on a compound FK would try to null BOTH
    // collectionId AND ownerId — but ownerId is non-nullable, triggering
    // P2011. Setting collectionId directly avoids that footgun.
    const data: Prisma.BookmarkUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (
      dto.collectionId === null ||
      (dto.collectionId === undefined && false)
    ) {
      // Explicitly unfile: set FK to null.
      data.collectionId = null;
    } else if (dto.collectionId) {
      // Re-target to a different owned collection.
      data.collectionId = dto.collectionId;
    }

    try {
      return await this.prisma.bookmark.update({
        where: { id, ownerId: userId },
        data,
        include: { collection: true },
      });
    } catch (err) {
      this.rethrowForeignKeyViolation(err);
      throw err;
    }
  }

  async deleteForUser(id: string, userId: string) {
    // Verify ownership first (so 404 applies to non-owned records)
    await this.findOneForUser(id, userId);

    await this.prisma.bookmark.delete({
      where: { id, ownerId: userId },
    });
    return { deleted: true };
  }

  /**
   * Verify (id belongs to userId) in the Collection table. Throws
   * BadRequest if the collection exists but belongs to a DIFFERENT user,
   * or NotFound if it doesn't exist at all. We deliberately use the same
   * not-found / forbidden shape so as not to leak enumeration info:
   * in both cases we throw BadRequest with a generic message.
   */
  private async verifyCollectionOwnership(
    userId: string,
    collectionId: string,
  ) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId },
      select: { ownerId: true },
    });
    if (!collection || collection.ownerId !== userId) {
      // Don't distinguish — telling the caller which case is an
      // information leak. Just reject the cross-owner link.
      throw new BadRequestException('Cannot link bookmark to this collection');
    }
  }

  private rethrowForeignKeyViolation(err: any): void {
    // Prisma error codes: P2014 (relation violation), P2003 (FK failure)
    if (err?.code === 'P2014' || err?.code === 'P2003') {
      throw new BadRequestException('Cannot link bookmark to this collection');
    }
  }
}
