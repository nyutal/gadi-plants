/* Tests for CaptionFieldBuilder (diff 6).
   Run: node tools/search-captions-field.test.mjs */
import assert from 'node:assert/strict';
import { buildDocument, CaptionFieldBuilder } from '../js/search-docs.js';

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`ok - ${name}`); }
  catch (e) { failures++; console.error(`FAIL - ${name}: ${e.message}`); }
}

check('CaptionFieldBuilder joins all captions, skipping empties', () => {
  const fb = new CaptionFieldBuilder();
  assert.equal(fb.field, 'captions');
  const entry = { photo_count: 3, captions: { '01.jpg': 'רקפת פורחת', '02.jpg': '', '03.jpg': 'כלנית' } };
  assert.equal(fb.build({ galleryEntry: entry }), 'רקפת פורחת כלנית');
});

check('CaptionFieldBuilder returns empty without a gallery entry', () => {
  const fb = new CaptionFieldBuilder();
  assert.equal(fb.build({ galleryEntry: null }), '');
  assert.equal(fb.build({}), '');
  assert.equal(fb.build({ galleryEntry: { photo_count: 0 } }), '');
  assert.equal(fb.build({ galleryEntry: { captions: {} } }), '');
});

check('buildDocument now includes the captions field', () => {
  const doc = buildDocument(
    { id: 'p1', date: '2020-03-29', caption: '', plants: [] },
    { photo_count: 1, captions: { '01.jpg': 'רקפת' } },
  );
  assert.equal(doc.captions, 'רקפת');
  const noGallery = buildDocument(
    { id: 'p2', date: '2020-03-29', caption: '', plants: [] },
    null,
  );
  assert.equal(noGallery.captions, '');
});

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('all captions field tests passed');
