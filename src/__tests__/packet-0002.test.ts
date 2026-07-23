import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from "vitest";
import type {
  UserProfile,
  StudySession,
  MockExamResult,
  GeneratedProblem,
  AppMeta,
} from "@/lib/types";

// Storage CRUD helpers to test
import {
  getProfile,
  setProfile,
  getSessions,
  addSession,
  getExams,
  addExam,
  getProblems,
  addProblem,
  getMeta,
  setMeta,
} from "@/lib/storage";

// Fixtures
const mockProfile: UserProfile = {
  targetExam: "TOEIC",
  targetScore: 900,
  currentLevel: 5,
  diagnosedAt: "2026-07-24",
  weakParts: ["Reading", "Listening"],
  createdAt: "2026-07-20",
};

const mockSession: StudySession = {
  id: "session-1",
  startedAt: "2026-07-24T10:00:00Z",
  durationSec: 1800,
  focusPart: "Reading",
  completed: true,
  problemsSolved: 10,
  correctCount: 8,
};

const mockExam: MockExamResult = {
  id: "exam-1",
  type: "MOCK",
  exam: "TOEIC",
  score: 850,
  takenAt: "2026-07-24T14:00:00Z",
  partScores: { Reading: 420, Listening: 430 },
};

const mockProblem: GeneratedProblem = {
  id: "problem-1",
  part: "Reading",
  question: "What is the main idea?",
  choices: ["A", "B", "C", "D"],
  answerIndex: 0,
  explanation: "The answer is A because...",
  generatedAt: "2026-07-24T10:00:00Z",
};

const mockMeta: AppMeta = {
  aiNoticeAcknowledged: true,
  isSubscribed: false,
  weeklyFreeSessionsUsed: 3,
  weekAnchor: "2026-07-21",
  onboarded: true,
};

