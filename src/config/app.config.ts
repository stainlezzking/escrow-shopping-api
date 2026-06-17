import { registerAs } from '@nestjs/config';

/**
 * Central application configuration namespace for HTTP and documentation setup.
 */
export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  apiVersion: process.env.API_VERSION ?? 'v1',
  swaggerPath: process.env.SWAGGER_PATH ?? 'docs',
}));
