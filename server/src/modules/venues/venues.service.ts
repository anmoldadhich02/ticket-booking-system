import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { CreateSeatLayoutDto } from './dto/create-seat-layout.dto';

@Injectable()
export class VenuesService {
  private readonly logger = new Logger(VenuesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createVenue(dto: CreateVenueDto) {
    const defaultCategories = dto.categories && dto.categories.length > 0
      ? dto.categories
      : [
          { name: 'VIP', color: '#f59e0b', displayOrder: 1 },
          { name: 'Premium', color: '#06b6d4', displayOrder: 2 },
          { name: 'Standard', color: '#3b82f6', displayOrder: 3 },
          { name: 'Economy', color: '#64748b', displayOrder: 4 },
        ];

    return this.prisma.$transaction(async (tx) => {
      const venue = await tx.venue.create({
        data: {
          name: dto.name,
          address: dto.address,
          description: dto.description,
          seatCategories: {
            create: defaultCategories.map((cat, idx) => ({
              name: cat.name,
              color: cat.color,
              displayOrder: cat.displayOrder ?? idx + 1,
            })),
          },
        },
        include: {
          seatCategories: true,
        },
      });

      return venue;
    });
  }

  async getAllVenues() {
    return this.prisma.venue.findMany({
      where: { isActive: true },
      include: {
        seatCategories: {
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: {
            seats: true,
            events: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVenueById(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        seatCategories: {
          orderBy: { displayOrder: 'asc' },
        },
        seats: {
          where: { isActive: true },
          include: { category: true },
          orderBy: [{ row: 'asc' }, { column: 'asc' }],
        },
      },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found.');
    }

    return venue;
  }

  async setSeatLayout(venueId: string, dto: CreateSeatLayoutDto) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      include: { seatCategories: true },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found.');
    }

    const categoryMap = new Map(
      venue.seatCategories.map((cat) => [cat.name.toLowerCase(), cat.id]),
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete existing physical seats
      await tx.seat.deleteMany({ where: { venueId } });

      // 2. Insert new seats
      const seatData = dto.seats.map((s) => {
        const categoryId = categoryMap.get(s.categoryName.toLowerCase());
        if (!categoryId) {
          throw new BadRequestException(
            `Category "${s.categoryName}" does not exist for this venue. Available categories: ${venue.seatCategories.map((c) => c.name).join(', ')}`,
          );
        }

        return {
          venueId,
          categoryId,
          row: s.row.toUpperCase(),
          column: s.column,
          seatNumber: s.seatNumber,
          isAisle: s.isAisle ?? false,
        };
      });

      await tx.seat.createMany({
        data: seatData,
      });

      // 3. Update venue capacity (non-aisle seats)
      const activeCount = dto.seats.filter((s) => !s.isAisle).length;
      const updatedVenue = await tx.venue.update({
        where: { id: venueId },
        data: { capacity: activeCount },
        include: {
          seatCategories: true,
          seats: {
            include: { category: true },
            orderBy: [{ row: 'asc' }, { column: 'asc' }],
          },
        },
      });

      return updatedVenue;
    });
  }

  async deleteVenue(id: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) {
      throw new NotFoundException('Venue not found.');
    }

    return this.prisma.venue.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
