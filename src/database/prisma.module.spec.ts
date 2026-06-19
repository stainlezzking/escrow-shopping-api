import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

describe('PrismaModule', () => {
  it('provides PrismaService for dependency injection', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        getOrThrow: jest.fn().mockReturnValue({
          url: 'postgresql://escrova:escrova_password@localhost:5432/escrova_db?schema=public',
        }),
      })
      .compile();

    const prismaService = module.get(PrismaService);

    expect(prismaService).toBeDefined();
    expect(typeof prismaService.onModuleInit).toBe('function');
    expect(typeof prismaService.onModuleDestroy).toBe('function');

    await module.close();
  });
});
