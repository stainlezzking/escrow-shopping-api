import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Declares the roles allowed to access a protected route.
 *
 * @param roles - Allowed user roles.
 * @returns NestJS route metadata used by RolesGuard.
 */
export const Roles = (...roles: UserRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
