/* Lightweight SVG/HTML charts with entrance animation, shared tooltips and responsive redraw. */
import { el, svg, afterPaint, reduceMotion, clamp, uid, DOW, fmtDate } from './util.js';

/* ---------- tooltip ---------- */
let tipEl = null;
function tipNode() {
  if (!tipEl) { tipEl = el('div', { class: 'chart-tip', role: 'tooltip' }); document.body.append(tipEl); }
  return tipEl;
}
export function showTip(x, y, ...content) {
  const t = tipNode();
  t.replaceChildren(...content.flat().filter(Boolean));
  t.classList.add('show');
  const r = t.getBoundingClientRect();
  let left = x - r.width / 2;
  let top = y - r.height - 12;
  left = clamp(left, 8, innerWidth - r.width - 8);
  if (top < 8) top = y + 16;
  t.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}
export function hideTip() { if (tipEl) tipEl.classList.remove('show'); }
addEventListener('scroll', hideTip, { passive: true, capture: true });
const tipAt = (e, content) => showTip(e.clientX, e.clientY, content);
export const tipRow = (label, value, color) => el('div', { class: 'tip-row' },
  color ? el('i', { style: { background: color } }) : null, el('span', {}, label), el('b', {}, value));
export const tipTitle = (t) => el('div', { class: 'tip-title' }, t);

/* ---------- responsive mounting ---------- */
const observers = new Set();
/** Draw into host at its current width; redraw (without animation) when the width changes. */
export function responsive(host, draw, animate = false) {
  let lastW = 0;
  let pendingAnim = animate;
  const render = (anim) => {
    const w = Math.round(host.clientWidth);
    if (!w) return false;
    lastW = w;
    host.replaceChildren(draw(w, anim && !reduceMotion()));
    return true;
  };
  const ro = new ResizeObserver(() => {
    const w = Math.round(host.clientWidth);
    if (!w || w === lastW) return;
    render(pendingAnim);
    pendingAnim = false;
  });
  ro.observe(host);
  observers.add(ro);
  if (render(pendingAnim)) pendingAnim = false;
  return { redraw: (anim = false) => { if (!render(anim)) pendingAnim = anim; } };
}
export function disposeCharts() { for (const ro of observers) ro.disconnect(); observers.clear(); hideTip(); }

const pctLabel = (v) => `${Math.round(v * 100)}%`;

/* ---------- grouped bar chart (current vs comparison) ---------- */
export function barChart(w, animate, { data, height = 220, compare = true, showValues = true }) {
  const padL = 34, padR = 6, padT = 22, padB = 28;
  const iw = w - padL - padR, ih = height - padT - padB;
  const n = data.length;
  const band = iw / n;
  const groupW = Math.min(compare ? 52 : 36, band * 0.7);
  const bw = compare ? groupW / 2 - 2 : groupW;
  const root = svg('svg', { width: w, height, viewBox: `0 0 ${w} ${height}`, class: 'chart bar-chart', role: 'img' });
  for (const g of [0, 0.5, 1]) {
    const y = padT + ih - g * ih;
    root.append(svg('line', { x1: padL, x2: w - padR, y1: y, y2: y, class: g ? 'grid' : 'grid base' }),
      svg('text', { x: padL - 8, y: y + 4, class: 'axis', 'text-anchor': 'end' }, pctLabel(g)));
  }
  data.forEach((d, i) => {
    const cx = padL + band * i + band / 2;
    const hover = svg('rect', { x: padL + band * i + 2, y: padT - 6, width: band - 4, height: ih + 6, rx: 10, class: 'band' });
    const g = svg('g', { class: 'bar-group' }, hover);
    const bar = (v, x, cls, delay) => {
      if (v == null) return svg('rect', { x, y: padT + ih - 2, width: bw, height: 2, rx: 1, class: 'bar-empty' });
      const hgt = Math.max(3, v * ih);
      const r = svg('rect', { x, y: padT + ih - hgt, width: bw, height: hgt, rx: Math.min(6, bw / 2), class: `bar-rect ${cls}` });
      if (animate) { r.style.transform = 'scaleY(0)'; r.style.transitionDelay = `${delay}ms`; afterPaint(() => { r.style.transform = ''; }); }
      return r;
    };
    if (compare) g.append(bar(d.ghost, cx - groupW / 2, 'ghost', 80 + i * 55));
    g.append(bar(d.value, compare ? cx + 2 : cx - bw / 2, d.highlight ? 'cur hl' : 'cur', 120 + i * 55));
    if (showValues && d.value != null) {
      const t = svg('text', { x: compare ? cx + 2 + bw / 2 : cx, y: padT + ih - Math.max(3, d.value * ih) - 6, class: 'bar-val', 'text-anchor': 'middle' }, pctLabel(d.value));
      if (animate) { t.style.opacity = '0'; t.style.transitionDelay = `${500 + i * 55}ms`; afterPaint(() => { t.style.opacity = ''; }); }
      g.append(t);
    }
    g.append(svg('text', { x: cx, y: height - 8, class: 'axis x' + (d.highlight ? ' strong' : ''), 'text-anchor': 'middle' }, d.label));
    g.addEventListener('pointermove', (e) => tipAt(e, d.tip()));
    g.addEventListener('pointerleave', hideTip);
    root.append(g);
  });
  return root;
}

