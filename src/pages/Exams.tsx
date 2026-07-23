import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ChipItem, TextField, ListRow, Toast, BottomSheet, Button, Asset } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SubmitFooter } from "@/components/BottomCTA";
import { EmptyState } from "@/components/StateView";
import { useAppStore } from "@/lib/store";
import { getExams, addExam } from "@/lib/storage";
import type { MockExamResult, TargetExam } from "@/lib/types";

const EXAMS: TargetExam[] = ["TOEIC", "OPIC", "TEPS"];
const today = () => new Date().toISOString().slice(0, 10);

/**
 * S7 점수 입력/목록 화면 — `/exams`
 * F3 AC-1: 실제 점수 저장 / AC-4: 모의시험 유료 게이트 / AC-6: 숫자 키보드
 */
export default function Exams() {
  const navigate = useNavigate();
  const { isSubscribed } = useAppStore();

  const [exam, setExam] = useState<TargetExam>("TOEIC");
  const [score, setScore] = useState("");
  const [lc, setLc] = useState("");
  const [rc, setRc] = useState("");
  const [takenAt, setTakenAt] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mockGateOpen, setMockGateOpen] = useState(false);
  const [exams, setExams] = useState<MockExamResult[]>(() => getExams());

  function handleSubmit() {
    const scoreNum = Number(score);
    if (!score || scoreNum <= 0) {
      setError("점수를 입력해주세요");
      return;
    }
    if (takenAt > today()) {
      setError("응시일은 오늘 이전이어야 해요");
      return;
    }
    const partScores: Record<string, number> = {};
    if (lc) partScores.LC = Number(lc);
    if (rc) partScores.RC = Number(rc);
    const partSum = Object.values(partScores).reduce((a, b) => a + b, 0);
    if (Object.keys(partScores).length > 0 && partSum !== scoreNum) {
      setError("파트 점수 합이 총점과 일치하지 않아요");
      return;
    }

    setError(null);
    const record: MockExamResult = {
      id: crypto.randomUUID(),
      type: "REAL",
      exam,
      score: scoreNum,
      takenAt,
      partScores,
    };
    addExam(record);
    setExams(getExams());
    setScore("");
    setLc("");
    setRc("");
    setToast("점수가 기록됐어요");
  }

  function handleMockStart() {
    if (!isSubscribed) {
      setMockGateOpen(true);
      return;
    }
    navigate("/problems", { state: { mode: "mock" } });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>점수 기록</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="점수 저장" onClick={handleSubmit} />}
    >
      <Card testId="exam-form-card">
        <Paragraph.Text typography="t4">시험 종류</Paragraph.Text>
        <Spacing size={8} />
        <div style={{ display: "flex", gap: 8 }}>
          {EXAMS.map((e) => (
            <ChipItem key={e} selected={exam === e} onClick={() => setExam(e)}>
              {e}
            </ChipItem>
          ))}
        </div>
        <Spacing size={16} />
        <TextField
          variant="box"
          label="총점"
          placeholder="예: 780"
          inputMode="numeric"
          value={score}
          hasError={!!error}
          help={error ?? undefined}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScore(e.target.value)}
        />
        <Spacing size={12} />
        <div style={{ display: "flex", gap: 8 }}>
          <TextField
            variant="box"
            label="LC"
            placeholder="예: 400"
            inputMode="numeric"
            value={lc}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLc(e.target.value)}
          />
          <TextField
            variant="box"
            label="RC"
            placeholder="예: 380"
            inputMode="numeric"
            value={rc}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRc(e.target.value)}
          />
        </div>
        <Spacing size={12} />
        <TextField
          variant="box"
          label="응시일"
          placeholder="YYYY-MM-DD"
          value={takenAt}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTakenAt(e.target.value)}
        />
      </Card>

      <Spacing size={16} />
      <Button variant="weak" display="block" onClick={handleMockStart}>
        모의시험 시작
      </Button>

      <Spacing size={24} />

      {exams.length === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="empty" alt="빈 상태" />}
          title="아직 기록된 점수가 없어요"
          description="첫 점수를 입력해보세요"
          testId="exams-empty"
        />
      ) : (
        <Card testId="exam-history-card">
          {exams
            .slice()
            .reverse()
            .map((e) => (
              <ListRow
                key={e.id}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={`${e.exam} ${e.score}점 (${e.type === "MOCK" ? "모의" : "실제"})`}
                    bottom={e.takenAt}
                  />
                }
              />
            ))}
        </Card>
      )}

      <BottomSheet open={mockGateOpen} onClose={() => setMockGateOpen(false)}>
        <Paragraph.Text typography="t4">모의시험은 구독 전용 기능이에요</Paragraph.Text>
        <Spacing size={16} />
        <Button variant="fill" display="block" onClick={() => navigate("/subscribe")}>
          구독하기
        </Button>
      </BottomSheet>

      <Toast open={!!toast} text={toast ?? ""} position="bottom" onClose={() => setToast(null)} />
    </ScreenScaffold>
  );
}
