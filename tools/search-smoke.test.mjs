/* Smoke test for the search engine skeleton (diff 1).
   Run: node tools/search-smoke.test.mjs */
import assert from 'node:assert/strict';
import { createSearchEngine } from '../js/search.js';

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`ok - ${name}`); }
  catch (e) { failures++; console.error(`FAIL - ${name}: ${e.message}`); }
}

const docs = [
  { id: 'a', plants: 'rose', text: 'green leaves', captions: '', dateTerms: 'y2024 m05 d01', date: '2024-05-01' },
  { id: 'b', plants: 'tulip', text: 'red rose petals', captions: '', dateTerms: 'y2024 m05 d02', date: '2024-05-02' },
  { id: 'c', plants: 'lily', text: 'white lily', captions: 'rose garden photo', dateTerms: 'y2024 m05 d03', date: '2024-05-03' },
];

function engine() {
  const ms = createSearchEngine();
  ms.addAll(docs);
  return ms;
}

check('engine indexes and finds a term', () => {
  const ids = engine().search('rose').map((r) => r.id);
  assert.deepEqual(ids, ['a', 'b', 'c']);
});

check('field boosts order results: plants > text > captions', () => {
  const results = engine().search('rose');
  assert.ok(results[0].score > results[1].score && results[1].score > results[2].score);
});

check('prefix applies to the last query word', () => {
  const ids = engine().search('ros').map((r) => r.id);
  assert.deepEqual(ids, ['a', 'b', 'c']);
});

check('prefix does not apply to a non-last query word', () => {
  assert.deepEqual(engine().search('ros tulip').map((r) => r.id), []);
});

check('fuzzy is off: a typo finds nothing', () => {
  assert.deepEqual(engine().search('roze').map((r) => r.id), []);
});

check('AND: only a document with both terms survives', () => {
  assert.deepEqual(engine().search('rose lily').map((r) => r.id), ['c']);
});

check('stored date is returned with results', () => {
  const [r] = engine().search('tulip');
  assert.equal(r.date, '2024-05-02');
});

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('all smoke tests passed');
