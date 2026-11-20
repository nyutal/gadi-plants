# Post search — design

**Status:** Implemented (2026-11-20). Implementation in PRs #13–#21, following the
execution plan in PR #12: #13 vendor MiniSearch + engine skeleton, #14 tokenizer,
#15 DocumentBuilder + PlantFieldBuilder, #16 PostTextFieldBuilder, #17 DateFieldBuilder,
#18 CaptionFieldBuilder, #19 QueryParser, #20 SearchEngine, #21 SearchUI + wiring.

## 1. Problem

The site holds 414 posts (2019–2026, plus one 2017 post) and 13,344
gallery photos. Today the only way to find a post is scrolling the
timeline or the plant index (72 plants, A–ב). That misses most of what
is searchable:

- Plants named in a post's **gallery captions** — not just the 2 headline
  plants per post — are unfindable.
- Posts are findable by date only by scrolling to the right month.
- Free-text search (a word from a caption) does not exist at all.

## 2. Goals and non-goals

**Goals**

- Client-side, index-based, **exact** (not fuzzy) search over headline
  plants, post text, gallery captions, and dates.
- Hebrew-aware: final letters, common prefixes, prefix completion.
- No build step, no server, no new runtime dependency beyond one small
  vendored library. Works offline once loaded.
- Results newest-first. Reuses the existing post cards for results.

**Non-goals**

- Fuzzy matching and typo tolerance.
- Synonyms, stemming beyond one prefix letter, or niqqud handling
  (posts have no niqqud).
- Server-side search or analytics.
- Stopword removal in v1 (see §13).
- Any change to the `posts.json` format, `core.js`, `gallery.js`, or the
  gallery blob.

## 3. Library decision: MiniSearch 7

| Library | Size (min+gzip) | Prefix search | Maintenance | Verdict |
|---|---|---|---|---|
| **MiniSearch 7.2.0** | **5.9 kB** | First-class | Active | **Chosen** |
| FlexSearch | 17.2 kB (Document build; 4.5 kB light) | Yes | Active | Fastest, but heavier and more complex API; no benefit at 414 docs |
| Lunr 2.3.9 | 8.9 kB | Wildcards only | Unmaintained since Aug 2020 | Out |
| Fuse.js | 9.6 kB | No | Active | Fuzzy-first, no real inverted index — wrong shape |
| Pagefind | ~6 kB base + lazy chunks | Yes | Active | Requires a build step and indexes finished static HTML; the site renders client-side from `posts.json`, so structurally wrong here |

Why MiniSearch: exact search plus first-class prefix search, custom
`tokenize`/`processTerm`, per-field boosts, incremental indexing, and no
build step. The whole corpus is 414 documents — this is far below the
scale where the differences between the libraries would matter.

**Delivery:** vendor the MiniSearch 7.2.0 ESM build
(`dist/es/index.js` — self-contained, single file, no other dependency)
as `js/vendor/minisearch.js` and import it as an ES module, following the
site's existing module pattern. No CDN dependency, no build step at
runtime. Minified it is ~5.9 kB; vendored as-is it is ~18 kB gzipped —
minify once at implementation time if the smaller size is wanted.

## 4. What gets indexed (document shape)

One document per post:

```js
{
  id: '1431947860318705',          // fb_post_id
  plants: 'נורית סביון דרדר גדילן', // headline plants: the post's plants array, joined with spaces
  text: '…',                        // post caption
  captions: '…',                    // all gallery captions for the post,
                                    // space-separated (see §9)
  dateTerms: 'y2020 m03 d29 מרץ'    // namespaced date tokens (see §7)
}
```

`storeFields: ['date']` — the date is stored on the document so results
can be re-sorted newest-first (§8).

## 5. Architecture

```
posts.json + per-year gallery indexes
        │
        ▼
DocumentBuilder ── one shared high-level context per post:
        │          ctx = { post, galleryEntry }
        │          calls every field builder with the SAME ctx;
        │          each field builder pulls what it needs, returns its field;
        │          builder merges into the document (§4)
        ▼
   MiniSearch ── fields + boosts, custom tokenize/processTerm,
        │       prefix on, fuzzy off, combineWith AND
        ▼
 SearchEngine ── thin wrapper: run MiniSearch, re-sort newest-first
        │
        ▼
   SearchUI ──── header input, results reuse post cards,
                 result count + clear button
```

