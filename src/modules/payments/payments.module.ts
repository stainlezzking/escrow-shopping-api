import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackPaymentProvider } from './providers/paystack-payment.provider';
import { PAYMENT_PROVIDER_PORT } from './providers/payment-provider.interface';

/**
 * Feature module for provider-backed payment workflows.
 */
@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaystackPaymentProvider,
    {
      provide: PAYMENT_PROVIDER_PORT,
      useExisting: PaystackPaymentProvider,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
