import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const linksSchema = z
  .object({
    pdf: z.string().optional(),
    doi: z.string().optional(),
    arxiv: z.string().optional(),
    code: z.string().optional(),
    slides: z.string().optional(),
    journal: z.string().optional(),
  })
  .optional();

// Collection schemas validate frontmatter during development and production builds.
// A record's filename becomes its entry ID, which listing pages use to derive URLs.
const publications = defineCollection({
  loader: glob({
    base: "./src/content/publications",
    pattern: "**/*.{md,mdx}",
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      authors: z.array(z.string()).min(1),
      year: z.union([z.number().int(), z.literal("TBA")]),
      venue: z.string().optional(),
      status: z.enum(["published", "forthcoming", "preprint", "working-paper"]),
      type: z.enum(["article", "book", "chapter", "thesis", "note"]).optional(),
      abstract: z.string().min(1),
      tags: z.array(z.string()).default([]),
      order: z.number().optional(),
      selected: z.boolean().default(false),
      previewImage: image().optional(),
      previewImageAlt: z.string().optional(),
      links: linksSchema,
      placeholder: z.boolean().default(false),
    }),
});

const notes = defineCollection({
  loader: glob({ base: "./src/content/notes", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    placeholder: z.boolean().default(false),
  }),
});

const experiments = defineCollection({
  loader: glob({ base: "./src/content/experiments", pattern: "**/*.{md,mdx}" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      thumbnail: image().optional(),
      thumbnailAlt: z.string().optional(),
      placeholder: z.boolean().default(false),
    }),
});

const illustrations = defineCollection({
  loader: glob({
    base: "./src/content/illustrations",
    pattern: "**/*.{md,mdx}",
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string().min(1),
      image: image(),
      imageAlt: z.string().optional(),
      date: z.coerce.date().optional(),
      medium: z.string().optional(),
      dimensions: z.string().optional(),
      tags: z.array(z.string()).default([]),
      order: z.number().default(0),
      placeholder: z.boolean().default(false),
    }),
});

const seminars = defineCollection({
  loader: glob({ base: "./src/content/seminars", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    term: z.string().min(1),
    summary: z.string().min(1),
    order: z.number().default(0),
  }),
});

export const collections = {
  publications,
  notes,
  experiments,
  illustrations,
  seminars,
};
