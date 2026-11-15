import { z } from 'zod';

/**
 * The fields below are the stable part of the GitLab project-label response.
 * Optional fields keep the contract compatible with GitLab versions that do
 * not return every counter or metadata field for every request.
 */
export const LabelSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  color: z.string().min(1),
  description: z.string().nullable().optional(),
  priority: z.number().int().nonnegative().nullable().optional(),
  archived: z.boolean().optional(),
  text_color: z.string().optional(),
  is_project_label: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  open_issues_count: z.number().int().nonnegative().optional(),
  closed_issues_count: z.number().int().nonnegative().optional(),
  open_merge_requests_count: z.number().int().nonnegative().optional(),
});

export const LabelListSchema = z.array(LabelSchema);

export const LabelErrorSchema = z.object({
  message: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  error: z.string().optional(),
});

export type Label = z.infer<typeof LabelSchema>;
export type LabelError = z.infer<typeof LabelErrorSchema>;
