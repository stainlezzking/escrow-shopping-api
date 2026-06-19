import { PasswordHasherService } from './password-hasher.service';

describe('PasswordHasherService', () => {
  it('hashes passwords without storing plaintext and verifies matches', async () => {
    const service = new PasswordHasherService();

    const hash = await service.hash('StrongPass123');

    expect(hash).not.toBe('StrongPass123');
    expect(hash).toMatch(/^scrypt\$/);
    await expect(service.verify('StrongPass123', hash)).resolves.toBe(true);
    await expect(service.verify('WrongPass123', hash)).resolves.toBe(false);
  });
});
