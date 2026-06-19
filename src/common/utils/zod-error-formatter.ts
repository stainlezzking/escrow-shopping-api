import { z } from 'zod';

export interface FormattedZodIssue {
  path: string;
  message: string;
  code: string;
}

/**
 * Converts Zod issues into compact, client-safe validation details.
 *
 * @param issues - Zod validation issues.
 * @returns Field-level validation issues without submitted values.
 */
export function formatZodIssues(
  issues: z.core.$ZodIssue[],
): FormattedZodIssue[] {
  return issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '$',
    message: issue.message,
    code: issue.code,
  }));
}
