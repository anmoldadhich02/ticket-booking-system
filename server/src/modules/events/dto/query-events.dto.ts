import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, EventStatus } from '@prisma/client';

export class QueryEventsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsString()
  venueId?: string;

  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: 'date' | 'price' | 'createdAt' = 'date';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
