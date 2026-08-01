# Maintenance rules for agents

- Treat `src/config/site.ts` as the single source for profile, navigation, themes, courses, canonical URL, and author-name matching. Keep unknown data as a conspicuous placeholder or `null`; never invent academic facts or identifiers.
- Keep content out of page/list components. Publications belong in `src/content/publications/`, notes in `src/content/notes/`, experiments in `src/content/experiments/`; schemas live in `src/content.config.ts`.
- Do not duplicate profile links, page-heading markup, navigation data, content records, or shared form controls. Reuse the focused Astro component or shared primitive that already owns the pattern; avoid speculative generic wrappers.
- Preserve the distinction between fictional samples (`[Placeholder]` and `placeholder: true`) and verified user content. Never modify or delete real user content without an explicit request.
- Use Astro components for static structure. Use React only for a genuinely stateful island, prefer `client:visible` for noncritical interactions, and do not add unnecessary site-wide client JavaScript or state.
- Preserve semantic HTML, skip navigation, visible focus, keyboard and touch equivalents, accurate alt text, `aria-current`, reduced-motion behavior, and the light/dark contrast system. Hover must never be the only way to obtain information.
- Keep all site-wide colors in the semantic variables in `src/styles/tokens.css`. Blue is primary and orange is secondary; do not reintroduce component-level theme colors or a configuration-driven inline accent. Keep halftone decoration sparse, `aria-hidden`, noninteractive, and absent under reduced motion.
- Keep internal routes compatible with GitHub Pages `base`; use `withBase()` for root-relative links passed through code.
- Explain and justify every new dependency. Prefer platform APIs and small local components over UI, animation, or graphics libraries.
- After changes run `npm run format:check`, `npm run check`, `npm run build`, and `npm run test`. Fix failures; never skip, weaken, or bypass a failing test to claim completion.
- Preserve the GitHub Pages base-path helpers, exact-SHA CI gate, and deployment permissions. Do not broaden workflow permissions or deploy a `main` commit whose CI run failed.
- Do not force-push, rewrite shared history, or overwrite an existing remote. Do not commit generated `dist/`, caches, environment files, test artifacts, or secrets.
