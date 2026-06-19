import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

interface DatabaseConfig {
  url: string;
}

/**
 * Injectable Prisma client for Escrova database access.
 *
 * The service owns the Prisma connection lifecycle and should be injected into
 * feature services instead of constructing Prisma clients manually.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService) {
    const databaseConfig = configService.getOrThrow<DatabaseConfig>('database');

    super({
      adapter: new PrismaPg({
        connectionString: databaseConfig.url,
      }),
    });
  }

  /**
   * Opens the database connection when the NestJS module initializes.
   *
   * @returns A promise that resolves after Prisma connects to PostgreSQL.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Closes the database connection during NestJS shutdown.
   *
   * @returns A promise that resolves after Prisma disconnects.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
