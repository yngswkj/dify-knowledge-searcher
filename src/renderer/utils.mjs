export function uid(prefix) {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function clampInteger(value, min, max, fallback) {
  if (!Number.isFinite(value))
    return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value))
    return fallback;
  return Math.max(min, Math.min(max, value));
}

export function roundWeight(value) {
  return Math.round(clampNumber(Number(value), 0, 1, 0.7) * 100) / 100;
}

export function formatWeight(value) {
  return roundWeight(value).toFixed(2);
}

export function getScore(record) {
  const score = Number(record.score ?? record.segment?.score);
  return Number.isFinite(score) ? score : Number.NEGATIVE_INFINITY;
}

export function groupBy(items, getKey) {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!map.has(key))
      map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

export function selected(current, expected) {
  return current === expected ? "selected" : "";
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttr(value) {
  return escapeHtml(value);
}
