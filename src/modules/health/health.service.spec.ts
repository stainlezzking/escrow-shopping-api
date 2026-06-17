import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { describe, it, expect, jest } from '@jest/globals';

describe('HealthService', () => {
  it('returns safe health metadata', () => {
    const service = new HealthService({
      getOrThrow: jest.fn().mockReturnValue({ nodeEnv: 'test' }),
    } as unknown as ConfigService);

    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'Escrova API',
        environment: 'test',
      }),
    );
  });
});
