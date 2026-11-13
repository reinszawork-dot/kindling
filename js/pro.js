/* Kindling Pro: habit packs, challenges, accent colours and the lifetime report. Free for everyone. */
import { state, save, active, byId, addHabit } from './store.js';
import { el, icon, keyOf, parseKey, addDays, startOfToday, todayKey, fmtDate, fmtNum, pct, plural, uid } from './util.js';
import { dayStatus, isDue, streakInfo, rangeStats, isWeekly } from './stats.js';
import { openModal, card, cardHead, toast, confetti, habitIcon } from './ui.js';

// No payments: everything is unlocked. Same calls as before so the rest of the app is unchanged.
const NWP = { isPro: () => true, gate: (_name, fn) => fn && fn(), open() {} };
export const isPro = () => NWP.isPro();
export const gate = (name, fn) => NWP.gate(name, fn);
export const openPro = () => NWP.open();
/** Small "Pro" badge for gated controls; hidden once Pro is unlocked. */
export const proBadge = () => (isPro() ? null : el('span', { class: 'pro-badge' }, 'Pro'));
// Repaint the current page (and the accent) when Pro is unlocked or removed.
addEventListener('nextwave-pro-change', () => save({ pro: true }));

/* ---------- accent colours ---------- */
export const ACCENTS = [
  { id: '', name: 'Terracotta', sw: '#C46B4E' },
  { id: 'sage', name: 'Sage', sw: '#6F8A6A' },
  { id: 'ocean', name: 'Ocean', sw: '#4F7F8A' },
  { id: 'slate', name: 'Slate', sw: '#5F7086' },
  { id: 'plum', name: 'Plum', sw: '#8A6A9E' },
  { id: 'rose', name: 'Rose', sw: '#B0606F' },
  { id: 'ochre', name: 'Ochre', sw: '#B5853A' },
];
export function applyAccent() {
  const a = isPro() ? state.settings.accent : '';
  if (a) document.documentElement.dataset.accent = a; else delete document.documentElement.dataset.accent;
}

