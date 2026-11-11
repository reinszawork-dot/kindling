/* State, persistence, migration and all mutations. Views never write state directly. */
import { COLORS, LEGACY_COLORS, CATEGORIES, EMOJI_CATEGORY, SECTIONS } from './data.js';
import { todayKey, uid, isValidKey, keyOf, addDays, startOfToday } from './util.js';

export const STORAGE_KEY = 'kindling.v1'; // same key as before so existing data carries over
const SCHEMA = 3;
const ALL = [0, 1, 2, 3, 4, 5, 6];

export const blank = () => ({
  v: SCHEMA,
  habits: [], log: {}, skips: {}, missed: {}, notes: {}, mood: {}, secs: {}, stamps: {},
  timer: null, notified: {}, badgesSeen: null, levelSeen: null, milestonesSeen: {},
  goals: [], categories: [], feed: [],
  profile: { name: '', avatar: null },
  settings: { theme: null, weekStart: 1, units: 'metric', notifications: true, defaultReminder: '09:00', sidebarCollapsed: false },
});

/* ---------- normalisation / migration ---------- */
export function normHabit(h, i = 0) {
  const days = Array.isArray(h.days) && h.days.length ? h.days : ALL.slice();
  let freq = h.freq && typeof h.freq === 'object' ? { ...h.freq } : { type: 'days', days };
  if (freq.type === 'weekly') freq = { type: 'weekly', times: Math.min(7, Math.max(1, Number(freq.times) || 3)) };
  else if (freq.type === 'interval') freq = { type: 'interval', every: Math.min(30, Math.max(2, Number(freq.every) || 2)) };
  else freq = { type: 'days', days: Array.isArray(freq.days) && freq.days.length ? [...new Set(freq.days.map(Number))].filter((d) => d >= 0 && d <= 6) : ALL.slice() };
  const color = LEGACY_COLORS[String(h.color || '').toLowerCase()] || (COLORS.includes(h.color) ? h.color : h.color || COLORS[i % COLORS.length]);
  const kind = h.kind === 'quit' ? 'quit' : 'build';
  return {
    id: h.id || uid(),
    name: String(h.name || 'Habit').trim().slice(0, 40) || 'Habit',
    emoji: h.emoji || '✨',
    color,
    kind,
    category: h.category || EMOJI_CATEGORY[h.emoji] || 'other',
    freq,
    section: SECTIONS.some((s) => s.id === h.section) ? h.section : 'anytime',
    time: /^\d{2}:\d{2}$/.test(h.time || '') ? h.time : null,
    target: kind === 'quit' ? 1 : Math.max(1, Math.min(100000, Math.round(Number(h.target)) || 1)),
    unit: h.timer ? 'min' : String(h.unit || '').slice(0, 16),
    timer: kind === 'build' && !!h.timer,
    reminders: (Array.isArray(h.reminders) ? h.reminders : h.reminder ? [h.reminder] : []).filter((t) => /^\d{2}:\d{2}$/.test(t)),
    createdAt: isValidKey(h.createdAt) ? h.createdAt : todayKey(), // = start date
    archived: !!h.archived,
    pauses: Array.isArray(h.pauses) ? h.pauses.filter((p) => isValidKey(p.from) && (p.to == null || isValidKey(p.to))) : [],
    order: Number.isFinite(h.order) ? h.order : i,
  };
}

function normGoal(g) {
  return {
    id: g.id || uid(),
    title: String(g.title || 'Goal').trim().slice(0, 60) || 'Goal',
    emoji: g.emoji || '🎯',
    why: String(g.why || '').slice(0, 280),
    start: isValidKey(g.start) ? g.start : todayKey(),
    deadline: isValidKey(g.deadline) ? g.deadline : null,
    habits: Array.isArray(g.habits) ? g.habits : [],
    target: Math.max(0, Math.round(Number(g.target) || 0)), // check-ins of linked habits; 0 = not used
    milestones: Array.isArray(g.milestones) ? g.milestones.map((m) => ({ id: m.id || uid(), text: String(m.text || '').slice(0, 80), done: !!m.done })).filter((m) => m.text) : [],
    completedAt: isValidKey(g.completedAt) ? g.completedAt : null,
    archived: !!g.archived,
    createdAt: g.createdAt || todayKey(),
  };
}

