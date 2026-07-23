import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ChipItem, TextField, AlertDialog } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SubmitFooter } from "@/components/BottomCTA";
import { useAppStore } from "@/lib/store";
import type { RouteState, TargetExam } from "@/lib/types";

const EXAMS: TargetExam[] = ["TOEIC", "OPIC", "TEPS"];

function scoreRange(exam: TargetExam): { min: number; max: number } {
  return exam === "TEPS" ? { min: 10, max: 600 } : { min: 10, max: 990 };
}

/**
 * S2 진단 설정 화면 — `/diagnose`
 * F1 AC-1: AI 고지 AlertDialog(첫 진입시) / AC-2: 목표 설정 저장 / AC-5: 범위 초과 거부
 */
export default function DiagnoseSetup() {
  const navigate = useNavigate();
  const { meta, updateMeta } = useAppStore();

  const [targetExam, setTargetExam] = useState<TargetExam>("TOEIC");
  const [scoreInput, setScoreInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(!meta.aiNoticeAcknowledged);

  function acknowledgeNotice() {
    updateMeta({ aiNoticeAcknowledged: true });
    setNoticeOpen(false);
  }

  function handleStart() {
    const targetScore = Number(scoreInput);
    const { min, max } = scoreRange(targetExam);

    if (!scoreInput || Number.isNaN(targetScore)) {
      setError("목표 점수를 입력해주세요");
      return;
    }
    if (targetScore < min || targetScore > max) {
      setError(`목표 점수는 ${min}~${max} 사이여야 합니다`);
      return;
    }
    setError(null);
    navigate("/diagnose/quiz", {
      state: { targetExam, targetScore } as RouteState["/diagnose/quiz"],
    });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>목표 설정</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="진단 시작" onClick={handleStart} />}
    >
      <Card testId="diagnose-setup-card">
        <Paragraph.Text typography="t4">목표 시험</Paragraph.Text>
        <Spacing size={8} />
        <div style={{ display: "flex", gap: 8 }}>
          {EXAMS.map((exam) => (
            <ChipItem key={exam} selected={targetExam === exam} onClick={() => setTargetExam(exam)}>
              {exam}
            </ChipItem>
          ))}
        </div>
        <Spacing size={20} />
        <TextField
          variant="box"
          label="목표 점수"
          placeholder={`${scoreRange(targetExam).min}~${scoreRange(targetExam).max}`}
          inputMode="numeric"
          value={scoreInput}
          hasError={!!error}
          help={error ?? undefined}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScoreInput(e.target.value)}
        />
      </Card>

      <AlertDialog
        open={noticeOpen}
        title="AI 서비스 안내"
        description="이 서비스는 생성형 AI를 활용합니다"
        alertButton={
          <AlertDialog.AlertButton onClick={acknowledgeNotice}>확인</AlertDialog.AlertButton>
        }
        onClose={acknowledgeNotice}
      />
    </ScreenScaffold>
  );
}
