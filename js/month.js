/* Month view: one month's posts on its own timeline,
   with the span-by-year toggle. */

import { MONTHS_FULL, state, app, byMonth, yearOf, dayOf, postCardHtml, syncChrome } from "./core.js";

export function renderMonth(m) {
  state.view = "month"; state.month = m;
  // Without the year split, order by day of month (then year): the card
  // labels show only day + month, so a plain chronological sort makes the
  // days reset at every year boundary and look unordered. With the split,
  // each year group stays chronological.
  const posts = byMonth(m).slice().sort(state.spanByYear
    ? (a, b) => a.date.localeCompare(b.date)
    : (a, b) => dayOf(a) - dayOf(b) || a.date.localeCompare(b.date));
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
