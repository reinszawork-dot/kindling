/* My Habits: manage every habit — filter, search, edit, pause, archive, reorder, delete. */
import { state, active, allCategories, isPaused, setPaused, setArchived, deleteHabit, replaceState, reorder } from '../store.js';
import { el, icon, plural } from '../util.js';
import { streakInfo, rate, scheduleText, weeklyRates, strength } from '../stats.js';
import { sparkline } from '../charts.js';
import { pageHead, card, emptyState, menu, confirmDialog, toast, catChip, habitIcon, segmented } from '../ui.js';
import { openHabitEditor } from '../editor.js';
import { gate, openPacks, proBadge } from '../pro.js';

let filter = 'active';
let query = '';
let cat = 'all';

export async function deleteWithUndo(h, after) {
  const ok = await confirmDialog(`Delete “${h.name}”?`, 'This removes the habit and its whole history, notes and timer records. Archive it instead if you might want it back.', 'Delete habit');
  if (!ok) return;
  const snapshot = JSON.stringify(state);
  deleteHabit(h.id);
  after && after();
  toast(`${h.name} deleted`, { label: 'Undo', run: () => replaceState(JSON.parse(snapshot)) });
}

export function habitMenu(anchor, h, { onDelete } = {}) {
  const list = active();
  const i = list.findIndex((x) => x.id === h.id);
  menu(anchor, [
    { label: 'Edit', icon: 'edit', run: () => openHabitEditor(h.id) },
    h.archived ? null : isPaused(h)
      ? { label: 'Resume', icon: 'play', run: () => { setPaused(h.id, false); toast(`${h.name} resumed`); } }
      : { label: 'Pause', icon: 'pause', run: () => { setPaused(h.id, true); toast(`${h.name} paused. Your streak is safe while it rests.`); } },
    !h.archived && i > 0 ? { label: 'Move up', icon: 'arrowUp', run: () => { const ids = list.map((x) => x.id); [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; reorder(ids); } } : null,
    !h.archived && i >= 0 && i < list.length - 1 ? { label: 'Move down', icon: 'arrowDown', run: () => { const ids = list.map((x) => x.id); [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; reorder(ids); } } : null,
    h.archived
      ? { label: 'Restore', icon: 'upload', run: () => { setArchived(h.id, false); toast(`${h.name} restored`); } }
      : { label: 'Archive', icon: 'archive', run: () => { setArchived(h.id, true); toast(`${h.name} archived`, { label: 'Undo', run: () => setArchived(h.id, false) }); } },
    { label: 'Delete', icon: 'trash', danger: true, run: () => deleteWithUndo(h, onDelete) },
  ]);
}

function row(h, i) {
  const st = streakInfo(h);
  const r = rate(h);
  const paused = isPaused(h);
  const more = el('button', { type: 'button', class: 'icon-btn ghost', 'aria-label': `More actions for ${h.name}`, onclick: (e) => { e.preventDefault(); e.stopPropagation(); habitMenu(more, h); } }, icon('more', 18));
  return el('li', { class: 'manage-row' + (paused ? ' paused' : ''), style: { '--d': `${i * 35}ms` } },
    el('a', { href: `#/habit/${h.id}`, class: 'manage-link' },
      habitIcon(h),
      el('span', { class: 'manage-text' },
        el('span', { class: 'habit-name' }, h.name, paused ? el('span', { class: 'tag' }, 'Paused') : null, h.kind === 'quit' ? el('span', { class: 'tag quiet' }, 'Break') : null),
        el('span', { class: 'habit-meta' }, catChip(h.category), el('span', { class: 'meta-item' }, scheduleText(h)))),
      el('span', { class: 'manage-stats' },
        el('span', { class: 'ms-streak', title: `Best ${st.best}` }, icon(h.kind === 'quit' ? 'shield' : 'flame', 14), `${st.cur}`),
        el('span', { class: 'ms-spark', title: 'Weekly completion, last 8 weeks' }, sparkline(weeklyRates(h), 76, 26, h.color)),
        el('span', { class: 'ms-rate', title: `30-day completion · strength ${strength(h)}%` }, r == null ? '—' : `${Math.round(r * 100)}%`))),
    more);
}

export const habitsView = {
  title: 'My Habits',
  mount(root, { animate }) {
    const all = state.habits;
    const counts = {
      active: all.filter((h) => !h.archived && !isPaused(h)).length,
      paused: all.filter((h) => !h.archived && isPaused(h)).length,
      archived: all.filter((h) => h.archived).length,
    };
    const listHost = el('div', {});
    const draw = () => {
      let list = all.filter((h) => (filter === 'archived' ? h.archived : filter === 'paused' ? !h.archived && isPaused(h) : !h.archived && !isPaused(h)));
      if (cat !== 'all') list = list.filter((h) => h.category === cat);
      if (query) list = list.filter((h) => h.name.toLowerCase().includes(query.toLowerCase()));
      list.sort((a, b) => a.order - b.order);
      if (!all.length) {
        listHost.replaceChildren(card({}, emptyState({ emoji: '🌱', title: 'No habits yet', text: 'Create your first habit, or start from a template.', action: { label: 'New habit', run: () => openHabitEditor() } })));
        return;
      }
      if (!list.length) {
        listHost.replaceChildren(card({}, emptyState({ emoji: filter === 'archived' ? '🗄' : filter === 'paused' ? '⏸' : '🔍',
          title: query ? 'No matches' : filter === 'archived' ? 'Nothing archived' : filter === 'paused' ? 'Nothing paused' : 'No habits here',
          text: query ? 'Try a different search.' : filter === 'paused' ? 'Pause a habit when life gets busy; its streak waits for you.' : '' })));
        return;
      }
      const groups = cat === 'all' && !query
        ? allCategories().map((c) => ({ c, items: list.filter((h) => h.category === c.id) })).filter((g) => g.items.length)
        : [{ c: null, items: list }];
      let i = 0;
      listHost.replaceChildren(...groups.map((g) => card({ class: 'manage-group' + (animate ? ' animate' : '') },
        g.c ? el('div', { class: 'group-head' }, el('span', { class: 'dot', style: { background: g.c.color } }), el('h3', {}, g.c.name), el('span', { class: 'muted small' }, plural(g.items.length, 'habit'))) : null,
        el('ul', { class: 'manage-list' }, g.items.map((h) => row(h, i++))))));
    };
    const usedCats = allCategories().filter((c) => all.some((h) => h.category === c.id));
    root.append(...[
      pageHead('My Habits', `${plural(counts.active, 'active habit')}${counts.paused ? ` · ${counts.paused} paused` : ''}`,
        el('button', { type: 'button', class: 'btn', onclick: () => gate('Habit packs', openPacks) }, icon('sparkle', 16), 'Habit packs', proBadge()),
        el('button', { type: 'button', class: 'btn primary', onclick: () => openHabitEditor() }, icon('plus', 16), 'New habit')),
      el('div', { class: 'toolbar' },
        segmented([
          { value: 'active', label: `Active ${counts.active}` }, { value: 'paused', label: `Paused ${counts.paused}` }, { value: 'archived', label: `Archived ${counts.archived}` },
        ], filter, (v) => { filter = v; draw(); }, 'Filter habits'),
        el('label', { class: 'search' }, icon('search', 16),
          el('input', { type: 'search', placeholder: 'Search habits', value: query, 'aria-label': 'Search habits', oninput: (e) => { query = e.target.value.trim(); draw(); } }))),
      usedCats.length > 1 ? el('div', { class: 'chips scroll' },
        [{ id: 'all', name: 'All', color: 'var(--text-2)' }, ...usedCats].map((c) => el('button', {
          type: 'button', class: 'chip', style: { '--c': c.color }, 'aria-pressed': cat === c.id, onclick: (e) => { cat = c.id; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); draw(); },
        }, c.id === 'all' ? null : el('i', {}), c.name))) : null,
      listHost].filter(Boolean));
    draw();
  },
};
