import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryInputDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g. "VIP", "Premium", "Standard", "Economy"

  @IsString()
  @IsNotEmpty()
  color: string; // e.g. "#06b6d4"

  @IsInt()
  @IsOptional()
  displayOrder?: number;
}

export class CreateVenueDto {
  @IsString()
  @IsNotEmpty({ message: 'Venue name is required.' })
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryInputDto)
  @IsOptional()
  categories?: CategoryInputDto[];
}
