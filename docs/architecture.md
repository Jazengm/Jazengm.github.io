# Architecture and page generation / 文件架构与页面生成

This document explains where to make common changes and how source files become the static pages deployed to GitHub Pages. The short rule is: keep facts in data sources, keep page composition in `src/pages/`, and keep reusable presentation in components and styles.

## Project map

```text
.
├── astro.config.mjs           Astro integrations, canonical site URL, and base path
├── public/                    Files copied to the built site without processing
├── src/
│   ├── assets/                Images imported and processed by Astro
│   ├── components/            Reusable Astro structure and focused React islands
│   ├── config/site.ts         Profile, navigation, themes, courses, and site settings
│   ├── content/               Publication, note, illustration, seminar, and experiment records
│   ├── content.config.ts      Build-time schemas for those content records
│   ├── layouts/               Shared page shells
│   ├── pages/                 File-based routes; each file becomes a URL
│   ├── styles/                Global design tokens and shared styles
│   ├── utils/                 Small shared helpers such as base-aware URLs
│   └── workers/               Background code used by interactive experiments
├── tests/                     Generic browser-level checks
└── README.md                  Setup, content-entry, and deployment instructions
```

## From source to page

Astro builds this project into static HTML, CSS, and assets. There is no application server in production.

```text
site.ts or src/content records
              ↓
Astro page in src/pages
              ↓
layouts + Astro components + optional React island
              ↓
global tokens/styles + page-scoped <style>
              ↓
static files in dist/ → GitHub Pages
```

At build time, Astro executes the TypeScript between the two `---` fences in an `.astro` file. That code can import configuration, query a content collection, sort records, and prepare component props. The markup below the second fence is then rendered to HTML. A `<style>` block inside an Astro page or component is scoped to that file unless it is explicitly marked global.

React is reserved for stateful interactions. Components with directives such as `client:visible` are rendered initially and hydrated in the browser only when needed. Ordinary pages remain static HTML and do not ship React.

## File-based routing

Files under `src/pages/` define URLs:

| Source file                             | Generated route           | Purpose                      |
| --------------------------------------- | ------------------------- | ---------------------------- |
| `src/pages/index.astro`                 | `/`                       | Home page                    |
| `src/pages/about.astro`                 | `/about`                  | About page                   |
| `src/pages/publications.astro`          | `/publications`           | Publication directory        |
| `src/pages/research.astro`              | `/research`               | Research-theme directory     |
| `src/pages/teaching.astro`              | `/teaching`               | Course directory             |
| `src/pages/notes/index.astro`           | `/notes`                  | Note directory               |
| `src/pages/notes/[...id].astro`         | `/notes/ENTRY-ID`         | One route per non-draft note |
| `src/pages/illustrations/index.astro`   | `/illustrations`          | Image-led illustration index |
| `src/pages/illustrations/[...id].astro` | `/illustrations/ENTRY-ID` | One full-size image detail   |
| `src/pages/seminars/index.astro`        | `/seminars`               | Seminar directory            |
| `src/pages/seminars/[...id].astro`      | `/seminars/ENTRY-ID`      | One seminar description      |
| `src/pages/experiments/index.astro`     | `/experiments`            | Experiment directory         |
| `src/pages/experiments/fractal.astro`   | `/experiments/fractal`    | One interactive experiment   |
| `src/pages/404.astro`                   | `/404`                    | Static not-found page        |

`[...id].astro` is a dynamic route template. Its `getStaticPaths()` function reads the corresponding notes or illustrations collection and tells Astro which concrete paths to generate. The result is still a set of static pages.

Adding a publication, note, illustration, or experiment directory record normally updates its listing automatically because the listing page calls `getCollection()`. An experiment implementation still needs a matching page route because each interactive program has its own UI and code.

## Sources of truth

Choose the source according to what the information represents:

| Change                                                  | Source of truth                                            |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| Name, position, institution, biography, profile links   | `src/config/site.ts`                                       |
| Navigation labels, descriptions, and order              | `src/config/site.ts`                                       |
| Home-only wording or section order                      | `src/pages/index.astro`                                    |
| Papers included in the Home selected list               | `selected` in each publication record                      |
| Publication, note, illustration, or experiment metadata | A file under `src/content/`                                |
| Allowed content frontmatter fields                      | `src/content.config.ts`                                    |
| Shared header, metadata, main container, and footer     | `src/layouts/BaseLayout.astro`                             |
| Shared long-form note presentation                      | `src/layouts/ContentLayout.astro`                          |
| Reusable visual block                                   | `src/components/`                                          |
| Site-wide colors, widths, spacing, and typography       | `src/styles/tokens.css`                                    |
| Shared element and utility styles                       | `src/styles/global.css` and `src/styles/prose.css`         |
| Publication explorer presentation                       | `src/styles/publications.css`                              |
| Research-map and math-demo island presentation          | `src/styles/research-map.css` / `src/styles/math-demo.css` |
| Fractal experiment presentation                         | `src/styles/fractal.css`                                   |
| Styles used by only one static page/component           | That file's scoped `<style>` block                         |

