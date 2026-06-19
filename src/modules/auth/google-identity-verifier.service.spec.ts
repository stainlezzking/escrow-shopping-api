import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { GoogleIdentityVerifierService } from './google-identity-verifier.service';

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

describe('GoogleIdentityVerifierService', () => {
  it('verifies google id tokens with the configured client id', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        sub: 'google_subject_one',
        email: 'buyer@example.com',
        name: 'Ada Buyer',
        email_verified: true,
      }),
    });
    (OAuth2Client as unknown as jest.Mock).mockImplementationOnce(() => ({
      verifyIdToken,
    }));
    const service = new GoogleIdentityVerifierService(
      createConfigService('google_client_id'),
    );

    await expect(service.verifyIdToken('google_id_token')).resolves.toEqual({
      googleId: 'google_subject_one',
      email: 'buyer@example.com',
      fullName: 'Ada Buyer',
      emailVerified: true,
    });
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'google_id_token',
      audience: 'google_client_id',
    });
  });

  it('fails safely when google auth is not configured', async () => {
    const service = new GoogleIdentityVerifierService(createConfigService(''));

    await expect(
      service.verifyIdToken('google_id_token'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects invalid google token payloads safely', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => undefined,
    });
    (OAuth2Client as unknown as jest.Mock).mockImplementationOnce(() => ({
      verifyIdToken,
    }));
    const service = new GoogleIdentityVerifierService(
      createConfigService('google_client_id'),
    );

    await expect(
      service.verifyIdToken('google_id_token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function createConfigService(googleClientId: string): ConfigService {
  return {
    getOrThrow: jest.fn().mockReturnValue({
      googleClientId,
    }),
  } as unknown as ConfigService;
}
