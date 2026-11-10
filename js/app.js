/* הצמחים של גדי — vanilla JS app.
   Renders a static posts.json into: year timeline, month view,
   plant index, and per-plant post lists. No framework, no build step.
   Data schema: data/posts.json — see README.md. */

"use strict";

const MONTHS_FULL = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const MONTHS_ABBR = ["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"];

const state = {
  posts: [],
  view: "year",        // year | month | index | plant
  month: null,         // 1..12 when view === "month"
  plant: null,         // plant name when view === "plant"
  spanByYear: false,   // month view: group posts by year
  indexMonth: 0,       // index filter: 0 = whole year, else 1..12
};

const app = document.getElementById("app");
const backBtn = document.getElementById("back-btn");
const tabTimeline = document.getElementById("tab-timeline");
const tabIndex = document.getElementById("tab-index");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const byMonth = (m) => state.posts.filter((p) => p.month === m);
const dayOf = (p) => Number(p.date.slice(8, 10));
const yearOf = (p) => Number(p.date.slice(0, 4));

/* Plant names for a set of posts, most frequent first. */
function plantCounts(posts) {
  const counts = new Map();
  for (const p of posts) for (const name of p.plants) counts.set(name, (counts.get(name) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "he"));
}

/* Tag chips: first 8 plant names + a "+N" overflow chip. */
function chipsHtml(posts, limit = 8) {
  const names = plantCounts(posts).map(([n]) => n);
  const shown = names.slice(0, limit).map((n) => `<span class="chip">${esc(n)}</span>`).join("");
  const more = names.length > limit ? `<span class="chip more">+${names.length - limit}</span>` : "";
  return `<div class="chips">${shown}${more}</div>`;
}

/* Compact month-range label for a plant, e.g. "אוק׳–נוב׳".
   Picks the longest run of consecutive months on the 12-month cycle,
   so winter plants wrap the year end: "דצמ׳–מרץ". */
function monthRangeLabel(months) {
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

/* ---------------- views ---------------- */

function thumbHtml(post, alt) {
  return post.image
    ? `<img class="thumb" src="${esc(post.image)}" alt="${esc(alt)}" loading="lazy" decoding="async">`
    : `<div class="thumb-placeholder" aria-hidden="true">❀</div>`;
}

function renderYear() {
  state.view = "year";
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const posts = byMonth(m);
    if (!posts.length) continue;
    const rep = [...posts].reverse().find((p) => p.image) || posts[posts.length - 1];
    rows.push(`
      <div class="tl-row">
        <div class="tl-gutter">${MONTHS_FULL[m - 1]}</div>
        <div class="tl-card">
          <button class="card-btn" type="button" data-month="${m}" aria-label="${MONTHS_FULL[m - 1]} — ${posts.length} פוסטים">
            <article class="card">
              ${thumbHtml(rep, rep.plants[0] || MONTHS_FULL[m - 1])}
              <div class="card-body tl-text">
                <span class="tl-dot" aria-hidden="true"></span>
                <h3>${MONTHS_FULL[m - 1]}<span class="count-pill">${posts.length}</span></h3>
                ${chipsHtml(posts)}
              </div>
            </article>
          </button>
        </div>
      </div>`);
  }
  app.innerHTML = `<div class="timeline">${rows.join("")}</div>`;
  app.querySelectorAll("[data-month]").forEach((b) =>
    b.addEventListener("click", () => renderMonth(Number(b.dataset.month))));
  syncChrome();
}

function postCardHtml(p) {
  const names = p.plants.map((n) => `<span class="chip">${esc(n)}</span>`).join("");
  return `
    <div class="tl-row">
      <div class="tl-gutter date-label">${dayOf(p)} ${MONTHS_ABBR[p.month - 1]}</div>
      <div class="tl-card">
        <article class="card">
          ${thumbHtml(p, p.plants[0] || "")}
          <div class="card-body tl-text">
            <span class="tl-dot" aria-hidden="true"></span>
            ${names ? `<div class="chips">${names}</div>` : ""}
            <p class="caption">${esc(p.caption)}</p>
            <p><a class="post-link" href="${esc(p.url)}" target="_blank" rel="noopener">לפוסט בפייסבוק</a></p>
          </div>
        </article>
      </div>
    </div>`;
}

