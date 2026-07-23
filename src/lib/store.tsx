import React, { createContext, useContext, useEffect, useState } from "react";
import type { AppMeta, UserProfile } from "@/lib/types";
import { getMeta, getProfile, setMeta, setProfile } from "@/lib/storage";

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
  updateProfile: (patch: Partial<UserProfile>) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [meta, setMetaState] = useState<AppMeta>(getMeta());
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.resolve().then(() => {
      setMetaState(getMeta());
      setProfileState(getProfile());
      setIsLoading(false);
    });
  }, []);

  const isSubscribed = meta.isSubscribed;

  const canUseFeature = (feature: FeatureKey): boolean => {
    if (isSubscribed) return true;
    return false;
  };

  const updateMeta = (patch: Partial<AppMeta>) => {
    setMetaState((prev) => {
      const next = { ...prev, ...patch };
      setMeta(next);
      return next;
    });
  };

  const updateProfile = (patch: Partial<UserProfile>) => {
    setProfileState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      setProfile(next);
      return next;
    });
  };

  const value: AppStoreValue = {
    meta,
    profile,
    isLoading,
    isSubscribed,
    canUseFeature,
    updateMeta,
    updateProfile,
  };

  return React.createElement(AppStoreContext.Provider, { value }, children);
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error("useAppStore must be used within AppStoreProvider");
  }
  return ctx;
}
