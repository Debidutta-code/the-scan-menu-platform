import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2, { message: 'Key name must be at least 2 characters' }).max(50),
  scopes: z
    .array(z.enum(['menu:read', 'orders:read', 'orders:write', 'webhooks:manage']))
    .min(1, { message: 'At least one scope must be selected' }),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
