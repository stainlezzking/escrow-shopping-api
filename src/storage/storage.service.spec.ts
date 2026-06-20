import { StorageService } from './storage.service';

describe('StorageService', () => {
  it('builds product image URLs from the configured MinIO public endpoint and bucket', () => {
    const service = new StorageService({
      getOrThrow: jest.fn().mockReturnValue({
        publicUrl: 'http://localhost:9000',
        productImagesBucket: 'escrova-product-images',
      }),
    } as never);

    expect(service.buildProductImageUrl('products/store-one/phone.png')).toBe(
      'http://localhost:9000/escrova-product-images/products/store-one/phone.png',
    );
  });
});
