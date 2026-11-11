/* Profile & settings. */
import { state, setProfile, setSetting, replaceState, blank, active, storageHealthy } from '../store.js';
import { MOODS } from '../data.js';
import { el, icon, downloadFile, todayKey, parseKey, addDays, startOfToday, keyOf } from '../util.js';
import { dayStatus, countOf, noteOf, unitOf, isWeekly } from '../stats.js';
import { pageHead, card, cardHead, segmented, toast, confirmDialog } from '../ui.js';
import { avatarEl } from '../shell.js';
import { icsFor, notify } from '../reminders.js';

let installEvt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });

function toCSV() {
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = [['date', 'habit', 'category', 'type', 'status', 'amount', 'goal', 'unit', 'completed_at', 'note', 'mood']];
  const habits = [...state.habits].sort((a, b) => a.order - b.order);
  const keys = [...habits.map((h) => h.createdAt), ...Object.keys(state.mood)].sort();
  if (keys.length) {
    const t = startOfToday();
    for (let d = parseKey(keys[0]); d <= t; d = addDays(d, 1)) {
      const k = keyOf(d);
      if (state.mood[k]) rows.push([k, '(mood)', '', '', MOODS[state.mood[k] - 1].l, '', '', '', '', '', state.mood[k]]);
      for (const h of habits) {
        const s = dayStatus(h, d);
        if (s === 'before' || s === 'future') continue;
        const c = countOf(h, k);
        if ((s === 'rest' || s === 'paused') && !c && !noteOf(h, k)) continue;
        const status = { on: h.kind === 'quit' ? 'clean' : 'completed', partial: 'partial', skip: 'skipped', slip: 'slipped', miss: 'missed', none: isWeekly(h) ? '' : 'open', rest: 'not scheduled', paused: 'paused' }[s];
        rows.push([k, h.name, h.category, h.kind, status, h.kind === 'quit' ? '' : c, h.kind === 'quit' ? '' : h.target, h.kind === 'quit' ? '' : unitOf(h), state.stamps[k]?.[h.id] || '', noteOf(h, k), '']);
      }
    }
  }
  return rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = 192;
      const c = document.createElement('canvas');
      c.width = s; c.height = s;
      const ctx = c.getContext('2d');
      const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const row = (title, desc, control) => el('div', { class: 'set-row' }, el('div', {}, el('b', {}, title), desc ? el('p', { class: 'muted small' }, desc) : null), el('div', { class: 'set-control' }, control));

export const settingsView = {
  title: 'Settings',
  mount(root) {
    const s = state.settings;
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const fileIn = el('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      if (!f.type.startsWith('image/')) { toast('Please choose an image file'); return; }
      try { setProfile({ avatar: await resizeImage(f) }); toast('Profile picture updated'); } catch { toast('That image couldn’t be read'); }
    } });
    const importIn = el('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!Array.isArray(data.habits) || typeof data.log !== 'object') throw new Error('bad');
        if (!(await confirmDialog('Replace your data?', `This backup has ${data.habits.length} habits. Your current data on this device will be replaced.`, 'Import', false))) return;
        const { app, version, exportedAt, ...rest } = data;
        replaceState({ ...rest, settings: { ...(rest.settings || {}), theme: state.settings.theme }, badgesSeen: null, levelSeen: null, timer: null });
        toast('Backup restored');
      } catch { toast('That file doesn’t look like a Kindling backup'); }
    } });
    let nameTimer;
    const sw = 'serviceWorker' in navigator && isSecureContext;
    const persisted = el('span', { class: 'muted small' }, '…');
    if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then((p) => { persisted.textContent = p ? 'Protected: the browser won’t clear it automatically.' : 'Not yet protected.'; });

    root.append(
      pageHead('Profile & settings', 'Make Kindling yours'),
      el('nav', { class: 'mobile-links' },
        el('a', { href: '#/goals', class: 'card link-card' }, icon('target', 20), 'Goals', icon('right', 16)),
        el('a', { href: '#/achievements', class: 'card link-card' }, icon('award', 20), 'Achievements', icon('right', 16))),
      card({}, cardHead('Profile'),
        el('div', { class: 'profile-row' },
          el('button', { type: 'button', class: 'avatar-edit', 'aria-label': 'Change profile picture', onclick: () => fileIn.click() }, avatarEl(76), el('span', {}, icon('edit', 14))),
          el('div', { class: 'grow' },
            el('label', { class: 'field-label', for: 'profileName' }, 'Your name'),
            el('input', { id: 'profileName', class: 'input', maxlength: 40, placeholder: 'What should we call you?', value: state.profile.name,
              oninput: (e) => { clearTimeout(nameTimer); const v = e.target.value; nameTimer = setTimeout(() => setProfile({ name: v.trim().slice(0, 40) }), 400); } }),
            el('div', { class: 'inline' },
              el('button', { type: 'button', class: 'btn sm', onclick: () => fileIn.click() }, icon('upload', 14), 'Upload photo'),
              state.profile.avatar ? el('button', { type: 'button', class: 'btn sm ghost', onclick: () => setProfile({ avatar: null }) }, 'Remove') : null))),
        fileIn),
      card({}, cardHead('Appearance'),
        row('Theme', 'Follow your device, or pick one.', segmented([{ value: '', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], s.theme || '', (v) => setSetting('theme', v || null), 'Theme'))),
      card({}, cardHead('Reminders & notifications'),
        row('Reminders', 'Show reminders for habits that have reminder times.', el('label', { class: 'switch' },
          el('input', { type: 'checkbox', checked: s.notifications, onchange: (e) => setSetting('notifications', e.target.checked) }), el('span', { class: 'switch-ui', 'aria-hidden': 'true' }))),
        row('System notifications', {
          granted: 'Allowed. Reminders also appear outside the app while Kindling is open in a tab or installed.',
          denied: 'Blocked in your browser’s site settings. Reminders still show inside the app.',
          default: 'Not enabled yet.', unsupported: 'Not supported in this browser.',
        }[perm], perm === 'default'
          ? el('button', { type: 'button', class: 'btn sm', onclick: async () => { try { await Notification.requestPermission(); } catch { /* ignore */ } root.replaceChildren(); this.mount(root); } }, 'Enable')
          : el('button', { type: 'button', class: 'btn sm ghost', disabled: perm !== 'granted', onclick: async () => toast((await notify({ id: null, emoji: '🔥', name: 'Test reminder' }, todayKey())) ? 'Test notification sent' : 'Couldn’t send a notification') }, 'Send test')),
        row('Default reminder time', 'Used when you add a reminder to a habit.', el('input', { type: 'time', class: 'input', value: s.defaultReminder, onchange: (e) => e.target.value && setSetting('defaultReminder', e.target.value) })),
        row('Calendar reminders', 'Download your reminders as calendar events, so they work even when Kindling is closed.', el('button', { type: 'button', class: 'btn sm', onclick: () => {
          const list = active().filter((h) => h.reminders.length);
          if (!list.length) { toast('No habits have reminders yet'); return; }
          downloadFile(`kindling-reminders-${todayKey()}.ics`, icsFor(list), 'text/calendar');
          toast('Calendar file downloaded');
        } }, icon('calendar', 14), 'Export'))),
      card({}, cardHead('Preferences'),
        row('Week starts on', 'Used by weekly habits, streaks, charts and the calendar.', segmented([{ value: 1, label: 'Monday' }, { value: 0, label: 'Sunday' }], Number(s.weekStart), (v) => setSetting('weekStart', Number(v)), 'Week start')),
        row('Measurements', 'Suggested units when you set a habit target.', segmented([{ value: 'metric', label: 'Metric' }, { value: 'imperial', label: 'Imperial' }], s.units, (v) => setSetting('units', v), 'Measurement units'))),
      card({}, cardHead('Your data'),
        el('p', { class: 'muted small' }, 'Kindling has no account: everything is stored privately on this device. Export a backup now and then, and import it on a new phone or browser.'),
        row('Storage', persisted, navigator.storage && navigator.storage.persist ? el('button', { type: 'button', class: 'btn sm ghost', onclick: async () => {
          const ok = await navigator.storage.persist();
          persisted.textContent = ok ? 'Protected: the browser won’t clear it automatically.' : 'Your browser declined. Installing the app usually helps.';
        } }, icon('shield', 14), 'Protect') : null),
        !storageHealthy() ? el('p', { class: 'field-error' }, 'Saving failed: your browser storage may be full or blocked. Export a backup now.') : null,
        el('div', { class: 'btn-row' },
          el('button', { type: 'button', class: 'btn', onclick: () => { downloadFile(`kindling-backup-${todayKey()}.json`, JSON.stringify({ app: 'kindling', version: 3, exportedAt: new Date().toISOString(), ...state }, null, 2), 'application/json'); toast('Backup downloaded'); } }, icon('download', 15), 'Export backup (.json)'),
          el('button', { type: 'button', class: 'btn', onclick: () => { downloadFile(`kindling-${todayKey()}.csv`, '﻿' + toCSV(), 'text/csv'); toast('Spreadsheet downloaded'); } }, icon('download', 15), 'Export spreadsheet (.csv)'),
          el('button', { type: 'button', class: 'btn ghost', onclick: () => importIn.click() }, icon('upload', 15), 'Import backup'), importIn),
        el('div', { class: 'danger-zone' },
          el('div', {}, el('b', {}, 'Erase everything'), el('p', { class: 'muted small' }, 'Deletes all habits, history, goals and settings on this device.')),
          el('button', { type: 'button', class: 'btn danger ghost', onclick: async () => {
            if (!(await confirmDialog('Erase everything?', 'All habits, history, notes, goals and your profile on this device will be deleted. Export a backup first if you want to keep them.', 'Erase everything'))) return;
            const snap = JSON.stringify(state);
            replaceState({ ...blank(), settings: { ...blank().settings, theme: state.settings.theme } });
            toast('Everything erased', { label: 'Undo', run: () => replaceState(JSON.parse(snap)) });
            location.hash = '#/';
          } }, icon('trash', 15), 'Erase'))),
      card({}, cardHead('App'),
        row('Offline', !sw ? 'Open Kindling from its web address (not as a file) to use it offline.' : navigator.serviceWorker.controller ? 'Ready. Kindling works without a connection.' : 'Getting ready…', null),
        row('Install', 'Add Kindling to your home screen or dock.', installEvt ? el('button', { type: 'button', class: 'btn sm', onclick: async () => { installEvt.prompt(); try { await installEvt.userChoice; } catch { /* ignore */ } installEvt = null; root.replaceChildren(); this.mount(root); } }, 'Install')
          : el('span', { class: 'muted small' }, matchMedia('(display-mode: standalone)').matches ? 'Installed' : 'Use your browser’s “Install” or “Add to Home Screen”.')),
        el('p', { class: 'muted small center' }, 'Kindling · made by NextWave Digital')));
  },
};
