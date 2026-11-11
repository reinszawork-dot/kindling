/* Achievements: level, personal records, badges, milestone timeline. */
import { state } from '../store.js';
import { BADGES } from '../data.js';
import { el, icon, fmtShort, parseKey, pct, plural, fmtNum, afterPaint, countUp } from '../util.js';
import { agg, records, levelFloor, levelTitle } from '../stats.js';
import { pageHead, card, cardHead } from '../ui.js';

// How close each locked badge is (0..1), for a gentle progress hint.
const PROGRESS = {
  first: (a) => a.checkins / 1, perfect1: (a) => a.perfectDays, streak7: (a) => a.bestStreak / 7, comeback: (a) => a.comebacks,
  pweek: (a) => a.perfectWeeks, h5: (a) => a.habits / 5, timer: (a) => a.timerDone, goal1: (a) => a.goalsDone, mood7: (a) => a.moodDays / 7,
  notes10: (a) => a.notes / 10, wstreak4: (a) => a.bestWeekStreak / 4, c100: (a) => a.checkins / 100, consist30: (a) => a.consistentDays / 30,
  perfect10: (a) => a.perfectDays / 10, streak30: (a) => a.bestStreak / 30, quit30: (a) => a.bestClean / 30, level5: (a) => a.level / 5,
  c500: (a) => a.checkins / 500, streak100: (a) => a.bestStreak / 100, goal5: (a) => a.goalsDone / 5,
};

export const achievementsView = {
  title: 'Achievements',
  mount(root, { animate }) {
    const a = agg();
    const rec = records();
    const L = a.level, lo = levelFloor(L), hi = levelFloor(L + 1);
    const earned = new Set(BADGES.filter((b) => b.test(a)).map((b) => b.id));
    const xpFill = el('i', { style: { width: animate ? '0%' : `${((a.xp - lo) / (hi - lo)) * 100}%` } });
    if (animate) afterPaint(() => { xpFill.style.width = `${((a.xp - lo) / (hi - lo)) * 100}%`; });
    const lvNum = el('b', {}, String(L));
    const xpNum = el('span', {}, fmtNum(a.xp));
    if (animate) { countUp(lvNum, L, { dur: 700 }); countUp(xpNum, a.xp, { dur: 1200, delay: 200 }); }

    const recordTile = (ic, label, value, sub) => el('div', { class: 'record' }, el('span', { class: 'rec-ico' }, icon(ic, 18)),
      el('div', {}, el('span', { class: 'muted small' }, label), el('b', { class: 'serif' }, value), sub ? el('span', { class: 'muted small' }, sub) : null));
    const timeline = state.feed.filter((f) => ['badge', 'goal', 'streak', 'level', 'perfect'].includes(f.type)).slice(0, 12);

    root.append(
      pageHead('Achievements', `${earned.size} of ${BADGES.length} badges earned`),
      card({ class: 'level-card' + (animate ? ' animate' : '') },
        el('div', { class: 'level-badge' }, el('span', {}, '🔥'), lvNum),
        el('div', { class: 'level-info' },
          el('span', { class: 'eyebrow' }, 'Your level'),
          el('h2', { class: 'serif' }, levelTitle(L)),
          el('span', { class: 'progress-bar lg' }, xpFill),
          el('p', { class: 'muted small' }, xpNum, ` XP · ${fmtNum(hi - a.xp)} to ${levelTitle(L + 1)}`),
          el('p', { class: 'hint' }, '+10 per habit · +25 perfect day · +100 perfect week · +150 goal · +3 clean day or mood · +2 note'))),
      card({}, cardHead('Personal records'),
        el('div', { class: 'records' },
          recordTile('flame', 'Longest streak', plural(rec.streak.value, 'day'), rec.streak.habit ? `${rec.streak.habit.emoji} ${rec.streak.habit.name}` : '—'),
          recordTile('sparkle', 'Longest perfect run', plural(rec.perfectRun, 'day'), 'every habit, every day'),
          recordTile('award', 'Most in one day', plural(rec.bestDay.value, 'habit'), rec.bestDay.k ? fmtShort(parseKey(rec.bestDay.k)) : '—'),
          recordTile('chart', 'Best week', rec.bestWeek.value == null ? '—' : pct(rec.bestWeek.value), rec.bestWeek.start ? `week of ${fmtShort(rec.bestWeek.start)}` : 'finish a full week'),
          recordTile('shield', 'Longest clean streak', plural(rec.clean.value, 'day'), rec.clean.habit ? `${rec.clean.habit.emoji} ${rec.clean.habit.name}` : 'no break-a-habit yet'),
          recordTile('check', 'Habits completed', fmtNum(rec.checkins), 'all time'))),
      card({}, cardHead('Badges', el('span', { class: 'muted small' }, `${earned.size}/${BADGES.length}`)),
        el('div', { class: 'badges' + (animate ? ' animate' : '') }, BADGES.map((b, i) => {
          const got = earned.has(b.id);
          const prog = Math.max(0, Math.min(1, (PROGRESS[b.id] || (() => 0))(a)));
          return el('div', { class: 'badge' + (got ? ' got' : ''), style: { '--d': `${i * 35}ms` }, title: b.desc },
            el('span', { class: 'be' }, b.e), el('b', {}, b.name), el('span', { class: 'bd' }, b.desc),
            got ? el('span', { class: 'bstate' }, icon('check', 12), 'Earned') : el('span', { class: 'progress-bar xs' }, el('i', { style: { width: `${prog * 100}%` } })));
        }))),
      card({}, cardHead('Milestones'), timeline.length
        ? el('ul', { class: 'timeline' }, timeline.map((f) => el('li', {}, el('span', { class: 'tl-dot' }), el('span', {}, f.text), el('small', {}, fmtShort(new Date(f.at))))))
        : el('p', { class: 'muted small' }, 'Streak milestones, perfect days, badges and finished goals will be recorded here.')));
  },
};
