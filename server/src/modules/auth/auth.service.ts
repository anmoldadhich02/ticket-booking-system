import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        name: dto.name.trim(),
        role: dto.role || UserRole.CUSTOMER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const token = this.generateToken(user);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'USER',
        entityId: user.id,
        details: { role: user.role },
      },
    });

    return {
      user,
      token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email address or password.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email address or password.');
    }

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  }

  private generateToken(user: { id: string; email: string; role: string; name: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    return this.jwtService.sign(payload);
  }
}
