import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getHealth: jest.fn().mockReturnValue({
              status: 'ok',
              service: 'Escrova API',
              environment: 'test',
              uptimeSeconds: 1,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('delegates health payload generation to the service', () => {
    expect(controller.getHealth()).toEqual({
      data: {
        status: 'ok',
        service: 'Escrova API',
        environment: 'test',
        uptimeSeconds: 1,
      },
      message: 'Health check retrieved successfully',
      meta: undefined,
    });
  });
});
