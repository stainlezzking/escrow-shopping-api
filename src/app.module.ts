import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';

/**
 * Root application module for the Escrova modular monolith.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
    }),
    HealthModule,
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
