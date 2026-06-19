import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from '../types/authenticated-user';

interface RequestWithUser {
  headers: Record<string, string | undefined>;
  user?: AuthenticatedUser;
}

/**
 * Validates bearer access tokens and attaches the authenticated user payload.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Authenticates an HTTP request using a bearer access token.
   *
   * @param context - Current route execution context.
   * @returns True when the token is valid.
   * @throws UnauthorizedException when the token is missing or invalid.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      request.user =
        await this.jwtService.verifyAsync<AuthenticatedUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private extractBearerToken(authorization: string | undefined): string | null {
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
