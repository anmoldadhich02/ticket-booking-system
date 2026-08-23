import { Module } from '@nestjs/common';
import { WaitlistsService } from './waitlists.service';
import { WaitlistsController } from './waitlists.controller';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [WaitlistsController],
  providers: [WaitlistsService],
  exports: [WaitlistsService],
})
export class WaitlistsModule {}
