/* Every number in the app is derived here from real records. Results are memoised per data version. */
import { state, ver, active, byId, allCategories } from './store.js';
import { BADGES, LEVEL_TITLES } from './data.js';
import {
  keyOf, parseKey, addDays, startOfToday, todayKey, daysBetween, weekStartOf, fmtShort, fmtMonth,
} from './util.js';

/* ---------- memo ---------- */
let memoVer = -1;
const memo = new Map();
export function cached(key, fn) {
  if (memoVer !== ver) { memo.clear(); memoVer = ver; }
  const k = `${key}|${todayKey()}|${state.settings.weekStart}`;
  if (memo.has(k)) return memo.get(k);
  const r = fn();
  memo.set(k, r);
  return r;
}

/* ---------- per-day primitives ---------- */
export const ws = () => Number(state.settings.weekStart) || 0;
export const countOf = (h, k) => (state.log[k] && state.log[k][h.id]) || 0;
export const isSkipped = (h, k) => !!(state.skips[k] && state.skips[k].includes(h.id));
export const isMissed = (h, k) => !!(state.missed[k] && state.missed[k].includes(h.id));
export const noteOf = (h, k) => (state.notes[k] && state.notes[k][h.id]) || '';
export const isWeekly = (h) => h.kind === 'build' && h.freq.type === 'weekly';
export const isDone = (h, k) => (h.kind === 'quit' ? countOf(h, k) === 0 : countOf(h, k) >= h.target);
export const pausedOn = (h, k) => h.pauses.some((p) => k >= p.from && (p.to == null || k <= p.to));
export const unitOf = (h) => (h.timer ? 'min' : h.unit);

export function isDue(h, d) {
  const k = keyOf(d);
  if (k < h.createdAt || pausedOn(h, k)) return false;
  if (h.kind === 'quit') return true;
  const f = h.freq;
  if (f.type === 'days') return f.days.includes(d.getDay());
  if (f.type === 'interval') return daysBetween(parseKey(h.createdAt), d) % f.every === 0;
  return true;
}

export function weekDoneCount(h, d, beforeOnly = false) {
  const k0 = keyOf(d);
  const s = weekStartOf(d, ws());
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const k = keyOf(addDays(s, i));
    if (k > k0 || (beforeOnly && k === k0)) break;
    if (isDone(h, k) && countOf(h, k) > 0) n++;
  }
  return n;
}

/** Does this habit count toward a day's completion total? */
export function inProgress(h, d) {
  const k = keyOf(d);
  if (!isDue(h, d)) return false;
  if (h.kind === 'build' && isSkipped(h, k)) return false;
  if (isWeekly(h)) return isDone(h, k) || weekDoneCount(h, d, true) < h.freq.times;
  return true;
}

const pool = (filter) => {
  if (!filter) return active();
  const h = byId(filter);
  return h ? [h] : [];
};

export function dayProgress(d, filter = null) {
  const k = keyOf(d);
  return cached(`dp:${k}:${filter || ''}`, () => {
    const list = pool(filter).filter((h) => inProgress(h, d));
    const done = list.filter((h) => isDone(h, k)).length;
    return { k, total: list.length, done, pct: list.length ? done / list.length : 0 };
  });
}

/** Visual status of one habit on one day. */
export function dayStatus(h, d) {
  const k = keyOf(d);
  if (d > startOfToday()) return 'future';
  if (k < h.createdAt) return 'before';
  if (pausedOn(h, k)) return 'paused';
  const c = countOf(h, k);
  if (h.kind === 'quit') return c > 0 ? 'slip' : 'on';
  if (c >= h.target) return 'on';
  if (isSkipped(h, k)) return 'skip';
  if (isMissed(h, k)) return 'miss';
  if (c > 0) return 'partial';
  if (!isDue(h, d)) return 'rest';
  if (isWeekly(h)) return 'none';
  return k === todayKey() ? 'none' : 'miss';
}

