import { z } from 'zod';
import rawDatasets from '@tests/data/wiki-dynamic-datasets.json';

const contentVariant = z.strictObject({
  name: z.string().trim().min(1),
  content: z.string().min(1),
});

export const wikiDatasets = z
  .strictObject({
    create: z.array(contentVariant).min(1),
    update: z.array(contentVariant).min(1),
    nested: z
      .array(
        z.strictObject({
          name: z.string().trim().min(1),
          path: z.string().regex(/^[a-z0-9]+(?:\/[a-z0-9]+)*$/),
        }),
      )
      .min(1),
  })
  .parse(rawDatasets);
