import { useEffect, useRef, useState } from 'react';

interface InfoTipProps {
  text: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTip({ text, placement = 'top' }: InfoTipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function show() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setVisible(true);
  }

  function hide() {
    timeoutRef.current = setTimeout(() => setVisible(false), 80);
  }

  return (
    <span
      className={`infotip infotip--${placement}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      role="img"
      aria-label={text}
    >
      <svg
        className="infotip-icon"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M7 6.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="7" cy="4.5" r="0.7" fill="currentColor" />
      </svg>

      {visible ? (
        <span className="infotip-bubble" role="tooltip">
          {text}
        </span>
      ) : null}
    </span>
  );
}
