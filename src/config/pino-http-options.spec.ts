import { PINO_REDACT_PATHS, buildPinoHttpOptions } from './pino-http-options';

describe('buildPinoHttpOptions', () => {
  it('redacts sensitive request and response headers', () => {
    const options = buildPinoHttpOptions({
      nodeEnv: 'production',
      level: 'info',
      prettyPrint: false,
    });

    expect(options.redact).toEqual({
      paths: PINO_REDACT_PATHS,
      censor: '[REDACTED]',
    });
    expect(PINO_REDACT_PATHS).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers.x-paystack-signature',
        'req.headers.x-flutterwave-signature',
        'req.headers.x-monnify-signature',
        'res.headers.set-cookie',
      ]),
    );
  });

  it('enables pino-pretty only when configured', () => {
    expect(
      buildPinoHttpOptions({
        nodeEnv: 'development',
        level: 'debug',
        prettyPrint: true,
      }).transport,
    ).toEqual({
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        singleLine: true,
        translateTime: 'SYS:standard',
      },
    });

    expect(
      buildPinoHttpOptions({
        nodeEnv: 'production',
        level: 'info',
        prettyPrint: false,
      }).transport,
    ).toBeUndefined();
  });
});
