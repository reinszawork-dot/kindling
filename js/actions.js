/* Shared interactions: logging, timers, celebrations, badge/goal checks. */
import { state, save, persist, byId, setCountRaw, setStatusRaw, pushFeed } from './store.js';
import { dayProgress, isDone, countOf, periods, agg, earnedBadges, levelTitle, goalProgress, isWeekly } from './stats.js';
import { toast, confetti } from './ui.js';
import { BADGES, STREAK_MILESTONES } from './data.js';
import { parseKey, todayKey, fmtClock, isValidKey } from './util.js';

export const feedEvent = () => dispatchEvent(new Event('kindling:feed'));
const feed = (item) => { pushFeed(item); feedEvent(); };

/** The row the user just touched gets a one-off "pop" animation (others don't replay). */
export let lastTouched = null;
export const consumeTouched = (id, k) => { const hit = lastTouched && lastTouched.id === id && lastTouched.k === k; if (hit) lastTouched = null; return hit; };

export function change(k, fn, id = null) {
  const d = parseKey(k);
  const before = dayProgress(d);
  fn();
  lastTouched = id ? { id, k } : null;
  save({ k, habit: id });
  const after = dayProgress(d);
  if (k === todayKey() && after.total && after.done === after.total && before.done < before.total) {
    confetti({ count: 70 });
    toast('A perfect day. Every habit done ✨');
    feed({ type: 'perfect', text: `Perfect day: all ${after.total} habits done.` });
  }
  if (id) checkStreakMilestone(byId(id));
  scheduleChecks();
}

export const setCount = (h, k, n) => change(k, () => setCountRaw(h, k, n), h.id);
export const setStatus = (h, k, s) => change(k, () => setStatusRaw(h, k, s), h.id);
export function toggle(h, k) {
  if (h.kind === 'quit') return setStatus(h, k, countOf(h, k) ? 'none' : 'miss');
  return setStatus(h, k, isDone(h, k) ? 'none' : 'done');
}

/* ---------- streak milestones ---------- */
function currentStreakWithStart(h) {
  const ps = periods(h);
  let n = 0, start = null;
  for (let i = ps.length - 1; i >= 0; i--) {
    if (ps[i].status === 'hit') { n++; start = ps[i].k; } else if (ps[i].status === 'miss') break;
  }
  return { n, start };
}
function checkStreakMilestone(h) {
  if (!h || isWeekly(h)) return;
  const { n, start } = currentStreakWithStart(h);
  if (!STREAK_MILESTONES.includes(n)) return;
  const tag = `${start}:${n}`;
  if (state.milestonesSeen[h.id] === tag) return;
  state.milestonesSeen[h.id] = tag;
  persist();
  const what = h.kind === 'quit' ? `${n} days clean` : `${n}-day streak`;
  confetti({ count: 80 });
  toast(`${h.emoji} ${what} on ${h.name}`);
  feed({ type: 'streak', text: `${h.emoji} ${what} on ${h.name}.` });
}

