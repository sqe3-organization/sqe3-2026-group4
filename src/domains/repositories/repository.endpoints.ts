const repository = (projectId: string) => `projects/${projectId}/repository`;
const blob = (projectId: string, sha: string) =>
  `${repository(projectId)}/blobs/${sha}`;

export const repositoryEndpoints = {
  tree: (projectId: string) => `${repository(projectId)}/tree`,
  blob,
  rawBlob: (projectId: string, sha: string) => `${blob(projectId, sha)}/raw`,
} as const;
