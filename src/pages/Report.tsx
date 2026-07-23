import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Button, Asset } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SummaryHero } from "@/components/SummaryHero";
import { CountUp } from "@/components/CountUp";
import { MiniBar } from "@/components/MiniBar";
import { Sparkline } from "@/components/Sparkline";
import { EmptyState } from "@/components/StateView";
import { useAppStore } from "@/lib/store";
import { getSessions, getExams } from "@/lib/storage";

/**
 * S9 ROI 리포트 화면 — `/report`
 * F5: 시간당 효율 / 목표 진척도 / 예측 정확도. 비구독자는 블러 미리보기(AC-1).
 */
export default function Report() {
  const navigate = useNavigate();
  const { profile, isSubscribed } = useAppStore();

  const sessions = useMemo(() => getSessions(), []);
  const exams = useMemo(() => getExams(), []);

  const totalHours = sessions.reduce((sum, s) => sum + s.durationSec, 0) / 3600;
  const baseline = profile?.currentLevel ?? 0;
  const targetScore = profile?.targetScore ?? 0;

  const sortedExams = useMemo(
    () => exams.slice().sort((a, b) => a.takenAt.localeCompare(b.takenAt)),
    [exams],
  );
  const realExams = sortedExams.filter((e) => e.type === "REAL");
  const mockExams = sortedExams.filter((e) => e.type === "MOCK");
  const latestReal = realExams[realExams.length - 1];
  const latestMock = mockExams[mockExams.length - 1];
  const latestScore = latestReal?.score ?? baseline;

  const hasData = sessions.length > 0 && exams.length > 0;
  const efficiency = totalHours > 0 ? (latestScore - baseline) / totalHours : null;
  const progressRatio =
    targetScore > baseline ? Math.min(1, Math.max(0, (latestScore - baseline) / (targetScore - baseline))) : 0;
  const predictionError =
    latestMock && latestReal ? Math.abs(latestMock.score - latestReal.score) : null;

  if (!isSubscribed) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>ROI 리포트</Top.TitleParagraph>} />}>
        <Card testId="report-gate">
          <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
            <Paragraph.Text typography="t1">8.0점/시간</Paragraph.Text>
            <Spacing size={8} />
            <Paragraph.Text typography="t4">진척도 88.9%</Paragraph.Text>
          </div>
          <Spacing size={20} />
          <Button variant="fill" display="block" onClick={() => navigate("/subscribe")}>
            구독하고 전체 리포트 보기
          </Button>
        </Card>
      </ScreenScaffold>
    );
  }

  if (!hasData) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>ROI 리포트</Top.TitleParagraph>} />}>
        <EmptyState
          icon={<Asset.ContentIcon name="empty" alt="빈 상태" />}
          title="리포트를 만들 데이터가 아직 없어요"
          testId="report-empty"
        />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>ROI 리포트</Top.TitleParagraph>} />}>
      <SummaryHero
        testId="roi-hero"
        label="시간당 효율"
        value={
          efficiency === null ? (
            <Paragraph.Text typography="t1">—</Paragraph.Text>
          ) : (
            <CountUp value={Math.round(efficiency * 10) / 10} unit="점/시간" typography="t1" />
          )
        }
        caption={`누적 학습 ${totalHours.toFixed(1)}시간`}
      />

      <Spacing size={24} />

      <Card testId="roi-card">
        <Paragraph.Text typography="t4">목표 진척도</Paragraph.Text>
        <Spacing size={8} />
        <MiniBar ratio={progressRatio} testId="roi-progress" />
        <Spacing size={4} />
        <Paragraph.Text typography="t6">{Math.round(progressRatio * 100)}%</Paragraph.Text>
      </Card>

      <Spacing size={16} />

      <Card testId="roi-card">
        <Paragraph.Text typography="t4">예측 정확도</Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="t6">
          {predictionError === null ? "모의·실제 점수가 더 필요해요" : `오차 ±${predictionError}점`}
        </Paragraph.Text>
      </Card>

      <Spacing size={16} />

      <Card testId="roi-card">
        <Paragraph.Text typography="t4">점수 추이</Paragraph.Text>
        <Spacing size={8} />
        <Sparkline data={sortedExams.map((e) => e.score)} testId="roi-sparkline" />
      </Card>

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
