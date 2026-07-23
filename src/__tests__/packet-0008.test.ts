import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

/**
 * TDD RED PHASE: 진단 문항 화면 (S3 /diagnose/quiz)
 *
 * Contract this test file establishes for the Coder:
 * - 10문항이 각각 data-testid="quiz-question" Card로 렌더된다 (getAllByTestId 검증).
 * - 각 문항의 선택지 그룹은 data-testid={`quiz-choice-${index}`} (index: 0~9) 컨테이너 안에
 *   role="radio" 입력을 갖는다. 그룹 내 첫 번째 radio를 클릭하면 그 문항의 selectedIndex=0으로 응답된다.
 * - 제출 버튼은 접근 가능한 이름 "진단 결과 보기" (role=button)이다.
 * - 미응답 문항이 있으면 토스트 "모든 문항에 답해주세요"를 띄우고 diagnose()를 호출하지 않는다.
 * - 전체 응답 완료 후 제출하면 TossRewardAd 시청(mock은 자동 완료)을 거쳐 diagnose()가
 *   { exam, answers } 형태로 호출된다. 대기 중에는 role="progressbar" + "AI가 실력을
 *   분석하고 있어요" 문구가 뜨고 제출 버튼은 disabled 상태가 된다.
 * - diagnose()가 {error}를 반환하면 "진단에 실패했어요. 다시 시도해주세요" 문구와
 *   "다시 시도" 버튼이 뜨고 크래시하지 않는다. 재시도 클릭 시 diagnose()가 다시 호출된다.
 * - diagnose()가 성공 응답을 반환하면 UserProfile을 localStorage("duotrack.profile")에 저장하고
 *   navigate('/diagnose/result', { state: { profile } })로 이동한다.
 */

mockAll();

const mockDiagnose = vi.fn();
vi.mock("@/lib/api", () => ({
  diagnose: (...args: unknown[]) => mockDiagnose(...args),
}));

