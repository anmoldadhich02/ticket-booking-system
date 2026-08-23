import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, EventStatus } from '@prisma/client';

export class CategoryPriceDto {
  @IsUUID()
  categoryId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price cannot be negative.' })
  price: number;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty({ message: 'Event title is required.' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  posterUrl?: string;

  @IsEnum(EventType, { message: 'Valid event type is required (e.g. MOVIE, CONCERT, THEATRE, SPORTS, COMEDY).' })
  eventType: EventType;

  @IsUUID('4', { message: 'Valid venue ID is required.' })
  venueId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format.' })
  date: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Start time must be in HH:MM format.' })
  startTime: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'End time must be in HH:MM format.' })
  endTime?: string;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryPriceDto)
  categoryPrices: CategoryPriceDto[];
}
