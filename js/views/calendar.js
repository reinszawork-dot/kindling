/* Calendar: month grid of daily completion, weekly summaries, and a day panel to review/edit. */
import { state, active } from '../store.js';
import { MOODS } from '../data.js';
import { el, icon, keyOf, parseKey, addDays, startOfToday, todayKey, weekStartOf, fmtMonth, fmtLong, dowOrder, DOW, daysInMonth, pct, plural, fmtShort } from '../util.js';
import { dayProgress, dayStatus, isDue, ws, countOf, rangeStats } from '../stats.js';
import { setStatus } from '../actions.js';
import { ring } from '../charts.js';
import { pageHead, card, cardHead, emptyState, habitIcon } from '../ui.js';
import { openHabitEditor } from '../editor.js';

let monthOffset = 0;
let selected = todayKey();

const STATUS = { on: 'Completed', partial: 'Partial', skip: 'Skipped', miss: 'Missed', slip: 'Slipped', none: 'Open', rest: 'Rest', paused: 'Paused' };

function dayDetail(k) {
  const d = parseKey(k);
  const p = dayProgress(d);
  const r = ring(64, 7);
  const habits = active().filter((h) => isDue(h, d) || countOf(h, k) > 0);
  const mood = state.mood[k];
  setTimeout(() => r.set(p.pct, true), 0);
  return el('div', { class: 'day-detail' },
    el('div', { class: 'dd-head' },
      el('div', { class: 'dd-ring' }, r.node, el('span', {}, pct(p.pct))),
      el('div', {}, el('h3', { class: 'serif' }, k === todayKey() ? 'Today' : fmtLong(d)),
        el('p', { class: 'muted small' }, p.total ? `${p.done} of ${p.total} habits completed` : 'Nothing scheduled', mood ? ` · feeling ${MOODS[mood - 1].e}` : ''))),
    habits.length ? el('ul', { class: 'dd-list' }, habits.map((h) => {
      const s = dayStatus(h, d);
      const quick = (label, status, on, ic) => el('button', { type: 'button', class: 'icon-btn sm' + (on ? ' on' : ' ghost'), 'aria-label': `${label} ${h.name}`, 'aria-pressed': on, title: label, onclick: () => setStatus(h, k, on ? 'none' : status) }, icon(ic, 15));
      return el('li', { style: { '--c': h.color } },
        habitIcon(h, 'sm'),
        el('a', { href: `#/habit/${h.id}`, class: 'dd-name' }, h.name, el('span', { class: `status-pill st-${s}` }, STATUS[s] || s)),
        el('span', { class: 'dd-actions' }, h.kind === 'quit'
          ? [quick('Slipped', 'miss', s === 'slip', 'x')]
          : [quick('Completed', 'done', s === 'on', 'check'), quick('Skipped', 'skip', s === 'skip', 'skip'), quick('Missed', 'miss', s === 'miss' && !!state.missed[k]?.includes(h.id), 'x')]));
    })) : el('p', { class: 'muted small pad' }, 'No habits were scheduled on this day.'));
}

