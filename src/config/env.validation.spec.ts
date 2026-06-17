import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('returns safe local defaults when optional values are omitted', () => {
    expect(validateEnv({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      API_PREFIX: 'api',
      API_VERSION: 'v1',
      SWAGGER_PATH: 'docs',
      DATABASE_URL:
        'postgresql://escrova:escrova_password@localhost:5432/appdb?schema=public',
    });
  });

  it('coerces valid string values from the environment', () => {
    expect(
      validateEnv({
        NODE_ENV: 'test',
        PORT: '4000',
        API_PREFIX: 'internal',
        API_VERSION: 'v2',
        SWAGGER_PATH: 'openapi',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=public',
      }),
    ).toEqual({
      NODE_ENV: 'test',
      PORT: 4000,
      API_PREFIX: 'internal',
      API_VERSION: 'v2',
      SWAGGER_PATH: 'openapi',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=public',
    });
  });

  it('rejects invalid environment values without printing secrets', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'local',
        PORT: '99999',
        DATABASE_URL: 'not-a-url',
      }),
    ).toThrow('Invalid environment configuration');
  });
});
