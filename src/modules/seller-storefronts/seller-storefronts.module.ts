import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SellerStorefrontsController } from './seller-storefronts.controller';
import { SellerStorefrontsService } from './seller-storefronts.service';

/**
 * Feature module for seller storefront creation and owner context.
 */
@Module({
  imports: [AuthModule],
  controllers: [SellerStorefrontsController],
  providers: [SellerStorefrontsService],
  exports: [SellerStorefrontsService],
})
export class SellerStorefrontsModule {}
