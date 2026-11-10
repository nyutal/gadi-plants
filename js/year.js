/* Year view: the 12 month tiles on the year timeline. */

import { MONTHS_FULL, state, app, byMonth, chipsHtml, thumbHtml, syncChrome } from "./core.js";
import { renderMonth } from "./month.js";

export function renderYear() {
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
