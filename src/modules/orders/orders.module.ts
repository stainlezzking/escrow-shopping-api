import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EscrowModule } from '../escrow/escrow.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/**
 * Feature module for order initialization and order lifecycle workflows.
 */
@Module({
  imports: [AuthModule, EscrowModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
