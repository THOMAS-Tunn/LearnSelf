import type {
  AssignmentRepeatEvery,
  CommunityCommentSort,
  CommunityFeedSection,
  Difficulty,
  GradingMode,
  ViewName
} from './types';

export const SUPABASE_TABLE = 'assignments';
export const ASSIGNMENT_REPEAT_RULES_TABLE = 'assignment_repeat_rules';
export const PROFILES_TABLE = 'profiles';
export const FRIENDSHIPS_TABLE = 'friendships';
export const COMMUNITY_POSTS_TABLE = 'community_posts';
export const COMMUNITY_COMMENTS_TABLE = 'community_comments';
export const COMMUNITY_POST_PREFERENCES_TABLE = 'community_post_preferences';
export const COMMUNITY_COMMENT_PREFERENCES_TABLE = 'community_comment_preferences';
export const COMMUNITY_POST_LIKES_TABLE = 'community_post_likes';
export const COMMUNITY_COMMENT_LIKES_TABLE = 'community_comment_likes';
export const SUPABASE_STORAGE_KEY = 'learnself-auth-v1';
export const DEFAULT_USER_NAME = 'Student';
export const NAV_ITEMS: Array<{ key: ViewName; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'community', label: 'Community' },
  { key: 'friends', label: 'Friends' },
  { key: 'finished', label: 'Finished' },
  { key: 'trash', label: 'Trash' },
  { key: 'tools', label: 'Tools' },
  { key: 'help', label: 'Help' }
];

export const COMMUNITY_SECTIONS: Array<{ key: CommunityFeedSection; label: string }> = [
  { key: 'all', label: 'All Posts' },
  { key: 'favorite-posts', label: 'Favorite Posts' },
  { key: 'favorite-comments', label: 'Favorite Comments' },
  { key: 'my-posts', label: 'My Posts' },
  { key: 'friend-posts', label: 'My Friend Posts' },
  { key: 'archived', label: 'Archived' },
  { key: 'deleted', label: 'Deleted' }
];

export const COMMUNITY_COMMENT_SORT_OPTIONS: Array<{ key: CommunityCommentSort; label: string }> = [
  { key: 'most-liked', label: 'Most liked' },
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' }
];

export const GRADING_MODE_OPTIONS: Array<{ key: GradingMode; label: string; description: string }> = [
  {
    key: 'newest-first',
    label: 'Newest',
    description: 'Keeps today and upcoming work ahead of older backlog, then sorts by the closest due date and time.'
  },
  {
    key: 'oldest-first',
    label: 'Oldest',
    description: 'Pushes the oldest overdue work first, then today, then the rest in due-date order.'
  },
  {
    key: 'logic-beta',
    label: 'Logic (Beta!)',
    description: 'Uses the new past/today/future priority logic with the difficulty existence check system.'
  }
];

export const REPEAT_EVERY_OPTIONS: Array<{ key: AssignmentRepeatEvery; label: string }> = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'days-of-week', label: 'Days of the week' },
  { key: 'days-of-month', label: 'Days of the month' }
];

export const WEEKDAY_PICKER_OPTIONS = [
  { value: 0, shortLabel: 'Sun', longLabel: 'Sunday' },
  { value: 1, shortLabel: 'Mon', longLabel: 'Monday' },
  { value: 2, shortLabel: 'Tue', longLabel: 'Tuesday' },
  { value: 3, shortLabel: 'Wed', longLabel: 'Wednesday' },
  { value: 4, shortLabel: 'Thu', longLabel: 'Thursday' },
  { value: 5, shortLabel: 'Fri', longLabel: 'Friday' },
  { value: 6, shortLabel: 'Sat', longLabel: 'Saturday' }
] as const;

export const MONTH_DAY_PICKER_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1);

export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Group'];
export const DIFFICULTY_CLASS_MAP: Record<Difficulty, string> = {
  Easy: 'diff-easy',
  Medium: 'diff-medium',
  Hard: 'diff-hard',
  Group: 'diff-group'
};