/* ---------- streaks, strength, rates ---------- */
export function periods(h) {
  return cached(`p:${h.id}`, () => {
    const out = [];
    const t = startOfToday();
    const tk = keyOf(t);
    const start = parseKey(h.createdAt);
    if (start > t) return out;
    if (isWeekly(h)) {
      for (let s = weekStartOf(start, ws()); s <= t; s = addDays(s, 7)) {
        let done = 0, skip = 0, possible = 0;
        for (let i = 0; i < 7; i++) {
          const d = addDays(s, i); const k = keyOf(d);
          if (k < h.createdAt || pausedOn(h, k)) continue;
          possible++;
          if (d > t) continue;
          if (isDone(h, k) && countOf(h, k) > 0) done++; else if (isSkipped(h, k)) skip++;
        }
        const need = Math.max(0, Math.min(h.freq.times, possible - skip));
        const k = keyOf(s);
        const value = need ? Math.min(1, done / need) : 1;
        if (!need) out.push({ k, status: 'excused', value });
        else if (done >= need) out.push({ k, status: 'hit', value: 1 });
        else if (addDays(s, 6) >= t) out.push({ k, status: 'open', value });
        else out.push({ k, status: 'miss', value });
      }
      return out;
    }
    for (let d = start; d <= t; d = addDays(d, 1)) {
      if (!isDue(h, d)) continue;
      const k = keyOf(d);
      const c = countOf(h, k);
      if (h.kind === 'quit') { out.push({ k, status: c > 0 ? 'miss' : 'hit', value: c > 0 ? 0 : 1 }); continue; }
      if (c >= h.target) out.push({ k, status: 'hit', value: 1 });
      else if (isSkipped(h, k)) out.push({ k, status: 'excused', value: 0 });
      else if (isMissed(h, k)) out.push({ k, status: 'miss', value: Math.min(1, c / h.target) });
      else if (k === tk) out.push({ k, status: 'open', value: c / h.target });
      else out.push({ k, status: 'miss', value: Math.min(1, c / h.target) });
    }
    return out;
  });
}

export function streakInfo(h) {
  return cached(`s:${h.id}`, () => {
    const ps = periods(h);
    let best = 0, run = 0, cur = 0;
    for (const p of ps) {
      if (p.status === 'hit') { run++; best = Math.max(best, run); } else if (p.status === 'miss') run = 0;
    }
    for (let i = ps.length - 1; i >= 0; i--) {
      if (ps[i].status === 'hit') cur++; else if (ps[i].status === 'miss') break;
    }
    return { cur, best, unit: isWeekly(h) ? 'week' : 'day' };
  });
}

export function strength(h) {
  return cached(`str:${h.id}`, () => {
    const m = isWeekly(h) ? Math.pow(0.5, 1 / 4) : Math.pow(0.5, 1 / 13);
    let s = 0;
    for (const p of periods(h)) {
      if (p.status === 'excused' || p.status === 'open') continue;
      s = s * m + Math.min(1, p.value) * (1 - m);
    }
    return Math.round(s * 100);
  });
}

/** Completion rate of one habit between two date keys (inclusive). */
export function rateBetween(h, fromK, toK) {
  let hit = 0, miss = 0;
  const from = isWeekly(h) ? keyOf(weekStartOf(parseKey(fromK), ws())) : fromK;
  for (const p of periods(h)) {
    if (p.k < from || p.k > toK) continue;
    if (p.status === 'hit') hit++; else if (p.status === 'miss') miss++;
  }
  return hit + miss ? { rate: hit / (hit + miss), hit, miss } : { rate: null, hit, miss };
}
export const rate = (h, days = 30) => rateBetween(h, keyOf(addDays(startOfToday(), -(days - 1))), todayKey()).rate;

export function streakText(h) {
  const { cur } = streakInfo(h);
  if (h.kind === 'quit') return `${cur} day${cur === 1 ? '' : 's'} clean`;
  if (isWeekly(h)) return `${cur} wk${cur === 1 ? '' : 's'}`;
  return `${cur} day${cur === 1 ? '' : 's'}`;
}

export function scheduleText(h) {
  let s;
  if (h.kind === 'quit') s = 'Every day';
  else if (h.freq.type === 'weekly') s = `${h.freq.times}× a week`;
  else if (h.freq.type === 'interval') s = `Every ${h.freq.every} days`;
  else {
    const k = [...h.freq.days].sort().join('');
    const order = [1, 2, 3, 4, 5, 6, 0];
    s = k === '0123456' ? 'Every day' : k === '12345' ? 'Weekdays' : k === '06' ? 'Weekends'
      : order.filter((d) => h.freq.days.includes(d)).map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
  }
  if (h.kind === 'build' && h.timer) s += ` · ${h.target} min`;
  else if (h.kind === 'build' && h.target > 1) s += ` · ${h.target.toLocaleString()} ${h.unit || 'times'}`;
  return s;
}

