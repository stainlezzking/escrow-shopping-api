import type { Options } from 'pino-http';

export interface LoggingConfig {
  nodeEnv: string;
  level: string;
  prettyPrint: boolean;
}

export const PINO_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.set-cookie',
  'req.headers.x-api-key',
  'req.headers.x-paystack-signature',
  'req.headers.x-flutterwave-signature',
  'req.headers.x-monnify-signature',
  'res.headers.set-cookie',
];

/**
 * Builds the Pino HTTP logger options used by NestJS.
 *
 * @param config - Validated logging configuration from ConfigService.
 * @returns Pino HTTP options with safe redaction and local pretty logging.
 */
export function buildPinoHttpOptions(config: LoggingConfig): Options {
  return {
    level: config.level,
    customProps: () => ({
      context: 'HTTP',
    }),
    redact: {
      paths: PINO_REDACT_PATHS,
      censor: '[REDACTED]',
    },
    transport: config.prettyPrint
      ? {
          target: 'pino-pretty',
          options: {
            colorize: config.nodeEnv !== 'production',
            ignore: 'pid,hostname',
            singleLine: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  };
}
