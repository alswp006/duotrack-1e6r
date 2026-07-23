import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { routeTable, RoutePlaceholder } from "@/routes/routeTable";

/**
 * 온보딩 완료 전에는 보호 경로 진입을 막고 온보딩(`/`)으로 되돌린다(AC-3).
 * AppStoreProvider의 meta는 useState(getMeta())로 초기화되어 첫 렌더부터
 * localStorage 값을 동기 반영하므로 isLoading을 기다릴 필요가 없다.
 */
function RequireOnboarded({ children }: { children: ReactElement }) {
  const { meta } = useAppStore();
  if (!meta.onboarded) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function AppRouter() {
  return (
    <Routes>
      {routeTable.map(({ path, element: Element, protected: isProtected }) => {
        const page = Element ? <Element /> : <RoutePlaceholder path={path} />;
        return (
          <Route
            key={path}
            path={path}
            element={isProtected ? <RequireOnboarded>{page}</RequireOnboarded> : page}
          />
        );
      })}
    </Routes>
  );
}