/** Weekly completion rates for the last n weeks (oldest first), for sparklines. */
export function weeklyRates(h, n = 8) {
  return cached(`wr:${h.id}:${n}`, () => {
    const s0 = weekStartOf(startOfToday(), ws());
    return Array.from({ length: n }, (_, i) => {
      const s = addDays(s0, (i - n + 1) * 7);
      return rateBetween(h, keyOf(s), keyOf(addDays(s, 6))).rate;
    });
  });
}

export function missedYesterday(h) {
  if (h.kind !== 'build' || isWeekly(h) || h.archived) return false;
  const t = startOfToday();
  const y = addDays(t, -1);
  return isDue(h, y) && dayStatus(h, y) === 'miss' && isDue(h, t) && !isDone(h, keyOf(t)) && !isSkipped(h, keyOf(t)) && !isMissed(h, keyOf(t));
}

/* ---------- ranges (week / month / year) ---------- */
export function rangeFor(type, offset = 0) {
  const t = startOfToday();
  let start, end, label;
  if (type === 'week') {
    start = addDays(weekStartOf(t, ws()), offset * 7);
    end = addDays(start, 6);
    label = offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `${fmtShort(start)} – ${fmtShort(end)}`;
  } else if (type === 'month') {
    start = new Date(t.getFullYear(), t.getMonth() + offset, 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    label = offset === 0 ? 'This month' : fmtMonth(start);
  } else {
    start = new Date(t.getFullYear() + offset, 0, 1);
    end = new Date(start.getFullYear(), 11, 31);
    label = offset === 0 ? 'This year' : String(start.getFullYear());
  }
  return { type, offset, start, end, label, startK: keyOf(start), endK: keyOf(end) };
}

export function rangeStats(range, filter = null) {
  return cached(`rs:${range.startK}:${range.endK}:${filter || ''}`, () => {
    const t = startOfToday();
    const days = [];
    let done = 0, total = 0, perfect = 0, best = null, worst = null;
    for (let d = new Date(range.start); d <= range.end; d = addDays(d, 1)) {
      if (d > t) { days.push({ d, k: keyOf(d), future: true, done: 0, total: 0, pct: null }); continue; }
      const p = dayProgress(d, filter);
      const row = { d, k: p.k, future: false, done: p.done, total: p.total, pct: p.total ? p.pct : null };
      days.push(row);
      if (!p.total) continue;
      done += p.done; total += p.total;
      if (p.done === p.total) perfect++;
      if (!best || p.pct > best.pct || (p.pct === best.pct && p.done > best.done)) best = row;
      if (p.k !== keyOf(t) && (!worst || p.pct < worst.pct)) worst = row;
    }
    const byDow = Array.from({ length: 7 }, () => ({ done: 0, total: 0 }));
    for (const r of days) if (!r.future && r.total) { byDow[r.d.getDay()].done += r.done; byDow[r.d.getDay()].total += r.total; }
    const active = days.filter((r) => r.total);
    return { days, done, total, rate: total ? done / total : null, perfect, best, worst, byDow, activeDays: active.length };
  });
}
export const shiftRange = (r, by = -1) => rangeFor(r.type, r.offset + by);

export function categoryBreakdown(range, filter = null) {
  return cached(`cat:${range.startK}:${range.endK}:${filter || ''}`, () => {
    const t = startOfToday();
    const map = new Map();
    const habits = pool(filter);
    for (let d = new Date(range.start); d <= range.end && d <= t; d = addDays(d, 1)) {
      const k = keyOf(d);
      for (const h of habits) {
        if (!inProgress(h, d)) continue;
        const row = map.get(h.category) || { done: 0, total: 0 };
        row.total++;
        if (isDone(h, k)) row.done++;
        map.set(h.category, row);
      }
    }
    return allCategories()
      .map((c) => ({ ...c, ...(map.get(c.id) || { done: 0, total: 0 }) }))
      .filter((c) => c.total > 0)
      .map((c) => ({ ...c, rate: c.done / c.total }));
  });
}

export function habitPerformance(range) {
  return cached(`hp:${range.startK}:${range.endK}`, () => {
    const endK = range.end > startOfToday() ? todayKey() : range.endK;
    return active()
      .map((h) => ({ h, ...rateBetween(h, range.startK, endK), strength: strength(h) }))
      .filter((r) => r.rate != null)
      .sort((a, b) => b.rate - a.rate || b.strength - a.strength);
  });
}

/** Completed count per day for the last ~53 weeks (heatmap). */
export function yearActivity(filter = null) {
  return cached(`year:${filter || ''}`, () => {
    const t = startOfToday();
    const start = addDays(weekStartOf(t, ws()), -52 * 7);
    const cells = [];
    let max = 0;
    for (let i = 0; i < 53 * 7; i++) {
      const d = addDays(start, i);
      if (d > t) { cells.push({ d, k: keyOf(d), future: true }); continue; }
      const p = dayProgress(d, filter);
      max = Math.max(max, p.done);
      cells.push({ d, k: p.k, done: p.done, total: p.total, pct: p.pct });
    }
    return { cells, max, start };
  });
}

/* ---------- aggregates ---------- */
export function perfectStats() {
  return cached('perfect', () => {
    const habits = active();
    const empty = { total: 0, streak: 0, weeks: 0, bestRun: 0, consistent: 0 };
    if (!habits.length) return empty;
    const first = habits.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), habits[0].createdAt);
    const t = startOfToday();
    const rows = [];
    for (let d = parseKey(first); d <= t; d = addDays(d, 1)) rows.push(dayProgress(d));
    let total = 0, run = 0, bestRun = 0, consistent = 0;
    for (const p of rows) {
      if (!p.total) continue;
      if (p.pct >= 0.8) consistent++;
      if (p.done === p.total) { total++; run++; bestRun = Math.max(bestRun, run); } else if (p.k !== keyOf(t)) run = 0;
    }
    let streak = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      const p = rows[i];
      if (!p.total) continue;
      if (p.done === p.total) streak++;
      else if (p.k === keyOf(t)) continue;
      else break;
    }
    let weeks = 0;
    for (let s = weekStartOf(parseKey(first), ws()); addDays(s, 6) < t; s = addDays(s, 7)) {
      let any = false, ok = true;
      for (let i = 0; i < 7; i++) {
        const d = addDays(s, i);
        if (keyOf(d) < first) continue;
        const p = dayProgress(d);
        if (!p.total) continue;
        any = true;
        if (p.done < p.total) { ok = false; break; }
      }
      if (any && ok) weeks++;
    }
    return { total, streak, weeks, bestRun, consistent };
  });
}

