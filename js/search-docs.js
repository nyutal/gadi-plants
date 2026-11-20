/* הצמחים של גדי — search documents: DocumentBuilder + field builders.
   Design: SEARCH-DESIGN.md §4, §5. */

/* One field builder builds exactly one field of the document — that 1:1
   mapping is the contract the builder relies on. */

export class PlantFieldBuilder {
  field = 'plants';
  /* The post's plants are an array; the indexed field is one
     space-separated string. */
  build(ctx) {
    return (ctx.post.plants || []).join(' ');
  }
}

export class PostTextFieldBuilder {
  field = 'text';
  /* The post's free text lives in `caption` — there is no `text` field. */
  build(ctx) {
    return ctx.post.caption || '';
  }
}

/* Hebrew month names, mirroring MONTHS_FULL in core.js — kept here (not
   imported) so this module stays free of the DOM and testable in Node. */
const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export class DateFieldBuilder {
  field = 'dateTerms';
  /* '2020-03-29' → 'y2020 m03 d29 מרץ': namespaced tokens, so a month
     can never collide with a day or a word. */
  build(ctx) {
    const [y, m, d] = ctx.post.date.split('-').map(Number);
    return `y${y} m${String(m).padStart(2, '0')} d${String(d).padStart(2, '0')} ${HE_MONTHS[m - 1]}`;
  }
}

export const FIELD_BUILDERS = [new PlantFieldBuilder(), new PostTextFieldBuilder(), new DateFieldBuilder()];

/* The shared high-level context: the post plus its gallery entry (null
   when the post has no gallery yet). Every field builder pulls what it
   needs from the same ctx. */
export function buildDocument(post, galleryEntry = null) {
  const ctx = { post, galleryEntry };
  const doc = { id: post.id, date: post.date };
  for (const fb of FIELD_BUILDERS) doc[fb.field] = fb.build(ctx);
  return doc;
}

const yearOf = (post) => Number(post.date.slice(0, 4));

export function buildDocuments(posts, galleries = {}) {
  return posts.map((p) => {
    const index = galleries[yearOf(p)];
    return buildDocument(p, index ? index[p.id] ?? null : null);
  });
}
