import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  DiagnoseResponse,
  GenerateResponse,
} from "@/lib/types";

/**
 * TDD RED PHASE: 외부 AI API 클라이언트 테스트
 *
 * API Contract:
 * - POST /diagnose {answers, exam} → DiagnoseResponse | {error}
 * - POST /generate-problems {part, count} → {problems} | {error}
 *
 * AC1: diagnose(req)가 성공 시 DiagnoseResponse, 실패 시 {error} 반환
 * AC2: generateProblems(req)가 GenerateResponse 또는 {error} 반환
 * AC3: 500/네트워크 예외를 {error}로 정규화, base URL은 env에서 주입
 */

// ============================================================================
// Mock fetch at module level for test isolation
// ============================================================================
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("외부 AI API 클라이언트 (Packet 0004)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    // Ensure base URL is set for tests
    process.env.VITE_API_BASE_URL = "http://localhost:3000";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // AC-1: diagnose(req) → DiagnoseResponse | {error}
  // ==========================================================================
  describe("AC-1: diagnose() 성공 및 실패 처리", () => {
    it("AC-1[P0] 성공 케이스: 진단 요청이 DiagnoseResponse를 반환해야 함", async () => {
      // Arrange
      const mockResponse: DiagnoseResponse = {
        currentLevel: 620,
        weakParts: ["LC_Part2", "RC_Part5"],
        path: ["/learn/listening/part2", "/learn/reading/part5"],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Import after mock setup
      const { diagnose } = await import("@/lib/api");

      // Act
      const result = await diagnose({
        exam: "TOEIC",
        answers: [
          { questionId: "q1", selectedIndex: 0 },
          { questionId: "q2", selectedIndex: 1 },
        ],
      } as any);

      // Assert
      expect(result).toEqual(mockResponse);
      if ("currentLevel" in result) {
        expect(result.currentLevel).toBe(620);
        expect(result.weakParts).toHaveLength(2);
        expect(result.weakParts[0]).toBe("LC_Part2");
        expect(result.path).toContain("/learn/listening/part2");
      }
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/diagnose",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("AC-1[P0] 실패 케이스: HTTP 400 에러가 {error} 객체를 반환해야 함", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid request format" }),
      });

      const { diagnose } = await import("@/lib/api");

      // Act
      const result = await diagnose({
        exam: "TOEIC",
        answers: [],
      } as any);

      // Assert
      expect(result).toHaveProperty("error");
      expect(typeof (result as any).error).toBe("string");
      expect((result as any).error).toBe("Invalid request format");
    });

    it("AC-1[P0] 실패 케이스: HTTP 500 에러가 {error} 객체를 반환해야 함", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal server error" }),
      });

      const { diagnose } = await import("@/lib/api");

      // Act
      const result = await diagnose({
        exam: "OPIC",
        answers: [],
      } as any);

      // Assert
      expect(result).toHaveProperty("error");
      expect((result as any).error).toContain("error");
    });

    it("AC-3[P0] 네트워크 에러 캐치: 네트워크 타임아웃이 {error}를 반환해야 함", async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      const { diagnose } = await import("@/lib/api");

      // Act
      const result = await diagnose({
        exam: "TEPS",
        answers: [],
      } as any);

      // Assert
      expect(result).toHaveProperty("error");
      expect((result as any).error).toBeTruthy();
      expect(typeof (result as any).error).toBe("string");
    });

    it("AC-3[P0] 네트워크 에러: fetch 실패가 throw하지 않고 {error}를 반환해야 함", async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(
        new TypeError("Failed to fetch")
      );

      const { diagnose } = await import("@/lib/api");

      // Act & Assert: 함수가 throw하지 않는다
      const result = await diagnose({
        exam: "TOEIC",
        answers: [],
      } as any);

      expect(result).toHaveProperty("error");
      expect(() => {
        if (typeof result === "object" && "error" in result) {
          // error 객체이므로 성공
        }
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // AC-2: generateProblems(req) → GenerateResponse | {error}
  // ==========================================================================
  describe("AC-2: generateProblems() 성공 및 실패 처리", () => {
    it("AC-2[P0] 성공 케이스: 문제 생성 요청이 GenerateResponse를 반환해야 함", async () => {
      // Arrange
      const mockResponse: GenerateResponse = {
        problems: [
          {
            id: "prob-001",
            part: "LC_Part2",
            question: "What is your name?",
            choices: ["John", "Alice", "Bob", "Charlie"],
            answerIndex: 1,
            explanation: "The answer is Alice because...",
          },
          {
            id: "prob-002",
            part: "LC_Part2",
            question: "Where are you from?",
            choices: ["Seoul", "Busan", "Daegu", "Incheon"],
            answerIndex: 0,
            explanation: "The answer is Seoul because...",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { generateProblems } = await import("@/lib/api");

      // Act
      const result = await generateProblems({
        part: "LC_Part2",
        count: 2,
      } as any);

      // Assert
      expect(result).toEqual(mockResponse);
      if ("problems" in result) {
        expect(result.problems).toHaveLength(2);
        expect(result.problems[0].id).toBe("prob-001");
        expect(result.problems[0].answerIndex).toBe(1);
        expect(result.problems[1].explanation).toContain("Seoul");
      }
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/generate-problems",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("AC-2[P0] 실패 케이스: HTTP 400 에러가 {error} 객체를 반환해야 함", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid part name" }),
      });

      const { generateProblems } = await import("@/lib/api");

      // Act
      const result = await generateProblems({
        part: "InvalidPart",
        count: 5,
      } as any);

      // Assert
      expect(result).toHaveProperty("error");
      expect((result as any).error).toBe("Invalid part name");
    });

    it("AC-2[P0] 실패 케이스: HTTP 500 에러가 {error} 객체를 반환해야 함", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Generation service unavailable" }),
      });

      const { generateProblems } = await import("@/lib/api");

      // Act
      const result = await generateProblems({
        part: "RC_Part5",
        count: 3,
      } as any);

      // Assert
      expect(result).toHaveProperty("error");
      expect((result as any).error).toBeTruthy();
    });

    it("AC-3[P0] 네트워크 에러: 타임아웃이 {error}를 반환해야 함", async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error("Request timeout"));

      const { generateProblems } = await import("@/lib/api");

      // Act
      const result = await generateProblems({
        part: "Reading",
        count: 10,
      } as any);

      // Assert
      expect(result).toHaveProperty("error");
      expect((result as any).error).toContain("timeout");
    });
  });

  // ==========================================================================
  // AC-3: Environment injection & Request body format
  // ==========================================================================
  describe("AC-3: 환경 변수 주입 및 요청 정규화", () => {
    it("AC-3[P0]: VITE_API_BASE_URL이 환경에서 주입되어야 함", async () => {
      // Arrange
      process.env.VITE_API_BASE_URL = "https://api.example.com";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          currentLevel: 500,
          weakParts: [],
          path: [],
        }),
      });

      const { diagnose } = await import("@/lib/api");

      // Act
      await diagnose({
        exam: "TOEIC",
        answers: [],
      } as any);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/diagnose",
        expect.any(Object)
      );

      // Cleanup
      process.env.VITE_API_BASE_URL = "http://localhost:3000";
    });

    it("AC-3[P0]: generateProblems가 올바른 URL로 POST 요청을 보내야 함", async () => {
      // Arrange
      process.env.VITE_API_BASE_URL = "http://api.test.com";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ problems: [] }),
      });

      const { generateProblems } = await import("@/lib/api");

      // Act
      await generateProblems({
        part: "LC_Part2",
        count: 1,
      } as any);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        "http://api.test.com/generate-problems",
        expect.any(Object)
      );

      // Cleanup
      process.env.VITE_API_BASE_URL = "http://localhost:3000";
    });

    it("AC-3[P0]: diagnose 요청 본문이 JSON으로 직렬화되어야 함", async () => {
      // Arrange
      const testAnswers = [
        { questionId: "q1", selectedIndex: 0 },
        { questionId: "q2", selectedIndex: 2 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          currentLevel: 600,
          weakParts: [],
          path: [],
        }),
      });

      const { diagnose } = await import("@/lib/api");

      // Act
      await diagnose({
        exam: "TOEIC",
        answers: testAnswers,
      } as any);

      // Assert
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.body).toBeDefined();
      const body = JSON.parse(callArgs[1]?.body);
      expect(body).toHaveProperty("exam", "TOEIC");
      expect(body).toHaveProperty("answers");
      expect(body.answers).toHaveLength(2);
    });

    it("AC-3[P0]: generateProblems 요청 본문이 올바른 필드를 포함해야 함", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ problems: [] }),
      });

      const { generateProblems } = await import("@/lib/api");

      // Act
      await generateProblems({
        part: "LC_Part3",
        count: 5,
      } as any);

      // Assert
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body);
      expect(body).toHaveProperty("part", "LC_Part3");
      expect(body).toHaveProperty("count", 5);
    });
  });

  // ==========================================================================
  // Integration: Error normalization & exception handling
  // ==========================================================================
  describe("AC-3: 예외 정규화 및 에러 처리", () => {
    it("AC-3[P0]: 모든 예외가 throw하지 않고 {error} 객체로 반환되어야 함", async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error("Unexpected error"));

      const { diagnose } = await import("@/lib/api");

      // Act
      let result;
      try {
        result = await diagnose({
          exam: "TOEIC",
          answers: [],
        } as any);
      } catch (error) {
        // Should not reach here
        throw new Error("diagnose() should not throw, but return {error}");
      }

      // Assert
      expect(result).toHaveProperty("error");
      expect(typeof (result as any).error).toBe("string");
    });

    it("AC-3[P0]: JSON 파싱 에러가 {error}로 정규화되어야 함", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      });

      const { diagnose } = await import("@/lib/api");

      // Act
      const result = await diagnose({
        exam: "TOEIC",
        answers: [],
      } as any);

      // Assert
      expect(result).toHaveProperty("error");
      expect(typeof (result as any).error).toBe("string");
    });

    it("AC-3[P0]: 응답 상태가 ok=false일 때 error 객체를 파싱해야 함", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: "Rate limit exceeded" }),
      });

      const { generateProblems } = await import("@/lib/api");

      // Act
      const result = await generateProblems({
        part: "RC_Part7",
        count: 5,
      } as any);

      // Assert
      expect(result).toHaveProperty("error");
      expect((result as any).error).toBe("Rate limit exceeded");
    });
  });

  // ==========================================================================
  // Edge cases & Contract verification
  // ==========================================================================
  describe("Edge cases & Contract verification", () => {
    it("요청 헤더가 Content-Type: application/json을 포함해야 함", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          currentLevel: 500,
          weakParts: [],
          path: [],
        }),
      });

      const { diagnose } = await import("@/lib/api");

      // Act
      await diagnose({
        exam: "TOEIC",
        answers: [],
      } as any);

      // Assert
      const [_, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("diagnose: 다양한 시험 종류(TOEIC, OPIC, TEPS)를 요청에 포함해야 함", async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          currentLevel: 600,
          weakParts: [],
          path: [],
        }),
      });

      const { diagnose } = await import("@/lib/api");

      // Act
      await diagnose({
        exam: "OPIC",
        answers: [],
      } as any);
      await diagnose({
        exam: "TEPS",
        answers: [],
      } as any);

      // Assert
      const firstCall = JSON.parse(mockFetch.mock.calls[0][1]?.body);
      const secondCall = JSON.parse(mockFetch.mock.calls[1][1]?.body);
      expect(firstCall.exam).toBe("OPIC");
      expect(secondCall.exam).toBe("TEPS");
    });

    it("generateProblems: 요청이 part와 count를 올바르게 전달해야 함", async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ problems: [] }),
      });

      const { generateProblems } = await import("@/lib/api");

      // Act
      await generateProblems({
        part: "Reading",
        count: 10,
      } as any);

      // Assert
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body);
      expect(body.part).toBe("Reading");
      expect(body.count).toBe(10);
      expect(typeof body.count).toBe("number");
    });
  });
});