export const calendarView = {
  title: 'Calendar',
  mount(root, { animate }) {
    if (!active().length) {
      root.append(pageHead('Calendar', 'Your days at a glance'), card({}, emptyState({ emoji: '🗓', title: 'Nothing to show yet', text: 'Once you start checking off habits, each day fills in here.', action: { label: 'New habit', run: () => openHabitEditor() } })));
      return;
    }
    const t = startOfToday();
    const first = new Date(t.getFullYear(), t.getMonth() + monthOffset, 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const start = weekStartOf(first, ws());
    const weeks = Math.ceil((Math.round((first - start) / 864e5) + daysInMonth(first)) / 7);
    const ms = rangeStats({ start: first, end: last, startK: keyOf(first), endK: keyOf(last) });
    const goto = (n) => { monthOffset = n; root.replaceChildren(); this.mount(root, { animate: true }); };

    const grid = el('div', { class: 'cal-grid big' + (animate ? ' animate' : '') },
      dowOrder(ws()).map((d) => el('span', { class: 'cal-dow' }, DOW[d].slice(0, 3))), el('span', { class: 'cal-dow wk' }, 'Week'));
    const weekList = el('ul', { class: 'week-sum-list' });
    for (let w = 0; w < weeks; w++) {
      let wd = 0, wt = 0;
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, w * 7 + i);
        const k = keyOf(d);
        const inMonth = d.getMonth() === first.getMonth();
        const future = d > t;
        const p = future ? { total: 0, done: 0, pct: 0 } : dayProgress(d);
        if (!future) { wd += p.done; wt += p.total; }
        const level = !p.total ? 'none' : p.done === p.total ? 'full' : p.pct >= 0.5 ? 'mid' : p.done ? 'low' : 'zero';
        grid.append(el('button', {
          type: 'button', class: `cal-day lv-${level}` + (inMonth ? '' : ' out') + (k === todayKey() ? ' today' : '') + (k === selected ? ' sel' : ''),
          disabled: future, style: { '--p': Math.round(p.pct * 100), '--d': `${(w * 7 + i) * 12}ms` },
          'aria-label': `${fmtLong(d)}: ${p.total ? `${p.done} of ${p.total} done` : 'nothing scheduled'}`, 'aria-pressed': k === selected,
          onclick: () => { selected = k; root.replaceChildren(); this.mount(root, { animate: false }); },
        },
        el('span', { class: 'cd-num' }, d.getDate()),
        p.total && !future ? el('span', { class: 'cd-bar' }, el('i', { style: { width: `${p.pct * 100}%` } })) : null,
        state.mood[k] ? el('span', { class: 'cd-mood' }, MOODS[state.mood[k] - 1].e) : null));
      }
      const wr = wt ? wd / wt : null;
      const ws0 = addDays(start, w * 7);
      grid.append(el('span', { class: 'cal-week' }, el('b', {}, wr == null ? '—' : pct(wr)), el('small', {}, wt ? `${wd}/${wt}` : '')));
      weekList.append(el('li', {}, el('span', {}, `${fmtShort(ws0)} – ${fmtShort(addDays(ws0, 6))}`),
        el('span', { class: 'progress-bar sm' }, el('i', { style: { width: `${(wr || 0) * 100}%` } })), el('b', {}, wr == null ? '—' : pct(wr))));
    }

    root.append(
      pageHead('Calendar', ms.rate == null ? 'Your days at a glance' : `${fmtMonth(first)}: ${pct(ms.rate)} completion · ${plural(ms.perfect, 'perfect day')}`),
      el('div', { class: 'cal-layout' },
        card({ class: 'cal-card' },
          el('div', { class: 'cal-nav' },
            el('button', { type: 'button', class: 'icon-btn ghost', 'aria-label': 'Previous month', onclick: () => goto(monthOffset - 1) }, icon('left', 18)),
            el('h2', { class: 'serif' }, fmtMonth(first)),
            el('button', { type: 'button', class: 'icon-btn ghost', 'aria-label': 'Next month', disabled: monthOffset >= 0, onclick: () => goto(monthOffset + 1) }, icon('right', 18)),
            monthOffset ? el('button', { type: 'button', class: 'btn sm ghost', onclick: () => { selected = todayKey(); goto(0); } }, 'Today') : null),
          grid,
          el('div', { class: 'cal-legend' }, [['full', 'All done'], ['mid', 'Half or more'], ['low', 'Some'], ['zero', 'None']].map(([c, l]) => el('span', {}, el('i', { class: `lv-${c}` }), l)))),
        el('div', { class: 'col' },
          card({ class: 'day-card' }, dayDetail(selected)),
          card({ class: 'week-sum' }, cardHead('Weekly summary'), weekList))));
  },
};
