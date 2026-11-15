import { z } from 'zod';

export const IssueSchema = z.object({
  id: z.number(),
  iid: z.number(),
  project_id: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  state: z.enum(['opened', 'closed']),
  created_at: z.string(),
  updated_at: z.string().optional(),
  closed_at: z.string().nullable().optional(),
  labels: z.array(z.string()),
  author: z.object({
    id: z.number(),
    username: z.string(),
    name: z.string().optional(),
    state: z.string().optional()
  }).optional(),
  web_url: z.string().url().optional()
});

export const IssueListSchema = z.array(IssueSchema);

export const IssueErrorSchema = z.object({
  message: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  error: z.string().optional()
});

export type Issue = z.infer<typeof IssueSchema>;
export type IssueList = z.infer<typeof IssueListSchema>;
export type IssueError = z.infer<typeof IssueErrorSchema>;
