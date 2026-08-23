import {
  Controller,
  Post,
  Get,
  Body,
  Param,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async createBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(user.id, dto);
  }

  @Post(':id/cancel')
  async cancelBooking(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.cancelBooking(user.id, bookingId);
  }

  @Get()
  async getMyBookings(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.getUserBookings(user.id);
  }

  @Get(':id')
  async getBooking(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.getBookingById(user.id, bookingId);
  }
}
