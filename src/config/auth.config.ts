import { registerAs } from '@nestjs/config';

/**
 * Central authentication configuration namespace for JWT access tokens.
 */
export default registerAs('auth', () => ({
  jwtAccessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET,
  jwtAccessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN ?? '15m',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
}));
