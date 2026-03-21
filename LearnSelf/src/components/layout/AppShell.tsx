import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NAV_ITEMS } from '../../constants';
import { UserAvatar } from '../common/UserAvatar';
import type { StatusMessage, UserProfile, ViewName } from '../../types';

interface AppShellProps {
  currentView: ViewName;
  currentUser: UserProfile;
  status?: StatusMessage | null;
  onViewChange: (view: ViewName) => void;
  children: ReactNode;
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 4.5H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 9H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 13.5H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell({ currentView, currentUser, status, onViewChange, children }: AppShellProps) {
  const headerRef = useRef<HTMLElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const navMeasureRef = useRef<HTMLDivElement | null>(null);
  const accountMeasureRef = useRef<HTMLDivElement | null>(null);
  const avatarMeasureRef = useRef<HTMLDivElement | null>(null);
  const [compactMenuEnabled, setCompactMenuEnabled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const updateLayoutMode = () => {
      const headerWidth = headerRef.current?.clientWidth ?? 0;
      const logoWidth = logoRef.current?.offsetWidth ?? 0;
      const navWidth = navMeasureRef.current?.scrollWidth ?? 0;
      const accountWidth = accountMeasureRef.current?.scrollWidth ?? 0;
      const avatarWidth = avatarMeasureRef.current?.offsetWidth ?? 0;
      const comfortGap = 84;
      const shouldCompact = logoWidth + navWidth + accountWidth + avatarWidth + comfortGap > headerWidth;

      setCompactMenuEnabled(shouldCompact);
      if (!shouldCompact) {
        setMenuOpen(false);
      }
    };

    updateLayoutMode();
    const delayedUpdateId = window.setTimeout(updateLayoutMode, 250);
    window.addEventListener('resize', updateLayoutMode);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && headerRef.current) {
      resizeObserver = new ResizeObserver(updateLayoutMode);
      resizeObserver.observe(headerRef.current);
    }

    return () => {
      window.clearTimeout(delayedUpdateId);
      window.removeEventListener('resize', updateLayoutMode);
      resizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [currentView]);

  const handleViewChange = (view: ViewName) => {
    onViewChange(view);
    setMenuOpen(false);
  };

  return (
    <div id="app-page">
      <header ref={headerRef}>
        <div ref={logoRef} className="header-logo">Learn<span>self</span></div>

        {!compactMenuEnabled ? (
          <nav>
            {NAV_ITEMS.map((item) => (
              <button key={item.key} className={`nav-btn ${currentView === item.key ? 'active' : ''}`} type="button" onClick={() => handleViewChange(item.key)}>
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}

        <div className={`header-right ${compactMenuEnabled ? 'header-right-compact' : ''}`}>
          {compactMenuEnabled ? (
            <button
              className={`header-menu-toggle ${menuOpen ? 'active' : ''}`}
              type="button"
              aria-label="Toggle tabs menu"
              aria-expanded={menuOpen}
              aria-controls="header-popout-nav"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <MenuIcon />
            </button>
          ) : (
            <>
              <button className={`nav-btn ${currentView === 'profile' ? 'active' : ''}`} type="button" onClick={() => handleViewChange('profile')}>Profile</button>
              <button className={`nav-btn ${currentView === 'settings' ? 'active' : ''}`} type="button" onClick={() => handleViewChange('settings')}>Settings</button>
            </>
          )}

          <div ref={avatarMeasureRef} className="header-avatar-wrap">
            <UserAvatar name={currentUser.name} avatarUrl={currentUser.avatarUrl} className="header-avatar" />
          </div>
        </div>
      </header>

      {compactMenuEnabled && menuOpen ? (
        <div className="header-popout">
          <nav id="header-popout-nav" className="header-popout-nav" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <button key={item.key} className={`nav-btn ${currentView === item.key ? 'active' : ''}`} type="button" onClick={() => handleViewChange(item.key)}>
                {item.label}
              </button>
            ))}
            <button className={`nav-btn ${currentView === 'profile' ? 'active' : ''}`} type="button" onClick={() => handleViewChange('profile')}>Profile</button>
            <button className={`nav-btn ${currentView === 'settings' ? 'active' : ''}`} type="button" onClick={() => handleViewChange('settings')}>Settings</button>
          </nav>
        </div>
      ) : null}

      <div className="header-measure" aria-hidden="true">
        <div ref={navMeasureRef} className="header-measure-row">
          {NAV_ITEMS.map((item) => (
            <button key={item.key} className="nav-btn" type="button" tabIndex={-1}>
              {item.label}
            </button>
          ))}
        </div>
        <div ref={accountMeasureRef} className="header-measure-row">
          <button className="nav-btn" type="button" tabIndex={-1}>Profile</button>
          <button className="nav-btn" type="button" tabIndex={-1}>Settings</button>
        </div>
      </div>

      {status?.text ? <div className={`status-banner ${status.tone} show`}>{status.text}</div> : null}
      {children}
    </div>
  );
}
