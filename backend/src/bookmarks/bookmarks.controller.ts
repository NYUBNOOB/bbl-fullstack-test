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
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto, UpdateBookmarkDto } from './dto/bookmark.dto';
import { AuthGuard, AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

/**
 * BookmarksController — REST endpoints for /bookmarks
 *
 * Every endpoint is guarded. The ownerId comes from the verified JWT,
 * never from the request body or URL.
 */
@Controller('bookmarks')
@UseGuards(AuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.bookmarksService.findAllForUser(user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookmarksService.findOneForUser(id, user.sub);
  }

  @Post()
  async create(
    @Body() dto: CreateBookmarkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookmarksService.createForUser(user.sub, dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBookmarkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookmarksService.updateForUser(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.bookmarksService.deleteForUser(id, user.sub);
  }
}
