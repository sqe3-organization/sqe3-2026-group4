import { z } from 'zod';

export const TreeEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['blob', 'tree', 'commit']),
  path: z.string(),
  mode: z.string()
});

export const RepositoryTreeSchema = z.array(TreeEntrySchema);

export const BlobSchema = z.object({
  sha: z.string(),
  size: z.number(),
  encoding: z.literal('base64'),
  content: z.string()
});

export const GitLabUserSchema = z.object({
  id: z.number(),
  username: z.string()
});

export const GitLabErrorSchema = z.object({
  message: z.string()
});

export type TreeEntry = z.infer<typeof TreeEntrySchema>;
export type RepositoryTree = z.infer<typeof RepositoryTreeSchema>;
export type Blob = z.infer<typeof BlobSchema>;
export type GitLabUser = z.infer<typeof GitLabUserSchema>;
export type GitLabError = z.infer<typeof GitLabErrorSchema>;
