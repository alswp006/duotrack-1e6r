import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { maybeResetWeek } from "@/lib/integrity";

// NOTE: react-router-dom is intentionally NOT mocked — this packet verifies
// real route-guard/redirect wiring (onboarded flag), so the actual
// MemoryRouter/useNavigate/useLocation implementations must run.
mockTds();
mockAppsInToss();
mockTossRewardAd();

const SPEC_ROUTES = [
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

// Routes safely smoke-renderable without location.state (diagnose/quiz and
// diagnose/result require RouteState payloads and are covered by their own
// packet tests — direct nav without state is a redirect concern, not a crash concern).
const SMOKE_ROUTES = SPEC_ROUTES.filter(
  (p) => p !== "/diagnose/quiz" && p !== "/diagnose/result",
);

// NOTE: imported via a non-literal specifier so `tsc` doesn't statically
// resolve it — this module is created by the Coder in the next phase.
// The import still genuinely fails at test runtime until then (red phase).
const ROUTE_TABLE_MODULE = "@/routes/routeTable";
async function importRouteTable() {
  return import(/* @vite-ignore */ ROUTE_TABLE_MODULE);
}

describe("라우터 배선을 기존 스텁 화면으로 방어적 연결", () => {
  it("AC-1[P0]: routeTable이 SPEC의 11개 라우트 경로와 정확히 일치한다", async () => {
    const { routeTable } = await importRouteTable();
    const paths = routeTable.map((entry: { path: string }) => entry.path).sort();
    expect(paths).toEqual([...SPEC_ROUTES].sort());
    expect(routeTable).toHaveLength(11);
  });

  it("AC-1[P0]: App은 선언된 경로 전부를 콘솔 에러 없이 크래시 없이 렌더한다", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { default: App } = await import("@/App");

    let renderedCount = 0;
    for (const path of SMOKE_ROUTES) {
      const { unmount } = render(
        React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)),
      );
      renderedCount += 1;
      unmount();
    }

    expect(renderedCount).toBe(SMOKE_ROUTES.length);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("AC-2[P0]: 미구현 라우트는 RoutePlaceholder가 ScreenScaffold 골격 안에서 안전 렌더된다", async () => {
    const { RoutePlaceholder } = await importRouteTable();
    render(React.createElement(RoutePlaceholder, { path: "/report" }));

    const placeholder = screen.getByTestId("route-placeholder");
    expect(placeholder).toBeInTheDocument();
    expect(placeholder.textContent).toBeTruthy();
  });

  it("AC-2[P0] error case: 알 수 없는 경로를 받아도 RoutePlaceholder는 동일하게 크래시 없이 렌더된다", async () => {
    const { RoutePlaceholder } = await importRouteTable();

    expect(() =>
      render(React.createElement(RoutePlaceholder, { path: "/__unknown-route-xyz" })),
    ).not.toThrow();
    expect(screen.getByTestId("route-placeholder")).toBeInTheDocument();
  });

  it("AC-3[P0]: onboarded=false로 보호 경로에 직접 진입하면 온보딩 화면으로 리다이렉트된다", async () => {
    seedLocalStorage({
      "duotrack.meta": {
        aiNoticeAcknowledged: false,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 0,
        weekAnchor: "2000-01-03",
        onboarded: false,
      },
    });
    const { default: App } = await import("@/App");
    render(
      React.createElement(MemoryRouter, { initialEntries: ["/report"] }, React.createElement(App)),
    );

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-intro")).toBeInTheDocument();
    });
    expect(screen.queryByText("ROI 리포트")).not.toBeInTheDocument();
  });

  it("AC-3[P0] error case: onboarded=true면 보호 경로 진입 시 리다이렉트되지 않는다", async () => {
    const currentAnchor = maybeResetWeek(
      { aiNoticeAcknowledged: true, isSubscribed: false, weeklyFreeSessionsUsed: 0, weekAnchor: "", onboarded: true },
      new Date(),
    ).weekAnchor;
    seedLocalStorage({
      "duotrack.meta": {
        aiNoticeAcknowledged: true,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 0,
        weekAnchor: currentAnchor,
        onboarded: true,
      },
    });
    const { default: App } = await import("@/App");
    render(
      React.createElement(MemoryRouter, { initialEntries: ["/report"] }, React.createElement(App)),
    );

    await waitFor(() => {
      expect(screen.getByText("ROI 리포트")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("onboarding-intro")).not.toBeInTheDocument();
  });

  it("AC-3[P0]: 지난 weekAnchor는 앱 진입 시 이번 주 월요일로 자동 리셋된다", async () => {
    seedLocalStorage({
      "duotrack.meta": {
        aiNoticeAcknowledged: true,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 3,
        weekAnchor: "2000-01-03",
        onboarded: true,
      },
    });
    const expected = maybeResetWeek(
      {
        aiNoticeAcknowledged: true,
        isSubscribed: false,
        weeklyFreeSessionsUsed: 3,
        weekAnchor: "2000-01-03",
        onboarded: true,
      },
      new Date(),
    );

    const { default: App } = await import("@/App");
    render(
      React.createElement(MemoryRouter, { initialEntries: ["/home"] }, React.createElement(App)),
    );

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("duotrack.meta") ?? "{}");
      expect(stored.weeklyFreeSessionsUsed).toBe(0);
    });
    const stored = JSON.parse(localStorage.getItem("duotrack.meta") ?? "{}");
    expect(stored.weekAnchor).toBe(expected.weekAnchor);
  });
});
