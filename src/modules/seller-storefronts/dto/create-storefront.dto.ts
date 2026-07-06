import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const CreateStorefrontSchema = z.object({
  businessName: z.string().min(2).max(120),
  storeHandle: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/i)
    .transform((value) => value.toLowerCase()),
  businessCategoryId: z.uuid().optional(),
  baseLocation: z.string().min(2).max(120).optional(),
  bankName: z.string().min(2).max(80),
  accountNumber: z.string().regex(/^\d{10}$/),
  accountName: z.string().min(2).max(120),
});

export type CreateStorefrontInput = z.infer<typeof CreateStorefrontSchema>;

/**
 * Request body for creating a seller storefront.
 */
export class CreateStorefrontDto {
  @ApiProperty({ example: 'Tech Haven', minLength: 2, maxLength: 120 })
  businessName: string;

  @ApiProperty({
    example: 'tech-haven',
    description: 'Unique public store handle.',
    minLength: 3,
    maxLength: 40,
  })
  storeHandle: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  businessCategoryId?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  baseLocation?: string;

  @ApiProperty({ example: 'Access Bank' })
  bankName: string;

  @ApiProperty({
    example: '0123456789',
    description:
      'NUBAN account number. Stored for seller payouts, never returned raw.',
  })
  accountNumber: string;

  @ApiProperty({ example: 'Ada Buyer' })
  accountName: string;
}
