import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * DTOs for Collection creation and updates.
 *
 * CRITICAL: These DTOs NEVER contain an `ownerId` field. The ownerId is
 * always extracted from the verified JWT token via @CurrentUser(), never
 * from client input. This prevents ownership spoofing at the schema level.
 */
export class CreateCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}

export class UpdateCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}
