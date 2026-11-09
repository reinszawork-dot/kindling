/* Kindling — a tiny, dependency-free habit tracker. Data lives in localStorage. */
(() => {
  'use strict';

  /* ================= constants ================= */
  const STORAGE_KEY = 'kindling.v1';
  const COLORS = ['#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#78716c'];
  const EMOJIS = ['💧', '🏃', '📚', '🧘', '🥗', '😴', '✍️', '🎸', '💊', '🧹', '🚶', '💪', '🏋️', '🤸', '🌱', '🪴', '☀️', '🦷', '🍎', '🧠', '💰', '🎨', '🙏', '🚴', '🐶', '☕', '🗓️', '📞', '📵', '🚭', '🍷', '🍔', '📱', '🛏️', '🧊', '🎯'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
  const ALL = [0, 1, 2, 3, 4, 5, 6];
  const SECTIONS = [
    { id: 'morning', label: 'Morning', icon: '☀️' },
    { id: 'afternoon', label: 'Afternoon', icon: '🌤' },
    { id: 'evening', label: 'Evening', icon: '🌙' },
    { id: 'anytime', label: 'Anytime', icon: '✨' },
  ];
  const MOODS = [
    { v: 1, e: '😞', l: 'Rough' }, { v: 2, e: '🙁', l: 'Meh' }, { v: 3, e: '😐', l: 'Okay' },
    { v: 4, e: '🙂', l: 'Good' }, { v: 5, e: '😄', l: 'Great' },
  ];
  const LEVEL_TITLES = ['Spark', 'Kindle', 'Ember', 'Flicker', 'Flame', 'Blaze', 'Bonfire', 'Beacon', 'Wildfire', 'Inferno', 'Supernova'];
  const TEMPLATES = [
    { name: 'Drink water', emoji: '💧', color: '#0ea5e9', target: 8, unit: 'glasses' },
    { name: 'Move 30 min', emoji: '🏃', color: '#f97316', target: 30, timer: true, section: 'morning' },
    { name: 'Meditate', emoji: '🧘', color: '#14b8a6', target: 10, timer: true, section: 'morning' },
    { name: 'Read', emoji: '📚', color: '#a855f7', target: 20, unit: 'pages', section: 'evening' },
    { name: 'Journal', emoji: '✍️', color: '#eab308', section: 'evening' },
    { name: 'Take vitamins', emoji: '💊', color: '#ec4899', section: 'morning' },
    { name: 'Gym', emoji: '🏋️', color: '#ef4444', freq: { type: 'weekly', times: 3 } },
    { name: 'No phone in bed', emoji: '📵', color: '#6366f1', kind: 'quit', section: 'evening' },
    { name: '10k steps', emoji: '🚶', color: '#22c55e', target: 10000, unit: 'steps' },
    { name: 'Plan tomorrow', emoji: '🗓️', color: '#78716c', section: 'evening', freq: { type: 'days', days: [1, 2, 3, 4, 5] } },
    { name: 'Deep work', emoji: '🧠', color: '#6366f1', target: 90, timer: true, freq: { type: 'days', days: [1, 2, 3, 4, 5] } },
    { name: 'Stretch', emoji: '🤸', color: '#14b8a6', target: 10, timer: true },
    { name: 'Gratitude', emoji: '🙏', color: '#eab308', target: 3, unit: 'things', section: 'evening' },
    { name: 'Call family', emoji: '📞', color: '#0ea5e9', freq: { type: 'weekly', times: 1 } },
    { name: 'Water plants', emoji: '🪴', color: '#22c55e', freq: { type: 'interval', every: 3 } },
    { name: 'No smoking', emoji: '🚭', color: '#78716c', kind: 'quit' },
    { name: 'No alcohol', emoji: '🍷', color: '#ef4444', kind: 'quit' },
    { name: 'No junk food', emoji: '🍔', color: '#f97316', kind: 'quit' },
    { name: 'No doomscrolling', emoji: '📱', color: '#a855f7', kind: 'quit' },
  ];
  const BADGES = [
    { id: 'first', e: '✨', name: 'First spark', desc: 'Complete your first habit', test: (a) => a.checkins >= 1 },
    { id: 'perfect1', e: '💯', name: 'Perfect day', desc: 'Finish every habit in a day', test: (a) => a.perfectDays >= 1 },
    { id: 'streak7', e: '🔥', name: 'Week warrior', desc: 'Reach a 7-day streak', test: (a) => a.bestStreak >= 7 },
    { id: 'comeback', e: '🔁', name: 'Never miss twice', desc: 'Bounce back the day after a miss', test: (a) => a.comebacks >= 1 },
    { id: 'pweek', e: '🗓️', name: 'Perfect week', desc: 'A full week with every habit done', test: (a) => a.perfectWeeks >= 1 },
    { id: 'h5', e: '🎒', name: 'Collector', desc: 'Track 5 habits at once', test: (a) => a.habits >= 5 },
    { id: 'timer', e: '⏱', name: 'In the zone', desc: 'Finish a timed habit', test: (a) => a.timerDone >= 1 },
    { id: 'mood7', e: '🎭', name: 'In tune', desc: 'Log your mood on 7 days', test: (a) => a.moodDays >= 7 },
    { id: 'notes10', e: '📝', name: 'Reflective', desc: 'Write 10 notes', test: (a) => a.notes >= 10 },
    { id: 'c100', e: '💪', name: 'Century', desc: '100 check-ins', test: (a) => a.checkins >= 100 },
    { id: 'perfect10', e: '🌟', name: 'Shining', desc: '10 perfect days', test: (a) => a.perfectDays >= 10 },
    { id: 'streak30', e: '🏆', name: 'Monthly flame', desc: 'Reach a 30-day streak', test: (a) => a.bestStreak >= 30 },
    { id: 'quit30', e: '🛡', name: 'Clean month', desc: '30 days clean on a quit habit', test: (a) => a.bestClean >= 30 },
    { id: 'level5', e: '🔥', name: 'Flame', desc: 'Reach level 5', test: (a) => a.level >= 5 },
    { id: 'c500', e: '🚀', name: 'Unstoppable', desc: '500 check-ins', test: (a) => a.checkins >= 500 },
    { id: 'streak100', e: '👑', name: 'Centurion', desc: 'Reach a 100-day streak', test: (a) => a.bestStreak >= 100 },
  ];

  /* ================= date & format helpers ================= */
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const todayKey = () => keyOf(startOfToday());
  const daysBetween = (a, b) => Math.round((b - a) / 864e5);
  const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
  const fmtLong = (d) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const fmtShort = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  const fmtTime = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
  const fmtClock = (s) => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`; };
  const fmtNum = (n) => Number(n).toLocaleString();
  const plural = (n, w) => `${fmtNum(n)} ${w}${n === 1 ? '' : 's'}`;
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  /* ================= state ================= */
  const blank = () => ({ habits: [], log: {}, skips: {}, notes: {}, mood: {}, secs: {}, timer: null, theme: null, notified: {}, badgesSeen: null, levelSeen: null });

  function normHabit(h, i = 0) {
    const days = Array.isArray(h.days) && h.days.length ? h.days : ALL.slice();
    let freq = h.freq && typeof h.freq === 'object' ? { ...h.freq } : { type: 'days', days };
    if (freq.type === 'weekly') freq = { type: 'weekly', times: Math.min(7, Math.max(1, Number(freq.times) || 3)) };
    else if (freq.type === 'interval') freq = { type: 'interval', every: Math.min(30, Math.max(2, Number(freq.every) || 2)) };
    else freq = { type: 'days', days: Array.isArray(freq.days) && freq.days.length ? freq.days.slice() : ALL.slice() };
    return {
      id: h.id || uid(), name: String(h.name || 'Habit').slice(0, 40), emoji: h.emoji || '✨', color: h.color || COLORS[0],
      kind: h.kind === 'quit' ? 'quit' : 'build', freq,
      section: SECTIONS.some((s) => s.id === h.section) ? h.section : 'anytime',
      target: Math.max(1, Math.round(Number(h.target)) || 1), unit: h.timer ? 'min' : String(h.unit || '').slice(0, 16), timer: !!h.timer,
      reminders: Array.isArray(h.reminders) ? h.reminders.filter((t) => /^\d{2}:\d{2}$/.test(t)) : (h.reminder ? [h.reminder] : []),
      createdAt: h.createdAt || todayKey(), archived: !!h.archived, order: Number.isFinite(h.order) ? h.order : i,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return blank();
      return hydrate(JSON.parse(raw));
    } catch { return blank(); }
  }
  function hydrate(s) {
    const st = { ...blank(), ...s };
    for (const k of ['log', 'skips', 'notes', 'mood', 'secs', 'notified']) if (!st[k] || typeof st[k] !== 'object') st[k] = {};
    st.habits = (Array.isArray(st.habits) ? st.habits : []).map(normHabit);
    return st;
  }

  let state = load();
  let selectedKey = todayKey();
  let weekOffset = 0;
  let view = 'today';

  // Memoize expensive derived data; invalidated on every save.
  let ver = 0;
  const memo = new Map();
  const cached = (key, fn) => {
    const k = `${key}|${todayKey()}`;
    const e = memo.get(k);
    if (e && e.v === ver) return e.r;
    const r = fn();
    memo.set(k, { v: ver, r });
    return r;
  };
  function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } }
  function save() { ver++; persist(); scheduleBadgeCheck(); }

  /* ================= habit model ================= */
  const active = () => state.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);
  const byId = (id) => state.habits.find((h) => h.id === id);
  const countOf = (h, k) => (state.log[k] && state.log[k][h.id]) || 0;
  const isSkipped = (h, k) => !!(state.skips[k] && state.skips[k].includes(h.id));
  const noteOf = (h, k) => (state.notes[k] && state.notes[k][h.id]) || '';
  const isWeekly = (h) => h.kind === 'build' && h.freq.type === 'weekly';
  const isDone = (h, k) => (h.kind === 'quit' ? countOf(h, k) === 0 : countOf(h, k) >= h.target);
  const unitOf = (h) => (h.timer ? 'min' : h.unit);

  function isDue(h, d) {
    if (keyOf(d) < h.createdAt) return false;
    if (h.kind === 'quit') return true;
    const f = h.freq;
    if (f.type === 'days') return f.days.includes(d.getDay());
    if (f.type === 'interval') return daysBetween(parseKey(h.createdAt), d) % f.every === 0;
    return true; // weekly: any day
  }

  function weekDoneCount(h, d, beforeOnly = false) {
    const k0 = keyOf(d);
    let n = 0;
    const m = mondayOf(d);
    for (let i = 0; i < 7; i++) {
      const k = keyOf(addDays(m, i));
      if (k > k0 || (beforeOnly && k === k0)) break;
      if (isDone(h, k)) n++;
    }
    return n;
  }

  // Does this habit count toward the day's progress ring?
  function inProgress(h, d) {
    const k = keyOf(d);
    if (!isDue(h, d)) return false;
    if (h.kind === 'build' && isSkipped(h, k)) return false;
    if (isWeekly(h)) return isDone(h, k) || weekDoneCount(h, d, true) < h.freq.times;
    return true;
  }

  function dayProgress(d) {
    const list = active().filter((h) => inProgress(h, d));
    const k = keyOf(d);
    const done = list.filter((h) => isDone(h, k)).length;
    return { total: list.length, done, pct: list.length ? done / list.length : 0 };
  }

  // Per-day status for dots / heatmaps.
  function dayStatus(h, d) {
    const k = keyOf(d);
    if (d > startOfToday()) return 'future';
    if (k < h.createdAt) return 'before';
    const c = countOf(h, k);
    if (h.kind === 'quit') return c > 0 ? 'slip' : 'on';
    if (c >= h.target) return 'on';
    if (isSkipped(h, k)) return 'skip';
    if (c > 0) return 'partial';
    if (!isDue(h, d)) return 'rest';
    if (isWeekly(h)) return 'none';
    return k === todayKey() ? 'none' : 'miss';
  }

  // Ordered list of "periods" (days, or weeks for weekly habits) with hit/miss/excused/open status.
  function periods(h) {
    return cached(`p:${h.id}`, () => {
      const out = [];
      const t = startOfToday();
      const tk = keyOf(t);
      const start = parseKey(h.createdAt);
      if (start > t) return out;
      if (isWeekly(h)) {
        for (let m = mondayOf(start); m <= t; m = addDays(m, 7)) {
          let done = 0, skip = 0, possible = 0;
          for (let i = 0; i < 7; i++) {
            const d = addDays(m, i); const k = keyOf(d);
            if (k < h.createdAt) continue;
            possible++;
            if (d > t) continue;
            if (isDone(h, k)) done++; else if (isSkipped(h, k)) skip++;
          }
          const need = Math.max(0, Math.min(h.freq.times, possible - skip));
          const k = keyOf(m);
          const value = need ? Math.min(1, done / need) : 1;
          if (!need) out.push({ k, status: 'excused', value });
          else if (done >= need) out.push({ k, status: 'hit', value: 1 });
          else if (addDays(m, 6) >= t) out.push({ k, status: 'open', value });
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
        else if (k === tk) out.push({ k, status: 'open', value: c / h.target });
        else out.push({ k, status: 'miss', value: Math.min(1, c / h.target) });
      }
      return out;
    });
  }

  function streakInfo(h) {
    return cached(`s:${h.id}`, () => {
      const ps = periods(h);
      let best = 0, run = 0, cur = 0;
      for (const p of ps) {
        if (p.status === 'hit') { run++; best = Math.max(best, run); } else if (p.status === 'miss') run = 0;
      }
      for (let i = ps.length - 1; i >= 0; i--) {
        if (ps[i].status === 'hit') cur++; else if (ps[i].status === 'miss') break;
      }
      return { cur, best };
    });
  }

  // Habit strength (inspired by exponential smoothing): one miss dents it, it doesn't reset it.
  function strength(h) {
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

  function rate(h, days = 30) {
    const t = startOfToday();
    let cutoff = keyOf(addDays(t, -(days - 1)));
    if (isWeekly(h)) cutoff = keyOf(mondayOf(parseKey(cutoff)));
    let hit = 0, miss = 0;
    for (const p of periods(h)) {
      if (p.k < cutoff) continue;
      if (p.status === 'hit') hit++; else if (p.status === 'miss') miss++;
    }
    return hit + miss ? hit / (hit + miss) : null;
  }

  function streakText(h) {
    const { cur } = streakInfo(h);
    if (h.kind === 'quit') return `🛡 ${plural(cur, 'day')} clean`;
    if (isWeekly(h)) return `${cur ? '🔥' : '·'} ${cur} wk${cur === 1 ? '' : 's'}`;
    return `${cur ? '🔥' : '·'} ${plural(cur, 'day')}`;
  }

  function scheduleText(h) {
    let s;
    if (h.kind === 'quit') s = 'Quit · every day';
    else if (h.freq.type === 'weekly') s = `${h.freq.times}× a week`;
    else if (h.freq.type === 'interval') s = `Every ${h.freq.every} days`;
    else {
      const k = [...h.freq.days].sort().join('');
      s = k === '0123456' ? 'Every day' : k === '12345' ? 'Weekdays' : k === '06' ? 'Weekends'
        : DOW_ORDER.filter((d) => h.freq.days.includes(d)).map((d) => DOW[d]).join(' · ');
    }
    if (h.kind === 'build' && h.timer) s += ` · ${h.target} min timer`;
    else if (h.kind === 'build' && h.target > 1) s += ` · ${fmtNum(h.target)} ${h.unit || 'times'}`;
    if (h.section !== 'anytime') s += ` · ${SECTIONS.find((x) => x.id === h.section).label}`;
    return s;
  }

  function perfectStats() {
    return cached('perfect', () => {
      const habits = active();
      if (!habits.length) return { total: 0, streak: 0, weeks: 0 };
      const first = habits.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), habits[0].createdAt);
      const t = startOfToday();
      const map = new Map();
      for (let d = parseKey(first); d <= t; d = addDays(d, 1)) map.set(keyOf(d), dayProgress(d));
      let total = 0;
      for (const p of map.values()) if (p.total && p.done === p.total) total++;
      let streak = 0;
      let d = t;
      const p0 = map.get(keyOf(t));
      if (p0 && p0.total && p0.done < p0.total) d = addDays(d, -1);
      for (; keyOf(d) >= first; d = addDays(d, -1)) {
        const p = map.get(keyOf(d));
        if (!p || !p.total) continue;
        if (p.done === p.total) streak++; else break;
      }
      let weeks = 0;
      for (let m = mondayOf(parseKey(first)); addDays(m, 6) < t; m = addDays(m, 7)) {
        let any = false, ok = true;
        for (let i = 0; i < 7; i++) {
          const p = map.get(keyOf(addDays(m, i)));
          if (!p || !p.total) continue;
          any = true;
          if (p.done < p.total) { ok = false; break; }
        }
        if (any && ok) weeks++;
      }
      return { total, streak, weeks };
    });
  }

  function agg() {
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
      let bestStreak = 0, bestClean = 0, comebacks = 0, cleanDays = 0;
      for (const h of state.habits) {
        const s = streakInfo(h);
        const ps = periods(h);
        if (h.kind === 'quit') { bestClean = Math.max(bestClean, s.best); cleanDays += ps.filter((p) => p.status === 'hit').length; }
        else if (!isWeekly(h)) {
          bestStreak = Math.max(bestStreak, s.best);
          for (let i = 1; i < ps.length; i++) if (ps[i].status === 'hit' && ps[i - 1].status === 'miss') comebacks++;
        }
      }
      const p = perfectStats();
      const xp = checkins * 10 + p.total * 25 + p.weeks * 100 + notes * 2 + moodDays * 3 + cleanDays * 3;
      const level = Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
      return { checkins, timerDone, notes, moodDays, bestStreak, bestClean, comebacks, cleanDays, perfectDays: p.total, perfectWeeks: p.weeks, habits: active().length, xp, level };
    });
  }
  const levelFloor = (L) => 50 * L * (L - 1);
  const levelTitle = (L) => LEVEL_TITLES[Math.min(L - 1, LEVEL_TITLES.length - 1)];

  /* ================= mutations ================= */
  function setCountRaw(h, k, n) {
    n = Math.max(0, Math.min(Math.round(n), h.kind === 'quit' ? 1 : h.target * 100));
    if (!state.log[k]) state.log[k] = {};
    if (n === 0) delete state.log[k][h.id]; else state.log[k][h.id] = n;
    if (!Object.keys(state.log[k]).length) delete state.log[k];
    if (n > 0 && h.kind === 'build') setSkip(h, k, false, true);
  }
  function setSkip(h, k, on, raw = false) {
    const list = (state.skips[k] || []).filter((x) => x !== h.id);
    if (on) list.push(h.id);
    if (list.length) state.skips[k] = list; else delete state.skips[k];
    if (!raw) save();
  }
  function setNote(h, k, text) {
    text = text.trim();
    if (!state.notes[k]) state.notes[k] = {};
    if (text) state.notes[k][h.id] = text; else delete state.notes[k][h.id];
    if (!Object.keys(state.notes[k]).length) delete state.notes[k];
    save();
  }
  function setMood(k, v) {
    if (state.mood[k] === v) delete state.mood[k]; else state.mood[k] = v;
    save();
  }

  // Wrap a change so we can celebrate when it completes the day.
  function change(k, fn) {
    const before = dayProgress(parseKey(k));
    fn();
    save();
    const after = dayProgress(parseKey(k));
    render();
    if (after.total && after.done === after.total && before.done < before.total && k === selectedKey && view === 'today') celebrate();
    try { if (navigator.userActivation && navigator.userActivation.hasBeenActive && navigator.vibrate) navigator.vibrate(12); } catch { /* noop */ }
  }
  const setCount = (h, k, n) => change(k, () => {
    setCountRaw(h, k, n);
    if (h.timer) { if (n >= h.target) state.secs[`${k}|${h.id}`] = h.target * 60; else if (n === 0) delete state.secs[`${k}|${h.id}`]; }
  });

  /* ================= DOM helpers ================= */
  const $ = (s) => document.querySelector(s);
  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') n.className = v;
      else if (k === 'style') Object.assign(n.style, v);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k.startsWith('--')) n.style.setProperty(k, v);
      else if (k.startsWith('aria-')) n.setAttribute(k, String(v));
      else if (k === 'value') n.value = v;
      else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c);
    return n;
  };
  const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  let toastTimer;
  function toast(msg, actionLabel, action, ms) {
    const t = $('#toast');
    t.replaceChildren(el('span', {}, msg));
    if (actionLabel) t.append(el('button', { onclick: () => { action(); t.classList.remove('show'); } }, actionLabel));
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || (actionLabel ? 5000 : 2200));
  }

  /* ================= render: Today ================= */
  function render() {
    $('#todayLabel').textContent = startOfToday().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    applyTheme();
    const a = agg();
    $('#levelChip').textContent = `🔥 Lv ${a.level}`;
    $('#levelChip').title = `Level ${a.level} · ${levelTitle(a.level)} · ${fmtNum(a.xp)} XP`;
    $('#levelChip').hidden = !state.habits.length;
    if (view === 'today') renderToday(); else renderStats();
  }

  function renderWeek() {
    const today = startOfToday();
    const monday = addDays(mondayOf(today), weekOffset * 7);
    const wrap = $('#weekDays');
    wrap.replaceChildren();
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      const k = keyOf(d);
      const p = dayProgress(d);
      const cls = ['day'];
      if (k === selectedKey) cls.push('selected');
      if (k === todayKey()) cls.push('today');
      if (p.total && p.done === p.total) cls.push('full');
      wrap.append(el('button', {
        class: cls.join(' '), disabled: d > today, '--p': Math.round(p.pct * 100),
        'aria-label': `${fmtLong(d)}: ${p.done} of ${p.total} done`, 'aria-pressed': k === selectedKey,
        onclick: () => { selectedKey = k; renderToday(); },
      }, el('span', { class: 'dow' }, DOW[d.getDay()].slice(0, 2)), el('span', { class: 'num' }, el('span', {}, d.getDate())),
      state.mood[k] ? el('span', { class: 'day-mood' }, MOODS[state.mood[k] - 1].e) : null));
    }
    $('#weekNext').disabled = weekOffset >= 0;
  }

  function missedYesterday(h) {
    if (h.kind !== 'build' || isWeekly(h)) return false;
    const t = startOfToday();
    const y = addDays(t, -1);
    return isDue(h, y) && dayStatus(h, y) === 'miss' && !isDone(h, keyOf(t)) && isDue(h, t) && !isSkipped(h, keyOf(t));
  }

  function renderHero() {
    const d = parseKey(selectedKey);
    const p = dayProgress(d);
    const isToday = selectedKey === todayKey();
    const when = isToday ? 'today' : `on ${fmtShort(d)}`;
    $('#ringFill').style.strokeDashoffset = String(326.73 * (1 - p.pct));
    $('#ringPct').textContent = `${Math.round(p.pct * 100)}%`;
    $('#ringCount').textContent = `${p.done} / ${p.total}`;
    let title, msg;
    if (!p.total) { title = 'Rest day'; msg = `Nothing scheduled ${when}. Enjoy it.`; }
    else if (p.done === p.total) { title = isToday ? 'All lit up 🔥' : 'Perfect day'; msg = `Every habit done ${when}.`; }
    else if (p.done === 0) { title = isToday ? "Let's get going" : fmtLong(d); msg = `${plural(p.total, 'habit')} ${isToday ? 'waiting for you' : 'scheduled'}.`; }
    else { title = p.pct >= 0.5 ? 'Nearly there' : 'Good start'; msg = `${p.total - p.done} to go ${when}.`; }
    $('#heroTitle').textContent = title;
    $('#heroMsg').textContent = msg;
    $('#perfectStreak').textContent = perfectStats().streak;

    $('#moodQ').textContent = isToday ? "How's today feeling?" : `Mood ${when}`;
    const cur = state.mood[selectedKey];
    $('#moods').replaceChildren(...MOODS.map((m) => el('button', {
      class: 'mood', role: 'radio', 'aria-checked': cur === m.v, 'aria-label': m.l, title: m.l,
      onclick: () => { setMood(selectedKey, m.v); renderToday(); },
    }, m.e)));

    const missed = isToday ? active().filter(missedYesterday) : [];
    const nudge = $('#nudge');
    nudge.hidden = !missed.length;
    if (missed.length) {
      nudge.textContent = missed.length === 1
        ? `🔁 Never miss twice: ${missed[0].emoji} ${missed[0].name} slipped yesterday. Get it in today and your streak bounces back.`
        : `🔁 Never miss twice: ${missed.map((h) => h.emoji).join(' ')} slipped yesterday. Get them in today.`;
    }
  }

  function last7Dots(h) {
    const t = startOfToday();
    const dots = [];
    for (let i = 6; i >= 0; i--) {
      const s = dayStatus(h, addDays(t, -i));
      dots.push(el('i', { class: { on: 'on', partial: 'part', skip: 'skip', slip: 'slip', rest: 'off', before: 'off' }[s] || '' }));
    }
    return el('span', { class: 'dots', 'aria-hidden': 'true' }, dots);
  }

  const timerKey = (k, h) => `${k}|${h.id}`;
  const timerRunning = (h, k) => !!(state.timer && state.timer.id === h.id && state.timer.date === k);
  const secsDone = (h, k) => (timerRunning(h, k) ? timerElapsed() : (state.secs[timerKey(k, h)] ?? countOf(h, k) * 60));

  function control(h, k) {
    const c = countOf(h, k);
    const done = isDone(h, k);
    if (h.kind === 'quit') {
      return el('button', {
        class: 'slip-btn' + (c ? ' slipped' : ''), 'aria-pressed': !!c,
        'aria-label': c ? `Undo slip for ${h.name}` : `Log a slip for ${h.name}`,
        onclick: () => setCount(h, k, c ? 0 : 1),
      }, c ? '✕ Slipped' : 'Slipped?');
    }
    if (isSkipped(h, k)) {
      return el('button', { class: 'skip-btn', 'aria-label': `Unskip ${h.name}`, onclick: () => change(k, () => setSkip(h, k, false, true)) }, '↷ Skipped');
    }
    if (h.timer && !done) {
      const running = timerRunning(h, k);
      const left = h.target * 60 - secsDone(h, k);
      const b = el('button', {
        class: 'timer-btn' + (running ? ' running' : ''), 'data-timer': h.id,
        'aria-label': running ? `Pause ${h.name} timer` : `Start ${h.name} timer`,
        onclick: () => toggleTimer(h, k),
      }, el('span', { class: 'ticon' }, running ? '❚❚' : '▶'), el('span', { class: 'tlabel' }, left >= h.target * 60 ? `${h.target}m` : fmtClock(left)));
      return b;
    }
    if (h.target === 1 || (h.timer && done)) {
      const btn = el('button', { class: 'check', 'aria-label': done ? `Undo ${h.name}` : `Complete ${h.name}`, 'aria-pressed': done });
      btn.innerHTML = CHECK_SVG;
      btn.onclick = () => setCount(h, k, done ? 0 : h.target);
      return btn;
    }
    const big = h.target > 20;
    return el('div', { class: 'counter' },
      c > 0 && !big ? el('button', { class: 'minus', 'aria-label': `Remove one ${h.name}`, onclick: () => setCount(h, k, c - 1) }, '−') : null,
      el('button', {
        class: 'plus', 'aria-label': big ? `Log ${h.name} amount (${c} of ${h.target})` : `Add one ${h.name} (${c} of ${h.target})`,
        onclick: () => (big ? openDetail(h.id, true) : setCount(h, k, done ? 0 : c + 1)),
      }, done ? '✓' : big ? `${compact(c)}/${compact(h.target)}` : `${c}/${h.target}`));
  }
  const compact = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

  function habitRow(h, idx) {
    const k = selectedKey;
    const d = parseKey(k);
    const c = countOf(h, k);
    const done = isDone(h, k);
    const skipped = h.kind === 'build' && isSkipped(h, k);
    const weekly = isWeekly(h);
    const wkDone = weekly ? weekDoneCount(h, d) : 0;
    const wkMet = weekly && !done && wkDone >= h.freq.times;
    let fill = 0;
    if (h.kind === 'build' && !skipped) fill = h.timer ? Math.min(1, secsDone(h, k) / (h.target * 60)) : Math.min(1, c / h.target);
    const cls = ['habit', `kind-${h.kind}`];
    if (h.kind === 'build' && done) cls.push('done');
    if (h.kind === 'quit' && c) cls.push('slipped');
    if (skipped) cls.push('skipped');
    if (wkMet) cls.push('met');
    const missed = k === todayKey() && missedYesterday(h);
    const note = noteOf(h, k);
    const li = el('li', { class: cls.join(' '), '--c': h.color, '--fill': fill, style: { animationDelay: `${idx * 30}ms` } });
    li.append(el('button', { class: 'habit-main', onclick: () => openDetail(h.id), 'aria-label': `${h.name}: details, notes, skip` },
      el('span', { class: 'habit-emoji' }, h.emoji),
      el('span', { class: 'habit-info' },
        el('div', { class: 'habit-name' }, h.name,
          h.kind === 'build' && h.target > 1 && !h.timer && h.unit ? el('span', { class: 'goal' }, ` · ${fmtNum(h.target)} ${h.unit || ''}`.trimEnd()) : null),
        el('div', { class: 'habit-meta' },
          el('span', { class: 'streak' + (streakInfo(h).cur >= 3 ? ' hot' : ''), title: `Best: ${streakInfo(h).best} · Strength ${strength(h)}%` }, streakText(h)),
          weekly ? el('span', { class: 'wk' + (wkDone >= h.freq.times ? ' met' : '') }, `${wkDone}/${h.freq.times} this week`) : last7Dots(h),
          missed ? el('span', { class: 'missed' }, 'missed yesterday') : null,
          h.reminders.length ? el('span', { class: 'reminder-tag', title: h.reminders.map(fmtTime).join(', ') }, '🔔 ', fmtTime(h.reminders[0]), h.reminders.length > 1 ? ` +${h.reminders.length - 1}` : '') : null,
          note ? el('span', { class: 'note-tag', title: note }, '📝') : null))));
    li.append(control(h, k));
    return li;
  }

  function renderToday() {
    renderWeek();
    const habits = active();
    const hasAny = habits.length > 0;
    $('#emptyState').hidden = hasAny;
    $('#hero').hidden = !hasAny;
    $('.week').hidden = !hasAny;
    const wrap = $('#sections');
    wrap.replaceChildren();
    if (!hasAny) { renderStarters(); $('#nudge').hidden = true; return; }
    renderHero();
    const d = parseKey(selectedKey);
    const shown = habits.filter((h) => isDue(h, d));
    const useHeads = shown.some((h) => h.section !== 'anytime');
    const hr = new Date().getHours();
    const nowSec = selectedKey === todayKey() ? (hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening') : null;
    let idx = 0;
    for (const s of SECTIONS) {
      const list = shown.filter((h) => h.section === s.id);
      if (!list.length) continue;
      const sec = el('div', { class: 'section' + (s.id === nowSec ? ' now' : '') });
      if (useHeads) {
        const prog = list.filter((h) => inProgress(h, d));
        const dn = prog.filter((h) => isDone(h, selectedKey)).length;
        sec.append(el('h3', { class: 'section-h' }, el('span', {}, `${s.icon} ${s.label}`), s.id === nowSec ? el('span', { class: 'now-pill' }, 'now') : null, el('span', { class: 'sec-count' }, `${dn}/${prog.length}`)));
      }
      sec.append(el('ul', { class: 'habit-list' }, list.map((h) => habitRow(h, idx++))));
      wrap.append(sec);
    }
    const resting = habits.filter((h) => !isDue(h, d) && selectedKey >= h.createdAt);
    if (resting.length) {
      wrap.append(el('p', { class: 'rest-note' }, `${resting.map((h) => h.emoji).join(' ')} ${plural(resting.length, 'habit')} resting ${selectedKey === todayKey() ? 'today' : 'this day'}`));
    }
  }

  function renderStarters() {
    const picks = TEMPLATES.slice(0, 9);
    $('#starterGrid').replaceChildren(...picks.map((t) => el('button', {
      class: 'starter', onclick: () => { addHabit(fromTemplate(t)); toast(`${t.emoji} ${t.name} added`); },
    }, el('span', {}, t.emoji), el('span', {}, t.name))),
    el('button', { class: 'starter', onclick: () => openEditor() }, el('span', {}, '✨'), el('span', {}, 'Custom…')));
  }

  function celebrate() {
    const b = $('#burst');
    b.replaceChildren();
    const colors = [...new Set(active().map((h) => h.color)), '#fbbf24', '#f97316'];
    for (let i = 0; i < 26; i++) {
      const a = (Math.PI * 2 * i) / 26 + Math.random() * 0.3;
      const r = 70 + Math.random() * 90;
      b.append(el('i', {
        '--dx': `${Math.cos(a) * r}px`, '--dy': `${Math.sin(a) * r * 0.7}px`, '--r': `${Math.random() * 540 - 270}deg`,
        style: { background: colors[i % colors.length], animationDelay: `${Math.random() * 80}ms` },
      }));
    }
    setTimeout(() => b.replaceChildren(), 1100);
  }

  /* ================= timer ================= */
  let ticker = null;
  function timerElapsed() { const t = state.timer; return t ? t.base + (Date.now() - t.start) / 1000 : 0; }
  function toggleTimer(h, k) {
    if (timerRunning(h, k)) { pauseTimer(); render(); return; }
    if (state.timer) pauseTimer();
    state.timer = { id: h.id, date: k, start: Date.now(), base: state.secs[timerKey(k, h)] ?? countOf(h, k) * 60 };
    save();
    startTicker();
    render();
  }
  function pauseTimer() {
    const t = state.timer;
    if (!t) return;
    const h = byId(t.id);
    const s = timerElapsed();
    state.timer = null;
    if (h) { state.secs[timerKey(t.date, h)] = Math.floor(s); setCountRaw(h, t.date, Math.min(h.target, Math.floor(s / 60))); }
    save();
    resetTitle();
  }
  function startTicker() { if (!ticker) { ticker = setInterval(tick, 1000); tick(); } }
  function tick() {
    const t = state.timer;
    if (!t) { clearInterval(ticker); ticker = null; return; }
    const h = byId(t.id);
    if (!h) { state.timer = null; save(); return; }
    const s = timerElapsed();
    const goal = h.target * 60;
    if (s >= goal) {
      state.timer = null;
      resetTitle();
      change(t.date, () => { state.secs[timerKey(t.date, h)] = goal; setCountRaw(h, t.date, h.target); });
      toast(`⏱ ${h.emoji} ${h.name}: ${h.target} minutes done!`, null, null, 4000);
      if (document.visibilityState !== 'visible') notify({ ...h, id: null, name: `${h.name}: timer done` }, t.date);
      return;
    }
    const btn = document.querySelector(`[data-timer="${h.id}"] .tlabel`);
    if (btn) {
      btn.textContent = fmtClock(goal - s);
      btn.closest('.habit')?.style.setProperty('--fill', String(Math.min(1, s / goal)));
    }
    document.title = `${fmtClock(goal - s)} · ${h.name} — Kindling`;
  }
  const resetTitle = () => { if (!state.timer) document.title = 'Kindling — Habits'; };

  /* ================= render: Insights ================= */
  function renderStats() {
    const habits = active();
    const t = startOfToday();
    const a = agg();
    const ps = perfectStats();

    // Level
    const L = a.level, lo = levelFloor(L), hi = levelFloor(L + 1);
    $('#levelCard').replaceChildren(
      el('div', { class: 'level-badge' }, el('span', {}, '🔥'), el('b', {}, L)),
      el('div', { class: 'level-info' },
        el('div', { class: 'level-title' }, `Level ${L} · ${levelTitle(L)}`),
        el('div', { class: 'xp-track' }, el('i', { style: { width: `${((a.xp - lo) / (hi - lo)) * 100}%` } })),
        el('div', { class: 'muted' }, `${fmtNum(a.xp)} XP · ${fmtNum(hi - a.xp)} to ${levelTitle(L + 1)}`),
        el('div', { class: 'xp-help' }, '+10 per check-in · +25 perfect day · +100 perfect week · +3 clean day, mood · +2 note')));

    const rates = habits.map((h) => rate(h)).filter((r) => r != null);
    const avg = rates.length ? Math.round((rates.reduce((x, y) => x + y, 0) / rates.length) * 100) : 0;
    const moods30 = [];
    for (let i = 0; i < 30; i++) { const v = state.mood[keyOf(addDays(t, -i))]; if (v) moods30.push(v); }
    const avgMood = moods30.length ? moods30.reduce((x, y) => x + y, 0) / moods30.length : null;
    const stat = (label, value, unit = '') => el('div', { class: 'stat' }, el('div', { class: 'label' }, label),
      el('div', { class: 'value' }, String(value), unit ? el('small', {}, unit === '%' ? unit : ` ${unit}`) : null));
    $('#statGrid').replaceChildren(
      stat('30-day completion', avg, '%'),
      stat('Perfect-day streak', ps.streak, ps.streak === 1 ? 'day' : 'days'),
      stat('Perfect weeks', ps.weeks),
      stat('Longest streak', a.bestStreak, a.bestStreak === 1 ? 'day' : 'days'),
      stat('Total check-ins', fmtNum(a.checkins)),
      stat('Average mood', avgMood ? MOODS[Math.round(avgMood) - 1].e : '—', avgMood ? avgMood.toFixed(1) : ''));

    // 30-day bars
    const bars = $('#bars');
    bars.replaceChildren();
    let perfect = 0;
    for (let i = 29; i >= 0; i--) {
      const d = addDays(t, -i);
      const p = dayProgress(d);
      if (p.total && p.done === p.total) perfect++;
      const m = state.mood[keyOf(d)];
      bars.append(el('div', {
        class: 'bar' + (p.total && p.done === p.total ? ' full' : '') + (!p.done ? ' none' : ''),
        'data-tip': `${fmtShort(d)} · ${p.done}/${p.total}${m ? ' · ' + MOODS[m - 1].e : ''}`,
      }, el('i', { style: { height: `${Math.max(3, p.pct * 100)}%` } })));
    }
    $('#barsAxis').replaceChildren(el('span', {}, fmtShort(addDays(t, -29))), el('span', {}, 'Today'));
    $('#chartCaption').textContent = `${plural(perfect, 'perfect day')}`;

    // Year heatmap
    const year = $('#yearMap');
    year.replaceChildren();
    const ystart = addDays(mondayOf(t), -52 * 7);
    for (let i = 0; i < 53 * 7; i++) {
      const d = addDays(ystart, i);
      if (d > t) { year.append(el('i', { class: 'fut' })); continue; }
      const p = dayProgress(d);
      const lvl = !p.total ? 'na' : p.pct === 1 ? 'l4' : p.pct >= 0.67 ? 'l3' : p.pct >= 0.34 ? 'l2' : p.pct > 0 ? 'l1' : 'l0';
      year.append(el('i', { class: lvl, title: `${fmtShort(d)}: ${p.total ? `${p.done}/${p.total}` : 'nothing scheduled'}` }));
    }
    requestAnimationFrame(() => { const s = year.parentElement; s.scrollLeft = s.scrollWidth; });

    // Weekday performance (90 days)
    const sum = Array.from({ length: 7 }, () => ({ done: 0, total: 0 }));
    for (let i = 1; i <= 90; i++) {
      const d = addDays(t, -i);
      const p = dayProgress(d);
      sum[d.getDay()].done += p.done; sum[d.getDay()].total += p.total;
    }
    const pcts = DOW_ORDER.map((dw) => ({ dw, p: sum[dw].total ? sum[dw].done / sum[dw].total : null }));
    const bestP = Math.max(...pcts.map((x) => x.p ?? -1));
    $('#dowBars').replaceChildren(...pcts.map(({ dw, p }) => el('div', { class: 'dow-bar' + (p != null && p === bestP && p > 0 ? ' best' : '') },
      el('span', { class: 'pct' }, p == null ? '—' : `${Math.round(p * 100)}%`),
      el('span', { class: 'col' }, el('i', { style: { height: `${(p ?? 0) * 100}%` } })),
      el('span', { class: 'lbl' }, DOW[dw].slice(0, 2)))));

    renderMoodInsight(t);

    // Per habit
    const rl = $('#rateList');
    rl.replaceChildren(...(habits.length ? habits
      .map((h) => ({ h, r: rate(h), s: strength(h) }))
      .sort((x, y) => y.s - x.s)
      .map(({ h, r, s }) => el('li', { class: 'rate', '--c': h.color },
        el('span', { class: 'e' }, h.emoji),
        el('span', { class: 'n' }, h.name, h.kind === 'quit' ? el('span', { class: 'tag' }, 'quit') : null),
        el('span', { class: 'pct', title: 'Habit strength' }, `${s}%`),
        el('span', { class: 'track', title: `Strength ${s}%` }, el('i', { style: { width: `${s}%` } })),
        el('span', { class: 'sub' }, `${streakText(h)} · best ${streakInfo(h).best}${isWeekly(h) ? ' wks' : ''} · 30d ${r == null ? '—' : Math.round(r * 100) + '%'}`)))
      : [el('li', { class: 'muted' }, 'Add a habit to see insights.')]));

    // Badges
    const earned = new Set(BADGES.filter((b) => b.test(a)).map((b) => b.id));
    $('#badgeCount').textContent = `${earned.size} of ${BADGES.length}`;
    $('#badges').replaceChildren(...BADGES.map((b) => el('div', { class: 'badge' + (earned.has(b.id) ? ' got' : ''), title: b.desc },
      el('span', { class: 'be' }, b.e), el('b', {}, b.name), el('span', {}, b.desc))));

    const archived = state.habits.filter((h) => h.archived);
    $('#archivedCard').hidden = !archived.length;
    $('#archivedList').replaceChildren(...archived.map((h) => el('li', {},
      el('span', {}, h.emoji), el('span', {}, h.name),
      el('button', { class: 'btn ghost', onclick: () => { h.archived = false; save(); render(); toast(`${h.name} restored`); } }, 'Restore'))));
  }

  function renderMoodInsight(t) {
    const box = $('#moodInsight');
    const days = [];
    for (let i = 0; i < 30; i++) {
      const d = addDays(t, -i);
      const v = state.mood[keyOf(d)];
      if (v) days.push({ d, v, p: dayProgress(d) });
    }
    if (!days.length) {
      box.replaceChildren(el('p', { class: 'muted' }, "Tap a face on the Today screen to log how you feel. After a few days you'll see how your habits and mood connect."));
      return;
    }
    const strip = el('div', { class: 'mood-strip' });
    for (let i = 13; i >= 0; i--) {
      const v = state.mood[keyOf(addDays(t, -i))];
      strip.append(el('span', { title: fmtShort(addDays(t, -i)) }, v ? MOODS[v - 1].e : '·'));
    }
    const hi = days.filter((x) => x.p.total && x.p.pct >= 0.8);
    const lo = days.filter((x) => !(x.p.total && x.p.pct >= 0.8));
    const avg = (xs) => xs.reduce((s, x) => s + x.v, 0) / xs.length;
    let text;
    if (days.length < 5 || !hi.length || !lo.length) text = `Logged ${plural(days.length, 'day')}. Keep going: with a few more, Kindling compares your mood on strong days and off days.`;
    else {
      const a = avg(hi), b = avg(lo);
      text = a > b + 0.15
        ? `On days you finish 80%+ of your habits, your mood averages ${a.toFixed(1)}, vs ${b.toFixed(1)} on other days. Your habits seem to lift you. 🔥`
        : a < b - 0.15
          ? `Interesting: your mood averages ${a.toFixed(1)} on strong habit days and ${b.toFixed(1)} on lighter ones. Maybe you're pushing a bit hard?`
          : `Your mood is about the same (${a.toFixed(1)} vs ${b.toFixed(1)}) whether or not you hit your habits.`;
    }
    box.replaceChildren(strip, el('p', {}, text));
  }

  /* ================= badges & level-up ================= */
  let badgeTimer = null;
  function scheduleBadgeCheck() { clearTimeout(badgeTimer); badgeTimer = setTimeout(checkBadges, 350); }
  function checkBadges() {
    const a = agg();
    const earned = BADGES.filter((b) => b.test(a)).map((b) => b.id);
    if (state.badgesSeen == null || state.levelSeen == null) { // first run: don't flood
      state.badgesSeen = earned; state.levelSeen = a.level; persist(); return;
    }
    const fresh = earned.filter((id) => !state.badgesSeen.includes(id));
    const levelUp = a.level > state.levelSeen;
    if (!fresh.length && !levelUp) return;
    state.badgesSeen = [...new Set([...state.badgesSeen, ...earned])];
    state.levelSeen = a.level;
    persist();
    if (fresh.length) {
      const b = BADGES.find((x) => x.id === fresh[0]);
      toast(`🏅 Badge unlocked: ${b.e} ${b.name}${fresh.length > 1 ? ` (+${fresh.length - 1} more)` : ''}`, 'See', () => switchView('stats'), 5000);
    } else toast(`🔥 Level up! You're now level ${a.level}, ${levelTitle(a.level)}`, 'See', () => switchView('stats'), 5000);
  }

  /* ================= editor ================= */
  const editor = $('#editor');
  let draft = null;

  function fromTemplate(t) {
    return normHabit({
      ...t, id: null, freq: t.freq || { type: 'days', days: ALL.slice() }, target: t.target || 1,
      unit: t.timer ? 'min' : t.unit || '', section: t.section || 'anytime', reminders: [],
    });
  }

  function openEditor(id) {
    const h = id ? byId(id) : null;
    const n = active().length;
    draft = h
      ? JSON.parse(JSON.stringify(h))
      : normHabit({ id: null, name: '', emoji: EMOJIS[n % EMOJIS.length], color: COLORS[n % COLORS.length] });
    if (!h) draft.id = null;
    draft._days = draft.freq.type === 'days' ? draft.freq.days.slice() : ALL.slice();
    draft._times = draft.freq.type === 'weekly' ? draft.freq.times : 3;
    draft._every = draft.freq.type === 'interval' ? draft.freq.every : 2;
    $('#editorTitle').textContent = h ? 'Edit habit' : 'New habit';
    $('#saveBtn').textContent = h ? 'Save changes' : 'Create habit';
    $('#templatesWrap').hidden = !!h;
    $('#nameInput').value = draft.name;
    paintEditor();
    $('#templates').replaceChildren(...TEMPLATES.map((t) => el('button', {
      type: 'button', class: 'tpl', '--c': t.color,
      onclick: () => {
        const keepId = draft.id;
        draft = fromTemplate(t);
        draft.id = keepId;
        draft._days = draft.freq.type === 'days' ? draft.freq.days.slice() : ALL.slice();
        draft._times = draft.freq.type === 'weekly' ? draft.freq.times : 3;
        draft._every = draft.freq.type === 'interval' ? draft.freq.every : 2;
        $('#nameInput').value = draft.name;
        paintEditor();
      },
    }, el('span', {}, t.emoji), t.name, t.kind === 'quit' ? el('small', {}, 'quit') : null)));
    editor.showModal();
    $('#templates').scrollLeft = 0;
    editor.querySelector('.sheet-body').scrollTop = 0;
    if (h) setTimeout(() => $('#nameInput').focus(), 50);
  }

  const pressed = (sel, attr, val) => document.querySelectorAll(sel).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === val)));

  function paintEditor() {
    editor.style.setProperty('--pick', draft.color);
    const quit = draft.kind === 'quit';
    $('#emojiPreview').textContent = draft.emoji;
    pressed('#kindSeg button', 'kind', draft.kind);
    $('#emojiGrid').replaceChildren(...EMOJIS.map((e) => el('button', {
      type: 'button', 'aria-pressed': e === draft.emoji, 'aria-label': `Icon ${e}`, onclick: () => { draft.emoji = e; paintEditor(); },
    }, e)));
    $('#swatches').replaceChildren(...COLORS.map((c) => el('button', {
      type: 'button', '--sw': c, 'aria-pressed': c === draft.color, 'aria-label': `Color ${c}`, onclick: () => { draft.color = c; paintEditor(); },
    })));

    $('#scheduleBlock').hidden = quit;
    $('#goalBlock').hidden = quit;
    pressed('#freqSeg button', 'freq', draft.freq.type);
    $('#freqDays').hidden = draft.freq.type !== 'days';
    $('#freqWeekly').hidden = draft.freq.type !== 'weekly';
    $('#freqInterval').hidden = draft.freq.type !== 'interval';
    const s = [...draft._days].sort().join('');
    document.querySelectorAll('#schedulePresets button').forEach((b) => {
      b.setAttribute('aria-pressed', String(s === { daily: '0123456', weekdays: '12345', weekends: '06' }[b.dataset.preset]));
    });
    $('#dowPicker').replaceChildren(...DOW_ORDER.map((d) => el('button', {
      type: 'button', 'aria-pressed': draft._days.includes(d), 'aria-label': DOW[d],
      onclick: () => {
        if (draft._days.includes(d)) { if (draft._days.length > 1) draft._days = draft._days.filter((x) => x !== d); } else draft._days.push(d);
        syncFreq(); paintEditor();
      },
    }, DOW[d].slice(0, 2))));
    $('#weeklyOut').textContent = draft._times;
    $('#intervalOut').textContent = draft._every;
    pressed('#sectionSeg button', 'section', draft.section);

    $('#timerOn').checked = draft.timer;
    $('#unitInput').hidden = draft.timer;
    $('#unitInput').value = draft.timer ? '' : draft.unit;
    $('#targetInput').value = draft.target;
    $('#targetHint').textContent = draft.timer
      ? `${draft.target} minute${draft.target === 1 ? '' : 's'} a day. Tap ▶ on the habit to run the timer; it checks itself off when time's up.`
      : draft.target === 1 ? 'Simple check-off. Raise the number to count glasses, pages, steps…'
        : draft.target > 20 ? `Log the amount on the habit's page (e.g. ${fmtNum(draft.target)} ${draft.unit || 'times'}).`
          : `Tap + to log each one, ${draft.target} a day.`;
    $('#unitInput').placeholder = 'unit, e.g. pages';

    $('#reminderList').replaceChildren(...draft.reminders.map((t, i) => el('div', { class: 'reminder-item' },
      el('input', { type: 'time', value: t, 'aria-label': `Reminder ${i + 1}`, onchange: (e) => { draft.reminders[i] = e.target.value || t; paintEditor(); } }),
      el('button', { type: 'button', class: 'icon-btn small', 'aria-label': 'Remove reminder', onclick: () => { draft.reminders.splice(i, 1); paintEditor(); } }, '✕'))));
    $('#addReminder').hidden = draft.reminders.length >= 5;
    $('#reminderHint').textContent = draft.reminders.length ? reminderHint() : quit ? 'Optional: a daily check-in nudge to stay on track.' : '';
  }

  function syncFreq() {
    if (draft.freq.type === 'days') draft.freq = { type: 'days', days: draft._days.slice() };
    else if (draft.freq.type === 'weekly') draft.freq = { type: 'weekly', times: draft._times };
    else draft.freq = { type: 'interval', every: draft._every };
  }

  function reminderHint() {
    if (!('Notification' in window)) return "This browser can't show notifications, so reminders pop up inside Kindling while it's open. For reminders anytime, add them to your calendar from the habit's page.";
    if (Notification.permission === 'denied') return "Notifications are blocked for this site, so reminders pop up inside Kindling while it's open. For reminders anytime, add them to your calendar from the habit's page.";
    if (Notification.permission === 'default') return "We'll ask to send notifications when you save.";
    return "You'll get a notification while Kindling is open (a tab or the installed app). For reminders even when it's closed, add them to your calendar from the habit's page.";
  }

  document.querySelectorAll('#kindSeg button').forEach((b) => b.addEventListener('click', () => { draft.kind = b.dataset.kind; paintEditor(); }));
  document.querySelectorAll('#freqSeg button').forEach((b) => b.addEventListener('click', () => { draft.freq = { type: b.dataset.freq }; syncFreq(); paintEditor(); }));
  document.querySelectorAll('#schedulePresets button').forEach((b) => b.addEventListener('click', () => {
    draft._days = { daily: ALL.slice(), weekdays: [1, 2, 3, 4, 5], weekends: [0, 6] }[b.dataset.preset];
    syncFreq(); paintEditor();
  }));
  document.querySelectorAll('#freqWeekly [data-step]').forEach((b) => b.addEventListener('click', () => {
    draft._times = Math.min(7, Math.max(1, draft._times + Number(b.dataset.step))); syncFreq(); paintEditor();
  }));
  document.querySelectorAll('#freqInterval [data-step]').forEach((b) => b.addEventListener('click', () => {
    draft._every = Math.min(30, Math.max(2, draft._every + Number(b.dataset.step))); syncFreq(); paintEditor();
  }));
  document.querySelectorAll('#sectionSeg button').forEach((b) => b.addEventListener('click', () => { draft.section = b.dataset.section; paintEditor(); }));
  $('#timerOn').addEventListener('change', (e) => {
    draft.timer = e.target.checked;
    if (draft.timer) { draft.unit = 'min'; if (draft.target < 5) draft.target = 10; } else { draft.unit = ''; draft.target = 1; }
    paintEditor();
  });
  const stepFor = (n) => (n >= 1000 ? 500 : n >= 100 ? 10 : n >= 30 ? 5 : 1);
  const setTarget = (n) => { draft.target = Math.max(1, Math.min(100000, Math.round(Number(n)) || 1)); paintEditor(); };
  $('#targetMinus').onclick = () => setTarget(draft.target - stepFor(draft.target - 1));
  $('#targetPlus').onclick = () => setTarget(draft.target + stepFor(draft.target));
  $('#targetInput').addEventListener('change', (e) => setTarget(e.target.value));
  $('#unitInput').addEventListener('input', (e) => { draft.unit = e.target.value.slice(0, 16); });
  $('#nameInput').addEventListener('input', (e) => { draft.name = e.target.value; });
  $('#addReminder').onclick = () => {
    const used = new Set(draft.reminders);
    let t = draft.section === 'evening' ? '20:00' : draft.section === 'afternoon' ? '14:00' : '09:00';
    while (used.has(t)) t = `${pad((Number(t.slice(0, 2)) + 1) % 24)}:00`;
    draft.reminders.push(t);
    paintEditor();
  };

  $('#editorForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#nameInput').value.trim();
    if (!name) { $('#nameInput').focus(); return; }
    draft.name = name;
    syncFreq();
    if (draft.kind === 'quit') { draft.target = 1; draft.timer = false; draft.unit = ''; }
    draft.reminders = [...new Set(draft.reminders)].sort();
    const clean = normHabit({ ...draft, unit: draft.timer ? 'min' : draft.unit.trim() });
    if (draft.id) {
      const h = byId(draft.id);
      Object.assign(h, { ...clean, id: h.id, createdAt: h.createdAt, order: h.order, archived: h.archived });
      if (state.timer && state.timer.id === h.id && (!h.timer || h.kind === 'quit')) state.timer = null;
      armReminders(h);
      save();
      toast('Saved');
    } else {
      const h = addHabit(clean);
      armReminders(h);
      persist();
      toast(`${h.emoji} ${h.name} added`);
    }
    if (draft.reminders.length && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(refreshMenuStatus).catch(() => {});
    }
    editor.close();
    render();
  });

  function addHabit(h) {
    const order = state.habits.reduce((m, x) => Math.max(m, x.order), -1) + 1;
    const habit = normHabit({ ...h, id: uid(), createdAt: todayKey(), archived: false, order });
    state.habits.push(habit);
    save();
    render();
    return habit;
  }

  /* ================= detail ================= */
  const detail = $('#detail');
  let detailId = null;
  let noteTimer = null;

  function openDetail(id, focusAmount = false) {
    detailId = id;
    paintDetail();
    detail.showModal();
    detail.querySelector('.sheet-body').scrollTop = 0;
    if (focusAmount) setTimeout(() => $('#dAmount')?.select(), 60);
  }

  function paintDetail() {
    const h = byId(detailId);
    if (!h) return;
    const k = selectedKey;
    const d = parseKey(k);
    detail.style.setProperty('--c', h.color);
    $('#dEmoji').textContent = h.emoji;
    $('#dName').textContent = h.name;
    $('#dSchedule').textContent = `${scheduleText(h)}${h.reminders.length ? ` · 🔔 ${h.reminders.map(fmtTime).join(', ')}` : ''}`;

    // Day panel
    $('#dDayLabel').textContent = k === todayKey() ? `Today, ${fmtShort(d)}` : fmtLong(d);
    const c = countOf(h, k);
    const done = isDone(h, k);
    const skipped = h.kind === 'build' && isSkipped(h, k);
    const due = isDue(h, d);
    let status, tone;
    if (h.kind === 'quit') { status = c ? 'Slipped' : 'Clean'; tone = c ? 'bad' : 'good'; }
    else if (done) { status = 'Done'; tone = 'good'; }
    else if (skipped) { status = 'Skipped'; tone = 'muted'; }
    else if (c > 0) { status = `${fmtNum(c)} / ${fmtNum(h.target)} ${unitOf(h)}`.trim(); tone = 'warm'; }
    else if (!due) { status = 'Not scheduled'; tone = 'muted'; }
    else { status = 'Not done yet'; tone = 'muted'; }
    $('#dStatus').textContent = status;
    $('#dStatus').className = `status-pill ${tone}`;

    const actions = $('#dActions');
    actions.replaceChildren();
    if (h.kind === 'quit') {
      actions.append(el('button', { type: 'button', class: 'btn' + (c ? '' : ' danger ghost'), onclick: () => { setCount(h, k, c ? 0 : 1); paintDetail(); } }, c ? '↺ Undo slip' : '✕ I slipped'));
    } else {
      if (h.target > 1 || h.timer) {
        const input = el('input', { type: 'number', id: 'dAmount', min: '0', max: String(h.target * 100), value: String(c), inputmode: 'numeric', 'aria-label': `Amount (${unitOf(h) || 'times'})` });
        const apply = () => { setCount(h, k, Number(input.value) || 0); paintDetail(); };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
        actions.append(el('div', { class: 'amount' }, input, el('span', { class: 'muted' }, `/ ${fmtNum(h.target)} ${unitOf(h) || 'times'}`), el('button', { type: 'button', class: 'btn', onclick: apply }, 'Log')));
      }
      actions.append(el('button', { type: 'button', class: 'btn' + (done ? '' : ' primary'), onclick: () => { setCount(h, k, done ? 0 : h.target); paintDetail(); } }, done ? '↺ Undo' : '✓ Mark done'));
      if (!done) {
        actions.append(el('button', {
          type: 'button', class: 'btn ghost', title: 'Skipping keeps your streak intact (sick day, travel…)',
          onclick: () => { change(k, () => setSkip(h, k, !skipped, true)); paintDetail(); },
        }, skipped ? '↺ Unskip' : '↷ Skip this day'));
      }
    }
    const note = $('#dNote');
    if (document.activeElement !== note) note.value = noteOf(h, k);

    // Stats
    const st = streakInfo(h);
    const r = rate(h);
    const unit = h.kind === 'quit' ? 'clean days' : isWeekly(h) ? 'weeks' : 'days';
    $('#dStats').replaceChildren(
      el('div', {}, el('b', {}, `${h.kind === 'quit' ? '🛡' : '🔥'} ${st.cur}`), el('span', {}, `Current (${unit})`)),
      el('div', {}, el('b', {}, String(st.best)), el('span', {}, 'Best streak')),
      el('div', { title: 'Strength rises with each check-in and dips gently on misses; one bad day never resets it.' },
        el('b', {}, `${strength(h)}%`), el('span', {}, 'Habit strength')),
      el('div', {}, el('b', {}, r == null ? '—' : `${Math.round(r * 100)}%`), el('span', {}, '30-day rate')));

    // Heatmap
    const heat = $('#dHeat');
    heat.style.setProperty('--c', h.color);
    heat.replaceChildren();
    const t = startOfToday();
    const weeks = 20;
    const start = addDays(mondayOf(t), -(weeks - 1) * 7);
    for (let i = 0; i < weeks * 7; i++) {
      const day = addDays(start, i);
      const dk = keyOf(day);
      const s = dayStatus(h, day);
      const cls = { on: h.kind === 'quit' ? 'on' : 'on', partial: 'partial', skip: 'skip', slip: 'slip', rest: 'rest', future: 'future', before: 'before', miss: 'miss', none: '' }[s];
      heat.append(el('button', {
        class: `${cls}${dk === todayKey() ? ' is-today' : ''}${dk === k ? ' is-sel' : ''}`, disabled: s === 'future' || s === 'before',
        title: `${fmtShort(day)} · ${s === 'on' ? (h.kind === 'quit' ? 'clean' : 'done') : s}${noteOf(h, dk) ? ' · 📝' : ''}`,
        'aria-label': `${fmtLong(day)}: ${s}`,
        onclick: () => {
          if (h.kind === 'quit') setCount(h, dk, countOf(h, dk) ? 0 : 1);
          else setCount(h, dk, isDone(h, dk) ? 0 : h.target);
          paintDetail();
        },
      }));
    }
    requestAnimationFrame(() => { const sc = heat.parentElement; sc.scrollLeft = sc.scrollWidth; });

    // Notes history
    const notes = Object.entries(state.notes).filter(([, day]) => day[h.id]).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 12);
    $('#dNotesWrap').hidden = !notes.length;
    $('#dNotes').replaceChildren(...notes.map(([dk, day]) => el('li', {}, el('span', { class: 'nd' }, fmtShort(parseKey(dk))), el('span', {}, day[h.id]))));

    $('#dCalendar').textContent = h.reminders.length ? `📅 Add ${h.reminders.length > 1 ? 'reminders' : `${fmtTime(h.reminders[0])} reminder`} to my calendar` : '📅 Add to my calendar (9:00 AM)';
    $('#dArchive').textContent = h.archived ? 'Restore' : 'Archive';
  }

  $('#dNote').addEventListener('input', (e) => {
    clearTimeout(noteTimer);
    const h = byId(detailId), k = selectedKey, v = e.target.value;
    noteTimer = setTimeout(() => { if (h) setNote(h, k, v); }, 400);
  });
  detail.addEventListener('close', () => {
    clearTimeout(noteTimer);
    const h = byId(detailId);
    if (h && $('#dNote').value.trim() !== noteOf(h, selectedKey)) setNote(h, selectedKey, $('#dNote').value);
    render();
  });

  $('#dCalendar').onclick = () => {
    const h = byId(detailId);
    downloadFile(`kindling-${h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'habit'}.ics`, icsFor([h]), 'text/calendar');
    toast('Calendar file downloaded. Open it to add the reminder.', null, null, 4000);
  };
  $('#dEdit').onclick = () => { const id = detailId; detail.close(); openEditor(id); };
  $('#dArchive').onclick = () => {
    const h = byId(detailId);
    h.archived = !h.archived; save(); detail.close(); render();
    if (h.archived) toast(`${h.name} archived`, 'Undo', () => { h.archived = false; save(); render(); });
  };
  $('#dDelete').onclick = async () => {
    const h = byId(detailId);
    const ok = await confirmDialog(`Delete “${h.name}”?`, 'This removes the habit and all of its history and notes. Archive it instead if you might want it back.', 'Delete');
    if (!ok) return;
    const snapshot = JSON.stringify(state);
    state.habits = state.habits.filter((x) => x.id !== h.id);
    for (const map of [state.log, state.notes]) for (const [k, day] of Object.entries(map)) { delete day[h.id]; if (!Object.keys(day).length) delete map[k]; }
    for (const [k, list] of Object.entries(state.skips)) { const l = list.filter((x) => x !== h.id); if (l.length) state.skips[k] = l; else delete state.skips[k]; }
    for (const k of Object.keys(state.secs)) if (k.endsWith(`|${h.id}`)) delete state.secs[k];
    if (state.timer && state.timer.id === h.id) state.timer = null;
    save(); detail.close(); render();
    toast(`${h.name} deleted`, 'Undo', () => { state = hydrate(JSON.parse(snapshot)); save(); render(); });
  };

  /* ================= arrange ================= */
  function paintArrange() {
    const list = active().sort((a, b) => SECTIONS.findIndex((s) => s.id === a.section) - SECTIONS.findIndex((s) => s.id === b.section) || a.order - b.order);
    const move = (i, dir) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      const a = list[i], b = list[j];
      if (a.section !== b.section) a.section = b.section; // moving across a boundary changes section
      else [a.order, b.order] = [b.order, a.order];
      save(); paintArrange(); render();
    };
    $('#arrangeList').replaceChildren(...list.map((h, i) => el('li', {},
      el('span', { class: 'ae' }, h.emoji),
      el('span', { class: 'an' }, h.name),
      el('select', {
        'aria-label': `Time of day for ${h.name}`,
        onchange: (e) => { h.section = e.target.value; save(); paintArrange(); render(); },
      }, SECTIONS.map((s) => { const o = el('option', { value: s.id }, `${s.icon} ${s.label}`); o.selected = s.id === h.section; return o; })),
      el('button', { type: 'button', class: 'icon-btn small', 'aria-label': `Move ${h.name} up`, disabled: i === 0, onclick: () => move(i, -1) }, '▲'),
      el('button', { type: 'button', class: 'icon-btn small', 'aria-label': `Move ${h.name} down`, disabled: i === list.length - 1, onclick: () => move(i, 1) }, '▼'))));
  }
  $('#arrangeBtn').onclick = () => { $('#menu').close(); paintArrange(); $('#arrange').showModal(); };

  /* ================= confirm ================= */
  function confirmDialog(title, msg, yes = 'Confirm') {
    const d = $('#confirm');
    $('#confirmTitle').textContent = title;
    $('#confirmMsg').textContent = msg;
    $('#confirmYes').textContent = yes;
    d.showModal();
    return new Promise((resolve) => {
      const done = (v) => { d.close(); $('#confirmYes').onclick = $('#confirmNo').onclick = null; resolve(v); };
      $('#confirmYes').onclick = () => done(true);
      $('#confirmNo').onclick = () => done(false);
      d.addEventListener('cancel', () => resolve(false), { once: true });
    });
  }

  /* ================= export / import / reset ================= */
  $('#menuBtn').onclick = () => { refreshMenuStatus(); $('#menu').showModal(); };
  function downloadFile(name, content, type) {
    const a = el('a', { href: URL.createObjectURL(new Blob([content], { type })), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  }
  $('#exportBtn').onclick = () => {
    downloadFile(`kindling-backup-${todayKey()}.json`, JSON.stringify({ app: 'kindling', version: 2, exportedAt: new Date().toISOString(), ...state }, null, 2), 'application/json');
    toast('Backup downloaded');
  };
  function toCSV() {
    const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = [['date', 'habit', 'type', 'status', 'amount', 'goal', 'unit', 'note', 'mood']];
    const habits = [...state.habits].sort((a, b) => a.order - b.order);
    if (!habits.length && !Object.keys(state.mood).length) return rows.map((r) => r.join(',')).join('\r\n');
    const first = [...habits.map((h) => h.createdAt), ...Object.keys(state.mood)].sort()[0];
    const t = startOfToday();
    for (let d = parseKey(first); d <= t; d = addDays(d, 1)) {
      const k = keyOf(d);
      const m = state.mood[k];
      if (m) rows.push([k, '(mood)', '', MOODS[m - 1].l, '', '', '', '', m]);
      for (const h of habits) {
        const s = dayStatus(h, d);
        if (s === 'before' || s === 'future') continue;
        const c = countOf(h, k);
        if (s === 'rest' && !c && !noteOf(h, k)) continue;
        const status = { on: h.kind === 'quit' ? 'clean' : 'done', partial: 'partial', skip: 'skipped', slip: 'slipped', miss: 'missed', none: isWeekly(h) ? '' : 'pending', rest: 'not scheduled' }[s];
        rows.push([k, h.name, h.kind, status, h.kind === 'quit' ? '' : c, h.kind === 'quit' ? '' : h.target, h.kind === 'quit' ? '' : unitOf(h), noteOf(h, k), '']);
      }
    }
    return rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
  }
  $('#csvBtn').onclick = () => { downloadFile(`kindling-${todayKey()}.csv`, '﻿' + toCSV(), 'text/csv'); toast('Spreadsheet downloaded'); };
  $('#importFile').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.habits) || typeof data.log !== 'object') throw new Error('bad');
      const ok = await confirmDialog('Replace your data?', `Import ${plural(data.habits.length, 'habit')} from this backup. Your current data will be replaced.`, 'Import');
      if (!ok) return;
      const { app, version, exportedAt, ...rest } = data;
      state = hydrate({ ...rest, theme: state.theme, badgesSeen: null, levelSeen: null, timer: null });
      save(); $('#menu').close(); render(); toast('Backup restored');
    } catch { toast("That file doesn't look like a Kindling backup"); }
  });
  $('#resetBtn').onclick = async () => {
    const ok = await confirmDialog('Erase everything?', 'All habits, history, notes and moods in this browser will be deleted. Export a backup first if you want to keep them.', 'Erase');
    if (!ok) return;
    const snapshot = JSON.stringify(state);
    state = { ...blank(), theme: state.theme };
    save(); $('#menu').close(); render();
    toast('Everything erased', 'Undo', () => { state = hydrate(JSON.parse(snapshot)); save(); render(); });
  };

  /* ================= reminders ================= */
  let swReg = null;
  const REMINDER_WINDOW = 120; // minutes after a reminder time we'll still nudge
  const remKey = (h, time) => `${h.id}@${time}`;

  function armReminders(h) {
    const k = todayKey();
    const sent = ((state.notified && state.notified[k]) || []).filter((x) => !x.startsWith(`${h.id}@`) && x !== h.id);
    for (const time of h.reminders) if (nowMin() >= toMin(time)) sent.push(remKey(h, time));
    state.notified = { [k]: sent };
  }

  function markDone(id, k) {
    const h = byId(id);
    if (!h || h.kind !== 'build' || !/^\d{4}-\d{2}-\d{2}$/.test(k || '')) return;
    setCount(h, k, h.target);
    toast(`✓ ${h.emoji} ${h.name} done`);
  }

  function checkReminders() {
    const k = todayKey();
    const t = startOfToday();
    const now = nowMin();
    const sent = (state.notified && state.notified[k]) || [];
    const due = [];
    for (const h of active()) {
      for (const time of h.reminders) {
        const key = remKey(h, time);
        if (sent.includes(key) || sent.includes(h.id) || now < toMin(time) || now - toMin(time) > REMINDER_WINDOW) continue;
        if (h.kind === 'build' && (!inProgress(h, t) || isDone(h, k))) continue;
        if (h.kind === 'quit' && countOf(h, k)) continue;
        due.push({ h, key });
      }
    }
    if (!due.length) return;
    state.notified = { [k]: [...sent, ...due.map((x) => x.key)] };
    persist();
    const habits = [...new Map(due.map((x) => [x.h.id, x.h])).values()];
    if (document.visibilityState === 'visible') {
      const h = habits[0];
      if (habits.length > 1) toast(`🔔 ${habits.length} habits are due: ${habits.map((x) => x.emoji).join(' ')}`, null, null, 8000);
      else if (h.kind === 'quit') toast(`🛡 Check-in: ${h.emoji} ${h.name}. ${plural(streakInfo(h).cur, 'day')} clean, keep it going!`, null, null, 8000);
      else toast(`🔔 Time for ${h.emoji} ${h.name}`, 'Mark done', () => markDone(h.id, k), 15000);
    } else habits.forEach((h) => notify(h, k));
  }

  async function notify(h, k) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const real = h.id ? byId(h.id) : null;
    const streak = real ? streakInfo(real).cur : 0;
    const title = `${h.emoji} ${h.name}`;
    const body = !real ? 'Keep the fire going 🔥'
      : real.kind === 'quit' ? `${plural(streak, 'day')} clean. Keep it going 🛡`
        : streak ? `Keep your ${streak}-${isWeekly(real) ? 'week' : 'day'} streak alive 🔥` : 'A small step today keeps the fire going.';
    const opts = {
      body, tag: `kindling-${h.id || 'note'}-${k}`, icon: 'icon.svg', badge: 'icon.svg', data: { id: h.id, date: k },
      actions: real && real.kind === 'build' ? [{ action: 'done', title: '✓ Mark done' }] : [],
    };
    try { if (swReg) { await swReg.showNotification(title, opts); return true; } } catch { /* fall back */ }
    try {
      const { actions, ...plain } = opts;
      const n = new Notification(title, plain);
      n.onclick = () => { window.focus(); n.close(); };
      return true;
    } catch { return false; }
  }

  /* ================= calendar (.ics) ================= */
  const ICS_DAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const icsEsc = (s) => String(s).replace(/[\\;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
  function icsFor(habits) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kindling//Habit Reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    for (const h of habits) {
      let d = startOfToday();
      for (let i = 0; i < 31 && !isDue(h, d); i++) d = addDays(d, 1); // first due day
      let rule = 'FREQ=DAILY';
      if (h.kind === 'build' && h.freq.type === 'days') rule = `FREQ=WEEKLY;BYDAY=${DOW_ORDER.filter((x) => h.freq.days.includes(x)).map((x) => ICS_DAY[x]).join(',')}`;
      else if (h.kind === 'build' && h.freq.type === 'interval') rule = `FREQ=DAILY;INTERVAL=${h.freq.every}`;
      for (const time of h.reminders.length ? h.reminders : ['09:00']) {
        lines.push('BEGIN:VEVENT',
          `UID:kindling-${h.id}-${time.replace(':', '')}@kindling.app`,
          `DTSTAMP:${stamp}`,
          `DTSTART:${keyOf(d).replace(/-/g, '')}T${time.replace(':', '')}00`,
          'DURATION:PT15M',
          `RRULE:${rule}`,
          `SUMMARY:${icsEsc(`${h.emoji} ${h.name}`)}`,
          `DESCRIPTION:${icsEsc(h.kind === 'quit' ? 'Kindling check-in. Stay strong!' : `Kindling habit reminder. ${scheduleText(h)}.`)}`,
          'TRANSP:TRANSPARENT',
          'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(h.name)}`, 'TRIGGER:PT0M', 'END:VALARM',
          'END:VEVENT');
      }
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  /* ================= settings status ================= */
  function refreshMenuStatus() {
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    $('#notifStatus').textContent = {
      unsupported: "This browser can't show notifications. Reminders pop up inside Kindling while it's open.",
      granted: '✓ Notifications are on. They fire while Kindling is open in a tab or as an installed app. For reminders when it’s closed, add them to your calendar.',
      denied: "Notifications are blocked for this site. Allow them in your browser's site settings, or add reminders to your calendar.",
      default: 'Notifications are off. Without them, reminders only pop up inside Kindling.',
    }[perm];
    $('#notifBtn').hidden = perm !== 'default';
    const sw = 'serviceWorker' in navigator && isSecureContext;
    $('#offlineStatus').textContent = !sw
      ? 'Offline mode needs Kindling opened from a web address (like http://localhost:5179), not as a file.'
      : navigator.serviceWorker.controller ? '✓ Ready to work offline. The app and your habits are stored on this device.' : 'Getting ready for offline use…';
  }
  $('#notifBtn').onclick = async () => {
    try { await Notification.requestPermission(); } catch { /* ignore */ }
    refreshMenuStatus();
    if (Notification.permission === 'granted') toast('🔔 Notifications on');
  };
  $('#testNotifBtn').onclick = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* ignore */ }
      refreshMenuStatus();
    }
    const ok = await notify({ id: null, emoji: '🔥', name: 'Test reminder' }, todayKey());
    toast(ok ? 'Test notification sent' : "Notifications aren't allowed, so reminders will pop up in the app instead", null, null, 4000);
  };
  $('#calAllBtn').onclick = () => {
    const list = active().filter((h) => h.reminders.length);
    if (!list.length) { toast('No habits have a reminder yet. Add one in a habit’s Edit screen.', null, null, 4000); return; }
    downloadFile(`kindling-reminders-${todayKey()}.ics`, icsFor(list), 'text/calendar');
    toast(`Calendar file with ${plural(list.reduce((n, h) => n + h.reminders.length, 0), 'reminder')} downloaded. Open it to add them.`, null, null, 4500);
  };

  /* ================= offline / install ================= */
  const paintNet = () => { $('#offlinePill').hidden = navigator.onLine; };
  addEventListener('online', paintNet);
  addEventListener('offline', paintNet);
  paintNet();
  if ('serviceWorker' in navigator && isSecureContext) {
    navigator.serviceWorker.register('sw.js').then((r) => { swReg = r; }).catch(() => { /* offline unavailable */ });
    navigator.serviceWorker.ready.then((r) => { swReg = r; refreshMenuStatus(); });
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'kindling:done') markDone(e.data.id, e.data.date); });
  }
  let installEvt = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('#installBtn').hidden = false; });
  $('#installBtn').onclick = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch { /* ignore */ }
    installEvt = null;
    $('#installBtn').hidden = true;
  };
  addEventListener('appinstalled', () => toast('Kindling installed 🎉'));
  {
    const qp = new URLSearchParams(location.search);
    if (qp.get('done')) {
      setTimeout(() => markDone(qp.get('done'), qp.get('date') || todayKey()), 0);
      history.replaceState(null, '', location.pathname);
    }
  }

  /* ================= theme ================= */
  function applyTheme() {
    if (state.theme) document.documentElement.dataset.theme = state.theme;
    else delete document.documentElement.dataset.theme;
    const dark = state.theme ? state.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    $('#themeBtn').textContent = dark ? '☀️' : '🌙';
    $('#themeBtn').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  $('#themeBtn').onclick = () => {
    const dark = state.theme ? state.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    state.theme = dark ? 'light' : 'dark';
    persist(); applyTheme();
  };
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

  /* ================= navigation & global ================= */
  function switchView(v) {
    view = v;
    document.querySelectorAll('.tab').forEach((x) => { const on = x.dataset.view === v; x.classList.toggle('active', on); x.setAttribute('aria-selected', String(on)); });
    $('.tabs').dataset.active = v;
    $('#view-today').hidden = v !== 'today';
    $('#view-stats').hidden = v !== 'stats';
    $('#addBtn').hidden = v !== 'today';
    render();
    scrollTo({ top: 0 });
  }
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));
  $('#levelChip').onclick = () => switchView('stats');
  $('#weekPrev').onclick = () => { weekOffset--; renderToday(); };
  $('#weekNext').onclick = () => { if (weekOffset < 0) { weekOffset++; renderToday(); } };
  $('#addBtn').onclick = () => openEditor();
  document.querySelectorAll('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]') || e.target.matches?.('input, textarea, select')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'n') { e.preventDefault(); openEditor(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const d = addDays(parseKey(selectedKey), e.key === 'ArrowLeft' ? -1 : 1);
      if (d > startOfToday()) return;
      selectedKey = keyOf(d);
      weekOffset = Math.round((mondayOf(d) - mondayOf(startOfToday())) / (7 * 864e5));
      if (view === 'today') renderToday();
    }
  });

  let lastDay = todayKey();
  setInterval(() => {
    if (todayKey() !== lastDay) { if (selectedKey === lastDay) selectedKey = todayKey(); lastDay = todayKey(); weekOffset = 0; render(); }
    checkReminders();
    resetTitle();
  }, 30_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); checkReminders(); } });

  render();
  if (state.timer) startTicker();
  scheduleBadgeCheck();
  setTimeout(checkReminders, 1500);
})();
