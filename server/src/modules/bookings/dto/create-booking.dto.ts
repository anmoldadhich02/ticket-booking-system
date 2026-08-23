import { IsUUID, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsUUID('4', { message: 'Valid hold ID is required to complete booking.' })
  @IsNotEmpty()
  holdId: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
