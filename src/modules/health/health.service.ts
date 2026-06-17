import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthResponseDto } from './dto/health-response.dto';

interface AppConfig {
  nodeEnv: string;
}

/**
 * Provides operational health information for uptime and monitoring checks.
 */
@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Returns a lightweight health payload with no sensitive configuration values.
   *
   * @returns Current API health status and safe runtime metadata.
   */
  getHealth(): HealthResponseDto {
    const appConfig = this.configService.getOrThrow<AppConfig>('app');

    return {
      status: 'ok',
      service: 'Escrova API',
      environment: appConfig.nodeEnv,
      uptimeSeconds: Number(process.uptime().toFixed(2)),
    };
  }
}
