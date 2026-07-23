import React, { createContext, useContext } from "react";
import type { AppMeta, UserProfile } from "@/lib/types";

/**
 * 앱 상태 Context (Packet 0003)
 *
 * 마운트 시 storage에서 meta/profile을 로드(isLoading true→false),
 * isSubscribed 기반 canUseFeature 파생값, updateMeta 액션(storage.setMeta 동기 반영)을 제공.
 */

export type FeatureKey = "mock" | "report" | "unlimitedSession";

export interface AppStoreValue {
  meta: AppMeta;
  profile: UserProfile | null;
  isLoading: boolean;
  isSubscribed: boolean;
  canUseFeature: (feature: FeatureKey) => boolean;
  updateMeta: (patch: Partial<AppMeta>) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  // TODO: Implement — storage.getMeta()/getProfile() 로드 후 isLoading false, updateMeta는 storage.setMeta 동기 호출
  throw new Error("Not implemented");
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error("Not implemented");
  }
  return ctx;
}
