import { DEFAULT_USER_NAME, DIFFICULTY_CLASS_MAP } from '../constants';
import type { Assignment, Difficulty, UserProfile } from '../types';

export function getInitialUser(): UserProfile {
  return { id: '', email: '', name: DEFAULT_USER_NAME, avatarUrl: '' };
}

export function calcPriority(assignment: Pick<Assignment, 'due' | 'difficulty'>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${assignment.due}T00:00:00`);
  const days = Number.isNaN(due.getTime()) ? 999 : Math.ceil((due.getTime() - today.getTime()) / 86400000);
  const diffWeight: Record<Difficulty, number> = { Easy: 1, Medium: 2, Hard: 3, Group: 2 };
  const base = days <= 0 ? 0 : days;
  const score = Math.max(1, Math.round(base / diffWeight[assignment.difficulty]));

  let color: 'red' | 'yellow' | 'green';
  if (days <= 0) color = 'red';
  else if (days <= 3) color = 'yellow';
  else color = 'green';

  return { score, color };
}

export function sortAssignments(assignments: Assignment[]) {
  return [...assignments].sort((left, right) => calcPriority(left).score - calcPriority(right).score);
}

export function formatDate(iso: string) {
  if (!iso) return '-';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${month}/${day}/${year.slice(2)}`;
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
