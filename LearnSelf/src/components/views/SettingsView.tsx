import { useEffect, useState } from 'react';

interface SettingsViewProps {
  onLogout: () => void;
  logoutLoading?: boolean;
}

const THEME_STORAGE_KEY = 'learnself-theme';

type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark') {
    return 'dark';
  }

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.documentElement.style.backgroundColor = theme === 'dark' ? '#1a1917' : '#f4f3f0';

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures and keep the in-memory theme applied.
  }
}

export function SettingsView({ onLogout, logoutLoading = false }: SettingsViewProps) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const isDark = theme === 'dark';

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function handleToggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  return (
    <div className="view active">
      <div className="simple-view-card settings-card">
        <div className="view-title">Settings</div>
        <div className="view-sub">Manage your account preferences.</div>
        <div className="settings-list">
          <div className="setting-row yellow-soft">
            <div>
              <div className="help-title">Appearance</div>
              <div className="help-copy">Switch between the default light theme and the new warm dark theme.</div>
            </div>
            <button className="theme-toggle-btn" type="button" aria-pressed={isDark} onClick={handleToggleTheme}>
              {isDark ? 'Dark: On' : 'Dark: Off'}
            </button>
          </div>

          <div className="plain-card blue-soft">
            <div className="help-title">Motion</div>
            <div className="help-copy">Animations automatically soften when your system prefers reduced motion.</div>
          </div>

          <div className="plain-card green-soft">
            <div className="help-title">Saved Preference</div>
            <div className="help-copy">Your current theme is {isDark ? 'Dark' : 'Light'}, and it stays saved after reload.</div>
          </div>

          <button className={`login-btn settings-logout ${logoutLoading ? 'btn-loading' : ''}`} type="button" onClick={onLogout} disabled={logoutLoading}>
            {logoutLoading ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </div>
    </div>
  );
}
