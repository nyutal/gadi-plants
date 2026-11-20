/* הצמחים של גדי — search engine setup (MiniSearch).
   Design: SEARCH-DESIGN.md §3, §5. */

import MiniSearch from './vendor/minisearch.js';
import { tokenize, processTerm } from './search-text.js';

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
