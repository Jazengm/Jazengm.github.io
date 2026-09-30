# Maintenance rules for agents

- Treat requests to "update my webpage" (or similar wording) as the full publication workflow: make and commit the requested changes on the local `site-development` branch, sync that commit to `main`, push both branches, and finish with `site-development` checked out locally. Keep routine update review concise and scoped to the changed files unless validation fails or branches conflict. Treat "refresh local webpage" as a local dev-server restart only; do not perform Git actions for refresh-only requests.
- Treat `src/config/site.ts` as the single source for profile, navigation, canonical URL, and author-name matching. Keep unknown optional data as `null`; never invent academic facts or identifiers.
- Keep content out of page/list components. Publications belong in `src/content/publications/`, illustrations in `src/content/illustrations/`, seminars in `src/content/seminars/`, and experiments in `src/content/experiments/`; schemas live in `src/content.config.ts`.
- Do not duplicate profile links, page-heading markup, navigation data, content records, or shared form controls. Reuse the focused Astro component or shared primitive that already owns the pattern; avoid speculative generic wrappers.
- Publish only verified user content. Keep unfinished records out of the content collections and never modify or delete real user content without an explicit request.
- Use Astro components for static structure. Use React only for a genuinely stateful island, prefer `client:visible` for noncritical interactions, and do not add unnecessary site-wide client JavaScript or state.
- Preserve semantic HTML, skip navigation, visible focus, keyboard and touch equivalents, accurate alt text, `aria-current`, reduced-motion behavior, and the light/dark contrast system. Hover must never be the only way to obtain information.
- Keep all site-wide colors in the semantic variables in `src/styles/tokens.css`. Blue is primary and orange is secondary; do not reintroduce component-level theme colors or a configuration-driven inline accent. Keep halftone decoration sparse, `aria-hidden`, noninteractive, and absent under reduced motion.
- Keep the direct KaTeX stylesheet version compatible with the renderer used by `rehype-katex`; verify computed superscript sizing after dependency changes. Preserve the Shiki `mathematica` alias unless all corresponding code fences are migrated.
- Keep internal routes compatible with GitHub Pages `base`; use `withBase()` for root-relative links passed through code.
- Explain and justify every new dependency. Prefer platform APIs and small local components over UI, animation, or graphics libraries.
- After changes run `npm run format:check`, `npm run check`, `npm run build`, and `npm run test`. Fix failures; never skip, weaken, or bypass a failing test to claim completion.
- Preserve the GitHub Pages base-path helpers, exact-SHA CI gate, and deployment permissions. Do not broaden workflow permissions or deploy a `main` commit whose CI run failed.
- Do not force-push, rewrite shared history, or overwrite an existing remote. Do not commit generated `dist/`, caches, environment files, test artifacts, or secrets.
