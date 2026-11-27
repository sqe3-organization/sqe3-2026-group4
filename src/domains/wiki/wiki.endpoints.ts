const pages = (projectId: string) => `projects/${projectId}/wikis`;

export const wikiEndpoints = {
  pages,
  page: (projectId: string, slug: string) =>
    `${pages(projectId)}/${encodeURIComponent(slug)}`,
} as const;
