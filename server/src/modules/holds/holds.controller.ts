import {
  Controller,
  Post,
  Get,
  Body,
  Param,
} from '@nestjs/common';
import { HoldsService } from './holds.service';
import { HoldSeatsDto } from './dto/hold-seats.dto';
import { ReleaseSeatsDto } from './dto/release-seats.dto';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('holds')
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  @Post()
  async holdSeats(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: HoldSeatsDto,
  ) {
    return this.holdsService.holdSeats(user.id, dto);
  }

  @Post('release')
  async releaseSeats(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReleaseSeatsDto,
  ) {
    return this.holdsService.releaseHold(user.id, dto.holdId);
  }

  @Get(':id')
  async getHoldDetails(
    @Param('id') holdId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.holdsService.getHoldDetails(holdId, user.id);
  }
}