This separation prevents the same fact from being repeated in multiple components. For example, navigation is declared once in `site.ts`; both the header and Home page derive their links from it.

## How the main content types are generated

### Home and ordinary pages

`src/pages/index.astro` imports `site`, queries selected publication records, and composes the Home sections directly. `BaseLayout` supplies the common document head, header, main container, theme setup, and footer. Pages such as About and Research follow the same pattern.

Use the page file to change section order or Home-only content. Move a block to `src/components/` when it becomes reusable. Do not add React merely to split markup into a component; an `.astro` component is the default for static structure.

The Home **Selected papers** list is not a manually duplicated array. Add `selected: true` to each publication that should appear there. The page removes `site.name` and every `authorNameMatches` value from the coauthor phrase, uses `venue` as the journal name, and falls back to “Preprint” when no venue is present. All selected records currently appear; changing `selected` does not remove a paper from the full Publications page.

### Publications

Each Markdown or MDX file under `src/content/publications/` is loaded and validated against the `publications` schema. `PublicationList.astro` prepares the records and passes them to `PublicationExplorer.tsx`, the stateful filter and preview interface.

The record filename becomes its stable entry ID. Adding a valid record is enough for it to appear in the directory; no publication array should be maintained elsewhere.

Publication sorting is shared by Home and the complete directory through `src/utils/publications.ts`. Keep the `selected` flag in frontmatter rather than adding a separate Home-specific paper list.

### Notes

The notes index queries all non-draft records. The dynamic `[...id].astro` route generates one static URL per note, renders the Markdown/MDX body, and places it inside `ContentLayout.astro`.

MDX may import a focused interactive component, but ordinary prose and mathematics should remain Markdown.

### Mathematics and syntax highlighting

`astro.config.mjs` sends Markdown and MDX through `remark-math` and `rehype-katex`; `BaseLayout.astro` loads the matching KaTeX stylesheet. The root dependency is intentionally pinned to `katex: "0.16.47"`, the version used by `rehype-katex@7.0.1`. Keep these versions aligned: mixing a 0.16 renderer with the renamed sizing selectors in KaTeX 0.18 CSS makes superscripts and root indices incorrectly inherit the full base size.

Do not upgrade KaTeX by changing only one dependency. After changing package metadata or on a new machine, run `npm ci` so `node_modules` matches `package-lock.json`. If rendered TeX suddenly has incorrect script or root sizes, verify `npm ls katex rehype-katex` and make sure both resolve to `katex@0.16.47` before changing page styles.

Astro highlights fenced code with Shiki. Shiki calls the Wolfram Language grammar `wolfram`, so the Markdown-friendly `mathematica` name is registered as an alias in `markdown.shikiConfig.langAlias`. Either fence works:

````markdown
```mathematica
Plot[Sin[x], {x, 0, 2 Pi}]
```
````

### Experiments

The experiments index gets title, description, tags, and optional thumbnail from `src/content/experiments/`. Its links are derived from each record ID. An experiment route uses `getEntry()` to load the same metadata instead of duplicating it in the page implementation.

### Illustrations

Each record in `src/content/illustrations/` supplies a title, short summary, imported image, accurate alternative text, optional metadata, and a Markdown body with the detailed description. The filename becomes the stable entry ID. The static index renders the image grid, while `src/pages/illustrations/[...id].astro` generates one full-size detail page per record.

The visible title overlay appears on pointer hover and keyboard focus. On devices without hover it remains visible, so a mouse is never required to identify or open an image.

### Manually add an illustration

1. Put the original local image in `src/assets/illustrations/`. Prefer a high-quality `jpg`, `png`, `webp`, `avif`, or `svg`; do not commit an unnecessarily large camera original.
2. Create `src/content/illustrations/my-image.md`. The lowercase filename becomes `/illustrations/my-image/`.
3. Add frontmatter in this form:

