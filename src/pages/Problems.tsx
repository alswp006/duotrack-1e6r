import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Top, Paragraph, Spacing, Button, Loader } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SubmitFooter } from "@/components/BottomCTA";
import { generateProblems } from "@/lib/api";
import { addProblem } from "@/lib/storage";
import { useAppStore } from "@/lib/store";
import { TossRewardAd } from "@/components/TossRewardAd";
import type { GeneratedProblem, RouteState } from "@/lib/types";

type Phase = "idle" | "loading" | "gate" | "success" | "error";

function fireHapticTickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

export default function Problems() {
  const location = useLocation();
  const routeState = (location.state as RouteState["/problems"]) ?? null;
  const { profile } = useAppStore();
  const part = profile?.weakParts?.[0] ?? "LC_Part1";
  const count = routeState?.mode === "mock" ? 10 : 5;

  const [phase, setPhase] = useState<Phase>("idle");
  const [problems, setProblems] = useState<GeneratedProblem[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  async function handleGenerate() {
    setPhase("loading");
    const result = await generateProblems({ part, count });

    if ("error" in result) {
      setPhase("error");
      return;
    }

    const generatedAt = new Date().toISOString();
    const withTimestamps: GeneratedProblem[] = result.problems.map((problem) => ({
      ...problem,
      generatedAt,
    }));
    withTimestamps.forEach((problem) => addProblem(problem));

    setProblems(withTimestamps);
    setSelected({});
    setRevealed({});
    // F4 AC-2: 결과 보기 전 보상형 광고 게이트 — 저장은 즉시, 노출만 광고 시청 후.
    setPhase("gate");
  }

  function selectChoice(problemIndex: number, choiceIndex: number) {
    fireHapticTickWeak();
    setSelected((prev) => ({ ...prev, [problemIndex]: choiceIndex }));
  }

  function toggleReveal(problemIndex: number) {
    setRevealed((prev) => ({ ...prev, [problemIndex]: !prev[problemIndex] }));
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>취약 파트 문제</Top.TitleParagraph>} />}
      bottom={
        phase === "idle" || phase === "loading" ? (
          <SubmitFooter label="문제 생성" onClick={handleGenerate} disabled={phase === "loading"} />
        ) : undefined
      }
    >
      {phase === "loading" && (
        <Card testId="problems-loading">
          <Loader />
          <Paragraph.Text typography="t5">AI가 문제를 만들고 있어요</Paragraph.Text>
        </Card>
      )}

      {phase === "error" && (
        <Card testId="problems-error">
          <Paragraph.Text typography="t4">문제 생성에 실패했어요. 다시 시도해주세요</Paragraph.Text>
          <Spacing size={12} />
          <Button variant="fill" display="block" onClick={handleGenerate}>
            다시 시도
          </Button>
        </Card>
      )}

      {phase === "gate" && (
        <TossRewardAd slotId="problems-result" onReward={() => setPhase("success")}>
          {null}
        </TossRewardAd>
      )}

      {phase === "success" && (
        <>
          <div
            data-testid="ai-badge"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              backgroundColor: "var(--tds-color-grey50)",
            }}
          >
            <Paragraph.Text typography="st13">AI가 생성한 결과입니다</Paragraph.Text>
          </div>
          <Spacing size={16} />
          {problems.map((problem, problemIndex) => {
            const isSelected = selected[problemIndex] !== undefined;
            const isRevealed = revealed[problemIndex] === true;
            const isCorrect = selected[problemIndex] === problem.answerIndex;

            return (
              <div key={problem.id}>
                <Card testId="problem-question">
                  <Paragraph.Text typography="t3">{problem.question}</Paragraph.Text>
                  <Spacing size={12} />
                  <div
                    data-testid={`problem-choice-${problemIndex}`}
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {problem.choices.map((choice, choiceIndex) => (
                      <label key={choiceIndex} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="radio"
                          name={`problem-${problemIndex}`}
                          checked={selected[problemIndex] === choiceIndex}
                          onChange={() => selectChoice(problemIndex, choiceIndex)}
                        />
                        <Paragraph.Text typography="t6">{choice}</Paragraph.Text>
                      </label>
                    ))}
                  </div>
                  <Spacing size={12} />
                  <Button
                    variant="weak"
                    display="block"
                    disabled={!isSelected}
                    onClick={() => toggleReveal(problemIndex)}
                  >
                    {isRevealed ? "다음 문제" : "해설 보기"}
                  </Button>
                  {isRevealed && (
                    <>
                      <Spacing size={8} />
                      <Paragraph.Text typography="t6">
                        {isCorrect ? "정답이에요" : `오답이에요. 정답: ${problem.choices[problem.answerIndex]}`}
                      </Paragraph.Text>
                      <Paragraph.Text typography="st13">{problem.explanation}</Paragraph.Text>
                    </>
                  )}
                </Card>
                <Spacing size={12} />
              </div>
            );
          })}
        </>
      )}
    </ScreenScaffold>
  );
}
