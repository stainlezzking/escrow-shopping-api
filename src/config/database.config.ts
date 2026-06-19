import { registerAs } from '@nestjs/config';

/**
 * Central database configuration namespace for Prisma/PostgreSQL access.
 */
export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  postgresUser: process.env.POSTGRES_USER,
  postgresDatabase: process.env.POSTGRES_DB,
  postgresPort: Number(process.env.POSTGRES_PORT ?? 5432),
}));
