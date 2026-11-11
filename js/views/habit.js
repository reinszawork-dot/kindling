/* Habit detail: stats, month calendar with per-day status editing, trend, notes. */
import { state, byId, isPaused, setPaused, setNote } from '../store.js';
import {
  el, icon, keyOf, parseKey, addDays, startOfToday, todayKey, weekStartOf, fmtShort, fmtLong, fmtMonth, fmtTime, fmtNum, dowOrder, DOW,
  daysInMonth, downloadFile, pct,
} from '../util.js';
import { streakInfo, strength, rate, dayStatus, countOf, isDone, noteOf, scheduleText, ws, weeklyRates, unitOf, isWeekly } from '../stats.js';
import { setStatus, setCount } from '../actions.js';
import { lineChart, responsive, tipTitle, tipRow } from '../charts.js';
import { card, cardHead, statTile, emptyState, catChip, habitIcon, toast } from '../ui.js';
import { openHabitEditor } from '../editor.js';
import { habitMenu } from './habits.js';
import { icsFor } from '../reminders.js';

let monthOffset = 0;
let selected = null;
let currentId = null;

const STATUS_LABEL = { on: 'Completed', partial: 'In progress', skip: 'Skipped', miss: 'Missed', slip: 'Slipped', rest: 'Rest day', none: 'Open', paused: 'Paused', before: 'Before start', future: 'Upcoming' };

function calendar(h, onPick) {
  const t = startOfToday();
  const first = new Date(t.getFullYear(), t.getMonth() + monthOffset, 1);
  const start = weekStartOf(first, ws());
  const n = Math.ceil((daysBetweenSafe(start, first) + daysInMonth(first)) / 7) * 7;
  const grid = el('div', { class: 'cal-grid small' }, dowOrder(ws()).map((d) => el('span', { class: 'cal-dow' }, DOW[d].slice(0, 2))));
  for (let i = 0; i < n; i++) {
    const d = addDays(start, i);
    const k = keyOf(d);
    const inMonth = d.getMonth() === first.getMonth();
    const s = dayStatus(h, d);
    grid.append(el('button', {
      type: 'button', class: `cal-day st-${s}` + (inMonth ? '' : ' out') + (k === todayKey() ? ' today' : '') + (k === selected ? ' sel' : ''),
      disabled: s === 'future' || s === 'before', 'aria-label': `${fmtLong(d)}: ${STATUS_LABEL[s] || s}`,
      onclick: () => onPick(k),
    }, el('span', {}, d.getDate()), noteOf(h, k) ? el('i', { class: 'note-dot' }) : null));
  }
  return el('div', {},
    el('div', { class: 'cal-nav' },
      el('button', { type: 'button', class: 'icon-btn ghost sm', 'aria-label': 'Previous month', onclick: () => { monthOffset--; onPick(null, true); } }, icon('left', 18)),
      el('strong', {}, fmtMonth(first)),
      el('button', { type: 'button', class: 'icon-btn ghost sm', 'aria-label': 'Next month', disabled: monthOffset >= 0, onclick: () => { monthOffset++; onPick(null, true); } }, icon('right', 18))),
    grid,
    el('div', { class: 'cal-legend' }, [['on', 'Completed'], ['partial', 'Partial'], ['skip', 'Skipped'], ['miss', h.kind === 'quit' ? 'Slipped' : 'Missed'], ['rest', 'Rest']]
      .map(([c, l]) => el('span', {}, el('i', { class: `st-${c === 'miss' && h.kind === 'quit' ? 'slip' : c}` }), l))));
}
const daysBetweenSafe = (a, b) => Math.round((b - a) / 864e5);

function dayPanel(h, k) {
  if (!k) return el('p', { class: 'muted small center pad' }, 'Tap a day to see or change what happened.');
  const d = parseKey(k);
  const s = dayStatus(h, d);
  const c = countOf(h, k);
  const btn = (label, status, on, ic) => el('button', { type: 'button', class: 'btn sm' + (on ? ' active' : ' ghost'), 'aria-pressed': on, onclick: () => setStatus(h, k, on ? 'none' : status) }, icon(ic, 14), label);
  const actions = h.kind === 'quit'
    ? [btn('Clean', 'none', s === 'on', 'shield'), btn('Slipped', 'miss', s === 'slip', 'x')]
    : [btn('Completed', 'done', s === 'on', 'check'), btn('Skipped', 'skip', s === 'skip', 'skip'), btn('Missed', 'miss', s === 'miss' && state.missed[k]?.includes(h.id), 'x')];
  let amount = null;
  if (h.kind === 'build' && (h.target > 1 || h.timer)) {
    const input = el('input', { type: 'number', class: 'input num', min: 0, max: h.target * 100, value: c, 'aria-label': 'Amount' });
    amount = el('div', { class: 'amount' }, input, el('span', { class: 'muted' }, `/ ${fmtNum(h.target)} ${unitOf(h) || 'times'}`),
      el('button', { type: 'button', class: 'btn sm', onclick: () => setCount(h, k, Number(input.value) || 0) }, 'Log'));
  }
  const note = el('textarea', { class: 'input note', rows: 2, maxlength: 500, placeholder: 'Add a note…' }, noteOf(h, k));
  note.addEventListener('change', () => setNote(h, k, note.value));
  return el('div', { class: 'day-panel' },
    el('div', { class: 'day-panel-head' }, el('strong', {}, k === todayKey() ? `Today, ${fmtShort(d)}` : fmtLong(d)), el('span', { class: `status-pill st-${s}` }, STATUS_LABEL[s] || s)),
    el('div', { class: 'row-actions' }, actions), amount, note);
}

