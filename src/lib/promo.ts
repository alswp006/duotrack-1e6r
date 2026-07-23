import type { AppMeta } from "@/lib/types";

interface PromoResult {
  granted: boolean;
  message?: string;
}

// F6 AC-4, AC-5, AC-6: 프로모션 리워드 지급 (클램프 min(3000,5000), 중복방지)
export async function grantPromo(
  amount: number,
  meta: AppMeta
): Promise<PromoResult> {
  throw new Error("grantPromo not implemented");
}
