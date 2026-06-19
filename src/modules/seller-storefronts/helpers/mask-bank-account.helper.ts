/**
 * Returns only the final four digits of a bank account number.
 *
 * @param accountNumber - Stored bank account number.
 * @returns Last four digits or null when absent.
 */
export function maskBankAccount(
  accountNumber: string | null | undefined,
): string | null {
  if (!accountNumber) {
    return null;
  }

  return accountNumber.slice(-4);
}