export function goalProgress(g) {
  return cached(`goal:${g.id}:${g.milestones.map((m) => +m.done).join('')}:${g.target}:${g.habits.join(',')}:${g.start}:${g.deadline}`, () => {
    const t = startOfToday();
    const end = g.deadline && parseKey(g.deadline) < t ? parseKey(g.deadline) : t;
    let checkins = 0;
    const linked = g.habits.map(byId).filter(Boolean);
    for (let d = parseKey(g.start); d <= end; d = addDays(d, 1)) {
      const k = keyOf(d);
      for (const h of linked) {
        if (keyOf(d) < h.createdAt) continue;
        if (h.kind === 'build' ? countOf(h, k) >= h.target : isDue(h, d) && countOf(h, k) === 0) checkins++;
      }
    }
    const parts = [];
    if (g.target > 0) parts.push(Math.min(1, checkins / g.target));
    const msDone = g.milestones.filter((m) => m.done).length;
    if (g.milestones.length) parts.push(msDone / g.milestones.length);
    const pctV = g.completedAt ? 1 : parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
    let daysLeft = null, onTrack = null;
    if (g.deadline) {
      daysLeft = daysBetween(t, parseKey(g.deadline));
      const span = Math.max(1, daysBetween(parseKey(g.start), parseKey(g.deadline)));
      const elapsed = Math.min(span, Math.max(0, daysBetween(parseKey(g.start), t)));
      onTrack = pctV >= (elapsed / span) * 0.9;
    }
    return { pct: pctV, checkins, msDone, msTotal: g.milestones.length, daysLeft, onTrack, linked };
  });
}

