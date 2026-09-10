import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(512),
});

export const mfaVerifySchema = z.object({
  challengeToken: z.string().min(1).max(512),
  code: z.string().regex(/^\d{6}$/),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
