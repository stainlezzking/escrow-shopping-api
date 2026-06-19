import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(1),
});

export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>;

/**
 * Request body for Google signup or signin.
 */
export class GoogleAuthDto {
  @ApiProperty({
    description:
      'Google ID token received from the client after Google sign-in.',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  idToken: string;
}
