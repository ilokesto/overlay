import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';

const packageDocs = (dir: string) =>
  defineDocs({
    dir,
    docs: {
      schema: pageSchema,
      postprocess: {
        includeProcessedMarkdown: true,
      },
    },
    meta: {
      schema: metaSchema,
    },
  });

export const overlay = packageDocs('../docs');

export const overlayReleased = packageDocs('../docs-publication/.generated/overlay/docs');

export default defineConfig();
