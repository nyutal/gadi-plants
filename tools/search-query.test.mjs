/* Tests for the search QueryParser (diff 7).
   Run: node tools/search-query.test.mjs */
import assert from 'node:assert/strict';
import { parseQuery } from '../js/search-query.js';

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`ok - ${name}`); }
  catch (e) { failures++; console.error(`FAIL - ${name}: ${e.message}`); }
}

/* Every row of the design §7 table. */
check('exact day, year-first', () => {
  assert.deepEqual(parseQuery('2020-04-05'), ['y2020 m04 d05']);
});
check('month', () => {
  assert.deepEqual(parseQuery('2020-04'), ['y2020 m04']);
  assert.deepEqual(parseQuery('04/2020'), ['y2020 m04']);
});
check('year', () => {
  assert.deepEqual(parseQuery('2020'), ['y2020']);
});
check('exact day, day-first (Israeli order)', () => {
  assert.deepEqual(parseQuery('5.4.2020'), ['y2020 m04 d05']);
  assert.deepEqual(parseQuery('5/4/2020'), ['y2020 m04 d05']);
});
check('Hebrew month, with and without year', () => {
  assert.deepEqual(parseQuery('מרץ 2023'), ['מרץ y2023']);
  assert.deepEqual(parseQuery('מרץ'), ['מרץ']);
});
check('two-digit year means the 2000s', () => {
  assert.deepEqual(parseQuery('20'), ['y2020']);
});

/* Ambiguity and combination. */
check('ambiguous 03/25 produces both readings', () => {
  assert.deepEqual(parseQuery('03/25'), ['y2025 m03', 'm03 d25']);
});
check('date tokens AND with word tokens', () => {
  assert.deepEqual(parseQuery('רקפת 2020'), ['רקפת y2020']);
  assert.deepEqual(parseQuery('רקפת 03/25'), ['רקפת y2025 m03', 'רקפת m03 d25']);
});

/* Non-dates pass through; invalid dates are words. */
check('plain words pass through unchanged', () => {
  assert.deepEqual(parseQuery('רקפת'), ['רקפת']);
  assert.deepEqual(parseQuery('רקפת כלנית'), ['רקפת כלנית']);
  assert.deepEqual(parseQuery('hello world'), ['hello world']);
});
check('empty query produces no variants', () => {
  assert.deepEqual(parseQuery(''), []);
  assert.deepEqual(parseQuery('   '), []);
});
check('out-of-range dates are treated as words', () => {
  assert.deepEqual(parseQuery('2020-13-01'), ['2020-13-01']);
  assert.deepEqual(parseQuery('32.13.2020'), ['32.13.2020']);
  assert.deepEqual(parseQuery('13/2020'), ['13/2020']);
});

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('all query parser tests passed');
