import { useEffect, useId, useRef, useState } from 'react';

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  required?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseIso(iso: string): Date | null {
  if (!iso) return null;
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplay(iso: string): string {
  const date = parseIso(iso);
  if (!date) return '';
  return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

function buildCalendar(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function DatePicker({ id, value, onChange, placeholder = 'Pick a date', required }: DatePickerProps) {
  const autoId = useId();
  const triggerId = id ?? `date-picker-${autoId}`;
  const dialogId = `${triggerId}-dialog`;
  const labelId = `${triggerId}-label`;
  const rootRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parsed = parseIso(value);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());

  useEffect(() => {
    if (!value) return;
    const next = parseIso(value);
    if (!next) return;
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((current) => current - 1);
      return;
    }
    setViewMonth((current) => current - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((current) => current + 1);
      return;
    }
    setViewMonth((current) => current + 1);
  }

  function selectDay(day: number) {
    onChange(toIso(new Date(viewYear, viewMonth, day)));
    setOpen(false);
  }

  function clearDate() {
    onChange('');
    setOpen(false);
  }

  const weeks = buildCalendar(viewYear, viewMonth);
  const selectedDate = parseIso(value);

  return (
    <div className="dp-root" ref={rootRef}>
      <button
        id={triggerId}
        type="button"
        className={`dp-trigger ${open ? 'dp-trigger--open' : ''} ${value ? 'dp-trigger--filled' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-required={required}
      >
        <span className="dp-trigger-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x="1" y="2.5" width="13" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
            <line x1="1" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1.4" />
            <line x1="4.5" y1="1" x2="4.5" y2="4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="10.5" y1="1" x2="10.5" y2="4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <span className={`dp-trigger-text ${!value ? 'dp-placeholder' : ''}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value ? (
          <span
            className="dp-clear"
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            onClick={(event) => {
              event.stopPropagation();
              clearDate();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                clearDate();
              }
            }}
          >
            x
          </span>
        ) : null}
      </button>

      {open ? (
        <div id={dialogId} className="dp-panel" role="dialog" aria-modal="false" aria-labelledby={labelId}>
          <div className="dp-nav">
            <button type="button" className="dp-nav-btn" onClick={prevMonth} aria-label="Previous month">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span id={labelId} className="dp-month-label">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="dp-nav-btn" onClick={nextMonth} aria-label="Next month">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="dp-dow-row">
            {DOW.map((day) => <span key={day} className="dp-dow">{day}</span>)}
          </div>

          <div className="dp-weeks">
            {weeks.map((week, weekIndex) => (
              <div key={`${viewYear}-${viewMonth}-${weekIndex}`} className="dp-week">
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return <span key={dayIndex} className="dp-day dp-day--empty" aria-hidden="true" />;
                  }

                  const date = new Date(viewYear, viewMonth, day);
                  const isToday = date.getTime() === today.getTime();
                  const isSelected = selectedDate ? date.getTime() === selectedDate.getTime() : false;

                  return (
                    <button
                      key={dayIndex}
                      type="button"
                      className={[
                        'dp-day',
                        isToday ? 'dp-day--today' : '',
                        isSelected ? 'dp-day--selected' : ''
                      ].filter(Boolean).join(' ')}
                      onClick={() => selectDay(day)}
                      aria-pressed={isSelected}
                      aria-label={toIso(date)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="dp-footer">
            <button
              type="button"
              className="dp-today-btn"
              onClick={() => {
                onChange(toIso(today));
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                setOpen(false);
              }}
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
