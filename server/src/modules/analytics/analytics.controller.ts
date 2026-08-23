import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles(UserRole.ORGANISER, UserRole.ADMIN)
  @Get('organiser')
  async getOrganiserStats(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getOrganiserAnalytics(user.id);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin')
  async getAdminStats() {
    return this.analyticsService.getAdminAnalytics();
  }
}
