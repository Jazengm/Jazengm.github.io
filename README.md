# Astro academic homepage

A static, accessible academic homepage template for a mathematics researcher. It separates verified profile data from content, stores publications, notes, illustrations, and experiments in typed Astro Content Collections, and limits React to four focused interactions: the site atlas, publication explorer, MDX demonstration, and fractal experiment.

The repository currently contains conspicuous fictional sample records. It does not claim a real identity, institution, paper, DOI, ORCID, or journal affiliation.

## First customization checklist

Before publishing the site as a personal academic record:

1. Open `src/config/site.ts` and replace every bracketed profile, biography, position, institution, location, research-area, timeline, research-theme, and teaching value.
2. Add only verified optional URLs or contact fields (`email`, `github`, `orcid`, `googleScholar`, `cvUrl`, and `avatar`). Leave an unknown value as `null`; the corresponding link will remain hidden.
3. Change `isPlaceholder` to `false` only after all profile fields are checked. This enables Person JSON-LD.
4. Replace the three files under `src/content/publications/` with real records and remove each placeholder warning only after verification.
5. Replace or remove the two sample notes and centralized sample course/theme data.
6. Replace or remove the two placeholder Illustration records and SVG color fields.
7. Update `site` and, when needed, `base` in `astro.config.mjs`; update the sitemap URL in `public/robots.txt`.
8. Replace the favicon and local diagrams if desired, then run the complete validation commands below.

Unknown personal information is deliberately centralized in `src/config/site.ts`. Example academic content lives in its relevant collection because that is where future real content belongs, and every such example has `[Placeholder]` in its title plus `placeholder: true` in frontmatter.

## Requirements and installation

- Node.js 24.18.0 (recorded in `.nvmrc`; any compatible Node 24 release satisfies `package.json#engines`)
- npm 11 or a compatible npm included with Node 24
- Git

With `nvm`:

```bash
nvm install
nvm use
npm ci
```

Without `nvm`, install an official compatible Node 24 release by your normal system method, verify it with `node --version`, then run `npm ci`. Use `npm ci`, not `npm install`, when you want an exact reproduction of `package-lock.json`.

## Local development

```bash
npm run dev
```

Open the URL printed by Astro (normally `http://localhost:4321`). Build and inspect the static output with:

```bash
npm run build
npm run preview
```

## Where content lives

For the complete file map, build pipeline, routing rules, styling boundaries, and a Home-page image example, see [Architecture and page generation](docs/architecture.md).

- `src/config/site.ts`: profile, navigation labels, research themes, course metadata, author-name matches, and canonical URL.
- `src/content/publications/`: one Markdown or MDX file per publication.
- `src/content/notes/`: one Markdown or MDX file per note.
- `src/content/illustrations/`: one Markdown or MDX description per gallery image.
- `src/content/experiments/`: experiment directory records.
- `src/content.config.ts`: all collection schemas. This is the source of truth for permitted frontmatter.
- `src/assets/`: images imported by content and processed by Astro.
- `public/`: files copied unchanged, such as `robots.txt`, downloads, and an optional `CNAME`.

Pages read these sources automatically. Adding a publication, note, illustration, or experiment does not require editing a listing component.

## Modify the profile and design

Edit `src/config/site.ts`. Navigation is defined there once and consumed by both the header and home page. Add, remove, or reorder a `navigation` item there; use a root-relative `href`, and the shared components will preserve the configured GitHub Pages base. Optional profile links are rendered only when their values are non-null.

The visual source of truth is `src/styles/tokens.css`. Change the semantic light and dark tokens there rather than placing colors in page components:

- `--color-bg`, `--color-surface`, and `--color-surface-muted` control the page and card hierarchy.
- `--color-text`, `--color-text-muted`, and `--color-border` control readable structure.
- `--color-primary` is academic blue; `--color-secondary` is the restrained orange accent. Their `-soft` and `-strong` forms handle states and links.
- `--color-focus` and `--color-halftone` control keyboard focus and decorative dots.

