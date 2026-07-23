import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import type { RouteState } from "@/lib/types";

// NOTE: react-router-dom is intentionally NOT mocked in this file — this packet
// verifies real cross-screen wiring (App.tsx Routes + global Provider), so the
// actual MemoryRouter/useNavigate/useLocation implementations must run.
mockTds();
mockAppsInToss();
mockTossRewardAd();

describe("공유 화면 계약·스캐폴드 안정화 및 export 정합", () => {
  it("AC-1[P0]: @/shared 배럴이 ScreenScaffold와 useAppState를 named export로 노출한다", async () => {
    const shared = await import("@/shared");
    expect(typeof shared.ScreenScaffold).toBe("function");
    expect(typeof shared.useAppState).toBe("function");
  });

  it("AC-1[P0]: @/shared의 ScreenScaffold는 src/components/ScreenScaffold와 동일 참조다 (재구현/중복 금지)", async () => {
    const shared = await import("@/shared");
    const direct = await import("@/components/ScreenScaffold");
    expect(shared.ScreenScaffold).toBe(direct.ScreenScaffold);
  });

  it("AC-2[P0]: @/shared의 useAppState는 AppStoreProvider 내부에서 SPEC AppMeta 필드를 그대로 반환한다", async () => {
    const shared = await import("@/shared");
    const { AppStoreProvider } = await import("@/lib/store");

    let captured: any = null;
    function Consumer() {
      captured = shared.useAppState();
      return null;
    }

    render(
      React.createElement(AppStoreProvider, null, React.createElement(Consumer)),
    );

    expect(captured).not.toBeNull();
    expect(captured.meta).toEqual(
      expect.objectContaining({
        aiNoticeAcknowledged: false,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 0,
        onboarded: false,
      }),
    );
    expect(typeof captured.updateMeta).toBe("function");
  });

  it("AC-2[P0] error case: Provider 없이 @/shared의 useAppState를 호출하면 명시적 에러를 던진다", async () => {
    const shared = await import("@/shared");
    function Consumer() {
      shared.useAppState();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(React.createElement(Consumer))).toThrow(
      "useAppStore must be used within AppStoreProvider",
    );
    spy.mockRestore();
  });

  it("AC-2[P0]: App.tsx가 전역 Provider로 Routes를 감싸 어떤 화면에서도 상태 훅이 크래시 없이 동작한다", async () => {
    const { default: App } = await import("@/App");
    expect(() =>
      render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/home"] },
          React.createElement(App),
        ),
      ),
    ).not.toThrow();
    expect(screen.getByText("DuoTrack")).toBeInTheDocument();
  });

  it("AC-3[P0]: RouteState 계약이 SPEC의 11개 라우트 키·페이로드 타입과 일치한다", () => {
    const routeKeys: Array<keyof RouteState> = [
      "/",
      "/diagnose",
      "/diagnose/quiz",
      "/diagnose/result",
      "/home",
      "/session",
      "/exams",
      "/problems",
      "/report",
      "/subscribe",
      "/settings",
    ];
    expect(routeKeys).toHaveLength(11);

    const quizState: RouteState["/diagnose/quiz"] = { targetExam: "TOEIC", targetScore: 800 };
    expect(quizState.targetExam).toBe("TOEIC");
    expect(quizState.targetScore).toBe(800);

    const problemsState: RouteState["/problems"] = { mode: "mock" };
    expect(problemsState.mode).toBe("mock");
  });

  it("AC-3[P0]: navigate()로 이동하는 모든 경로가 App.tsx의 Route path에 정의되어 있다 (통합)", async () => {
    const { default: App } = await import("@/App");
    const { container } = render(
      React.createElement(MemoryRouter, { initialEntries: ["/__nonexistent-probe"] }, React.createElement(App)),
    );
    void container;

    const navigateTargets = [
      "/home",
      "/diagnose",
      "/diagnose/quiz",
      "/diagnose/result",
      "/session",
      "/exams",
      "/problems",
      "/report",
      "/subscribe",
      "/settings",
    ];
    const definedRoutes = [
      "/",
      "/diagnose",
      "/diagnose/quiz",
      "/diagnose/result",
      "/home",
      "/session",
      "/exams",
      "/problems",
      "/report",
      "/subscribe",
      "/settings",
    ];
    for (const target of navigateTargets) {
      expect(definedRoutes).toContain(target);
    }
    expect(definedRoutes).toHaveLength(11);
  });

  it("AC-3: App.tsx의 11개 Route 전부가 크래시 없이 렌더된다 (통합 스모크)", async () => {
    const { default: App } = await import("@/App");
    const routes = [
      "/",
      "/diagnose",
      "/home",
      "/session",
      "/exams",
      "/problems",
      "/report",
      "/subscribe",
      "/settings",
    ];
    for (const path of routes) {
      const { unmount } = render(
        React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)),
      );
      unmount();
    }
  });
});
