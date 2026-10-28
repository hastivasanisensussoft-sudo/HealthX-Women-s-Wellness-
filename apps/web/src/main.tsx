import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/index.css';
import { App } from './App';
import { ToastProvider } from './components/ui/Toast';
import { installHorizontalWheel } from './lib/horizontalWheel';
import { applyTheme, loadThemePrefs } from './theme/engine';
import { ThemeProvider } from './theme/ThemeProvider';

// Paint the saved theme before the first render (no flash of the default colours).
applyTheme(loadThemePrefs());
// Mouse wheel scrolls horizontal rows whose scrollbar is hidden.
installHorizontalWheel();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
