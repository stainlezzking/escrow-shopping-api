import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface StorageConfig {
  publicUrl: string;
  productImagesBucket: string;
}

/**
 * Builds object-storage URLs and centralizes bucket naming.
 *
 * Local development uses MinIO through Docker. The service only derives URLs
 * and storage keys for metadata persistence; direct object upload handling can
 * be added behind this same abstraction later.
 */
@Injectable()
export class StorageService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Builds a public product image URL from a storage key.
   *
   * @param storageKey - Object key inside the product images bucket.
   * @returns Public object URL for the configured storage provider.
   */
  buildProductImageUrl(storageKey: string): string {
    const storageConfig =
      this.configService.getOrThrow<StorageConfig>('storage');
    const baseUrl = storageConfig.publicUrl.replace(/\/+$/, '');
    const bucket = encodeURIComponent(storageConfig.productImagesBucket);
    const encodedKey = storageKey
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return `${baseUrl}/${bucket}/${encodedKey}`;
  }
}
