/* Habit editor and goal editor modals. */
import { state, byId, addHabit, updateHabit, allCategories, addCategory, normHabit, saveGoal, active } from './store.js';
import { COLORS, EMOJIS, TEMPLATES, SECTIONS } from './data.js';
import { el, icon, DOW, dowOrder, todayKey, isValidKey, pad, uid } from './util.js';
import { openModal, toast, segmented } from './ui.js';
import { armReminders } from './reminders.js';

const ALL = [0, 1, 2, 3, 4, 5, 6];
const UNITS = {
  metric: ['times', 'glasses', 'ml', 'pages', 'steps', 'km', 'reps', 'kg', 'minutes'],
  imperial: ['times', 'glasses', 'oz', 'pages', 'steps', 'mi', 'reps', 'lb', 'minutes'],
};

const field = (label, ...kids) => el('div', { class: 'field' }, el('label', { class: 'field-label' }, label), ...kids);
const stepper = (value, onStep, { min, max, suffix }) => el('div', { class: 'stepper' },
  el('button', { type: 'button', 'aria-label': 'Decrease', disabled: value <= min, onclick: () => onStep(-1) }, '−'),
  el('output', {}, value),
  el('button', { type: 'button', 'aria-label': 'Increase', disabled: value >= max, onclick: () => onStep(1) }, '+'),
  suffix ? el('span', { class: 'muted' }, suffix) : null);

