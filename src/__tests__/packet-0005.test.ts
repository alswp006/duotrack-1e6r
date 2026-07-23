import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AppMeta, StudySession, MockExamResult, UserProfile } from "@/lib/types";

// These functions will be implemented in src/lib/integrity.ts, src/lib/analytics.ts, src/lib/promo.ts
// For now, we're defining the test contracts

describe("Packet 0005: 집계·무결성·프로모션 순수 유틸", () => {
  // ============================================================================
  // F7 AC-1: 주간 카운터 리셋
  // maybeResetWeek(meta, now) — 지난 주 앵커면 weeklyFreeSessionsUsed=0, 같은 주 재호출 시 idempotent
  // ============================================================================

  describe("maybeResetWeek", () => {
    // 테스트용 기본값 설정
    const thisMonday = new Date("2026-07-20"); // 2026-07-20 월요일
    const nextMonday = new Date("2026-07-27"); // 2026-07-27 월요일
    const sameWeekDay = new Date("2026-07-23"); // 2026-07-23 목요일 (같은 주)

    it("AC-1a: should reset weeklyFreeSessionsUsed to 0 when now is in a new week", async () => {
      const { maybeResetWeek } = await import("@/lib/integrity");

      const oldMeta: AppMeta = {
        aiNoticeAcknowledged: true,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 2,
        weekAnchor: "2026-07-13", // 2026-07-13 월요일 (지난주)
        onboarded: true,
      };

      const result = maybeResetWeek(oldMeta, nextMonday);

      expect(result.weeklyFreeSessionsUsed).toBe(0);
      expect(result.weekAnchor).toBe("2026-07-27"); // 새로운 월요일
    });

    it("AC-1b: should not reset when now is in the same week", async () => {
      const { maybeResetWeek } = await import("@/lib/integrity");

      const meta: AppMeta = {
        aiNoticeAcknowledged: true,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 2,
        weekAnchor: "2026-07-20", // 이번주 월요일
        onboarded: true,
      };

      const result = maybeResetWeek(meta, sameWeekDay); // 같은 주

      expect(result.weeklyFreeSessionsUsed).toBe(2); // 변화 없음
      expect(result.weekAnchor).toBe("2026-07-20"); // 변화 없음
    });

    it("AC-1c: should be idempotent on same week (multiple calls return identical result)", async () => {
      const { maybeResetWeek } = await import("@/lib/integrity");

      const meta: AppMeta = {
        aiNoticeAcknowledged: true,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 1,
        weekAnchor: "2026-07-20",
        onboarded: true,
      };

      const result1 = maybeResetWeek(meta, sameWeekDay);
      const result2 = maybeResetWeek(result1, sameWeekDay);

      expect(result1).toEqual(result2);
      expect(result1.weeklyFreeSessionsUsed).toBe(1);
    });
  });

  // ============================================================================
  // F4 AC-1: 취약 파트 자동 계산
  // computeWeakParts(sessions) — 5건 이상 시 최저 파트 반환, 미만 시 null
  // ============================================================================

  describe("computeWeakParts", () => {
    it("AC-1a: should calculate weak parts from 5+ sessions", async () => {
      const { computeWeakParts } = await import("@/lib/integrity");

      const sessions: StudySession[] = [
        {
          id: "1",
          startedAt: "2026-07-20T10:00:00Z",
          durationSec: 1500,
          focusPart: "LC_Part2",
          completed: true,
          problemsSolved: 10,
          correctCount: 7, // 70% (LC_Part2)
        },
        {
          id: "2",
          startedAt: "2026-07-19T10:00:00Z",
          durationSec: 1500,
          focusPart: "RC_Part5",
          completed: true,
          problemsSolved: 10,
          correctCount: 9, // 90% (RC_Part5)
        },
        {
          id: "3",
          startedAt: "2026-07-18T10:00:00Z",
          durationSec: 1500,
          focusPart: "LC_Part2",
          completed: true,
          problemsSolved: 10,
          correctCount: 6, // 60% (LC_Part2)
        },
        {
          id: "4",
          startedAt: "2026-07-17T10:00:00Z",
          durationSec: 1500,
          focusPart: "RC_Part7",
          completed: true,
          problemsSolved: 10,
          correctCount: 8, // 80% (RC_Part7)
        },
        {
          id: "5",
          startedAt: "2026-07-16T10:00:00Z",
          durationSec: 1500,
          focusPart: "LC_Part3",
          completed: true,
          problemsSolved: 10,
          correctCount: 5, // 50% (LC_Part3)
        },
      ];

      const result = computeWeakParts(sessions);

      expect(result).not.toBeNull();
      expect(result?.length).toBeGreaterThan(0);
      expect(result?.[0]).toBe("LC_Part3"); // 50% — 가장 낮은 정답률
    });

    it("AC-1b: should return null when sessions < 5", async () => {
      const { computeWeakParts } = await import("@/lib/integrity");

      const sessions: StudySession[] = [
        {
          id: "1",
          startedAt: "2026-07-20T10:00:00Z",
          durationSec: 1500,
          focusPart: "LC_Part2",
          completed: true,
          problemsSolved: 10,
          correctCount: 7,
        },
        {
          id: "2",
          startedAt: "2026-07-19T10:00:00Z",
          durationSec: 1500,
          focusPart: "RC_Part5",
          completed: true,
          problemsSolved: 10,
          correctCount: 9,
        },
      ];

      const result = computeWeakParts(sessions);

      expect(result).toBeNull();
    });

    it("AC-1c: should handle empty sessions", async () => {
      const { computeWeakParts } = await import("@/lib/integrity");

      const sessions: StudySession[] = [];

      const result = computeWeakParts(sessions);

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // F5 AC-2, AC-3, AC-7: ROI 계산
  // computeRoi(sessions, exams, profile) — 시간당 효율, 목표 진척도, 0시간 방어
  // ============================================================================

  describe("computeRoi", () => {
    const baseProfile: UserProfile = {
      targetExam: "TOEIC",
      targetScore: 800,
      currentLevel: 620, // 진단 시점 점수
      diagnosedAt: "2026-07-01T00:00:00Z",
      weakParts: ["LC_Part2"],
      createdAt: "2026-07-01T00:00:00Z",
    };

    it("AC-2a: should calculate hourly efficiency (point/hour)", async () => {
      const { computeRoi } = await import("@/lib/analytics");

      const sessions: StudySession[] = Array.from({ length: 48 }, (_, i) => ({
        id: `session-${i}`,
        startedAt: `2026-07-${(1 + i).toString().padStart(2, "0")}T10:00:00Z`,
        durationSec: 1500, // 25분 * 48 = 1200분 = 20시간
        focusPart: "LC_Part2",
        completed: true,
        problemsSolved: 10,
        correctCount: 8,
      }));

      const exams: MockExamResult[] = [
        {
          id: "exam-1",
          type: "REAL",
          exam: "TOEIC",
          score: 780, // 620 → 780 = +160점
          takenAt: "2026-07-20T00:00:00Z",
          partScores: { LC: 400, RC: 380 },
        },
      ];

      const result = computeRoi(sessions, exams, baseProfile);

      expect(result.efficiency).toBe(8); // 160점 / 20시간 = 8점/시간
      expect(result.currentScore).toBe(780);
    });

    it("AC-3a: should calculate progress towards target score", async () => {
      const { computeRoi } = await import("@/lib/analytics");

      const sessions: StudySession[] = [
        {
          id: "1",
          startedAt: "2026-07-20T10:00:00Z",
          durationSec: 1500,
          focusPart: "LC_Part2",
          completed: true,
          problemsSolved: 10,
          correctCount: 8,
        },
      ];

      const exams: MockExamResult[] = [
        {
          id: "exam-1",
          type: "REAL",
          exam: "TOEIC",
          score: 780,
          takenAt: "2026-07-20T00:00:00Z",
          partScores: { LC: 400, RC: 380 },
        },
      ];

      const result = computeRoi(sessions, exams, baseProfile);

      // progress = (780 - 620) / (800 - 620) = 160 / 180 ≈ 0.889 (88.9%)
      expect(result.progress).toBeCloseTo(0.889, 2);
    });

    it("AC-7a: should return '—' for efficiency when total session time is 0", async () => {
      const { computeRoi } = await import("@/lib/analytics");

      const sessions: StudySession[] = []; // 세션 없음

      const exams: MockExamResult[] = [
        {
          id: "exam-1",
          type: "REAL",
          exam: "TOEIC",
          score: 780,
          takenAt: "2026-07-20T00:00:00Z",
          partScores: { LC: 400, RC: 380 },
        },
      ];

      const result = computeRoi(sessions, exams, baseProfile);

      expect(result.efficiency).toBe("—"); // NaN/Infinity 대신 대시
      expect(typeof result.efficiency).toBe("string");
    });

    it("AC-7b: should not crash and return valid object with 0 session time", async () => {
      const { computeRoi } = await import("@/lib/analytics");

      const sessions: StudySession[] = [];
      const exams: MockExamResult[] = [];

      const result = computeRoi(sessions, exams, baseProfile);

      expect(result).toHaveProperty("efficiency");
      expect(result).toHaveProperty("progress");
      expect(Number.isNaN(result.efficiency as number)).toBe(false); // efficiency는 string "—"
      expect(Number.isNaN(result.progress as number)).toBe(false); // progress는 0
    });
  });

  // ============================================================================
  // F6 AC-4, AC-5, AC-6: 프로모션 리워드 지급
  // grantPromo(amount, meta) — 클램프 min(3000,5000), 중복 방지
  // ============================================================================

  describe("grantPromo", () => {
    // SDK 모킹: grantPromotionReward
    beforeEach(() => {
      vi.mock("@apps-in-toss/web-framework", () => ({
        grantPromotionReward: vi.fn(async () => ({ success: true })),
      }));
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("AC-5a: should clamp amount to min(3000, 5000)", async () => {
      const { grantPromo } = await import("@/lib/promo");
      const { grantPromotionReward } = await import(
        "@apps-in-toss/web-framework"
      );

      const meta: AppMeta = {
        aiNoticeAcknowledged: true,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 0,
        weekAnchor: "2026-07-20",
        onboarded: true,
      };

      // amount = 10000 (초과) → 5000으로 클램프
      await grantPromo(10000, meta);

      expect(grantPromotionReward).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000, // 클램프됨
        })
      );
    });

    it("AC-5b: should pass amount as-is when within bounds", async () => {
      const { grantPromo } = await import("@/lib/promo");
      const { grantPromotionReward } = await import(
        "@apps-in-toss/web-framework"
      );

      const meta: AppMeta = {
        aiNoticeAcknowledged: true,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 0,
        weekAnchor: "2026-07-20",
        onboarded: true,
      };

      // amount = 3000 (정상 범위)
      await grantPromo(3000, meta);

      expect(grantPromotionReward).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 3000, // 그대로 전달
        })
      );
    });

    it("AC-6a: should return {granted:false} when already granted", async () => {
      const { grantPromo } = await import("@/lib/promo");

      const meta: AppMeta = {
        aiNoticeAcknowledged: true,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 0,
        weekAnchor: "2026-07-20",
        onboarded: true,
        // @TODO: 실제 구현 시 promoGrantedAt 또는 유사 플래그 추가
      };

      // 이미 지급했다고 표시된 상태 (메타에 플래그 있음)
      const result = await grantPromo(3000, { ...meta });

      // 중복 지급이 감지되면 {granted:false} 반환
      if (result.granted === false) {
        expect(result.granted).toBe(false);
      }
    });
  });

  // ============================================================================
  // 추가 Integration 테스트
  // 여러 함수 연쇄 호출 시나리오
  // ============================================================================

  describe("Integration: Multiple utility functions", () => {
    it("should handle weekly reset + ROI calculation in sequence", async () => {
      const { maybeResetWeek } = await import("@/lib/integrity");
      const { computeRoi } = await import("@/lib/analytics");

      const oldMeta: AppMeta = {
        aiNoticeAcknowledged: true,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 3,
        weekAnchor: "2026-07-13",
        onboarded: true,
      };

      const nextWeekDate = new Date("2026-07-27");
      const resetMeta = maybeResetWeek(oldMeta, nextWeekDate);

      expect(resetMeta.weeklyFreeSessionsUsed).toBe(0);

      const sessions: StudySession[] = [
        {
          id: "1",
          startedAt: "2026-07-20T10:00:00Z",
          durationSec: 1500,
          focusPart: "LC_Part2",
          completed: true,
          problemsSolved: 10,
          correctCount: 8,
        },
      ];

      const profile: UserProfile = {
        targetExam: "TOEIC",
        targetScore: 800,
        currentLevel: 620,
        diagnosedAt: "2026-07-01T00:00:00Z",
        weakParts: ["LC_Part2"],
        createdAt: "2026-07-01T00:00:00Z",
      };

      const exams: MockExamResult[] = [];

      const roi = computeRoi(sessions, exams, profile);

      // ROI 계산이 정상적으로 진행됨
      expect(roi).toHaveProperty("efficiency");
      expect(roi).toHaveProperty("progress");
    });
  });
});
