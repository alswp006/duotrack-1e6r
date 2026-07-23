import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Badge, Toast, Loader, Button } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SubmitFooter } from "@/components/BottomCTA";
import { TossRewardAd } from "@/components/TossRewardAd";
import { diagnose } from "@/lib/api";
import { setProfile } from "@/lib/storage";
import type { RouteState, UserProfile } from "@/lib/types";

interface QuizQuestion {
  id: string;
  text: string;
  choices: string[];
}

const QUESTIONS: QuizQuestion[] = [
  { id: "diag-1", text: "She has ___ working at this company for three years.", choices: ["be", "been", "being", "was"] },
  { id: "diag-2", text: "빈칸에 알맞은 표현: The meeting has been ___ to next Monday.", choices: ["postponed", "postpone", "postponing", "postponement"] },
  { id: "diag-3", text: "Please ___ the attached file before the deadline.", choices: ["review", "reviewing", "reviewed", "reviews"] },
  { id: "diag-4", text: "빈칸에 알맞은 전치사: The report is due ___ Friday afternoon.", choices: ["in", "on", "by", "at"] },
  { id: "diag-5", text: "Our sales figures ___ significantly over the last quarter.", choices: ["improve", "improved", "have improved", "improving"] },
  { id: "diag-6", text: "'reimburse'와 가장 가까운 의미는?", choices: ["환불하다", "요청하다", "발표하다", "예약하다"] },
  { id: "diag-7", text: "If the shipment arrives late, we ___ the customer immediately.", choices: ["notify", "will notify", "notified", "notifying"] },
  { id: "diag-8", text: "빈칸에 알맞은 표현: All employees are required to ___ the new policy.", choices: ["comply with", "comply to", "compliance", "complying"] },
  { id: "diag-9", text: "The new branch office ___ next month.", choices: ["opens", "opening", "open", "opened"] },
  { id: "diag-10", text: "'in charge of'의 의미로 가장 가까운 것은?", choices: ["~을 담당하는", "~에 반대하는", "~을 대신하는", "~을 취소하는"] },
];

type Phase = "answering" | "gate" | "loading" | "error";

function fireHapticTickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

export default function DiagnoseQuiz() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = (location.state as RouteState["/diagnose/quiz"]) ?? null;
  const targetExam = routeState?.targetExam ?? "TOEIC";
  const targetScore = routeState?.targetScore ?? 0;

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [phase, setPhase] = useState<Phase>("answering");
  const [toastOpen, setToastOpen] = useState(false);

  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    if (!toastOpen) return;
    const timer = setTimeout(() => setToastOpen(false), 2400);
    return () => clearTimeout(timer);
  }, [toastOpen]);

  function selectAnswer(questionIndex: number, choiceIndex: number) {
    fireHapticTickWeak();
    setAnswers((prev) => ({ ...prev, [questionIndex]: choiceIndex }));
  }

  function handleSubmitClick() {
    if (answeredCount < QUESTIONS.length) {
      setToastOpen(true);
      return;
    }
    setPhase("gate");
  }

  async function runDiagnose() {
    setPhase("loading");
    const result = await diagnose({
      exam: targetExam,
      answers: QUESTIONS.map((q, i) => ({ questionId: q.id, selectedIndex: answers[i] })),
    });

    if ("error" in result) {
      setPhase("error");
      return;
    }

    const profile: UserProfile = {
      targetExam,
      targetScore,
      currentLevel: result.currentLevel,
      diagnosedAt: new Date().toISOString(),
      weakParts: result.weakParts,
      createdAt: new Date().toISOString(),
    };
    setProfile(profile);
    navigate("/diagnose/result", { state: { profile } as RouteState["/diagnose/result"] });
  }

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>실력 진단</Top.TitleParagraph>}
          right={
            <Badge size="medium" variant="fill" color="blue">
              {answeredCount}/{QUESTIONS.length}
            </Badge>
          }
        />
      }
      bottom={
        phase === "answering" || phase === "loading" ? (
          <SubmitFooter
            label="진단 결과 보기"
            onClick={handleSubmitClick}
            disabled={phase === "loading"}
          />
        ) : undefined
      }
    >
      {phase === "error" && (
        <Card testId="quiz-error">
          <Paragraph.Text typography="t4">진단에 실패했어요. 다시 시도해주세요</Paragraph.Text>
          <Button variant="fill" display="block" onClick={runDiagnose}>
            다시 시도
          </Button>
        </Card>
      )}

      {phase === "loading" && (
        <Card testId="quiz-loading">
          <Loader />
          <Paragraph.Text typography="t5">AI가 실력을 분석하고 있어요</Paragraph.Text>
        </Card>
      )}

      {phase === "gate" && (
        <TossRewardAd slotId="diagnose-result" onReward={runDiagnose}>
          {null}
        </TossRewardAd>
      )}

      {phase === "answering" &&
        QUESTIONS.map((question, questionIndex) => (
          <div key={question.id}>
            <Card testId="quiz-question">
              <Paragraph.Text typography="t3">{question.text}</Paragraph.Text>
              <div
                data-testid={`quiz-choice-${questionIndex}`}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                {question.choices.map((choice, choiceIndex) => (
                  <label key={choiceIndex} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="radio"
                      name={`question-${questionIndex}`}
                      checked={answers[questionIndex] === choiceIndex}
                      onChange={() => selectAnswer(questionIndex, choiceIndex)}
                    />
                    <Paragraph.Text typography="t6">{choice}</Paragraph.Text>
                  </label>
                ))}
              </div>
            </Card>
          </div>
        ))}

      <Toast open={toastOpen} text="모든 문항에 답해주세요" position="bottom" onClose={() => setToastOpen(false)} />
    </ScreenScaffold>
  );
}
