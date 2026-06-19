import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * Feature module for safe user lookup and profile-facing operations.
 */
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
