import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface InfoTipProps {
  text: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTip({ text, placement = 'top' }: InfoTipProps) {
  const [visible, setVisible] = useState(false);
  const [xShift, setXShift] = useState(0);
  const [yShift, setYShift] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!visible || !bubbleRef.current) {
      setXShift(0);
      setYShift(0);
      return;
    }

    const rect = bubbleRef.current.getBoundingClientRect();
    const margin = 10;
    let dx = 0;
    let dy = 0;

    if (rect.right > window.innerWidth - margin) {
      dx = window.innerWidth - margin - rect.right;
    }
    if (rect.left < margin) {
      dx = margin - rect.left;
    }
    if (rect.bottom > window.innerHeight - margin) {
      dy = window.innerHeight - margin - rect.bottom;
    }
    if (rect.top < margin) {
      dy = margin - rect.top;
    }
    if (dx !== 0) {
      setXShift(dx);
    }
    if (dy !== 0) {
      setYShift(dy);
    }
  }, [visible]);

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

  function getBubbleStyle(): CSSProperties {
    const shift = xShift !== 0 || yShift !== 0;
    if (!shift) {
      return {};
    }

    if (placement === 'top' || placement === 'bottom') {
      return { transform: `translateX(calc(-50% + ${xShift}px))` };
    }
    if (placement === 'left' || placement === 'right') {
      return { transform: `translateY(calc(-50% + ${yShift}px))` };
    }
    return {};
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
        <span
          ref={bubbleRef}
          className="infotip-bubble"
          role="tooltip"
          style={getBubbleStyle()}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