/* ---------- habit packs ---------- */
const WEEKDAYS = { type: 'days', days: [1, 2, 3, 4, 5] };
export const PACKS = [
  { id: 'mornings', name: 'Calm mornings', emoji: '☀️', desc: 'Start the day slowly and on purpose.', habits: [
    { name: 'Water on waking', emoji: '💧', color: '#5E8C86', section: 'morning', category: 'health' },
    { name: 'Stretch', emoji: '🤸', color: '#7F9A7A', target: 10, timer: true, section: 'morning', category: 'fitness' },
    { name: 'Meditate', emoji: '🧘', color: '#8C7AA8', target: 5, timer: true, section: 'morning', category: 'mindset' },
    { name: 'Plan the day', emoji: '🗓️', color: '#8F8478', section: 'morning', category: 'productivity' },
  ] },
  { id: 'sleep', name: 'Sleep reset', emoji: '🛏️', desc: 'Wind down earlier and wake up rested.', habits: [
    { name: 'No phone in bed', emoji: '📵', color: '#6F8AA3', kind: 'quit', section: 'evening', category: 'mindset' },
    { name: 'No caffeine after 2pm', emoji: '☕', color: '#8F8478', kind: 'quit', category: 'health' },
    { name: 'Read before bed', emoji: '📚', color: '#C99A4E', target: 10, unit: 'pages', section: 'evening', category: 'growth' },
    { name: 'Lights out on time', emoji: '😴', color: '#8C7AA8', section: 'evening', category: 'health' },
  ] },
  { id: 'fit', name: 'Fit in 30', emoji: '💪', desc: 'Simple movement and fuel, every day.', habits: [
    { name: '10k steps', emoji: '🚶', color: '#9A9A5B', target: 10000, unit: 'steps', category: 'fitness' },
    { name: 'Strength training', emoji: '🏋️', color: '#C46B4E', freq: { type: 'weekly', times: 3 }, category: 'fitness' },
    { name: 'Veg with every meal', emoji: '🥗', color: '#7F9A7A', target: 3, unit: 'meals', category: 'health' },
    { name: 'Drink water', emoji: '💧', color: '#5E8C86', target: 8, unit: 'glasses', category: 'health' },
  ] },
  { id: 'focus', name: 'Deep focus', emoji: '🎯', desc: 'Protect your best hours for real work.', habits: [
    { name: 'Deep work', emoji: '💻', color: '#6F8AA3', target: 90, timer: true, section: 'morning', freq: WEEKDAYS, category: 'productivity' },
    { name: 'Phone in another room', emoji: '📱', color: '#8C7AA8', section: 'morning', freq: WEEKDAYS, category: 'productivity' },
    { name: 'Clear the desk', emoji: '🧹', color: '#8F8478', section: 'evening', freq: WEEKDAYS, category: 'productivity' },
    { name: 'Plan tomorrow', emoji: '🗓️', color: '#8F8478', section: 'evening', freq: WEEKDAYS, category: 'productivity' },
  ] },
  { id: 'money', name: 'Money mindful', emoji: '💰', desc: 'Small daily habits that add up in rand.', habits: [
    { name: 'Log what I spent', emoji: '💰', color: '#C99A4E', section: 'evening', category: 'productivity' },
    { name: 'No takeaways', emoji: '🍔', color: '#D08C60', kind: 'quit', category: 'health' },
    { name: 'Coffee from home', emoji: '☕', color: '#8F8478', section: 'morning', freq: WEEKDAYS, category: 'other' },
    { name: 'Check the budget', emoji: '🗓️', color: '#6F8AA3', freq: { type: 'weekly', times: 1 }, category: 'productivity' },
  ] },
  { id: 'kind', name: 'Kind to yourself', emoji: '🌱', desc: 'Gratitude, people and fresh air.', habits: [
    { name: 'Gratitude', emoji: '🙏', color: '#C99A4E', target: 3, unit: 'things', section: 'evening', category: 'mindset' },
    { name: 'Journal', emoji: '✍️', color: '#B87383', section: 'evening', category: 'mindset' },
    { name: 'Message a friend', emoji: '📞', color: '#5E8C86', freq: { type: 'weekly', times: 2 }, category: 'growth' },
    { name: 'Time outside', emoji: '🌱', color: '#7F9A7A', target: 15, timer: true, category: 'health' },
  ] },
];

export function openPacks() {
  const have = new Set(active().map((h) => h.name.toLowerCase()));
  openModal((close) => ({
    title: 'Habit packs',
    subtitle: 'A whole routine in one tap. Habits you already track are skipped, and you can edit any of them after.',
    body: el('div', { class: 'pack-grid' }, PACKS.map((p) => {
      const fresh = p.habits.filter((h) => !have.has(h.name.toLowerCase()));
      return el('div', { class: 'pack' },
        el('div', { class: 'pack-top' }, el('span', { class: 'pack-emoji' }, p.emoji), el('div', {}, el('b', {}, p.name), el('p', { class: 'muted small' }, p.desc))),
        el('ul', { class: 'pack-list' }, p.habits.map((h) => el('li', { class: have.has(h.name.toLowerCase()) ? 'have' : '' }, el('span', {}, h.emoji), h.name))),
        el('button', { type: 'button', class: 'btn sm' + (fresh.length ? ' primary' : ''), disabled: !fresh.length, onclick: () => {
          fresh.forEach((h) => addHabit(h));
          close();
          toast(`${p.name}: ${plural(fresh.length, 'habit')} added`);
        } }, fresh.length ? `Add ${plural(fresh.length, 'habit')}` : 'Already added'));
    })),
  }), { size: 'wide' });
}

