/* הצמחים של גדי — search UI: header input, results reuse post cards.
   Design: SEARCH-DESIGN.md §5. */

import { state, app, backBtn, postCardHtml, yearOf } from "./core.js";
import { renderYear } from "./year.js";

let engine = null;
let input = null;
let countEl = null;
let noteEl = null;
let clearBtn = null;

export function mountSearch(searchEngine) {
  engine = searchEngine;
  const header = document.querySelector(".site-header");
  const wrap = document.createElement("div");
  wrap.className = "search";
  wrap.innerHTML = `
    <div class="search-box">
      <input class="search-input" type="search" placeholder="חיפוש בפוסטים…" aria-label="חיפוש בפוסטים">
      <button class="search-clear" type="button" aria-label="ניקוי החיפוש" hidden>✕</button>
    </div>
    <p class="search-count" aria-live="polite"></p>
    <p class="search-note" hidden>הכיתובים של חלק מהשנים עדיין לא נטענו — חיפוש בכיתובים עלול להחסיר תוצאות</p>`;
  header.appendChild(wrap);
  input = wrap.querySelector(".search-input");
  countEl = wrap.querySelector(".search-count");
  noteEl = wrap.querySelector(".search-note");
  clearBtn = wrap.querySelector(".search-clear");
  input.addEventListener("input", () => { clearBtn.hidden = !input.value; runSearch(); });
  clearBtn.addEventListener("click", () => { clearSearch(); input.focus(); });
}

/* Clears the query and its chrome (used when leaving the search view). */
export function clearSearch() {
  if (!input) return;
  input.value = "";
  clearBtn.hidden = true;
  countEl.textContent = "";
  noteEl.hidden = true;
}

function captionsReady() {
  const years = new Set(state.posts.map(yearOf));
  return [...years].every((y) => engine.indexedYears.has(y));
}

function runSearch() {
  const query = input.value.trim();
  if (!query) { clearSearch(); renderYear(); return; }
  /* Gallery indexes that arrived after boot still land in the search index. */
  engine.syncGalleries(state.galleries);
  const results = engine.search(query);
  const byId = new Map(state.posts.map((p) => [p.id, p]));
  const posts = results.map((r) => byId.get(r.id)).filter(Boolean);
  state.view = "search";
  countEl.textContent = posts.length ? `נמצאו ${posts.length} פוסטים` : "לא נמצאו פוסטים";
  noteEl.hidden = captionsReady();
  app.innerHTML = posts.length
    ? `<div class="view-head"><h2>תוצאות חיפוש</h2></div><div class="timeline">${posts.map(postCardHtml).join("")}</div>`
    : `<p class="empty">לא נמצאו פוסטים התואמים את החיפוש</p>`;
  backBtn.hidden = false;
  backBtn.textContent = "→ חזרה לתצוגת השנה";
  window.scrollTo(0, 0);
}
