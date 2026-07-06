import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DELIVERY_PROVIDER_PORT } from './providers/delivery-provider.interface';
import { DellymanDeliveryProvider } from './providers/dellyman-delivery.provider';

/**
 * Feature module for provider-backed delivery workflows.
 */
@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [DeliveryController],
  providers: [
    DeliveryService,
    DellymanDeliveryProvider,
    {
      provide: DELIVERY_PROVIDER_PORT,
      useExisting: DellymanDeliveryProvider,
    },
  ],
  exports: [DeliveryService],
})
export class DeliveryModule {}
