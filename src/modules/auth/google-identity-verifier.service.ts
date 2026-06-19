import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

interface AuthConfig {
  googleClientId: string;
}

export interface GoogleIdentity {
  googleId: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
}

/**
 * Verifies Google ID tokens against the configured OAuth client ID.
 */
@Injectable()
export class GoogleIdentityVerifierService {
  private readonly client = new OAuth2Client();
  private readonly googleClientId: string;

  constructor(configService: ConfigService) {
    this.googleClientId =
      configService.getOrThrow<AuthConfig>('auth').googleClientId;
  }

  /**
   * Verifies a Google ID token and returns the trusted identity payload.
   *
   * @param idToken - Google ID token from the client.
   * @returns Verified Google identity.
   * @throws ServiceUnavailableException when Google auth is not configured.
   * @throws UnauthorizedException when the token or payload is invalid.
   */
  async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    if (!this.googleClientId) {
      throw new ServiceUnavailableException(
        'Google authentication is not configured',
      );
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.googleClientId,
      });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email) {
        throw new UnauthorizedException('Invalid Google authentication token');
      }

      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        fullName: payload.name ?? payload.email.split('@')[0],
        emailVerified: payload.email_verified === true,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      throw new UnauthorizedException('Invalid Google authentication token');
    }
  }
}
