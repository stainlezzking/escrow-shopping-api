import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { apiResponse } from '../../common/responses/api-response';
import type { ApiResponseOptions } from '../../common/responses/api-response';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

/**
 * Exposes lightweight operational endpoints for the Escrova API.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Checks whether the API process is responsive.
   *
   * @returns Health status wrapped by the global response interceptor.
   */
  @Get()
  @ApiOperation({
    summary: 'Check API health',
    description: 'Returns a safe liveness payload for Escrova API monitoring.',
  })
  @ApiOkResponse({
    description: 'The API process is healthy.',
    type: HealthResponseDto,
  })
  getHealth(): ApiResponseOptions<HealthResponseDto> {
    return apiResponse(
      this.healthService.getHealth(),
      'Health check retrieved successfully',
    );
  }
}
