import type { CollectionEntry } from "astro:content";

type PublicationEntry = CollectionEntry<"publications">;

const publicationYearSortValue = (year: number | "TBA") =>
  year === "TBA" ? Number.MAX_SAFE_INTEGER : year;

export const comparePublications = (
  left: PublicationEntry,
  right: PublicationEntry,
) =>
  publicationYearSortValue(right.data.year) -
    publicationYearSortValue(left.data.year) ||
  (left.data.order ?? Number.MAX_SAFE_INTEGER) -
    (right.data.order ?? Number.MAX_SAFE_INTEGER);
