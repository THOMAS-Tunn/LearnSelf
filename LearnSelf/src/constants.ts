import type { Difficulty, ViewName } from './types';

export const SUPABASE_TABLE = 'assignments';
export const COMMUNITY_POSTS_TABLE = 'community_posts';
export const COMMUNITY_COMMENTS_TABLE = 'community_comments';
export const SUPABASE_STORAGE_KEY = 'learnself-auth-v1';
export const DEFAULT_USER_NAME = 'Student';
export const NAV_ITEMS: Array<{ key: ViewName; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'community', label: 'Community' },
  { key: 'finished', label: 'Finished' },
  { key: 'trash', label: 'Trash' },
  { key: 'tools', label: 'Tools' },
  { key: 'help', label: 'Help' }
];

export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Group'];
export const DIFFICULTY_CLASS_MAP: Record<Difficulty, string> = {
  Easy: 'diff-easy',
  Medium: 'diff-medium',
  Hard: 'diff-hard',
  Group: 'diff-group'
};
