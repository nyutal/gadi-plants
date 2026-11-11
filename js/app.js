/* הצמחים של גדי — vanilla JS app, entry point.
   Renders a static posts.json into: year timeline, month view,
   plant index, and per-plant post lists. No framework, no build step.
   Data schema: data/posts.json — see README.md.
   Views: js/year.js, js/month.js, js/plant-index.js, js/plant.js.
   Shared state, helpers and card renderers: js/core.js. */

import { state, app, backBtn, tabTimeline, tabIndex } from "./core.js";
import { renderYear } from "./year.js";
import { renderIndex } from "./plant-index.js";
import { initGallery } from "./gallery.js";

/* ---------------- chrome: tabs, back button, swipe ---------------- */

function goBack() {
  if (state.view === "plant") renderIndex();
  else if (state.view === "month") renderYear();
}

backBtn.addEventListener("click", goBack);
tabTimeline.addEventListener("click", renderYear);
tabIndex.addEventListener("click", renderIndex);

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
  .then((posts) => { state.posts = posts; renderYear(); initGallery(); })
  .catch(() => { app.innerHTML = `<p class="empty">שגיאה בטעינת הנתונים</p>`; });