/* ================= habit editor ================= */
export function openHabitEditor(id = null, preset = null) {
  const existing = id ? byId(id) : null;
  const n = active().length;
  let draft = existing
    ? JSON.parse(JSON.stringify(existing))
    : normHabit({ name: '', emoji: EMOJIS[n % EMOJIS.length], color: COLORS[n % COLORS.length], ...(preset || {}) });
  if (!existing) { draft.id = null; draft.name = preset?.name || ''; }
  let days = draft.freq.type === 'days' ? draft.freq.days.slice() : ALL.slice();
  let times = draft.freq.type === 'weekly' ? draft.freq.times : 3;
  let every = draft.freq.type === 'interval' ? draft.freq.every : 2;
  let newCat = null;
  let error = '';
  const body = el('div', { class: 'editor' });

  const syncFreq = () => {
    if (draft.freq.type === 'days') draft.freq = { type: 'days', days: days.slice() };
    else if (draft.freq.type === 'weekly') draft.freq = { type: 'weekly', times };
    else draft.freq = { type: 'interval', every };
  };
  const applyTemplate = (t) => {
    const keep = draft.id;
    draft = normHabit({ ...t, freq: t.freq || { type: 'days', days: ALL.slice() }, unit: t.timer ? 'min' : t.unit || '', reminders: [] });
    draft.id = keep;
    days = draft.freq.type === 'days' ? draft.freq.days.slice() : ALL.slice();
    times = draft.freq.type === 'weekly' ? draft.freq.times : 3;
    every = draft.freq.type === 'interval' ? draft.freq.every : 2;
    paint();
  };

  function paint() {
    const quit = draft.kind === 'quit';
    const scrollTop = body.parentElement ? body.parentElement.scrollTop : 0;
    body.style.setProperty('--pick', draft.color);
    const nameInput = el('input', {
      id: 'habitName', class: 'input big', maxlength: 40, placeholder: quit ? 'e.g. No sugar after 8pm' : 'e.g. Drink water',
      value: draft.name, autocomplete: 'off', 'aria-invalid': error ? 'true' : null,
      oninput: (e) => { draft.name = e.target.value; },
    });
    body.replaceChildren(
      existing ? null : el('div', { class: 'field' }, el('label', { class: 'field-label' }, 'Start from a template'),
        el('div', { class: 'templates' }, TEMPLATES.map((t) => el('button', { type: 'button', class: 'tpl', onclick: () => applyTemplate(t) },
          el('span', {}, t.emoji), t.name, t.kind === 'quit' ? el('small', {}, 'quit') : null)))),

      field('Type', segmented([{ value: 'build', label: 'Build a habit' }, { value: 'quit', label: 'Break a habit' }], draft.kind, (v) => { draft.kind = v; paint(); }, 'Habit type')),

      field('Name',
        el('div', { class: 'name-row' }, el('span', { class: 'habit-icon lg', style: { '--c': draft.color } }, draft.emoji), nameInput),
        error ? el('p', { class: 'field-error', role: 'alert' }, error) : null),

      field('Icon', el('div', { class: 'emoji-grid' }, EMOJIS.map((e) => el('button', {
        type: 'button', 'aria-pressed': e === draft.emoji, 'aria-label': `Icon ${e}`, onclick: () => { draft.emoji = e; paint(); },
      }, e)))),

      field('Color', el('div', { class: 'swatches' }, COLORS.map((c) => el('button', {
        type: 'button', style: { '--sw': c }, 'aria-pressed': c === draft.color, 'aria-label': `Color ${c}`, onclick: () => { draft.color = c; paint(); },
      })))),

      field('Category', el('div', { class: 'chips' },
        allCategories().map((c) => el('button', {
          type: 'button', class: 'chip', style: { '--c': c.color }, 'aria-pressed': c.id === draft.category, onclick: () => { draft.category = c.id; paint(); },
        }, el('i', {}), c.name)),
        newCat == null
          ? el('button', { type: 'button', class: 'chip add', onclick: () => { newCat = ''; paint(); setTimeout(() => body.querySelector('#newCat')?.focus(), 30); } }, icon('plus', 14), 'New')
          : el('span', { class: 'new-cat' },
            el('input', { id: 'newCat', class: 'input sm', maxlength: 24, placeholder: 'Category name', value: newCat, oninput: (e) => { newCat = e.target.value; },
              onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); body.querySelector('#addCat').click(); } } }),
            el('button', { type: 'button', id: 'addCat', class: 'btn sm', onclick: () => {
              if (!newCat.trim()) return;
              draft.category = addCategory(newCat, draft.color); newCat = null; paint();
            } }, 'Add')))),

      quit ? null : el('div', { class: 'field-group' },
        el('h4', {}, 'Schedule'),
        segmented([{ value: 'days', label: 'Specific days' }, { value: 'weekly', label: 'Times per week' }, { value: 'interval', label: 'Every few days' }],
          draft.freq.type, (v) => { draft.freq = { type: v }; syncFreq(); paint(); }, 'Frequency'),
        draft.freq.type === 'days' ? el('div', {},
          el('div', { class: 'chips presets' }, [['Every day', ALL], ['Weekdays', [1, 2, 3, 4, 5]], ['Weekends', [0, 6]]].map(([l, set]) => el('button', {
            type: 'button', class: 'chip plain', 'aria-pressed': [...days].sort().join() === [...set].sort().join(), onclick: () => { days = set.slice(); syncFreq(); paint(); },
          }, l))),
          el('div', { class: 'dow-picker' }, dowOrder(state.settings.weekStart).map((d) => el('button', {
            type: 'button', 'aria-pressed': days.includes(d), 'aria-label': DOW[d],
            onclick: () => { if (days.includes(d)) { if (days.length > 1) days = days.filter((x) => x !== d); } else days.push(d); syncFreq(); paint(); },
          }, DOW[d].slice(0, 2))))) : null,
        draft.freq.type === 'weekly' ? stepper(times, (s) => { times = Math.min(7, Math.max(1, times + s)); syncFreq(); paint(); }, { min: 1, max: 7, suffix: 'times a week, on any days' }) : null,
        draft.freq.type === 'interval' ? stepper(every, (s) => { every = Math.min(30, Math.max(2, every + s)); syncFreq(); paint(); }, { min: 2, max: 30, suffix: 'days between each time' }) : null),

      el('div', { class: 'field-row' },
        field('Start date', el('input', { type: 'date', class: 'input', value: draft.createdAt, onchange: (e) => { if (isValidKey(e.target.value)) draft.createdAt = e.target.value; } })),
        field('Scheduled time', el('div', { class: 'inline' },
          el('input', { type: 'time', class: 'input', value: draft.time || '', onchange: (e) => { draft.time = e.target.value || null; } }),
          draft.time ? el('button', { type: 'button', class: 'icon-btn ghost', 'aria-label': 'Clear time', onclick: () => { draft.time = null; paint(); } }, icon('x', 16)) : null))),

      field('Time of day', segmented(SECTIONS.map((s) => ({ value: s.id, label: s.label })), draft.section, (v) => { draft.section = v; }, 'Time of day')),

      quit ? null : el('div', { class: 'field-group' },
        el('h4', {}, 'Daily target'),
        el('label', { class: 'switch' },
          el('input', { type: 'checkbox', checked: draft.timer, onchange: (e) => { draft.timer = e.target.checked; if (draft.timer) { draft.unit = 'min'; if (draft.target < 5) draft.target = 10; } else { draft.unit = ''; draft.target = 1; } paint(); } }),
          el('span', { class: 'switch-ui', 'aria-hidden': 'true' }), el('span', {}, 'Timed habit (built-in timer)')),
        el('div', { class: 'goal-row' },
          el('div', { class: 'stepper' },
            el('button', { type: 'button', 'aria-label': 'Decrease target', onclick: () => { draft.target = Math.max(1, draft.target - stepFor(draft.target - 1)); paint(); } }, '−'),
            el('input', { type: 'number', class: 'input num', min: 1, max: 100000, value: draft.target, 'aria-label': 'Target',
              onchange: (e) => { draft.target = Math.max(1, Math.min(100000, Math.round(Number(e.target.value)) || 1)); paint(); } }),
            el('button', { type: 'button', 'aria-label': 'Increase target', onclick: () => { draft.target = Math.min(100000, draft.target + stepFor(draft.target)); paint(); } }, '+')),
          draft.timer ? el('span', { class: 'muted' }, 'minutes a day')
            : el('input', { class: 'input unit', list: 'unitList', maxlength: 16, placeholder: 'unit (e.g. pages)', value: draft.unit, oninput: (e) => { draft.unit = e.target.value; } }),
          el('datalist', { id: 'unitList' }, UNITS[state.settings.units === 'imperial' ? 'imperial' : 'metric'].map((u) => el('option', { value: u })))),
        el('p', { class: 'hint' }, draft.timer ? 'Tap ▶ on the habit to start the timer. It checks itself off when time is up.'
          : draft.target === 1 ? 'A simple check-off. Raise the number to count glasses, pages, steps…'
            : draft.target > 20 ? 'You’ll type the amount when you log it.' : `Tap + to log each one, ${draft.target} a day.`)),

      el('div', { class: 'field-group' },
        el('h4', {}, 'Reminders'),
        el('div', { class: 'reminder-list' }, draft.reminders.map((t, i) => el('span', { class: 'reminder-item' },
          icon('bell', 14),
          el('input', { type: 'time', value: t, 'aria-label': `Reminder ${i + 1}`, onchange: (e) => { draft.reminders[i] = e.target.value || t; } }),
          el('button', { type: 'button', class: 'icon-btn ghost xs', 'aria-label': 'Remove reminder', onclick: () => { draft.reminders.splice(i, 1); paint(); } }, icon('x', 14))))),
        draft.reminders.length < 5 ? el('button', { type: 'button', class: 'btn sm ghost', onclick: () => {
          const used = new Set(draft.reminders);
          let t = draft.time || state.settings.defaultReminder || '09:00';
          while (used.has(t)) t = `${pad((Number(t.slice(0, 2)) + 1) % 24)}:${t.slice(3)}`;
          draft.reminders.push(t); paint();
        } }, icon('plus', 14), 'Add reminder') : null),
    );
    if (body.parentElement) body.parentElement.scrollTop = scrollTop;
  }
  const stepFor = (v) => (v >= 1000 ? 500 : v >= 100 ? 10 : v >= 30 ? 5 : 1);

  const submit = (close) => {
    draft.name = (draft.name || '').trim();
    if (!draft.name) { error = 'Give your habit a name.'; paint(); body.querySelector('#habitName')?.focus(); return; }
    syncFreq();
    if (draft.kind === 'quit') { draft.target = 1; draft.timer = false; draft.unit = ''; }
    draft.reminders = [...new Set(draft.reminders.filter(Boolean))].sort();
    let h;
    if (existing) { h = updateHabit(existing.id, draft); toast('Habit saved'); }
    else { h = addHabit(draft); toast(`${h.emoji} ${h.name} added`); }
    armReminders(h);
    if (h.reminders.length && state.settings.notifications && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    close();
  };

  paint();
  openModal((close) => ({
    title: existing ? 'Edit habit' : 'New habit',
    body,
    footer: [
      el('button', { type: 'button', class: 'btn ghost', onclick: close }, 'Cancel'),
      el('button', { type: 'button', class: 'btn primary', onclick: () => submit(close) }, existing ? 'Save changes' : 'Create habit'),
    ],
  }), { size: 'wide' });
  if (existing) setTimeout(() => body.querySelector('#habitName')?.focus(), 60);
}

