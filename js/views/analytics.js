/* Analytics: period + habit filters drive five interactive charts and a week-by-week comparison. */
import { state, active, byId, categoryOf } from '../store.js';
import { el, icon, DOW, dowOrder, fmtShort, fmtDate, pct, plural, addDays, startOfToday, weekStartOf, keyOf, todayKey, fmtNum, nextFrame } from '../util.js';
import { rangeFor, rangeStats, shiftRange, categoryBreakdown, habitPerformance, yearActivity, ws, dayProgress } from '../stats.js';
import { barChart, lineChart, hbars, donut, heatmap, responsive, tipTitle, tipRow } from '../charts.js';
import { pageHead, card, cardHead, segmented, emptyState, statTile } from '../ui.js';
import { openHabitEditor } from '../editor.js';
import { gate, openLifetime, proBadge } from '../pro.js';

const view = { type: 'week', offset: 0, habit: null };

const prevName = (t) => ({ week: 'last week', month: 'last month', year: 'last year' }[t]);
let partial = false; // comparing an in-progress period with the same point of the previous one
const delta = (a, b, unit = '') => {
  if (a == null || b == null) return 'no earlier data';
  const d = Math.round(a - b);
  const vs = partial ? `same point ${prevName(view.type)}` : prevName(view.type);
  return d === 0 ? `same as ${vs}` : `${d > 0 ? '+' : ''}${d}${unit} vs ${vs}`;
};
/** The previous period cut to the same number of elapsed days, so a half-done week isn't compared with a full one. */
function comparable(range, prev) {
  const t = startOfToday();
  if (range.end <= t) return prev;
  const elapsed = Math.round((t - range.start) / 864e5);
  const end = addDays(prev.start, elapsed);
  return { ...prev, end, endK: keyOf(end) };
}

function weekdayData(cur, prev) {
  const order = dowOrder(ws());
  if (view.type === 'week') {
    return cur.days.map((r, i) => ({
      label: DOW[r.d.getDay()].slice(0, 3), value: r.pct, ghost: prev.days[i]?.pct ?? null, highlight: r.k === todayKey(),
      tip: () => [tipTitle(fmtDate(r.d, { weekday: 'long', month: 'short', day: 'numeric' })),
        tipRow('Completed', r.future ? 'upcoming' : r.total ? `${r.done} of ${r.total} · ${pct(r.pct)}` : 'rest day', 'var(--accent)'),
        tipRow(`Same day ${prevName(view.type)}`, prev.days[i]?.total ? pct(prev.days[i].pct) : '—', 'var(--ghost)')],
    }));
  }
  return order.map((dw) => {
    const c = cur.byDow[dw], p = prev.byDow[dw];
    const v = c.total ? c.done / c.total : null, g = p.total ? p.done / p.total : null;
    return {
      label: DOW[dw].slice(0, 3), value: v, ghost: g,
      tip: () => [tipTitle(`${DOW[dw]}s`), tipRow('Average', v == null ? '—' : pct(v), 'var(--accent)'), tipRow(prevName(view.type), g == null ? '—' : pct(g), 'var(--ghost)'),
        tipRow('Habits done', `${c.done} of ${c.total}`)],
    };
  });
}

function trendPoints(range, filter) {
  if (view.type === 'year') {
    return Array.from({ length: 12 }, (_, m) => {
      const s = new Date(range.start.getFullYear(), m, 1);
      const r = rangeStats({ start: s, end: new Date(s.getFullYear(), m + 1, 0), startK: keyOf(s), endK: keyOf(new Date(s.getFullYear(), m + 1, 0)) }, filter);
      return { label: fmtDate(s, { month: 'short' }).slice(0, 3), full: fmtDate(s, { month: 'long' }), value: r.rate, tip: () => [tipTitle(fmtDate(s, { month: 'long', year: 'numeric' })), tipRow('Completion', r.rate == null ? 'no data' : pct(r.rate)), tipRow('Habits done', fmtNum(r.done)), tipRow('Perfect days', r.perfect)] };
    });
  }
  return rangeStats(range, filter).days.map((r) => ({
    label: view.type === 'week' ? DOW[r.d.getDay()].slice(0, 3) : String(r.d.getDate()),
    full: fmtDate(r.d, { weekday: 'short', month: 'short', day: 'numeric' }),
    value: r.future ? null : r.pct,
    tip: () => [tipTitle(fmtDate(r.d, { weekday: 'short', month: 'short', day: 'numeric' })), tipRow('Completion', r.future ? 'upcoming' : r.total ? pct(r.pct) : 'rest day'), tipRow('Habits done', r.future ? '—' : `${r.done} of ${r.total}`)],
  }));
}

