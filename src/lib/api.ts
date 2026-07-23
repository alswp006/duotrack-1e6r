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

/**
 * AI 실력 진단 요청
 *
 * @param req - 진단 요청 (exam, answers)
 * @returns DiagnoseResponse 또는 {error: string}
 */
export async function diagnose(
  req: DiagnoseRequest
): Promise<DiagnoseResponse | { error: string }> {
  // TODO: Implement
  throw new Error("Not implemented");
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
  // TODO: Implement
  throw new Error("Not implemented");
}
