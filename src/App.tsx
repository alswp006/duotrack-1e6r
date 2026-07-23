import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppStoreProvider } from '@/lib/store';
import Onboarding from './pages/Onboarding';
import DiagnoseSetup from './pages/DiagnoseSetup';
import DiagnoseQuiz from './pages/DiagnoseQuiz';
import DiagnoseResult from './pages/DiagnoseResult';
import Home from './pages/Home';
import Session from './pages/Session';
import Exams from './pages/Exams';
import Problems from './pages/Problems';
import Report from './pages/Report';
import Subscribe from './pages/Subscribe';
import Settings from './pages/Settings';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

export default function App() {
  return (
    <AppStoreProvider>
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/diagnose" element={<DiagnoseSetup />} />
        <Route path="/diagnose/quiz" element={<DiagnoseQuiz />} />
        <Route path="/diagnose/result" element={<DiagnoseResult />} />
        <Route path="/home" element={<Home />} />
        <Route path="/session" element={<Session />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/report" element={<Report />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/settings" element={<Settings />} />
        {DevTdsGallery && (
          <Route
            path="/__tds-gallery"
            element={
              <Suspense fallback={null}>
                <DevTdsGallery />
              </Suspense>
            }
          />
        )}
      </Routes>
    </AppStoreProvider>
  );
}
