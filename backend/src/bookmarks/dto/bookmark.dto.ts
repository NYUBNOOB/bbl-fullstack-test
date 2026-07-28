import {
  IsString,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTOs for Bookmark creation and updates.
 *
 * CRITICAL SECURITY NOTE: `ownerId` is NEVER part of the DTO. It is always
 * injected from the verified JWT via @CurrentUser(). The only foreign ID
 * the client can supply is `collectionId`, which MUST be re-validated by
 * the service layer to prove it belongs to the same owner.
 */
export class CreateBookmarkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  url: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  /** Optional target collection. Service will verify ownership. */
  @IsString()
  @IsOptional()
  collectionId?: string;
}

export class UpdateBookmarkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  /** Optional target collection. Service will verify ownership. */
  @IsString()
  @IsOptional()
  collectionId?: string | null; // null = unfile the bookmark
}