export const analyticsView = {
  title: 'Analytics',
  mount(root, { animate }) {
    if (!active().length) {
      root.append(pageHead('Analytics', 'Your progress, in numbers'),
        card({}, emptyState({ emoji: '📈', title: 'Your charts will grow here', text: 'Add a habit and check it off for a few days. Every chart is built from your real history.', action: { label: 'New habit', run: () => openHabitEditor() } })));
      return;
    }
    if (view.habit && !byId(view.habit)) view.habit = null;
    const navLabel = el('strong', { class: 'period-label' });
    const nextBtn = el('button', { type: 'button', class: 'icon-btn ghost sm', 'aria-label': 'Next period', onclick: () => { if (view.offset < 0) { view.offset++; redraw(true); } } }, icon('right', 18));
    const habitSelect = el('select', { class: 'input select', 'aria-label': 'Filter by habit', onchange: (e) => { view.habit = e.target.value || null; redraw(true); } },
      el('option', { value: '' }, 'All habits'), active().map((h) => el('option', { value: h.id, selected: view.habit === h.id }, `${h.emoji} ${h.name}`)));
    const summary = el('div', { class: 'stat-grid four' });
    const tiles = {
      rate: statTile({ label: 'Completion rate', icon: 'chart', value: 0, unit: '%' }),
      done: statTile({ label: 'Habits completed', icon: 'check', value: 0, delay: 60 }),
      perfect: statTile({ label: 'Perfect days', icon: 'sparkle', value: 0, delay: 120 }),
      best: statTile({ label: 'Best day', icon: 'award', value: '—', delay: 180 }),
    };
    summary.append(...Object.values(tiles));

    const weekdaySub = el('span', { class: 'muted small' });
    const barHost = el('div', { class: 'chart-host' });
    const lineHost = el('div', { class: 'chart-host' });
    const lineFacts = el('div', { class: 'facts' });
    const perfHost = el('div', {});
    const heatHost = el('div', { class: 'chart-host heat-host' });
    const donutHost = el('div', { class: 'donut-layout' });
    const weeksHost = el('div', { class: 'chart-host' });
    const weeksFacts = el('p', { class: 'muted small' });
    const trendTitle = el('h3', {});

    root.append(
      pageHead('Analytics', 'Every number here comes from your own history'),
      el('div', { class: 'toolbar sticky' },
        segmented([{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }], view.type, (v) => { view.type = v; view.offset = 0; redraw(true); }, 'Period'),
        el('div', { class: 'period-nav' },
          el('button', { type: 'button', class: 'icon-btn ghost sm', 'aria-label': 'Previous period', onclick: () => { view.offset--; redraw(true); } }, icon('left', 18)),
          navLabel, nextBtn),
        habitSelect),
      summary,
      el('div', { class: 'grid-2' },
        card({ class: 'chart-card' }, cardHead('Weekly activity', weekdaySub), barHost,
          el('div', { class: 'legend-inline' }, el('span', {}, el('i', { class: 'lg cur' }), 'This period'), el('span', {}, el('i', { class: 'lg ghost' }), 'Previous'))),
        card({ class: 'chart-card' }, el('div', { class: 'card-head' }, trendTitle), lineHost, lineFacts)),
      el('div', { class: 'grid-2' },
        card({ class: 'chart-card' }, cardHead('Habit performance', el('span', { class: 'muted small' }, 'tap a habit to focus')), perfHost),
        card({ class: 'chart-card' }, cardHead('By category'), donutHost)),
      card({ class: 'chart-card' }, cardHead('Activity', el('span', { class: 'muted small' }, 'habits completed per day, last 12 months')), heatHost,
        el('div', { class: 'legend' }, el('span', {}, 'Less'), ['l0', 'l1', 'l2', 'l3', 'l4'].map((c) => el('i', { class: c })), el('span', {}, 'More'))),
      card({ class: 'chart-card' }, cardHead('Week by week', el('span', { class: 'muted small' }, 'this week vs the 7 before it')), weeksHost, weeksFacts),
      card({ class: 'lifetime-card' }, cardHead('Lifetime report', proBadge()),
        el('p', { class: 'muted small' }, 'Every month since your first habit, your completion by year and your longest runs ever, in one place.'),
        el('div', { class: 'btn-row' }, el('button', { type: 'button', class: 'btn', onclick: () => gate('The lifetime report', openLifetime) }, icon('chart', 15), 'Open lifetime report'))));

    // Each chart is mounted once; filters swap the draw function and redraw in place.
    const draws = {};
    const slots = {};
    const paint = (name, host, fn, anim) => {
      draws[name] = fn;
      if (!slots[name]) slots[name] = responsive(host, (w, a) => draws[name](w, a), anim);
      else slots[name].redraw(anim);
    };
    function redraw(anim) {
      const range = rangeFor(view.type, view.offset);
      const prev = shiftRange(range);
      const cur = rangeStats(range, view.habit);
      const pr = rangeStats(prev, view.habit);
      const cmpRange = comparable(range, prev);
      partial = cmpRange !== prev;
      const prc = rangeStats(cmpRange, view.habit);
      navLabel.textContent = range.label;
      nextBtn.disabled = view.offset >= 0;
      habitSelect.value = view.habit || '';

      // summary
      tiles.rate.update(cur.rate == null ? '—' : Math.round(cur.rate * 100), delta(cur.rate == null ? null : cur.rate * 100, prc.rate == null ? null : prc.rate * 100, ' pts'), anim);
      tiles.done.update(cur.done, delta(cur.done, prc.total ? prc.done : null), anim);
      tiles.perfect.update(cur.perfect, delta(cur.perfect, prc.total ? prc.perfect : null), anim);
      tiles.best.update(cur.best ? fmtDate(cur.best.d, { weekday: 'short', day: 'numeric', month: 'short' }) : '—', cur.best ? `${cur.best.done} of ${cur.best.total} · ${pct(cur.best.pct)}` : 'no completed days yet');

      weekdaySub.textContent = view.type === 'week' ? 'each day vs the same day last week' : `average by weekday vs ${prevName(view.type)}`;
      paint('bars', barHost, (w, a) => barChart(w, a, { data: weekdayData(cur, pr), height: 230 }), anim);

      trendTitle.textContent = view.type === 'year' ? 'Monthly consistency' : view.type === 'month' ? 'Daily consistency' : 'This week’s trend';
      const pts = trendPoints(range, view.habit);
      const vals = pts.map((p) => p.value).filter((v) => v != null);
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      let bi = null, wi = null;
      pts.forEach((p, i) => { if (p.value == null) return; if (bi == null || p.value > pts[bi].value) bi = i; if (wi == null || p.value < pts[wi].value) wi = i; });
      paint('line', lineHost, (w, a) => lineChart(w, a, { points: pts, avg, best: bi, worst: wi, height: 230, labelEvery: view.type === 'month' ? (w < 520 ? 5 : 3) : 1 }), anim);
      lineFacts.replaceChildren(
        el('div', {}, el('span', {}, 'Average'), el('b', {}, avg == null ? '—' : pct(avg))),
        el('div', {}, el('span', {}, view.type === 'year' ? 'Best month' : 'Best day'), el('b', {}, bi == null ? '—' : `${pts[bi].full} · ${pct(pts[bi].value)}`)),
        el('div', {}, el('span', {}, view.type === 'year' ? 'Lowest month' : 'Lowest day'), el('b', {}, wi == null || wi === bi ? '—' : `${pts[wi].full} · ${pct(pts[wi].value)}`)));

      // habit performance
      const perf = habitPerformance(range);
      perfHost.replaceChildren(perf.length
        ? hbars(perf.map((p) => ({
          id: p.h.id, emoji: p.h.emoji, name: p.h.name, value: p.rate, color: p.h.color,
          tip: () => [tipTitle(`${p.h.emoji} ${p.h.name}`), tipRow('Completion', pct(p.rate)), tipRow('Hit / missed', `${p.hit} / ${p.miss}`), tipRow('Strength', `${p.strength}%`)],
        })), { animate: anim, selected: view.habit, onSelect: (id) => { view.habit = view.habit === id ? null : id; redraw(true); } })
        : el('p', { class: 'muted small pad' }, 'No completed or missed days in this period yet.'));

      // category donut
      const cats = categoryBreakdown(range, view.habit).filter((c) => c.done > 0 || c.total > 0);
      const totalDone = cats.reduce((s, c) => s + c.done, 0);
      if (!cats.length || !totalDone) donutHost.replaceChildren(el('p', { class: 'muted small pad' }, 'Complete a habit in this period to see your category balance.'));
      else {
        const size = Math.min(210, Math.max(160, donutHost.clientWidth * 0.45 || 190));
        const legend = el('ul', { class: 'donut-legend' }, cats.map((c) => el('li', { 'data-cat': c.id },
          el('i', { style: { background: c.color } }), el('span', {}, c.name), el('b', {}, pct(c.rate)), el('small', {}, `${c.done}/${c.total}`))));
        donutHost.replaceChildren(donut(size, anim, {
          segments: cats.filter((c) => c.done).map((c) => ({
            id: c.id, label: c.name, value: c.done, color: c.color,
            tip: () => [tipTitle(c.name), tipRow('Completed', `${c.done} of ${c.total}`), tipRow('Completion rate', pct(c.rate)), tipRow('Share', pct(c.done / totalDone))],
          })),
          center: fmtNum(totalDone), sub: 'completed',
          onHover: (id) => legend.querySelectorAll('li').forEach((li) => li.classList.toggle('dim', !!id && li.dataset.cat !== id)),
        }), legend);
      }

      // heatmap
      const ya = yearActivity(view.habit);
      paint('heat', heatHost, (w, a) => heatmap(w, a, {
        cells: ya.cells, max: ya.max, weekStart: ws(),
        tip: (c) => [tipTitle(fmtDate(c.d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })), tipRow('Completed', c.total ? `${c.done} of ${c.total}` : 'nothing scheduled')],
      }), anim);

      // week by week
      const s0 = weekStartOf(startOfToday(), ws());
      const wk = Array.from({ length: 8 }, (_, i) => {
        const s = addDays(s0, (i - 7) * 7);
        const r = rangeStats({ start: s, end: addDays(s, 6), startK: keyOf(s), endK: keyOf(addDays(s, 6)) }, view.habit);
        return { s, r };
      });
      paint('weeks', weeksHost, (w, a) => barChart(w, a, {
        compare: false, height: 200,
        data: wk.map(({ s, r }, i) => ({
          label: i === 7 ? 'Now' : fmtShort(s).split(' ').reverse().join(' '), value: r.rate, highlight: i === 7,
          tip: () => [tipTitle(i === 7 ? 'This week' : `Week of ${fmtShort(s)}`), tipRow('Completion', r.rate == null ? 'no data' : pct(r.rate)), tipRow('Habits done', fmtNum(r.done)), tipRow('Perfect days', r.perfect)],
        })),
      }), anim);
      const past = wk.slice(0, 7).map((x) => x.r.rate).filter((v) => v != null);
      const pastAvg = past.length ? past.reduce((a, b) => a + b, 0) / past.length : null;
      const now = wk[7].r.rate;
      weeksFacts.textContent = now == null ? 'Nothing logged this week yet.'
        : pastAvg == null ? `This week: ${pct(now)}. Keep going to build a comparison.`
          : `This week you’re at ${pct(now)}, ${now >= pastAvg ? `${Math.round((now - pastAvg) * 100)} points above` : `${Math.round((pastAvg - now) * 100)} points below`} your ${plural(past.length, 'week')} average of ${pct(pastAvg)}.`;
    }
    // Hosts must be in the DOM to measure, so draw on the next frame.
    nextFrame(() => redraw(animate));
    this._redraw = redraw;
  },
  update() { if (this._redraw) this._redraw(false); },
};
