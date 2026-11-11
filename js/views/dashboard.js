/* Dashboard: greeting, daily progress, today's checklist, stats overview, goals, this week. */
import { state, active, setMood } from '../store.js';
import { QUOTES, SECTIONS, MOODS, TEMPLATES } from '../data.js';
import {
  el, icon, todayKey, startOfToday, parseKey, keyOf, addDays, fmtLong, fmtShort, fmtDate, daysBetween, weekStartOf,
  DOW, countUp, setText, plural, pct, nextFrame,
} from '../util.js';
import { dayProgress, isDue, inProgress, isDone, overview, missedYesterday, goalProgress, rangeStats, rangeFor, ws, perfectStats } from '../stats.js';
import { ring, barChart, tipTitle, tipRow } from '../charts.js';
import { card, cardHead, statTile, emptyState } from '../ui.js';
import { habitRow } from '../habitrow.js';
import { openHabitEditor } from '../editor.js';
import { addHabit, normHabit } from '../store.js';
import { bellButton, avatarEl } from '../shell.js';

let selectedKey = todayKey();
let weekOffset = 0;
const expanded = new Set();

const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const quoteOfDay = () => QUOTES[((daysBetween(new Date(2024, 0, 1), startOfToday()) % QUOTES.length) + QUOTES.length) % QUOTES.length];
const firstName = () => (state.profile.name || '').trim().split(/\s+/)[0];

function header() {
  return el('header', { class: 'dash-head' },
    el('div', { class: 'dash-hello' },
      el('p', { class: 'eyebrow' }, fmtLong(startOfToday())),
      el('h1', { class: 'serif' }, `${greeting()}${firstName() ? `, ${firstName()}` : ''}`),
      el('p', { class: 'quote' }, quoteOfDay())),
    el('div', { class: 'dash-tools' }, bellButton(),
      el('a', { href: '#/settings', class: 'avatar-link', 'aria-label': 'Profile and settings' }, avatarEl(42))));
}

function weekStrip() {
  const today = startOfToday();
  const start = addDays(weekStartOf(today, ws()), weekOffset * 7);
  return el('div', { class: 'week' },
    el('button', { type: 'button', class: 'icon-btn ghost sm', 'aria-label': 'Previous week', onclick: () => { weekOffset--; refresh(); } }, icon('left', 18)),
    el('div', { class: 'week-days' }, Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      const k = keyOf(d);
      const p = d > today ? { done: 0, total: 0, pct: 0 } : dayProgress(d);
      return el('button', {
        type: 'button', class: 'wday' + (k === selectedKey ? ' sel' : '') + (k === todayKey() ? ' today' : '') + (p.total && p.done === p.total ? ' full' : ''),
        disabled: d > today, style: { '--p': Math.round(p.pct * 100), '--d': `${i * 45}ms` },
        'aria-label': `${fmtLong(d)}: ${p.done} of ${p.total} done`, 'aria-pressed': k === selectedKey,
        onclick: () => { selectedKey = k; refresh(); },
      }, el('span', { class: 'wd' }, DOW[d.getDay()].slice(0, 1)), el('span', { class: 'wn' }, el('span', {}, d.getDate())));
    })),
    el('button', { type: 'button', class: 'icon-btn ghost sm', 'aria-label': 'Next week', disabled: weekOffset >= 0, onclick: () => { weekOffset++; refresh(); } }, icon('right', 18)));
}

