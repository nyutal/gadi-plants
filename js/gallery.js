/* Gallery popup (lightbox): clicking a post card opens its full photo
   gallery as an overlay above the blurred site. One large photo at a
   time, its caption below, prev/next via buttons, keyboard and swipe.

   Photos are hosted on the droplet (see GALLERY_BASE in core.js); the
   in-package site only carries one thumbnail per post. The gallery
   index (galleries.json) is fetched lazily on first open:
     { "<post_id>": { "photo_count": N,
                      "files": ["01.jpg", ...],
                      "captions": { "01.jpg": "...", ... } } }
   Photo URL for a file: `${GALLERY_BASE}/galleries/<post_id>/<file>`.
   Until a post has an entry (or the droplet is unreachable), its
   gallery opens with an empty state.

   The popup is deep-linkable: #/gallery/<post_id>/<n> (1-based). The
   browser Back button closes it. */

import { state, GALLERY_BASE } from "./core.js";

let overlay, imgEl, emptyEl, captionEl, counterEl, prevBtn, nextBtn;
let current = null;          // { postId, photos: [{file, caption}], index }
let ownsHistoryEntry = false;
let built = false;

const photoUrl = (postId, file) => `${GALLERY_BASE}/galleries/${postId}/${file}`;

function photosOf(postId) {
  const entry = state.galleries && state.galleries[postId];
  if (!entry) return [];
  const files = entry.files && entry.files.length
    ? entry.files
    : Array.from({ length: entry.photo_count || 0 }, (_, i) => `${String(i + 1).padStart(2, "0")}.jpg`);
  return files.map((file) => ({ file, caption: (entry.captions && entry.captions[file]) || "" }));
}

function loadGalleries() {
  if (state.galleries !== undefined) return;
  state.galleries = null; // mark "fetching" so parallel opens don't refetch
  fetch(`${GALLERY_BASE}/galleries/galleries.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      state.galleries = data || {};
      if (current) { // refresh the open gallery now that data arrived
        const idx = current.index;
        current.photos = photosOf(current.postId);
        show(Math.min(idx, Math.max(0, current.photos.length - 1)), false);
      }
    })
    .catch(() => { state.galleries = {}; });
}

function build() {
  if (built) return;
  built = true;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="gallery-overlay" hidden>
      <div class="gallery-frame" role="dialog" aria-modal="true" aria-label="גלריית תמונות">
        <button class="g-btn g-close" type="button" aria-label="סגירת הגלריה">✕</button>
        <div class="g-stage">
          <img class="g-img" alt="" hidden>
          <div class="g-empty">
            <div class="g-empty-icon" aria-hidden="true">❀</div>
            <p>גלריית התמונות המלאה של הפוסט תעלה בקרוב</p>
          </div>
        </div>
        <button class="g-btn g-nav g-prev" type="button" aria-label="התמונה הקודמת">›</button>
        <button class="g-btn g-nav g-next" type="button" aria-label="התמונה הבאה">‹</button>
        <div class="g-bar">
          <span class="g-counter"></span>
          <p class="g-caption"></p>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  overlay = wrap.querySelector(".gallery-overlay");
  imgEl = wrap.querySelector(".g-img");
  emptyEl = wrap.querySelector(".g-empty");
  captionEl = wrap.querySelector(".g-caption");
  counterEl = wrap.querySelector(".g-counter");
  prevBtn = wrap.querySelector(".g-prev");
  nextBtn = wrap.querySelector(".g-next");

  wrap.querySelector(".g-close").addEventListener("click", closeGallery);
  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeGallery(); });

  document.addEventListener("keydown", (e) => {
    if (!current) return;
    if (e.key === "Escape") closeGallery();
    else if (e.key === "ArrowLeft") step(1);   // RTL: left = next
    else if (e.key === "ArrowRight") step(-1); // RTL: right = previous
  });

  /* Swipe inside the gallery moves between photos. */
  let touch = null;
  overlay.addEventListener("touchstart", (e) => {
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  overlay.addEventListener("touchend", (e) => {
    if (!touch || !current) return;
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = Math.abs(e.changedTouches[0].clientY - touch.y);
    if (Math.abs(dx) >= 45 && Math.abs(dx) >= 2 * dy) step(dx < 0 ? -1 : 1); // RTL: swipe right = next
    touch = null;
  }, { passive: true });

  window.addEventListener("popstate", () => { if (current) hide(); });
}

function show(index, updateHash = true) {
  if (!current) return;
  const photos = current.photos;
  current.index = photos.length ? ((index % photos.length) + photos.length) % photos.length : 0;
  const has = photos.length > 0;
  imgEl.hidden = !has;
  emptyEl.hidden = has;
  prevBtn.hidden = nextBtn.hidden = photos.length < 2;
  counterEl.textContent = has ? `${current.index + 1} / ${photos.length}` : "";
  if (has) {
    const photo = photos[current.index];
    imgEl.src = photoUrl(current.postId, photo.file);
    imgEl.alt = photo.caption || "";
    captionEl.textContent = photo.caption;
    for (const n of [current.index - 1, current.index + 1]) { // preload neighbours
      if (n >= 0 && n < photos.length) { const pre = new Image(); pre.src = photoUrl(current.postId, photos[n].file); }
    }
  } else {
    captionEl.textContent = "";
  }
  if (updateHash) {
    history.replaceState(null, "", `#/gallery/${current.postId}/${current.index + 1}`);
  }
}

function step(d) { if (current && current.photos.length) show(current.index + d); }

function hide() {
  current = null;
  ownsHistoryEntry = false;
  overlay.hidden = true;
  document.body.style.overflow = "";
  imgEl.removeAttribute("src");
}

export function openGallery(postId, index = 0) {
  build();
  loadGalleries();
  current = { postId, photos: photosOf(postId), index: 0 };
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  history.pushState(null, "", `#/gallery/${postId}/${index + 1}`);
  ownsHistoryEntry = true;
  show(index, false);
}

export function closeGallery() {
  if (!current) return;
  if (ownsHistoryEntry) history.back(); // the popstate handler hides it
  else { hide(); history.replaceState(null, "", location.pathname + location.search); }
}

/* Wire card clicks + deep links. Call once, after posts are loaded. */
export function initGallery() {
  build();
  document.addEventListener("click", (e) => {
    const card = e.target.closest("[data-gallery]");
    if (!card) return;
    if (e.target.closest("a")) return; // the Facebook link keeps its own behaviour
    openGallery(card.dataset.gallery);
  });
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-gallery]")
        && !e.target.closest("a")) {
      e.preventDefault();
      openGallery(e.target.dataset.gallery);
    }
  });
  const m = location.hash.match(/^#\/gallery\/(\d+)\/(\d+)$/);
  if (m && state.posts.some((p) => p.id === m[1])) {
    openGallery(m[1], Number(m[2]) - 1);
    ownsHistoryEntry = false; // arrived by link: closing clears the hash in place
  }
}
