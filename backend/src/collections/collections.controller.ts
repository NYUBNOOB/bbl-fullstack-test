import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';
import { AuthGuard, AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

/**
 * CollectionsController — REST endpoints for /collections
 *
 * ALL endpoints are protected by AuthGuard. The @CurrentUser() decorator
 * extracts the verified userId from the JWT, which is then passed to every
 * service method. This ensures no client can bypass ownership checks.
 */
@Controller('collections')
@UseGuards(AuthGuard) // Applied to all routes in this controller
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  /**
   * GET /collections
   * Returns all collections owned by the authenticated user.
   */
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.collectionsService.findAllForUser(user.sub);
  }

  /**
   * GET /collections/:id
   * Returns a single collection if it exists AND is owned by the user.
   * Returns 404 if not found or not owned (indistinguishable).
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.findOneForUser(id, user.sub);
  }

  /**
   * POST /collections
   * Creates a new collection owned by the authenticated user.
   */
  @Post()
  async create(
    @Body() dto: CreateCollectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.createForUser(user.sub, dto);
  }

  /**
   * PUT /collections/:id
   * Updates an existing collection. Only the owner can update.
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.updateForUser(id, user.sub, dto);
  }

  /**
   * DELETE /collections/:id
   * Deletes a collection and all its bookmarks (cascade).
   * Only the owner can delete.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.collectionsService.deleteForUser(id, user.sub);
  }
}
