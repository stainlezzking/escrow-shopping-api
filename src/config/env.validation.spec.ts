import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const requiredDatabaseEnv = {
    POSTGRES_USER: 'escrova',
    POSTGRES_PASSWORD: 'escrova_password',
    POSTGRES_DB: 'escrova_db',
    DATABASE_URL:
      'postgresql://escrova:escrova_password@localhost:5432/escrova_db?schema=public',
  };

  it('returns safe non-secret defaults when database values are provided', () => {
    expect(validateEnv(requiredDatabaseEnv)).toEqual({
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      LOG_PRETTY_PRINT: false,
      PORT: 3000,
      API_PREFIX: 'api',
      API_VERSION: 'v1',
      SWAGGER_PATH: 'docs',
      POSTGRES_USER: 'escrova',
      POSTGRES_PASSWORD: 'escrova_password',
      POSTGRES_DB: 'escrova_db',
      POSTGRES_PORT: 5432,
      DATABASE_URL:
        'postgresql://escrova:escrova_password@localhost:5432/escrova_db?schema=public',
    });
  });

  it('coerces valid string values from the environment', () => {
    expect(
      validateEnv({
        NODE_ENV: 'test',
        LOG_LEVEL: 'debug',
        LOG_PRETTY_PRINT: 'true',
        PORT: '4000',
        API_PREFIX: 'internal',
        API_VERSION: 'v2',
        SWAGGER_PATH: 'openapi',
        POSTGRES_USER: 'escrova',
        POSTGRES_PASSWORD: 'escrova_password',
        POSTGRES_DB: 'escrova_db',
        POSTGRES_PORT: '6543',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=public',
      }),
    ).toEqual({
      NODE_ENV: 'test',
      LOG_LEVEL: 'debug',
      LOG_PRETTY_PRINT: true,
      PORT: 4000,
      API_PREFIX: 'internal',
      API_VERSION: 'v2',
      SWAGGER_PATH: 'openapi',
      POSTGRES_USER: 'escrova',
      POSTGRES_PASSWORD: 'escrova_password',
      POSTGRES_DB: 'escrova_db',
      POSTGRES_PORT: 6543,
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=public',
    });
  });

  it('rejects missing database environment values', () => {
    expect(() => validateEnv({})).toThrow('Invalid environment configuration');
  });

  it('rejects invalid environment values', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'local',
        LOG_LEVEL: 'chatty',
        LOG_PRETTY_PRINT: 'sometimes',
        PORT: '99999',
        POSTGRES_USER: 'escrova',
        POSTGRES_PASSWORD: 'escrova_password',
        POSTGRES_DB: 'escrova_db',
        DATABASE_URL: 'not-a-url',
      }),
    ).toThrow('Invalid environment configuration');
  });
});
