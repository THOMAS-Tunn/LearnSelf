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

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={`menu-icon ${open ? 'menu-icon--open' : ''}`}
    >
      <path
        className="menu-bar menu-bar--top"
        d="M3 4.5H15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        className="menu-bar menu-bar--mid"
        d="M3 9H15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        className="menu-bar menu-bar--bot"
        d="M3 13.5H15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppShell({ currentView, currentUser, status, onViewChange, children }: AppShellProps) {
  const headerRef = useRef<HTMLElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const navMeasureRef = useRef<HTMLDivElement | null>(null);
  const accountMeasureRef = useRef<HTMLDivElement | null>(null);
  const avatarMeasureRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeMenuTimeoutRef = useRef<number | null>(null);
  const [compactMenuEnabled, setCompactMenuEnabled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnimating, setMenuAnimating] = useState(false);
  const [menuTop, setMenuTop] = useState(0);

  useEffect(() => {
    const clearCloseTimeout = () => {
      if (closeMenuTimeoutRef.current) {
        window.clearTimeout(closeMenuTimeoutRef.current);
        closeMenuTimeoutRef.current = null;
      }
    };

    const updateLayoutMode = () => {
      const headerWidth = headerRef.current?.clientWidth ?? 0;
      const logoWidth = logoRef.current?.offsetWidth ?? 0;
      const navWidth = navMeasureRef.current?.scrollWidth ?? 0;
      const accountWidth = accountMeasureRef.current?.scrollWidth ?? 0;
      const avatarWidth = avatarMeasureRef.current?.offsetWidth ?? 0;
      const comfortGap = 84;
      const shouldCompact = logoWidth + navWidth + accountWidth + avatarWidth + comfortGap > headerWidth;

      setCompactMenuEnabled(shouldCompact);
      setMenuTop((headerRef.current?.getBoundingClientRect().bottom ?? 0) + 8);

      if (!shouldCompact) {
        clearCloseTimeout();
        setMenuOpen(false);
        setMenuAnimating(false);
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
      clearCloseTimeout();
      window.clearTimeout(delayedUpdateId);
      window.removeEventListener('resize', updateLayoutMode);
      resizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        menuRef.current
        && !menuRef.current.contains(target)
        && headerRef.current
        && !headerRef.current.contains(target)
      ) {
        closeMenu();
      }
    }

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      closeMenu();
    }
  }, [currentView]);

  function clearCloseTimeout() {
    if (closeMenuTimeoutRef.current) {
      window.clearTimeout(closeMenuTimeoutRef.current);
      closeMenuTimeoutRef.current = null;
    }
  }

  function openMenu() {
    clearCloseTimeout();
    setMenuAnimating(true);
    setMenuOpen(true);
  }

  function closeMenu() {
    clearCloseTimeout();
    setMenuOpen(false);
    closeMenuTimeoutRef.current = window.setTimeout(() => {
      setMenuAnimating(false);
      closeMenuTimeoutRef.current = null;
    }, 280);
  }

  function toggleMenu() {
    if (menuOpen) {
      closeMenu();
      return;
    }

    openMenu();
  }

  function handleViewChange(view: ViewName) {
    onViewChange(view);
    closeMenu();
  }

  return (
    <div id="app-page">
      <header ref={headerRef}>
        <div ref={logoRef} className="header-logo">
          Learn<span>self</span>
        </div>

        {!compactMenuEnabled ? (
          <nav>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`nav-btn ${currentView === item.key ? 'active' : ''}`}
                type="button"
                onClick={() => handleViewChange(item.key)}
              >
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
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="header-popout-nav"
              onClick={toggleMenu}
            >
              <MenuIcon open={menuOpen} />
            </button>
          ) : (
            <>
              <button
                className={`nav-btn ${currentView === 'profile' ? 'active' : ''}`}
                type="button"
                onClick={() => handleViewChange('profile')}
              >
                Profile
              </button>
              <button
                className={`nav-btn ${currentView === 'settings' ? 'active' : ''}`}
                type="button"
                onClick={() => handleViewChange('settings')}
              >
                Settings
              </button>
            </>
          )}

          <div ref={avatarMeasureRef} className="header-avatar-wrap">
            <UserAvatar
              name={currentUser.name}
              avatarUrl={currentUser.avatarUrl}
              className="header-avatar"
            />
          </div>
        </div>
      </header>

      {compactMenuEnabled && (menuOpen || menuAnimating) ? (
        <>
          <div
            className={`header-popout-backdrop ${
              menuOpen ? 'header-popout-backdrop--in' : 'header-popout-backdrop--out'
            }`}
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            id="header-popout-nav"
            className={`header-popout-float ${
              menuOpen ? 'header-popout-float--in' : 'header-popout-float--out'
            }`}
            style={menuTop ? { top: `${menuTop}px` } : undefined}
            role="navigation"
            aria-label="Main navigation"
          >
            <div className="header-popout-inner">
              {NAV_ITEMS.map((item, index) => (
                <button
                  key={item.key}
                  className={`nav-btn nav-btn-popout ${currentView === item.key ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleViewChange(item.key)}
                  style={{ animationDelay: menuOpen ? `${index * 35}ms` : '0ms' }}
                >
                  {item.label}
                </button>
              ))}
              <div className="popout-divider" />
              <button
                className={`nav-btn nav-btn-popout ${currentView === 'profile' ? 'active' : ''}`}
                type="button"
                onClick={() => handleViewChange('profile')}
                style={{ animationDelay: menuOpen ? `${NAV_ITEMS.length * 35}ms` : '0ms' }}
              >
                Profile
              </button>
              <button
                className={`nav-btn nav-btn-popout ${currentView === 'settings' ? 'active' : ''}`}
                type="button"
                onClick={() => handleViewChange('settings')}
                style={{ animationDelay: menuOpen ? `${(NAV_ITEMS.length + 1) * 35}ms` : '0ms' }}
              >
                Settings
              </button>
            </div>
          </div>
        </>
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
          <button className="nav-btn" type="button" tabIndex={-1}>
            Profile
          </button>
          <button className="nav-btn" type="button" tabIndex={-1}>
            Settings
          </button>
        </div>
      </div>

      {status?.text ? <div className={`status-banner ${status.tone} show`}>{status.text}</div> : null}
      {children}
    </div>
  );
}
