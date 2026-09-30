# Regional events: collection and review

Scope: 2026–2027; algebraic geometry, matroids, algebraic combinatorics;
mainland China, Hong Kong, Macao, Taiwan, Japan, Korea, Southeast Asia.
This is a selected calendar, not comprehensive coverage. No newly announced
regional matroid-only meeting was verified in this pass; retain the two useful
2026 matroid events in the archive rather than inventing an upcoming entry.

## Reproduce discovery

From the sibling `academic-event-radar` checkout, with its existing environment:

```bash
cd ../academic-event-radar
.venv/bin/event-radar run --config ../Jazengm.github.io/data/events/search.yaml
.venv/bin/event-radar run --config results/east-asia-geometry-combinatorics-2026-2027/search.yaml
```

Radar resolves runtime paths against its working directory, **not** the YAML's
directory. The first configuration retains the full 2026 archive and uses the
mathematics vault subset plus explicit seeds. Its ignored reports are written to
`reports/homepage-regional-events/`; the second, more recent search is committed
in radar's `results/east-asia-geometry-combinatorics-2026-2027/`.
No API key is required. Search-engine discovery supplemented official seeds;
Google results are not scraped by the crawler. Robots, rate and page limits remain
enabled. Builds and CI never crawl the network.

Reviewed on 2026-09-29 (America/Los_Angeles; crawl timestamps are 2026-09-30 UTC).
The initial full-year run reported 26 pages, 17 candidates, 9 automatic confirmed
records, 8 leads and 16 failures. These are extraction counters, not a count of
verified meetings: there were duplicate Fudan announcements, missing dates, and
an unrelated astronomy-directory false positive. None was blindly imported.

## Publication data and corrections

`src/content/events/events.json` is the manually reviewed publication snapshot;
`src/content.config.ts` validates it. The six upcoming records are also saved as
`reviewed-events.json` in radar's new search folder. Archive records were selected
from radar's initial full-year crawl and earlier `results/matroids-2026/` output.

- ECNU: complete the official June 4–8 interval; the extractor only returned June 4.
- Kyushu: complete August 3–4 from the official research-period and program text.
- Fudan: merge duplicate school announcements; keep the updated announcement.
- VIASM: read November 16–19 from the Vietnamese date range; do not use the
  registration/grant deadlines as event dates.
- OIST: complete September 13–17, 2027 from the Japanese date range.
- MCM: crawler access is blocked by robots; the April 12–16, 2027 announcement
  was independently checked through publicly indexed official content. This is
  a **manual discovery**, not a successful radar fetch. No policy bypass was used.
- IPMU: retained the earlier radar result and rechecked the official announcement.

All links lead to public institutional announcements. English titles are cleaned
display titles; Chinese translations are editorial, not claimed as official.
Personal names stay in their original spelling. Raw pages, evidence excerpts,
databases and HTTP caches are not published in this website repository.

To refresh, rerun radar, inspect official announcements and deduplicate, then edit
the JSON and `src/config/events.ts`'s `reviewedOn` together. The latter is a real
review date, not a generated build timestamp. The site's grouping is explicitly
relative to that date, so static deployments do not imply live calendar updates.
Change date windows/seed sources in YAML for a future search. Broaden geography
deliberately; a keyword or an author's affiliation is not proof of an event venue.
