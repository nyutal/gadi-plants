# Galleries — how they work and how to update them

Developer notes for the per-post photo galleries. The site itself (this
repo, served by GitHub Pages) carries only `data/posts.json` and one
thumbnail per post. The full galleries live **outside** this repo, in a
single self-contained package (the "gallery blob"), for two reasons:
size (a year of galleries is a few hundred MB) and independence (the
timeline must keep working even if the gallery host is unreachable).

## The package

A gallery blob is a zip with exactly this layout — one folder per year,
each year self-contained with its own index:

```
galleries/
  <year>/
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
- **`galleries.json`** — the index for that year only, keyed by post id:

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
  `<GALLERY_BASE>/galleries/<year>/<post_id>/<file>`, where `GALLERY_BASE`
  is the constant in `js/core.js` and `<year>` is the post's year from
  `data/posts.json`, and fetches the index for that year from
  `<GALLERY_BASE>/galleries/<year>/galleries.json`. Each year's folder is
  independent: updating one year never touches the others.

## Producing a new blob

1. **Collect** each post's photos in viewer order, together with the
   per-photo captions (most photos have one; some posts have none).
2. **Process** every photo to the format above, named by position.
3. **Generate `galleries.json` from the collection manifest for that
   year** — never edit it by hand. Then validate before packing: every
   file listed in the index exists in the package, counts match, and the
   finished zip passes an integrity check.
4. **Pack** the whole `galleries/` folder as one zip, and record its
   SHA-256. The zip holds that year's folder only (`galleries/<year>/…`).

## Publishing an update

The blob is published in two places, for two different purposes:

1. **Archive — a GitHub Release on this repo.** Create a release with a
   fresh tag (convention: `galleries-<year>-<stage>`, e.g.
   `galleries-2026-early`), attach the zip as a release asset, mark it
   as a pre-release while the collection is partial, and put the post
   count, photo count and the zip's SHA-256 in the notes. Never replace
   an asset in place — a corrected or extended blob gets a new release.
   Release assets live outside git: they are not part of the Pages
   build and are not served to the site. (The `galleries-2026-final`
   release predates the per-year split — its zip holds the 2026 posts
   directly under `galleries/`, without the year folder. Later blobs
   carry the year folder.)
2. **Live host — static file hosting.** Unzip the package on the
   gallery host so the `galleries/` folder is served under the
   `GALLERY_BASE` origin. Upload the index and the photos **as one
   package** so they can never drift apart. One server requirement: the
   JSON fetch is cross-origin, so each year's `galleries.json` must be
   served with an `Access-Control-Allow-Origin` header (plain photo
   loads via `<img>` do not need CORS).

   **Where exactly (nginx):** edit the site's own config file — its
   file in `/etc/nginx/sites-available/`, enabled by a symlink in
   `sites-enabled/` (never another site's file). Inside that file, use
   the `server { … }` block that actually serves the site over HTTPS —
   the one holding the site's `root`. A redirect-only block or a by-IP
   test listener does not need it. Add the location **inside** that
   server block, as a sibling of the existing `location /` block, not
   nested inside it. One prefix location covers every year's index
   (present and future); the header on the photos themselves is
   harmless:

   ```nginx
   server {
       listen 443 ssl;
       server_name <gallery-host>;

       root /path/to/the/site;
       index index.html;

       location / {
           try_files $uri $uri/ =404;
       }

       location /galleries/ {
           add_header Access-Control-Allow-Origin *;
       }

       # ... the ssl_certificate lines (e.g. added by Certbot) stay as they are
   }
   ```

   Then test and reload: `nginx -t && systemctl reload nginx`. Only
   the index files need the header, and `*` is fine — the data is
   public and read-only. It is safe to add before the `galleries/`
   folder exists on the host; on another server, set the equivalent
   header for that path.

### Deploying a blob on the host — step by step

Run these on the gallery host, in the web-root folder that the
`GALLERY_BASE` origin serves (the folder that will contain
`galleries/`). The example uses the `galleries-2026-early` release;
for a later blob, substitute its tag and file name.

1. **Download the release asset.** The repo is public, so no login is
   needed. A release asset downloads from
   `https://github.com/<owner>/<repo>/releases/download/<tag>/<asset>`:

   ```bash
   wget https://github.com/nyutal/gadi-plants/releases/download/galleries-2026-early/galleries-2026-early.zip
   ls -lh galleries-2026-early.zip
   ```

   Any HTTP client works; with python3 alone:

   ```bash
   python3 -c "import urllib.request; urllib.request.urlretrieve('https://github.com/nyutal/gadi-plants/releases/download/galleries-2026-early/galleries-2026-early.zip','galleries-2026-early.zip')"
   ```

2. **Verify the download** against the SHA-256 recorded in the release
   notes. If it does not match, delete the file and download again —
   do not unpack a bad copy:

   ```bash
   sha256sum galleries-2026-early.zip
   ```

3. **When replacing an older blob for the same year**, remove that
   year's folder first so nothing stale survives the swap. Other years
   are untouched:

   ```bash
   rm -rf galleries/2026
   ```

4. **Unpack.** The zip's top-level folder is `galleries/`, so it lands
   exactly where the host serves it from:

   ```bash
   python3 -m zipfile -e galleries-2026-early.zip .
   # or, if unzip is installed:  unzip galleries-2026-early.zip
   ```

5. **Verify the contents** — the index plus one folder per post, and
   the photo count from the release notes:

   ```bash
   ls galleries/2026/
   find galleries/2026 -name '*.jpg' | wc -l
   ```

6. **Make sure the CORS header is in place** (the nginx location
   above), with `nginx -t` and a reload after any change.

7. **Clean up.** The release itself is the archive of record, so the
   zip does not need to stay on the host:

   ```bash
   rm galleries-2026-early.zip
   ```

Then verify:

- `<GALLERY_BASE>/galleries/2026/galleries.json` returns 200 with the
  CORS header, and a sample
  `<GALLERY_BASE>/galleries/2026/<post_id>/01.jpg` returns 200.
- On the live site, clicking a post that has a gallery opens the popup
  with photos and captions; clicking one without an entry shows the
  empty state — that is expected, not a bug.

## Behaviour when the blob is missing or unreachable

The index for a year is fetched lazily, the first time a gallery from
that year is opened. If the fetch fails (host down, network blocked),
the timeline still renders fully and every gallery opens with the empty
state. The empty result is cached for the current page view, per year;
a refresh retries. No site change is needed when a new blob goes live —
the popup lights up on its own.
