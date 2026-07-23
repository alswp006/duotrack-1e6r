import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Button, ListRow } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { Card } from "@/components/Card";
import { Amount } from "@/components/Amount";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { useAppStore } from "@/lib/store";
import { getSessions } from "@/lib/storage";
import { maybeResetWeek, computeWeakParts } from "@/lib/integrity";
import type { StudySession } from "@/lib/types";

const TABS = [
  { label: "홈", path: "/home" },
  { label: "문제", path: "/problems" },
  { label: "리포트", path: "/report" },
  { label: "설정", path: "/settings" },
];

/**
 * S5 홈 대시보드 — `/home`
 * F7 AC-1: 주간 카운터 리셋(앱 진입 시).
 */
export default function Home() {
  const navigate = useNavigate();
  const { meta, profile, isLoading, updateMeta, updateProfile, isSubscribed } = useAppStore();
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    if (isLoading) return;
    const resetMeta = maybeResetWeek(meta, new Date());
    if (resetMeta.weekAnchor !== meta.weekAnchor) {
      updateMeta({ weeklyFreeSessionsUsed: resetMeta.weeklyFreeSessionsUsed, weekAnchor: resetMeta.weekAnchor });
    }
    const loadedSessions = getSessions();
    setSessions(loadedSessions);

    // F4 AC-1: 취약 파트 자동 계산 — 세션 5건 이상이면 최저 정답률 파트를 weakParts[0]로 갱신
    if (profile) {
      const weakParts = computeWeakParts(loadedSessions);
      if (weakParts && weakParts[0] !== profile.weakParts[0]) {
        updateProfile({ weakParts });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const weeklyCompleted = useMemo(
    () => sessions.filter((s) => s.completed).length,
    [sessions],
  );

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>DuoTrack</Top.TitleParagraph>} />}>
      {profile ? (
        <SummaryHero
          testId="home-summary"
          label="현재 실력"
          value={<Amount value={profile.currentLevel} unit="점" typography="t1" />}
          caption={`목표 ${profile.targetExam} ${profile.targetScore}점까지`}
          action={
            <Button variant="fill" display="block" onClick={() => navigate("/session")}>
              오늘 세션 시작
            </Button>
          }
        />
      ) : (
        <SummaryHero
          testId="home-summary"
          label="실력 진단이 필요해요"
          value={<Paragraph.Text typography="t2">진단하고 맞춤 학습 경로 받기</Paragraph.Text>}
          caption={isSubscribed ? "구독 중" : `이번 주 무료 세션 ${meta.weeklyFreeSessionsUsed}/3회 사용`}
          action={
            <Button variant="fill" display="block" onClick={() => navigate("/diagnose")}>
              실력 진단 시작
            </Button>
          }
        />
      )}

      <Spacing size={24} />

      <Card>
        <Paragraph.Text typography="t4">최근 활동</Paragraph.Text>
        <Spacing size={8} />
        <ListRow
          onClick={() => navigate("/exams")}
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="시험 점수 기록"
              bottom={`완료한 세션 ${weeklyCompleted}건`}
            />
          }
        />
        <ListRow
          onClick={() => navigate("/report")}
          contents={<ListRow.Texts type="2RowTypeA" top="ROI 리포트" bottom="학습 효율 확인하기" />}
        />
      </Card>

      <Spacing size={24} />

      <FloatingTabBar items={TABS} />
    </ScreenScaffold>
  );
}
