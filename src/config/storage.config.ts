import { registerAs } from '@nestjs/config';

/**
 * Central storage configuration namespace for S3-compatible object storage.
 */
export default registerAs('storage', () => ({
  endpoint: process.env.STORAGE_ENDPOINT,
  publicUrl: process.env.STORAGE_PUBLIC_URL,
  accessKey: process.env.STORAGE_ACCESS_KEY,
  secretKey: process.env.STORAGE_SECRET_KEY,
  productImagesBucket: process.env.STORAGE_PRODUCT_IMAGES_BUCKET,
}));
