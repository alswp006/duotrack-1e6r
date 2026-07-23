import type { AppMeta, StudySession } from "@/lib/types";

function mondayAnchor(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

// F7 AC-1: 주간 카운터 리셋
export function maybeResetWeek(meta: AppMeta, now: Date): AppMeta {
  const anchor = mondayAnchor(now);
  if (meta.weekAnchor === anchor) {
    return meta;
  }
  return { ...meta, weeklyFreeSessionsUsed: 0, weekAnchor: anchor };
}

// F4 AC-1: 취약 파트 자동 계산
export function computeWeakParts(sessions: StudySession[]): string[] | null {
  if (sessions.length < 5) {
    return null;
  }

  const stats = new Map<string, { solved: number; correct: number }>();
  for (const session of sessions) {
    const stat = stats.get(session.focusPart) ?? { solved: 0, correct: 0 };
    stat.solved += session.problemsSolved;
    stat.correct += session.correctCount;
    stats.set(session.focusPart, stat);
  }

  return Array.from(stats.entries())
    .map(([part, stat]) => ({
      part,
      accuracy: stat.solved > 0 ? stat.correct / stat.solved : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .map((entry) => entry.part);
}
