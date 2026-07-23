import type { ComponentType } from "react";
import { createElement } from "react";
import { Top, Paragraph } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import Onboarding from "@/pages/Onboarding";
import DiagnoseSetup from "@/pages/DiagnoseSetup";
import DiagnoseQuiz from "@/pages/DiagnoseQuiz";
import DiagnoseResult from "@/pages/DiagnoseResult";
import Home from "@/pages/Home";
import Session from "@/pages/Session";
import Exams from "@/pages/Exams";
import Problems from "@/pages/Problems";
import Report from "@/pages/Report";
import Subscribe from "@/pages/Subscribe";
import Settings from "@/pages/Settings";

export interface RouteEntry {
  path: string;
  /** 미구현 화면은 undefined — AppRouter가 RoutePlaceholder로 대체 렌더 */
  element?: ComponentType;
  /** onboarded===true 필요 여부. false(온보딩 자체)만 공개 경로 */
  protected: boolean;
}

/**
 * 미구현 라우트용 최소 플레이스홀더 — ScreenScaffold 골격 안에서 안전 렌더.
 * 이후 화면 패킷이 머지되면 routeTable의 element만 교체하면 된다.
 */
export function RoutePlaceholder({ path }: { path: string }) {
  return createElement(ScreenScaffold, {
    top: createElement(Top, { title: createElement(Top.TitleParagraph, null, "준비 중") }),
    children: createElement(
      "div",
      { "data-testid": "route-placeholder" },
      createElement(Paragraph.Text, { typography: "t5" }, `${path} 화면은 준비 중이에요`),
    ),
  });
}

export const routeTable: RouteEntry[] = [
  { path: "/", element: Onboarding, protected: false },
  { path: "/diagnose", element: DiagnoseSetup, protected: true },
  { path: "/diagnose/quiz", element: DiagnoseQuiz, protected: true },
  { path: "/diagnose/result", element: DiagnoseResult, protected: true },
  { path: "/home", element: Home, protected: true },
  { path: "/session", element: Session, protected: true },
  { path: "/exams", element: Exams, protected: true },
  { path: "/problems", element: Problems, protected: true },
  { path: "/report", element: Report, protected: true },
  { path: "/subscribe", element: Subscribe, protected: true },
  { path: "/settings", element: Settings, protected: true },
];