**Field builders** (each takes `ctx`, returns one field):

| Field builder | Pulls from | Returns |
|---|---|---|
| `PlantFieldBuilder` | `ctx.post.plants` (array, joined) | `plants` |
| `PostTextFieldBuilder` | `ctx.post.caption` | `text` |
| `DateFieldBuilder` | `ctx.post.date` | `dateTerms` |
| `CaptionFieldBuilder` | `ctx.galleryEntry?.captions` | `captions` |

The tokenizer/normalizer is a **shared module, not part of `ctx`**
(month names live inside `DateFieldBuilder`, not in the context).

Two corrections against the real `posts.json` shape, verified during
implementation: `PlantFieldBuilder` joins the `plants` **array** with
spaces, and `PostTextFieldBuilder` reads `post.caption` — the post has
no `text` field.

**MiniSearch config:**

```js
new MiniSearch({
  fields: ['plants', 'text', 'captions', 'dateTerms'],
  storeFields: ['date'],
  tokenize, processTerm,              // §6
  searchOptions: {
    prefix: (term, i, terms) => i === terms.length - 1,  // last word only (§13)
    fuzzy: false,
    combineWith: 'AND',
    boost: { plants: 3, text: 2, captions: 1, dateTerms: 2 },
  },
});
```

**Extension rule:** a new source means a new `FieldBuilder` class, register
it in the builder, and add its field to the MiniSearch config. Nothing
else changes. One field builder builds exactly one field of the document — that 1:1 mapping is the contract the builder relies on.

## 6. Tokenizer and normalizer

```js
// tokenize: split words, nothing else.
const tokenize = (text) =>
  String(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// processTerm: lowercase, final letters, strip ONE leading prefix letter.
// One term per word, applied identically to index and query.
const FINAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const PREFIXES = new Set(['ה', 'ו', 'ב', 'ל', 'מ', 'ש', 'כ']);

const processTerm = (term) => {
  let t = [...term.toLowerCase()].map(ch => FINAL[ch] || ch).join('');
  if (t.length > 3 && PREFIXES.has(t[0])) t = t.slice(1);
  return t;
};
```

So `הרקפת` and `רקפת` normalize to the same term, `מרץ` to `מרצ`,
and a query for either form finds the post. Prefix completion is
MiniSearch's own prefix search on the last query word — not the
tokenizer's job.

**Why the stripped form must NOT be emitted as an extra token** (lesson
from the demo — verified live, do not reintroduce): an earlier version
of the tokenizer emitted both the word and its prefix-stripped variant.
That broke two things. First, a query for `כלנית` secretly also
searched `לנית`, doubling that term's weight and inflating the quality
multiplier (§8). Second, a query for a stripped-only form such as
`לנית` returned **nothing**: its ghost term `נית` matched no document,
and with `combineWith: 'AND'` that emptied the whole result set. One
term per word, normalized in `processTerm`, is the correct shape.

## 7. Dates

`DateFieldBuilder` turns `post.date` into one space-separated string of
namespaced tokens:

```js
// '2020-03-29' → 'y2020 m03 d29 מרץ'
const dateTerms = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return `y${y} m${String(m).padStart(2, '0')} d${String(d).padStart(2, '0')} ${HE_MONTHS[m]}`;
};
```

The `y`/`m`/`d` prefixes prevent collisions: `m03` (March) can never
collide with `d03` (the 3rd) or with a word. The Hebrew month name is
indexed alongside, so `מרץ 2023` works too.

**Query formats** (QueryParser converts date-like tokens into the same
namespaced terms; separators `-`, `/`, `.` are all accepted):

| Query | Terms | Matches |
|---|---|---|
| `2020-04-05` | `y2020 m04 d05` | That exact day |
| `2020-04`, `04/2020` | `y2020 m04` | That month |
| `2020` | `y2020` | That year |
| `5.4.2020`, `5/4/2020` | `y2020 m04 d05` | Day-first, Israeli order |
| `מרץ 2023`, `מרץ` | `מרץ y2023` / `מרץ` | Hebrew month, with/without year |
| Two-digit year (`20`) | `y2020` | 2000s |

**Ambiguity:** `03/25` matches BOTH readings (March 2025 and 25 March)
— the parser produces two query variants and unions the results.
**Combination:** date tokens AND with word tokens (`רקפת 2020` = posts
about רקפת from 2020).

