/* Tests for PostTextFieldBuilder (diff 4).
   Run: node tools/search-text-field.test.mjs */
import assert from 'node:assert/strict';
import { buildDocument, PostTextFieldBuilder } from '../js/search-docs.js';

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`ok - ${name}`); }
  catch (e) { failures++; console.error(`FAIL - ${name}: ${e.message}`); }
}

check('PostTextFieldBuilder reads the post caption', () => {
  const fb = new PostTextFieldBuilder();
  assert.equal(fb.field, 'text');
  assert.equal(fb.build({ post: { caption: 'הרקפת פרחה השבוע' } }), 'הרקפת פרחה השבוע');
  assert.equal(fb.build({ post: {} }), '');
  assert.equal(fb.build({ post: { caption: '' } }), '');
});

check('buildDocument now includes the text field', () => {
  const doc = buildDocument({
    id: 'p1', date: '2020-03-29', caption: 'הרקפת פרחה', plants: ['רקפת'],
  });
  assert.equal(doc.text, 'הרקפת פרחה');
  assert.equal(doc.plants, 'רקפת');
});

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('all post-text field tests passed');
