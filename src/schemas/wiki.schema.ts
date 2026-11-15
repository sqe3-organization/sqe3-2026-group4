import { z } from 'zod';

export const WikiPageSummarySchema = z.object({
  title: z.string(),
  slug: z.string().min(1),
  format: z.string(),
});

export const WikiPageSchema = WikiPageSummarySchema.extend({
  content: z.string(),
});

export const WikiPageListSchema = z.array(WikiPageSummarySchema);
export const WikiPageContentListSchema = z.array(WikiPageSchema);

export const WikiErrorSchema = z.union([
  z.object({
    message: z.union([z.string().min(1), z.record(z.string(), z.unknown())]),
  }),
  z.object({
    error: z.string().min(1),
    error_description: z.string().optional(),
    scope: z.string().optional(),
  }),
]);

export type WikiPage = z.infer<typeof WikiPageSchema>;
export type WikiPageSummary = z.infer<typeof WikiPageSummarySchema>;
