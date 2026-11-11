/* Static data: palette, categories, templates, badges, copy. */

export const COLORS = ['#C46B4E', '#D08C60', '#C99A4E', '#9A9A5B', '#7F9A7A', '#5E8C86', '#6F8AA3', '#8C7AA8', '#B87383', '#8F8478'];

// Old bright palette (v1/v2) -> muted equivalents, so existing habits fit the new design.
export const LEGACY_COLORS = {
  '#f97316': '#D08C60', '#ef4444': '#C46B4E', '#ec4899': '#B87383', '#a855f7': '#8C7AA8', '#6366f1': '#6F8AA3',
  '#0ea5e9': '#5E8C86', '#14b8a6': '#7F9A7A', '#22c55e': '#9A9A5B', '#eab308': '#C99A4E', '#78716c': '#8F8478',
};

export const EMOJIS = ['💧', '🏃', '📚', '🧘', '🥗', '😴', '✍️', '🎸', '💊', '🧹', '🚶', '💪', '🏋️', '🤸', '🌱', '🪴', '☀️', '🦷',
  '🍎', '🧠', '💰', '🎨', '🙏', '🚴', '🐶', '☕', '🗓️', '📞', '📵', '🚭', '🍷', '🍔', '📱', '🛏️', '🧊', '🎯', '🏊', '🥤', '🎧', '💻'];

export const CATEGORIES = [
  { id: 'health', name: 'Health', color: '#7F9A7A' },
  { id: 'fitness', name: 'Fitness', color: '#C46B4E' },
  { id: 'mindset', name: 'Mindset', color: '#8C7AA8' },
  { id: 'productivity', name: 'Productivity', color: '#6F8AA3' },
  { id: 'growth', name: 'Personal development', color: '#C99A4E' },
  { id: 'other', name: 'Other', color: '#A39484' },
];

// Best guess for habits created before categories existed.
export const EMOJI_CATEGORY = {
  '💧': 'health', '🥗': 'health', '💊': 'health', '😴': 'health', '🦷': 'health', '🍎': 'health', '🚭': 'health', '🍷': 'health', '🍔': 'health', '🛏️': 'health', '🥤': 'health',
  '🏃': 'fitness', '🚶': 'fitness', '💪': 'fitness', '🏋️': 'fitness', '🤸': 'fitness', '🚴': 'fitness', '🏊': 'fitness',
  '🧘': 'mindset', '🙏': 'mindset', '✍️': 'mindset', '📵': 'mindset', '📱': 'mindset', '🧠': 'mindset', '☀️': 'mindset',
  '🗓️': 'productivity', '💰': 'productivity', '🧹': 'productivity', '💻': 'productivity', '🎯': 'productivity',
  '📚': 'growth', '🎸': 'growth', '🎨': 'growth', '🌱': 'growth', '🎧': 'growth', '📞': 'growth', '🪴': 'other', '🐶': 'other', '☕': 'other',
};

export const SECTIONS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'anytime', label: 'Anytime' },
];

export const MOODS = [
  { v: 1, e: '😞', l: 'Rough' }, { v: 2, e: '🙁', l: 'Low' }, { v: 3, e: '😐', l: 'Okay' },
  { v: 4, e: '🙂', l: 'Good' }, { v: 5, e: '😄', l: 'Great' },
];

export const TEMPLATES = [
  { name: 'Drink water', emoji: '💧', color: '#5E8C86', target: 8, unit: 'glasses', category: 'health' },
  { name: 'Move 30 min', emoji: '🏃', color: '#C46B4E', target: 30, timer: true, section: 'morning', category: 'fitness' },
  { name: 'Meditate', emoji: '🧘', color: '#8C7AA8', target: 10, timer: true, section: 'morning', category: 'mindset' },
  { name: 'Read', emoji: '📚', color: '#C99A4E', target: 20, unit: 'pages', section: 'evening', category: 'growth' },
  { name: 'Journal', emoji: '✍️', color: '#B87383', section: 'evening', category: 'mindset' },
  { name: 'Take vitamins', emoji: '💊', color: '#7F9A7A', section: 'morning', category: 'health' },
  { name: 'Gym', emoji: '🏋️', color: '#C46B4E', freq: { type: 'weekly', times: 3 }, category: 'fitness' },
  { name: 'No phone in bed', emoji: '📵', color: '#6F8AA3', kind: 'quit', section: 'evening', category: 'mindset' },
  { name: '10k steps', emoji: '🚶', color: '#9A9A5B', target: 10000, unit: 'steps', category: 'fitness' },
  { name: 'Plan tomorrow', emoji: '🗓️', color: '#8F8478', section: 'evening', freq: { type: 'days', days: [1, 2, 3, 4, 5] }, category: 'productivity' },
  { name: 'Deep work', emoji: '💻', color: '#6F8AA3', target: 90, timer: true, freq: { type: 'days', days: [1, 2, 3, 4, 5] }, category: 'productivity' },
  { name: 'Stretch', emoji: '🤸', color: '#7F9A7A', target: 10, timer: true, category: 'fitness' },
  { name: 'Gratitude', emoji: '🙏', color: '#C99A4E', target: 3, unit: 'things', section: 'evening', category: 'mindset' },
  { name: 'Call family', emoji: '📞', color: '#5E8C86', freq: { type: 'weekly', times: 1 }, category: 'growth' },
  { name: 'Water plants', emoji: '🪴', color: '#9A9A5B', freq: { type: 'interval', every: 3 }, category: 'other' },
  { name: 'No smoking', emoji: '🚭', color: '#8F8478', kind: 'quit', category: 'health' },
  { name: 'No alcohol', emoji: '🍷', color: '#B87383', kind: 'quit', category: 'health' },
  { name: 'No junk food', emoji: '🍔', color: '#D08C60', kind: 'quit', category: 'health' },
  { name: 'No doomscrolling', emoji: '📱', color: '#8C7AA8', kind: 'quit', category: 'mindset' },
];

