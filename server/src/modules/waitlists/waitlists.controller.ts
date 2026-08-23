import {
  Controller,
  Post,
  Get,
  Body,
} from '@nestjs/common';
import { WaitlistsService } from './waitlists.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { AcceptOfferDto } from './dto/accept-offer.dto';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('waitlist')
export class WaitlistsController {
  constructor(private readonly waitlistsService: WaitlistsService) {}

  @Post('join')
  async joinWaitlist(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: JoinWaitlistDto,
  ) {
    return this.waitlistsService.joinWaitlist(user.id, dto);
  }

  @Post('accept-offer')
  async acceptOffer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptOfferDto,
  ) {
    return this.waitlistsService.acceptOffer(user.id, dto.offerId);
  }

  @Get('my-status')
  async getMyWaitlists(@CurrentUser() user: AuthenticatedUser) {
    return this.waitlistsService.getUserWaitlists(user.id);
  }
}
