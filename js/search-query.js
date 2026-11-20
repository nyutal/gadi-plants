/* הצמחים של גדי — query parser: turns a raw query string into one or
   more MiniSearch query variants (design §7).
   Date-like tokens become namespaced terms; word tokens pass through
   unchanged (MiniSearch normalizes them at search time). An ambiguous
   token produces several variants, and the engine unions the results. */

const pad2 = (n) => String(n).padStart(2, '0');

/* A date-like token maps to a list of alternative term lists, or null
   when the token is not date-like. */
function dateAlternatives(token) {
  let m;
  // Year-first exact day: 2020-04-05 (separators -, /, .).
  m = token.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return [[`y${y}`, `m${pad2(mo)}`, `d${pad2(d)}`]];
    return null;
  }
  // Day-first exact day, Israeli order: 5.4.2020 / 5/4/2020.
  m = token.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return [[`y${y}`, `m${pad2(mo)}`, `d${pad2(d)}`]];
    return null;
  }
  // Year and month: 2020-04.
  m = token.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]);
    if (mo >= 1 && mo <= 12) return [[`y${y}`, `m${pad2(mo)}`]];
    return null;
  }
  // Month and year: 04/2020.
  m = token.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (m) {
    const mo = Number(m[1]), y = Number(m[2]);
    if (mo >= 1 && mo <= 12) return [[`y${y}`, `m${pad2(mo)}`]];
    return null;
  }
  // Two short numbers, ambiguous: 03/25 is both March 2025 (month/year)
  // and 25 March (month/day). Both readings are kept.
  m = token.match(/^(\d{1,2})[-/.](\d{2})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    const alternatives = [];
    if (a >= 1 && a <= 12) alternatives.push([`y${2000 + b}`, `m${pad2(a)}`]);
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) alternatives.push([`m${pad2(a)}`, `d${pad2(b)}`]);
    return alternatives.length ? alternatives : null;
  }
  // Bare year: 2020. Two-digit year: 20 → 2020s.
  m = token.match(/^(\d{4})$/);
  if (m) return [[`y${m[1]}`]];
  m = token.match(/^(\d{2})$/);
  if (m) return [[`y20${m[1]}`]];
  return null;
}

export function parseQuery(query) {
  const tokens = String(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  let variants = [[]];
  for (const token of tokens) {
    const alternatives = dateAlternatives(token);
    if (!alternatives) {
      for (const v of variants) v.push(token);
    } else {
      const next = [];
      for (const v of variants) for (const alt of alternatives) next.push([...v, ...alt]);
      variants = next;
    }
  }
  return variants.map((v) => v.join(' '));
}
