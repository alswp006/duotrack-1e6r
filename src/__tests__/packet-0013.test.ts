import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { addProblem } from "@/lib/storage";
import type { GeneratedProblem } from "@/lib/types";

/**
 * TDD RED PHASE: AI 문제 생성/풀이 화면 (S8 /problems)
 *
 * Contract this test file establishes for the Coder:
 * - 초기 화면에는 "문제 생성" 접근 가능한 이름(role=button)이 있고, 클릭 시 아직 로딩 중이 아니다.
 * - "문제 생성" 클릭 시 generateProblems({ part, count })가 호출된다. part는
 *   useAppStore().profile.weakParts[0] 값을 사용한다. 대기 중에는 role="progressbar"가 뜨고
 *   "문제 생성" 버튼은 disabled 상태가 된다.
 * - generateProblems()가 성공 응답을 반환하면:
 *   - data-testid="ai-badge" 요소가 정확히 "AI가 생성한 결과입니다" 텍스트를 표시한다.
 *   - 생성된 각 문제는 data-testid="problem-question" Card로 렌더되고, 문제별 선택지 그룹은
 *     data-testid={`problem-choice-${index}`} 컨테이너 안에 4개의 role="radio" 입력을 갖는다.
 *   - 생성된 문제들은 addProblem()을 통해 localStorage("duotrack.problems")에 저장된다.
 *     이미 100건이 저장돼 있는 상태에서 새 문제가 추가되면, 가장 오래된 문제가 제거되고
 *     정확히 100건이 유지된다(eviction은 src/lib/storage.ts의 addProblem이 담당 — 페이지는
 *     반드시 이 함수를 통해 저장해야 한다).
 * - generateProblems()가 {error}를 반환하면 에러 문구와 "다시 시도" 버튼이 뜨고 크래시하지
 *   않는다. 재시도 클릭 시 generateProblems()가 다시 호출된다.
 */

mockAll();

const mockGenerateProblems = vi.fn();
vi.mock("@/lib/api", () => ({
  generateProblems: (...args: unknown[]) => mockGenerateProblems(...args),
}));