export const habitView = {
  title: 'Habit',
  mount(root, { animate, params }) {
    const h = byId(params[0]);
    if (currentId !== params[0]) { currentId = params[0]; monthOffset = 0; selected = todayKey(); }
    if (!h) {
      root.append(card({}, emptyState({ emoji: '🧭', title: 'Habit not found', text: 'It may have been deleted.', action: { label: 'Back to habits', run: () => { location.hash = '#/habits'; } } })));
      return;
    }
    const st = streakInfo(h);
    const r = rate(h);
    const total = Object.values(state.log).filter((day) => h.kind === 'build' && (day[h.id] || 0) >= h.target).length;
    const paused = isPaused(h);
    const more = el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'More actions', onclick: () => habitMenu(more, h, { onDelete: () => { location.hash = '#/habits'; } }) }, icon('more', 18));
    const calHost = el('div', {});
    const panelHost = el('div', {});
    const paintCal = () => {
      calHost.replaceChildren(calendar(h, (k, navOnly) => { if (!navOnly) selected = k; paintCal(); }));
      panelHost.replaceChildren(dayPanel(h, selected));
    };
    const trendHost = el('div', { class: 'chart-host' });
    const weeks = weeklyRates(h, 12);
    const s0 = weekStartOf(startOfToday(), ws());
    const notes = Object.entries(state.notes).filter(([, day]) => day[h.id]).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 20);

    root.append(
      el('a', { href: '#/habits', class: 'back-link' }, icon('left', 16), 'My Habits'),
      el('header', { class: 'habit-hero' },
        habitIcon(h, 'xl'),
        el('div', { class: 'hero-text' },
          el('h1', { class: 'serif' }, h.name, paused ? el('span', { class: 'tag' }, 'Paused') : null, h.archived ? el('span', { class: 'tag' }, 'Archived') : null),
          el('div', { class: 'habit-meta' }, catChip(h.category), el('span', { class: 'meta-item' }, scheduleText(h)),
            h.time ? el('span', { class: 'meta-item' }, icon('clock', 13), fmtTime(h.time)) : null,
            el('span', { class: 'meta-item' }, `Since ${fmtShort(parseKey(h.createdAt))}`),
            h.reminders.length ? el('span', { class: 'meta-item' }, icon('bell', 13), h.reminders.map(fmtTime).join(', ')) : null)),
        el('div', { class: 'hero-actions' },
          el('button', { type: 'button', class: 'btn', onclick: () => openHabitEditor(h.id) }, icon('edit', 15), 'Edit'),
          h.archived ? null : el('button', { type: 'button', class: 'btn ghost', onclick: () => { setPaused(h.id, !paused); toast(paused ? `${h.name} resumed` : `${h.name} paused`); } }, icon(paused ? 'play' : 'pause', 15), paused ? 'Resume' : 'Pause'),
          more)),
      el('div', { class: 'stat-grid five' + (animate ? ' animate' : '') },
        statTile({ label: h.kind === 'quit' ? 'Days clean' : 'Current streak', icon: h.kind === 'quit' ? 'shield' : 'flame', value: st.cur, unit: isWeekly(h) ? 'weeks' : 'days', animate, delay: 0 }),
        statTile({ label: 'Best streak', icon: 'award', value: st.best, unit: isWeekly(h) ? 'weeks' : 'days', animate, delay: 60 }),
        statTile({ label: 'Habit strength', icon: 'trend', value: strength(h), unit: '%', sub: 'one miss dents it, never resets it', animate, delay: 120 }),
        statTile({ label: '30-day rate', icon: 'chart', value: r == null ? '—' : Math.round(r * 100), unit: r == null ? '' : '%', animate, delay: 180 }),
        statTile({ label: h.kind === 'quit' ? 'Clean days' : 'Total completed', icon: 'check', value: h.kind === 'quit' ? st.best : total, animate, delay: 240 })),
      el('div', { class: 'two-col' },
        card({}, cardHead('History'), calHost, panelHost),
        el('div', { class: 'col' },
          card({}, cardHead('Weekly trend', el('span', { class: 'muted small' }, 'last 12 weeks')), trendHost),
          card({}, cardHead('Notes'), notes.length
            ? el('ul', { class: 'notes-list' }, notes.map(([k, day]) => el('li', {}, el('span', { class: 'nd' }, fmtShort(parseKey(k))), el('span', {}, day[h.id]))))
            : el('p', { class: 'muted small' }, 'Notes you add to a day show up here.')),
          card({}, cardHead('Reminders'),
            el('p', { class: 'muted small' }, h.reminders.length ? `Reminders at ${h.reminders.map(fmtTime).join(', ')} while Kindling is open. Add them to your calendar to be reminded even when it’s closed.` : 'No reminders set. You can still add this habit to your calendar.'),
            el('button', { type: 'button', class: 'btn sm', onclick: () => { downloadFile(`kindling-${h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`, icsFor([h]), 'text/calendar'); toast('Calendar file downloaded. Open it to add the reminder.'); } }, icon('calendar', 14), 'Add to calendar')))));
    paintCal();
    responsive(trendHost, (w, anim) => lineChart(w, anim, {
      height: 200, labelEvery: 2,
      points: weeks.map((v, i) => {
        const s = addDays(s0, (i - 11) * 7);
        return { label: fmtShort(s).replace(/\s\d+$/, (m) => m), value: v, tip: () => [tipTitle(`Week of ${fmtShort(s)}`), tipRow('Completion', v == null ? 'no data' : pct(v))] };
      }),
      avg: (() => { const xs = weeks.filter((v) => v != null); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; })(),
    }), animate);
  },
};
