import type {
  DiagnoseResponse,
  GenerateResponse,
} from "@/lib/types";

/**
 * 외부 AI API 클라이언트 (Packet 0004)
 *
 * Railway 서버의 POST /diagnose, POST /generate-problems를 호출하는 fetch 래퍼.
 * 성공: 응답 타입 반환
 * 실패: {error: string}으로 정규화 (throw 없음)
 * base URL: import.meta.env.VITE_API_BASE_URL에서 주입
 */

interface DiagnoseRequest {
  exam: string;
  answers: Array<{ questionId: string; selectedIndex: number }>;
}

interface GenerateProblemsRequest {
  part: string;
  count: number;
}

function getBaseUrl(): string {
  return (
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    (typeof process !== "undefined" ? process.env.VITE_API_BASE_URL : undefined) ??
    ""
  );
}

async function post<T>(path: string, body: unknown): Promise<T | { error: string }> {
  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        error: typeof data?.error === "string" ? data.error : `요청이 실패했어요 (${res.status})`,
      };
    }

    return data as T;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "요청 중 문제가 발생했어요" };
  }
}

/**
 * AI 실력 진단 요청
 *
 * @param req - 진단 요청 (exam, answers)
 * @returns DiagnoseResponse 또는 {error: string}
 */
export async function diagnose(
  req: DiagnoseRequest
): Promise<DiagnoseResponse | { error: string }> {
  return post<DiagnoseResponse>("/diagnose", {
    exam: req.exam,
    answers: req.answers,
  });
}

/**
 * AI 문제 생성 요청
 *
 * @param req - 생성 요청 (part, count)
 * @returns GenerateResponse 또는 {error: string}
 */
export async function generateProblems(
  req: GenerateProblemsRequest
): Promise<GenerateResponse | { error: string }> {
  return post<GenerateResponse>("/generate-problems", {
    part: req.part,
    count: req.count,
  });
}
