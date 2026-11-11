/* Reusable UI building blocks. */
import { el, icon, $, reduceMotion, countUp, setText } from './util.js';
import { categoryOf } from './store.js';

/* ---------- modal ---------- */
/** Opens a modal sheet. Returns { dialog, close }. `build(close)` returns { title, body, footer }. */
export function openModal(build, { size = '', onClose } = {}) {
  const dialog = el('dialog', { class: `modal ${size}` });
  const close = () => dialog.close();
  const { title, body, footer, subtitle } = build(close);
  dialog.append(
    el('header', { class: 'modal-head' },
      el('div', {}, el('h2', { class: 'serif' }, title), subtitle ? el('p', { class: 'muted' }, subtitle) : null),
      el('button', { type: 'button', class: 'icon-btn ghost', 'aria-label': 'Close', onclick: close }, icon('x'))),
    el('div', { class: 'modal-body' }, body),
    footer ? el('footer', { class: 'modal-foot' }, footer) : null,
  );
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  dialog.addEventListener('close', () => {
    dialog.classList.add('closing');
    setTimeout(() => dialog.remove(), reduceMotion() ? 0 : 180);
    onClose && onClose();
  });
  document.body.append(dialog);
  dialog.showModal();
  return { dialog, close };
}

export function confirmDialog(title, message, yes = 'Confirm', danger = true) {
  return new Promise((resolve) => {
    let answered = false;
    openModal((close) => ({
      title,
      body: el('p', { class: 'muted' }, message),
      footer: [
        el('button', { type: 'button', class: 'btn ghost', onclick: () => { answered = true; resolve(false); close(); } }, 'Cancel'),
        el('button', { type: 'button', class: `btn ${danger ? 'danger' : 'primary'}`, onclick: () => { answered = true; resolve(true); close(); } }, yes),
      ],
    }), { size: 'small', onClose: () => { if (!answered) resolve(false); } });
  });
}

/* ---------- toast ---------- */
let toastTimer;
export function toast(msg, action, ms) {
  let t = $('#toast');
  if (!t) { t = el('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.replaceChildren(el('span', {}, msg));
  if (action) t.append(el('button', { type: 'button', onclick: () => { action.run(); t.classList.remove('show'); } }, action.label));
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms || (action ? 5500 : 2600));
}

/* ---------- popover menu ---------- */
export function menu(anchor, items) {
  document.querySelectorAll('.popmenu').forEach((m) => m.remove());
  const m = el('div', { class: 'popmenu', role: 'menu' }, items.filter(Boolean).map((it) => el('button', {
    type: 'button', role: 'menuitem', class: it.danger ? 'danger' : '',
    onclick: (e) => { e.stopPropagation(); m.remove(); it.run(); },
  }, it.icon ? icon(it.icon, 16) : null, it.label)));
  document.body.append(m);
  const r = anchor.getBoundingClientRect();
  const mr = m.getBoundingClientRect();
  const left = Math.min(innerWidth - mr.width - 8, Math.max(8, r.right - mr.width));
  const top = r.bottom + mr.height + 8 > innerHeight ? r.top - mr.height - 6 : r.bottom + 6;
  m.style.left = `${left}px`;
  m.style.top = `${top}px`;
  const off = (e) => { if (!m.contains(e.target)) { m.remove(); removeEventListener('pointerdown', off, true); } };
  setTimeout(() => addEventListener('pointerdown', off, true), 0);
  m.querySelector('button')?.focus();
}

/* ---------- small pieces ---------- */
export const pageHead = (title, sub, ...actions) => el('header', { class: 'page-head' },
  el('div', {}, el('h1', { class: 'serif' }, title), sub ? el('p', { class: 'muted' }, sub) : null),
  actions.length ? el('div', { class: 'page-actions' }, actions) : null);

export const card = (props, ...kids) => el('section', { ...props, class: `card ${props?.class || ''}` }, ...kids);
export const cardHead = (title, ...right) => el('div', { class: 'card-head' }, el('h3', {}, title), right.length ? el('div', { class: 'card-head-right' }, right) : null);

export function emptyState({ emoji = '🌱', title, text, action }) {
  return el('div', { class: 'empty' },
    el('div', { class: 'empty-art', 'aria-hidden': 'true' }, el('span', {}, emoji)),
    el('h3', { class: 'serif' }, title), text ? el('p', { class: 'muted' }, text) : null,
    action ? el('button', { type: 'button', class: 'btn primary', onclick: action.run }, icon('plus', 16), action.label) : null);
}

export const habitIcon = (h, size = '') => el('span', { class: `habit-icon ${size}`, style: { '--c': h.color } }, h.emoji);
export const catChip = (id) => { const c = categoryOf(id); return el('span', { class: 'cat-chip', style: { '--c': c.color } }, c.name); };

/** Stat tile; returns node with .update(value) for live updates. */
export function statTile({ label, value, unit = '', sub = '', icon: ic, animate = false, delay = 0, decimals = 0 }) {
  const num = el('span', { class: 'stat-num' });
  const subEl = el('div', { class: 'stat-sub' }, sub);
  const node = el('div', { class: 'stat', style: { '--d': `${delay}ms` } },
    el('div', { class: 'stat-label' }, ic ? icon(ic, 15) : null, label),
    el('div', { class: 'stat-value' }, num, unit ? el('small', {}, unit) : null), subEl);
  let cur = null;
  node.update = (v, s, anim = false) => {
    if (typeof v === 'number') {
      if (anim) countUp(num, v, { dur: 1000, delay, dec: decimals });
      else if (cur == null) setText(num, decimals ? v.toFixed(decimals) : v.toLocaleString()); // first paint without animation: no count
      else countUp(num, v, { from: cur, dur: 450, dec: decimals });
      cur = v;
    }
    else setText(num, v ?? '—');
    if (s !== undefined) subEl.textContent = s;
  };
  node.update(value, sub, animate);
  return node;
}

/** Segmented control. */
export function segmented(options, value, onChange, label) {
  const wrap = el('div', { class: 'seg', role: 'radiogroup', 'aria-label': label });
  for (const o of options) {
    wrap.append(el('button', {
      type: 'button', role: 'radio', 'aria-checked': o.value === value,
      onclick: () => { wrap.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', 'false')); wrap.querySelector(`[data-v="${o.value}"]`).setAttribute('aria-checked', 'true'); onChange(o.value); },
      'data-v': o.value,
    }, o.label));
  }
  return wrap;
}

export const skeleton = (h = 120) => el('div', { class: 'skeleton', style: { height: `${h}px` } });

/* ---------- confetti (muted palette, short, skipped for reduced motion) ---------- */
export function confetti({ count = 90, origin } = {}) {
  if (reduceMotion() || document.hidden) return;
  const c = el('canvas', { class: 'confetti', 'aria-hidden': 'true' });
  document.body.append(c);
  const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const colors = ['#C46B4E', '#E2A98E', '#9CAF88', '#E8C98A', '#D98565', '#B9A89A'];
  const ox = origin ? origin.x : innerWidth / 2, oy = origin ? origin.y : innerHeight * 0.35;
  const parts = Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 7;
    return { x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, r: 3 + Math.random() * 4, rot: Math.random() * 6, vr: Math.random() * 0.3 - 0.15, c: colors[(Math.random() * colors.length) | 0], shape: Math.random() < 0.5 };
  });
  const t0 = performance.now();
  const frame = (now) => {
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.28; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t / 1.9); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.shape) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 1.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (t < 1.9) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
  setTimeout(() => c.remove(), 2600);
}
