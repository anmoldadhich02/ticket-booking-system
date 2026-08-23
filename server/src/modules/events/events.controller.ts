import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole, EventStatus } from '@prisma/client';
import { Request } from 'express';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Roles(UserRole.ORGANISER, UserRole.ADMIN)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.createEvent(user.id, dto);
  }

  @Public()
  @Get()
  async findAll(@Query() query: QueryEventsDto) {
    return this.eventsService.getEvents(query);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.eventsService.getEventById(id);
  }

  @Public()
  @Get(':id/seats')
  async getSeats(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    // If request contains user context from cookie/auth
    const user = (req as any).user as AuthenticatedUser | undefined;
    return this.eventsService.getEventSeats(id, user?.id);
  }

  @Roles(UserRole.ORGANISER, UserRole.ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('status') status: EventStatus,
  ) {
    return this.eventsService.updateEventStatus(id, user.id, status, user.role);
  }
}
