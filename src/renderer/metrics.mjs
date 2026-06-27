import { getScore } from "./utils.mjs";

// 成功した組み合わせの取得チャンクから自動算出する指標（正解判定は不要）。

export function combTop(item) {
  if (item.status !== "success" || !item.records?.length)
    return null;
  const top = Math.max(...item.records.map(getScore).filter(Number.isFinite));
  return Number.isFinite(top) ? top : null;
}

export function combAvg(item) {
  if (item.status !== "success")
    return null;
  const scores = (item.records || []).map(getScore).filter(Number.isFinite);
  if (!scores.length)
    return null;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

export function combDocs(item) {
  if (item.status !== "success")
    return null;
  const names = new Set();
  for (const record of item.records || []) {
    const name = record.segment?.document?.name || record.document?.name;
    if (name)
      names.add(name);
  }
  return names.size;
}