vi.mock("@/lib/store", () => ({
  useAppStore: () => ({
    meta: {
      aiNoticeAcknowledged: true,
      isSubscribed: false,
      weeklyFreeSessionsUsed: 0,
      weekAnchor: "2026-07-24",
      onboarded: true,
    },
    profile: {
      targetExam: "TOEIC",
      targetScore: 900,
      currentLevel: 5,
      diagnosedAt: "2026-07-20",
      weakParts: ["LC_Part2"],
      createdAt: "2026-07-18",
    },
    isLoading: false,
    isSubscribed: false,
    canUseFeature: () => false,
    updateMeta: vi.fn(),
  }),
  AppStoreProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const generatedProblemsFixture = [
  {
    id: "gen-1",
    part: "LC_Part2",
    question: "What time does the meeting start?",
    choices: ["At 9 AM", "In the lobby", "Yes, I did", "Two hours"],
    answerIndex: 0,
    explanation: "시간을 묻는 질문에는 시간으로 답해야 해요.",
  },
  {
    id: "gen-2",
    part: "LC_Part2",
    question: "Who is presenting the report?",
    choices: ["Next week", "Ms. Kim is", "It's on the desk", "No thanks"],
    answerIndex: 1,
    explanation: "Who 질문에는 사람으로 답해야 해요.",
  },
];

async function importPage() {
  // @ts-ignore TDD red phase — src/pages/Problems.tsx is created by the Coder, not yet present
  const mod = await import("@/pages/Problems");
  return mod.default;
}

function buildProblem(id: string, generatedAt: string): GeneratedProblem {
  return {
    id,
    part: "LC_Part2",
    question: `문제 ${id}`,
    choices: ["a", "b", "c", "d"],
    answerIndex: 0,
    explanation: "설명",
    generatedAt,
  };
}

describe("AI 문제 생성/풀이 화면 (S8 /problems)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGenerateProblems.mockReset();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("AC-1[P0]: '문제 생성' 클릭 시 generateProblems()가 취약 파트로 호출되고, 대기 중 progressbar와 버튼 비활성을 보여준다", async () => {
    let resolveGenerate: (value: unknown) => void = () => {};
    mockGenerateProblems.mockImplementation(
      () => new Promise((resolve) => { resolveGenerate = resolve; }),
    );

    const Problems = await importPage();
    renderWithRouter(
      React.createElement(Problems),
      { initialEntries: ["/problems"] },
    );

    const generateButton = screen.getByRole("button", { name: /문제 생성/ });
    fireEvent.click(generateButton);

    await waitFor(() => expect(mockGenerateProblems).toHaveBeenCalledTimes(1));

    const [payload] = mockGenerateProblems.mock.calls[0];
    expect(payload.part).toBe("LC_Part2");
    expect(payload.count).toBeGreaterThan(0);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /문제 생성/ })).toBeDisabled();

    resolveGenerate({ problems: generatedProblemsFixture });
    await waitFor(() => expect(screen.getByTestId("ai-badge")).toBeInTheDocument());
  });

  it("AC-2[P0]: 생성 성공 시 ai-badge 문구와 4지선다 문제 카드가 렌더된다", async () => {
    mockGenerateProblems.mockResolvedValueOnce({ problems: generatedProblemsFixture });

    const Problems = await importPage();
    renderWithRouter(
      React.createElement(Problems),
      { initialEntries: ["/problems"] },
    );

    fireEvent.click(screen.getByRole("button", { name: /문제 생성/ }));

    await waitFor(() => {
      expect(screen.getByTestId("ai-badge")).toHaveTextContent("AI가 생성한 결과입니다");
    });

    const cards = screen.getAllByTestId("problem-question");
    expect(cards).toHaveLength(2);

    const firstChoices = within(screen.getByTestId("problem-choice-0")).getAllByRole("radio");
    expect(firstChoices).toHaveLength(4);
    expect(screen.getByText("What time does the meeting start?")).toBeInTheDocument();
  });

  it("AC-3[P0]: 생성된 문제는 addProblem으로 저장되며, 100건 초과 시 가장 오래된 문제부터 제거된다", async () => {
    for (let i = 0; i < 100; i++) {
      addProblem(buildProblem(`existing-${i}`, new Date(Date.now() - (100 - i) * 1000).toISOString()));
    }

    mockGenerateProblems.mockResolvedValueOnce({
      problems: [generatedProblemsFixture[0]],
    });

    const Problems = await importPage();
    renderWithRouter(
      React.createElement(Problems),
      { initialEntries: ["/problems"] },
    );

    fireEvent.click(screen.getByRole("button", { name: /문제 생성/ }));

    await waitFor(() => expect(screen.getByTestId("ai-badge")).toBeInTheDocument());

    const stored = JSON.parse(localStorage.getItem("duotrack.problems") ?? "[]");
    expect(stored).toHaveLength(100);
    expect(stored.some((p: GeneratedProblem) => p.id === "existing-0")).toBe(false);
    expect(stored.some((p: GeneratedProblem) => p.id === "gen-1")).toBe(true);
  });

  it("AC-3[P0]: generateProblems() 에러 시 에러 문구와 다시 시도 버튼을 보여주고 크래시하지 않으며, 재시도 시 다시 호출한다", async () => {
    mockGenerateProblems.mockResolvedValueOnce({ error: "서버 오류" });

    const Problems = await importPage();
    renderWithRouter(
      React.createElement(Problems),
      { initialEntries: ["/problems"] },
    );

    fireEvent.click(screen.getByRole("button", { name: /문제 생성/ }));

    await waitFor(() => expect(mockGenerateProblems).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByText("문제 생성에 실패했어요. 다시 시도해주세요")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(screen.queryByTestId("ai-badge")).not.toBeInTheDocument();

    mockGenerateProblems.mockResolvedValueOnce({ problems: generatedProblemsFixture });
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() => expect(mockGenerateProblems).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId("ai-badge")).toBeInTheDocument());
  });

  it("Edge: location.state 없이 접근해도 크래시하지 않고 초기 화면(문제 생성 버튼)이 렌더된다", async () => {
    const Problems = await importPage();
    expect(() =>
      renderWithRouter(
        React.createElement(Problems),
        { initialEntries: ["/problems"] },
      ),
    ).not.toThrow();

    expect(screen.getByRole("button", { name: /문제 생성/ })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
