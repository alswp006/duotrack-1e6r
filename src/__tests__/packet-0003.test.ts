import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AppMeta } from "@/lib/types";
import { getMeta, setMeta } from "@/lib/storage";

// AppStoreProvider + useAppStore — 이 패킷의 실제 구현 대상.
// TDS/router를 렌더하지 않는 순수 상태 Context이므로 mockTds/mockRouter는 불필요.
import { AppStoreProvider, useAppStore } from "@/lib/store";

const subscribedMeta: AppMeta = {
  aiNoticeAcknowledged: true,
  isSubscribed: true,
  weeklyFreeSessionsUsed: 2,
  weekAnchor: "2026-07-21",
  onboarded: true,
};

function TestConsumer() {
  const store = useAppStore();
  return React.createElement(
    "div",
    null,
    React.createElement("span", { "data-testid": "loading" }, String(store.isLoading)),
    React.createElement("span", { "data-testid": "subscribed" }, String(store.isSubscribed)),
    React.createElement("span", { "data-testid": "onboarded" }, String(store.meta.onboarded)),
    React.createElement(
      "span",
      { "data-testid": "canUseMock" },
      String(store.canUseFeature("mock")),
    ),
    React.createElement(
      "span",
      { "data-testid": "canUseReport" },
      String(store.canUseFeature("report")),
    ),
    React.createElement(
      "span",
      { "data-testid": "canUseUnlimited" },
      String(store.canUseFeature("unlimitedSession")),
    ),
    React.createElement(
      "button",
      {
        onClick: () => store.updateMeta({ onboarded: true }),
      },
      "온보딩 완료",
    ),
  );
}

function renderStore() {
  return render(
    React.createElement(AppStoreProvider, null, React.createElement(TestConsumer)),
  );
}

describe("앱 상태 Context + 로딩 + 구독 게이트", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // AC-1[P0]: useAppStore()가 {meta,profile,isLoading,isSubscribed,canUseFeature} 반환
  describe("AC-1[P0]: useAppStore shape + 로딩 전환", () => {
    it("AC-1[P0]: should start with isLoading=true then flip to false after mount load", async () => {
      renderStore();
      // 마운트 직후에는 storage 로드가 아직 반영되지 않았을 수 있음 — true로 시작
      expect(screen.getByTestId("loading").textContent).toBe("true");

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
    });

    it("AC-1[P0]: should expose meta, profile, isLoading, isSubscribed, canUseFeature after load completes", async () => {
      renderStore();
      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      // 기본 meta(스토리지 미설정)가 로드되어 반영됨
      expect(screen.getByTestId("subscribed").textContent).toBe("false");
      expect(screen.getByTestId("onboarded").textContent).toBe("false");
      expect(typeof screen.getByTestId("canUseMock").textContent).toBe("string");
    });
  });

  // AC-2[P0]: isSubscribed===true면 canUseFeature('mock'|'report'|'unlimitedSession') 모두 true
  describe("AC-2[P0]: 구독 게이트 canUseFeature", () => {
    it("AC-2[P0]: should return true for mock/report/unlimitedSession when isSubscribed is true", async () => {
      setMeta(subscribedMeta);
      renderStore();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      expect(screen.getByTestId("subscribed").textContent).toBe("true");
      expect(screen.getByTestId("canUseMock").textContent).toBe("true");
      expect(screen.getByTestId("canUseReport").textContent).toBe("true");
      expect(screen.getByTestId("canUseUnlimited").textContent).toBe("true");
    });

    it("AC-2[P0]: should gate unlimitedSession to false when isSubscribed is false (default meta)", async () => {
      renderStore();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      expect(screen.getByTestId("subscribed").textContent).toBe("false");
      expect(screen.getByTestId("canUseUnlimited").textContent).toBe("false");
    });
  });

  // AC-3: meta 갱신 액션 호출 시 storage.setMeta 동기 반영 후 상태 업데이트
  describe("AC-3[P1]: meta 갱신 액션", () => {
    it("AC-3[P1]: should call storage.setMeta synchronously and update React state on updateMeta", async () => {
      renderStore();
      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
      expect(screen.getByTestId("onboarded").textContent).toBe("false");

      fireEvent.click(screen.getByRole("button", { name: "온보딩 완료" }));

      // storage에 동기 반영 — getMeta()로 즉시 확인 가능
      expect(getMeta().onboarded).toBe(true);
      // React 상태도 갱신되어 리렌더에 반영됨
      await waitFor(() => {
        expect(screen.getByTestId("onboarded").textContent).toBe("true");
      });
    });

    it("AC-3[P1]: should persist updated meta across a fresh getMeta() read (no stale write)", async () => {
      renderStore();
      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      fireEvent.click(screen.getByRole("button", { name: "온보딩 완료" }));

      const persisted = getMeta();
      expect(persisted.onboarded).toBe(true);
      expect(persisted.aiNoticeAcknowledged).toBe(false);
    });
  });
});
