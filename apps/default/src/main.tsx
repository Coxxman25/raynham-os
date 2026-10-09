import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';

import './lib/leaflet-setup';

// ── Theme pre-hydration ───────────────────────────────────────────────────────
// Apply the stored theme BEFORE React renders so Tailwind dark: classes and
// CSS variables are correct on the very first paint.
(function applyStoredTheme() {
  try {
    const stored = localStorage.getItem('raynham-theme') as string | null;
    const theme = stored === 'dark' || stored === 'light' ? stored : 'light';
    const html = document.documentElement;

    html.setAttribute('data-theme', theme);

    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  } catch {
    // localStorage unavailable — leave defaults
  }
})();

// ── Typefaces ────────────────────────────────────────────────────────────────
// Display: Geist Sans — large titles, headlines
// Primary: Inter — body text, UI elements
// Mono: IBM Plex Mono — timestamps, IDs, zone codes, technical data
const fontLink = document.createElement('link');
fontLink.href = [
  'https://fonts.googleapis.com/css2?',
  'family=Geist:wght@300;400;500;600;700;800&',
  'family=Inter:wght@300;400;500;600;700;800&',
  'family=IBM+Plex+Mono:wght@400;500;700&',
  'display=swap',
].join('');
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
