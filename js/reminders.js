/* Reminders: in-app + system notifications while Kindling is open, and .ics export for always-on alerts. */
import { state, persist, active, byId, pushFeed } from './store.js';
import { inProgress, isDone, countOf, streakInfo, isWeekly, isDue } from './stats.js';
import { toast } from './ui.js';
import { markDone, feedEvent } from './actions.js';
import { todayKey, startOfToday, nowMin, toMin, keyOf, addDays, dowOrder } from './util.js';

const WINDOW = 120; // minutes after a reminder time we'll still nudge
const remKey = (h, time) => `${h.id}@${time}`;
let swReg = null;
export const setSwReg = (r) => { swReg = r; };

/** After saving a habit, treat reminders whose time already passed today as sent (no instant nag). */
export function armReminders(h) {
  const k = todayKey();
  const sent = ((state.notified && state.notified[k]) || []).filter((x) => !x.startsWith(`${h.id}@`) && x !== h.id);
  for (const time of h.reminders) if (nowMin() >= toMin(time)) sent.push(remKey(h, time));
  state.notified = { [k]: sent };
  persist();
}

export function checkReminders() {
  if (!state.settings.notifications) return;
  const k = todayKey();
  const t = startOfToday();
  const now = nowMin();
  const sent = (state.notified && state.notified[k]) || [];
  const due = [];
  for (const h of active()) {
    for (const time of h.reminders) {
      const key = remKey(h, time);
      if (sent.includes(key) || sent.includes(h.id) || now < toMin(time) || now - toMin(time) > WINDOW) continue;
      if (h.kind === 'build' && (!inProgress(h, t) || isDone(h, k))) continue;
      if (h.kind === 'quit' && (countOf(h, k) || !isDue(h, t))) continue;
      due.push({ h, key });
    }
  }
  if (!due.length) return;
  state.notified = { [k]: [...sent, ...due.map((x) => x.key)] };
  const habits = [...new Map(due.map((x) => [x.h.id, x.h])).values()];
  for (const h of habits) pushFeed({ type: 'reminder', text: h.kind === 'quit' ? `🛡 Check-in: ${h.emoji} ${h.name}` : `🔔 Time for ${h.emoji} ${h.name}`, habit: h.id });
  persist();
  feedEvent();
  if (document.visibilityState === 'visible') {
    const h = habits[0];
    if (habits.length > 1) toast(`🔔 ${habits.length} habits are due: ${habits.map((x) => x.emoji).join(' ')}`, null, 8000);
    else if (h.kind === 'quit') toast(`🛡 Check-in: ${h.emoji} ${h.name}. ${streakInfo(h).cur} days clean.`, null, 8000);
    else toast(`🔔 Time for ${h.emoji} ${h.name}`, { label: 'Mark done', run: () => markDone(h.id, k) }, 15000);
  } else habits.forEach((h) => notify(h, k));
}

export async function notify(h, k) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const real = h.id ? byId(h.id) : null;
  const streak = real ? streakInfo(real).cur : 0;
  const title = `${h.emoji} ${h.name}`;
  const body = !real ? 'Keep the fire going.'
    : real.kind === 'quit' ? `${streak} days clean. Keep it going.`
      : streak ? `Keep your ${streak}-${isWeekly(real) ? 'week' : 'day'} streak alive.` : 'A small step today keeps the fire going.';
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

/* ---------- calendar (.ics) ---------- */
const ICS_DAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const icsEsc = (s) => String(s).replace(/[\\;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
export function icsFor(habits) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kindling//Habit Reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const h of habits) {
    let d = startOfToday();
    for (let i = 0; i < 31 && !isDue(h, d); i++) d = addDays(d, 1);
    let rule = 'FREQ=DAILY';
    if (h.kind === 'build' && h.freq.type === 'days') rule = `FREQ=WEEKLY;BYDAY=${dowOrder(1).filter((x) => h.freq.days.includes(x)).map((x) => ICS_DAY[x]).join(',')}`;
    else if (h.kind === 'build' && h.freq.type === 'interval') rule = `FREQ=DAILY;INTERVAL=${h.freq.every}`;
    const times = h.reminders.length ? h.reminders : [h.time || state.settings.defaultReminder || '09:00'];
    for (const time of times) {
      lines.push('BEGIN:VEVENT',
        `UID:kindling-${h.id}-${time.replace(':', '')}@kindling.app`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${keyOf(d).replace(/-/g, '')}T${time.replace(':', '')}00`,
        'DURATION:PT15M', `RRULE:${rule}`,
        `SUMMARY:${icsEsc(`${h.emoji} ${h.name}`)}`,
        `DESCRIPTION:${icsEsc(h.kind === 'quit' ? 'Kindling check-in. Stay strong!' : 'Kindling habit reminder.')}`,
        'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(h.name)}`, 'TRIGGER:PT0M', 'END:VALARM',
        'END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
