import type { AppMeta } from "@/lib/types";
import { grantPromotionReward } from "@apps-in-toss/web-framework";

interface PromoResult {
  granted: boolean;
  message?: string;
}

const PROMOTION_CODE = "DUOTRACK_SIGNUP";
const PROMO_AMOUNT_LIMIT = 5000;

// F6 AC-4, AC-5, AC-6: 프로모션 리워드 지급 (클램프 min(3000,5000), 중복방지)
export async function grantPromo(
  amount: number,
  meta: AppMeta
): Promise<PromoResult> {
  if (meta.promoGrantedAt) {
    return { granted: false, message: "이미 리워드를 받으셨어요" };
  }

  const clampedAmount = Math.min(amount, PROMO_AMOUNT_LIMIT);

  try {
    // SDK 타입 선언은 { params: { promotionCode, amount } } 중첩을 요구하지만,
    // 검증된 런타임 API(.ai-factory/apps-in-toss-essential.txt)는 평탄한 인자를 받는다.
    await grantPromotionReward(
      { promotionCode: PROMOTION_CODE, amount: clampedAmount } as unknown as Parameters<
        typeof grantPromotionReward
      >[0]
    );
    return { granted: true };
  } catch {
    return { granted: false, message: "리워드 지급에 실패했어요" };
  }
}
