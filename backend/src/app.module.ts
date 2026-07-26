import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CollectionsModule } from './collections/collections.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';

@Module({
  imports: [PrismaModule, AuthModule, CollectionsModule, BookmarksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
