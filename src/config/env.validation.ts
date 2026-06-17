import { z } from 'zod';

/**
 * Defines the environment variables required to start the Escrova API.
 *
 * Defaults are local-development safe and match the Docker PostgreSQL service
 * configured in this repository.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z.string().min(1).default('api'),
  API_VERSION: z.string().min(1).default('v1'),
  SWAGGER_PATH: z.string().min(1).default('docs'),
  DATABASE_URL: z
    .string()
    .url()
    .default(
      'postgresql://escrova:escrova_password@localhost:5432/appdb?schema=public',
    ),
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
