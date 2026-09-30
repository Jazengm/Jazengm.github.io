# English / 简体中文

The header displays `Xiangru Zeng | 曾相如` on one line without overlap. Each name is an independent keyboard-accessible language button: clicking it (or pressing Enter/Space while focused) selects that name's language. Clicking the current language does not switch away from it. The main navigation still includes a Home link.

Both names have transparent backgrounds and use their natural text widths in a flex row. There is no hidden sizing text, fixed width, or horizontal button padding. A single visible text separator (`|`) has a 0.3rem gap on either side (about 5px at the default root font size). Its background, borders, and pseudo-elements are disabled so it cannot produce a second rule. English uses a slightly smaller 1.05rem size. The current name uses weight 700 and opacity 1 (zero transparency); the other uses opacity 0.65. Inactive English uses serif weight 400; the Chinese name uses the sans-serif stack at weight 500 (700 when selected) for slightly stronger strokes. Hovering or keyboard-focusing the other name makes it fully opaque and adds orange text and an underline. Keyboard focus uses a 2px underline instead of a rectangular outline, keeping the focus indicator visible without extra vertical edges. Heading typography is controlled by `--font-heading` and `--font-heading-weight`: English uses the original serif stack at 500, while Chinese keeps the sans-serif stack at 700. Summaries remain at 400.

Language is stored as `academic-language` in local storage. `?lang=zh` and `?lang=en` override that preference and provide shareable links. Internal page links carry the selection, including when storage is unavailable. Code, mathematical markup, URLs, identifiers, downloads, and form values are never translated. Switching does not reset interactive state. With JavaScript disabled, the English static site remains readable.

## Maintaining translations

`src/config/site.ts` owns both personal names. `src/i18n/catalog.ts` owns the Chinese translations of English phrases. Edit the English source content as usual, then update the corresponding catalog entry. Prefer complete sentences; add fragments only where Markdown, links, formulas, or React split a sentence across text nodes. Exact matching normalizes whitespace; compound citations use longest-first, word-boundary phrase matching. Translations are applied once to the English original, so switching back restores the original rather than reverse-translating Chinese. Unknown future text stays in English until a translation is added; this is not an automatic translation service.

The catalog covers navigation, profile information, headings, content summaries and prose, seminar schedules, and interactive labels. Product names (React, Mathematica, Inkscape, Illustrator), acronyms (PDF, MGSA, USTC), URLs, and artwork lettering (MATH/CAL) intentionally retain their original spelling. Linked PDFs and text embedded in images are original-language artifacts. Chinese publication titles are explanatory translations; the English record remains the bibliographic source.

`src/i18n/client.ts` translates static Astro text nodes and accessible attributes without replacing their elements. It excludes React islands, code, KaTeX, and `translate="no"` / `data-no-translate` regions. `src/i18n/react.tsx` uses React's external-store subscription and translates React-owned text during rendering. New interactive components should call `useLocale()` and return `localize(tree, locale)`; nested custom components do the same themselves. Keys, event handlers, state, and option values remain unchanged. Keep conditional translations out of server/client initial renders: the server snapshot is English, then React adopts the current language after hydration.

This published implementation shares the existing routes and canonical URLs. Chinese is a browser preference, not a separate server-rendered `/zh/` edition; search engines and social previews receive the English HTML. A future separately indexed Chinese edition would require localized routes and metadata at build time.

## Confirmed artwork name

The artwork is titled **Moiré Mosaic**, with the author-confirmed Chinese title **摩尔纹锦砖**. The existing `/illustrations/moorse-mosaic/` route and image filename are retained for link compatibility; the old spelling is not a display title. The description refers to the moiré phenomenon (摩尔纹现象).

## Names and translations awaiting confirmation

The Chinese edition explicitly marks these entries rather than inventing names:

- **Daigo Ito**, **Michael R. Zeng**, **Cameron Chang**, **Pranav Enugandla**: Chinese personal names are not supplied. Each displays `[中文名待确认：original name]`.
- **Peters**, **Steenbrink**, **Brian Conrad**, **Henry Segerman**, **mistercorzi**: references retain the original name with an adjacent `中文名待确认` notice.

The published site excludes fictional records and unfinished course/profile pages. The seminar time is translated as written; no AM/PM or timezone is inferred.

## Typography and verification

Chinese font fallbacks include PingFang SC / Microsoft YaHei / Noto Sans CJK SC and Songti SC / Noto Serif CJK SC, with Droid Sans Fallback before the final system fallback to avoid the uneven legacy serif rendering seen on this server. Actual glyph appearance depends on the visitor's installed fonts; no webfont is downloaded. Chinese display headings use a 1.35 line height because the original compact Latin line height crowded Chinese glyphs. Long pending-name labels wrap naturally. Seminar tables and code retain their own horizontal scrolling on narrow screens; illustration descriptions have `min-width: 0` so a wide code block cannot expand the page. Names animate only when reduced motion is not requested.

Run the standard checks from README. `tests/language.spec.ts` additionally checks the non-overlapping name positions, selected weight/opacity, hover and keyboard feedback, persistence, storage-blocked navigation, React hydration/preview state, unchanged KaTeX/code, reduced motion, and Chinese layouts at 360/768/1280px. Review the name row visually after changing fonts or spacing.

The bilingual switch and Events are published on `main`. Develop and validate updates on `site-development` before syncing to the production branch.