/* ---------- challenges ---------- */
const challenges = () => (Array.isArray(state.challenges) ? state.challenges : (state.challenges = []));
export function challengeProgress(c) {
  const h = byId(c.habit);
  const start = parseKey(c.start), end = addDays(start, c.days - 1), t = startOfToday();
  let hits = 0, due = 0, dueSoFar = 0;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    if (!h || !isDue(h, d)) continue;
    due++;
    if (d <= t) { dueSoFar++; if (dayStatus(h, d) === 'on') hits++; }
  }
  if (h && isWeekly(h)) due = Math.round((c.days / 7) * h.freq.times); // weekly habits: times per week over the run
  const day = Math.min(c.days, Math.max(1, Math.round((t - start) / 864e5) + 1));
  return { h, hits, due: Math.max(1, due), dueSoFar, day, over: t > end, end };
}

export function challengesCard() {
  const list = challenges().filter((c) => byId(c.habit));
  const startBtn = el('button', { type: 'button', class: 'btn sm', onclick: () => gate('Challenges', openChallengeStart) }, icon('plus', 14), 'Start a challenge', proBadge());
  if (!list.length) {
    return card({ class: 'challenge-card' }, cardHead('Challenges', startBtn),
      el('p', { class: 'muted small' }, 'Commit to one habit for 21, 30 or 66 days and watch the run build. Great for making a new habit stick.'));
  }
  return card({ class: 'challenge-card' }, cardHead('Challenges', startBtn),
    el('ul', { class: 'challenge-list' }, list.map((c) => {
      const p = challengeProgress(c);
      const done = p.hits >= p.due;
      // Celebrate once; save after this render finishes so the page isn't rebuilt mid-mount.
      if (done && !c.doneAt) { c.doneAt = todayKey(); setTimeout(() => { save({}); confetti({ count: 110 }); toast(`${p.h.emoji} ${c.days}-day challenge complete!`); }, 300); }
      return el('li', {},
        habitIcon(p.h),
        el('div', { class: 'grow' },
          el('div', { class: 'ch-top' }, el('b', {}, `${p.h.name} · ${c.days} days`),
            el('span', { class: `pill ${done ? 'good' : p.over ? 'warn' : ''}` }, done ? 'Complete' : p.over ? 'Finished' : `Day ${p.day} of ${c.days}`)),
          el('span', { class: 'progress-bar' }, el('i', { style: { width: `${Math.min(1, p.hits / p.due) * 100}%`, background: p.h.color } })),
          el('small', { class: 'muted' }, `${p.hits} of ${p.due} done${p.over || done ? '' : ` · ends ${fmtDate(p.end, { month: 'short', day: 'numeric' })}`}`)),
        el('button', { type: 'button', class: 'icon-btn ghost', 'aria-label': `Remove ${p.h.name} challenge`, onclick: () => {
          state.challenges = challenges().filter((x) => x.id !== c.id); save({}); toast('Challenge removed');
        } }, icon('x', 16)));
    })));
}

function openChallengeStart() {
  const habits = active();
  if (!habits.length) { toast('Add a habit first, then challenge yourself with it'); return; }
  let habit = habits[0].id, days = 30;
  openModal((close) => ({
    title: 'Start a challenge',
    subtitle: 'Pick a habit and a length. Days count from today.',
    body: el('div', { class: 'editor' },
      el('label', { class: 'field-label', for: 'chHabit' }, 'Habit'),
      el('select', { id: 'chHabit', class: 'input select', onchange: (e) => { habit = e.target.value; } }, habits.map((h) => el('option', { value: h.id }, `${h.emoji} ${h.name}`))),
      el('label', { class: 'field-label', style: { marginTop: '14px' } }, 'Length'),
      el('div', { class: 'chips' }, [21, 30, 66].map((n) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(n === days), onclick: (e) => {
        days = n; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      } }, `${n} days`))),
      el('p', { class: 'muted small', style: { marginTop: '12px' } }, '21 days to start, 30 to settle in, 66 days is about how long a habit takes to feel automatic.')),
    footer: [
      el('button', { type: 'button', class: 'btn ghost', onclick: close }, 'Cancel'),
      el('button', { type: 'button', class: 'btn primary', onclick: () => {
        challenges().push({ id: uid(), habit, days, start: todayKey(), doneAt: null });
        save({}); close(); toast(`${days}-day challenge started. You've got this.`);
      } }, 'Start challenge'),
    ],
  }), { size: 'small' });
}

