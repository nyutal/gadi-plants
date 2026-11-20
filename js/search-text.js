/* הצמחים של גדי — search tokenizer and normalizer.
   Design: SEARCH-DESIGN.md §6. */

/* tokenize: split words, nothing else. All Hebrew handling lives in
   processTerm, applied identically to index and query. */
export const tokenize = (text) =>
  String(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

const FINAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const PREFIXES = new Set(['ה', 'ו', 'ב', 'ל', 'מ', 'ש', 'כ']);

export const processTerm = (term) => {
  let t = [...term.toLowerCase()].map((ch) => FINAL[ch] || ch).join('');
  if (t.length > 3 && PREFIXES.has(t[0])) t = t.slice(1);
  return t;
};
