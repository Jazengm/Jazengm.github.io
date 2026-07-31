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
      abstract: z.string(),
      shortAbstract: z.string().optional(),
      tags: z.array(z.string()).default([]),
      featured: z.boolean().default(false),
      order: z.number().optional(),
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
    featured: z.boolean().default(false),
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
      featured: z.boolean().default(false),
      path: z.string(),
      placeholder: z.boolean().default(false),
    }),
});

export const collections = { publications, notes, experiments };
