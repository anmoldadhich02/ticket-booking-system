import { IsArray, IsNotEmpty, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class HoldSeatsDto {
  @IsUUID('4', { message: 'Valid event ID is required.' })
  @IsNotEmpty()
  eventId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one seat must be selected.' })
  @ArrayMaxSize(10, { message: 'A maximum of 10 seats can be held in a single session.' })
  @IsUUID('4', { each: true, message: 'Each item must be a valid event seat UUID.' })
  eventSeatIds: string[];
}