The reusable halftone utilities are in `src/styles/global.css`. Their decorative, `aria-hidden` spans currently appear only in the Home introduction, Research theme directory, and Experiments directory. Keep them local and sparse; do not turn the dots into a full-page background. Under reduced motion they are removed, and on small screens they are reduced.

## Add a publication

Copy one file in `src/content/publications/`, rename it with a stable lowercase identifier, and update its frontmatter. A minimal real entry is:

```yaml
---
title: "A verified paper title"
authors:
  - "Your Name"
  - "Coauthor Name"
year: 2026
status: "preprint"
abstract: "A verified abstract."
---
```

The publication year accepts an integer or `"TBA"`; status accepts `published`, `forthcoming`, `preprint`, or `working-paper`. Optional fields include `venue`, `tags`, `order`, `previewImage`, `previewImageAlt`, links, and `type`, whose accepted values are `article`, `book`, `chapter`, `thesis`, and `note`.

Fictional samples explicitly use `placeholder: true` and receive a visible label. Verified records should use `placeholder: false` or omit the field, whose schema default is `false`.

Set `authorNameMatches` in `src/config/site.ts` to the exact spellings that should be emphasized. Sorting, filters, author emphasis, desktop hover/focus previews, and mobile click previews are generated by `PublicationList.astro` and `PublicationExplorer.tsx`.

### Add a publication preview image

1. Put a local image in `src/assets/publications/`.
2. Reference it relative to the publication file, for example:

   ```yaml
   previewImage: "../../assets/publications/my-diagram.png"
   previewImageAlt: "A concise description of what the diagram communicates"
   ```

3. Always provide meaningful alt text. Omit both fields for the supported text-only preview.

Astro validates the image reference and handles dimensions/output. SVG samples are passed safely through Astro's image pipeline; raster images can use Astro's optimized formats.

## Add a Note

Create `src/content/notes/my-note.mdx` with:

```yaml
---
title: "My note"
description: "One useful sentence for lists and metadata."
publishedDate: 2026-07-30
tags: ["geometry"]
draft: false
placeholder: true
---
```

Set `placeholder: false` (or omit it) for verified notes. The included samples keep it `true` so their warning remains visible.

Write ordinary Markdown below the frontmatter. Inline math uses `$...$`; display math uses `$$...$$`. See `sample-math-note.mdx`. To embed a focused React island, import a component and add an Astro client directive as demonstrated by `interactive-parameters.mdx`:

```mdx
import MathDemo from "../../components/MathDemo";

<MathDemo client:visible />
```

Use an island only when stateful interaction is necessary; ordinary prose should remain static HTML.

## Add an Experiment

1. Create its implementation under `src/components/` and a route under `src/pages/experiments/`.
2. Add a directory record in `src/content/experiments/` with `title`, `description`, optional `tags`, and optional `thumbnail`/`thumbnailAlt`. The record filename determines its `/experiments/ID/` URL.
3. Load that record in the route with `getEntry()` so its title and description remain single-source.
4. Prefer `client:visible` so heavier programs hydrate only near the viewport.
5. Bound expensive inputs, announce progress, provide keyboard/touch controls, and test the narrow layout.

The included Mandelbrot/Julia explorer is a reference: a React Canvas 2D island delegates bounded computation to `src/workers/fractal.worker.ts` and supports drag, wheel/buttons, keyboard pan controls, iterations, Julia parameters, reset, viewport readout, and PNG export.

## Add an Illustration

