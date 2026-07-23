import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SubmitFooter } from "@/components/BottomCTA";
import { useAppStore } from "@/lib/store";

/**
 * S1 온보딩 화면 — `/`
 * onboarded === true면 홈으로 바로 리다이렉트, 아니면 앱 소개 + 시작 CTA.
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const { meta, isLoading, updateMeta } = useAppStore();

  useEffect(() => {
    if (!isLoading && meta.onboarded) {
      navigate("/home", { replace: true });
    }
  }, [isLoading, meta.onboarded, navigate]);

  if (isLoading || meta.onboarded) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>DuoTrack</Top.TitleParagraph>} />}>
        {null}
      </ScreenScaffold>
    );
  }

  function handleStart() {
    updateMeta({ onboarded: true });
    navigate("/diagnose");
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>DuoTrack</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="시작하기" onClick={handleStart} />}
    >
      <Card testId="onboarding-intro">
        <Paragraph.Text typography="t2">광고 없는 집중 학습으로 점수를 증명하세요</Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="t6">
          25분 몰입 세션과 실제 시험 점수를 연결해 시간당 점수 향상 효율을 보여드려요.
        </Paragraph.Text>
      </Card>
    </ScreenScaffold>
  );
}
