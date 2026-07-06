import { Module } from '@nestjs/common';
import { EscrowService } from './escrow.service';

/**
 * Feature module for escrow state transitions and ledger-backed releases.
 */
@Module({
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
