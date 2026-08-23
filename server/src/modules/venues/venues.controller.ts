import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { CreateSeatLayoutDto } from './dto/create-seat-layout.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateVenueDto) {
    return this.venuesService.createVenue(dto);
  }

  @Public()
  @Get()
  async findAll() {
    return this.venuesService.getAllVenues();
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.venuesService.getVenueById(id);
  }

  @Roles(UserRole.ADMIN)
  @Put(':id/layout')
  async updateLayout(
    @Param('id') id: string,
    @Body() dto: CreateSeatLayoutDto,
  ) {
    return this.venuesService.setSeatLayout(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.venuesService.deleteVenue(id);
  }
}