// DiagnoseQuiz는 useAppStore를 쓸 수도 있으므로 실제 경로(@/lib/store)를 안전하게 목킹.
vi.mock("@/lib/store", () => ({
  useAppStore: () => ({
    meta: {
      aiNoticeAcknowledged: true,
      isSubscribed: false,
      weeklyFreeSessionsUsed: 0,
      weekAnchor: "2026-07-24",
      onboarded: true,
    },
    profile: null,
    isLoading: false,
    isSubscribed: false,
    canUseFeature: () => false,
    updateMeta: vi.fn(),
  }),
  AppStoreProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const routeState = { targetExam: "TOEIC" as const, targetScore: 800 };

async function importPage() {
  const mod = await import("@/pages/DiagnoseQuiz");
  return mod.default;
}

/** 문항 index(0~9)의 첫 번째 선택지를 클릭해 응답 처리 */
function answerQuestion(index: number) {
  const group = screen.getByTestId(`quiz-choice-${index}`);
  const radios = within(group).getAllByRole("radio");
  fireEvent.click(radios[0]);
}

function answerAllQuestions() {
  for (let i = 0; i < 10; i++) answerQuestion(i);
}

describe("진단 문항 화면 (S3 /diagnose/quiz)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockDiagnose.mockReset();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("AC-1[P0]: 미응답 문항이 있으면 토스트를 띄우고 diagnose()를 호출하지 않는다", async () => {
    const DiagnoseQuiz = await importPage();
    renderWithRouter(
      React.createElement(DiagnoseQuiz),
      { initialEntries: [{ pathname: "/diagnose/quiz", state: routeState }] },
    );

    // 10문항 중 9개만 응답
    for (let i = 0; i < 9; i++) answerQuestion(i);

    fireEvent.click(screen.getByRole("button", { name: /진단 결과 보기/ }));

    await waitFor(() => {
      expect(screen.getByText("모든 문항에 답해주세요")).toBeInTheDocument();
    });
    expect(mockDiagnose).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("Layout: 10개 문항이 quiz-question Card로 렌더된다", async () => {
    const DiagnoseQuiz = await importPage();
    renderWithRouter(
      React.createElement(DiagnoseQuiz),
      { initialEntries: [{ pathname: "/diagnose/quiz", state: routeState }] },
    );

    const cards = screen.getAllByTestId("quiz-question");
    expect(cards).toHaveLength(10);
    expect(screen.getByRole("button", { name: /진단 결과 보기/ })).toBeInTheDocument();
  });

  it("AC-2[P0]: 전체 응답 후 제출하면 광고 시청을 거쳐 diagnose()가 호출되고, 대기 중 Spinner+안내문구+버튼 비활성을 보여준다", async () => {
    let resolveDiagnose: (value: unknown) => void = () => {};
    mockDiagnose.mockImplementation(
      () => new Promise((resolve) => { resolveDiagnose = resolve; }),
    );

    const DiagnoseQuiz = await importPage();
    renderWithRouter(
      React.createElement(DiagnoseQuiz),
      { initialEntries: [{ pathname: "/diagnose/quiz", state: routeState }] },
    );

    answerAllQuestions();
    fireEvent.click(screen.getByRole("button", { name: /진단 결과 보기/ }));

    // TossRewardAd mock이 setTimeout(0)으로 onReward를 자동 호출 → diagnose() 호출됨
    await waitFor(() => expect(mockDiagnose).toHaveBeenCalledTimes(1));

    const [payload] = mockDiagnose.mock.calls[0];
    expect(payload.exam).toBe("TOEIC");
    expect(payload.answers).toHaveLength(10);
    expect(payload.answers[0]).toEqual({ questionId: expect.any(String), selectedIndex: 0 });

    // 대기 중 상태
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText("AI가 실력을 분석하고 있어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /진단 결과 보기/ })).toBeDisabled();

    resolveDiagnose({ currentLevel: 620, weakParts: ["LC_Part2"], path: ["/learn/listening/part2"] });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });

  it("AC-3[P0]: diagnose() 에러 시 에러 문구+다시 시도 버튼을 보여주고 크래시하지 않으며, 재시도 시 diagnose()를 다시 호출한다", async () => {
    mockDiagnose.mockResolvedValueOnce({ error: "서버 오류" });

    const DiagnoseQuiz = await importPage();
    renderWithRouter(
      React.createElement(DiagnoseQuiz),
      { initialEntries: [{ pathname: "/diagnose/quiz", state: routeState }] },
    );

    answerAllQuestions();
    fireEvent.click(screen.getByRole("button", { name: /진단 결과 보기/ }));

    await waitFor(() => expect(mockDiagnose).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByText("진단에 실패했어요. 다시 시도해주세요")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    mockDiagnose.mockResolvedValueOnce({ currentLevel: 500, weakParts: [], path: [] });
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() => expect(mockDiagnose).toHaveBeenCalledTimes(2));
  });

  it("AC-3[P0]: diagnose() 성공 시 duotrack.profile을 저장하고 /diagnose/result로 profile과 함께 이동한다", async () => {
    mockDiagnose.mockResolvedValueOnce({
      currentLevel: 620,
      weakParts: ["LC_Part2"],
      path: ["/learn/listening/part2"],
    });

    const DiagnoseQuiz = await importPage();
    renderWithRouter(
      React.createElement(DiagnoseQuiz),
      { initialEntries: [{ pathname: "/diagnose/quiz", state: routeState }] },
    );

    answerAllQuestions();
    fireEvent.click(screen.getByRole("button", { name: /진단 결과 보기/ }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));

    const [path, options] = mockNavigate.mock.calls[0];
    expect(path).toBe("/diagnose/result");
    const profile = (options as { state: { profile: Record<string, unknown> } }).state.profile;
    expect(profile.currentLevel).toBe(620);
    expect(profile.weakParts).toEqual(["LC_Part2"]);
    expect(profile.targetExam).toBe("TOEIC");

    const stored = JSON.parse(localStorage.getItem("duotrack.profile") ?? "null");
    expect(stored.currentLevel).toBe(620);
    expect(stored.weakParts).toEqual(["LC_Part2"]);
  });

  it("Edge: location.state 없이 접근해도 크래시하지 않는다", async () => {
    const DiagnoseQuiz = await importPage();
    expect(() =>
      renderWithRouter(
        React.createElement(DiagnoseQuiz),
        { initialEntries: ["/diagnose/quiz"] },
      ),
    ).not.toThrow();
    // 문항 자체는 여전히 렌더되어야 함(진행 상태 데이터가 없어도 화면 골격은 유지)
    expect(screen.getAllByTestId("quiz-question").length).toBeGreaterThan(0);
  });
});
