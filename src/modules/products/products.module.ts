import { Module } from '@nestjs/common';
import { StorageModule } from '../../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

/**
 * Feature module for seller products and public marketplace discovery.
 */
@Module({
  imports: [AuthModule, StorageModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
