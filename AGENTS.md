# Maintenance rules for agents

- Treat `src/config/site.ts` as the single source for profile, navigation, themes, courses, canonical URL, and author-name matching. Keep unknown data as a conspicuous placeholder or `null`; never invent academic facts or identifiers.
- Keep content out of page/list components. Publications belong in `src/content/publications/`, notes in `src/content/notes/`, experiments in `src/content/experiments/`; schemas live in `src/content.config.ts`.
- Preserve the distinction between fictional samples (`[Placeholder]` and `placeholder: true`) and verified user content. Never modify or delete real user content without an explicit request.
- Use Astro components for static structure. Use React only for a genuinely stateful island, prefer `client:visible` for noncritical interactions, and do not add unnecessary site-wide client JavaScript or state.
- Preserve semantic HTML, skip navigation, visible focus, keyboard and touch equivalents, accurate alt text, `aria-current`, reduced-motion behavior, and the light/dark contrast system. Hover must never be the only way to obtain information.
- Keep internal routes compatible with GitHub Pages `base`; use `withBase()` for root-relative links passed through code.
- Explain and justify every new dependency. Prefer platform APIs and small local components over UI, animation, or graphics libraries.
- After changes run `npm run format:check`, `npm run check`, `npm run build`, and `npm run test`. Fix failures; never skip, weaken, or bypass a failing test to claim completion.
- Do not force-push, rewrite shared history, or overwrite an existing remote. Do not commit generated `dist/`, caches, environment files, test artifacts, or secrets.
