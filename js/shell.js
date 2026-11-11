/* Shell-level widgets shared by views: avatar, notification bell + feed panel. */
import { state, markFeedRead } from './store.js';
import { el, icon } from './util.js';

export function initials() {
  const n = (state.profile.name || '').trim();
  if (!n) return '🔥';
  return n.split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}
export function avatarEl(size = 40) {
  const a = state.profile.avatar;
  return el('span', { class: 'avatar', style: { width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.38)}px` } },
    a ? el('img', { src: a, alt: '' }) : initials());
}

const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d}d ago`;
};

export function bellButton() {
  const unread = state.feed.filter((f) => !f.read).length;
  const b = el('button', { type: 'button', class: 'icon-btn bell', 'aria-label': unread ? `Notifications, ${unread} unread` : 'Notifications', onclick: (e) => { e.stopPropagation(); openFeed(b); } },
    icon('bell', 20), unread ? el('span', { class: 'bell-dot' }, unread > 9 ? '9+' : unread) : null);
  b.classList.add('bell-btn');
  return b;
}

function openFeed(anchor) {
  const existing = document.querySelector('.feed-panel');
  if (existing) { existing.remove(); return; }
  const items = state.feed.slice(0, 30);
  const panel = el('div', { class: 'feed-panel', role: 'dialog', 'aria-label': 'Notifications' },
    el('div', { class: 'feed-head' }, el('h3', {}, 'Notifications'),
      items.some((f) => !f.read) ? el('button', { type: 'button', class: 'link-btn', onclick: () => { markFeedRead(); panel.remove(); refreshBells(); } }, 'Mark all read') : null),
    items.length
      ? el('ul', { class: 'feed-list' }, items.map((f) => el('li', { class: f.read ? '' : 'unread' },
        el('span', { class: `feed-ico ${f.type}` }, icon({ reminder: 'bell', badge: 'award', level: 'flame', goal: 'target', streak: 'flame', perfect: 'sparkle' }[f.type] || 'sparkle', 15)),
        el('span', { class: 'feed-text' }, f.text, el('small', {}, timeAgo(f.at))))))
      : el('div', { class: 'feed-empty' }, el('span', {}, '🔔'), el('p', {}, 'You’re all caught up.'), el('p', { class: 'muted small' }, 'Reminders, streak milestones and badges show up here.')));
  document.body.append(panel);
  const r = anchor.getBoundingClientRect();
  const pw = Math.min(360, innerWidth - 16);
  panel.style.width = `${pw}px`;
  panel.style.left = `${Math.max(8, Math.min(innerWidth - pw - 8, r.right - pw))}px`;
  panel.style.top = `${r.bottom + 8}px`;
  const off = (e) => { if (!panel.contains(e.target) && !anchor.contains(e.target)) { panel.remove(); removeEventListener('pointerdown', off, true); markFeedRead(); refreshBells(); } };
  setTimeout(() => addEventListener('pointerdown', off, true), 0);
}

export function refreshBells() {
  for (const b of document.querySelectorAll('.bell-btn')) b.replaceWith(bellButton());
}
addEventListener('kindling:feed', refreshBells);
