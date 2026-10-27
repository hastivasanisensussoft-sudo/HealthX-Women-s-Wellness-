import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/index.css';
import { App } from './App';
import { AppStoreProvider } from './store/AppStore';
import { ToastProvider } from './components/ui/Toast';
import { applyTheme, loadThemePrefs } from './theme/engine';
import { ThemeProvider } from './theme/ThemeProvider';

// Paint the saved theme before the first render (no flash of the default colours).
applyTheme(loadThemePrefs());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AppStoreProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AppStoreProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
