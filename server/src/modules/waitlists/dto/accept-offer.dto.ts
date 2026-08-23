import { IsUUID, IsNotEmpty } from 'class-validator';

export class AcceptOfferDto {
  @IsUUID('4', { message: 'Valid offer ID is required.' })
  @IsNotEmpty()
  offerId: string;
}
