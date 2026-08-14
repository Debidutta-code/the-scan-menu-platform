import { z } from 'zod';

export const createWebhookSubscriptionSchema = z.object({
  targetUrl: z.string().trim().url({ message: 'Must be a valid URL (https://)' }),
  events: z
    .array(z.enum(['order.created', 'order.status_updated', 'inventory.low_stock', 'table_session.closed']))
    .min(1, { message: 'At least one event trigger must be selected' }),
});

export type CreateWebhookSubscriptionInput = z.infer<typeof createWebhookSubscriptionSchema>;