## 8. Scoring

Verified against the MiniSearch 7 source and live runs — not assumed.

- Per term, per field, the contribution is
  `termWeight × termBoost × fieldBoost × docBoost × BM25`.
  BM25 defaults: `k: 1.2, b: 0.7, d: 0.5`; IDF from the term's rarity
  across documents, with field-length normalization.
- Weights: exact match 1, prefix match 0.375 (decaying with distance),
  fuzzy 0.45 (fuzzy is off here).
- A document's score is the **sum** of its per-term contributions,
  then multiplied by **quality** — the number of distinct query terms
  the document matched. Verified: single-term scores 2.73 + 2.73 =
  5.46; the two-term query scored 10.93 = 5.46 × 2.
- With `combineWith: 'AND'`, a document missing any query term is
  dropped entirely.
- The same term in two fields: the document appears **once** in the
  results; `match` lists the fields it hit; the score adds up.
  Verified: a post matching in `plants` + `text` scored 3.73 vs 2.26
  for `plants` alone. A headline-plant match outranking a passing
  mention is the intended behavior, and the boosts (§5) encode it.
- Boosts are **search-time, not index-time** — they can be retuned
  without re-indexing. `boostDocument` (per-document) and `boostTerm`
  (per-term) also exist if needed later.

**Display order:** MiniSearch ranks by score; `SearchEngine` re-sorts
the results newest-first using the stored `date`, since recency — not
score — is the primary order for this timeline.

## 9. Boot and incremental caption indexing

- **Boot:** base documents are built from `posts.json` and added with
  `addAll`. Search works immediately, over plants, text, and dates.
- **Captions:** captions live in the per-year gallery indexes on the
  droplet, which load separately (`preloadGalleries` / `loadGalleries`,
  existing code). When a year's index arrives, the builder runs the
  `CaptionFieldBuilder` pass for those posts and re-adds the documents —
  414 documents, a full rebuild is milliseconds.
- Until a year's gallery index loads, that year's posts are searchable
  without captions. The UI notes when captions aren't indexed yet, so
  an empty caption search is explained rather than silent.

## 10. Hebrew specifics

- Final letters normalized on both sides (§6); one prefix letter
  stripped when the word is longer than 3 characters; prefix completion
  on the last query word.
- No niqqud handling (posts have none).
- No stopword removal in v1 (§13).

## 11. Verification done (demo)

A Node demo with MiniSearch 7.2.0 and the real `posts.json` proved the
approach end to end before this doc was written:

- 414 posts loaded, 265 with headline plants.
- `search('נורית')` → post `1431947860318705`, score 9.14,
  `match: {"נורית": ["plants", "text"]}` — the term points at the post,
  and the match shows in which fields.
- `search('נורית מרץ')` → same post; terms shown as
  `['נורית', 'מרצ']` — `מרץ` normalized to `מרצ` by `processTerm`,
  working as designed.
- Double-add (§8), multi-term scoring (§8), and the ghost-term failure
  (§6) were all reproduced and measured live, not reasoned from docs.

## 12. File layout (proposed)

```
js/
  search.js        MiniSearch setup, tokenizer/normalizer,
                   QueryParser, SearchEngine
  search-docs.js   DocumentBuilder + field builders
  search-ui.js     header input, results rendering (reuse post cards),
                   result count + clear button
  vendor/
    minisearch.js  vendored MiniSearch 7.2.0 ESM build (§3)
```

Wiring: `app.js` imports `search-ui.js`. No changes to the `posts.json`
format, `core.js`, `gallery.js`, or the gallery blob. Follows the
site's existing ES-module pattern (one focused module per concern, as
with `plant.js`, `month.js`, `year.js`).

## 13. Open questions

- **Stopwords:** v1 keeps them — a query word like `של` must match
  under AND. If that bites in practice, drop them in `processTerm`
  (return `''` — MiniSearch drops the term). One-line change.
- **Prefix completion:** on the last query word only, or on all words?
  Proposal: last word only.
- **Placement:** search input in the header on all views (year and
  month), or year view only?

## 14. Rollout

1. This PR: design doc only.
2. Implementation: PRs #13–#21, per the execution plan in PR #12.
3. Verify on the GitHub Pages preview and on the droplet, end to end —
   including a non-2026 year and a caption search — before merging.
   A 200 on a file does not prove the site can use it.