function progressCard(animate) {
  const r = ring(176, 14, 'big');
  const pctEl = el('span', { class: 'ring-pct' });
  const countEl = el('span', { class: 'ring-count' });
  const title = el('h2', { class: 'serif' });
  const msg = el('p', { class: 'muted' });
  const pills = el('div', { class: 'pills' });
  const strip = el('div', { class: 'strip-slot' });
  const moods = el('div', { class: 'moods', role: 'radiogroup', 'aria-label': 'Mood' });
  const node = card({ class: 'progress-card' },
    el('div', { class: 'progress-main' },
      el('div', { class: 'ring-wrap' }, r.node, el('div', { class: 'ring-label' }, pctEl, countEl)),
      el('div', { class: 'progress-text' }, title, msg, pills)),
    strip,
    el('div', { class: 'mood-row' }, el('span', { class: 'muted small' }, 'How are you feeling?'), moods));
  let lastPct = 0;
  const paint = (anim) => {
    const d = parseKey(selectedKey);
    const p = dayProgress(d);
    const isToday = selectedKey === todayKey();
    r.set(p.pct, anim);
    const v = Math.round(p.pct * 100);
    if (anim) countUp(pctEl, v, { suffix: '%', dur: 1100 }); else countUp(pctEl, v, { from: lastPct, suffix: '%', dur: 500 });
    lastPct = v;
    setText(countEl, 'completed');
    const left = p.total - p.done;
    title.textContent = !p.total ? 'A rest day' : p.done === p.total ? (isToday ? 'Everything done. Lovely.' : 'A perfect day') : `${p.done} of ${p.total} habits completed`;
    msg.textContent = !p.total ? `Nothing scheduled ${isToday ? 'today' : 'this day'}. Rest is part of the rhythm.`
      : p.done === p.total ? (isToday ? 'Enjoy the rest of your day.' : `Every habit done on ${fmtShort(d)}.`)
        : `${plural(left, 'habit')} remaining${isToday ? ' today' : ''}.`;
    pills.replaceChildren(
      el('span', { class: 'pill' }, icon('check', 13), `${p.done} done`),
      el('span', { class: 'pill' }, icon('clock', 13), `${Math.max(0, left)} to go`),
      el('span', { class: 'pill accent' }, icon('sparkle', 13), `${overviewStreak()} perfect-day streak`));
    strip.replaceChildren(weekStrip());
    strip.firstChild.classList.toggle('animate', !!anim);
    const cur = state.mood[selectedKey];
    moods.replaceChildren(...MOODS.map((m) => el('button', {
      type: 'button', class: 'mood', role: 'radio', 'aria-checked': cur === m.v, title: m.l, 'aria-label': m.l,
      onclick: () => setMood(selectedKey, m.v),
    }, m.e)));
  };
  return { node, paint };
}
const overviewStreak = () => perfectStats().streak;

function checklist() {
  const list = el('div', { class: 'sections' });
  const headTitle = el('h3', {});
  const back = el('button', { type: 'button', class: 'link-btn', onclick: () => { selectedKey = todayKey(); weekOffset = 0; refresh(); } }, 'Back to today');
  const nudge = el('p', { class: 'nudge', hidden: true });
  const node = card({ class: 'checklist' },
    el('div', { class: 'card-head' }, headTitle, el('div', { class: 'card-head-right' }, back,
      el('button', { type: 'button', class: 'btn sm primary', onclick: () => openHabitEditor() }, icon('plus', 15), 'Add habit'))),
    nudge, list);
  const paint = (anim) => {
    const d = parseKey(selectedKey);
    const isToday = selectedKey === todayKey();
    headTitle.textContent = isToday ? 'Today’s habits' : selectedKey === keyOf(addDays(startOfToday(), -1)) ? 'Yesterday’s habits' : fmtDate(d, { weekday: 'long', month: 'short', day: 'numeric' });
    back.hidden = isToday;
    const missed = isToday ? active().filter(missedYesterday) : [];
    nudge.hidden = !missed.length;
    nudge.textContent = missed.length === 1
      ? `Never miss twice: ${missed[0].emoji} ${missed[0].name} slipped yesterday. Fit it in today and your momentum comes right back.`
      : `Never miss twice: ${missed.map((h) => h.emoji).join(' ')} slipped yesterday. Fit them in today.`;
    const shown = active().filter((h) => isDue(h, d));
    const useHeads = shown.some((h) => h.section !== 'anytime');
    list.replaceChildren();
    list.classList.toggle('animate', !!anim);
    let idx = 0;
    for (const s of SECTIONS) {
      const rows = shown.filter((h) => h.section === s.id);
      if (!rows.length) continue;
      const prog = rows.filter((h) => inProgress(h, d));
      const dn = prog.filter((h) => isDone(h, selectedKey)).length;
      list.append(el('div', { class: 'section' },
        useHeads ? el('div', { class: 'section-h' }, el('span', {}, s.label), el('span', { class: 'sec-count' }, `${dn}/${prog.length}`)) : null,
        el('ul', { class: 'habit-list' }, rows.map((h) => habitRow(h, selectedKey, { expanded: expanded.has(h.id), idx: idx++, onExpand: (id) => { expanded.has(id) ? expanded.delete(id) : expanded.add(id); paint(false); } })))));
    }
    if (!shown.length) list.append(el('div', { class: 'rest' }, el('span', {}, '🌿'), el('p', {}, 'Nothing scheduled for this day.')));
    const resting = active().filter((h) => !isDue(h, d) && selectedKey >= h.createdAt);
    if (resting.length && shown.length) list.append(el('p', { class: 'rest-note' }, `${resting.map((h) => h.emoji).join(' ')} ${plural(resting.length, 'habit')} resting`));
  };
  return { node, paint };
}

