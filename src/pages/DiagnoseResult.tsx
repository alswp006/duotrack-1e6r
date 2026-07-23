import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ChipItem } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SummaryHero } from "@/components/SummaryHero";
import { SubmitFooter } from "@/components/BottomCTA";
import { CountUp } from "@/components/CountUp";
import type { RouteState } from "@/lib/types";

/**
 * S4 진단 결과 화면 — `/diagnose/result`
 * F1 AC-4: AI 결과물 라벨 표시. state.profile 없으면 /home 리다이렉트.
 */
export default function DiagnoseResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const profile = (location.state as RouteState["/diagnose/result"] | null)?.profile ?? null;

  useEffect(() => {
    if (!profile) {
      navigate("/home", { replace: true });
    }
  }, [profile, navigate]);

  if (!profile) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>진단 결과</Top.TitleParagraph>} />}>
        {null}
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>진단 결과</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="홈으로" onClick={() => navigate("/home")} />}
    >
      <SummaryHero
        testId="diagnose-hero"
        label="현재 실력"
        value={<CountUp value={profile.currentLevel} unit="점" typography="t1" />}
        caption={`목표 ${profile.targetExam} ${profile.targetScore}점`}
      />

      <Spacing size={24} />

      <Card testId="diagnose-weak-parts">
        <Paragraph.Text typography="t4">취약 파트</Paragraph.Text>
        <Spacing size={8} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {profile.weakParts.length > 0 ? (
            profile.weakParts.map((part) => (
              <ChipItem key={part} selected>
                {part}
              </ChipItem>
            ))
          ) : (
            <Paragraph.Text typography="t6">취약 파트가 발견되지 않았어요</Paragraph.Text>
          )}
        </div>
      </Card>

      <Spacing size={24} />

      <div data-testid="ai-badge">
        <Paragraph.Text typography="st13">AI가 생성한 결과입니다</Paragraph.Text>
      </div>
    </ScreenScaffold>
  );
}
