# Post search — execution plan

Implementation plan for the design in `SEARCH-DESIGN.md` (PR #11).

One diff per PR, stacked in order, each merged before the next starts.
Each diff is one cohesive unit, leaves the site working, and carries
its own tests. Diffs 1–5 add tested modules with no user-visible
change; the feature becomes visible only in diff 6. No new tooling:
tests are plain Node scripts under `tools/`, run with
`node tools/<name>.test.mjs`, using `node:assert/strict`, exiting
non-zero on failure. No test framework, no build step, no CI — same
as the rest of the repo. Vendored code is excluded from the LOC counts.

## Diff 1 — Vendor MiniSearch + engine skeleton

- **Files:** `js/vendor/minisearch.js` (vendored 7.2.0 ESM build,
  design §3), `js/search.js` (`createSearchEngine()` with the config
  from design §5), `tools/search-smoke.test.mjs`.
- **Tests:** import the vendored lib and `search.js` in Node; index 3
  fixture docs; assert a search returns the right id; assert the
  config (prefix on, fuzzy off, `AND`, boosts).
- **LOC:** ~40 code / ~50 test. **Done when:** test green, site
  unchanged.

## Diff 2 — Tokenizer + normalizer

- **Files:** `js/search-text.js` (`tokenize`, `processTerm`,
  design §6), wired into `js/search.js`;
  `tools/search-text.test.mjs`.
- **Tests (table-driven):** `הרקפת`→`רקפת`, `מרץ`→`מרצ`,
  `כלנית`→`לנית`, short words untouched (`של`, `מרץ` is 3 chars —
  no strip), digits/Latin untouched (`y2020`, `m03`), mixed text
  splits correctly, empty string → no terms.
- **LOC:** ~25 code / ~70 test. **Done when:** test green, site
  unchanged.

## Diff 3 — DocumentBuilder + enrichers

- **Files:** `js/search-docs.js` (shared `ctx`, the 4 enrichers,
  builder merge, design §5); `tools/search-docs.test.mjs`.
- **Tests:** fixture post → exact document shape (design §4); post
  without `galleryEntry` → `captions: ''`; post with `galleryEntry`
  → captions joined; `dateTerms` format.
- **LOC:** ~110 code / ~90 test. **Done when:** test green, site
  unchanged.

## Diff 4 — QueryParser (dates)

- **Files:** `js/search-query.js` (date formats, ambiguous `03/25` →
  two variants, design §7); `tools/search-query.test.mjs`.
- **Tests:** every row of the design §7 table → expected terms;
  ambiguous input → two variants; word + date combined; a non-date
  string falls back to plain words.
- **LOC:** ~80 code / ~110 test. **Done when:** test green, site
  unchanged.

## Diff 5 — SearchEngine: index build, boot, incremental captions

- **Files:** `js/search.js` (engine: build from `posts.json` docs,
  `search()`, re-sort newest-first, `updateCaptions(year, index)`
  re-add, design §8–§9); `tools/search-engine.test.mjs`.
- **Tests:** fixture `posts.json` (5–6 posts across years/months):
  plant / text / date search; results newest-first regardless of
  score; caption search empty before the update, found after it;
  re-adding does not duplicate documents.
- **LOC:** ~90 code / ~120 test. **Done when:** test green, site
  unchanged.

## Diff 6 — SearchUI + wiring

- **Files:** `js/search-ui.js` (header input, results reuse post
  cards, count + clear, captions-not-indexed note), `js/app.js`
  (import + mount), `css/styles.css` (input/count/clear styles,
  reusing existing classes); `index.html` unchanged.
- **Tests:** no DOM test infra exists in the repo, so this diff is
  verified manually on the GitHub Pages preview (desktop + mobile,
  RTL): type a plant → cards filter; count text correct; clear
  restores the timeline; date query; caption search after galleries
  load; captions note shows when expected; empty state; tabs and
  back button still work. All `node tools/*.test.mjs` stay green.
- **LOC:** ~120 code / ~30 CSS. **Done when:** checklist passes,
  site works.

## Diff 7 — Docs + release verification

- **Files:** `README.md` (one-line pointer to the design doc);
  `SEARCH-DESIGN.md` (status → Implemented, link the 6 PRs).
- **Verification (not code):** GitHub Pages preview + droplet end to
  end, including a non-2026 year and a caption search; note the
  result in the PR.
- **LOC:** ~15 docs. **Done when:** verified live, doc updated.

## Totals

| | Code | Tests | CSS | Docs |
|---|---|---|---|---|
| Diffs 1–7 | ~465 | ~440 | ~30 | ~15 |

Deliberately not in this plan: a test framework, a build step, CI,
fuzzy search, synonyms, stopword removal — each is a separate
decision if ever wanted, not smuggled into these diffs.
