import { z } from 'zod';

const roleSchema = z.enum(['ADMIN', 'CONTENT_EDITOR']);
const passwordSchema = z.string().min(12).max(512);

export const adminInviteSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
    role: roleSchema,
  })
  .strict();

export const acceptInviteSchema = z
  .object({
    token: z.string().min(1).max(200),
    password: passwordSchema,
  })
  .strict();

export const adminUserUpdateSchema = z
  .object({
    role: roleSchema,
    isActive: z.boolean(),
    password: passwordSchema,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'No changes supplied' });

export type AdminInviteInput = z.infer<typeof adminInviteSchema>;
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
