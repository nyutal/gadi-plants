/* Month view: one month's posts on its own timeline,
   with the span-by-year toggle. */

import { MONTHS_FULL, state, app, byMonth, yearOf, postCardHtml, syncChrome } from "./core.js";

export function renderMonth(m) {
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
