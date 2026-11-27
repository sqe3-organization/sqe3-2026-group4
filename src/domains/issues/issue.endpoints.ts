const issues = (projectId: string) => `projects/${projectId}/issues`;

export const issueEndpoints = {
  issues,
  issue: (projectId: string, iid: number) => `${issues(projectId)}/${iid}`,
} as const;
