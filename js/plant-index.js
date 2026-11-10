/* Plant index view: every plant A–ב, with a month filter. */

import { MONTHS_FULL, state, app, esc, monthRangeLabel, syncChrome } from "./core.js";
import { renderPlant } from "./plant.js";

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

export function renderIndex() {
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
