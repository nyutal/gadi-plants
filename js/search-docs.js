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

export const FIELD_BUILDERS = [new PlantFieldBuilder(), new PostTextFieldBuilder()];

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
