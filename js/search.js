/* הצמחים של גדי — search engine setup (MiniSearch) + SearchEngine wrapper.
   Design: SEARCH-DESIGN.md §3, §5, §8, §9. */

import MiniSearch from './vendor/minisearch.js';
import { tokenize, processTerm } from './search-text.js';
import { parseQuery } from './search-query.js';
import { buildDocuments } from './search-docs.js';

/* Prefix completion applies to the last query word only (design §13). */
const prefixLastWord = (term, i, terms) => i === terms.length - 1;

export function createSearchEngine() {
  return new MiniSearch({
    fields: ['plants', 'text', 'captions', 'dateTerms'],
    storeFields: ['date'],
    tokenize,
    processTerm,
    searchOptions: {
      prefix: prefixLastWord,
      fuzzy: false,
      combineWith: 'AND',
      boost: { plants: 3, text: 2, captions: 1, dateTerms: 2 },
    },
  });
}

export class SearchEngine {
  constructor() {
    this.ms = createSearchEngine();
    this.posts = [];
    /* Years whose gallery index has been folded into the search index. */
    this.indexedYears = new Set();
  }

  buildFromPosts(posts) {
    this.posts = posts;
    this.ms.addAll(buildDocuments(posts));
  }

  /* Runs each query variant and unions the results (best score per post),
     newest first — recency, not score, is the primary order here. */
  search(query) {
    const variants = parseQuery(query);
    const byId = new Map();
    for (const variant of variants) {
      for (const result of this.ms.search(variant)) {
        const prev = byId.get(result.id);
        if (!prev || prev.score < result.score) byId.set(result.id, result);
      }
    }
    return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
  }

  /* Folds one year's gallery index into the search index (design §9).
     414 documents — rebuilding the year's docs is milliseconds. */
  updateCaptions(year, galleryIndex) {
    const docs = buildDocuments(
      this.posts.filter((p) => Number(p.date.slice(0, 4)) === year),
      { [year]: galleryIndex },
    );
    for (const doc of docs) this.ms.replace(doc);
    this.indexedYears.add(year);
  }

  /* Indexes every gallery index that has arrived and isn't indexed yet.
     Called at boot and again before each search, so an index that arrives
     late still lands in the search index. */
  syncGalleries(galleries) {
    for (const [year, index] of Object.entries(galleries || {})) {
      const y = Number(year);
      if (index && !this.indexedYears.has(y)) this.updateCaptions(y, index);
    }
  }
}
