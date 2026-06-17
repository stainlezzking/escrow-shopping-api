import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

interface AppConfig {
  port: number;
  apiPrefix: string;
  apiVersion: string;
  swaggerPath: string;
}

/**
 * Configures and starts the Escrova HTTP API.
 *
 * @returns A promise that resolves after the NestJS server starts listening.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>('app');
  const globalPrefix = `${appConfig.apiPrefix}/${appConfig.apiVersion}`;

  app.setGlobalPrefix(globalPrefix);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Escrova API')
    .setDescription(
      'Backend API for the Escrova peer-to-peer escrow marketplace.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(
    `${globalPrefix}/${appConfig.swaggerPath}`,
    app,
    document,
  );

  await app.listen(appConfig.port);
}

void bootstrap();