/* ---------- smooth line chart ---------- */
function smoothPath(pts) {
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  let dPath = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const t = 0.18;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    dPath += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return dPath;
}
export function lineChart(w, animate, { points, avg = null, best = null, worst = null, height = 230, labelEvery = 1 }) {
  const padL = 34, padR = 12, padT = 18, padB = 28;
  const iw = w - padL - padR, ih = height - padT - padB;
  const n = points.length;
  const x = (i) => padL + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = (v) => padT + ih - clamp(v, 0, 1) * ih;
  const id = 'g' + uid();
  const root = svg('svg', { width: w, height, viewBox: `0 0 ${w} ${height}`, class: 'chart line-chart', role: 'img' },
    svg('defs', {}, svg('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 },
      svg('stop', { offset: '0%', class: 'area-top' }), svg('stop', { offset: '100%', class: 'area-bottom' }))));
  for (const g of [0, 0.5, 1]) {
    root.append(svg('line', { x1: padL, x2: w - padR, y1: y(g), y2: y(g), class: g ? 'grid' : 'grid base' }),
      svg('text', { x: padL - 8, y: y(g) + 4, class: 'axis', 'text-anchor': 'end' }, pctLabel(g)));
  }
  points.forEach((p, i) => {
    if (i % labelEvery === 0 || i === n - 1) root.append(svg('text', { x: x(i), y: height - 8, class: 'axis x', 'text-anchor': 'middle' }, p.label));
  });
  // split into continuous segments (gaps where value is null)
  const segs = [];
  let cur = [];
  points.forEach((p, i) => { if (p.value == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push([x(i), y(p.value)]); });
  if (cur.length) segs.push(cur);
  for (const s of segs) {
    const line = smoothPath(s);
    const area = svg('path', { d: `${line} L${s[s.length - 1][0]},${padT + ih} L${s[0][0]},${padT + ih} Z`, fill: `url(#${id})`, class: 'area' });
    const path = svg('path', { d: line, class: 'line', pathLength: 1 });
    if (animate) {
      path.style.strokeDasharray = '1'; path.style.strokeDashoffset = '1';
      area.style.opacity = '0';
      afterPaint(() => { path.style.strokeDashoffset = '0'; area.style.opacity = ''; });
    }
    root.append(area, path);
  }
  if (avg != null) {
    root.append(svg('line', { x1: padL, x2: w - padR, y1: y(avg), y2: y(avg), class: 'avg-line' }),
      svg('text', { x: w - padR, y: y(avg) - 6, class: 'avg-label', 'text-anchor': 'end' }, `avg ${pctLabel(avg)}`));
  }
  const marker = (i, cls, label) => {
    if (i == null || points[i]?.value == null) return;
    const m = svg('g', { class: `marker ${cls}` },
      svg('circle', { cx: x(i), cy: y(points[i].value), r: 5 }),
      svg('text', { x: x(i), y: y(points[i].value) + (cls === 'best' ? -12 : 20), 'text-anchor': 'middle' }, label));
    if (animate) { m.style.opacity = '0'; m.style.transitionDelay = '900ms'; afterPaint(() => { m.style.opacity = ''; }); }
    root.append(m);
  };
  marker(best, 'best', 'best');
  if (worst !== best) marker(worst, 'worst', 'low');
  // hover crosshair
  const cross = svg('line', { y1: padT, y2: padT + ih, class: 'cross' });
  const dot = svg('circle', { r: 5, class: 'hover-dot' });
  const hoverG = svg('g', { class: 'hover', style: { opacity: 0 } }, cross, dot);
  const overlay = svg('rect', { x: padL, y: padT, width: iw, height: ih, class: 'overlay' });
  overlay.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    const i = clamp(Math.round(((e.clientX - r.left - padL) / iw) * (n - 1)), 0, n - 1);
    const p = points[i];
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
    if (p.value != null) { dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(p.value)); dot.style.display = ''; } else dot.style.display = 'none';
    hoverG.style.opacity = 1;
    showTip(r.left + x(i), r.top + (p.value != null ? y(p.value) : padT + ih / 2), p.tip());
  });
  overlay.addEventListener('pointerleave', () => { hoverG.style.opacity = 0; hideTip(); });
  root.append(hoverG, overlay);
  return root;
}

