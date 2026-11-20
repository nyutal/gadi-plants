/* הצמחים של גדי — vanilla JS app, entry point.
   Renders a static posts.json into: year timeline, month view,
   plant index, and per-plant post lists. No framework, no build step.
   Data schema: data/posts.json — see README.md.
   Views: js/year.js, js/month.js, js/plant-index.js, js/plant.js.
   Search: js/search.js, js/search-docs.js, js/search-text.js,
   js/search-query.js, js/search-ui.js.
   Shared state, helpers and card renderers: js/core.js. */

import { state, app, backBtn, tabTimeline, tabIndex } from "./core.js";
import { renderYear } from "./year.js";
import { renderIndex } from "./plant-index.js";
import { initGallery, preloadGalleries } from "./gallery.js";
import { SearchEngine } from "./search.js";
import { mountSearch, clearSearch } from "./search-ui.js";

/* ---------------- chrome: tabs, back button, swipe ---------------- */

function goBack() {
  if (state.view === "plant") renderIndex();
  else if (state.view === "month") renderYear();
  else if (state.view === "search") { clearSearch(); renderYear(); }
}

backBtn.addEventListener("click", goBack);
tabTimeline.addEventListener("click", () => { clearSearch(); renderYear(); });
tabIndex.addEventListener("click", () => { clearSearch(); renderIndex(); });

/* Swipe right returns from month / plant views (clearly horizontal swipes only). */
let touchStart = null;
document.addEventListener("touchstart", (e) => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
document.addEventListener("touchend", (e) => {
  if (e.target.closest && e.target.closest(".gallery-overlay")) return; // gallery handles its own swipes
  if (!touchStart || !(state.view === "month" || state.view === "plant")) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = Math.abs(e.changedTouches[0].clientY - touchStart.y);
  if (dx >= 70 && dx >= 2 * dy) goBack();
  touchStart = null;
}, { passive: true });

/* ---------------- boot ---------------- */

fetch("data/posts.json")
  .then((r) => r.json())
  .then(async (posts) => {
    state.posts = posts;
    /* Load the gallery indexes together with the posts, before the first
       render, so the gallery state is full from the start. The timeout
       keeps an unreachable gallery host from ever blocking the timeline:
       after 5s we render anyway, and any index that arrives late still
       lands in state (and refreshes an open gallery). */
    await Promise.race([
      preloadGalleries(),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    renderYear(); initGallery();
    /* Search: index the posts, fold in whatever gallery indexes arrived,
       and mount the header input. Indexes that arrive late are picked up
       before each search (see search-ui.js). */
    const searchEngine = new SearchEngine();
    searchEngine.buildFromPosts(state.posts);
    searchEngine.syncGalleries(state.galleries);
    mountSearch(searchEngine);
  })
  .catch(() => { app.innerHTML = `<p class="empty">שגיאה בטעינת הנתונים</p>`; });
