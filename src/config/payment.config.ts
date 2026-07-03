import { registerAs } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';

/**
 * Central payment configuration namespace.
 */
export default registerAs('payment', () => ({
  provider: process.env.PAYMENT_PROVIDER ?? PaymentProvider.PAYSTACK,
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
  paystackBaseUrl: process.env.PAYSTACK_BASE_URL ?? 'https://api.paystack.co',
}));
