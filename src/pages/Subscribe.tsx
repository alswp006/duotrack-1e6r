import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Toast } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { TossPurchase } from "@/components/TossPurchase";
import { useAppStore } from "@/lib/store";

const IAP_SKU = (import.meta.env.VITE_TOSS_IAP_SKU as string | undefined) ?? "duotrack-premium-monthly";

/**
 * S10 구독 화면 — `/subscribe`
 * F6 AC-1: 구독 결제 성공 / AC-3: 결제 취소 처리
 */
export default function Subscribe() {
  const navigate = useNavigate();
  const { updateMeta } = useAppStore();
  const [toast, setToast] = useState<string | null>(null);

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>구독</Top.TitleParagraph>} />}>
      <Card testId="plan-free">
        <Paragraph.Text typography="t4">무료</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="t6">주 3회 세션 · 기본 진단</Paragraph.Text>
      </Card>

      <Spacing size={16} />

      <Card testId="plan-premium">
        <Paragraph.Text typography="t4">프리미엄 · 월 7,900원</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="t6">무제한 세션 · 모의시험 · ROI 리포트</Paragraph.Text>
        <Spacing size={16} />
        <TossPurchase
          sku={IAP_SKU}
          kind="subscription"
          processProductGrant={async () => true}
          onPurchased={() => {
            updateMeta({ isSubscribed: true });
            setToast("구독이 시작됐어요");
            navigate("/home");
          }}
          onError={() => setToast("결제가 취소됐어요")}
        >
          프리미엄 구독하기
        </TossPurchase>
      </Card>

      <Toast open={!!toast} text={toast ?? ""} position="bottom" onClose={() => setToast(null)} />
    </ScreenScaffold>
  );
}
