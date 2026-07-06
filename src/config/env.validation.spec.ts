import { describe, it, expect } from '@jest/globals';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const requiredDatabaseEnv = {
    POSTGRES_USER: 'escrova',
    POSTGRES_PASSWORD: 'escrova_password',
    POSTGRES_DB: 'escrova_db',
    DATABASE_URL:
      'postgresql://escrova:escrova_password@localhost:5432/escrova_db?schema=public',
    JWT_ACCESS_TOKEN_SECRET: 'test_access_token_secret_with_32_chars',
    GOOGLE_CLIENT_ID: '',
    PAYSTACK_SECRET_KEY: 'paystack_test_secret',
    MINIO_ROOT_PASSWORD: 'escrova_minio_password',
    STORAGE_SECRET_KEY: 'escrova_minio_password',
    DELLYMAN_API_KEY: 'dellyman_test_api_key',
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
      JWT_ACCESS_TOKEN_SECRET: 'test_access_token_secret_with_32_chars',
      JWT_ACCESS_TOKEN_EXPIRES_IN: '15m',
      GOOGLE_CLIENT_ID: '',
      PAYMENT_PROVIDER: 'PAYSTACK',
      PAYSTACK_SECRET_KEY: 'paystack_test_secret',
      PAYSTACK_BASE_URL: 'https://api.paystack.co',
      MINIO_ROOT_USER: 'escrova_minio',
      MINIO_ROOT_PASSWORD: 'escrova_minio_password',
      MINIO_API_PORT: 9000,
      MINIO_CONSOLE_PORT: 9001,
      STORAGE_ENDPOINT: 'http://localhost:9000',
      STORAGE_PUBLIC_URL: 'http://localhost:9000',
      STORAGE_ACCESS_KEY: 'escrova_minio',
      STORAGE_SECRET_KEY: 'escrova_minio_password',
      STORAGE_PRODUCT_IMAGES_BUCKET: 'escrova-product-images',
      DELIVERY_PROVIDER: 'DELLYMAN',
      DELLYMAN_BASE_URL: 'https://dev.dellyman.com/api/v3.0',
      DELLYMAN_API_KEY: 'dellyman_test_api_key',
      DELLYMAN_WEBHOOK_SECRET: '',
      DELIVERY_DEFAULT_VEHICLE: 'Bike',
      DELIVERY_DEFAULT_PICKUP_WINDOW: '08:00 AM to 05:00 PM',
      DELIVERY_QUOTE_TTL_MINUTES: 30,
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
        JWT_ACCESS_TOKEN_SECRET: 'test_access_token_secret_with_32_chars',
        JWT_ACCESS_TOKEN_EXPIRES_IN: '30m',
        GOOGLE_CLIENT_ID: 'google-client.apps.googleusercontent.com',
        PAYSTACK_SECRET_KEY: 'paystack_test_secret',
        PAYSTACK_BASE_URL: 'https://api.paystack.test',
        MINIO_ROOT_USER: 'minio_user',
        MINIO_ROOT_PASSWORD: 'minio_password',
        MINIO_API_PORT: '9100',
        MINIO_CONSOLE_PORT: '9101',
        STORAGE_ENDPOINT: 'http://localhost:9100',
        STORAGE_PUBLIC_URL: 'https://cdn.example.com',
        STORAGE_ACCESS_KEY: 'minio_user',
        STORAGE_SECRET_KEY: 'minio_password',
        STORAGE_PRODUCT_IMAGES_BUCKET: 'product-images',
        DELIVERY_PROVIDER: 'DELLYMAN',
        DELLYMAN_BASE_URL: 'https://dev.dellyman.test/api/v3.0',
        DELLYMAN_API_KEY: 'dellyman_test_api_key',
        DELLYMAN_WEBHOOK_SECRET: 'dellyman_webhook_secret',
        DELIVERY_DEFAULT_VEHICLE: 'Car',
        DELIVERY_DEFAULT_PICKUP_WINDOW: '09:00 AM to 03:00 PM',
        DELIVERY_QUOTE_TTL_MINUTES: '45',
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
      JWT_ACCESS_TOKEN_SECRET: 'test_access_token_secret_with_32_chars',
      JWT_ACCESS_TOKEN_EXPIRES_IN: '30m',
      GOOGLE_CLIENT_ID: 'google-client.apps.googleusercontent.com',
      PAYMENT_PROVIDER: 'PAYSTACK',
      PAYSTACK_SECRET_KEY: 'paystack_test_secret',
      PAYSTACK_BASE_URL: 'https://api.paystack.test',
      MINIO_ROOT_USER: 'minio_user',
      MINIO_ROOT_PASSWORD: 'minio_password',
      MINIO_API_PORT: 9100,
      MINIO_CONSOLE_PORT: 9101,
      STORAGE_ENDPOINT: 'http://localhost:9100',
      STORAGE_PUBLIC_URL: 'https://cdn.example.com',
      STORAGE_ACCESS_KEY: 'minio_user',
      STORAGE_SECRET_KEY: 'minio_password',
      STORAGE_PRODUCT_IMAGES_BUCKET: 'product-images',
      DELIVERY_PROVIDER: 'DELLYMAN',
      DELLYMAN_BASE_URL: 'https://dev.dellyman.test/api/v3.0',
      DELLYMAN_API_KEY: 'dellyman_test_api_key',
      DELLYMAN_WEBHOOK_SECRET: 'dellyman_webhook_secret',
      DELIVERY_DEFAULT_VEHICLE: 'Car',
      DELIVERY_DEFAULT_PICKUP_WINDOW: '09:00 AM to 03:00 PM',
      DELIVERY_QUOTE_TTL_MINUTES: 45,
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
