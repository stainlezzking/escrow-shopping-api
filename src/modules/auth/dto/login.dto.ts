import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Request body for user login.
 */
export class LoginDto {
  @ApiProperty({ example: 'buyer@example.com' })
  email: string;

  @ApiProperty({ example: 'StrongPass123' })
  password: string;
}
