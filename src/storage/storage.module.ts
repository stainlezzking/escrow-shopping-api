import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Shared storage module for object-storage metadata and URL helpers.
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
