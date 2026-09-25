# English / 简体中文

The two names in the header form a single keyboard-accessible language button. In English, 曾相如 sits slightly north-east of Xiangru Zeng at 52% opacity. Clicking either name (or pressing Enter/Space on the button) exchanges their positions and opacity and changes the page language. The main navigation still includes a Home link.

The back name is anchored to the foreground name's right edge, extending 2rem to its right and 0.45rem above it in either language. The foreground uses the shared opaque header color to mask part of the back name. In Chinese mode the stack reserves extra room on the left for the longer English name. Heading typography is controlled by `--font-heading` (the bilingual sans-serif stack) and `--font-heading-weight` (700), heavier than the normal 400-weight summaries.

Language is stored as `academic-language` in local storage. `?lang=zh` and `?lang=en` override that preference and provide shareable links. Internal page links carry the selection, including when storage is unavailable. Code, mathematical markup, URLs, identifiers, downloads, and form values are never translated. Switching does not reset interactive state. With JavaScript disabled, the English static site remains readable.

## Maintaining translations

`src/config/site.ts` owns both personal names. `src/i18n/catalog.ts` owns the Chinese translations of English phrases. Edit the English source content as usual, then update the corresponding catalog entry. Prefer complete sentences; add fragments only where Markdown, links, formulas, or React split a sentence across text nodes. Exact matching normalizes whitespace; compound citations use longest-first, word-boundary phrase matching. Translations are applied once to the English original, so switching back restores the original rather than reverse-translating Chinese. Unknown future text stays in English until a translation is added; this is not an automatic translation service.

The catalog covers navigation, profile information, headings, content summaries and prose, seminar schedules, and interactive labels. Product names (React, Mathematica, Inkscape, Illustrator), acronyms (PDF, MGSA, USTC), URLs, and artwork lettering (MATH/CAL) intentionally retain their original spelling. Linked PDFs and text embedded in images are original-language artifacts. Chinese publication titles are explanatory translations; the English record remains the bibliographic source.

`src/i18n/client.ts` translates static Astro text nodes and accessible attributes without replacing their elements. It excludes React islands, code, KaTeX, and `translate="no"` / `data-no-translate` regions. `src/i18n/react.tsx` uses React's external-store subscription and translates React-owned text during rendering. New interactive components should call `useLocale()` and return `localize(tree, locale)`; nested custom components do the same themselves. Keys, event handlers, state, and option values remain unchanged. Keep conditional translations out of server/client initial renders: the server snapshot is English, then React adopts the current language after hydration.

This development implementation shares the existing routes and canonical URLs. Chinese is a browser preference, not a separate server-rendered `/zh/` edition; search engines and social previews receive the English HTML. A future separately indexed Chinese edition would require localized routes and metadata at build time.

## Names and translations awaiting confirmation

The Chinese edition explicitly marks these entries rather than inventing names:

- **Moorse Mosaic** and “moorse strip phenomenon”: intended spelling/meaning is unclear. The title displays `[中文标题待确认：Moorse Mosaic]`. Please confirm whether “Moorse” is intentional before choosing the Chinese title.
- **Daigo Ito**, **Michael R. Zeng**, **Cameron Chang**, **Pranav Enugandla**: Chinese personal names are not supplied. Each displays `[中文名待确认：original name]`.
- **Peters**, **Steenbrink**, **Brian Conrad**, **Henry Segerman**, **mistercorzi**: references retain the original name with an adjacent `中文名待确认` notice.

Existing fictional author/course/profile placeholders remain explicitly fictional. The seminar time is translated as written; no AM/PM or timezone is inferred.

## Typography and verification

Chinese font fallbacks include PingFang SC / Microsoft YaHei / Noto Sans CJK SC and Songti SC / Noto Serif CJK SC, with Droid Sans Fallback before the final system fallback to avoid the uneven legacy serif rendering seen on this server. Actual glyph appearance depends on the visitor's installed fonts; no webfont is downloaded. Chinese display headings use a 1.35 line height because the original compact Latin line height crowded Chinese glyphs. Long pending-name labels wrap naturally. Seminar tables and code retain their own horizontal scrolling on narrow screens; illustration descriptions have `min-width: 0` so a wide code block cannot expand the page. Names animate only when reduced motion is not requested.

Run the standard checks from README. `tests/language.spec.ts` additionally checks the name positions/opacity, keyboard switching, persistence, storage-blocked navigation, React hydration/filter state, unchanged KaTeX/code, reduced motion, and Chinese layouts at 360/768/1280px. Review the name animation visually after changing fonts or offsets.

This feature is developed on `site-development` only. Do not merge or cherry-pick it to `main` until explicitly requested.
