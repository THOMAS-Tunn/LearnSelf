import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface InfoTipProps {
  text: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTip({ text, placement = 'top' }: InfoTipProps) {
  const [visible, setVisible] = useState(false);
  const [bubbleLayout, setBubbleLayout] = useState<{
    top: number;
    left: number;
    placement: InfoTipProps['placement'];
    ready: boolean;
  }>({
    top: 0,
    left: 0,
    placement,
    ready: false
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !bubbleRef.current) {
      setBubbleLayout((current) => (
        current.ready || current.placement !== placement
          ? { top: 0, left: 0, placement, ready: false }
          : current
      ));
      return;
    }

    const margin = 12;
    const gap = 8;

    const updatePosition = () => {
      if (!triggerRef.current || !bubbleRef.current) {
        return;
      }

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const bubbleRect = bubbleRef.current.getBoundingClientRect();
      const fitsLeft = triggerRect.left - gap - bubbleRect.width >= margin;
      const fitsRight = triggerRect.right + gap + bubbleRect.width <= window.innerWidth - margin;
      const fitsTop = triggerRect.top - gap - bubbleRect.height >= margin;
      const fitsBottom = triggerRect.bottom + gap + bubbleRect.height <= window.innerHeight - margin;
      const triggerCenterX = triggerRect.left + (triggerRect.width / 2);

      let nextPlacement = placement;

      if (placement === 'left' || placement === 'right') {
        nextPlacement = triggerCenterX < (window.innerWidth / 2) ? 'right' : 'left';
        if (nextPlacement === 'left' && !fitsLeft && fitsRight) {
          nextPlacement = 'right';
        } else if (nextPlacement === 'right' && !fitsRight && fitsLeft) {
          nextPlacement = 'left';
        }
      } else if (placement === 'top' && !fitsTop && fitsBottom) {
        nextPlacement = 'bottom';
      } else if (placement === 'bottom' && !fitsBottom && fitsTop) {
        nextPlacement = 'top';
      }

      let top = 0;
      let left = 0;

      if (nextPlacement === 'top') {
        top = triggerRect.top - bubbleRect.height - gap;
        left = triggerRect.left + (triggerRect.width / 2) - (bubbleRect.width / 2);
      } else if (nextPlacement === 'bottom') {
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width / 2) - (bubbleRect.width / 2);
      } else if (nextPlacement === 'left') {
        top = triggerRect.top + (triggerRect.height / 2) - (bubbleRect.height / 2);
        left = triggerRect.left - bubbleRect.width - gap;
      } else {
        top = triggerRect.top + (triggerRect.height / 2) - (bubbleRect.height / 2);
        left = triggerRect.right + gap;
      }

      top = Math.min(Math.max(top, margin), window.innerHeight - bubbleRect.height - margin);
      left = Math.min(Math.max(left, margin), window.innerWidth - bubbleRect.width - margin);

      setBubbleLayout({
        top,
        left,
        placement: nextPlacement,
        ready: true
      });
    };

    const scheduleUpdate = () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = window.requestAnimationFrame(() => {
        updatePosition();
        frameRef.current = null;
      });
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [placement, visible]);

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
    <>
      <span
        ref={triggerRef}
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
      </span>

      {visible && typeof document !== 'undefined'
        ? createPortal(
          <span
            ref={bubbleRef}
            className={`infotip-bubble infotip-bubble--${bubbleLayout.placement}`}
            role="tooltip"
            style={{
              top: bubbleLayout.top,
              left: bubbleLayout.left,
              visibility: bubbleLayout.ready ? 'visible' : 'hidden'
            }}
          >
            {text}
          </span>,
          document.body
        )
        : null}
    </>
  );
}
