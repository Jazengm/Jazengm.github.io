# Astro academic homepage

A static, accessible academic homepage for Xiangru Zeng. It separates profile data from content, stores publications, illustrations, seminars, and experiments in typed Astro Content Collections, and reserves React for interactive islands such as the fractal experiment and Pocket House music toy.

Only verified content should be placed in a collection that is published by the site.

## English / Chinese language switch

The top left displays **Xiangru Zeng | 曾相如** on one line. Click a name to select its language: the current name is bold and fully opaque; the other is lighter and highlights orange on hover or keyboard focus. The choice persists across pages; `?lang=zh` and `?lang=en` also select a language explicitly. Keyboard users can focus either name button and press Enter or Space.

Translations are maintained in `src/i18n/catalog.ts`; the two names live in `src/config/site.ts`. See [translation maintenance and pending names](docs/translations.md) for coverage, author-name placeholders, typography, and adding translations. The bilingual interface is published on `main`; verify changes on `site-development` before syncing.

## Content checklist

Before publishing new content:

1. Edit profile, contact, navigation, and canonical URL values in `src/config/site.ts`.
2. Add only verified publications, illustrations, seminars, and experiments to their content collections.
3. Leave unknown optional profile URLs as `null`; their links remain hidden.
4. Update `site` and, when needed, `base` in `astro.config.mjs`; update the sitemap URL in `public/robots.txt`.
5. Run the complete validation commands below before committing.

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

## Pocket House music toy

