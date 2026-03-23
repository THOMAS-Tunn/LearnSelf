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

type AssignmentBucket = 'overdue' | 'today' | 'future-near' | 'future-far';
type PriorityColor = 'red' | 'yellow' | 'green';

export interface AssignmentPriority {
  score: number;
  color: PriorityColor;
}

interface AssignmentPriorityState {
  priorities: Record<string, AssignmentPriority>;
  sortedAssignments: Assignment[];
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

export function getDueTimeOrDefault(time: string) {
  return normalizeTime(time) || '00:00';
}

function parseDueDateTime(dateIso: string, time = '00:00') {
  const date = parseAssignmentDate(dateIso);
  if (!date) {
    return null;
  }

  const [hours, minutes] = getDueTimeOrDefault(time).split(':').map(Number);
  const due = new Date(date);
  due.setHours(hours || 0, minutes || 0, 0, 0);
  return due;
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

function getDueTimestamp(assignment: Pick<Assignment, 'due' | 'dueTime'>) {
  return parseDueDateTime(assignment.due, assignment.dueTime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function getAssignmentBucket(assignment: Pick<Assignment, 'due' | 'dueTime'>): AssignmentBucket {
  const dueDate = parseAssignmentDate(assignment.due);
  if (!dueDate) return 'future-far';

  const dueDateTime = parseDueDateTime(assignment.due, assignment.dueTime);
  const now = new Date();
  if (dueDateTime && dueDateTime.getTime() < now.getTime()) {
    return 'overdue';
  }

  const today = getTodayStart();
  const tomorrow = addDays(today, 1);
  if (dueDate.getTime() < tomorrow.getTime()) {
    return 'today';
  }

  return getDaysUntilDue(assignment.due) <= 7 ? 'future-near' : 'future-far';
}

function getPriorityColor(assignment: Pick<Assignment, 'due' | 'dueTime'>): PriorityColor {
  const bucket = getAssignmentBucket(assignment);
  if (bucket === 'overdue' || bucket === 'today') return 'red';
  if (bucket === 'future-near') return 'yellow';
  return 'green';
}

function getDifficultyTieWeight(difficulty: Difficulty) {
  const weights: Record<Difficulty, number> = {
    Group: 0,
    Hard: 1,
    Medium: 2,
    Easy: 3
  };
  return weights[difficulty];
}

function getExistenceDifficultyRank(difficulty: Difficulty) {
  const ranks: Record<Difficulty, number> = {
    Easy: 1,
    Medium: 2,
    Hard: 3,
    Group: 3
  };
  return ranks[difficulty];
}

function getBucketOrder(bucket: AssignmentBucket, mode: GradingMode) {
  if (mode === 'newest-first') {
    const newestOrder: Record<AssignmentBucket, number> = {
      today: 0,
      'future-near': 1,
      'future-far': 2,
      overdue: 3
    };
    return newestOrder[bucket];
  }

  const defaultOrder: Record<AssignmentBucket, number> = {
    overdue: 0,
    today: 1,
    'future-near': 2,
    'future-far': 3
  };
  return defaultOrder[bucket];
}

function compareByName(left: Assignment, right: Assignment) {
  return left.name.localeCompare(right.name);
}

function compareByDifficulty(left: Assignment, right: Assignment) {
  return getDifficultyTieWeight(left.difficulty) - getDifficultyTieWeight(right.difficulty);
}

function compareNewestFirst(left: Assignment, right: Assignment) {
  const leftBucket = getAssignmentBucket(left);
  const rightBucket = getAssignmentBucket(right);
  const bucketDelta = getBucketOrder(leftBucket, 'newest-first') - getBucketOrder(rightBucket, 'newest-first');
  if (bucketDelta !== 0) {
    return bucketDelta;
  }

  const leftDue = getDueTimestamp(left);
  const rightDue = getDueTimestamp(right);
  if (leftDue !== rightDue) {
    if (leftBucket === 'overdue') {
      return rightDue - leftDue;
    }
    return leftDue - rightDue;
  }

  const difficultyDelta = compareByDifficulty(left, right);
  if (difficultyDelta !== 0) {
    return difficultyDelta;
  }

  return compareByName(left, right);
}

function compareOldestFirst(left: Assignment, right: Assignment) {
  const leftBucket = getAssignmentBucket(left);
  const rightBucket = getAssignmentBucket(right);
  const bucketDelta = getBucketOrder(leftBucket, 'oldest-first') - getBucketOrder(rightBucket, 'oldest-first');
  if (bucketDelta !== 0) {
    return bucketDelta;
  }

  const leftDue = getDueTimestamp(left);
  const rightDue = getDueTimestamp(right);
  if (leftDue !== rightDue) {
    return leftDue - rightDue;
  }

  const difficultyDelta = compareByDifficulty(left, right);
  if (difficultyDelta !== 0) {
    return difficultyDelta;
  }

  return compareByName(left, right);
}

function getLogicBetaBaseScore(assignments: Assignment[]) {
  if (!assignments.length) {
    return 4;
  }

  if (assignments.some((assignment) => getExistenceDifficultyRank(assignment.difficulty) === 1)) {
    return 1;
  }

  if (assignments.some((assignment) => getExistenceDifficultyRank(assignment.difficulty) === 2)) {
    return 2;
  }

  if (assignments.some((assignment) => getExistenceDifficultyRank(assignment.difficulty) === 3)) {
    return 3;
  }

  return 4;
}

function buildLogicBetaPriorityMap(assignments: Assignment[]) {
  const groupedAssignments: Record<AssignmentBucket, Assignment[]> = {
    overdue: [],
    today: [],
    'future-near': [],
    'future-far': []
  };

  assignments.forEach((assignment) => {
    groupedAssignments[getAssignmentBucket(assignment)].push(assignment);
  });

  const bucketScores: Record<AssignmentBucket, number> = {
    overdue: getLogicBetaBaseScore(groupedAssignments.overdue),
    today: getLogicBetaBaseScore(groupedAssignments.today),
    'future-near': getLogicBetaBaseScore(groupedAssignments['future-near']),
    'future-far': getLogicBetaBaseScore(groupedAssignments['future-far'])
  };

  return Object.fromEntries(
    assignments.map((assignment) => {
      const bucket = getAssignmentBucket(assignment);
      const dayDistance = getDaysUntilDue(assignment.due);
      const distanceFactor = bucket === 'overdue'
        ? Math.abs(dayDistance)
        : bucket === 'today'
          ? 0
          : Math.max(0, dayDistance);

      const score = bucketScores[bucket] + distanceFactor;
      return [assignment.id, { score, color: getPriorityColor(assignment) }];
    })
  ) as Record<string, AssignmentPriority>;
}

function buildSequentialPriorityMap(sortedAssignments: Assignment[]) {
  return Object.fromEntries(
    sortedAssignments.map((assignment, index) => [
      assignment.id,
      {
        score: index + 1,
        color: getPriorityColor(assignment)
      }
    ])
  ) as Record<string, AssignmentPriority>;
}

export function createEmptyAssignmentForm(): AssignmentFormValues {
  return {
    name: '',
    cls: '',
    difficulty: '',
    ad: '',
    due: '',
    dueTime: '',
    desc: '',
    repeatEnabled: false,
    repeatEvery: '',
    repeatTime: '00:00',
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
    const savedMode = window.localStorage.getItem('learnself-grading-mode');
    if (savedMode === 'oldest-first' || savedMode === 'logic-beta') {
      return savedMode;
    }
    return 'newest-first';
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

export function buildAssignmentPriorityState(assignments: Assignment[], mode: GradingMode): AssignmentPriorityState {
  if (!assignments.length) {
    return { priorities: {}, sortedAssignments: [] };
  }

  if (mode === 'logic-beta') {
    const priorities = buildLogicBetaPriorityMap(assignments);
    const sortedAssignments = [...assignments].sort((left, right) => {
      const leftPriority = priorities[left.id]?.score ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = priorities[right.id]?.score ?? Number.MAX_SAFE_INTEGER;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const leftBucket = getAssignmentBucket(left);
      const rightBucket = getAssignmentBucket(right);
      const bucketDelta = getBucketOrder(leftBucket, 'oldest-first') - getBucketOrder(rightBucket, 'oldest-first');
      if (bucketDelta !== 0) {
        return bucketDelta;
      }

      const leftDue = getDueTimestamp(left);
      const rightDue = getDueTimestamp(right);
      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }

      return compareByName(left, right);
    });

    return { priorities, sortedAssignments };
  }

  const sortedAssignments = [...assignments].sort(
    mode === 'newest-first' ? compareNewestFirst : compareOldestFirst
  );
  const priorities = buildSequentialPriorityMap(sortedAssignments);
  return { priorities, sortedAssignments };
}

export function formatDate(iso: string) {
  if (!iso) return '-';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${month}/${day}/${year.slice(2)}`;
}

export function formatTimeLabel(time: string) {
  const normalized = getDueTimeOrDefault(time);
  const [hoursString, minutesString] = normalized.split(':');
  const hours = Number(hoursString);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutesString} ${suffix}`;
}

export function formatDueDateTime(dateIso: string, time: string) {
  if (!dateIso) return '-';
  return `${formatDate(dateIso)} ${formatTimeLabel(time)}`;
}

export function isPastDueDate(dateIso: string, time = '00:00') {
  const due = parseDueDateTime(dateIso, time);
  if (!due) {
    return false;
  }

  return due.getTime() < new Date().getTime();
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

export function formatRepeatSummary(config: RepeatScheduleSource) {
  if (!config.repeatEnabled || !config.repeatEvery) {
    return 'Does not repeat';
  }

  const timeLabel = formatTimeLabel(config.repeatTime);

  switch (config.repeatEvery) {
    case 'day':
      return `Every day due at ${timeLabel}`;
    case 'week':
      return `Every week due at ${timeLabel}`;
    case 'month':
      return `Every month due at ${timeLabel}`;
    case 'days-of-week': {
      const labels = normalizeNumberList(config.repeatDaysOfWeek, 0, 6)
        .map((value) => WEEKDAY_PICKER_OPTIONS.find((option) => option.value === value)?.shortLabel ?? value)
        .join(', ');
      return `Every ${labels || 'selected weekday'} due at ${timeLabel}`;
    }
    case 'days-of-month': {
      const labels = normalizeNumberList(config.repeatDaysOfMonth, 1, 31).join(', ');
      return `Every month on ${labels || 'selected day'} due at ${timeLabel}`;
    }
    default:
      return 'Does not repeat';
  }
}
