import type { AppMeta, StudySession } from "@/lib/types";

// F7 AC-1: 주간 카운터 리셋
export function maybeResetWeek(meta: AppMeta, now: Date): AppMeta {
  throw new Error("maybeResetWeek not implemented");
}

// F4 AC-1: 취약 파트 자동 계산
export function computeWeakParts(sessions: StudySession[]): string[] | null {
  throw new Error("computeWeakParts not implemented");
}
