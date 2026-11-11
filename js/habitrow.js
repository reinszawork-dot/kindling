/* The interactive habit row used on the dashboard (expandable). */
import { el, icon, svg, parseKey, addDays, startOfToday, fmtTime, fmtNum, compact, fmtClock, todayKey } from './util.js';
import { countOf, isDone, isSkipped, isMissed, isWeekly, weekDoneCount, streakInfo, dayStatus, noteOf, missedYesterday, unitOf } from './stats.js';
import { setNote } from './store.js';
import { setCount, setStatus, toggle, toggleTimer, timerRunning, secsDone, consumeTouched } from './actions.js';
import { catChip, habitIcon } from './ui.js';

const CHECK = () => svg('svg', { viewBox: '0 0 24 24', class: 'check-svg', 'aria-hidden': 'true' }, svg('path', { d: 'M5 12.5l4.5 4.5L19 7.5' }));

function control(h, k) {
  const c = countOf(h, k);
  const done = isDone(h, k);
  if (h.kind === 'quit') {
    return el('button', {
      type: 'button', class: 'slip-btn' + (c ? ' on' : ''), 'aria-pressed': !!c,
      'aria-label': c ? `Undo slip for ${h.name}` : `Log a slip for ${h.name}`, onclick: () => toggle(h, k),
    }, c ? 'Slipped' : 'Slipped?');
  }
  if (isSkipped(h, k)) return el('button', { type: 'button', class: 'state-btn', onclick: () => setStatus(h, k, 'none'), 'aria-label': `Unskip ${h.name}` }, icon('skip', 14), 'Skipped');
  if (isMissed(h, k)) return el('button', { type: 'button', class: 'state-btn miss', onclick: () => setStatus(h, k, 'none'), 'aria-label': `Clear missed for ${h.name}` }, icon('x', 14), 'Missed');
  if (h.timer && !done) {
    const run = timerRunning(h, k);
    const left = h.target * 60 - secsDone(h, k);
    return el('button', {
      type: 'button', class: 'timer-btn' + (run ? ' running' : ''), 'data-timer': h.id,
      'aria-label': run ? `Pause ${h.name} timer` : `Start ${h.name} timer`, onclick: () => toggleTimer(h, k),
    }, icon(run ? 'pause' : 'play', 13), el('span', { class: 'tlabel' }, left >= h.target * 60 ? `${h.target}m` : fmtClock(left)));
  }
  if (h.target === 1 || done) {
    return el('button', {
      type: 'button', class: 'check' + (done ? ' on' : ''), 'aria-pressed': done,
      'aria-label': done ? `Mark ${h.name} not done` : `Complete ${h.name}`, onclick: () => setStatus(h, k, done ? 'none' : 'done'),
    }, CHECK());
  }
  const big = h.target > 20;
  return el('div', { class: 'counter' },
    c > 0 && !big ? el('button', { type: 'button', class: 'minus', 'aria-label': `Remove one ${h.name}`, onclick: () => setCount(h, k, c - 1) }, '−') : null,
    el('button', {
      type: 'button', class: 'plus', 'aria-label': `Add one ${h.name} (${c} of ${h.target})`,
      onclick: (e) => (big ? e.currentTarget.closest('.habit-row').querySelector('.habit-main').click() : setCount(h, k, c + 1)),
    }, big ? `${compact(c)}/${compact(h.target)}` : `${c}/${h.target}`));
}

function dots(h) {
  const t = startOfToday();
  return el('span', { class: 'dots', 'aria-hidden': 'true' }, Array.from({ length: 7 }, (_, i) => {
    const s = dayStatus(h, addDays(t, i - 6));
    return el('i', { class: { on: 'on', partial: 'part', skip: 'skip', slip: 'slip', miss: 'miss', rest: 'off', before: 'off', paused: 'off' }[s] || '' });
  }));
}

