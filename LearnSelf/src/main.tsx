import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const THEME_STORAGE_KEY = 'learnself-theme';

type ThemeMode = 'light' | 'dark';

function getStoredTheme(): ThemeMode {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

const theme = getStoredTheme();
document.documentElement.dataset.theme = theme;
document.documentElement.style.colorScheme = theme;
document.documentElement.style.backgroundColor = theme === 'dark' ? '#1a1917' : '#f4f3f0';

renderApp();
