import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';

/**
 * Feature module for ledger-backed wallet operations.
 */
@Module({
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