function renderMonth(m) {
  state.view = "month"; state.month = m;
  const posts = byMonth(m).slice().sort((a, b) => a.date.localeCompare(b.date));
  let body = "";
  if (state.spanByYear) {
    const years = [...new Set(posts.map(yearOf))].sort();
    for (const y of years) {
      body += `<div class="year-sep">${y}</div>` + posts.filter((p) => yearOf(p) === y).map(postCardHtml).join("");
    }
  } else {
    body = posts.map(postCardHtml).join("");
  }
  app.innerHTML = `
    <div class="view-head">
      <h2>${MONTHS_FULL[m - 1]}</h2>
      <label class="switch">
        <input type="checkbox" id="span-toggle" ${state.spanByYear ? "checked" : ""}>
        פיצול לפי שנים
      </label>
    </div>
    <div class="timeline">${body}</div>`;
  document.getElementById("span-toggle").addEventListener("change", (e) => {
    state.spanByYear = e.target.checked; renderMonth(m);
  });
  syncChrome();
}

function allPlants() {
  const map = new Map(); // name -> { count, months:Set, perMonth:Map }
  for (const p of state.posts) for (const name of p.plants) {
    if (!map.has(name)) map.set(name, { count: 0, months: new Set(), perMonth: new Map() });
    const e = map.get(name);
    e.count++; e.months.add(p.month);
    e.perMonth.set(p.month, (e.perMonth.get(p.month) || 0) + 1);
  }
  return map;
}

function renderIndex() {
  state.view = "index";
  const plants = allPlants();
  const filter = state.indexMonth;
  const names = [...plants.keys()]
    .filter((n) => filter === 0 || plants.get(n).perMonth.has(filter))
    .sort((a, b) => a.localeCompare(b, "he"));
  const byLetter = new Map();
  for (const n of names) {
    const letter = n[0];
    if (!byLetter.has(letter)) byLetter.set(letter, []);
    byLetter.get(letter).push(n);
  }
  const options = [`<option value="0" ${filter === 0 ? "selected" : ""}>כל השנה</option>`]
    .concat(MONTHS_FULL.map((mf, i) =>
      `<option value="${i + 1}" ${filter === i + 1 ? "selected" : ""}>${mf}</option>`)).join("");
  let html = `<div class="index-tools"><label>חודש: <select id="index-month">${options}</select></label></div>`;
  for (const [letter, list] of byLetter) {
    html += `<h3 class="letter-head">${esc(letter)}</h3>`;
    for (const n of list) {
      const e = plants.get(n);
      const meta = filter === 0
        ? `${monthRangeLabel([...e.months])} · ${e.count}`
        : `${e.perMonth.get(filter)}`;
      html += `<button class="plant-row" type="button" data-plant="${esc(n)}">
                 <span class="p-name">${esc(n)}</span><span class="p-meta">${esc(meta)}</span>
               </button>`;
    }
  }
  app.innerHTML = html || `<p class="empty">אין צמחים בחודש זה</p>`;
  document.getElementById("index-month").addEventListener("change", (e) => {
    state.indexMonth = Number(e.target.value); renderIndex();
  });
  app.querySelectorAll("[data-plant]").forEach((b) =>
    b.addEventListener("click", () => renderPlant(b.dataset.plant)));
  syncChrome();
}

function renderPlant(name) {
  state.view = "plant"; state.plant = name;
  const posts = state.posts.filter((p) => p.plants.includes(name))
    .slice().sort((a, b) => a.month - b.month || dayOf(a) - dayOf(b) || a.date.localeCompare(b.date));
  app.innerHTML = `
    <div class="view-head"><h2>${esc(name)}</h2><span class="count-pill">${posts.length}</span></div>
    <div class="timeline">${posts.map(postCardHtml).join("")}</div>`;
  syncChrome();
}

/* ---------------- chrome: tabs, back button, swipe ---------------- */

function syncChrome() {
  const inSubView = state.view === "month" || state.view === "plant";
  backBtn.hidden = !inSubView;
  backBtn.textContent = state.view === "plant" ? "→ חזרה לאינדקס" : "→ חזרה לתצוגת השנה";
  tabTimeline.classList.toggle("is-active", state.view === "year" || state.view === "month");
  tabIndex.classList.toggle("is-active", state.view === "index" || state.view === "plant");
  window.scrollTo(0, 0);
}

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
  if (!touchStart || !(state.view === "month" || state.view === "plant")) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = Math.abs(e.changedTouches[0].clientY - touchStart.y);
  if (dx >= 70 && dx >= 2 * dy) goBack();
  touchStart = null;
}, { passive: true });

/* ---------------- boot ---------------- */

fetch("data/posts.json")
  .then((r) => r.json())
  .then((posts) => { state.posts = posts; renderYear(); })
  .catch(() => { app.innerHTML = `<p class="empty">שגיאה בטעינת הנתונים</p>`; });
