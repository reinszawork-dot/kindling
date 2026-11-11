/* Shared helpers: dates, formatting, DOM building, icons, animation. */

/* ---------- dates (local calendar days, keyed YYYY-MM-DD) ---------- */
export const pad = (n) => String(n).padStart(2, '0');
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const todayKey = () => keyOf(startOfToday());
export const daysBetween = (a, b) => Math.round((b - a) / 864e5);
export const weekStartOf = (d, ws = 1) => addDays(d, -((d.getDay() - ws + 7) % 7));
export const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
export const isValidKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dowOrder = (ws = 1) => Array.from({ length: 7 }, (_, i) => (ws + i) % 7);

/* ---------- formatting ---------- */
export const fmtNum = (n) => Number(n).toLocaleString();
export const plural = (n, w, pl) => `${fmtNum(n)} ${n === 1 ? w : pl || w + 's'}`;
export const pct = (x) => `${Math.round((x || 0) * 100)}%`;
export const fmtDate = (d, opts) => d.toLocaleDateString(undefined, opts);
export const fmtLong = (d) => fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' });
export const fmtShort = (d) => fmtDate(d, { month: 'short', day: 'numeric' });
export const fmtMonth = (d) => fmtDate(d, { month: 'long', year: 'numeric' });
export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
export const fmtTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};
export const fmtClock = (s) => {
  s = Math.max(0, Math.ceil(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`;
};
export const compact = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));
export const relDays = (k) => {
  const n = daysBetween(startOfToday(), parseKey(k));
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${plural(n, 'day')}` : `${plural(-n, 'day')} ago`;
};
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- DOM ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const SVG_NS = 'http://www.w3.org/2000/svg';

function applyProps(n, props) {
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sv == null) continue;
        if (sk.startsWith('--')) n.style.setProperty(sk, String(sv)); else n.style[sk] = sv;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k.startsWith('--')) n.style.setProperty(k, v);
    else if (k === 'value' && 'value' in n) n.value = v;
    else if (k === 'checked' || k === 'selected') n[k] = !!v;
    else if (k.startsWith('aria-') || k.startsWith('data-')) n.setAttribute(k, String(v));
    else n.setAttribute(k, v === true ? '' : v);
  }
}
function appendKids(n, kids) {
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) n.append(c instanceof Node ? c : String(c));
}
export function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  applyProps(n, props);
  appendKids(n, kids);
  return n;
}
export function svg(tag, props, ...kids) {
  const n = document.createElementNS(SVG_NS, tag);
  applyProps(n, props);
  appendKids(n, kids);
  return n;
}

/* ---------- icons (stroke, 24px grid) ---------- */
const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  habits: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 2v4M16 2v4',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.2 13.9 7 22l5-3 5 3-1.2-8.1',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  user: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M18 6 6 18M6 6l12 12',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  down: 'M6 9l6 6 6-6',
  more: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
  play: 'M6 4l14 8-14 8z',
  archive: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6',
  flame: 'M12 22c4 0 7-3 7-7 0-3-2-6-4-8 0 2-1 4-3 4 0-3-1-6-4-9 0 4-5 7-5 13 0 4 4 7 9 7z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  sidebar: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 4v16',
  skip: 'M5 18V6l9 6zM19 6v12',
  sparkle: 'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  note: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
};
export function icon(name, size = 20, extra = {}) {
  return svg('svg', {
    viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor',
    'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'ico', ...extra,
  }, svg('path', { d: ICONS[name] || ICONS.sparkle }));
}

/* ---------- motion ---------- */
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const afterPaint = (fn) => {
  let done = false;
  const run = () => { if (!done) { done = true; fn(); } };
  requestAnimationFrame(() => requestAnimationFrame(run));
  setTimeout(run, 160); // if frames are paused (background tab), still land on the final state
};
/** Run once on the next frame, or shortly after if frames are paused. */
export const nextFrame = (fn) => {
  let done = false;
  const run = () => { if (!done) { done = true; fn(); } };
  requestAnimationFrame(run);
  setTimeout(run, 60);
};
export { afterPaint };

let cuSeq = 0;
/** Count a number from `from` to `to` with an ease-out. Writing to the node again cancels it. */
export function countUp(node, to, { from = 0, dur = 900, dec = 0, delay = 0, suffix = '', prefix = '' } = {}) {
  const id = ++cuSeq;
  node._cu = id;
  const fmt = (v) => prefix + (dec ? v.toFixed(dec) : fmtNum(Math.round(v))) + suffix;
  if (reduceMotion() || document.hidden || from === to) { node.textContent = fmt(to); return; }
  node.textContent = fmt(from);
  const t0 = performance.now() + delay;
  const step = (now) => {
    if (node._cu !== id) return;
    const p = clamp((now - t0) / dur, 0, 1);
    node.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  setTimeout(() => { if (node._cu === id) node.textContent = fmt(to); }, delay + dur + 250);
}
export const setText = (node, text) => { node._cu = null; node.textContent = text; };

export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export function downloadFile(name, content, type) {
  const a = el('a', { href: URL.createObjectURL(new Blob([content], { type })), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
}
