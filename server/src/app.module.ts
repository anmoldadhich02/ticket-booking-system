import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from './core/database/database.module';
import { RedisModule } from './core/redis/redis.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuthModule } from './modules/auth/auth.module';
import { VenuesModule } from './modules/venues/venues.module';
import { EventsModule } from './modules/events/events.module';
import { HoldsModule } from './modules/holds/holds.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { WaitlistsModule } from './modules/waitlists/waitlists.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    DatabaseModule,
    RedisModule,
    NotificationsModule,
    AuthModule,
    VenuesModule,
    EventsModule,
    HoldsModule,
    TicketsModule,
    WaitlistsModule,
    BookingsModule,
    AnalyticsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
