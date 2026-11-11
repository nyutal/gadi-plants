/* הצמחים של גדי — shared core: constants, app state, DOM refs, small
   helpers, and the card renderers shared by every view.
   Views live in year.js / month.js / plant-index.js / plant.js;
   app.js is the entry point that wires them together. */

export const MONTHS_FULL = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
export const MONTHS_ABBR = ["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"];

/* Full photo galleries live on the droplet, not in this package (only the
   one thumbnail per post is here). Gallery photos are served from
   `${GALLERY_BASE}/galleries/<post_id>/NN.jpg`, and the gallery index
   (photo lists + per-photo captions, keyed by post id) from
   `${GALLERY_BASE}/galleries/galleries.json`. If the droplet is
   unreachable the site works as before, with empty galleries. */
export const GALLERY_BASE = "https://gadi-plants.duckdns.org";

export const state = {
  posts: [],
  view: "year",        // year | month | index | plant
  month: null,         // 1..12 when view === "month"
  plant: null,         // plant name when view === "plant"
  spanByYear: false,   // month view: group posts by year
  indexMonth: 0,       // index filter: 0 = whole year, else 1..12
  galleries: undefined, // gallery index: undefined = not fetched yet, null = unavailable, else {postId: entry}
};

export const app = document.getElementById("app");
export const backBtn = document.getElementById("back-btn");
export const tabTimeline = document.getElementById("tab-timeline");
export const tabIndex = document.getElementById("tab-index");

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const byMonth = (m) => state.posts.filter((p) => p.month === m);
export const dayOf = (p) => Number(p.date.slice(8, 10));
export const yearOf = (p) => Number(p.date.slice(0, 4));

/* Plant names for a set of posts, most frequent first. */
export function plantCounts(posts) {
  const counts = new Map();
  for (const p of posts) for (const name of p.plants) counts.set(name, (counts.get(name) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "he"));
}

/* Tag chips: first 8 plant names + a "+N" overflow chip. */
export function chipsHtml(posts, limit = 8) {
  const names = plantCounts(posts).map(([n]) => n);
  const shown = names.slice(0, limit).map((n) => `<span class="chip">${esc(n)}</span>`).join("");
  const more = names.length > limit ? `<span class="chip more">+${names.length - limit}</span>` : "";
  return `<div class="chips">${shown}${more}</div>`;
}

/* Compact month-range label for a plant, e.g. "אוק׳–נוב׳".
   Picks the longest run of consecutive months on the 12-month cycle,
   so winter plants wrap the year end: "דצמ׳–מרץ". */
export function monthRangeLabel(months) {
  const set = new Set(months);
  if (set.size === 0) return "";
  if (set.size === 1) return MONTHS_ABBR[[...set][0] - 1];
  let best = null;
  for (let start = 1; start <= 12; start++) {
    if (!set.has(start)) continue;
    let len = 0;
    while (len < 12 && set.has(((start + len - 1) % 12) + 1)) len++;
    if (!best || len > best.len) best = { start, len };
  }
  const end = ((best.start + best.len - 2) % 12) + 1;
  return `${MONTHS_ABBR[best.start - 1]}–${MONTHS_ABBR[end - 1]}`;
}

/* ---------------- shared card renderers ---------------- */

export function thumbHtml(post, alt) {
  return post.image
    ? `<img class="thumb" src="${esc(post.image)}" alt="${esc(alt)}" loading="lazy" decoding="async">`
    : `<div class="thumb-placeholder" aria-hidden="true">❀</div>`;
}

export function postCardHtml(p) {
  const names = p.plants.map((n) => `<span class="chip">${esc(n)}</span>`).join("");
  return `
    <div class="tl-row">
      <div class="tl-gutter date-label">${dayOf(p)} ${MONTHS_ABBR[p.month - 1]}</div>
      <div class="tl-card">
        <article class="card" data-gallery="${esc(p.id)}" tabindex="0" aria-label="פתיחת גלריית התמונות של הפוסט">
          ${thumbHtml(p, p.plants[0] || "")}
          <div class="card-body tl-text">
            <span class="tl-dot" aria-hidden="true"></span>
            ${names ? `<div class="chips">${names}</div>` : ""}
            <p class="caption">${esc(p.caption)}</p>
            <p class="card-links">
              <a class="post-link" href="${esc(p.url)}" target="_blank" rel="noopener">לפוסט בפייסבוק</a>
              <span class="gallery-hint" aria-hidden="true">📷 גלריה</span>
            </p>
          </div>
        </article>
      </div>
    </div>`;
}

/* ---------------- chrome state ---------------- */

export function syncChrome() {
  const inSubView = state.view === "month" || state.view === "plant";
  backBtn.hidden = !inSubView;
  backBtn.textContent = state.view === "plant" ? "→ חזרה לאינדקס" : "→ חזרה לתצוגת השנה";
  tabTimeline.classList.toggle("is-active", state.view === "year" || state.view === "month");
  tabIndex.classList.toggle("is-active", state.view === "index" || state.view === "plant");
  window.scrollTo(0, 0);
}
