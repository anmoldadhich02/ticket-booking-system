import { Global, Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { NotificationsService } from './notifications.service';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  providers: [EventsGateway, NotificationsService],
  exports: [EventsGateway, NotificationsService],
})
export class NotificationsModule {}
