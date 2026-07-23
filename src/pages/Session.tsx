import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, AlertDialog, BottomSheet, Toast, Button } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SubmitFooter } from "@/components/BottomCTA";
import { MiniBar } from "@/components/MiniBar";
import { useAppStore } from "@/lib/store";
import { addSession } from "@/lib/storage";
import type { StudySession } from "@/lib/types";

const SESSION_SEC = 1500;

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * S6 학습 세션 화면 — `/session`
 * F2: 25분 포모도로. 세션 진행 중 광고 컴포넌트를 절대 렌더하지 않는다(AC-2).
 */
export default function Session() {
  const navigate = useNavigate();
  const { meta, profile, isSubscribed, updateMeta } = useAppStore();

  const freeLimitReached = !isSubscribed && meta.weeklyFreeSessionsUsed >= 3;

  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [remainingSec, setRemainingSec] = useState(SESSION_SEC);
  const [quitConfirmOpen, setQuitConfirmOpen] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [doneToast, setDoneToast] = useState(false);
  const startedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (phase !== "running") return;
    if (remainingSec <= 0) {
      completeSession();
      return;
    }
    const timer = setInterval(() => {
      setRemainingSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remainingSec]);

  function saveSession(session: StudySession) {
    const result = addSession(session);
    if (result && result.ok === false) {
      setErrorToast("저장 공간이 부족해요. 오래된 기록을 정리해주세요");
    }
  }

  function startSession() {
    startedAtRef.current = new Date().toISOString();
    setRemainingSec(SESSION_SEC);
    setPhase("running");
  }

  function completeSession() {
    saveSession({
      id: crypto.randomUUID(),
      startedAt: startedAtRef.current ?? new Date().toISOString(),
      durationSec: SESSION_SEC,
      focusPart: profile?.weakParts?.[0] ?? "LC_Part1",
      completed: true,
      problemsSolved: 0,
      correctCount: 0,
    });
    if (!isSubscribed) {
      updateMeta({ weeklyFreeSessionsUsed: meta.weeklyFreeSessionsUsed + 1 });
    }
    setPhase("done");
    setDoneToast(true);
  }

  function confirmQuit() {
    setQuitConfirmOpen(false);
    const elapsed = SESSION_SEC - remainingSec;
    saveSession({
      id: crypto.randomUUID(),
      startedAt: startedAtRef.current ?? new Date().toISOString(),
      durationSec: elapsed,
      focusPart: profile?.weakParts?.[0] ?? "LC_Part1",
      completed: false,
      problemsSolved: 0,
      correctCount: 0,
    });
    navigate("/home");
  }

  const progress = 1 - remainingSec / SESSION_SEC;

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>집중 세션</Top.TitleParagraph>} />}
      bottom={
        phase === "idle" ? (
          <SubmitFooter label="세션 시작" onClick={startSession} disabled={freeLimitReached} />
        ) : phase === "running" ? (
          <SubmitFooter label="그만두기" onClick={() => setQuitConfirmOpen(true)} />
        ) : (
          <SubmitFooter label="홈으로" onClick={() => navigate("/home")} />
        )
      }
    >
      {phase !== "running" && (
        <Card testId="session-intro">
          <Paragraph.Text typography="t3">
            {phase === "done" ? "25분 집중 완료!" : "25분 동안 광고 없이 몰입해요"}
          </Paragraph.Text>
        </Card>
      )}

      {phase === "running" && (
        <Card testId="session-timer">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0" }}>
            <Paragraph.Text typography="t1">{formatClock(remainingSec)}</Paragraph.Text>
            <Spacing size={16} />
            <MiniBar ratio={progress} testId="session-progress" />
          </div>
        </Card>
      )}

      <AlertDialog
        open={quitConfirmOpen}
        title="세션을 그만둘까요?"
        description="지금까지 진행한 시간은 미완주로 기록돼요"
        alertButton={<AlertDialog.AlertButton onClick={confirmQuit}>그만두기</AlertDialog.AlertButton>}
        onClose={() => setQuitConfirmOpen(false)}
      />

      <BottomSheet open={freeLimitReached && phase === "idle"} onClose={() => {}}>
        <Paragraph.Text typography="t4">이번 주 무료 세션을 모두 사용했어요. 구독하면 무제한이에요</Paragraph.Text>
        <Spacing size={16} />
        <Button variant="fill" display="block" onClick={() => navigate("/subscribe")}>
          구독하기
        </Button>
      </BottomSheet>

      <Toast open={doneToast} text="25분 집중 완료!" position="bottom" onClose={() => setDoneToast(false)} />
      <Toast
        open={!!errorToast}
        text={errorToast ?? ""}
        position="bottom"
        onClose={() => setErrorToast(null)}
      />
    </ScreenScaffold>
  );
}
