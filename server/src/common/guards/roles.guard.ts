import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user }: { user: AuthenticatedUser } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User is not authenticated.');
    }

    // Admin role has access to all roles
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Requires one of the following roles: ${requiredRoles.join(', ')}. Your role: ${user.role}.`,
      );
    }

    return true;
  }
}