```yaml
---
title: "My illustration"
summary: "A short sentence used on the detail page and in metadata."
image: "../../assets/illustrations/my-image.jpg"
imageAlt: "A concrete description of the image for someone who cannot see it"
date: 2026-08-03
medium: "Ink and digital color"
dimensions: "2400 × 1600 px"
tags: ["algebraic geometry", "diagram"]
order: 10
placeholder: false
---
Write the detailed description here. Explain the subject, mathematical idea,
construction process, medium, provenance, and any visual details that need more
context than the alternative text.
```

4. Keep `summary` concise, but make the Markdown body useful on its own. `date`, `medium`, `dimensions`, `tags`, and `imageAlt` are optional; `title`, `summary`, and `image` are required.
5. Write `imageAlt` for the image itself, not merely its title. If it is omitted, the page uses the illustration title as a fallback; use `imageAlt: ""` only for a genuinely decorative image. Do not begin with “image of,” and do not put essential information only in the hover overlay.
6. Use `placeholder: true` only for explicit template samples. Use `order` to control gallery order; lower numbers appear first.
7. Run the complete checks before committing. No gallery component or route table needs manual editing.

## Images: `src/assets` or `public`?

Prefer `src/assets/` for page images. Importing an image lets Astro validate the path, read its dimensions, and process the output. Use `public/` for files that must retain their exact filename or are referenced as plain URLs, such as a downloadable PDF, favicon, or `CNAME`.

| Requirement                                             | Recommended location |
| ------------------------------------------------------- | -------------------- |
| Portrait, illustration, diagram, or publication preview | `src/assets/`        |
| Favicon, download, robots file, or stable untouched URL | `public/`            |

### Example: add an optimized image to Home

Place a file at `src/assets/profile.jpg`, then edit `src/pages/index.astro`:

```astro
---
import { Image } from "astro:assets";
import profileImage from "../assets/profile.jpg";
---

<Image
  class="home-portrait"
  src={profileImage}
  alt="A concise, accurate description of the portrait"
  loading="eager"
/>
```

Add Home-specific presentation in the same file's `<style>` block:

```css
.home-portrait {
  width: min(100%, 22rem);
  aspect-ratio: 4 / 5;
  object-fit: cover;
  border-radius: var(--radius-md);
}
```

For a two-column introduction, wrap the text and image in a `home-hero` section and use a responsive grid:

```css
.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(14rem, 22rem);
  align-items: center;
  gap: clamp(2rem, 6vw, 5rem);
}

@media (max-width: 720px) {
  .home-hero {
    grid-template-columns: 1fr;
  }
}
```

If the image is profile data that should be configurable, the existing `site.avatar` field can instead contain a URL under `public/`. Render it conditionally and pass the path through `withBase()`:

```astro
{
  site.avatar && (
    <img src={withBase(site.avatar)} alt={`${site.name} portrait`} />
  )
}
```

The distinction is useful: `site.ts` answers _which portrait belongs to the profile_, while `index.astro` and its CSS answer _where and how it is presented_.

## Layout and styling boundaries

Start with the narrowest appropriate scope:

1. Change a page's `<style>` block for a layout unique to that page.
2. Extract a component when markup and styles are reused.
3. Add a shared utility to `global.css` only when several unrelated pages need it.
4. Change `tokens.css` only when the design decision should apply site-wide.

Two width tokens are especially important:

- `--content-width` limits long prose to a readable line length.
- `--wide-width` limits the overall site shell and wider grids.

Removing `content-column` from an outer section can be appropriate when that section becomes a multi-column hero, but the text inside it should usually keep a readable maximum width.

Light and dark colors are defined together in `tokens.css`. Primary blue, secondary orange, focus, surfaces, and the halftone color are semantic decisions rather than page-level values. Any new color must be checked in both themes, along with keyboard focus, touch layout, reduced motion, and meaningful image alternative text. The local SVG and worker-rendered canvas palettes are the only intentional non-CSS copies because CSS custom properties are not available inside those standalone assets and worker pixels.

## Internal URLs and GitHub Pages

Internal links created in TypeScript or component props should pass through `withBase()` from `src/utils/paths.ts`. This preserves the repository prefix if the site is later deployed at a URL such as `/repository-name/` rather than the domain root.

Imported Astro assets already receive build-aware URLs. Do not prepend `withBase()` to an imported `Image` source.

## Before committing a structural change

Run the repository checks:

```bash
npm run format:check
npm run check
npm run build
npm run test
```

If formatting fails, run `npm run format`, review the resulting diff, and repeat the checks.

Use the browser tests for responsive layout, navigation, or interactive changes. Also inspect both themes and a narrow viewport when changing visual structure.