export function habitRow(h, k, { expanded, onExpand, idx = 0 }) {
  const d = parseKey(k);
  const c = countOf(h, k);
  const done = isDone(h, k);
  const skipped = isSkipped(h, k);
  const missed = isMissed(h, k);
  const weekly = isWeekly(h);
  const wk = weekly ? weekDoneCount(h, d) : 0;
  const st = streakInfo(h);
  let fill = 0;
  if (h.kind === 'build' && !skipped && !missed) fill = h.timer ? Math.min(1, secsDone(h, k) / (h.target * 60)) : Math.min(1, c / h.target);
  const cls = ['habit-row', `kind-${h.kind}`];
  if (h.kind === 'build' && done) cls.push('done');
  if (h.kind === 'quit' && c) cls.push('slipped');
  if (skipped || missed) cls.push('muted-row');
  if (weekly && !done && wk >= h.freq.times) cls.push('muted-row');
  if (expanded) cls.push('open');
  if (consumeTouched(h.id, k)) cls.push('pop');
  const note = noteOf(h, k);
  const nudge = k === todayKey() && missedYesterday(h);

  const li = el('li', { class: cls.join(' '), 'data-row': h.id, style: { '--c': h.color, '--fill': fill, '--d': `${idx * 40}ms` } });
  li.append(el('div', { class: 'habit-line' },
    el('button', { type: 'button', class: 'habit-main', 'aria-expanded': !!expanded, onclick: () => onExpand(h.id) },
      habitIcon(h),
      el('span', { class: 'habit-text' },
        el('span', { class: 'habit-name' }, h.name),
        el('span', { class: 'habit-meta' },
          catChip(h.category),
          h.time ? el('span', { class: 'meta-item' }, icon('clock', 13), fmtTime(h.time)) : null,
          el('span', { class: 'meta-item streak' + (st.cur >= 3 ? ' hot' : ''), title: `Best: ${st.best}` },
            icon(h.kind === 'quit' ? 'shield' : 'flame', 13), h.kind === 'quit' ? `${st.cur}d clean` : weekly ? `${st.cur} wk` : `${st.cur}d`),
          weekly ? el('span', { class: 'meta-item' }, `${wk}/${h.freq.times} this week`) : null,
          h.kind === 'build' && h.target > 1 && !h.timer && h.unit ? el('span', { class: 'meta-item' }, `${fmtNum(h.target)} ${h.unit}`) : null,
          nudge ? el('span', { class: 'meta-item warn' }, 'missed yesterday') : null,
          note ? el('span', { class: 'meta-item', title: note }, icon('note', 13)) : null))),
    control(h, k)));

  if (expanded) {
    const actions = el('div', { class: 'row-actions' });
    if (h.kind === 'build') {
      if (h.target > 1 || h.timer) {
        const input = el('input', { type: 'number', class: 'input num', min: 0, max: h.target * 100, value: c, 'aria-label': `Amount (${unitOf(h) || 'times'})` });
        const apply = () => setCount(h, k, Number(input.value) || 0);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
        actions.append(el('div', { class: 'amount' }, input, el('span', { class: 'muted' }, `/ ${fmtNum(h.target)} ${unitOf(h) || 'times'}`), el('button', { type: 'button', class: 'btn sm', onclick: apply }, 'Log')));
      }
      actions.append(
        el('button', { type: 'button', class: 'btn sm' + (skipped ? ' active' : ' ghost'), onclick: () => setStatus(h, k, skipped ? 'none' : 'skip'), title: 'Skipping keeps your streak (sick day, travel…)' }, icon('skip', 14), skipped ? 'Unskip' : 'Skip'),
        el('button', { type: 'button', class: 'btn sm' + (missed ? ' active' : ' ghost'), onclick: () => setStatus(h, k, missed ? 'none' : 'miss') }, icon('x', 14), missed ? 'Clear missed' : 'Mark missed'));
    }
    actions.append(el('a', { class: 'btn sm ghost', href: `#/habit/${h.id}` }, 'Details', icon('right', 14)));
    const noteBox = el('textarea', { class: 'input note', rows: 2, maxlength: 500, placeholder: `Note for ${k === todayKey() ? 'today' : 'this day'}…` }, note);
    let t;
    noteBox.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => setNote(h, k, noteBox.value), 500); });
    noteBox.addEventListener('blur', () => { clearTimeout(t); if (noteBox.value.trim() !== noteOf(h, k)) setNote(h, k, noteBox.value); });
    li.append(el('div', { class: 'row-panel' },
      el('div', { class: 'row-panel-top' }, el('span', { class: 'muted small' }, 'Last 7 days'), dots(h), el('span', { class: 'muted small' }, `Best ${st.best}`)),
      actions, noteBox));
  }
  return li;
}