/* ---------- lifetime report ---------- */
export function openLifetime() {
  const habits = state.habits;
  if (!habits.length) { toast('Track a habit for a while to build your lifetime report'); return; }
  const first = habits.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), habits[0].createdAt);
  const t = startOfToday();
  const months = [];
  for (let s = new Date(parseKey(first).getFullYear(), parseKey(first).getMonth(), 1); s <= t; s = new Date(s.getFullYear(), s.getMonth() + 1, 1)) {
    const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
    const r = rangeStats({ start: s, end: e, startK: keyOf(s), endK: keyOf(e) });
    months.push({ s, r });
  }
  const years = {};
  months.forEach(({ s, r }) => { const y = (years[s.getFullYear()] = years[s.getFullYear()] || { done: 0, total: 0, perfect: 0 }); y.done += r.done; y.total += r.total; y.perfect += r.perfect; });
  const done = months.reduce((a, m) => a + m.r.done, 0), total = months.reduce((a, m) => a + m.r.total, 0);
  const perfect = months.reduce((a, m) => a + m.r.perfect, 0);
  const activeDays = months.reduce((a, m) => a + m.r.activeDays, 0);
  const rated = months.filter((m) => m.r.rate != null);
  const best = rated.reduce((b, m) => (!b || m.r.rate > b.r.rate ? m : b), null);
  const daysSince = Math.round((t - parseKey(first)) / 864e5) + 1;
  const streaks = habits.map((h) => ({ h, ...streakInfo(h) })).sort((a, b) => b.best - a.best).slice(0, 8);
  const stat = (label, value) => el('div', { class: 'lt-stat' }, el('b', {}, value), el('span', {}, label));

  openModal(() => ({
    title: 'Lifetime report',
    subtitle: `Since ${fmtDate(parseKey(first), { day: 'numeric', month: 'long', year: 'numeric' })} · ${plural(daysSince, 'day')}`,
    body: el('div', { class: 'lifetime' },
      el('div', { class: 'lt-stats' },
        stat('habits completed', fmtNum(done)), stat('overall completion', total ? pct(done / total) : '—'),
        stat('perfect days', fmtNum(perfect)), stat('days with habits', fmtNum(activeDays))),
      el('h3', { class: 'lt-h' }, 'Every month'),
      el('div', { class: 'lt-months' }, months.map(({ s, r }) => el('div', { class: 'lt-month', title: `${fmtDate(s, { month: 'long', year: 'numeric' })}: ${r.rate == null ? 'no data' : pct(r.rate)} · ${r.done} done` },
        el('span', { class: 'lt-bar' }, el('i', { style: { height: `${r.rate == null ? 2 : Math.max(4, r.rate * 100)}%` } })),
        el('small', {}, fmtDate(s, { month: 'short' }).slice(0, 3))))),
      best ? el('p', { class: 'muted small' }, `Best month: ${fmtDate(best.s, { month: 'long', year: 'numeric' })} at ${pct(best.r.rate)}.`) : null,
      Object.keys(years).length > 1 ? el('div', {}, el('h3', { class: 'lt-h' }, 'By year'),
        el('table', { class: 'lt-table' }, el('tbody', {}, Object.entries(years).map(([y, v]) => el('tr', {}, el('td', {}, y), el('td', {}, v.total ? pct(v.done / v.total) : '—'), el('td', {}, `${fmtNum(v.done)} done`), el('td', {}, `${v.perfect} perfect`)))))) : null,
      el('h3', { class: 'lt-h' }, 'Longest runs ever'),
      el('ul', { class: 'lt-streaks' }, streaks.map(({ h, best: b, unit }) => el('li', {}, habitIcon(h), el('span', { class: 'grow' }, h.name, h.archived ? el('span', { class: 'tag' }, 'Archived') : null), el('b', {}, plural(b, h.kind === 'quit' ? 'clean day' : unit)))))),
  }), { size: 'wide' });
}
