/* Tests for SearchEngine: index build, boot, incremental captions (diff 8).
   Run: node tools/search-engine.test.mjs */
import assert from 'node:assert/strict';
import { SearchEngine } from '../js/search.js';

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`ok - ${name}`); }
  catch (e) { failures++; console.error(`FAIL - ${name}: ${e.message}`); }
}

const posts = [
  { id: 'p1', date: '2020-03-29', month: 3, caption: 'הרקפת פרחה', plants: ['רקפת'], url: '', image: null },
  { id: 'p2', date: '2020-03-15', month: 3, caption: 'שדה של נוריות', plants: ['נורית'], url: '', image: null },
  { id: 'p3', date: '2021-04-05', month: 4, caption: 'כלנית אדומה', plants: ['כלנית'], url: '', image: null },
  { id: 'p4', date: '2021-04-20', month: 4, caption: 'רקפת ונורית ביחד', plants: ['רקפת', 'נורית'], url: '', image: null },
  { id: 'p5', date: '2019-11-27', month: 11, caption: 'סתיו בגינה', plants: [], url: '', image: null },
  { id: 'p6', date: '2020-03-01', month: 3, caption: 'פריחה מוקדמת', plants: ['סביון'], url: '', image: null },
];

function engine() {
  const e = new SearchEngine();
  e.buildFromPosts(posts);
  return e;
}
const ids = (results) => results.map((r) => r.id);

check('plant search returns newest first', () => {
  assert.deepEqual(ids(engine().search('רקפת')), ['p4', 'p1']);
});

check('text search finds a caption word', () => {
  assert.deepEqual(ids(engine().search('פרחה')), ['p1']);
});

check('month search finds that month only', () => {
  assert.deepEqual(ids(engine().search('2020-03')), ['p1', 'p2', 'p6']);
});

check('year search finds that year only', () => {
  assert.deepEqual(ids(engine().search('2020')), ['p1', 'p2', 'p6']);
});

check('Hebrew month search finds that month', () => {
  assert.deepEqual(ids(engine().search('מרץ')), ['p1', 'p2', 'p6']);
});

check('empty query finds nothing', () => {
  assert.deepEqual(engine().search(''), []);
  assert.deepEqual(engine().search('   '), []);
});

check('caption search is empty before the index loads, found after it', () => {
  const e = engine();
  // 'כלנית' matches p3 by headline plants, but not p1 (captions only).
  assert.deepEqual(ids(e.search('כלנית')), ['p3']);
  e.updateCaptions(2020, { p1: { photo_count: 1, captions: { '01.jpg': 'כלנית בשדה' } } });
  assert.deepEqual(ids(e.search('כלנית')), ['p3', 'p1']);
  assert.ok(e.indexedYears.has(2020));
});

check('re-adding captions does not duplicate documents', () => {
  const e = engine();
  e.updateCaptions(2020, { p1: { photo_count: 1, captions: { '01.jpg': 'כלנית בשדה' } } });
  e.updateCaptions(2020, { p1: { photo_count: 1, captions: { '01.jpg': 'כלנית בשדה' } } });
  assert.deepEqual(ids(e.search('רקפת')), ['p4', 'p1']);
  assert.deepEqual(ids(e.search('כלנית')), ['p3', 'p1']);
});

check('syncGalleries indexes newly arrived years and skips the rest', () => {
  const e = engine();
  e.syncGalleries({ 2020: { p1: { photo_count: 1, captions: { '01.jpg': 'כלנית בשדה' } } }, 2021: null });
  assert.deepEqual(ids(e.search('כלנית')), ['p3', 'p1']);
  assert.ok(e.indexedYears.has(2020));
  assert.ok(!e.indexedYears.has(2021));
});

check('ambiguous date query unions both readings without duplicates', () => {
  const e = new SearchEngine();
  e.buildFromPosts([
    { id: 'p7', date: '2025-03-25', month: 3, caption: '', plants: [], url: '', image: null },
    { id: 'p8', date: '2025-03-10', month: 3, caption: '', plants: [], url: '', image: null },
    { id: 'p9', date: '2024-03-25', month: 3, caption: '', plants: [], url: '', image: null },
  ]);
  // Variant A (March 2025) finds p7, p8; variant B (25 March) finds p7, p9.
  assert.deepEqual(ids(e.search('03/25')), ['p7', 'p8', 'p9']);
});

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('all search engine tests passed');
