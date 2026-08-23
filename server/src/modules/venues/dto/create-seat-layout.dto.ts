import { IsNotEmpty, IsString, IsInt, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SeatInputDto {
  @IsString()
  @IsNotEmpty()
  row: string; // e.g. "A"

  @IsInt()
  column: number; // e.g. 1

  @IsString()
  @IsNotEmpty()
  seatNumber: string; // e.g. "A1"

  @IsString()
  @IsNotEmpty()
  categoryName: string; // matches SeatCategory.name

  @IsBoolean()
  @IsOptional()
  isAisle?: boolean;
}

export class CreateSeatLayoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatInputDto)
  seats: SeatInputDto[];
}
