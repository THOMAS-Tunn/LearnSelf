import {
  DEFAULT_USER_NAME,
  DIFFICULTY_CLASS_MAP,
  GRADING_MODE_OPTIONS,
  WEEKDAY_PICKER_OPTIONS
} from '../constants';
import type {
  Assignment,
  AssignmentFormValues,
  AssignmentRepeatEvery,
  Difficulty,
  GradingMode,
  UserProfile
} from '../types';

type AssignmentBucket = 'overdue' | 'today' | 'future';
type PriorityColor = 'red' | 'yellow' | 'green';

export interface AssignmentPriority {
  score: number;
  color: PriorityColor;
}

interface RepeatScheduleSource {
  repeatEnabled: boolean;
  repeatEvery: AssignmentRepeatEvery | '' | null;
  repeatTime: string;
  repeatDaysOfWeek: number[];
  repeatDaysOfMonth: number[];
  repeatTimezone: string;
}

const MILLISECONDS_PER_DAY = 86400000;

function parseAssignmentDate(iso: string) {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonthsClamped(date: Date, months: number) {
  const targetMonth = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(date.getDate(), lastDayOfMonth));
}

function normalizeNumberList(values: number[], min: number, max: number) {
  return [...new Set(values)]
    .filter((value) => Number.isInteger(value) && value >= min && value <= max)
    .sort((left, right) => left - right);
}

function normalizeTime(time: string) {
  const normalized = time.trim();
  return /^\d{2}:\d{2}(:\d{2})?$/.test(normalized) ? normalized.slice(0, 5) : '';
}

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getDaysUntilDue(iso: string) {
  const due = parseAssignmentDate(iso);
  if (!due) return 999;
  return Math.round((due.getTime() - getTodayStart().getTime()) / MILLISECONDS_PER_DAY);
}

function getAssignmentBucket(assignment: Pick<Assignment, 'due'>): AssignmentBucket {
  const days = getDaysUntilDue(assignment.due);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  return 'future';
}

function getPriorityColor(assignment: Pick<Assignment, 'due'>): PriorityColor {
  const days = getDaysUntilDue(assignment.due);
  if (days <= 0) return 'red';
  if (days <= 3) return 'yellow';
  return 'green';
}

function getDifficultyOffset(difficulty: Difficulty, easyFirst = false) {
  if (easyFirst) {
    const easyFirstOffsets: Record<Difficulty, number> = {
      Easy: 0,
      Medium: 1,
      Hard: 2,
      Group: 3
    };
    return easyFirstOffsets[difficulty];
  }

  const defaultOffsets: Record<Difficulty, number> = {
    Group: 0,
    Hard: 1,
    Medium: 2,
    Easy: 3
  };
  return defaultOffsets[difficulty];
}

function getNewestFirstScore(
  assignment: Assignment,
  buckets: Record<AssignmentBucket, number>
) {
  const hasCurrentOrFutureWork = buckets.today > 0 || buckets.future > 0;
  const bucket = getAssignmentBucket(assignment);

  if (!hasCurrentOrFutureWork) {
    return getDifficultyOffset(assignment.difficulty, true) + 1;
  }

  if (bucket === 'today') {
    return getDifficultyOffset(assignment.difficulty) + 1;
  }

  if (bucket === 'future') {
    return getDifficultyOffset(assignment.difficulty) + 5;
  }

  return getDifficultyOffset(assignment.difficulty) + 9;
}

function getOldestFirstScore(
  assignment: Assignment,
  buckets: Record<AssignmentBucket, number>
) {
  const bucket = getAssignmentBucket(assignment);
  const orderedBuckets: AssignmentBucket[] = [];

  if (buckets.overdue > 0) orderedBuckets.push('overdue');
  if (buckets.today > 0) orderedBuckets.push('today');
  if (buckets.future > 0) orderedBuckets.push('future');

  const bucketIndex = Math.max(0, orderedBuckets.indexOf(bucket));
  return bucketIndex * 4 + getDifficultyOffset(assignment.difficulty) + 1;
}

export function createEmptyAssignmentForm(): AssignmentFormValues {
  return {
    name: '',
    cls: '',
    difficulty: '',
    ad: '',
    due: '',
    desc: '',
    repeatEnabled: false,
    repeatEvery: '',
    repeatTime: '08:00',
    repeatDaysOfWeek: [],
    repeatDaysOfMonth: [],
    repeatTimezone: getLocalTimezone()
  };
}

export function getInitialUser(): UserProfile {
  return { id: '', email: '', name: DEFAULT_USER_NAME, avatarUrl: '' };
}

export function getInitialGradingMode(): GradingMode {
  try {
    return window.localStorage.getItem('learnself-grading-mode') === 'oldest-first'
      ? 'oldest-first'
      : 'newest-first';
  } catch {
    return 'newest-first';
  }
}

export function saveGradingMode(mode: GradingMode) {
  try {
    window.localStorage.setItem('learnself-grading-mode', mode);
  } catch {
    // Ignore storage failures and keep the in-memory preference.
  }
}

export function getGradingModeMeta(mode: GradingMode) {
  return GRADING_MODE_OPTIONS.find((option) => option.key === mode) ?? GRADING_MODE_OPTIONS[0];
}

