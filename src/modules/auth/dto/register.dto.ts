import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(120),
  phoneNumber: z.string().min(7).max(20).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Request body for buyer registration.
 */
export class RegisterDto {
  @ApiProperty({ example: 'buyer@example.com' })
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 128, example: 'StrongPass123' })
  password: string;

  @ApiProperty({ minLength: 2, maxLength: 120, example: 'Ada Buyer' })
  fullName: string;

  @ApiPropertyOptional({ example: '08012345678' })
  phoneNumber?: string;
}