export function agg() {
  return cached('agg', () => {
    const ids = new Map(state.habits.map((h) => [h.id, h]));
    let checkins = 0, timerDone = 0;
    for (const day of Object.values(state.log)) for (const [id, n] of Object.entries(day)) {
      const h = ids.get(id);
      if (h && h.kind === 'build' && n >= h.target) { checkins++; if (h.timer) timerDone++; }
    }
    let notes = 0;
    for (const day of Object.values(state.notes)) notes += Object.values(day).filter(Boolean).length;
    const moodDays = Object.keys(state.mood).length;
    let bestStreak = 0, bestClean = 0, comebacks = 0, cleanDays = 0, bestWeekStreak = 0;
    for (const h of state.habits) {
      const s = streakInfo(h);
      const ps = periods(h);
      if (h.kind === 'quit') { bestClean = Math.max(bestClean, s.best); cleanDays += ps.filter((p) => p.status === 'hit').length; }
      else if (isWeekly(h)) bestWeekStreak = Math.max(bestWeekStreak, s.best);
      else {
        bestStreak = Math.max(bestStreak, s.best);
        for (let i = 1; i < ps.length; i++) if (ps[i].status === 'hit' && ps[i - 1].status === 'miss') comebacks++;
      }
    }
    const p = perfectStats();
    const goalsDone = state.goals.filter((g) => g.completedAt).length;
    const xp = checkins * 10 + p.total * 25 + p.weeks * 100 + notes * 2 + moodDays * 3 + cleanDays * 3 + goalsDone * 150;
    const level = Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
    return {
      checkins, timerDone, notes, moodDays, bestStreak, bestClean, bestWeekStreak, comebacks, cleanDays, goalsDone,
      perfectDays: p.total, perfectWeeks: p.weeks, consistentDays: p.consistent, habits: active().length, xp, level,
    };
  });
}
export const levelFloor = (L) => 50 * L * (L - 1);
export const levelTitle = (L) => LEVEL_TITLES[Math.min(L - 1, LEVEL_TITLES.length - 1)];
export const earnedBadges = () => { const a = agg(); return BADGES.filter((b) => b.test(a)).map((b) => b.id); };

/** Personal records across all history. */
export function records() {
  return cached('records', () => {
    let streak = { value: 0, habit: null }, clean = { value: 0, habit: null };
    for (const h of state.habits) {
      const s = streakInfo(h).best;
      if (h.kind === 'quit') { if (s > clean.value) clean = { value: s, habit: h }; }
      else if (!isWeekly(h) && s > streak.value) streak = { value: s, habit: h };
    }
    let bestDay = { value: 0, k: null };
    const habits = active();
    let bestWeek = { value: null, start: null };
    if (habits.length) {
      const first = habits.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), habits[0].createdAt);
      const t = startOfToday();
      for (let d = parseKey(first); d <= t; d = addDays(d, 1)) {
        const p = dayProgress(d);
        if (p.done > bestDay.value) bestDay = { value: p.done, k: p.k };
      }
      for (let s = weekStartOf(parseKey(first), ws()); addDays(s, 6) < t; s = addDays(s, 7)) {
        let dn = 0, tt = 0;
        for (let i = 0; i < 7; i++) { const p = dayProgress(addDays(s, i)); dn += p.done; tt += p.total; }
        if (tt && (bestWeek.value == null || dn / tt > bestWeek.value)) bestWeek = { value: dn / tt, start: s };
      }
    }
    return { streak, clean, bestDay, bestWeek, perfectRun: perfectStats().bestRun, checkins: agg().checkins };
  });
}

/** Headline numbers for the dashboard. */
export function overview() {
  return cached('overview', () => {
    let cur = { value: 0, habit: null };
    for (const h of active()) {
      if (h.kind !== 'build' || isWeekly(h)) continue;
      const s = streakInfo(h).cur;
      if (s > cur.value) cur = { value: s, habit: h };
    }
    const week = rangeStats(rangeFor('week', 0));
    const lastWeek = rangeStats(rangeFor('week', -1));
    const goals = state.goals.filter((g) => !g.archived && !g.completedAt);
    const goalAvg = goals.length ? goals.reduce((s, g) => s + goalProgress(g).pct, 0) / goals.length : null;
    return { cur, longest: records().streak, week, lastWeek, total: agg().checkins, bestDay: records().bestDay, goals, goalAvg };
  });
}