The development-only `/play/` page is now a canvas-led audiovisual instrument, inspired by [Mikutap's click/drag/keyboard interaction](https://aidn.jp/mikutap/), not a copy of its voices or artwork. Turn down your device volume and click **Start**. All sounds and geometry are generated locally; no backend, microphone, AI, or audio sample downloads. Tone.js 15.1.22 (MIT) remains the only audio dependency; this redesign adds no packages. Its [license](public/licenses/tone-MIT.txt) is retained. Do not merge this experimental page to `main` without explicit approval.

- Play **A–Z and 1–6**, or click/drag across the canvas; multi-touch is supported. Its 8×4 sound map follows `qwertyuiopasdfghjklzxcvbnm123456`, left-to-right/top-to-bottom. Open **Sound keys / playing guide** for 32 accessible buttons and names. Eight plucks, eight FM bells, four bass notes, four chords and eight percussion/effect sounds share an A-minor/C-major palette.
- **Style** retains House (124 BPM) and adds **Dub techno** (118 BPM, deep kicks and filtered chord echoes), **Bossa nova** (132 BPM, soft percussion, root/fifth bass and syncopated seventh chords), and **Liquid funk** (172 BPM, broken kick/snare rhythms and sustained chords). These are original synthesized, genre-inspired sketches, not recordings or authenticity claims. All share A minor / C major so the 32 sound keys remain compatible. Choose before Start or select while playing; the latest choice takes effect at the next bar, with a pending message. No additional audio context is created for a switch.
- Sound responds immediately by default. **Snap to beat** aligns hits to the next sixteenth at the active style's tempo. **Backtrack** provides separate drums, bass and chords; turn it off for solo performance. **Space** toggles backing while the canvas has focus; **Escape** stops. Shortcuts are scoped to this instrument and do not intercept slider/select editing or IME composition.
- **Auto motion**, enabled by default, draws gentle background shapes on backing drum/chord accents after Start, even without touching the canvas. Dub techno uses slow cool orbits, bossa nova uses warm swaying arcs, and liquid funk uses cool flowing ribbons. Disable it to keep manual visuals only. Backtrack off, zero volume, Stop, hidden tabs, and reduced-motion preference suppress automatic animation. No sound or rhythmic animation autoplays on page load; this is beat-matched geometry, not a classical-music track.
- Every hit creates a stage-spanning composition: expanding rings, triangular portals, radial fans, wide ribbons, iris arcs, diagonal sweeps, kaleidoscopic diamonds or meteor trails. There is no visible grid. **Visuals** toggles all drawing; reduced-motion preference uses small manual still shapes without automatic background pulses. The renderer limits manual compositions to eight, with at most two additional low-opacity background pulses. Each style subtly changes the manual palette and rotation as well.
- **Fullscreen** opens edge-to-edge with only the canvas: no toolbar, labels, beat indicator or instructions. Press **?**, or tap the bottom-right corner, to reveal/hide controls. The corner button also appears on hover or keyboard focus. **Escape** stops audio and exits fullscreen. This mode requires browser fullscreen support.
- Volume and Echo sliders accept arrow keys. Default/reset volume remains 100%, with a master gain of 4 (previously 2): twice the previous signal amplitude at the same slider setting, approximately +6 dB before limiting. A 50% setting now matches the previous 100% gain. This does not promise twice the perceived loudness; a final -3 dB limiter bounds boosted peaks. Start with low device volume. Stop closes audio, clears animations and pending work; Reset also restores settings. Hiding the tab or leaving the page stops playback; returning is silent. No AudioContext is created just by visiting.

Practical limits: sound starts only after a browser gesture; Bluetooth/device buffering adds latency, and snap mode adds up to one sixteenth-note wait. Dense input is deliberately dropped rather than queued; polyphony and canvas work are capped. Low-end phones may still lose frames. This is synthesized instrumental audio, not Mikutap-style vocal sampling. iOS/Safari, real touch hardware, headphone/speaker balance and artistic quality need manual checks beyond headless Chromium tests. See [the audio architecture](docs/architecture.md#pocket-house-audio-island) for tuning and safeguards. Stop the local dev server before a production build, then restart it: simultaneous dev/build can leave Astro/Vite's shared optimization cache with incompatible JSX runtime exports.

## Where content lives

For the complete file map, build pipeline, routing rules, styling boundaries, and a Home-page image example, see [Architecture and page generation](docs/architecture.md).

- `src/config/site.ts`: profile, navigation labels, author-name matches, and canonical URL.
- `src/content/publications/`: one Markdown or MDX file per publication.
- `src/content/illustrations/`: one Markdown or MDX description per gallery image.
- `src/content/seminars/`: one Markdown file per seminar; metadata and the complete description stay together.
- `src/content/experiments/`: experiment directory records.
- `src/content.config.ts`: all collection schemas. This is the source of truth for permitted frontmatter.
- `src/assets/`: images imported by content and processed by Astro.
- `public/`: files copied unchanged, such as `robots.txt`, downloads, and an optional `CNAME`.

Pages read these sources automatically. Adding a publication, illustration, seminar, or experiment does not require editing a listing component.

## Modify the profile and design

Edit `src/config/site.ts`. Navigation is defined there once and consumed by the shared header. Add, remove, or reorder a `navigation` item there; use a root-relative `href`, and the shared components will preserve the configured GitHub Pages base. Optional profile links are rendered only when their values are non-null.

The visual source of truth is `src/styles/tokens.css`. Change the semantic light and dark tokens there rather than placing colors in page components:

- `--color-bg`, `--color-surface`, and `--color-surface-muted` control the page and card hierarchy.
- `--color-text`, `--color-text-muted`, and `--color-border` control readable structure.
- `--color-primary` is academic blue; `--color-secondary` is the restrained orange accent. Their `-soft` and `-strong` forms handle states and links.
- `--color-focus` and `--color-halftone` control keyboard focus and decorative dots.

The reusable halftone utilities are in `src/styles/global.css`. Their decorative, `aria-hidden` spans appear in the Experiments directory, not over the Home artwork. Keep them local and sparse; do not turn the dots into a full-page background. Under reduced motion they are removed, and on small screens they are reduced.

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
selected: true
---
```

The publication year accepts an integer or `"TBA"`; status accepts `published`, `forthcoming`, `preprint`, or `working-paper`. Optional fields include `venue`, `tags`, `order`, `selected`, `previewImage`, `previewImageAlt`, links, and `type`, whose accepted values are `article`, `book`, `chapter`, `thesis`, and `note`.

Set `authorNameMatches` in `src/config/site.ts` to the exact spellings that should be emphasized. Sorting, author emphasis, desktop hover/focus previews, and mobile click previews are generated by `PublicationList.astro` and `PublicationExplorer.tsx`. The published interface intentionally omits keyword and dropdown filters.

### Home artwork and temporarily hidden sections

Home displays artwork from the Illustration collection behind the profile. Images are ordered by `order`, then title; the browser selects `floor(Date.now() / 3600000) % imageCount`. It updates at each whole hour and when returning to the tab. This uses the visitor's clock (no external time service or live image scraping). The cycle is shared across time zones for the same instant; a wrong device clock can select a different image. Without JavaScript, the first artwork remains a working link.

The theme's original background color is opaque at the left and fades toward the unobscured right edge. The background links to the matching illustration without a visible title overlay. Its accessible name (for screen readers) and destination follow the language switch. Add an illustration normally (see below); its image automatically joins the next built site's rotation. Rendering, gradient, and scheduling live in `HomeArtwork.astro`, `src/pages/index.astro`, and `src/scripts/home-artwork.ts`; no additional dependencies are needed.

**Selected papers and the Events preview are temporarily not rendered on Home.** Their content, publication `selected` flags, full Publications/Events pages, and navigation remain intact. `selected` currently has no visible effect on Home; retain it for a future restoration rather than deleting records.

### Add a publication preview image

1. Put a local image in `src/assets/publications/`.
2. Reference it relative to the publication file, for example:

   ```yaml
   previewImage: "../../assets/publications/my-diagram.png"
   previewImageAlt: "A concise description of what the diagram communicates"
   ```

3. Always provide meaningful alt text. Omit both fields for the supported text-only preview.

Astro validates the image reference and handles dimensions/output. SVG samples are passed safely through Astro's image pipeline; raster images can use Astro's optimized formats.

## Add a Seminar

Create one Markdown file under `src/content/seminars/`. Its filename becomes the detail URL, while its frontmatter supplies the list label and page metadata:

```yaml
---
title: "Seminar title"
term: "2026 Fall"
summary: "A concise description used in page metadata."
order: 1
---
Write the complete seminar description here. Markdown headings, lists, links,
mathematics, and code blocks are supported.
```

For example, `mixed-hodge-structures.md` generates `/seminars/mixed-hodge-structures/` and appears on the Seminars index as “Mixed Hodge Structures (2026 Fall).” Keep the complete editable description below the frontmatter in that same file; no page component needs to be edited.

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

Use `npm run format` to apply formatting. Browser tests cover required and removed routes, navigation, selected-paper citations and footer spacing, desktop and touch publication previews, Illustrations hover/focus/detail behavior, seminar routing and Markdown content, KaTeX script sizing, Mathematica highlighting, fractal controls, uncaught console errors, theme and reduced-motion behavior, and horizontal overflow at 360px and 768px.

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

After configuring the domain and DNS in GitHub, add `public/CNAME` containing only the verified domain, for example `math.example.edu`. Then set `site` and `canonicalUrl` to `https://math.example.edu`, use `base: "/"`, and update `robots.txt`. No example CNAME is committed.

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

### Events calendar

`/events/` lists reviewed algebraic-geometry, matroid and algebraic-combinatorics
meetings in China and nearby regions, with separate upcoming and past sections.
The Home preview is temporarily hidden. Navigation still uses the Events entry
in `src/config/site.ts` and links to the complete calendar.

Edit `src/content/events/events.json` to add/remove a meeting (`id`, `title`, ISO
`start`/`end`, `location`, `topics`, official `url`). Update Chinese display
translations in `src/i18n/catalog.ts` and the genuine review date in
`src/config/events.ts`. Status is relative to that explicitly displayed date.
For the radar commands, regional scope, source limitations and manual corrections,
see [the events refresh guide](data/events/README.md). No live crawl runs during
the website build. Events currently remains a dedicated section, not Misc.

Astro renders all ordinary content and navigation to static HTML. React is not loaded on About or the Illustrations/Seminars/Experiments indexes. Theme switching is a tiny native script. Semantic CSS variables provide the system-font blue-orange light/dark design; motion stays between 120–250 ms and collapses under `prefers-reduced-motion`.

See [Architecture and page generation](docs/architecture.md) for a maintainer-oriented explanation of file responsibilities and how data becomes a deployed page.

The repository is MIT licensed. See `AGENTS.md` for rules that future coding agents must follow.
