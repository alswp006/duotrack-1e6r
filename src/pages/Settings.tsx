import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ListRow, AlertDialog, Toast } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { useAppStore } from "@/lib/store";
import { getSessions, setItem } from "@/lib/storage";

function estimateStorageBytes(): number {
  let total = 0;
  for (const key in localStorage) {
    if (!Object.prototype.hasOwnProperty.call(localStorage, key)) continue;
    total += (localStorage.getItem(key) ?? "").length;
  }
  return total;
}

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

/**
 * S11 설정 화면 — `/settings`
 * F7 AC-5: 용량 경고 / F7 AC-6: 오래된 기록 정리
 */
export default function Settings() {
  const navigate = useNavigate();
  const { isSubscribed } = useAppStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const storageBytes = useMemo(() => estimateStorageBytes(), [toast]);
  const nearLimit = storageBytes > 4 * 1024 * 1024;

  function cleanupOldSessions() {
    const cutoff = Date.now() - SIX_MONTHS_MS;
    const sessions = getSessions();
    const kept = sessions.filter((s) => new Date(s.startedAt).getTime() >= cutoff);
    setItem("duotrack.sessions", kept);
    setConfirmOpen(false);
    setToast("오래된 기록을 정리했어요");
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>설정</Top.TitleParagraph>} />}>
      <Card>
        <ListRow
          onClick={() => navigate("/subscribe")}
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="구독 관리"
              bottom={isSubscribed ? "프리미엄 이용 중" : "무료 이용 중"}
            />
          }
        />
        <ListRow
          onClick={() => setConfirmOpen(true)}
          contents={<ListRow.Texts type="2RowTypeA" top="6개월 이전 기록 삭제" bottom="학습 세션 정리" />}
        />
      </Card>

      {nearLimit && (
        <>
          <Spacing size={16} />
          <Card testId="storage-warning">
            <Paragraph.Text typography="t6">저장 공간이 거의 찼어요. 오래된 기록을 정리하세요</Paragraph.Text>
          </Card>
        </>
      )}

      <AlertDialog
        open={confirmOpen}
        title="6개월 이전 기록을 삭제할까요?"
        description="삭제한 기록은 되돌릴 수 없어요"
        alertButton={<AlertDialog.AlertButton onClick={cleanupOldSessions}>삭제</AlertDialog.AlertButton>}
        onClose={() => setConfirmOpen(false)}
      />

      <Toast open={!!toast} text={toast ?? ""} position="bottom" onClose={() => setToast(null)} />
    </ScreenScaffold>
  );
}
