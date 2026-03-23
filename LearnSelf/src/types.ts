export type ViewName = 'dashboard' | 'community' | 'friends' | 'finished' | 'trash' | 'tools' | 'help' | 'profile' | 'settings';

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Group';
export type AssignmentStatus = 'active' | 'finished' | 'trashed';
export type GradingMode = 'newest-first' | 'oldest-first' | 'logic-beta';
export type AssignmentRepeatEvery = 'day' | 'week' | 'month' | 'days-of-week' | 'days-of-month';
export type CommunityPostStatus = 'open' | 'deleted';
export type CommunityFeedSection = 'all' | 'favorite-posts' | 'favorite-comments' | 'my-posts' | 'friend-posts' | 'archived' | 'deleted';
export type CommunityCommentSort = 'oldest' | 'newest' | 'most-liked';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
}

export interface Assignment {
  id: string;
  name: string;
  cls: string;
  difficulty: Difficulty;
  ad: string;
  due: string;
  dueTime: string;
  desc: string;
  status: AssignmentStatus;
  repeatEnabled: boolean;
  repeatEvery: AssignmentRepeatEvery | '';
  repeatTime: string;
  repeatDaysOfWeek: number[];
  repeatDaysOfMonth: number[];
  repeatTimezone: string;
  repeatRuleId: string;
}

export interface AssignmentFormValues {
  name: string;
  cls: string;
  difficulty: '' | Difficulty;
  ad: string;
  due: string;
  dueTime: string;
  desc: string;
  repeatEnabled: boolean;
  repeatEvery: '' | AssignmentRepeatEvery;
  repeatTime: string;
  repeatDaysOfWeek: number[];
  repeatDaysOfMonth: number[];
  repeatTimezone: string;
}

export interface AssignmentRepeatRulePayload {
  name: string;
  cls: string;
  difficulty: Difficulty;
  desc: string;
  repeatEvery: AssignmentRepeatEvery;
  repeatTime: string;
  repeatDaysOfWeek: number[];
  repeatDaysOfMonth: number[];
  repeatTimezone: string;
  anchorDate: string;
  usesAssignedDate: boolean;
  dueOffsetDays: number;
  nextOccurrenceOn: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  authorAvatarUrl: string;
  body: string;
  createdAt: string;
  likesCount: number;
  likedByCurrentUser: boolean;
  favoritedByCurrentUser: boolean;
}

export interface CommunityPost {
  id: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  authorAvatarUrl: string;
  title: string;
  body: string;
  status: CommunityPostStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  likesCount: number;
  likedByCurrentUser: boolean;
  favoritedByCurrentUser: boolean;
  pinnedByCurrentUser: boolean;
  hiddenByCurrentUser: boolean;
  comments: CommunityComment[];
}

export interface CommunityPostFormValues {
  title: string;
  body: string;
}

export interface DirectoryProfile {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export interface FriendRecord extends DirectoryProfile {
  friendshipId: string;
  createdAt: string;
}

export interface FriendSearchResult extends DirectoryProfile {
  isAlreadyFriend: boolean;
  isCurrentUser: boolean;
}

export interface StatusMessage {
  tone: 'info' | 'success' | 'error';
  text: string;
}
