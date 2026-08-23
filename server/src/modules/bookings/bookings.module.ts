import { Module, forwardRef } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { TicketsModule } from '../tickets/tickets.module';
import { WaitlistsModule } from '../waitlists/waitlists.module';

@Module({
  imports: [TicketsModule, forwardRef(() => WaitlistsModule)],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
