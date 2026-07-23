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
  const totalHours = sessions.reduce((sum, s) => sum + s.durationSec, 0) / 3600;

  const latestExam = exams.reduce<MockExamResult | null>((latest, exam) => {
    if (!latest || exam.takenAt > latest.takenAt) {
      return exam;
    }
    return latest;
  }, null);

  const currentScore = latestExam ? latestExam.score : profile.currentLevel;
  const scoreDelta = currentScore - profile.currentLevel;

  const efficiency = totalHours > 0 ? scoreDelta / totalHours : "—";

  const targetDelta = profile.targetScore - profile.currentLevel;
  const progress = targetDelta !== 0 ? scoreDelta / targetDelta : 0;

  return { efficiency, progress, currentScore };
}