/* ---------- horizontal bars (HTML) ---------- */
export function hbars(rows, { animate = false, onSelect, selected } = {}) {
  const list = el('div', { class: 'hbars' });
  rows.forEach((r, i) => {
    const fill = el('i', { style: { width: animate ? '0%' : `${r.value * 100}%`, background: r.color, transitionDelay: `${150 + i * 70}ms` } });
    if (animate) afterPaint(() => { fill.style.width = `${r.value * 100}%`; });
    list.append(el('button', {
      type: 'button', class: 'hbar' + (selected === r.id ? ' on' : '') + (selected && selected !== r.id ? ' dim' : ''),
      'aria-pressed': selected === r.id, onclick: () => onSelect && onSelect(r.id),
      onpointermove: (e) => r.tip && tipAt(e, r.tip()), onpointerleave: hideTip,
    },
    el('span', { class: 'hb-label' }, el('span', { class: 'hb-emoji' }, r.emoji), el('span', { class: 'hb-name' }, r.name)),
    el('span', { class: 'hb-track' }, fill),
    el('span', { class: 'hb-val' }, pctLabel(r.value))));
  });
  return list;
}

/* ---------- donut ---------- */
export function donut(size, animate, { segments, center, sub, onHover }) {
  const stroke = Math.max(14, size * 0.12);
  const r = (size - stroke) / 2 - 4;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const gap = segments.length > 1 ? 3 : 0;
  const root = svg('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, class: 'chart donut' },
    svg('circle', { cx: size / 2, cy: size / 2, r, class: 'donut-track', 'stroke-width': stroke }));
  let acc = 0;
  segments.forEach((s, i) => {
    const len = Math.max(0, (s.value / total) * C - gap);
    const c = svg('circle', {
      cx: size / 2, cy: size / 2, r, class: 'donut-seg', stroke: s.color, 'stroke-width': stroke,
      'stroke-dasharray': `${len} ${C - len}`, 'stroke-dashoffset': -acc, transform: `rotate(-90 ${size / 2} ${size / 2})`,
    });
    if (animate) { c.setAttribute('stroke-dasharray', `0 ${C}`); c.style.transitionDelay = `${150 + i * 120}ms`; afterPaint(() => c.setAttribute('stroke-dasharray', `${len} ${C - len}`)); }
    c.addEventListener('pointermove', (e) => { tipAt(e, s.tip()); onHover && onHover(s.id); });
    c.addEventListener('pointerleave', () => { hideTip(); onHover && onHover(null); });
    root.append(c);
    acc += (s.value / total) * C;
  });
  return el('div', { class: 'donut-wrap', style: { width: `${size}px`, height: `${size}px` } }, root,
    el('div', { class: 'donut-center' }, el('b', {}, center), el('span', {}, sub)));
}

