import type { ReactNode } from 'react';
import { NAV_ITEMS } from '../../constants';
import type { StatusMessage, UserProfile, ViewName } from '../../types';

interface AppShellProps {
  currentView: ViewName;
  currentUser: UserProfile;
  status?: StatusMessage | null;
  onViewChange: (view: ViewName) => void;
  children: ReactNode;
}

export function AppShell({ currentView, currentUser, status, onViewChange, children }: AppShellProps) {
  const avatar = currentUser.name[0]?.toUpperCase() || 'S';

  return (
    <div id="app-page">
      <header>
        <div className="header-logo">Learn<span>self</span></div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button key={item.key} className={`nav-btn ${currentView === item.key ? 'active' : ''}`} type="button" onClick={() => onViewChange(item.key)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <button className={`nav-btn ${currentView === 'profile' ? 'active' : ''}`} type="button" onClick={() => onViewChange('profile')}>Profile</button>
          <button className={`nav-btn ${currentView === 'settings' ? 'active' : ''}`} type="button" onClick={() => onViewChange('settings')}>Settings</button>
          <div className="header-avatar">{avatar}</div>
        </div>
      </header>
      {status?.text ? <div className={`status-banner ${status.tone} show`}>{status.text}</div> : null}
      {children}
    </div>
  );
}
