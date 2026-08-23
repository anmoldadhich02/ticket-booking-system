import { IsUUID, IsNotEmpty } from 'class-validator';

export class JoinWaitlistDto {
  @IsUUID('4', { message: 'Valid event ID is required.' })
  @IsNotEmpty()
  eventId: string;

  @IsUUID('4', { message: 'Valid category ID is required.' })
  @IsNotEmpty()
  categoryId: string;
}
