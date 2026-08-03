import { z } from 'zod';

const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^hsl\(\d{1,3},\s*\d{1,3}%?,\s*\d{1,3}%?\)$/;

export const whiteLabelConfigSchema = z.object({
  enabled: z.boolean().optional(),
  customDomain: z.string().trim().toLowerCase().max(253).optional().or(z.literal('')),
  logoUrl: z.string().trim().url().optional().or(z.literal('')),
  faviconUrl: z.string().trim().url().optional().or(z.literal('')),
  primaryColor: z.string().trim().regex(colorRegex, { message: 'Must be a valid hex color code (e.g. #111827)' }).optional().or(z.literal('')),
  secondaryColor: z.string().trim().regex(colorRegex, { message: 'Must be a valid hex color code (e.g. #FFFFFF)' }).optional().or(z.literal('')),
  backgroundColor: z.string().trim().regex(colorRegex, { message: 'Must be a valid hex color code (e.g. #0B0B0F)' }).optional().or(z.literal('')),
  textColor: z.string().trim().regex(colorRegex, { message: 'Must be a valid hex color code' }).optional().or(z.literal('')),
  fontFamily: z.string().trim().max(100).optional().or(z.literal('')),
  hidePoweredBy: z.boolean().optional(),
  customCss: z.string().max(10000, { message: 'Custom CSS cannot exceed 10,000 characters' }).optional().or(z.literal('')),
});

export type WhiteLabelConfigInput = z.infer<typeof whiteLabelConfigSchema>;
