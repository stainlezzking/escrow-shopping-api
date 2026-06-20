import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

/**
 * Feature module for seller KYC submission and admin review decisions.
 */
@Module({
  imports: [AuthModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
