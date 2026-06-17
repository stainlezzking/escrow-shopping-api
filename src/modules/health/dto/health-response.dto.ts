import { ApiProperty } from '@nestjs/swagger';

/**
 * Public health check payload returned by the health endpoint.
 */
export class HealthResponseDto {
  /**
   * Current API health state.
   */
  @ApiProperty({
    example: 'ok',
    description: 'Current API health state.',
  })
  status: string;

  /**
   * Product-facing service name.
   */
  @ApiProperty({
    example: 'Escrova API',
    description: 'Product-facing service name.',
  })
  service: string;

  /**
   * Current runtime environment.
   */
  @ApiProperty({
    example: 'development',
    description: 'Current runtime environment.',
  })
  environment: string;

  /**
   * Process uptime in seconds.
   */
  @ApiProperty({
    example: 42.12,
    description: 'Process uptime in seconds.',
  })
  uptimeSeconds: number;
}
