/* Plant view: all posts for one plant, in calendar order. */

import { state, app, esc, dayOf, postCardHtml, syncChrome } from "./core.js";

export function renderPlant(name) {
  state.view = "plant"; state.plant = name;
  const posts = state.posts.filter((p) => p.plants.includes(name))
    .slice().sort((a, b) => a.month - b.month || dayOf(a) - dayOf(b) || a.date.localeCompare(b.date));
  app.innerHTML = `
    <div class="view-head"><h2>${esc(name)}</h2><span class="count-pill">${posts.length}</span></div>
    <div class="timeline">${posts.map(postCardHtml).join("")}</div>`;
  syncChrome();
}
