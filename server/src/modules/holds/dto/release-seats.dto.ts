import { IsUUID, IsNotEmpty } from 'class-validator';

export class ReleaseSeatsDto {
  @IsUUID('4', { message: 'Valid hold ID is required.' })
  @IsNotEmpty()
  holdId: string;
}
