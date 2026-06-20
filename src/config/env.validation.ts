import { z } from 'zod';

/**
 * Defines the environment variables required to start the Escrova API.
 *
 * Non-secret defaults are local-development safe. Database configuration is
 * required from `.env` so startup fails fast when the runtime database is not
 * configured.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  LOG_PRETTY_PRINT: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z.string().min(1).default('api'),
  API_VERSION: z.string().min(1).default('v1'),
  SWAGGER_PATH: z.string().min(1).default('docs'),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_TOKEN_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().min(1).default('15m'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  MINIO_ROOT_USER: z.string().min(3).default('escrova_minio'),
  MINIO_ROOT_PASSWORD: z.string().min(8),
  MINIO_API_PORT: z.coerce.number().int().min(1).max(65535).default(9000),
  MINIO_CONSOLE_PORT: z.coerce.number().int().min(1).max(65535).default(9001),
  STORAGE_ENDPOINT: z.string().url().default('http://localhost:9000'),
  STORAGE_PUBLIC_URL: z.string().url().default('http://localhost:9000'),
  STORAGE_ACCESS_KEY: z.string().min(3).default('escrova_minio'),
  STORAGE_SECRET_KEY: z.string().min(8),
  STORAGE_PRODUCT_IMAGES_BUCKET: z
    .string()
    .min(3)
    .default('escrova-product-images'),
});

export type EnvVariables = z.infer<typeof envSchema>;

/**
 * Validates process environment values before NestJS finishes bootstrapping.
 *
 * @param config - Raw environment values provided by NestJS ConfigModule.
 * @returns Parsed and defaulted environment values.
 * @throws Error when required environment values are invalid.
 */
export function validateEnv(config: Record<string, unknown>): EnvVariables {
  const parsed = envSchema.safeParse(config);

  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid environment configuration: ${issues}`);
}
