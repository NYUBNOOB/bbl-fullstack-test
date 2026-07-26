import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

/**
 * CollectionsService — every Prisma query HERE includes ownerId filtering.
 * This is the ownership enforcement layer; the controller just routes.
 */
@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all collections for a given user.
   * SECURITY: ownerId is in the WHERE clause — no cross-user bleed possible.
   */
  async findAllForUser(userId: string) {
    return this.prisma.collection.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find a single collection by ID, scoped to the authenticated user.
   * SECURITY: compound WHERE { id, ownerId } ensures User A can't read User B's.
   * Throws NotFoundException if not found — we never leak whether the record exists.
   */
  async findOneForUser(id: string, userId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id, ownerId: userId },
    });
    if (!collection) {
      // Generic 404 — do NOT distinguish "not found" from "not yours"
      throw new NotFoundException('Collection not found');
    }
    return collection;
  }

  /**
   * Create a new collection. The ownerId comes from the verified JWT, not the body.
   */
  async createForUser(userId: string, dto: CreateCollectionDto) {
    return this.prisma.collection.create({
      data: {
        ownerId: userId, // from token, never from client
        name: dto.name,
        description: dto.description,
      },
    });
  }

  /**
   * Update a collection. SECURITY: compound WHERE ensures only the owner can mutate.
   * If the collection exists but doesn't belong to userId → NotFoundException.
   */
  async updateForUser(id: string, userId: string, dto: UpdateCollectionDto) {
    // First verify ownership
    const existing = await this.prisma.collection.findFirst({
      where: { id, ownerId: userId },
    });
    if (!existing) {
      throw new NotFoundException('Collection not found');
    }

    // Then update with the same ownership check
    return this.prisma.collection.update({
      where: { id, ownerId: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  /**
   * Delete a collection. SECURITY: compound WHERE ensures only the owner can delete.
   * CASCADE delete will handle owned bookmarks automatically.
   */
  async deleteForUser(id: string, userId: string) {
    const existing = await this.prisma.collection.findFirst({
      where: { id, ownerId: userId },
    });
    if (!existing) {
      throw new NotFoundException('Collection not found');
    }

    await this.prisma.collection.delete({
      where: { id, ownerId: userId },
    });

    return { deleted: true };
  }
}
