/* Tests for DocumentBuilder + PlantFieldBuilder (diff 3).
   Run: node tools/search-docs.test.mjs */
import assert from 'node:assert/strict';
import { buildDocument, buildDocuments, FIELD_BUILDERS, PlantFieldBuilder } from '../js/search-docs.js';

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`ok - ${name}`); }
  catch (e) { failures++; console.error(`FAIL - ${name}: ${e.message}`); }
}

const post = { id: 'p1', date: '2020-03-29', month: 3, caption: 'הרקפת פרחה', plants: ['רקפת', 'כלנית'], url: '', image: null };

check('PlantFieldBuilder joins the plants array', () => {
  const fb = new PlantFieldBuilder();
  assert.equal(fb.field, 'plants');
  assert.equal(fb.build({ post }), 'רקפת כלנית');
  assert.equal(fb.build({ post: { plants: [] } }), '');
  assert.equal(fb.build({ post: {} }), '');
});

check('buildDocument returns id, date and the plants field', () => {
  // Individual assertions, not an exact object: later diffs add more
  // fields to the document, and this test must not break when they do.
  const doc = buildDocument(post);
  assert.equal(doc.id, 'p1');
  assert.equal(doc.date, '2020-03-29');
  assert.equal(doc.plants, 'רקפת כלנית');
});

check('the builder passes the same ctx to every field builder', () => {
  const seen = [];
  const fake = { field: 'fake', build: (ctx) => { seen.push(ctx); return 'x'; } };
  FIELD_BUILDERS.push(fake);
  try {
    const entry = { photo_count: 2, captions: { '01.jpg': 'רקפת' } };
    const doc = buildDocument(post, entry);
    assert.equal(doc.fake, 'x');
    assert.equal(seen.length, 1);
    assert.equal(seen[0].post, post);
    assert.equal(seen[0].galleryEntry, entry);
  } finally { FIELD_BUILDERS.pop(); }
});

check('buildDocuments attaches each post to its own gallery entry', () => {
  const posts = [
    post,
    { id: 'p2', date: '2021-04-05', month: 4, caption: '', plants: ['נורית'], url: '', image: null },
  ];
  const galleries = { 2020: { p1: { photo_count: 1, captions: { '01.jpg': 'רקפת' } } } };
  const seen = [];
  const spy = { field: 'spy', build: (ctx) => { seen.push(ctx.galleryEntry); return ''; } };
  FIELD_BUILDERS.push(spy);
  try {
    const docs = buildDocuments(posts, galleries);
    assert.equal(docs.length, 2);
    assert.equal(docs[0].plants, 'רקפת כלנית');
    assert.equal(docs[1].plants, 'נורית');
    assert.equal(seen[0], galleries[2020].p1);
    assert.equal(seen[1], null);
  } finally { FIELD_BUILDERS.pop(); }
});

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('all document builder tests passed');
