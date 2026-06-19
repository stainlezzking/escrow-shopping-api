import { registerAs } from '@nestjs/config';

/**
 * Central logging configuration namespace for Pino-backed application logs.
 */
export default registerAs('logging', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  level: process.env.LOG_LEVEL ?? 'info',
  prettyPrint: process.env.LOG_PRETTY_PRINT === 'true',
}));
