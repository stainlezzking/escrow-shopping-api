import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const optionalTrimmedString = (max: number) =>
  z.string().trim().min(1).max(max).optional();

const nigerianPhoneSchema = z
  .string()
  .trim()
  .regex(/^(\+234|0)\d{10}$/, 'Phone number must be a valid Nigerian number')
  .optional();

/**
 * Validates buyer address creation payloads.
 */
export const CreateBuyerAddressSchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  phoneNumber: nigerianPhoneSchema,
  state: z.string().trim().min(2).max(80),
  city: optionalTrimmedString(80),
  streetAddress: z.string().trim().min(5).max(240),
  deliveryNotes: optionalTrimmedString(240),
  isDefault: z.boolean().optional(),
});

/**
 * Validates buyer address update payloads.
 */
export const UpdateBuyerAddressSchema = CreateBuyerAddressSchema.omit({
  isDefault: true,
})
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one address field must be provided',
  });

/**
 * Validates address route parameters.
 */
export const AddressParamsSchema = z.object({
  addressId: z.string().uuid(),
});

export type CreateBuyerAddressInput = z.infer<typeof CreateBuyerAddressSchema>;
export type UpdateBuyerAddressInput = z.infer<typeof UpdateBuyerAddressSchema>;
export type AddressParamsInput = z.infer<typeof AddressParamsSchema>;

/**
 * Request body for creating a buyer delivery address.
 */
export class CreateBuyerAddressDto {
  @ApiProperty({ example: 'Ada Buyer', minLength: 2, maxLength: 120 })
  contactName: string;

  @ApiPropertyOptional({ example: '08012345678' })
  phoneNumber?: string;

  @ApiProperty({ example: 'Lagos', minLength: 2, maxLength: 80 })
  state: string;

  @ApiPropertyOptional({ example: 'Ikeja', maxLength: 80 })
  city?: string;

  @ApiProperty({ example: '12 Allen Avenue', minLength: 5, maxLength: 240 })
  streetAddress: string;

  @ApiPropertyOptional({
    example: 'Call before delivery',
    maxLength: 240,
  })
  deliveryNotes?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'When true, this address becomes the buyer default address.',
  })
  isDefault?: boolean;
}

/**
 * Request body for updating a buyer delivery address.
 */
export class UpdateBuyerAddressDto {
  @ApiPropertyOptional({ example: 'Ada Buyer', minLength: 2, maxLength: 120 })
  contactName?: string;

  @ApiPropertyOptional({ example: '08012345678' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'Lagos', minLength: 2, maxLength: 80 })
  state?: string;

  @ApiPropertyOptional({ example: 'Lekki', maxLength: 80 })
  city?: string;

  @ApiPropertyOptional({
    example: '42 Admiralty Way',
    minLength: 5,
    maxLength: 240,
  })
  streetAddress?: string;

  @ApiPropertyOptional({
    example: 'Leave with estate security',
    maxLength: 240,
  })
  deliveryNotes?: string;
}
