import type { StudySession, MockExamResult, UserProfile } from "@/lib/types";

interface RoiResult {
  efficiency: number | string; // number 또는 "—" (0시간 방어)
  progress: number; // 0~1 사이의 진척도
  currentScore: number;
}

// F5 AC-2, AC-3, AC-7: ROI 계산 (시간당 효율, 목표 진척도, 0시간 방어)
export function computeRoi(
  sessions: StudySession[],
  exams: MockExamResult[],
  profile: UserProfile
): RoiResult {
  throw new Error("computeRoi not implemented");
}
