import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppStoreProvider } from '@/lib/store';
import { AppRouter } from '@/routes/AppRouter';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

export default function App() {
  return (
    <AppStoreProvider>
      <AppRouter />
      {DevTdsGallery && (
        <Routes>
          <Route
            path="/__tds-gallery"
            element={
              <Suspense fallback={null}>
                <DevTdsGallery />
              </Suspense>
            }
          />
        </Routes>
      )}
    </AppStoreProvider>
  );
}
