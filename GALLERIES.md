# Galleries — how they work and how to update them

Developer notes for the per-post photo galleries. The site itself (this
repo, served by GitHub Pages) carries only `data/posts.json` and one
thumbnail per post. The full galleries live **outside** this repo, in a
single self-contained package (the "gallery blob"), for two reasons:
size (a year of galleries is a few hundred MB) and independence (the
timeline must keep working even if the gallery host is unreachable).

## The package

A gallery blob is a zip with exactly this layout:

```
galleries/
  galleries.json
  <fb_post_id>/
    01.jpg
    02.jpg
    ...
```

- **Photos** — JPEG, RGB, longest side capped at 800 px, quality ~72.
  Files are named by their position in the post's photo viewer,
  zero-padded (`01.jpg`, `02.jpg`, …). If a position holds a video
  instead of a photo it gets **no file** — the numbering keeps the gap
  (e.g. `63.jpg` then `65.jpg`).
- **`galleries.json`** — the index, keyed by post id:

  ```json
  {
    "<fb_post_id>": {
      "photo_count": 57,
      "files": ["01.jpg", "02.jpg"],
      "captions": { "01.jpg": "…", "02.jpg": "" }
    }
  }
  ```

  `files` is the explicit display order; `captions` maps each file to
  its per-photo caption (empty string when that photo has none).
- The zip uses stored (uncompressed) entries: JPEGs do not shrink, the
  zip is only a container.
- Photo URLs are **derived, never stored**: the site builds them as
  `<GALLERY_BASE>/galleries/<post_id>/<file>`, where `GALLERY_BASE` is
  the constant in `js/core.js`, and fetches the index from
  `<GALLERY_BASE>/galleries/galleries.json`.

## Producing a new blob

1. **Collect** each post's photos in viewer order, together with the
   per-photo captions (most photos have one; some posts have none).
2. **Process** every photo to the format above, named by position.
3. **Generate `galleries.json` from the collection manifest** — never
   edit it by hand. Then validate before packing: every file listed in
   the index exists in the package, counts match, and the finished zip
   passes an integrity check.
4. **Pack** the whole `galleries/` folder as one zip, and record its
   SHA-256.

## Publishing an update

The blob is published in two places, for two different purposes:

1. **Archive — a GitHub Release on this repo.** Create a release with a
   fresh tag (convention: `galleries-<year>-<stage>`, e.g.
   `galleries-2026-early`), attach the zip as a release asset, mark it
   as a pre-release while the collection is partial, and put the post
   count, photo count and the zip's SHA-256 in the notes. Never replace
   an asset in place — a corrected or extended blob gets a new release.
   Release assets live outside git: they are not part of the Pages
   build and are not served to the site.
2. **Live host — static file hosting.** Unzip the package on the
   gallery host so the `galleries/` folder is served under the
   `GALLERY_BASE` origin. Upload the index and the photos **as one
   package** so they can never drift apart. One server requirement: the
   JSON fetch is cross-origin, so `galleries.json` must be served with
   an `Access-Control-Allow-Origin` header (plain photo loads via
   `<img>` do not need CORS).

Then verify:

- `<GALLERY_BASE>/galleries/galleries.json` returns 200 with the CORS
  header, and a sample `<GALLERY_BASE>/galleries/<post_id>/01.jpg`
  returns 200.
- On the live site, clicking a post that has a gallery opens the popup
  with photos and captions; clicking one without an entry shows the
  empty state — that is expected, not a bug.

## Behaviour when the blob is missing or unreachable

The index is fetched lazily, the first time a gallery is opened. If the
fetch fails (host down, network blocked), the timeline still renders
fully and every gallery opens with the empty state. The empty result is
cached for the current page view; a refresh retries. No site change is
needed when a new blob goes live — the popup lights up on its own.
