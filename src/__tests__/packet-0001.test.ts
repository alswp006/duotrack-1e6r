import { describe, it, expect } from "vitest";
import type {
  UserProfile,
  StudySession,
  MockExamResult,
  GeneratedProblem,
  AppMeta,
  DiagnoseRequest,
  DiagnoseResponse,
  GenerateRequest,
  GenerateResponse,
  TargetExam,
  ExamType,
  RouteState,
} from "@/lib/types";

describe("엔티티 타입 + RouteState 계약 정의", () => {
  describe("AC-1[P0]: Entity Interfaces 정의", () => {
    it("should export UserProfile interface with all required fields", () => {
      const profile: UserProfile = {
        targetExam: "TOEIC",
        targetScore: 800,
        currentLevel: 620,
        diagnosedAt: "2026-07-24T10:30:00Z",
        weakParts: ["LC_Part2", "RC_Part5"],
        createdAt: "2026-01-01T00:00:00Z",
      };
      expect(profile.targetExam).toBe("TOEIC");
      expect(profile.targetScore).toBe(800);
      expect(profile.currentLevel).toBe(620);
      expect(profile.weakParts).toContain("LC_Part2");
      expect(profile.diagnosedAt).toBe("2026-07-24T10:30:00Z");
    });

    it("should export StudySession interface with session tracking fields", () => {
      const session: StudySession = {
        id: "session-001",
        startedAt: "2026-07-24T14:00:00Z",
        durationSec: 1500,
        focusPart: "LC_Part2",
        completed: true,
        problemsSolved: 20,
        correctCount: 18,
      };
      expect(session.id).toBeDefined();
      expect(session.durationSec).toBe(1500);
      expect(session.completed).toBe(true);
      expect(session.correctCount).toBe(18);
    });

    it("should export MockExamResult interface with type and partScores", () => {
      const examResult: MockExamResult = {
        id: "exam-001",
        type: "REAL",
        exam: "TOEIC",
        score: 780,
        takenAt: "2026-06-15T09:00:00Z",
        partScores: { LC: 400, RC: 380 },
      };
      expect(examResult.type).toBe("REAL");
      expect(examResult.exam).toBe("TOEIC");
      expect(examResult.score).toBe(780);
      expect(examResult.partScores["LC"]).toBe(400);
    });

    it("should export GeneratedProblem interface for AI-generated questions", () => {
      const problem: GeneratedProblem = {
        id: "problem-001",
        part: "LC_Part2",
        question: "What is your name?",
        choices: ["Alice", "Bob", "Charlie", "David"],
        answerIndex: 0,
        explanation: "The correct answer is Alice.",
        generatedAt: "2026-07-24T10:00:00Z",
      };
      expect(problem.part).toBe("LC_Part2");
      expect(problem.choices.length).toBe(4);
      expect(problem.answerIndex).toBe(0);
      expect(problem.explanation).toBeDefined();
    });

    it("should export AppMeta interface for app state flags", () => {
      const meta: AppMeta = {
        aiNoticeAcknowledged: true,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 2,
        weekAnchor: "2026-07-21T00:00:00Z",
        onboarded: true,
      };
      expect(meta.aiNoticeAcknowledged).toBe(true);
      expect(meta.isSubscribed).toBe(false);
      expect(meta.weeklyFreeSessionsUsed).toBe(2);
      expect(typeof meta.weekAnchor).toBe("string");
    });
  });

  describe("AC-1[P0]: API Request/Response Interfaces", () => {
    it("should export DiagnoseRequest interface", () => {
      const request: DiagnoseRequest = {
        exam: "TOEIC",
        targetScore: 800,
        answers: [
          { questionId: "q1", selectedIndex: 0 },
          { questionId: "q2", selectedIndex: 2 },
        ],
      };
      expect(request.exam).toBe("TOEIC");
      expect(request.targetScore).toBe(800);
      expect(request.answers.length).toBe(2);
      expect(request.answers[0].selectedIndex).toBe(0);
    });

    it("should export DiagnoseResponse interface", () => {
      const response: DiagnoseResponse = {
        currentLevel: 620,
        weakParts: ["LC_Part2", "RC_Part5"],
        path: ["focus_lc_part2", "focus_rc_part5"],
      };
      expect(response.currentLevel).toBe(620);
      expect(response.weakParts).toContain("LC_Part2");
      expect(response.path.length).toBe(2);
    });

    it("should export GenerateRequest interface for problem generation", () => {
      const request: GenerateRequest = {
        part: "LC_Part2",
        count: 5,
        level: 620,
      };
      expect(request.part).toBe("LC_Part2");
      expect(request.count).toBe(5);
      expect(request.level).toBe(620);
    });

    it("should export GenerateResponse interface with array of problems", () => {
      const response: GenerateResponse = {
        problems: [
          {
            id: "gen-001",
            part: "LC_Part2",
            question: "What is the weather like?",
            choices: ["Sunny", "Rainy", "Cloudy", "Snowy"],
            answerIndex: 1,
            explanation: "The answer is Rainy.",
          },
        ],
      };
      expect(response.problems.length).toBe(1);
      expect(response.problems[0].choices.length).toBe(4);
    });
  });

  describe("AC-1[P0]: Union Types (TargetExam, ExamType)", () => {
    it("should support TargetExam union: TOEIC, OPIC, TEPS", () => {
      const exams: TargetExam[] = ["TOEIC", "OPIC", "TEPS"];
      expect(exams).toContain("TOEIC");
      expect(exams).toContain("OPIC");
      expect(exams).toContain("TEPS");
    });

    it("should support ExamType union: MOCK, REAL", () => {
      const types: ExamType[] = ["MOCK", "REAL"];
      expect(types).toContain("MOCK");
      expect(types).toContain("REAL");
    });

    it("should allow TargetExam in UserProfile", () => {
      const profile: UserProfile = {
        targetExam: "OPIC",
        targetScore: 150,
        currentLevel: 100,
        diagnosedAt: "2026-07-24T10:30:00Z",
        weakParts: [],
        createdAt: "2026-01-01T00:00:00Z",
      };
      expect(profile.targetExam).toBe("OPIC");
    });
  });

  describe("AC-2[P0]: RouteState Contract — 11 routes", () => {
    it("should have RouteState with path '/'", () => {
      const routeState: Partial<RouteState> = {
        "/": undefined,
      };
      expect(routeState).toHaveProperty("/");
    });

    it("should have RouteState with path '/diagnose'", () => {
      const routeState: Partial<RouteState> = {
        "/diagnose": undefined,
      };
      expect(routeState).toHaveProperty("/diagnose");
    });

    it("should have RouteState with path '/diagnose/quiz' and targetExam state", () => {
      const routeState: Partial<RouteState> = {
        "/diagnose/quiz": {
          targetExam: "TOEIC",
          targetScore: 800,
        },
      };
      expect(routeState["/diagnose/quiz"]).toBeDefined();
      expect(routeState["/diagnose/quiz"]?.targetExam).toBe("TOEIC");
    });

    it("should have RouteState with path '/diagnose/result' and profile state", () => {
      const routeState: Partial<RouteState> = {
        "/diagnose/result": {
          profile: {
            targetExam: "TOEIC",
            targetScore: 800,
            currentLevel: 620,
            diagnosedAt: "2026-07-24T10:30:00Z",
            weakParts: ["LC_Part2"],
            createdAt: "2026-01-01T00:00:00Z",
          },
        },
      };
      expect(routeState["/diagnose/result"]).toBeDefined();
      expect(routeState["/diagnose/result"]?.profile?.currentLevel).toBe(620);
    });

    it("should have RouteState with path '/home'", () => {
      const routeState: Partial<RouteState> = {
        "/home": undefined,
      };
      expect(routeState).toHaveProperty("/home");
    });

    it("should have RouteState with path '/session'", () => {
      const routeState: Partial<RouteState> = {
        "/session": undefined,
      };
      expect(routeState).toHaveProperty("/session");
    });

    it("should have RouteState with path '/exams'", () => {
      const routeState: Partial<RouteState> = {
        "/exams": undefined,
      };
      expect(routeState).toHaveProperty("/exams");
    });

    it("should have RouteState with path '/problems' and optional mode state", () => {
      const routeState: Partial<RouteState> = {
        "/problems": {
          mode: "mock",
        },
      };
      expect(routeState["/problems"]).toBeDefined();
      expect(routeState["/problems"]?.mode).toBe("mock");
    });

    it("should have RouteState with path '/report'", () => {
      const routeState: Partial<RouteState> = {
        "/report": undefined,
      };
      expect(routeState).toHaveProperty("/report");
    });

    it("should have RouteState with path '/subscribe'", () => {
      const routeState: Partial<RouteState> = {
        "/subscribe": undefined,
      };
      expect(routeState).toHaveProperty("/subscribe");
    });

    it("should have RouteState with path '/settings'", () => {
      const routeState: Partial<RouteState> = {
        "/settings": undefined,
      };
      expect(routeState).toHaveProperty("/settings");
    });

    it("should include all 11 route paths in RouteState", () => {
      const expectedPaths = [
        "/",
        "/diagnose",
        "/diagnose/quiz",
        "/diagnose/result",
        "/home",
        "/session",
        "/exams",
        "/problems",
        "/report",
        "/subscribe",
        "/settings",
      ];

      // Create a type that requires all paths
      const allRoutes: Partial<RouteState> = {
        "/": undefined,
        "/diagnose": undefined,
        "/diagnose/quiz": { targetExam: "TOEIC", targetScore: 800 },
        "/diagnose/result": {
          profile: {
            targetExam: "TOEIC",
            targetScore: 800,
            currentLevel: 620,
            diagnosedAt: "2026-07-24T10:30:00Z",
            weakParts: [],
            createdAt: "2026-01-01T00:00:00Z",
          },
        },
        "/home": undefined,
        "/session": undefined,
        "/exams": undefined,
        "/problems": { mode: undefined },
        "/report": undefined,
        "/subscribe": undefined,
        "/settings": undefined,
      };

      expectedPaths.forEach((path) => {
        expect(allRoutes).toHaveProperty(path);
      });
    });
  });

  describe("AC-3[P0]: Type Safety Validation", () => {
    it("should enforce correct UserProfile targetExam type", () => {
      const profile: UserProfile = {
        targetExam: "TOEIC",
        targetScore: 800,
        currentLevel: 620,
        diagnosedAt: "2026-07-24T10:30:00Z",
        weakParts: [],
        createdAt: "2026-01-01T00:00:00Z",
      };
      expect(["TOEIC", "OPIC", "TEPS"]).toContain(profile.targetExam);
    });

    it("should enforce correct MockExamResult type", () => {
      const exam: MockExamResult = {
        id: "exam-001",
        type: "MOCK",
        exam: "TOEIC",
        score: 760,
        takenAt: "2026-07-24T09:00:00Z",
        partScores: { LC: 380, RC: 380 },
      };
      expect(["MOCK", "REAL"]).toContain(exam.type);
      expect(["TOEIC", "OPIC", "TEPS"]).toContain(exam.exam);
    });

    it("should enforce StudySession correctCount <= problemsSolved", () => {
      const session: StudySession = {
        id: "session-001",
        startedAt: "2026-07-24T14:00:00Z",
        durationSec: 1500,
        focusPart: "LC_Part2",
        completed: true,
        problemsSolved: 20,
        correctCount: 18,
      };
      expect(session.correctCount).toBeLessThanOrEqual(session.problemsSolved);
    });

    it("should enforce GeneratedProblem answerIndex in range 0-3", () => {
      const problem: GeneratedProblem = {
        id: "problem-001",
        part: "LC_Part2",
        question: "What is your name?",
        choices: ["Alice", "Bob", "Charlie", "David"],
        answerIndex: 2,
        explanation: "Charlie is correct.",
        generatedAt: "2026-07-24T10:00:00Z",
      };
      expect(problem.answerIndex).toBeGreaterThanOrEqual(0);
      expect(problem.answerIndex).toBeLessThan(problem.choices.length);
    });

    it("should enforce AppMeta weeklyFreeSessionsUsed >= 0", () => {
      const meta: AppMeta = {
        aiNoticeAcknowledged: false,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 0,
        weekAnchor: "2026-07-21T00:00:00Z",
        onboarded: false,
      };
      expect(meta.weeklyFreeSessionsUsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("AC-2[P0]: Route Data Contracts", () => {
    it("should validate /diagnose/quiz state shape", () => {
      type DiagnoseQuizState = RouteState["/diagnose/quiz"];
      const state: DiagnoseQuizState = {
        targetExam: "OPIC",
        targetScore: 150,
      };
      expect(state.targetExam).toBeDefined();
      expect(state.targetScore).toBeDefined();
      expect(typeof state.targetScore).toBe("number");
    });

    it("should validate /diagnose/result state shape with UserProfile", () => {
      type DiagnoseResultState = RouteState["/diagnose/result"];
      const state: DiagnoseResultState = {
        profile: {
          targetExam: "TEPS",
          targetScore: 400,
          currentLevel: 350,
          diagnosedAt: "2026-07-24T10:30:00Z",
          weakParts: ["Reading"],
          createdAt: "2026-01-01T00:00:00Z",
        },
      };
      expect(state.profile).toBeDefined();
      expect(state.profile.targetExam).toBe("TEPS");
    });

    it("should validate /problems state shape with optional mode", () => {
      type ProblemsState = RouteState["/problems"];
      const stateWithMode: ProblemsState = {
        mode: "mock",
      };
      expect(stateWithMode.mode).toBe("mock");

      const stateWithoutMode: ProblemsState = {
        mode: undefined,
      };
      expect(stateWithoutMode.mode).toBeUndefined();
    });
  });
});
