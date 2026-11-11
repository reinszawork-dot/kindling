/* Goals: progress from linked-habit check-ins and milestones, deadlines and pace. */
import { state, patchGoal, deleteGoal, replaceState, active } from '../store.js';
import { el, icon, parseKey, fmtShort, plural, pct, todayKey, fmtDate } from '../util.js';
import { goalProgress } from '../stats.js';
import { ring } from '../charts.js';
import { pageHead, card, emptyState, menu, confirmDialog, toast, segmented, confetti } from '../ui.js';
import { openGoalEditor } from '../editor.js';
import { scheduleChecks } from '../actions.js';

let tab = 'active';

function goalCard(g, i, animate) {
  const p = goalProgress(g);
  const r = ring(84, 8);
  setTimeout(() => r.set(p.pct, animate), 0);
  const more = el('button', { type: 'button', class: 'icon-btn ghost', 'aria-label': `More actions for ${g.title}`, onclick: () => menu(more, [
    { label: 'Edit', icon: 'edit', run: () => openGoalEditor(g) },
    g.completedAt ? { label: 'Reopen', icon: 'upload', run: () => patchGoal(g.id, { completedAt: null }) }
      : { label: 'Mark complete', icon: 'check', run: () => { patchGoal(g.id, { completedAt: todayKey() }); confetti({ count: 110 }); toast(`${g.emoji} Goal complete. Well done.`); scheduleChecks(); } },
    g.archived ? { label: 'Restore', icon: 'upload', run: () => patchGoal(g.id, { archived: false }) } : { label: 'Archive', icon: 'archive', run: () => patchGoal(g.id, { archived: true }) },
    { label: 'Delete', icon: 'trash', danger: true, run: async () => {
      if (!(await confirmDialog(`Delete “${g.title}”?`, 'The goal and its milestones will be removed. Your habits and their history stay.', 'Delete goal'))) return;
      const snap = JSON.stringify(state);
      deleteGoal(g.id);
      toast('Goal deleted', { label: 'Undo', run: () => replaceState(JSON.parse(snap)) });
    } },
  ]) }, icon('more', 18));
  const deadline = g.completedAt ? el('span', { class: 'pill good' }, icon('check', 13), `Completed ${fmtShort(parseKey(g.completedAt))}`)
    : p.daysLeft == null ? el('span', { class: 'pill' }, 'No deadline')
      : p.daysLeft < 0 ? el('span', { class: 'pill warn' }, `${plural(-p.daysLeft, 'day')} past deadline`)
        : el('span', { class: 'pill' }, icon('calendar', 13), p.daysLeft === 0 ? 'Due today' : `${plural(p.daysLeft, 'day')} left · ${fmtDate(parseKey(g.deadline), { month: 'short', day: 'numeric' })}`);
  const pace = !g.completedAt && p.onTrack != null && p.daysLeft >= 0 ? el('span', { class: `pill ${p.onTrack ? 'good' : 'warn'}` }, p.onTrack ? 'On track' : 'Behind pace') : null;
  return card({ class: 'goal-card' + (g.completedAt ? ' done' : ''), style: { '--d': `${i * 70}ms` } },
    el('div', { class: 'goal-top' },
      el('div', { class: 'goal-ring' }, r.node, el('span', { class: 'gr-emoji' }, g.emoji)),
      el('div', { class: 'goal-text' },
        el('h3', { class: 'serif' }, g.title),
        g.why ? el('p', { class: 'muted small' }, g.why) : null,
        el('div', { class: 'pills' }, el('span', { class: 'pill accent' }, `${pct(p.pct)} complete`), deadline, pace)),
      more),
    g.target > 0 ? el('div', { class: 'goal-metric' },
      el('div', { class: 'gm-top' }, el('span', {}, 'Check-ins from linked habits'), el('b', {}, `${Math.min(p.checkins, g.target)} / ${g.target}`)),
      el('span', { class: 'progress-bar' }, el('i', { style: { width: `${Math.min(1, p.checkins / g.target) * 100}%` } }))) : null,
    p.linked.length ? el('div', { class: 'goal-habits' }, el('span', { class: 'muted small' }, 'Linked:'),
      p.linked.map((h) => el('a', { href: `#/habit/${h.id}`, class: 'chip plain sm' }, `${h.emoji} ${h.name}`))) : null,
    g.milestones.length ? el('ul', { class: 'milestones' }, g.milestones.map((m) => el('li', { class: m.done ? 'done' : '' },
      el('label', {}, el('input', {
        type: 'checkbox', checked: m.done, onchange: (e) => {
          const ms = g.milestones.map((x) => (x.id === m.id ? { ...x, done: e.target.checked } : x));
          patchGoal(g.id, { milestones: ms });
          if (e.target.checked) toast(`Milestone done: ${m.text}`);
          scheduleChecks();
        },
      }), el('span', { class: 'cb', 'aria-hidden': 'true' }, icon('check', 12)), el('span', {}, m.text))))) : null,
    !g.target && !g.milestones.length && !g.completedAt ? el('p', { class: 'muted small' }, 'Add milestones or a check-in target to track progress, or mark it complete from the menu.') : null);
}

export const goalsView = {
  title: 'Goals',
  mount(root, { animate }) {
    const list = state.goals.filter((g) => (tab === 'archived' ? g.archived : !g.archived && (tab === 'done' ? g.completedAt : !g.completedAt)));
    const counts = { active: state.goals.filter((g) => !g.archived && !g.completedAt).length, done: state.goals.filter((g) => !g.archived && g.completedAt).length, archived: state.goals.filter((g) => g.archived).length };
    const host = el('div', { class: 'goal-grid' + (animate ? ' animate' : '') });
    if (!state.goals.length) {
      host.append(card({ class: 'span-all' }, emptyState({ emoji: '🎯', title: 'Give your habits a destination', text: active().length ? 'Link habits to a goal, add milestones and a deadline, and watch the progress fill in.' : 'Create a few habits first, then link them to a goal.', action: { label: 'New goal', run: () => openGoalEditor() } })));
    } else if (!list.length) {
      host.append(card({ class: 'span-all' }, emptyState({ emoji: tab === 'done' ? '🏔' : '🗄', title: tab === 'done' ? 'No completed goals yet' : tab === 'archived' ? 'Nothing archived' : 'No active goals', text: tab === 'active' ? 'Start a new one whenever you’re ready.' : '' })));
    } else list.sort((a, b) => (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1).forEach((g, i) => host.append(goalCard(g, i, animate)));
    root.append(...[
      pageHead('Goals', counts.active ? `${plural(counts.active, 'active goal')}${counts.done ? ` · ${counts.done} completed` : ''}` : 'Where your habits are taking you',
        el('button', { type: 'button', class: 'btn primary', onclick: () => openGoalEditor() }, icon('plus', 16), 'New goal')),
      state.goals.length ? el('div', { class: 'toolbar' }, segmented([
        { value: 'active', label: `Active ${counts.active}` }, { value: 'done', label: `Completed ${counts.done}` }, { value: 'archived', label: `Archived ${counts.archived}` },
      ], tab, (v) => { tab = v; root.replaceChildren(); this.mount(root, { animate: true }); }, 'Filter goals')) : null,
      host].filter(Boolean));
  },
};
