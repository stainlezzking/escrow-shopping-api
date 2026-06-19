import { UserRole } from '@prisma/client';

/**
 * Authenticated JWT payload attached to protected HTTP requests.
 */
export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: UserRole;
}
