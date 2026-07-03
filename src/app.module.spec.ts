/* eslint-disable @typescript-eslint/no-require-imports */

import { Test, TestingModule } from '@nestjs/testing';

describe('AppModule', () => {
  it('compiles the root module with global providers', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'paystack_test_secret';
    const { AppModule } =
      require('./app.module') as typeof import('./app.module');
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();

    await module.close();
  });
});
