import { maskBankAccount } from './mask-bank-account.helper';

describe('maskBankAccount', () => {
  it('returns only the last four account number digits', () => {
    expect(maskBankAccount('0123456789')).toBe('6789');
  });

  it('handles short or missing account numbers safely', () => {
    expect(maskBankAccount('123')).toBe('123');
    expect(maskBankAccount(null)).toBeNull();
  });
});