describe("localStorage CRUD 헬퍼 + 손상/용량 방어", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // AC-1: getX/setX/addX 함수가 존재하고 타입스크립트 통과
  describe("AC-1: Profile CRUD", () => {
    it("should set and retrieve profile", () => {
      setProfile(mockProfile);
      const retrieved = getProfile();
      expect(retrieved).toEqual(mockProfile);
      expect(retrieved?.targetExam).toBe("TOEIC");
      expect(retrieved?.targetScore).toBe(900);
    });

    it("should return null when profile not set", () => {
      const result = getProfile();
      expect(result).toBeNull();
    });

    it("should overwrite profile on second set", () => {
      setProfile(mockProfile);
      const updated = { ...mockProfile, targetScore: 950 };
      setProfile(updated);
      const retrieved = getProfile();
      expect(retrieved?.targetScore).toBe(950);
    });

    it("should recover from corrupted JSON in profile key", () => {
      localStorage.setItem("duotrack.profile", "{ invalid json");
      const result = getProfile();
      expect(result).toBeNull();
    });
  });

  describe("AC-1: Sessions CRUD", () => {
    it("should get empty sessions array when not set", () => {
      const result = getSessions();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should add session to empty array", () => {
      addSession(mockSession);
      const retrieved = getSessions();
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe("session-1");
      expect(retrieved[0].durationSec).toBe(1800);
    });

    it("should append multiple sessions preserving order", () => {
      addSession(mockSession);
      const session2 = { ...mockSession, id: "session-2" };
      addSession(session2);
      const retrieved = getSessions();
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].id).toBe("session-1");
      expect(retrieved[1].id).toBe("session-2");
    });

    it("should recover from corrupted sessions array", () => {
      localStorage.setItem("duotrack.sessions", "[invalid json");
      const result = getSessions();
      expect(result).toEqual([]);
    });
  });

  describe("AC-1: Exams CRUD", () => {
    it("should get empty exams array when not set", () => {
      const result = getExams();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should add exam to empty array", () => {
      addExam(mockExam);
      const retrieved = getExams();
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe("exam-1");
      expect(retrieved[0].score).toBe(850);
    });

    it("should append multiple exams preserving order", () => {
      addExam(mockExam);
      const exam2 = { ...mockExam, id: "exam-2", score: 920 };
      addExam(exam2);
      const retrieved = getExams();
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].score).toBe(850);
      expect(retrieved[1].score).toBe(920);
    });

    it("should recover from corrupted exams array", () => {
      localStorage.setItem("duotrack.exams", "[{broken");
      const result = getExams();
      expect(result).toEqual([]);
    });
  });

  describe("AC-1: Problems CRUD", () => {
    it("should get empty problems array when not set", () => {
      const result = getProblems();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should add problem to empty array", () => {
      addProblem(mockProblem);
      const retrieved = getProblems();
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe("problem-1");
      expect(retrieved[0].question).toBe("What is the main idea?");
    });

    it("should append multiple problems preserving order", () => {
      addProblem(mockProblem);
      const problem2 = { ...mockProblem, id: "problem-2" };
      addProblem(problem2);
      const retrieved = getProblems();
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].id).toBe("problem-1");
      expect(retrieved[1].id).toBe("problem-2");
    });

    it("should recover from corrupted problems array", () => {
      localStorage.setItem("duotrack.problems", "[{bad json");
      const result = getProblems();
      expect(result).toEqual([]);
    });
  });

  describe("AC-1: Meta CRUD", () => {
    it("should set and retrieve meta", () => {
      setMeta(mockMeta);
      const retrieved = getMeta();
      expect(retrieved).toEqual(mockMeta);
      expect(retrieved?.isSubscribed).toBe(false);
      expect(retrieved?.weeklyFreeSessionsUsed).toBe(3);
    });

    it("should return default meta when not set", () => {
      const result = getMeta();
      expect(result).not.toBeNull();
      expect(result?.aiNoticeAcknowledged).toBe(false);
      expect(result?.isSubscribed).toBe(false);
      expect(result?.weeklyFreeSessionsUsed).toBe(0);
      expect(result?.onboarded).toBe(false);
    });

    it("should recover from corrupted meta", () => {
      localStorage.setItem("duotrack.meta", "{ bad");
      const result = getMeta();
      expect(result?.aiNoticeAcknowledged).toBe(false);
      expect(result?.onboarded).toBe(false);
    });
  });

  // AC-2: addProblem 호출 시 저장된 문제가 100건 초과하면 오래된 항목부터 제거되어 100건 유지
  describe("AC-2: Problems eviction at 100-item limit", () => {
    it("should maintain exactly 100 problems after exceeding limit", () => {
      // Add 101 problems
      for (let i = 0; i < 101; i++) {
        const problem: GeneratedProblem = {
          ...mockProblem,
          id: `problem-${i}`,
          generatedAt: new Date(Date.now() - (101 - i) * 1000).toISOString(),
        };
        addProblem(problem);
      }

      const retrieved = getProblems();
      expect(retrieved).toHaveLength(100);
    });

    it("should remove oldest problem when adding 101st", () => {
      // Add 100 problems with IDs 0-99
      const createdIds: string[] = [];
      for (let i = 0; i < 100; i++) {
        const problem: GeneratedProblem = {
          ...mockProblem,
          id: `problem-${i}`,
          generatedAt: new Date(Date.now() - (100 - i) * 1000).toISOString(),
        };
        addProblem(problem);
        createdIds.push(`problem-${i}`);
      }

      // Add 101st
      const problem101 = {
        ...mockProblem,
        id: "problem-100",
        generatedAt: new Date().toISOString(),
      };
      addProblem(problem101);

      const retrieved = getProblems();
      expect(retrieved).toHaveLength(100);
      // Oldest (problem-0) should be gone
      expect(
        retrieved.some((p: GeneratedProblem) => p.id === "problem-0")
      ).toBe(false);
      // Newest (problem-100) should be present
      expect(
        retrieved.some((p: GeneratedProblem) => p.id === "problem-100")
      ).toBe(true);
      // Problem-1 should be the oldest now
      expect(retrieved[0].id).toBe("problem-1");
    });

    it("should evict multiple oldest problems if needed", () => {
      // Add 100 problems
      for (let i = 0; i < 100; i++) {
        const problem: GeneratedProblem = {
          ...mockProblem,
          id: `problem-${i}`,
          generatedAt: new Date(Date.now() - (100 - i) * 1000).toISOString(),
        };
        addProblem(problem);
      }

      // Add 5 more problems rapidly
      for (let i = 100; i < 105; i++) {
        const problem: GeneratedProblem = {
          ...mockProblem,
          id: `problem-${i}`,
          generatedAt: new Date(Date.now() + (i - 100) * 100).toISOString(),
        };
        addProblem(problem);
      }

      const retrieved = getProblems();
      expect(retrieved).toHaveLength(100);
      // First 5 (0-4) should be gone
      expect(
        retrieved.some((p: GeneratedProblem) => p.id === "problem-0")
      ).toBe(false);
      expect(
        retrieved.some((p: GeneratedProblem) => p.id === "problem-4")
      ).toBe(false);
      // Last added should be present
      expect(
        retrieved.some((p: GeneratedProblem) => p.id === "problem-104")
      ).toBe(true);
    });

    it("should maintain order after eviction", () => {
      // Add 105 problems
      for (let i = 0; i < 105; i++) {
        const problem: GeneratedProblem = {
          ...mockProblem,
          id: `problem-${i}`,
          generatedAt: new Date(Date.now() - (105 - i) * 1000).toISOString(),
        };
        addProblem(problem);
      }

      const retrieved = getProblems();
      expect(retrieved).toHaveLength(100);
      // Check that IDs are in increasing order (problem-5 to problem-104)
      for (let i = 0; i < retrieved.length - 1; i++) {
        const curr = parseInt(retrieved[i].id.split("-")[1]);
        const next = parseInt(retrieved[i + 1].id.split("-")[1]);
        expect(curr).toBeLessThan(next);
      }
    });
  });

  // AC-3: JSON.parse 실패 시 throw 없이 기본값 반환, QuotaExceededError 시 {ok:false,reason:'quota'} 반환
  describe("AC-3: Error handling", () => {
    it("should not throw when profile JSON is corrupted", () => {
      localStorage.setItem("duotrack.profile", "not a json");
      expect(() => {
        const result = getProfile();
        expect(result).toBeNull();
      }).not.toThrow();
    });

    it("should not throw when sessions JSON is corrupted", () => {
      localStorage.setItem("duotrack.sessions", "[invalid, json]");
      expect(() => {
        const result = getSessions();
        expect(result).toEqual([]);
      }).not.toThrow();
    });

    it("should not throw when exams JSON is corrupted", () => {
      localStorage.setItem("duotrack.exams", "{ malformed");
      expect(() => {
        const result = getExams();
        expect(result).toEqual([]);
      }).not.toThrow();
    });

    it("should not throw when problems JSON is corrupted", () => {
      localStorage.setItem("duotrack.problems", "[ broken");
      expect(() => {
        const result = getProblems();
        expect(result).toEqual([]);
      }).not.toThrow();
    });

    it("should not throw when meta JSON is corrupted", () => {
      localStorage.setItem("duotrack.meta", "{ bad");
      expect(() => {
        const result = getMeta();
        expect(result).not.toBeNull();
      }).not.toThrow();
    });
  });

  describe("AC-3: QuotaExceededError handling", () => {
    it("should return error object when setProfile hits QuotaExceededError", () => {
      const quotaError = new Error("QuotaExceededError");
      quotaError.name = "QuotaExceededError";
      vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw quotaError;
      });

      const result = setProfile(mockProfile);
      expect(result).toEqual({ ok: false, reason: "quota" });
    });

    it("should return error object when addSession hits QuotaExceededError", () => {
      const quotaError = new Error("QuotaExceededError");
      quotaError.name = "QuotaExceededError";
      vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw quotaError;
      });

      const result = addSession(mockSession);
      expect(result).toEqual({ ok: false, reason: "quota" });
    });

    it("should return error object when addExam hits QuotaExceededError", () => {
      const quotaError = new Error("QuotaExceededError");
      quotaError.name = "QuotaExceededError";
      vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw quotaError;
      });

      const result = addExam(mockExam);
      expect(result).toEqual({ ok: false, reason: "quota" });
    });

    it("should return error object when addProblem hits QuotaExceededError", () => {
      const quotaError = new Error("QuotaExceededError");
      quotaError.name = "QuotaExceededError";
      vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw quotaError;
      });

      const result = addProblem(mockProblem);
      expect(result).toEqual({ ok: false, reason: "quota" });
    });

    it("should return error object when setMeta hits QuotaExceededError", () => {
      const quotaError = new Error("QuotaExceededError");
      quotaError.name = "QuotaExceededError";
      vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw quotaError;
      });

      const result = setMeta(mockMeta);
      expect(result).toEqual({ ok: false, reason: "quota" });
    });
  });

  describe("Integration: Multiple CRUD operations", () => {
    it("should handle mixed operations without interference", () => {
      setProfile(mockProfile);
      addSession(mockSession);
      addExam(mockExam);
      addProblem(mockProblem);
      setMeta(mockMeta);

      expect(getProfile()).toEqual(mockProfile);
      expect(getSessions()).toHaveLength(1);
      expect(getExams()).toHaveLength(1);
      expect(getProblems()).toHaveLength(1);
      expect(getMeta()).toEqual(mockMeta);
    });

    it("should maintain data integrity across multiple operations", () => {
      // Add profile
      setProfile(mockProfile);

      // Add 3 sessions
      for (let i = 0; i < 3; i++) {
        addSession({ ...mockSession, id: `session-${i}` });
      }

      // Add 2 exams
      for (let i = 0; i < 2; i++) {
        addExam({ ...mockExam, id: `exam-${i}` });
      }

      // Verify all still exist and are correct
      expect(getProfile()?.targetScore).toBe(900);
      expect(getSessions()).toHaveLength(3);
      expect(getExams()).toHaveLength(2);
    });

    it("should handle partial data loss scenario gracefully", () => {
      setProfile(mockProfile);
      addSession(mockSession);
      localStorage.setItem("duotrack.exams", "corrupted");

      // Profile and sessions should still work
      expect(getProfile()).toEqual(mockProfile);
      expect(getSessions()).toHaveLength(1);
      // Exams should recover to empty array
      expect(getExams()).toEqual([]);
    });
  });
});