/* ---------- progress ring (persistent, updates smoothly) ---------- */
export function ring(size = 120, stroke = 10, cls = '') {
  const r = (size - stroke) / 2;
  const fill = svg('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-fill', 'stroke-width': stroke, pathLength: 100, 'stroke-dasharray': 100, 'stroke-dashoffset': 100 });
  const node = svg('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, class: `ring ${cls}`, 'aria-hidden': 'true' },
    svg('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-track', 'stroke-width': stroke }), fill);
  return {
    node,
    set(p, animateFromZero = false) {
      const target = String(100 - clamp(p, 0, 1) * 100);
      if (animateFromZero && !reduceMotion()) {
        fill.style.transition = 'none';
        fill.setAttribute('stroke-dashoffset', '100');
        fill.getBoundingClientRect();
        fill.style.transition = '';
        afterPaint(() => fill.setAttribute('stroke-dashoffset', target));
      } else fill.setAttribute('stroke-dashoffset', target);
    },
  };
}

/* ---------- heatmap ---------- */
export function heatmap(w, animate, { cells, max, weekStart, tip }) {
  const weeks = Math.ceil(cells.length / 7);
  const gap = 3;
  const labelW = 26;
  const cell = clamp(Math.floor((w - labelW) / weeks) - gap, 7, 15);
  const wrap = el('div', { class: 'heat' + (animate ? ' animate' : ''), style: { '--cell': `${cell}px`, '--gap': `${gap}px` } });
  const months = el('div', { class: 'heat-months', style: { paddingLeft: `${labelW}px` } });
  let lastM = -1;
  for (let c = 0; c < weeks; c++) {
    const d = cells[c * 7].d;
    const m = d.getMonth();
    months.append(el('span', {}, m !== lastM && d.getDate() <= 7 ? fmtDate(d, { month: 'short' }) : ''));
    if (m !== lastM && d.getDate() <= 7) lastM = m;
  }
  const days = el('div', { class: 'heat-dows' }, [0, 1, 2, 3, 4, 5, 6].map((i) => el('span', {}, i % 2 ? DOW[(weekStart + i) % 7].slice(0, 3) : '')));
  const grid = el('div', { class: 'heat-grid' });
  cells.forEach((c, i) => {
    if (c.future) { grid.append(el('i', { class: 'fut' })); return; }
    const ratio = max ? c.done / max : 0;
    const lvl = !c.total ? 'na' : !c.done ? 'l0' : ratio <= 0.25 ? 'l1' : ratio <= 0.5 ? 'l2' : ratio <= 0.75 ? 'l3' : 'l4';
    grid.append(el('i', {
      class: lvl, '--d': `${Math.floor(i / 7) * 10}ms`,
      onpointermove: (e) => tipAt(e, tip(c)), onpointerleave: hideTip,
    }));
  });
  wrap.append(months, el('div', { class: 'heat-body' }, days, grid));
  return wrap;
}

/* ---------- sparkline ---------- */
export function sparkline(values, w = 84, h = 26, color) {
  const pts = values.map((v, i) => [2 + (i * (w - 4)) / Math.max(1, values.length - 1), h - 3 - clamp(v ?? 0, 0, 1) * (h - 6)]);
  return svg('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, class: 'spark', 'aria-hidden': 'true' },
    svg('path', { d: smoothPath(pts), style: { stroke: color } }));
}
