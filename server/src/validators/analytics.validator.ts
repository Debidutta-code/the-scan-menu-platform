import { z } from 'zod';

export const analyticsQuerySchema = z
  .object({
    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid ISO date string for startDate',
      })
      .optional(),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid ISO date string for endDate',
      })
      .optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional(),
    sortBy: z.enum(['quantity', 'revenue']).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'startDate must be less than or equal to endDate',
      path: ['startDate'],
    }
  );
