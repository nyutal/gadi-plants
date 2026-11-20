/* Tests for DateFieldBuilder (diff 5).
   Run: node tools/search-date-field.test.mjs */
import assert from 'node:assert/strict';
import { buildDocument, DateFieldBuilder } from '../js/search-docs.js';

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`ok - ${name}`); }
  catch (e) { failures++; console.error(`FAIL - ${name}: ${e.message}`); }
}

check('DateFieldBuilder emits namespaced date terms', () => {
  const fb = new DateFieldBuilder();
  assert.equal(fb.field, 'dateTerms');
  assert.equal(fb.build({ post: { date: '2020-03-29' } }), 'y2020 m03 d29 מרץ');
  assert.equal(fb.build({ post: { date: '2021-12-05' } }), 'y2021 m12 d05 דצמבר');
  assert.equal(fb.build({ post: { date: '2026-01-01' } }), 'y2026 m01 d01 ינואר');
});

check('buildDocument now includes the dateTerms field', () => {
  const doc = buildDocument({
    id: 'p1', date: '2020-03-29', caption: '', plants: [],
  });
  assert.equal(doc.dateTerms, 'y2020 m03 d29 מרץ');
});

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('all date field tests passed');
