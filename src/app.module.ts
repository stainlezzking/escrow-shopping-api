import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/env.validation';
import loggingConfig from './config/logging.config';
import {
  LoggingConfig,
  buildPinoHttpOptions,
} from './config/pino-http-options';
import storageConfig from './config/storage.config';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BuyerProfilesModule } from './modules/buyer-profiles/buyer-profiles.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { HealthModule } from './modules/health/health.module';
import { KycModule } from './modules/kyc/kyc.module';
import { ProductsModule } from './modules/products/products.module';
import { SellerStorefrontsModule } from './modules/seller-storefronts/seller-storefronts.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';

/**
 * Root application module for the Escrova modular monolith.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [
        appConfig,
        authConfig,
        databaseConfig,
        loggingConfig,
        storageConfig,
      ],
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: buildPinoHttpOptions(
          configService.getOrThrow<LoggingConfig>('logging'),
        ),
        forRoutes: [{ path: '*path', method: RequestMethod.ALL }],
      }),
    }),
    PrismaModule,
    StorageModule,
    HealthModule,
    UsersModule,
    AuthModule,
    BuyerProfilesModule,
    CategoriesModule,
    SellerStorefrontsModule,
    KycModule,
    ProductsModule,
    WalletsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ZodValidationPipe(),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
