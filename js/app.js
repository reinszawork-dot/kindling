/* App shell: navigation, routing, theme, reminders loop, service worker. */
import { state, onChange, persist } from './store.js';
import { el, icon, $, todayKey, reduceMotion } from './util.js';
import { disposeCharts } from './charts.js';
import { avatarEl, bellButton } from './shell.js';
import { startTicker, markDone, runChecks, scheduleChecks } from './actions.js';
import { checkReminders, setSwReg } from './reminders.js';
import { openHabitEditor } from './editor.js';
import { dashboard } from './views/dashboard.js';
import { habitsView } from './views/habits.js';
import { habitView } from './views/habit.js';
import { analyticsView } from './views/analytics.js';
import { calendarView } from './views/calendar.js';
import { goalsView } from './views/goals.js';
import { achievementsView } from './views/achievements.js';
import { settingsView } from './views/settings.js';

const ROUTES = {
  '': dashboard, habits: habitsView, habit: habitView, analytics: analyticsView, calendar: calendarView,
  goals: goalsView, achievements: achievementsView, settings: settingsView, profile: settingsView,
};
const NAV = [
  { id: '', label: 'Dashboard', icon: 'home' },
  { id: 'habits', label: 'My Habits', icon: 'habits' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'goals', label: 'Goals', icon: 'target' },
  { id: 'achievements', label: 'Achievements', icon: 'award' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];
const MOBILE_NAV = [
  { id: '', label: 'Home', icon: 'home' },
  { id: 'habits', label: 'Habits', icon: 'habits' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'settings', label: 'Profile', icon: 'user', also: ['goals', 'achievements', 'profile'] },
];

let main, sidebar, bottomNav, mobileTop, fab;
let current = { name: null, params: [] };

const parseHash = () => {
  const parts = (location.hash || '#/').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const name = ROUTES[parts[0] || ''] ? parts[0] || '' : '';
  return { name, params: parts.slice(1) };
};
const navActive = (id, name) => id === name || (id === 'habits' && name === 'habit');

/* ---------- theme ---------- */
function applyTheme() {
  const t = state.settings.theme;
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#191817' : '#F8F5F0');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
const toggleTheme = () => {
  const dark = state.settings.theme ? state.settings.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  state.settings.theme = dark ? 'light' : 'dark';
  persist();
  applyTheme();
  paintChrome();
};

/* ---------- chrome ---------- */
function buildShell() {
  const app = $('#app');
  sidebar = el('aside', { class: 'sidebar', 'aria-label': 'Main navigation' });
  mobileTop = el('header', { class: 'mobile-top' });
  main = el('main', { id: 'view', class: 'view', tabindex: '-1' });
  bottomNav = el('nav', { class: 'bottom-nav', 'aria-label': 'Main navigation' });
  fab = el('button', { type: 'button', class: 'fab', 'aria-label': 'New habit', onclick: () => openHabitEditor() }, icon('plus', 24));
  app.replaceChildren(el('div', { class: 'shell' + (state.settings.sidebarCollapsed ? ' collapsed' : '') },
    sidebar, el('div', { class: 'main-col' }, mobileTop, main), bottomNav, fab));
  app.classList.remove('booting');
}

function paintChrome() {
  const { name } = current;
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  sidebar.replaceChildren(
    el('div', { class: 'sb-top' },
      el('a', { href: '#/', class: 'brand' }, el('span', { class: 'brand-mark' }, el('img', { src: 'icon.svg', alt: '' })), el('span', { class: 'brand-name serif' }, 'Kindling')),
      el('button', { type: 'button', class: 'icon-btn ghost sb-collapse', 'aria-label': state.settings.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar', title: 'Collapse sidebar',
        onclick: () => {
          state.settings.sidebarCollapsed = !state.settings.sidebarCollapsed;
          persist();
          $('.shell').classList.toggle('collapsed', state.settings.sidebarCollapsed);
          paintChrome();
          dispatchEvent(new Event('resize'));
        } }, icon('sidebar', 18))),
    el('nav', { class: 'sb-nav' }, NAV.map((n) => el('a', {
      href: `#/${n.id}`, class: 'sb-link' + (navActive(n.id, name) ? ' active' : ''), 'aria-current': navActive(n.id, name) ? 'page' : null, title: n.label,
    }, icon(n.icon, 19), el('span', {}, n.label)))),
    el('div', { class: 'sb-bottom' },
      el('button', { type: 'button', class: 'sb-link', onclick: toggleTheme, title: dark ? 'Light mode' : 'Dark mode' }, icon(dark ? 'sun' : 'moon', 19), el('span', {}, dark ? 'Light mode' : 'Dark mode')),
      el('a', { href: '#/settings', class: 'sb-profile', title: 'Profile' }, avatarEl(36),
        el('span', { class: 'sbp-text' }, el('b', {}, state.profile.name || 'Your profile'), el('small', {}, 'View profile')))));
  mobileTop.replaceChildren(
    el('a', { href: '#/', class: 'brand' }, el('span', { class: 'brand-mark' }, el('img', { src: 'icon.svg', alt: '' })), el('span', { class: 'brand-name serif' }, 'Kindling')),
    el('div', { class: 'mt-tools' }, el('button', { type: 'button', class: 'icon-btn ghost', 'aria-label': dark ? 'Light mode' : 'Dark mode', onclick: toggleTheme }, icon(dark ? 'sun' : 'moon', 19)), bellButton()));
  bottomNav.replaceChildren(...MOBILE_NAV.map((n) => {
    const on = navActive(n.id, name) || (n.also || []).includes(name);
    return el('a', { href: `#/${n.id}`, class: 'bn-link' + (on ? ' active' : ''), 'aria-current': on ? 'page' : null }, icon(n.icon, 22), el('span', {}, n.label));
  }));
  mobileTop.hidden = name === '';
  fab.hidden = !['', 'habits'].includes(name) || !state.habits.length;
}

/* ---------- routing ---------- */
function render(animate = true) {
  const r = parseHash();
  const changed = r.name !== current.name || r.params.join('/') !== current.params.join('/');
  current = r;
  const view = ROUTES[r.name];
  disposeCharts();
  document.querySelectorAll('.popmenu, .feed-panel').forEach((n) => n.remove());
  main.replaceChildren();
  main.classList.remove('page-enter');
  if (animate && !reduceMotion()) { void main.offsetWidth; main.classList.add('page-enter'); }
  view.mount(main, { animate: animate && !reduceMotion(), params: r.params });
  document.title = r.name === '' ? 'Kindling' : `${view.title} · Kindling`;
  paintChrome();
  if (changed) { scrollTo({ top: 0 }); main.focus({ preventScroll: true }); }
}

function refreshCurrent(info) {
  const view = ROUTES[current.name];
  applyTheme();
  if (view.update) {
    const y = scrollY;
    view.update(info, main);
    if (Math.abs(scrollY - y) > 2) scrollTo({ top: y });
  } else {
    const y = scrollY;
    disposeCharts();
    main.replaceChildren();
    view.mount(main, { animate: false, params: current.params });
    scrollTo({ top: y });
  }
  paintChrome();
}

settingsView.update = (info, root) => {
  if (info.profile && !info.reset) { paintChrome(); return; } // don't rebuild while typing a name
  root.replaceChildren();
  settingsView.mount(root);
};

/* ---------- boot ---------- */
applyTheme();
buildShell();
addEventListener('hashchange', () => render(true));
onChange((info) => { refreshCurrent(info); });
render(true);

if (state.timer) startTicker();
scheduleChecks();
setTimeout(() => { runChecks(); checkReminders(); }, 1500);

let lastDay = todayKey();
setInterval(() => {
  if (todayKey() !== lastDay) { lastDay = todayKey(); dashboard.reset(); render(false); }
  checkReminders();
}, 30_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (todayKey() !== lastDay) { lastDay = todayKey(); dashboard.reset(); } refreshCurrent({}); checkReminders(); } });

document.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]') || e.target.matches?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n') { e.preventDefault(); openHabitEditor(); }
  const jump = { 1: '', 2: 'habits', 3: 'analytics', 4: 'calendar', 5: 'goals', 6: 'achievements', 7: 'settings' }[e.key];
  if (jump !== undefined) location.hash = `#/${jump}`;
});

if ('serviceWorker' in navigator && isSecureContext) {
  navigator.serviceWorker.register('sw.js').then(setSwReg).catch(() => {});
  navigator.serviceWorker.ready.then(setSwReg);
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'kindling:done') markDone(e.data.id, e.data.date); });
}
{
  const qp = new URLSearchParams(location.search);
  if (qp.get('done')) {
    setTimeout(() => markDone(qp.get('done'), qp.get('date') || todayKey()), 0);
    history.replaceState(null, '', location.pathname + location.hash);
  }
}