Put the local image under `src/assets/illustrations/` and add a matching Markdown record under `src/content/illustrations/`. The gallery and full-size detail route are generated automatically from that record. See [Manually add an illustration](docs/architecture.md#manually-add-an-illustration) for the complete frontmatter example and accessibility checklist.

`imageAlt` is optional; when omitted, the illustration title is used as a fallback. Add a specific `imageAlt` whenever the image conveys information, and use `imageAlt: ""` only for a decorative image.

## Checks and tests

Install the Playwright browser once on each machine:

```bash
npx playwright install chromium
```

Then run the same checks as CI:

```bash
npm ci
npm run format:check
npm run check
npm run build
npm run test
```

Use `npm run format` to apply formatting. Browser tests cover required routes, navigation, desktop and touch publication previews, Illustration hover/focus/detail behavior, ResearchMap keyboard access, fractal controls, MDX math/islands, uncaught console errors, theme and reduced-motion behavior, and horizontal overflow at 360px and 768px.

## GitHub Pages deployment

`.github/workflows/deploy.yml` follows Astro's official GitHub Pages workflow. A `main` push deploys only after CI succeeds for that exact commit. Manual dispatch runs the same repository checks before build and deployment. In GitHub, open **Settings → Pages** and choose **GitHub Actions** as the source.

For this special user-site repository, configuration is:

```js
site: "https://jazengm.github.io",
base: "/",
```

### Repository-name and `base` troubleshooting

If the repository is instead named `academic-homepage-astro`, its Pages URL is `https://USERNAME.github.io/academic-homepage-astro/`. Set:

```js
site: "https://USERNAME.github.io",
base: "/academic-homepage-astro",
```

Internal links use `withBase()` or Astro asset URLs so the prefix is preserved. If a newly added internal link starts at `/` and works locally but fails on Pages, pass it through `withBase()` and test a production build. Also update `canonicalUrl` in `src/config/site.ts` and the sitemap URL in `public/robots.txt`.

### Custom domain

After configuring the domain and DNS in GitHub, add `public/CNAME` containing only the verified domain, for example `math.example.edu`. Then set `site` and `canonicalUrl` to `https://math.example.edu`, use `base: "/"`, and update `robots.txt`. No fictional CNAME is included in this template.

### Roll back the visual redesign

The annotated tag `pre-visual-redesign-20260731` points to the last verified commit before the architecture and visual redesign. It is a recovery reference, not an instruction to rewrite shared history.

To inspect the complete redesign:

```bash
git fetch origin --tags
git diff pre-visual-redesign-20260731..main
```

To undo it on the shared branch, list the redesign commits and revert them newest first, then push the new revert commits:

```bash
git log --oneline pre-visual-redesign-20260731..main
git revert <visual-commit-sha>
git revert <architecture-commit-sha>
git push origin main
```

Do not reset `main`, force-push, or delete the recovery tag. For non-deploying inspection, create a separate branch at the tag with `git switch -c inspect-pre-redesign pre-visual-redesign-20260731`.

## A second computer and the recommended two-machine workflow

Clone a separate working copy on the second computer:

```bash
git clone https://github.com/Jazengm/Jazengm.github.io.git
cd Jazengm.github.io
nvm install
nvm use
npm ci
npx playwright install chromium
npm run dev
```

For each editing session on either computer:

```bash
git pull --rebase
# modify files
npm run check
npm run build
git add .
git commit -m "Describe the change"
git push
```

Run `npm run test` for interactive, layout, dependency, or infrastructure changes. Do not synchronize one Git working directory through Dropbox, OneDrive, iCloud Drive, or another cloud drive. Clone separately on each computer and synchronize commits through Git; pull before editing and push after a verified commit.

## Architecture notes

Astro renders all ordinary content and navigation to static HTML. React is not loaded on About, Teaching, Research, or the Notes/Experiments indexes. Theme switching is a tiny native script. Semantic CSS variables provide the system-font blue-orange light/dark design; motion stays between 120–250 ms and collapses under `prefers-reduced-motion`. Placeholder Person JSON-LD is withheld until the centralized profile is verified.

See [Architecture and page generation](docs/architecture.md) for a maintainer-oriented explanation of file responsibilities and how data becomes a deployed page.

The repository is MIT licensed. See `AGENTS.md` for rules that future coding agents must follow.
