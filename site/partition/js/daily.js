// The daily round: puzzle numbers, grading, the share card, streaks and
// personal bests. Everything is derived from the date, so there is no server.

// Puzzle #1 is 26 September 2026 (local time).
const EPOCH = new Date(2026, 8, 26);
const DAY = 86400000;

export function puzzleNumber(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(1, Math.round((d - EPOCH) / DAY) + 1);
}

// Efficiency: how much of the avoidable misplacement a border removes, from
// 0 (no better than no border at all) to 1 (as good as the best border).
export function efficiency(misplaced, noBorder, best) {
  if (noBorder <= best) return 1;
  return Math.max(0, Math.min(1, (noBorder - misplaced) / (noBorder - best)));
}

// One square per territory by how much of it belongs to its majority. It
// shows the shape of the result without giving the border away.
export function puritySquare(share) {
  return share >= 0.8 ? '🟩' : share >= 0.65 ? '🟨' : share >= 0.55 ? '🟧' : '🟥';
}

const pct = (v) => `${(100 * v).toFixed(1)}%`;
export const clock = (ms) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function shareText({ number, mapName, share, bestShare, eff, territories, ms, practice }) {
  const filled = Math.round(eff * 10);
  return [
    `Partition #${number}${practice ? ' (practice)' : ''} · ${mapName}`,
    `${'🟦'.repeat(filled)}${'⬜'.repeat(10 - filled)} ${Math.round(eff * 100)}% of the way to the best line`,
    `${territories.map((t) => puritySquare(1 - t.misplaced / t.total)).join('')} ${pct(share)} on the wrong side`,
    `Best possible: ${pct(bestShare)} · ⏱ ${clock(ms)}`,
  ].join('\n');
}

export const emptyStats = () => ({ played: 0, streak: 0, maxStreak: 0, bestEff: null, lastNumber: null, results: {} });

// Records the day's first result. Replays of a finished puzzle are practice
// and never count.
export function recordResult(stats, number, result) {
  if (stats.results[number]) return stats;
  const streak = stats.lastNumber === number - 1 ? stats.streak + 1 : 1;
  return {
    ...stats,
    played: stats.played + 1,
    streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    bestEff: stats.bestEff == null ? result.eff : Math.max(stats.bestEff, result.eff),
    lastNumber: number,
    results: { ...stats.results, [number]: result },
  };
}

// A streak survives until a whole day is missed.
export function currentStreak(stats, today) {
  return stats.lastNumber != null && today - stats.lastNumber <= 1 ? stats.streak : 0;
}
