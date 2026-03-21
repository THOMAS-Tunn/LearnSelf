import type { CommunityCommentSort, CommunityFeedSection, Difficulty, ViewName } from './types';

export const SUPABASE_TABLE = 'assignments';
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

export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Group'];
export const DIFFICULTY_CLASS_MAP: Record<Difficulty, string> = {
  Easy: 'diff-easy',
  Medium: 'diff-medium',
  Hard: 'diff-hard',
  Group: 'diff-group'
};