export function hydrate(s) {
  const b = blank();
  const st = { ...b, ...s };
  for (const k of ['log', 'skips', 'missed', 'notes', 'mood', 'secs', 'stamps', 'notified', 'milestonesSeen']) if (!st[k] || typeof st[k] !== 'object' || Array.isArray(st[k])) st[k] = {};
  st.habits = (Array.isArray(st.habits) ? st.habits : []).map(normHabit);
  st.goals = (Array.isArray(st.goals) ? st.goals : []).map(normGoal);
  st.categories = (Array.isArray(st.categories) ? st.categories : []).filter((c) => c && c.id && c.name);
  st.feed = Array.isArray(st.feed) ? st.feed.slice(0, 60) : [];
  st.profile = { ...b.profile, ...(st.profile || {}) };
  st.settings = { ...b.settings, ...(st.settings || {}) };
  if (s.theme && !st.settings.theme) st.settings.theme = s.theme; // v2 kept theme at the top level
  delete st.theme;
  st.v = SCHEMA;
  return st;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? hydrate(JSON.parse(raw)) : blank();
  } catch { return blank(); }
}

export let state = load();

/* ---------- change tracking ---------- */
export let ver = 0;
const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
let storageOk = true;
export const storageHealthy = () => storageOk;

export function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageOk = true; } catch { storageOk = false; }
}
export function save(info = {}) {
  ver++;
  persist();
  for (const fn of listeners) fn(info);
}
export function replaceState(next) { state = hydrate(next); save({ reset: true }); }

/* ---------- lookups ---------- */
export const byId = (id) => state.habits.find((h) => h.id === id);
export const active = () => state.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);
export const allCategories = () => [...CATEGORIES, ...state.categories];
export const categoryOf = (id) => allCategories().find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
export const isPaused = (h) => h.pauses.some((p) => p.to == null);

/* ---------- day records ---------- */
const listOn = (map, k) => map[k] || [];
const setIn = (map, k, id, on) => {
  const list = listOn(map, k).filter((x) => x !== id);
  if (on) list.push(id);
  if (list.length) map[k] = list; else delete map[k];
};
const objSet = (map, k, id, v) => {
  if (!map[k]) map[k] = {};
  if (v == null || v === '' || v === 0) delete map[k][id]; else map[k][id] = v;
  if (!Object.keys(map[k]).length) delete map[k];
};

/** Raw count write (no save). Clears skip/missed when progress is logged, stamps completion time. */
export function setCountRaw(h, k, n) {
  n = Math.max(0, Math.min(Math.round(Number(n) || 0), h.kind === 'quit' ? 1 : h.target * 100));
  const was = (state.log[k] && state.log[k][h.id]) || 0;
  objSet(state.log, k, h.id, n);
  if (h.kind === 'build') {
    if (n > 0) { setIn(state.skips, k, h.id, false); setIn(state.missed, k, h.id, false); }
    if (n >= h.target && was < h.target) objSet(state.stamps, k, h.id, new Date().toISOString());
    if (n < h.target) objSet(state.stamps, k, h.id, null);
    if (h.timer) {
      const sk = `${k}|${h.id}`;
      if (n >= h.target) state.secs[sk] = h.target * 60; else if (n === 0) delete state.secs[sk];
    }
  } else if (n > 0) objSet(state.stamps, k, h.id, new Date().toISOString());
  else objSet(state.stamps, k, h.id, null);
}

/** Set a day's status explicitly: 'done' | 'skip' | 'miss' | 'none'. For quit habits 'miss' = slipped. */
export function setStatusRaw(h, k, status) {
  if (h.kind === 'quit') {
    setCountRaw(h, k, status === 'miss' ? 1 : 0);
    setIn(state.skips, k, h.id, false);
    setIn(state.missed, k, h.id, false);
    return;
  }
  if (status === 'done') { setCountRaw(h, k, h.target); return; }
  setCountRaw(h, k, 0);
  setIn(state.skips, k, h.id, status === 'skip');
  setIn(state.missed, k, h.id, status === 'miss');
}

