// client/src/utils/helpers.js

// Palette — deterministic color from username
const PALETTE = [
  '#7c68fa','#3dd68c','#f16a6a','#f5a623',
  '#60a5fa','#f472b6','#2dd4bf','#fb923c',
  '#a78bfa','#facc15',
];
export const pickColor = (name = '') => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

// Avatar initials from username
export const getInitials = (name = '') =>
  name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??';

// Human-readable relative timestamp
export const relTime = (ts) => {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// Extract hashtags from text
export const getTags = (text) =>
  (text.match(/#\w+/g) || []).map((t) => t.toLowerCase());

// Password strength score (0–5)
export const pwStrength = (p) => {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 6)          s++;
  if (p.length >= 10)         s++;
  if (/[A-Z]/.test(p))       s++;
  if (/\d/.test(p))           s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};
export const STR_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
export const STR_COLOR = ['', '#f16a6a', '#f5a623', '#60a5fa', '#3dd68c', '#7c68fa'];
