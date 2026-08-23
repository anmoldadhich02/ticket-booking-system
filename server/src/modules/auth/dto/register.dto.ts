import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  name: string;

  @IsEnum(UserRole, { message: 'Role must be CUSTOMER, ORGANISER, or ADMIN.' })
  @IsOptional()
  role?: UserRole;
}
