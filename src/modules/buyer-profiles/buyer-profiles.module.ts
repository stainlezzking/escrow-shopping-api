import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BuyerProfilesController } from './buyer-profiles.controller';
import { BuyerProfilesService } from './buyer-profiles.service';

/**
 * Feature module for buyer profile and delivery address management.
 */
@Module({
  imports: [AuthModule],
  controllers: [BuyerProfilesController],
  providers: [BuyerProfilesService],
  exports: [BuyerProfilesService],
})
export class BuyerProfilesModule {}