export const setNote = (h, k, text) => { objSet(state.notes, k, h.id, String(text || '').trim().slice(0, 500)); save({ k }); };
export const setMood = (k, v) => { if (state.mood[k] === v) delete state.mood[k]; else state.mood[k] = v; save({ k }); };

/* ---------- habits ---------- */
export function addHabit(h) {
  const order = state.habits.reduce((m, x) => Math.max(m, x.order), -1) + 1;
  const habit = normHabit({ ...h, id: uid(), archived: false, pauses: [], order });
  state.habits.push(habit);
  save({ habit: habit.id });
  return habit;
}
export function updateHabit(id, patch) {
  const h = byId(id);
  if (!h) return null;
  const next = normHabit({ ...h, ...patch, id: h.id, order: h.order, archived: h.archived, pauses: h.pauses });
  Object.assign(h, next);
  if (state.timer && state.timer.id === h.id && !h.timer) state.timer = null;
  for (const day of Object.values(state.log)) if (day[h.id] > h.target * 100) day[h.id] = h.target * 100;
  save({ habit: h.id });
  return h;
}
export function setPaused(id, on) {
  const h = byId(id);
  if (!h) return;
  const t = todayKey();
  if (on && !isPaused(h)) h.pauses.push({ from: t, to: null });
  if (!on) {
    const p = h.pauses.find((x) => x.to == null);
    if (p) {
      const y = keyOf(addDays(startOfToday(), -1));
      if (p.from > y) h.pauses = h.pauses.filter((x) => x !== p); // paused and resumed the same day: no gap
      else p.to = y;
    }
  }
  save({ habit: id });
}
export function setArchived(id, on) { const h = byId(id); if (h) { h.archived = on; save({ habit: id }); } }
export function deleteHabit(id) {
  state.habits = state.habits.filter((x) => x.id !== id);
  for (const map of [state.log, state.notes, state.stamps]) for (const [k, day] of Object.entries(map)) { delete day[id]; if (!Object.keys(day).length) delete map[k]; }
  for (const map of [state.skips, state.missed]) for (const k of Object.keys(map)) setIn(map, k, id, false);
  for (const k of Object.keys(state.secs)) if (k.endsWith(`|${id}`)) delete state.secs[k];
  for (const g of state.goals) g.habits = g.habits.filter((x) => x !== id);
  if (state.timer && state.timer.id === id) state.timer = null;
  save({ habit: id });
}
export function reorder(ids) { ids.forEach((id, i) => { const h = byId(id); if (h) h.order = i; }); save({}); }

/* ---------- categories ---------- */
export function addCategory(name, color) {
  const id = 'c_' + uid();
  state.categories.push({ id, name: String(name).trim().slice(0, 24), color: color || COLORS[state.categories.length % COLORS.length] });
  save({});
  return id;
}

/* ---------- goals ---------- */
export function saveGoal(g) {
  const goal = normGoal(g);
  const i = state.goals.findIndex((x) => x.id === goal.id);
  if (i >= 0) state.goals[i] = { ...goal, completedAt: state.goals[i].completedAt };
  else state.goals.push(goal);
  save({ goal: goal.id });
  return goal;
}
export function patchGoal(id, patch) { const g = state.goals.find((x) => x.id === id); if (g) { Object.assign(g, patch); save({ goal: id }); } }
export function deleteGoal(id) { state.goals = state.goals.filter((g) => g.id !== id); save({ goal: id }); }

/* ---------- profile / settings / feed ---------- */
export function setProfile(patch) { Object.assign(state.profile, patch); save({ profile: true }); }
export function setSetting(key, value) { state.settings[key] = value; save({ settings: key }); }
export function pushFeed(item) {
  state.feed.unshift({ id: uid(), at: new Date().toISOString(), read: false, ...item });
  state.feed = state.feed.slice(0, 60);
  persist();
}
export function markFeedRead() { state.feed.forEach((f) => { f.read = true; }); persist(); }