function statsGrid() {
  const tiles = {
    cur: statTile({ label: 'Current streak', icon: 'flame', value: 0, unit: 'days', delay: 0 }),
    long: statTile({ label: 'Longest streak', icon: 'award', value: 0, unit: 'days', delay: 60 }),
    week: statTile({ label: 'This week', icon: 'chart', value: 0, unit: '%', delay: 120 }),
    total: statTile({ label: 'Total completed', icon: 'check', value: 0, delay: 180 }),
    best: statTile({ label: 'Personal best', icon: 'sparkle', value: 0, unit: 'in a day', delay: 240 }),
    goals: statTile({ label: 'Active goals', icon: 'target', value: 0, delay: 300 }),
  };
  const node = el('div', { class: 'stat-grid' }, Object.values(tiles));
  const paint = (anim) => {
    const o = overview();
    tiles.cur.update(o.cur.value, o.cur.habit ? `${o.cur.habit.emoji} ${o.cur.habit.name}` : 'Complete a habit to start one', anim);
    tiles.long.update(o.longest.value, o.longest.habit ? `${o.longest.habit.emoji} ${o.longest.habit.name}` : 'Your record lives here', anim);
    const wr = o.week.rate == null ? 0 : Math.round(o.week.rate * 100);
    const lr = o.lastWeek.rate == null ? null : Math.round(o.lastWeek.rate * 100);
    tiles.week.update(wr, lr == null ? 'completion rate' : `${wr - lr >= 0 ? '+' : ''}${wr - lr} pts vs last week`, anim);
    tiles.total.update(o.total, 'habits, all time', anim);
    tiles.best.update(o.bestDay.value, o.bestDay.k ? `on ${fmtShort(parseKey(o.bestDay.k))}` : 'Most habits in one day', anim);
    tiles.goals.update(o.goals.length, o.goals.length ? `${pct(o.goalAvg)} average progress` : 'Set your first goal', anim);
  };
  return { node, paint };
}

function goalsCard() {
  const body = el('div', {});
  const node = card({ class: 'goals-mini' }, cardHead('Goals', el('a', { href: '#/goals', class: 'link-btn' }, 'View all')), body);
  const paint = (anim) => {
    const goals = state.goals.filter((g) => !g.archived && !g.completedAt).slice(0, 3);
    if (!goals.length) {
      body.replaceChildren(el('div', { class: 'mini-empty' }, el('p', { class: 'muted' }, 'Turn your habits into something bigger.'), el('a', { href: '#/goals', class: 'btn sm' }, icon('plus', 14), 'Create a goal')));
      return;
    }
    body.replaceChildren(el('ul', { class: 'goal-mini-list' }, goals.map((g, i) => {
      const p = goalProgress(g);
      const bar = el('i', { style: { width: anim ? '0%' : `${p.pct * 100}%`, transitionDelay: `${200 + i * 90}ms` } });
      if (anim) requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = `${p.pct * 100}%`; }));
      setTimeout(() => { bar.style.width = `${p.pct * 100}%`; }, 180);
      return el('li', {}, el('a', { href: '#/goals' },
        el('span', { class: 'gm-top' }, el('span', {}, `${g.emoji} ${g.title}`), el('b', {}, pct(p.pct))),
        el('span', { class: 'progress-bar' }, bar),
        el('span', { class: 'muted small' }, p.daysLeft == null ? 'No deadline' : p.daysLeft < 0 ? 'Past deadline' : `${plural(p.daysLeft, 'day')} left`)));
    })));
  };
  return { node, paint };
}