/* ---------- badges, levels, goals ---------- */
let checkTimer = null;
export const scheduleChecks = () => { clearTimeout(checkTimer); checkTimer = setTimeout(runChecks, 400); };
export function runChecks() {
  // Goals complete themselves when their progress reaches 100%.
  for (const g of state.goals) {
    if (g.completedAt || g.archived || (!g.target && !g.milestones.length)) continue;
    if (goalProgress(g).pct >= 1) {
      g.completedAt = todayKey();
      save({ goal: g.id });
      confetti({ count: 110 });
      toast(`${g.emoji} Goal complete: ${g.title}`);
      feed({ type: 'goal', text: `${g.emoji} You completed “${g.title}”.` });
    }
  }
  const a = agg();
  const earned = earnedBadges();
  if (state.badgesSeen == null || state.levelSeen == null) { // first run: record silently
    state.badgesSeen = earned; state.levelSeen = a.level; persist(); return;
  }
  const fresh = earned.filter((id) => !state.badgesSeen.includes(id));
  const levelUp = a.level > state.levelSeen;
  if (!fresh.length && !levelUp) return;
  state.badgesSeen = [...new Set([...state.badgesSeen, ...earned])];
  if (levelUp) state.levelSeen = a.level;
  persist();
  for (const id of fresh) { const b = BADGES.find((x) => x.id === id); feed({ type: 'badge', text: `${b.e} Badge unlocked: ${b.name}.` }); }
  if (levelUp) feed({ type: 'level', text: `🔥 You reached level ${a.level}: ${levelTitle(a.level)}.` });
  if (fresh.length) {
    const b = BADGES.find((x) => x.id === fresh[0]);
    confetti({ count: 90 });
    toast(`${b.e} Badge unlocked: ${b.name}${fresh.length > 1 ? ` (+${fresh.length - 1} more)` : ''}`, { label: 'View', run: () => { location.hash = '#/achievements'; } }, 5000);
  } else toast(`🔥 Level ${a.level} — ${levelTitle(a.level)}`, { label: 'View', run: () => { location.hash = '#/achievements'; } }, 5000);
}

/* ---------- timer ---------- */
let ticker = null;
export const timerKey = (k, h) => `${k}|${h.id}`;
export const timerRunning = (h, k) => !!(state.timer && state.timer.id === h.id && state.timer.date === k);
export const timerElapsed = () => { const t = state.timer; return t ? t.base + (Date.now() - t.start) / 1000 : 0; };
export const secsDone = (h, k) => (timerRunning(h, k) ? timerElapsed() : (state.secs[timerKey(k, h)] ?? countOf(h, k) * 60));

export function toggleTimer(h, k) {
  if (timerRunning(h, k)) { pauseTimer(); return; }
  if (state.timer) pauseTimer(false);
  state.timer = { id: h.id, date: k, start: Date.now(), base: state.secs[timerKey(k, h)] ?? countOf(h, k) * 60 };
  lastTouched = { id: h.id, k };
  save({ k, habit: h.id });
  startTicker();
}
export function pauseTimer(doSave = true) {
  const t = state.timer;
  if (!t) return;
  const h = byId(t.id);
  const s = timerElapsed();
  state.timer = null;
  if (h) { state.secs[timerKey(t.date, h)] = Math.floor(s); setCountRaw(h, t.date, Math.min(h.target, Math.floor(s / 60))); }
  document.title = 'Kindling';
  if (doSave) save({ k: t.date, habit: t.id });
}
export function startTicker() { if (!ticker) { ticker = setInterval(tick, 1000); tick(); } }
function tick() {
  const t = state.timer;
  if (!t) { clearInterval(ticker); ticker = null; return; }
  const h = byId(t.id);
  if (!h) { state.timer = null; save({}); return; }
  const s = timerElapsed();
  const goal = h.target * 60;
  if (s >= goal) {
    state.timer = null;
    document.title = 'Kindling';
    change(t.date, () => { state.secs[timerKey(t.date, h)] = goal; setCountRaw(h, t.date, h.target); }, h.id);
    toast(`⏱ ${h.emoji} ${h.name}: ${h.target} minutes done`);
    dispatchEvent(new CustomEvent('kindling:timerdone', { detail: { id: h.id, date: t.date } }));
    return;
  }
  for (const node of document.querySelectorAll(`[data-timer="${h.id}"] .tlabel`)) node.textContent = fmtClock(goal - s);
  for (const row of document.querySelectorAll(`[data-row="${h.id}"]`)) row.style.setProperty('--fill', String(Math.min(1, s / goal)));
  document.title = `${fmtClock(goal - s)} · ${h.name}`;
}

/* ---------- from a notification's "Mark done" ---------- */
export function markDone(id, k) {
  const h = byId(id);
  if (!h || h.kind !== 'build' || !isValidKey(k)) return;
  setStatus(h, k, 'done');
  toast(`✓ ${h.emoji} ${h.name} done`);
}