export const LEVEL_TITLES = ['Spark', 'Kindle', 'Ember', 'Flicker', 'Flame', 'Blaze', 'Bonfire', 'Beacon', 'Wildfire', 'Inferno', 'Supernova'];

export const BADGES = [
  { id: 'first', e: '✨', name: 'First spark', desc: 'Complete your first habit', test: (a) => a.checkins >= 1 },
  { id: 'perfect1', e: '💯', name: 'Perfect day', desc: 'Finish every habit in a day', test: (a) => a.perfectDays >= 1 },
  { id: 'streak7', e: '🔥', name: 'Week warrior', desc: 'Reach a 7-day streak', test: (a) => a.bestStreak >= 7 },
  { id: 'comeback', e: '🔁', name: 'Never miss twice', desc: 'Bounce back the day after a miss', test: (a) => a.comebacks >= 1 },
  { id: 'pweek', e: '🗓️', name: 'Perfect week', desc: 'A full week with every habit done', test: (a) => a.perfectWeeks >= 1 },
  { id: 'h5', e: '🎒', name: 'Collector', desc: 'Track 5 habits at once', test: (a) => a.habits >= 5 },
  { id: 'timer', e: '⏱', name: 'In the zone', desc: 'Finish a timed habit', test: (a) => a.timerDone >= 1 },
  { id: 'goal1', e: '🎯', name: 'Goal getter', desc: 'Complete a goal', test: (a) => a.goalsDone >= 1 },
  { id: 'mood7', e: '🎭', name: 'In tune', desc: 'Log your mood on 7 days', test: (a) => a.moodDays >= 7 },
  { id: 'notes10', e: '📝', name: 'Reflective', desc: 'Write 10 notes', test: (a) => a.notes >= 10 },
  { id: 'wstreak4', e: '📅', name: 'Steady month', desc: 'Hit a weekly habit 4 weeks running', test: (a) => a.bestWeekStreak >= 4 },
  { id: 'c100', e: '💪', name: 'Century', desc: '100 habits completed', test: (a) => a.checkins >= 100 },
  { id: 'consist30', e: '🌿', name: 'Consistent', desc: '30 days at 80% or better', test: (a) => a.consistentDays >= 30 },
  { id: 'perfect10', e: '🌟', name: 'Shining', desc: '10 perfect days', test: (a) => a.perfectDays >= 10 },
  { id: 'streak30', e: '🏆', name: 'Monthly flame', desc: 'Reach a 30-day streak', test: (a) => a.bestStreak >= 30 },
  { id: 'quit30', e: '🛡', name: 'Clean month', desc: '30 days clean on a quit habit', test: (a) => a.bestClean >= 30 },
  { id: 'level5', e: '🔥', name: 'Flame', desc: 'Reach level 5', test: (a) => a.level >= 5 },
  { id: 'c500', e: '🚀', name: 'Unstoppable', desc: '500 habits completed', test: (a) => a.checkins >= 500 },
  { id: 'streak100', e: '👑', name: 'Centurion', desc: 'Reach a 100-day streak', test: (a) => a.bestStreak >= 100 },
  { id: 'goal5', e: '🏔', name: 'Summit', desc: 'Complete 5 goals', test: (a) => a.goalsDone >= 5 },
];

export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 200, 365];

// Original lines, one shown per day.
export const QUOTES = [
  'Small steps. Extraordinary progress.',
  'Show up today. That is the whole trick.',
  'Consistency beats intensity, every time.',
  'You don’t need a perfect day, just a present one.',
  'Tiny actions, repeated, become who you are.',
  'Progress is quiet. Keep going anyway.',
  'Do the next small thing.',
  'Your future self is built today.',
  'One good choice makes the next one easier.',
  'Gentle and steady still gets there.',
  'Done is a kind of beautiful.',
  'A habit is a promise you keep to yourself.',
  'Start small. Stay curious. Keep the fire lit.',
  'Every check is a vote for the person you’re becoming.',
  'Missed yesterday? Today is a fresh page.',
  'Momentum loves a small win.',
  'Make it easy, make it daily.',
  'Rest is part of the rhythm, too.',
  'Be patient with progress.',
  'The best time to begin is the next five minutes.',
  'What you repeat, you become.',
  'Keep the promise small enough to keep.',
  'Slow is smooth, smooth is steady.',
  'You are allowed to be a work in progress.',
  'Light the next spark.',
  'Little by little, a little becomes a lot.',
  'Focus on the streak you’re building, not the one you lost.',
  'Today counts. So do you.',
];