function weekCard() {
  const host = el('div', { class: 'chart-host' });
  const legend = el('div', { class: 'legend-inline' }, el('span', {}, el('i', { class: 'lg cur' }), 'This week'), el('span', {}, el('i', { class: 'lg ghost' }), 'Last week'));
  const node = card({ class: 'week-card' }, cardHead('This week', el('a', { href: '#/analytics', class: 'link-btn' }, 'Analytics')), host, legend);
  const draw = (anim) => {
    const w = host.clientWidth || 320;
    const cur = rangeStats(rangeFor('week', 0));
    const prev = rangeStats(rangeFor('week', -1));
    const data = cur.days.map((r, i) => ({
      label: DOW[r.d.getDay()].slice(0, 1), value: r.pct, ghost: prev.days[i].pct, highlight: r.k === todayKey(),
      tip: () => [tipTitle(fmtDate(r.d, { weekday: 'long', month: 'short', day: 'numeric' })),
        tipRow('This week', r.future ? '—' : r.total ? `${r.done}/${r.total} · ${pct(r.pct)}` : 'rest'),
        tipRow('Last week', prev.days[i].total ? pct(prev.days[i].pct) : '—')],
    }));
    host.replaceChildren(barChart(w, anim, { data, height: 170, showValues: false }));
  };
  return { node, paint: draw };
}

function starters() {
  return card({ class: 'welcome' },
    emptyState({ emoji: '🌱', title: 'Let’s light your first spark', text: 'Small habits, done often, change everything. Pick a few to begin or create your own.' }),
    el('div', { class: 'starter-grid' }, TEMPLATES.slice(0, 8).map((t) => el('button', {
      type: 'button', class: 'starter', onclick: () => addHabit(normHabit({ ...t, freq: t.freq || { type: 'days', days: [0, 1, 2, 3, 4, 5, 6] }, unit: t.timer ? 'min' : t.unit || '' })),
    }, el('span', { class: 'habit-icon', style: { '--c': t.color } }, t.emoji), el('span', {}, t.name, el('small', {}, t.kind === 'quit' ? 'Break' : 'Build'))))),
    el('div', { class: 'center' }, el('button', { type: 'button', class: 'btn primary', onclick: () => openHabitEditor() }, icon('plus', 16), 'Create a custom habit')));
}

let parts = null;
function refresh(anim = false) { if (parts) for (const p of parts) p.paint(anim); }

export const dashboard = {
  title: 'Dashboard',
  mount(root, { animate }) {
    if (selectedKey > todayKey()) selectedKey = todayKey();
    root.append(header());
    if (!active().length) { parts = null; root.append(starters()); return; }
    const pc = progressCard();
    const cl = checklist();
    const sg = statsGrid();
    const gc = goalsCard();
    const wc = weekCard();
    parts = [pc, cl, sg, gc];
    root.append(el('div', { class: 'dash-grid' + (animate ? ' animate' : '') },
      el('div', { class: 'dash-main' }, pc.node, cl.node),
      el('div', { class: 'dash-side' }, sg.node, wc.node, gc.node)));
    refresh(animate);
    nextFrame(() => wc.paint(animate));
    parts.push({ paint: () => wc.paint(false) });
  },
  update(info, root) {
    if (!active().length || !parts) { root.replaceChildren(); this.mount(root, { animate: false }); return; }
    refresh(false);
  },
  reset() { selectedKey = todayKey(); weekOffset = 0; },
};
