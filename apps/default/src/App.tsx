import React, { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

import { EstateLayout } from './components/estate/EstateLayout.tsx';

// Mobile personnel-flow shell - lazy so it does NOT ship with the manager app.
const PersonnelApp = lazy(() =>
  import('./components/personnel/PersonnelApp.tsx').then(m => ({ default: m.PersonnelApp })),
);

function App() {
  useEffect(() => {
    document.title = 'Raynham Estate OS';
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/a/:anchorId/*"
          element={
            <Suspense fallback={<PersonnelBootFallback />}>
              <PersonnelApp />
            </Suspense>
          }
        />
        <Route
          path="/field/*"
          element={
            <Suspense fallback={<PersonnelBootFallback />}>
              <PersonnelApp />
            </Suspense>
          }
        />
        <Route path="*" element={<EstateLayout />} />
      </Routes>
    </HashRouter>
  );
}

function PersonnelBootFallback() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ background: 'var(--surface-base, #FAFAF7)' }}
    >
      <div className="w-6 h-6 border-2 border-neutral-300 border-t-[var(--brand-gold,#C9A227)] rounded-full animate-spin" />
    </div>
  );
}

export default App;