/* ================= goal editor ================= */
const GOAL_EMOJIS = ['🎯', '🏔', '📖', '🏃', '💪', '🧘', '💰', '🎓', '🌱', '✈️', '🎨', '❤️'];
export function openGoalEditor(goal = null) {
  const draft = goal ? JSON.parse(JSON.stringify(goal)) : { id: null, title: '', emoji: '🎯', why: '', start: todayKey(), deadline: null, habits: [], target: 0, milestones: [] };
  let error = '';
  let msText = '';
  const body = el('div', { class: 'editor' });
  function paint() {
    const habits = active();
    body.replaceChildren(
      field('Goal',
        el('div', { class: 'name-row' }, el('span', { class: 'habit-icon lg' }, draft.emoji),
          el('input', { id: 'goalTitle', class: 'input big', maxlength: 60, placeholder: 'e.g. Run a 10k', value: draft.title, oninput: (e) => { draft.title = e.target.value; } })),
        error ? el('p', { class: 'field-error', role: 'alert' }, error) : null),
      field('Icon', el('div', { class: 'emoji-grid small' }, GOAL_EMOJIS.map((e) => el('button', { type: 'button', 'aria-pressed': e === draft.emoji, onclick: () => { draft.emoji = e; paint(); } }, e)))),
      field('Why it matters (optional)', el('textarea', { class: 'input', rows: 2, maxlength: 280, placeholder: 'A sentence to come back to on hard days', oninput: (e) => { draft.why = e.target.value; } }, draft.why)),
      el('div', { class: 'field-row' },
        field('Start', el('input', { type: 'date', class: 'input', value: draft.start, onchange: (e) => { if (isValidKey(e.target.value)) draft.start = e.target.value; } })),
        field('Deadline (optional)', el('input', { type: 'date', class: 'input', value: draft.deadline || '', min: draft.start, onchange: (e) => { draft.deadline = e.target.value || null; } }))),
      el('div', { class: 'field-group' },
        el('h4', {}, 'Linked habits'),
        habits.length ? el('div', { class: 'chips' }, habits.map((h) => el('button', {
          type: 'button', class: 'chip plain', 'aria-pressed': draft.habits.includes(h.id),
          onclick: () => { draft.habits = draft.habits.includes(h.id) ? draft.habits.filter((x) => x !== h.id) : [...draft.habits, h.id]; paint(); },
        }, `${h.emoji} ${h.name}`))) : el('p', { class: 'hint' }, 'Add habits first to link them to this goal.'),
        draft.habits.length ? el('div', { class: 'goal-row' },
          el('input', { type: 'number', class: 'input num', min: 0, max: 10000, value: draft.target || '', placeholder: '0',
            onchange: (e) => { draft.target = Math.max(0, Math.round(Number(e.target.value) || 0)); } }),
          el('span', { class: 'muted' }, 'check-ins needed (leave 0 to track milestones only)')) : null),
      el('div', { class: 'field-group' },
        el('h4', {}, 'Milestones'),
        el('ul', { class: 'ms-edit' }, draft.milestones.map((m, i) => el('li', {},
          el('input', { type: 'checkbox', checked: m.done, 'aria-label': 'Done', onchange: (e) => { m.done = e.target.checked; } }),
          el('input', { class: 'input sm', value: m.text, maxlength: 80, oninput: (e) => { m.text = e.target.value; } }),
          el('button', { type: 'button', class: 'icon-btn ghost xs', 'aria-label': 'Remove milestone', onclick: () => { draft.milestones.splice(i, 1); paint(); } }, icon('x', 14))))),
        el('div', { class: 'inline' },
          el('input', { id: 'msNew', class: 'input sm', maxlength: 80, placeholder: 'Add a milestone, e.g. Run 5k without stopping', value: msText, oninput: (e) => { msText = e.target.value; },
            onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); addMs(); } } }),
          el('button', { type: 'button', class: 'btn sm', onclick: addMs }, 'Add'))),
    );
  }
  const addMs = () => {
    if (!msText.trim()) return;
    draft.milestones.push({ id: uid(), text: msText.trim(), done: false });
    msText = '';
    paint();
    setTimeout(() => body.querySelector('#msNew')?.focus(), 20);
  };
  paint();
  openModal((close) => ({
    title: goal ? 'Edit goal' : 'New goal',
    body,
    footer: [
      el('button', { type: 'button', class: 'btn ghost', onclick: close }, 'Cancel'),
      el('button', { type: 'button', class: 'btn primary', onclick: () => {
        draft.title = draft.title.trim();
        if (!draft.title) { error = 'Give your goal a name.'; paint(); body.querySelector('#goalTitle')?.focus(); return; }
        if (draft.deadline && draft.deadline < draft.start) { error = 'The deadline must be after the start date.'; paint(); return; }
        if (msText.trim()) draft.milestones.push({ id: uid(), text: msText.trim(), done: false });
        saveGoal(draft);
        toast(goal ? 'Goal saved' : `${draft.emoji} Goal created`);
        close();
      } }, goal ? 'Save goal' : 'Create goal'),
    ],
  }), { size: 'wide' });
}