export function buildAssignmentPriorityState(assignments: Assignment[], mode: GradingMode) {
  const buckets = assignments.reduce<Record<AssignmentBucket, number>>((counts, assignment) => {
    counts[getAssignmentBucket(assignment)] += 1;
    return counts;
  }, { overdue: 0, today: 0, future: 0 });

  const priorities = Object.fromEntries(
    assignments.map((assignment) => {
      const score = assignments.length === 1
        ? 1
        : mode === 'newest-first'
          ? getNewestFirstScore(assignment, buckets)
          : getOldestFirstScore(assignment, buckets);

      return [assignment.id, { score, color: getPriorityColor(assignment) }];
    })
  ) as Record<string, AssignmentPriority>;

  const sortedAssignments = [...assignments].sort((left, right) => {
    const leftPriority = priorities[left.id]?.score ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = priorities[right.id]?.score ?? Number.MAX_SAFE_INTEGER;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftDue = parseAssignmentDate(left.due)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightDue = parseAssignmentDate(right.due)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (leftDue !== rightDue) {
      return leftDue - rightDue;
    }

    return left.name.localeCompare(right.name);
  });

  return { priorities, sortedAssignments };
}

export function formatDate(iso: string) {
  if (!iso) return '-';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${month}/${day}/${year.slice(2)}`;
}

export function isPastDueDate(iso: string) {
  const due = parseAssignmentDate(iso);
  if (!due) {
    return false;
  }

  return due.getTime() < getTodayStart().getTime();
}

export function abbreviateClass(name: string) {
  if (!name.trim()) return '-';
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function getDifficultyClassName(difficulty: Difficulty) {
  return DIFFICULTY_CLASS_MAP[difficulty];
}

export function getLocalTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getRepeatAnchorDate(assignment: Pick<AssignmentFormValues, 'ad' | 'due'>) {
  return assignment.ad || assignment.due;
}

export function getRepeatDueOffsetDays(assignment: Pick<AssignmentFormValues, 'ad' | 'due'>) {
  const assigned = parseAssignmentDate(assignment.ad);
  const due = parseAssignmentDate(assignment.due);
  if (!assigned || !due) {
    return 0;
  }

  return Math.max(0, Math.round((due.getTime() - assigned.getTime()) / MILLISECONDS_PER_DAY));
}

function getNextDaysOfWeekOccurrence(anchor: Date, daysOfWeek: number[]) {
  const allowedDays = new Set(normalizeNumberList(daysOfWeek, 0, 6));
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDays(anchor, offset);
    if (allowedDays.has(candidate.getDay())) {
      return candidate;
    }
  }

  return addDays(anchor, 7);
}

function getNextDaysOfMonthOccurrence(anchor: Date, daysOfMonth: number[]) {
  const normalizedDays = normalizeNumberList(daysOfMonth, 1, 31);

  for (let monthOffset = 0; monthOffset < 36; monthOffset += 1) {
    const monthCursor = new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1);
    const lastDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();

    for (const day of normalizedDays) {
      if (day > lastDay) {
        continue;
      }

      const candidate = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
      if (candidate.getTime() > anchor.getTime()) {
        return candidate;
      }
    }
  }

  return addMonthsClamped(anchor, 1);
}

export function getNextRepeatOccurrence(anchorIso: string, repeatEvery: AssignmentRepeatEvery, daysOfWeek: number[], daysOfMonth: number[]) {
  const anchorDate = parseAssignmentDate(anchorIso);
  if (!anchorDate) {
    return '';
  }

  switch (repeatEvery) {
    case 'day':
      return toIsoDate(addDays(anchorDate, 1));
    case 'week':
      return toIsoDate(addDays(anchorDate, 7));
    case 'month':
      return toIsoDate(addMonthsClamped(anchorDate, 1));
    case 'days-of-week':
      return toIsoDate(getNextDaysOfWeekOccurrence(anchorDate, daysOfWeek));
    case 'days-of-month':
      return toIsoDate(getNextDaysOfMonthOccurrence(anchorDate, daysOfMonth));
    default:
      return '';
  }
}

function formatTimeLabel(time: string) {
  const normalized = normalizeTime(time);
  if (!normalized) return time || '-';

  const [hoursString, minutesString] = normalized.split(':');
  const hours = Number(hoursString);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutesString} ${suffix}`;
}

export function formatRepeatSummary(config: RepeatScheduleSource) {
  if (!config.repeatEnabled || !config.repeatEvery) {
    return 'Does not repeat';
  }

  const timeLabel = formatTimeLabel(config.repeatTime);

  switch (config.repeatEvery) {
    case 'day':
      return `Every day at ${timeLabel}`;
    case 'week':
      return `Every week at ${timeLabel}`;
    case 'month':
      return `Every month at ${timeLabel}`;
    case 'days-of-week': {
      const labels = normalizeNumberList(config.repeatDaysOfWeek, 0, 6)
        .map((value) => WEEKDAY_PICKER_OPTIONS.find((option) => option.value === value)?.shortLabel ?? value)
        .join(', ');
      return `Every ${labels || 'selected weekday'} at ${timeLabel}`;
    }
    case 'days-of-month': {
      const labels = normalizeNumberList(config.repeatDaysOfMonth, 1, 31).join(', ');
      return `Every month on ${labels || 'selected day'} at ${timeLabel}`;
    }
    default:
      return 'Does not repeat';
  }
}
